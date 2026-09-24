'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BossSprite from './BossSprite'
import HPBar from './HPBar'
import CodeEditor from './CodeEditor'
import MascotGuide from './MascotGuide'
import MercaderModal, { AmuletCard } from './MercaderModal'
import ResetBossButton from './ResetBossButton'
import BossIntro from './BossIntro'
import LessonWindow from './LessonWindow'
import Win from '@/components/ui/Win'
import { getLesson } from '@/lib/game/lessons'
import { executeChallenge, preloadPyodide, preloadSqlJs } from '@/lib/game/executor'
import { AMULET_META, getRandomAmuletOffer } from '@/lib/game/amulets'
import { AmuletIcon } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'
import { BOSS_DIALOGUES } from '@/lib/game/dialogues'
import type { Boss, Challenge, ChallengeTier, Amulet, AmuletType } from '@/types'

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
}

interface AttackResult {
  isCorrect: boolean
  output: string
  expected: string
  error: string | null
}

export default function CombatArena({
  boss, challenges, initialHp, initialDefeated, persist, victoryHref, localMode, showGuide, tier, defeatedBefore, testMode,
}: CombatArenaProps) {
  const router = useRouter()
  const attacksRef = useRef(persist?.attacksCount ?? 0)

  // Intro dialogue — inicializar false para evitar hydration mismatch, luego leer localStorage en useEffect
  const introLines = BOSS_DIALOGUES[boss.id] ?? []
  const hasIntro = introLines.length > 0
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

  // Boss state
  const [bossHp, setBossHp]                 = useState(initialHp ?? boss.hpMax)
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

  // Amulets
  const [amulets, setAmulets]               = useState<Amulet[]>([])

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

  // Load amulets from localStorage on mount
  useEffect(() => {
    import('@/lib/storage/local-store').then(({ getAmulets }) => {
      setAmulets(getAmulets())
    })
  }, [])

  const refreshAmulets = useCallback(() => {
    import('@/lib/storage/local-store').then(({ getAmulets }) => {
      setAmulets(getAmulets())
    })
  }, [])

  const challenge = challenges[currentChallengeIdx]

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
      const result = simulate
        ? { isCorrect: true, actualOutput: challenge.expectedOutput, expectedOutput: challenge.expectedOutput, error: null }
        : await executeChallenge(challenge, code)
      const attackResult: AttackResult = {
        isCorrect: result.isCorrect,
        output: result.actualOutput,
        expected: result.expectedOutput,
        error: result.error,
      }
      setLastResult(attackResult)

      if (result.isCorrect) {
        // ── Correct answer ───────────────────────────────────────────────
        const damage = simulate === 'kill' ? bossHp : challenge.damage
        const newBossHp = Math.max(0, bossHp - damage)
        setBossHp(newBossHp)
        setDamageAnim(true)
        if (newBossHp <= 0) {
          if (boss.type === 'final') sfx.powerdown()
          else sfx.victory()
          setVictoryVisible(true)
        } else {
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
        const onBossDefeated = (totalDefeated: number) => {
          if (totalDefeated % 2 === 0 && boss.type !== 'final') {
            setTimeout(() => {
              setMercaderOffers(getRandomAmuletOffer(2, tier))
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
              const totalDefeated = Object.values(getAllProgress()).filter((p) => p.defeated).length
              onBossDefeated(totalDefeated)
            }
          })
        } else if (bossDefeated) {
          onBossDefeated((defeatedBefore ?? 0) + 1)
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
      {showMercader && (
        <MercaderModal
          offers={mercaderOffers}
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
            </div>
            <h2 className="text-2xl mb-3" style={{ color: 'hsl(var(--tx))', lineHeight: 1.05 }}>{boss.name}</h2>
            <HPBar current={bossHp} max={boss.hpMax} label="HP JEFE" size="lg" color="hsl(var(--accent))" />
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
          </div>
        </Win>
      ) : challenge ? (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
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
          />
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
