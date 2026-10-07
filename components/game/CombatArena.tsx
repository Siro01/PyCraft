'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BossSprite from './BossSprite'
import HPBar from './HPBar'
import XPBar from './XPBar'
import CodeEditor from './CodeEditor'
import MascotGuide from './MascotGuide'
import MercaderModal, { AmuletCard } from './MercaderModal'
import ResetBossButton from './ResetBossButton'
import BossIntro from './BossIntro'
import LessonWindow from './LessonWindow'
import InventoryApp from './inventory/InventoryApp'
import Win from '@/components/ui/Win'
import { getLesson } from '@/lib/game/lessons'
import { executeChallenge, preloadPyodide, preloadSqlJs } from '@/lib/game/executor'
import { AMULET_META, getRandomAmuletOffer } from '@/lib/game/amulets'
import { AmuletIcon } from '@/components/ui/PixelIcons'
import InventoryConsole from './items/InventoryConsole'
import PatoDebugWindow from './items/PatoDebugWindow'
import CompuHackeadaWindow from './items/CompuHackeadaWindow'
import { ItemSprite, itemSpriteKey } from './items/ItemSprites'
import { ItemUseBurst, PenguinTip, SixSevenOverlay, ZondaSweep } from './items/ItemOverlays'
import { sfx } from '@/lib/game/architect/sound'
import { BOSS_DIALOGUES } from '@/lib/game/dialogues'
import {
  applyItem, broccoliDamage, ownedPerkItems, rollBossHeal, BROCCOLI_HITS, PERK_SLOT_LIMIT,
  type ItemUseResult,
} from '@/lib/game/perk-effects'
import { autoFixCode, type CodeFix } from '@/lib/game/items/auto-fix'
import { BATTLE_ITEMS } from '@/lib/game/shop'
import {
  activateShopCoupon, addArmor as storeAddArmor, consumePerk, getArmor, getEquippedPerks, getShopOwned, setEquippedPerks,
} from '@/lib/storage/local-store'
import type { Boss, Challenge, ChallengeTier, Amulet, AmuletType, ShopItem } from '@/types'

const PLAYER_MAX_HP = 100
const PLAYER_WRONG_PENALTY = 25  // TRAINEE: -25 HP per wrong answer

interface CombatArenaProps {
  boss: Boss
  challenges: Challenge[]
  initialHp?: number
  initialDefeated?: boolean
  persist?: { battleId: string; userId: string; attacksCount: number }
  victoryHref?: string
  localMode?: boolean
  showGuide?: boolean
  tier?: ChallengeTier
  /** Jefes ya derrotados antes de este (modo Supabase): decide cuándo aparece el Mercader. */
  defeatedBefore?: number
  /** Sesión del alumno TEST: muestra herramientas para simular aciertos. */
  testMode?: boolean
  /** Banco de pruebas de ítems (/demo/items): los 14 ítems disponibles, nada se gasta ni se guarda. */
  sandbox?: boolean
}

const PENGUIN_TIP_KEY = 'pysql:penguin-tip-seen'

/** Código con algo ejecutable de verdad (no solo comentarios, ni huecos ___) — lo pide el Zonda. */
function hasRealCode(code: string, lang: 'python' | 'sql'): boolean {
  if (/_{3,}/.test(code)) return false
  const comment = lang === 'sql' ? /--.*$/gm : /#.*$/gm
  return code.replace(comment, '').trim().length > 0
}

interface AttackResult {
  isCorrect: boolean
  output: string
  expected: string
  error: string | null
}

export default function CombatArena({
  boss, challenges, initialHp, initialDefeated, persist, victoryHref, localMode, showGuide, tier, defeatedBefore, testMode, sandbox,
}: CombatArenaProps) {
  const router = useRouter()
  const attacksRef = useRef(persist?.attacksCount ?? 0)

  // Intro dialogue — inicializar false para evitar hydration mismatch, luego leer localStorage en useEffect
  const introLines = BOSS_DIALOGUES[boss.id] ?? []
  const hasIntro = introLines.length > 0 && !sandbox
  const introKey = `boss-intro-seen-${boss.id}`
  const [showIntro, setShowIntro] = useState(false)

  useEffect(() => {
    if (!hasIntro) return
    try {
      if (!localStorage.getItem(introKey)) setShowIntro(true)
    } catch {}
  }, [hasIntro, introKey])

  const handleIntroDone = useCallback(() => {
    try { localStorage.setItem(introKey, '1') } catch {}
    setShowIntro(false)
  }, [introKey])

  const handleShowIntroAgain = useCallback(() => {
    setShowIntro(true)
  }, [])

  // Apuntes con ejemplos paso a paso (se abren desde Rodolfo o desde el panel del jefe)
  const lesson = getLesson(boss.id)
  const [showLesson, setShowLesson] = useState(false)
  const openLesson = useCallback(() => setShowLesson(true), [])

  // Inventario: amuletos + ítems/stickers de la tienda, consultable en medio de la batalla.
  const [showInventory, setShowInventory] = useState(false)
  // El inventario de batalla se cierra también con Escape (como las ventanas de error).
  useEffect(() => {
    if (!showInventory) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { sfx.close(); setShowInventory(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showInventory])

  // Boss state
  const [bossHp, setBossHp]                 = useState(initialHp ?? boss.hpMax)
  // El Archivista (jefe 6): su vida es la barra de experiencia de Minecraft, que suena
  // ella misma ("ding" de XP) al bajar; por eso no lleva el golpe genérico.
  const xpBoss = boss.id === 'archivista'
  const [currentChallengeIdx, setIdx]       = useState(0)
  const [isLoading, setIsLoading]           = useState(false)
  const [lastResult, setLastResult]         = useState<AttackResult | null>(null)
  const [isDamageAnimating, setDamageAnim]  = useState(false)
  const [isDefeated, setIsDefeated]         = useState(initialDefeated ?? false)
  const [log, setLog]                       = useState<string[]>([])

  // Player HP — only active in TRAINEE mode
  const showPlayerHp = tier === 'trainee'
  const [playerHp, setPlayerHp]             = useState(PLAYER_MAX_HP)
  const [isPlayerDefeated, setPlayerDefeated] = useState(false)

  // Visual feedback
  const [damageNumbers, setDamageNumbers]   = useState<{id: number; value: number; x: number}[]>([])
  const [playerFlash, setPlayerFlash]       = useState(false)
  const [hpShake, setHpShake]              = useState(false)
  const [victoryVisible, setVictoryVisible] = useState(false)
  const [defeatVisible, setDefeatVisible]   = useState(false)

  // Merchant — appears after every 2 bosses defeated
  const [showMercader, setShowMercader]     = useState(false)
  const [mercaderOffers, setMercaderOffers] = useState<AmuletType[]>([])
  const [pendingVictoryHref, setPendingVHref] = useState<string | null>(null)
  /** El alumno ya derrotó al Mercader del Abismo — decide qué línea sobre el hermano usa el Ambulante. */
  const [abismoEncountered, setAbismoEncountered] = useState<boolean | undefined>(undefined)

  // Amulets
  const [amulets, setAmulets]               = useState<Amulet[]>([])

  // ── Ítems del Mercader (se usan desde INVENTARIO.PY con print(nombre)) ────
  const [ownedItems, setOwnedItems]         = useState<ShopItem[]>([])
  const [equippedItems, setEquippedItems]   = useState<string[]>([])
  const [armor, setArmor]                   = useState(0)
  const [duckActive, setDuckActive]         = useState(false)
  const [showDuck, setShowDuck]             = useState(false)
  const [compuFix, setCompuFix]             = useState<{ fixes: CodeFix[]; hasBlanks: boolean } | null>(null)
  const [codeReplace, setCodeReplace]       = useState<{ code: string; nonce: number } | null>(null)
  const [broccoliHits, setBroccoliHits]     = useState(0)
  const [zondaArmed, setZondaArmed]         = useState(false)
  const [show67, setShow67]                 = useState(false)
  const [zondaFx, setZondaFx]               = useState(false)
  const [itemBurst, setItemBurst]           = useState<{ key: number; sprite: string; label: string } | null>(null)
  const [penguinTip, setPenguinTip]         = useState(false)
  const editorCodeRef = useRef('')
  const handleCodeChange = useCallback((code: string) => { editorCodeRef.current = code }, [])
  const penguinOn = equippedItems.includes('item-pinguino')
  const cloverOn  = equippedItems.includes('item-trebol')

  // Preload WASM engines
  useEffect(() => {
    if (boss.type === 'python' || boss.type === 'mixed' || boss.type === 'final') preloadPyodide()
    if (boss.type === 'sql'    || boss.type === 'mixed' || boss.type === 'final') preloadSqlJs()
  }, [boss.type])

  // Local mode: read saved boss HP from localStorage on mount
  useEffect(() => {
    if (!localMode) return
    import('@/lib/storage/local-store').then(({ getBossProgress }) => {
      const saved = getBossProgress(boss.id)
      if (saved) {
        setBossHp(saved.hp)
        if (saved.defeated) setIsDefeated(true)
      }
    })
  }, [boss.id, localMode])

  // Load amulets from localStorage on mount; apply boss-hp-reduction on fresh battles
  useEffect(() => {
    import('@/lib/storage/local-store').then(({ getAmulets, removeAmulet }) => {
      const loaded = getAmulets()
      const debilidad = loaded.find((a) => a.type === 'boss-hp-reduction')
      const isFreshBattle = !initialDefeated && (initialHp ?? boss.hpMax) === boss.hpMax

      if (debilidad && isFreshBattle) {
        const reducedHp = Math.round(boss.hpMax * 0.6)
        setBossHp(reducedHp)
        removeAmulet(debilidad.id)
        setAmulets(loaded.filter((a) => a.id !== debilidad.id))
        setLog((prev) => [
          `[${new Date().toLocaleTimeString()}] [AMU] Amuleto de Debilidad — jefe empieza con ${reducedHp}/${boss.hpMax} HP`,
          ...prev,
        ])
        // Persist reduced starting HP to Supabase so the battle record reflects it from the start
        if (persist) {
          import('@/lib/supabase/client').then(({ createClient }) => {
            createClient()
              .from('battle_records')
              .update({ hp_current: reducedHp })
              .eq('id', persist.battleId)
              .then(() => {})
          })
        }
      } else {
        setAmulets(loaded)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshAmulets = useCallback(() => {
    import('@/lib/storage/local-store').then(({ getAmulets }) => {
      setAmulets(getAmulets())
    })
  }, [])

  const challenge = challenges[currentChallengeIdx]

  // Ítems: en el sandbox están los 14 (y nada se gasta); si no, lo que compró el alumno.
  useEffect(() => {
    if (sandbox) { setOwnedItems(BATTLE_ITEMS); return }
    setOwnedItems(ownedPerkItems(getShopOwned()))
    setEquippedItems(getEquippedPerks())
    setArmor(getArmor())
  }, [sandbox])

  // El Pingüino se presenta la primera vez que está activo en una batalla.
  useEffect(() => {
    if (!penguinOn) return
    try { if (!localStorage.getItem(PENGUIN_TIP_KEY)) setPenguinTip(true) } catch { /* modo privado */ }
  }, [penguinOn])

  const closePenguinTip = useCallback(() => {
    setPenguinTip(false)
    try { localStorage.setItem(PENGUIN_TIP_KEY, '1') } catch { /* modo privado */ }
  }, [])

  const pushLog = useCallback((msg: string) => {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
  }, [])

  /** Guarda la vida del jefe después de un golpe de ítem (mismo camino que el Amuleto de Debilidad). */
  const persistBossHp = useCallback((hp: number) => {
    if (sandbox) return
    if (localMode) {
      import('@/lib/storage/local-store').then(({ saveBossProgress }) => saveBossProgress(boss.id, hp, false))
    }
    if (persist) {
      import('@/lib/supabase/client').then(({ createClient }) => {
        createClient().from('battle_records').update({ hp_current: hp }).eq('id', persist.battleId).then(() => {})
      })
    }
  }, [sandbox, localMode, persist, boss.id])

  const spawnDamageNumber = useCallback((value: number) => {
    const numId = Date.now() + Math.random()
    const xOffset = 40 + Math.random() * 20
    setDamageNumbers((prev) => [...prev, { id: numId, value, x: xOffset }])
    setTimeout(() => setDamageNumbers((prev) => prev.filter((n) => n.id !== numId)), 1200)
  }, [])

  const handleUseItem = useCallback((item: ShopItem): ItemUseResult => {
    const sprite = itemSpriteKey(item.glyph)
    const battleLive = !isDefeated && !isPlayerDefeated

    const result = applyItem(item, {
      battle: battleLive && challenge ? {
        boss, bossHp,
        damageBoss: (amount, source) => {
          const next = Math.max(1, bossHp - amount)
          setBossHp(next)
          setDamageAnim(true)
          setTimeout(() => setDamageAnim(false), 420)
          spawnDamageNumber(amount)
          if (!xpBoss) sfx.hit()
          pushLog(`[ITM] ${source}: -${amount} HP → ${next} restante`)
          persistBossHp(next)
        },
        hasPlayerHp: showPlayerHp,
        playerHp, maxPlayerHp: PLAYER_MAX_HP,
        healPlayer: (amount) => {
          setPlayerHp((hp) => Math.min(PLAYER_MAX_HP, hp + amount))
          sfx.potion()
          pushLog(`[ITM] ${item.name}: +${amount} HP`)
        },
        addArmor: () => {
          const next = sandbox ? armor + 1 : storeAddArmor(1)
          setArmor(next)
          pushLog(`[ITM] ${item.name}: +1 Armadura (total ${next})`)
          return next
        },
        openDuck: () => { setDuckActive(true); setShowDuck(true) },
        duckActive,
        runAutoFix: () => {
          const r = autoFixCode(editorCodeRef.current, challenge.type)
          if (!r.fixes.length) {
            return { fixes: 0, reason: r.hasBlanks
              ? 'La Compu no encontró errores de escritura. Lo que falta son los huecos ___, y esos los completás vos. No se gastó.'
              : 'La Compu revisó todo y no encontró errores de escritura. No se gastó.' }
          }
          setCodeReplace({ code: r.code, nonce: Date.now() })
          setCompuFix({ fixes: r.fixes, hasBlanks: r.hasBlanks })
          pushLog(`[ITM] Compu Hackeada: ${r.fixes.length} ${r.fixes.length === 1 ? 'corrección' : 'correcciones'}`)
          return { fixes: r.fixes.length }
        },
        broccoliHitsLeft: broccoliHits,
        armBroccoli: () => { setBroccoliHits(BROCCOLI_HITS); pushLog(`[ITM] Brócoli: próximos ${BROCCOLI_HITS} golpes +20%`) },
        zondaArmed,
        armZonda: () => { setZondaArmed(true); setZondaFx(true); pushLog('[ITM] Zonda: el próximo código válido le pega al jefe') },
      } : null,
      show67: () => { setShow67(true); sfx.jingle() },
      activateCoupon: (pct) => {
        if (sandbox) { pushLog(`[ITM] Cupón -${Math.round(pct * 100)}% (sandbox: no se guarda)`); return true }
        return activateShopCoupon(pct)
      },
      togglePassive: (it) => {
        const isOn = equippedItems.includes(it.id)
        if (!isOn && equippedItems.length >= PERK_SLOT_LIMIT) return { ok: false, equipped: false }
        const next = isOn ? equippedItems.filter((id) => id !== it.id) : [...equippedItems, it.id]
        setEquippedItems(next)
        sfx.equip(!isOn)
        if (!sandbox) setEquippedPerks(next)
        pushLog(`[ITM] ${it.name} ${isOn ? 'desequipado' : 'equipado'}`)
        return { ok: true, equipped: !isOn }
      },
    })

    if (result.status === 'used') {
      sfx.perkUse()
      if (sprite && item.effectId !== 'pato-debug' && item.effectId !== 'compu-hackeada') {
        setItemBurst({ key: Date.now(), sprite, label: item.name })
      }
      if (!sandbox) {
        consumePerk(item.id)
        setOwnedItems((prev) => prev.filter((p) => p.id !== item.id))
      }
    }
    return result
  }, [
    boss, bossHp, challenge, isDefeated, isPlayerDefeated, showPlayerHp, playerHp, armor, duckActive, broccoliHits,
    zondaArmed, equippedItems, sandbox, pushLog, persistBossHp, spawnDamageNumber,
  ])

  /** Jefes de la fase 2 que se curan — por ahora solo lo dispara el sandbox; el Trébol puede frenarlo. */
  const handleBossHeal = useCallback((amount: number) => {
    if (isDefeated) return
    if (rollBossHeal(cloverOn).blocked) {
      sfx.denied()
      pushLog('[ITM] Trébol de la Suerte: ¡el jefe intentó curarse y no pudo!')
      setItemBurst({ key: Date.now(), sprite: 'trebol', label: '¡Suerte!' })
      return
    }
    const next = Math.min(boss.hpMax, bossHp + amount)
    setBossHp(next)
    sfx.potion()
    pushLog(`[JEF] ${boss.name} se curó +${next - bossHp} HP → ${next}`)
  }, [isDefeated, cloverOn, bossHp, boss.hpMax, boss.name, pushLog])

  // Supabase mode: guarda el ataque y el estado del jefe. Un fallo de red no debe romper el combate.
  const persistAttack = useCallback(async (
    code: string, isCorrect: boolean, damage: number, hpAfter: number, defeated: boolean,
  ) => {
    if (!persist) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      attacksRef.current += 1
      await supabase.from('attack_records').insert({
        battle_id: persist.battleId,
        user_id: persist.userId,
        challenge_id: challenge.id,
        submitted_code: code,
        is_correct: isCorrect,
        damage_dealt: damage,
      })
      await supabase.from('battle_records').update({
        hp_current: hpAfter,
        attacks_count: attacksRef.current,
        is_completed: defeated,
        completed_at: defeated ? new Date().toISOString() : null,
      }).eq('id', persist.battleId)
    } catch (err) {
      console.error('No se pudo guardar el progreso', err)
    }
  }, [persist, challenge])

  // ── Amulet: use health potion ───────────────────────────────────────────────
  const handleUsePotion = useCallback(() => {
    const potion = amulets.find((a) => a.type === 'health-potion')
    if (!potion) return
    setPlayerHp((prev) => Math.min(PLAYER_MAX_HP, prev + 50))
    sfx.potion()
    import('@/lib/storage/local-store').then(({ removeAmulet }) => {
      removeAmulet(potion.id)
      refreshAmulets()
    })
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] [+HP] Poción usada — +50 HP`, ...prev])
  }, [amulets, refreshAmulets])

  // ── Amulet: escape ─────────────────────────────────────────────────────────
  const handleEscape = useCallback(() => {
    const escapeAmulet = amulets.find((a) => a.type === 'escape')
    if (!escapeAmulet) return
    import('@/lib/storage/local-store').then(({ removeAmulet, saveBossProgress }) => {
      removeAmulet(escapeAmulet.id)
      if (localMode) saveBossProgress(boss.id, bossHp, false)
    })
    router.push('/dashboard')
  }, [amulets, bossHp, boss.id, localMode, router])

  // ── Merchant close ─────────────────────────────────────────────────────────
  const handleMercaderClose = useCallback((chosenType?: AmuletType) => {
    setShowMercader(false)
    if (chosenType) {
      const newAmulet: Amulet = { id: Date.now().toString(), type: chosenType }
      import('@/lib/storage/local-store').then(({ addAmulet }) => {
        addAmulet(newAmulet)
        refreshAmulets()
      })
      setLog((prev) => [
        `[${new Date().toLocaleTimeString()}] [MER] Mercader: obteniste ${AMULET_META[chosenType].name}`,
        ...prev,
      ])
    }
    // Redirect to victory screen after merchant closes (final boss)
    if (pendingVictoryHref) {
      setPendingVHref(null)
      router.push(pendingVictoryHref)
    }
  }, [pendingVictoryHref, refreshAmulets, router])

  // ── Main submit handler ────────────────────────────────────────────────────
  // `simulate` (solo alumno TEST): 'hit' = acierto simulado, 'kill' = derrota al jefe de un golpe.
  const handleSubmit = useCallback(async (code: string, simulate?: 'hit' | 'kill') => {
    if (!challenge || isLoading || isDefeated || isPlayerDefeated) return
    setIsLoading(true)
    setLastResult(null)

    try {
      const executed = simulate
        ? { isCorrect: true, actualOutput: challenge.expectedOutput, expectedOutput: challenge.expectedOutput, error: null }
        : await executeChallenge(challenge, code)
      // Zonda: no importa lo que pidió el jefe — si el código corre sin error, pega.
      const zondaHit = zondaArmed && !simulate && !executed.isCorrect && !executed.error && hasRealCode(code, challenge.type)
      const result = zondaHit ? { ...executed, isCorrect: true } : executed
      if (zondaArmed && !simulate && (result.isCorrect)) {
        setZondaArmed(false)
        if (zondaHit) { setZondaFx(true); pushLog('[ITM] Zonda: ¡la ráfaga barrió la consigna!') }
      }
      const attackResult: AttackResult = {
        isCorrect: result.isCorrect,
        output: result.actualOutput,
        expected: result.expectedOutput,
        error: result.error,
      }
      setLastResult(attackResult)

      if (result.isCorrect) {
        // ── Correct answer ───────────────────────────────────────────────
        const isLastPhase = currentChallengeIdx >= challenges.length - 1
        const boosted = broccoliHits > 0 && simulate !== 'kill'
        const damage = simulate === 'kill' ? bossHp : boosted ? broccoliDamage(challenge.damage, bossHp, isLastPhase) : challenge.damage
        if (boosted) {
          setBroccoliHits((n) => n - 1)
          pushLog(`[ITM] Brócoli: +${damage - challenge.damage} de daño extra (${broccoliHits - 1} restantes)`)
        }
        const newBossHp = Math.max(0, bossHp - damage)
        setBossHp(newBossHp)
        setDamageAnim(true)
        if (newBossHp <= 0) {
          if (boss.type === 'final') sfx.powerdown()
          else sfx.victory()
          setVictoryVisible(true)
        } else if (!xpBoss) {
          sfx.hit()
        }
        // Floating damage number
        const numId = Date.now()
        const xOffset = 40 + Math.random() * 20
        setDamageNumbers(prev => [...prev, { id: numId, value: damage, x: xOffset }])
        setTimeout(() => setDamageNumbers(prev => prev.filter(n => n.id !== numId)), 1200)
        setTimeout(() => setDamageAnim(false), 420)

        setLog((prev) => [
          `[${new Date().toLocaleTimeString()}] [ATK] ${challenge.title}: -${damage} HP → ${newBossHp} restante`,
          ...prev,
        ])

        const bossDefeated = newBossHp <= 0

        persistAttack(code, true, damage, newBossHp, bossDefeated)

        // El Mercader aparece cada 2 jefes derrotados (2, 4, 6…); el jefe final no ofrece Mercader:
        // el final tiene su propia escena.
        const onBossDefeated = (totalDefeated: number, abismoDefeated?: boolean) => {
          if (totalDefeated % 2 === 0 && boss.type !== 'final') {
            setTimeout(() => {
              setMercaderOffers(getRandomAmuletOffer(2, tier))
              setAbismoEncountered(abismoDefeated)
              setShowMercader(true)
              sfx.mercader()
              if (victoryHref) setPendingVHref(victoryHref)
            }, 1600)
          } else if (victoryHref) {
            setTimeout(() => router.push(victoryHref), 2200)
          }
        }

        if (localMode) {
          import('@/lib/storage/local-store').then(({ saveBossProgress, getAllProgress }) => {
            saveBossProgress(boss.id, newBossHp, bossDefeated)
            if (bossDefeated) {
              const progress = getAllProgress()
              const totalDefeated = Object.values(progress).filter((p) => p.defeated).length
              const abismoDefeated = boss.id === 'mercader-abismo' ? true : !!progress['mercader-abismo']?.defeated
              onBossDefeated(totalDefeated, abismoDefeated)
            }
          })
        } else if (bossDefeated) {
          // Modo Supabase: no tenemos acá el detalle por jefe, solo el total — si el
          // jefe recién caído ES el Mercader del Abismo lo sabemos con certeza, y para
          // el resto de los casos dejamos `undefined` (el diálogo elige el tono neutro).
          onBossDefeated((defeatedBefore ?? 0) + 1, boss.id === 'mercader-abismo' ? true : undefined)
        }

        if (bossDefeated) {
          setIsDefeated(true)
          return
        }

        // Advance to next challenge
        if (currentChallengeIdx < challenges.length - 1) {
          setTimeout(() => { setIdx((i) => i + 1); setLastResult(null) }, 1400)
        }

      } else {
        // ── Wrong answer ─────────────────────────────────────────────────
        sfx.miss()
        persistAttack(code, false, 0, bossHp, false)
        if (showPlayerHp) {
          const newPlayerHp = Math.max(0, playerHp - PLAYER_WRONG_PENALTY)
          setPlayerHp(newPlayerHp)
          sfx.damage()
          setPlayerFlash(true)
          setHpShake(true)
          setTimeout(() => setPlayerFlash(false), 500)
          setTimeout(() => setHpShake(false), 280)
          setLog((prev) => [
            `[${new Date().toLocaleTimeString()}] [-HP] Respuesta incorrecta: -${PLAYER_WRONG_PENALTY} HP`,
            ...prev,
          ])
          if (newPlayerHp <= 0) {
            setDefeatVisible(true)
            setPlayerDefeated(true)
          }
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    challenge, isLoading, isDefeated, isPlayerDefeated, bossHp, playerHp,
    currentChallengeIdx, challenges.length, showPlayerHp,
    localMode, boss.id, victoryHref, router, persistAttack, defeatedBefore, tier, boss.type,
    zondaArmed, broccoliHits, pushLog, spawnDamageNumber,
  ])

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasPotion       = amulets.some((a) => a.type === 'health-potion')
  const hasEscape       = amulets.some((a) => a.type === 'escape')
  const canEscape       = hasEscape && showPlayerHp && playerHp <= 30
  const hasAmuletBar    = amulets.length > 0

  // ── Restart after player defeat ────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    setPlayerDefeated(false)
    setPlayerHp(PLAYER_MAX_HP)
    setIdx(0)
    setLastResult(null)

    setLog([])
    // Reset boss HP to full (or saved initial)
    if (localMode) {
      import('@/lib/storage/local-store').then(({ saveBossProgress }) => {
        saveBossProgress(boss.id, boss.hpMax, false)
      })
    }
    if (persist) {
      import('@/lib/supabase/client').then(({ createClient }) => {
        createClient().from('battle_records')
          .update({ hp_current: boss.hpMax, is_completed: false, completed_at: null })
          .eq('id', persist.battleId)
      })
    }
    setBossHp(boss.hpMax)
  }, [boss.id, boss.hpMax, localMode, persist])

  // Si está mostrando la intro, renderizamos solo eso
  if (showIntro && hasIntro) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <Win title={`${boss.title}_INTRO.EXE`} active bodyStyle={{ padding: 20 }}>
          <BossIntro boss={boss} lines={introLines} onDone={handleIntroDone} onOpenLesson={lesson ? openLesson : undefined} />
        </Win>
        {showLesson && lesson && <LessonWindow lesson={lesson} bossName={boss.name} onClose={() => setShowLesson(false)} />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {showGuide && <MascotGuide tip={challenge?.tip} onOpenLesson={lesson ? openLesson : undefined} />}
      {showLesson && lesson && <LessonWindow lesson={lesson} bossName={boss.name} onClose={() => setShowLesson(false)} />}
      {showInventory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3"
          style={{ background: 'hsl(var(--bg) / 0.78)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { sfx.close(); setShowInventory(false) } }}
        >
          <div className="w-full win-pop" style={{ maxWidth: 460 }}>
            <Win title="INVENTARIO.EXE" active onClose={() => { sfx.close(); setShowInventory(false) }} bodyStyle={{ padding: 16 }}>
              <InventoryApp inBattle itemsOverride={sandbox ? BATTLE_ITEMS : undefined} equippedOverride={equippedItems} />
            </Win>
          </div>
        </div>
      )}
      {showDuck && challenge && (
        <PatoDebugWindow boss={boss} challenge={challenge} getCode={() => editorCodeRef.current} onClose={() => setShowDuck(false)} />
      )}
      {compuFix && <CompuHackeadaWindow fixes={compuFix.fixes} hasBlanks={compuFix.hasBlanks} onClose={() => setCompuFix(null)} />}
      {show67 && <SixSevenOverlay onDone={() => setShow67(false)} />}
      {zondaFx && <ZondaSweep onDone={() => setZondaFx(false)} />}
      {penguinTip && challenge && !isDefeated && <PenguinTip language={challenge.type} onClose={closePenguinTip} />}
      {showMercader && (
        <MercaderModal
          offers={mercaderOffers}
          bossName={boss.name}
          abismoEncountered={abismoEncountered}
          onChoose={(type) => handleMercaderClose(type)}
          onSkip={() => handleMercaderClose()}
        />
      )}

      {/* Player damage vignette overlay */}
      {playerFlash && (
        <div
          className="fixed inset-0 pointer-events-none z-40 animate-player-damage"
          style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(220,38,38,0.65) 100%)' }}
        />
      )}

      {/* Boss panel */}
      <Win
        title={`${boss.title}_${boss.name.replace(/\s+/g, '_').toUpperCase()}.EXE`}
        active
        right={
          <span style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.12em', color: 'hsl(var(--bg))', textTransform: 'uppercase' }}>
            {boss.topic}
          </span>
        }
        bodyStyle={{ padding: 20 }}
      >
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className={isDamageAnimating ? 'animate-damage-flash-v2' : ''}>
              <BossSprite boss={boss} size="lg" defeated={isDefeated} animated={!isDefeated} hpRatio={bossHp / boss.hpMax} />
            </div>
            {itemBurst && (
              <ItemUseBurst key={itemBurst.key} sprite={itemBurst.sprite} label={itemBurst.label} onDone={() => setItemBurst(null)} />
            )}
            {/* Floating damage numbers */}
            {damageNumbers.map(n => (
              <div
                key={n.id}
                className="absolute top-0 pointer-events-none animate-float-dmg font-mono font-bold select-none"
                style={{
                  left: `${n.x}%`,
                  fontSize: 20,
                  color: 'hsl(var(--accent))',
                  textShadow: '2px 2px 0 hsl(var(--bg))',
                  zIndex: 10,
                }}
              >
                -{n.value}
              </div>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="label-mono">{boss.title}</span>
              {hasIntro && (
                <button
                  onClick={handleShowIntroAgain}
                  className="hover:opacity-80 transition-opacity"
                  style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '1px 8px', border: '2px solid hsl(var(--border2))', background: 'transparent', color: 'hsl(var(--tx2))', cursor: 'pointer' }}
                  title="Ver la presentación del jefe"
                >
                  Intro
                </button>
              )}
              {lesson && (
                <button
                  onClick={openLesson}
                  className="hover:opacity-80 transition-opacity"
                  style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '1px 8px', border: '2px solid hsl(var(--accent))', background: 'transparent', color: 'hsl(var(--accent))', cursor: 'pointer' }}
                  title="Ejemplos paso a paso de Rodolfo"
                >
                  Apuntes
                </button>
              )}
              <button
                onClick={() => { sfx.open(); setShowInventory(true) }}
                className="hover:opacity-80 transition-opacity"
                style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '1px 8px', border: '2px solid hsl(var(--border2))', background: 'transparent', color: 'hsl(var(--tx2))', cursor: 'pointer' }}
                title="Ver amuletos, ítems y stickers"
              >
                Inventario
              </button>
            </div>
            <h2 className="text-2xl mb-3" style={{ color: 'hsl(var(--tx))', lineHeight: 1.05 }}>{boss.name}</h2>
            {xpBoss
              ? <XPBar current={bossHp} max={boss.hpMax} label="HP JEFE" />
              : <HPBar current={bossHp} max={boss.hpMax} label="HP JEFE" size="lg" color="hsl(var(--accent))" />}
            {!isDefeated && (broccoliHits > 0 || zondaArmed || penguinOn || cloverOn || duckActive || (!showPlayerHp && armor > 0)) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2" aria-label="Ítems activos">
                {duckActive && (
                  <button type="button" onClick={() => { sfx.open(); setShowDuck(true) }} title="Abrir al Pato Debug" style={chipStyle(true)}>
                    <ItemSprite sprite="pato-debug" size={16} /> Pato
                  </button>
                )}
                {broccoliHits > 0 && <span style={chipStyle()} title="Próximos golpes +20%"><ItemSprite sprite="brocoli" size={16} /> ×{broccoliHits}</span>}
                {zondaArmed && <span style={chipStyle()} title="Cualquier código válido pega"><ItemSprite sprite="zonda" size={16} animated /> Zonda</span>}
                {penguinOn && <span style={chipStyle()} title="Autocompletado activo"><ItemSprite sprite="pinguino" size={16} /> Pingüino</span>}
                {cloverOn && <span style={chipStyle()} title="20% de frenar curaciones del jefe"><ItemSprite sprite="trebol" size={16} /> Trébol</span>}
                {!showPlayerHp && armor > 0 && <span style={chipStyle()} title="Armadura para jefes especiales"><ItemSprite sprite="mandarina" size={16} /> Armadura {armor}</span>}
              </div>
            )}
            {isDefeated && (
              <p className="mt-2" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 21, color: 'hsl(var(--accent))' }}>
                ¡DERROTADO! — Clase {boss.classNumber} completada.
              </p>
            )}
          </div>

          {!isDefeated && (
            <div className="flex flex-col gap-1 shrink-0">
              {challenges.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => { setIdx(i); setLastResult(null) }}
                  className={`font-mono text-xs px-2 py-1 pixel-corners-sm border transition-all ${
                    i === currentChallengeIdx
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-tx3 hover:border-border2'
                  }`}
                >
                  {`E${i + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Player HP bar — TRAINEE only */}
        {showPlayerHp && !isDefeated && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <div className={hpShake ? 'animate-hp-shake' : ''}>
              <HPBar
                current={playerHp}
                max={PLAYER_MAX_HP}
                label="HP JUGADOR"
                size="sm"
                color={playerHp <= 30 ? 'hsl(var(--danger))' : 'hsl(var(--python))'}
              />
            </div>
          </div>
        )}
      </Win>

      {/* Amuletos — cartas */}
      {hasAmuletBar && !isDefeated && !isPlayerDefeated && (
        <Win title="AMULETOS.SYS" bodyStyle={{ padding: 12 }}>
          <div className="flex items-stretch gap-3 flex-wrap">
            {amulets.map((a) => {
              const isPotion  = a.type === 'health-potion'
              const isEscape  = a.type === 'escape'
              const usable    = (isPotion && showPlayerHp) || (isEscape && canEscape)
              return (
                <AmuletCard
                  key={a.id}
                  type={a.type}
                  compact
                  onClick={usable ? (isPotion ? handleUsePotion : handleEscape) : undefined}
                  footer={isPotion ? (showPlayerHp ? 'Usar' : 'Solo trainee') : isEscape ? (canEscape ? 'Escapar' : 'Vida ≤ 30') : 'Pasivo'}
                />
              )
            })}
          </div>
        </Win>
      )}

      {/* Player defeated screen */}
      {isPlayerDefeated ? (
        <Win title="DERROTA.EXE" tone="danger" active bodyStyle={{ padding: 32 }}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className={`text-5xl ${defeatVisible ? 'animate-defeat' : ''}`}
              style={{ color: 'hsl(var(--danger))', fontFamily: 'var(--font-jersey), monospace' }}
            >
              ¡DERROTA!
            </div>
            <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 22, color: 'hsl(var(--tx2))' }}>
              Tu vida llegó a 0. Tenés que empezar la batalla de nuevo.
            </p>
            <button onClick={handleRestart} className="btn-primary">
              Reintentar batalla
            </button>
            <a href="/dashboard" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, color: 'hsl(var(--tx3))' }}>
              ← Volver al mapa
            </a>
          </div>
        </Win>
      ) : isDefeated ? (
        <Win title="VICTORIA.EXE" tone="safe" active bodyStyle={{ padding: 32 }}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className={`text-5xl ${victoryVisible ? 'animate-victory' : ''}`}
              style={{ color: 'hsl(var(--accent))', fontFamily: 'var(--font-jersey), monospace' }}
            >
              VICTORIA
            </div>
            <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 22, color: 'hsl(var(--tx2))' }}>
              Derrotaste a <strong style={{ color: 'hsl(var(--tx))' }}>{boss.name}</strong>.
            </p>
            <a href="/dashboard" className="btn-primary">
              ← Volver al mapa
            </a>
            {testMode && <ResetBossButton bossId={boss.id} onDone={() => window.location.reload()} />}
            {sandbox && (
              <button type="button" className="btn-ghost" onClick={() => { setIsDefeated(false); setBossHp(boss.hpMax); setIdx(0); setLastResult(null); setBroccoliHits(0); setZondaArmed(false) }}>
                Revivir al jefe (sandbox)
              </button>
            )}
          </div>
        </Win>
      ) : challenge ? (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {sandbox && (
            <SandboxPanel
              bossHp={bossHp}
              bossMax={boss.hpMax}
              showPlayerHp={showPlayerHp}
              cloverOn={cloverOn}
              busy={isLoading}
              onBossHp={(hp) => setBossHp(Math.max(1, Math.min(boss.hpMax, hp)))}
              onBossHeal={() => handleBossHeal(Math.round(boss.hpMax * 0.15))}
              onPlayerHit={() => setPlayerHp((hp) => Math.max(1, hp - 25))}
              onSimulateHit={() => handleSubmit('# SANDBOX: acierto simulado', 'hit')}
            />
          )}
          {testMode && (
            <div
              className="flex flex-wrap items-center gap-2 px-3 py-2 font-mono text-[11px]"
              style={{ border: '1px dashed hsl(var(--accent) / 0.6)', color: 'hsl(var(--tx2))' }}
            >
              <span style={{ color: 'hsl(var(--accent))' }}>MODO TEST</span>
              <span style={{ color: 'hsl(var(--tx3))' }}>pasa por el mismo flujo real (daño, guardado, Mercader, final)</span>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSubmit('# TEST: acierto simulado', 'hit')}
                className="px-2 py-1 pixel-corners-sm border"
                style={{ borderColor: 'hsl(var(--python) / 0.6)', color: 'hsl(var(--python))', background: 'transparent' }}
              >
                ⚡ Simular acierto
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSubmit('# TEST: jefe derrotado', 'kill')}
                className="px-2 py-1 pixel-corners-sm border"
                style={{ borderColor: 'hsl(var(--danger) / 0.6)', color: 'hsl(var(--danger))', background: 'transparent' }}
              >
                ☠ Derrotar jefe
              </button>
              <ResetBossButton bossId={boss.id} onDone={() => window.location.reload()} />
            </div>
          )}
          <CodeEditor
            boss={boss}
            challenge={challenge}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            lastResult={lastResult}
            penguin={penguinOn}
            codeReplace={codeReplace}
            onCodeChange={handleCodeChange}
            banner={zondaArmed ? (
              <div className="flex items-center gap-2 item-status-in" style={{ padding: '6px 10px', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface2))' }}>
                <ItemSprite sprite="zonda" size={24} animated />
                <span style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, lineHeight: 1.1, color: 'hsl(var(--tx))' }}>
                  <b>Sopla el Zonda.</b> En este ataque no importa la consigna: cualquier código que funcione sin error le pega al jefe.
                </span>
              </div>
            ) : null}
          />
          {/* INVENTARIO.PY — cinturón de una fila debajo de Atacar: jefe, desafío y
              script quedan juntos arriba; los ítems se usan escribiendo print(nombre). */}
          {(ownedItems.length > 0 || sandbox) && (
            <InventoryConsole hotbar items={ownedItems} equipped={equippedItems} onUse={handleUseItem} />
          )}
        </div>
      ) : (
        <Win title="SIN_DESAFIOS.TXT" bodyStyle={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: 'hsl(var(--tx3))' }}>
          No hay desafíos disponibles para este jefe.
        </Win>
      )}

      {/* Combat log */}
      {log.length > 0 && (
        <Win title="LOG_DE_COMBATE.TXT" bodyStyle={{ padding: 10, maxHeight: 128, overflowY: 'auto' }}>
          {log.map((entry, i) => (
            <div key={i} className="font-mono text-xs leading-relaxed" style={{ color: 'hsl(var(--tx3))' }}>
              {entry}
            </div>
          ))}
        </Win>
      )}
    </div>
  )
}

function chipStyle(interactive = false): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '1px 7px 1px 3px',
    fontFamily: 'var(--font-jersey), monospace', fontSize: 14, letterSpacing: '0.03em', lineHeight: 1.2,
    border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface2))', color: 'hsl(var(--tx))',
    cursor: interactive ? 'pointer' : 'default',
  }
}

/** Controles del banco de pruebas (/demo/items) — nunca aparece en una batalla real. */
function SandboxPanel({
  bossHp, bossMax, showPlayerHp, cloverOn, busy, onBossHp, onBossHeal, onPlayerHit, onSimulateHit,
}: {
  bossHp: number; bossMax: number; showPlayerHp: boolean; cloverOn: boolean; busy: boolean
  onBossHp: (hp: number) => void; onBossHeal: () => void; onPlayerHit: () => void; onSimulateHit: () => void
}) {
  const btn = (tone: 'tx' | 'accent' = 'tx'): React.CSSProperties => ({
    padding: '4px 10px', border: `2px solid hsl(var(--${tone}))`, background: 'hsl(var(--surface))',
    color: `hsl(var(--${tone}))`, cursor: 'pointer', fontFamily: 'var(--font-jersey), monospace', fontSize: 15, letterSpacing: '0.03em',
  })
  return (
    <Win title="SANDBOX_ITEMS.SYS" bodyStyle={{ padding: 10 }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="label-mono" style={{ color: 'hsl(var(--tx2))' }}>Vida del jefe</span>
        <button type="button" style={btn()} onClick={() => { sfx.click(); onBossHp(bossHp + 25) }}>+25</button>
        <button type="button" style={btn()} onClick={() => { sfx.click(); onBossHp(bossHp + 100) }}>+100</button>
        <button type="button" style={btn()} onClick={() => { sfx.click(); onBossHp(bossMax) }}>Llenar</button>
        <button type="button" style={btn()} onClick={() => { sfx.click(); onBossHp(bossHp - 25) }}>−25</button>
        <span style={{ width: 1, alignSelf: 'stretch', background: 'hsl(var(--border2))' }} aria-hidden />
        <button type="button" style={btn()} onClick={onBossHeal} title={cloverOn ? 'Con Trébol: 20% de que falle' : 'Equipá el Trébol para probarlo'}>
          Jefe se cura +15% {cloverOn ? '· Trébol' : ''}
        </button>
        {showPlayerHp && <button type="button" style={btn()} onClick={onPlayerHit}>Me pegan −25</button>}
        <button type="button" style={btn('accent')} disabled={busy} onClick={onSimulateHit}>Simular acierto</button>
      </div>
    </Win>
  )
}
