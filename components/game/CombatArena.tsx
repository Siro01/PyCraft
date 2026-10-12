'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BossSprite from './BossSprite'
import XPBar from './XPBar'
import BattleConsole from './arena/BattleConsole'
import MascotGuide from './MascotGuide'
import MercaderModal from './MercaderModal'
import ResetBossButton from './ResetBossButton'
import BossIntro from './BossIntro'
import LessonWindow from './LessonWindow'
import InventoryApp from './inventory/InventoryApp'
import Win from '@/components/ui/Win'
import { getLesson } from '@/lib/game/lessons'
import { executeChallenge, preloadPyodide, preloadSqlJs, type SqlDetail } from '@/lib/game/executor'
import { AMULET_META, getRandomAmuletOffer } from '@/lib/game/amulets'
import { parseInventoryCommand } from './items/InventoryConsole'
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
  /** Sesión del alumno TEST o del docente en vista admin: muestra herramientas para simular aciertos. */
  testMode?: boolean
  /** Docente en vista admin: suma simular fallos y forzar la derrota del jugador. */
  adminTools?: boolean
  /** Banco de pruebas de ítems (/demo/items): los 14 ítems disponibles, nada se gasta ni se guarda. */
  sandbox?: boolean
  /**
   * Revancha contra un jefe ya derrotado: solo para practicar. No guarda vida
   * ni ataques, no cambia "derrotado", no da diamantes (se cuentan por jefe
   * distinto) ni Mercader/amuletos, y no gasta el Amuleto de Debilidad. Los
   * ítems que el alumno decida usar sí se gastan, como en cualquier pelea.
   */
  practice?: boolean
  /** Extras para la barra de arriba (nivel, Teletransportador, reiniciar del docente). */
  topExtra?: React.ReactNode
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
  sql?: SqlDetail
}

export default function CombatArena({
  boss, challenges, initialHp, initialDefeated, persist, victoryHref, localMode, showGuide, tier, defeatedBefore, testMode, adminTools, sandbox, practice = false, topExtra,
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
  const [invLine, setInvLine]               = useState('')
  const [invEcho, setInvEcho]               = useState<{ ok: boolean; text: string; hint?: string } | null>(null)
  const [lastDamage, setLastDamage]         = useState<number | null>(null)
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
    if (!localMode || practice) return
    import('@/lib/storage/local-store').then(({ getBossProgress }) => {
      const saved = getBossProgress(boss.id)
      if (saved) {
        setBossHp(saved.hp)
        if (saved.defeated) setIsDefeated(true)
      }
    })
  }, [boss.id, localMode, practice])

  // Load amulets from localStorage on mount; apply boss-hp-reduction on fresh battles
  useEffect(() => {
    import('@/lib/storage/local-store').then(({ getAmulets, removeAmulet }) => {
      const loaded = getAmulets()
      const debilidad = loaded.find((a) => a.type === 'boss-hp-reduction')
      // En práctica no se gasta: el amuleto queda para una pelea de verdad.
      const isFreshBattle = !practice && !initialDefeated && (initialHp ?? boss.hpMax) === boss.hpMax

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
    if (sandbox || practice) return
    if (localMode) {
      import('@/lib/storage/local-store').then(({ saveBossProgress }) => saveBossProgress(boss.id, hp, false))
    }
    if (persist) {
      import('@/lib/supabase/client').then(({ createClient }) => {
        createClient().from('battle_records').update({ hp_current: hp }).eq('id', persist.battleId).then(() => {})
      })
    }
  }, [sandbox, practice, localMode, persist, boss.id])

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
      if (localMode && !practice) saveBossProgress(boss.id, bossHp, false)
    })
    router.push('/dashboard')
  }, [amulets, bossHp, boss.id, localMode, practice, router])

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
  // `simulate` (alumno TEST / docente): 'hit' = acierto simulado, 'kill' = derrota al jefe de un golpe,
  // 'miss' = respuesta incorrecta (en trainee le saca vida al jugador).
  const handleSubmit = useCallback(async (code: string, simulate?: 'hit' | 'kill' | 'miss') => {
    if (!challenge || isLoading || isDefeated || isPlayerDefeated) return
    setIsLoading(true)
    setLastResult(null)

    try {
      const executed = simulate
        ? { isCorrect: simulate !== 'miss', actualOutput: simulate === 'miss' ? '' : challenge.expectedOutput, expectedOutput: challenge.expectedOutput, error: null }
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
        sql: 'sql' in result ? result.sql : undefined,
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
        setLastDamage(damage)
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

        // Botín: cada jefe vencido deja su trofeo en la tabla `trofeos` de Mi Reino.
        if (bossDefeated && !practice && !sandbox) {
          import('@/lib/game/reino-store').then(({ grantTrophy }) => grantTrophy(boss))
        }

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

        if (practice) {
          // Revancha: nada que guardar ni premios que dar.
          if (bossDefeated) pushLog('[PRÁ] Jefe derrotado otra vez — práctica, sin premios')
        } else if (localMode) {
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
    zondaArmed, broccoliHits, pushLog, spawnDamageNumber, practice, sandbox, boss,
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
    // Reset boss HP to full (or saved initial). En práctica no se toca nada guardado:
    // sin esto, perder una revancha marcaba al jefe como NO derrotado.
    if (localMode && !practice) {
      import('@/lib/storage/local-store').then(({ saveBossProgress }) => {
        saveBossProgress(boss.id, boss.hpMax, false)
      })
    }
    if (persist && !practice) {
      import('@/lib/supabase/client').then(({ createClient }) => {
        createClient().from('battle_records')
          .update({ hp_current: boss.hpMax, is_completed: false, completed_at: null })
          .eq('id', persist.battleId)
      })
    }
    setBossHp(boss.hpMax)
  }, [boss.id, boss.hpMax, localMode, persist, practice])

  /** Otra revancha sin salir de la pantalla. */
  const restartPractice = useCallback(() => {
    sfx.confirm()
    setIsDefeated(false)
    setVictoryVisible(false)
    setBossHp(boss.hpMax)
    setPlayerHp(PLAYER_MAX_HP)
    setIdx(0)
    setLastResult(null)
    setBroccoliHits(0)
    setZondaArmed(false)
    setLog([])
  }, [boss.hpMax])

  // ── Ítems: se usan escribiendo print(nombre) en la línea >>> (como en INVENTARIO.PY)
  const runInventory = () => {
    const line = invLine.trim()
    if (!line) return
    setInvLine('')
    const p = parseInventoryCommand(line, ownedItems)
    if (!p.ok) { sfx.denied(); setInvEcho({ ok: false, text: p.error, hint: p.hint }); return }
    const r = handleUseItem(p.item)
    if (r.status === 'rejected') sfx.denied()
    setInvEcho({ ok: r.status !== 'rejected', text: r.message })
  }

  const exitHref = sandbox ? '/demo' : '/dashboard'
  const hpRatio = bossHp / boss.hpMax
  const lowHp = showPlayerHp && playerHp <= 30
  const activeChips = !isDefeated && (broccoliHits > 0 || zondaArmed || penguinOn || cloverOn || duckActive || (!showPlayerHp && armor > 0))

  return (
    <div className="arena">
      {showGuide && !showIntro && <MascotGuide tip={challenge?.tip} onOpenLesson={lesson ? openLesson : undefined} />}
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
      {playerFlash && (
        <div
          className="fixed inset-0 pointer-events-none z-40 animate-player-damage"
          style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(220,38,38,0.65) 100%)' }}
        />
      )}

      {/* ── Barra de arriba: volver, ejercicios y lo que se consulta ───────── */}
      <header className="arena-top">
        <a href={exitHref} className="arena-link">← mapa</a>
        <span className="arena-tag">{boss.title}</span>
        {topExtra}
        <span className="arena-top-spacer" />
        {!isDefeated && !isPlayerDefeated && !showIntro && challenges.length > 1 && (
          <span className="arena-steps" role="group" aria-label="Ejercicios">
            {challenges.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className={`arena-step${i === currentChallengeIdx ? ' arena-step--on' : ''}`}
                onClick={() => { sfx.tab(); setIdx(i); setLastResult(null) }}
                aria-current={i === currentChallengeIdx ? 'step' : undefined}
                title={c.title}
              >
                E{i + 1}
              </button>
            ))}
          </span>
        )}
        {hasIntro && !showIntro && <button type="button" className="arena-link" onClick={handleShowIntroAgain}>intro</button>}
        {lesson && <button type="button" className="arena-link" onClick={openLesson}>apuntes</button>}
        <button type="button" className="arena-link" onClick={() => { sfx.open(); setShowInventory(true) }}>inventario</button>
      </header>

      <div className="arena-grid">
        {/* ── El jefe ───────────────────────────────────────────── */}
        <section className="arena-boss" aria-label={`Jefe: ${boss.name}`}>
          <div className="arena-sprite">
            {/* El sprite crece hasta llenar la columna, como el jefe de la arena secreta. */}
            <div
              className={`arena-sprite-zoom${isDamageAnimating ? ' animate-damage-flash-v2' : ''}`}
              style={{ ['--z' as string]: boss.type === 'final' ? 1.6 : 2.5, ['--z-sm' as string]: boss.type === 'final' ? 0.9 : 1.2 }}
            >
              <BossSprite boss={boss} size="lg" defeated={isDefeated} animated={!isDefeated} hpRatio={hpRatio} />
            </div>
            {itemBurst && (
              <ItemUseBurst key={itemBurst.key} sprite={itemBurst.sprite} label={itemBurst.label} onDone={() => setItemBurst(null)} />
            )}
            {damageNumbers.map((n) => (
              <div key={n.id} className="arena-dmg animate-float-dmg select-none" style={{ left: `${n.x}%` }}>−{n.value}</div>
            ))}
          </div>

          <div className="arena-name">
            <span>{boss.name}</span>
            <small>{boss.topic}</small>
          </div>
          {xpBoss
            ? <XPBar current={bossHp} max={boss.hpMax} label="HP JEFE" />
            : <SegBar value={bossHp} max={boss.hpMax} label={`Vida de ${boss.name}`} />}
          <div className="arena-num">{isDefeated ? `derrotado · clase ${boss.classNumber} completada` : `${bossHp} / ${boss.hpMax}`}</div>

          {showPlayerHp && !isDefeated && (
            <div className={`arena-player${hpShake ? ' arena-player--hurt' : ''}`}>
              <span className="arena-label">vos</span>
              <SegBar value={playerHp} max={PLAYER_MAX_HP} label="Tu vida" small low={lowHp} />
              <span className="arena-num">{playerHp}</span>
            </div>
          )}

          {activeChips && (
            <div className="arena-status" aria-label="Ítems activos">
              {duckActive && <button type="button" onClick={() => { sfx.open(); setShowDuck(true) }}>pato</button>}
              {broccoliHits > 0 && <span>brócoli ×{broccoliHits}</span>}
              {zondaArmed && <span>zonda</span>}
              {penguinOn && <span>pingüino</span>}
              {cloverOn && <span>trébol</span>}
              {!showPlayerHp && armor > 0 && <span>armadura {armor}</span>}
            </div>
          )}

          {hasAmuletBar && !isDefeated && !isPlayerDefeated && (
            <div className="arena-status" aria-label="Amuletos">
              {amulets.map((a) => {
                const isPotion = a.type === 'health-potion'
                const isEscape = a.type === 'escape'
                const name = AMULET_META[a.type].name.toLowerCase()
                if (isPotion) return <button key={a.id} type="button" disabled={!showPlayerHp} onClick={handleUsePotion} title={AMULET_META[a.type].description}>{name}</button>
                if (isEscape) return <button key={a.id} type="button" disabled={!canEscape} onClick={handleEscape} title={canEscape ? 'Escapar' : 'Solo con vida ≤ 30'}>{name}</button>
                return <span key={a.id} title={AMULET_META[a.type].description}>{name}</span>
              })}
            </div>
          )}
        </section>

        {/* ── Consigna + consola ───────────────────────────────── */}
        <section className="arena-work">
          {practice && (
            <p className="arena-note" role="status">
              Modo práctica: ya derrotaste a {boss.name}. No da diamantes ni amuletos y no cambia tu progreso. Los ítems que uses se gastan igual.
            </p>
          )}

          {showIntro && hasIntro ? (
            <BossIntro arena boss={boss} lines={introLines} onDone={handleIntroDone} onOpenLesson={lesson ? openLesson : undefined} />
          ) : isPlayerDefeated ? (
            <div className="arena-end">
              <div className={`arena-end-title arena-end-title--lost${defeatVisible ? ' animate-defeat' : ''}`}>DERROTA</div>
              <p>Tu vida llegó a 0. Tenés que empezar la batalla de nuevo.</p>
              <div className="arena-choices">
                <button type="button" className="arena-go" onClick={handleRestart}>reintentar ▸</button>
                <a href={exitHref} className="arena-go arena-go--ghost">volver al mapa</a>
              </div>
            </div>
          ) : isDefeated ? (
            <div className="arena-end">
              <div className={`arena-end-title${victoryVisible ? ' animate-victory' : ''}`}>VICTORIA</div>
              <p>
                {practice
                  ? <>Le volviste a ganar a <strong>{boss.name}</strong>. Era práctica: sin premios, pero ahora te sale mejor.</>
                  : <>Derrotaste a <strong>{boss.name}</strong>.</>}
              </p>
              <div className="arena-choices">
                <a href={exitHref} className="arena-go">← volver al mapa</a>
                {practice ? (
                  <button type="button" className="arena-go arena-go--ghost" onClick={restartPractice}>practicar otra vez</button>
                ) : !sandbox && (
                  <a href={`/battle/${boss.id}?practica=1`} className="arena-go arena-go--ghost" title="Revancha sin premios, para practicar">practicar otra vez</a>
                )}
                {sandbox && (
                  <button type="button" className="arena-go arena-go--ghost" onClick={() => { setIsDefeated(false); setBossHp(boss.hpMax); setIdx(0); setLastResult(null); setBroccoliHits(0); setZondaArmed(false) }}>
                    revivir al jefe (sandbox)
                  </button>
                )}
              </div>
              {testMode && <div style={{ marginTop: 10 }}><ResetBossButton bossId={boss.id} onDone={() => window.location.reload()} /></div>}
            </div>
          ) : challenge ? (
            <>
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

              <BattleConsole
                boss={boss}
                challenge={challenge}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                lastResult={lastResult}
                lastDamage={lastResult?.isCorrect ? lastDamage : null}
                penguin={penguinOn}
                codeReplace={codeReplace}
                onCodeChange={handleCodeChange}
                banner={zondaArmed ? (
                  <div className="arena-banner item-status-in">
                    <ItemSprite sprite="zonda" size={24} animated />
                    <span><b>Sopla el Zonda.</b> En este ataque no importa la consigna: cualquier código que funcione sin error le pega al jefe.</span>
                  </div>
                ) : null}
              />

              {testMode && (
                <div className="arena-tools">
                  <span style={{ color: 'hsl(var(--accent))' }}>{adminTools ? 'docente' : 'test'}</span>
                  <button type="button" disabled={isLoading} onClick={() => handleSubmit('# TEST: acierto simulado', 'hit')}>acierto</button>
                  <button type="button" disabled={isLoading} onClick={() => handleSubmit('# TEST: jefe derrotado', 'kill')}>derrotar</button>
                  {adminTools && (
                    <>
                      <button type="button" disabled={isLoading} onClick={() => handleSubmit('# TEST: fallo simulado', 'miss')}
                        title={showPlayerHp ? `Respuesta incorrecta: −${PLAYER_WRONG_PENALTY} de vida` : 'Respuesta incorrecta (la vida del jugador solo existe en TRAINEE)'}>
                        fallo
                      </button>
                      <button type="button" disabled={isLoading} onClick={() => { setPlayerHp(0); setDefeatVisible(true); setPlayerDefeated(true) }}>perder</button>
                    </>
                  )}
                  <ResetBossButton bossId={boss.id} onDone={() => window.location.reload()} />
                </div>
              )}

              {(ownedItems.length > 0 || sandbox) && (
                <>
                  <form className="arena-inv" onSubmit={(e) => { e.preventDefault(); runInventory() }}>
                    <label htmlFor="arena-inv-input">&gt;&gt;&gt;</label>
                    <input
                      id="arena-inv-input"
                      value={invLine}
                      onChange={(e) => setInvLine(e.target.value)}
                      placeholder="print(item) para usar un ítem"
                      autoComplete="off"
                      spellCheck={false}
                      aria-label="Usar un ítem: print(nombre)"
                    />
                    <span className="arena-inv-items" aria-hidden>
                      {ownedItems.slice(0, 8).map((it) => {
                        const sp = itemSpriteKey(it.glyph)
                        return sp ? (
                          <button
                            key={it.id}
                            type="button"
                            title={`print(${it.printName})`}
                            onClick={() => { sfx.itemFocus(); setInvEcho({ ok: true, text: it.name, hint: `Para usarlo escribí print(${it.printName})` }) }}
                            style={{ background: 'none', border: 0, padding: 1, cursor: 'pointer', opacity: equippedItems.includes(it.id) ? 1 : 0.8 }}
                            tabIndex={-1}
                          >
                            <ItemSprite sprite={sp} size={18} />
                          </button>
                        ) : null
                      })}
                    </span>
                  </form>
                  {invEcho && (
                    <div className={`arena-inv-echo${invEcho.ok ? '' : ' arena-inv-echo--bad'}`}>
                      {invEcho.text}
                      {invEcho.hint && <small>{invEcho.hint}</small>}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="arena-note">No hay desafíos disponibles para este jefe.</p>
          )}
        </section>
      </div>
    </div>
  )
}

/** Barra de vida por segmentos (la misma de los jefes secretos, con el acento del tema). */
function SegBar({ value, max, label, small = false, low = false }: { value: number; max: number; label: string; small?: boolean; low?: boolean }) {
  const segs = small ? 20 : 30
  const on = Math.ceil((Math.max(0, value) / max) * segs)
  return (
    <div
      className={`arena-bar${small ? ' arena-bar--sm' : ''}${low ? ' arena-bar--low' : ''}`}
      role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}
    >
      {Array.from({ length: segs }, (_, i) => <span key={i} className={i < on ? 'on' : undefined} />)}
    </div>
  )
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
