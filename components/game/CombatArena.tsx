'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BossSprite from './BossSprite'
import HPBar from './HPBar'
import CodeEditor from './CodeEditor'
import MascotGuide from './MascotGuide'
import MercaderModal from './MercaderModal'
import { executeChallenge, preloadPyodide, preloadSqlJs } from '@/lib/game/executor'
import { AMULET_META, getRandomAmuletOffer } from '@/lib/game/amulets'
import { AmuletIcon } from '@/components/ui/PixelIcons'
import type { Boss, Challenge, ChallengeTier, Amulet, AmuletType } from '@/types'

const PLAYER_MAX_HP = 100
const PLAYER_WRONG_PENALTY = 25  // TRAINEE: -25 HP per wrong answer

interface CombatArenaProps {
  boss: Boss
  challenges: Challenge[]
  initialHp?: number
  victoryHref?: string
  localMode?: boolean
  showGuide?: boolean
  tier?: ChallengeTier
}

interface AttackResult {
  isCorrect: boolean
  output: string
  expected: string
  error: string | null
}

export default function CombatArena({
  boss, challenges, initialHp, victoryHref, localMode, showGuide, tier,
}: CombatArenaProps) {
  const router = useRouter()

  // Boss state
  const [bossHp, setBossHp]                 = useState(initialHp ?? boss.hpMax)
  const [currentChallengeIdx, setIdx]       = useState(0)
  const [isLoading, setIsLoading]           = useState(false)
  const [lastResult, setLastResult]         = useState<AttackResult | null>(null)
  const [isDamageAnimating, setDamageAnim]  = useState(false)
  const [isDefeated, setIsDefeated]         = useState(false)
  const [log, setLog]                       = useState<string[]>([])

  // Player HP — only active in TRAINEE mode
  const showPlayerHp = tier === 'trainee'
  const [playerHp, setPlayerHp]             = useState(PLAYER_MAX_HP)
  const [isPlayerDefeated, setPlayerDefeated] = useState(false)

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

  // ── Amulet: use health potion ───────────────────────────────────────────────
  const handleUsePotion = useCallback(() => {
    const potion = amulets.find((a) => a.type === 'health-potion')
    if (!potion) return
    setPlayerHp((prev) => Math.min(PLAYER_MAX_HP, prev + 50))
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
  const handleSubmit = useCallback(async (code: string) => {
    if (!challenge || isLoading || isDefeated || isPlayerDefeated) return
    setIsLoading(true)
    setLastResult(null)

    try {
      const result = await executeChallenge(challenge, code)
      const attackResult: AttackResult = {
        isCorrect: result.isCorrect,
        output: result.actualOutput,
        expected: result.expectedOutput,
        error: result.error,
      }
      setLastResult(attackResult)

      if (result.isCorrect) {
        // ── Correct answer ───────────────────────────────────────────────
        const damage = challenge.damage
        const newBossHp = Math.max(0, bossHp - damage)
        setBossHp(newBossHp)
        setDamageAnim(true)
        setTimeout(() => setDamageAnim(false), 400)

        setLog((prev) => [
          `[${new Date().toLocaleTimeString()}] [ATK] ${challenge.title}: -${damage} HP → ${newBossHp} restante`,
          ...prev,
        ])

        const bossDefeated = newBossHp <= 0

        if (localMode) {
          import('@/lib/storage/local-store').then(({ saveBossProgress, getAllProgress }) => {
            saveBossProgress(boss.id, newBossHp, bossDefeated)

            if (bossDefeated) {
              // Merchant appears after every 2 bosses defeated (2, 4, 6…)
              const allProgress = getAllProgress()
              const totalDefeated = Object.values(allProgress).filter((p) => p.defeated).length
              if (totalDefeated % 2 === 0) {
                setTimeout(() => {
                  setMercaderOffers(getRandomAmuletOffer(2, tier))
                  setShowMercader(true)
                  if (victoryHref) setPendingVHref(victoryHref)
                }, 1600)
              } else if (victoryHref) {
                setTimeout(() => router.push(victoryHref), 2200)
              }
            }
          })
        }

        if (bossDefeated) {
          setIsDefeated(true)
          // Non-local mode redirect
          if (!localMode && victoryHref) setTimeout(() => router.push(victoryHref), 2200)
          return
        }

        // Advance to next challenge
        if (currentChallengeIdx < challenges.length - 1) {
          setTimeout(() => { setIdx((i) => i + 1); setLastResult(null) }, 1400)
        }

      } else {
        // ── Wrong answer ─────────────────────────────────────────────────
        if (showPlayerHp) {
          const newPlayerHp = Math.max(0, playerHp - PLAYER_WRONG_PENALTY)
          setPlayerHp(newPlayerHp)
          setLog((prev) => [
            `[${new Date().toLocaleTimeString()}] [-HP] Respuesta incorrecta: -${PLAYER_WRONG_PENALTY} HP`,
            ...prev,
          ])
          if (newPlayerHp <= 0) {
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
    localMode, boss.id, victoryHref, router,
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
    setBossHp(boss.hpMax)
  }, [boss.id, boss.hpMax, localMode])

  return (
    <div className="flex flex-col gap-4 h-full">
      {showGuide && <MascotGuide tip={challenge?.tip} />}
      {showMercader && (
        <MercaderModal
          offers={mercaderOffers}
          onChoose={(type) => handleMercaderClose(type)}
          onSkip={() => handleMercaderClose()}
        />
      )}

      {/* Boss panel */}
      <div className="card p-5">
        <div className="flex items-center gap-6">
          <div className={isDamageAnimating ? 'animate-damage-flash' : ''}>
            <BossSprite boss={boss} size="lg" defeated={isDefeated} animated={!isDefeated} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="label-mono">{boss.title}</span>
              <span className="font-mono text-xs" style={{ color: 'hsl(var(--tx3))' }}>{boss.topic}</span>
            </div>
            <h2 className="font-mono text-lg font-bold text-tx mb-3">{boss.name}</h2>
            <HPBar current={bossHp} max={boss.hpMax} label="HP JEFE" size="lg" color={boss.color} />
            {isDefeated && (
              <p className="mt-2 font-mono text-sm" style={{ color: boss.color }}>
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
            <HPBar
              current={playerHp}
              max={PLAYER_MAX_HP}
              label="HP JUGADOR"
              size="sm"
              color={playerHp <= 30 ? 'hsl(var(--danger))' : 'hsl(var(--python))'}
            />
          </div>
        )}
      </div>

      {/* Amulet bar */}
      {hasAmuletBar && !isDefeated && !isPlayerDefeated && (
        <div
          className="flex items-center gap-2 flex-wrap px-3 py-2 pixel-corners"
          style={{ background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))' }}
        >
          <span className="font-mono text-[10px] tracking-widest" style={{ color: 'hsl(var(--tx3))' }}>
            AMULETOS
          </span>
          {amulets.map((a) => {
            const meta = AMULET_META[a.type]
            const isPotion  = a.type === 'health-potion'
            const isEscape  = a.type === 'escape'
            const usable    = (isPotion && showPlayerHp) || (isEscape && canEscape)
            return (
              <button
                key={a.id}
                onClick={isPotion ? handleUsePotion : isEscape ? handleEscape : undefined}
                disabled={!usable && (isPotion || isEscape)}
                title={meta.description}
                className="flex items-center gap-1 px-2 py-1 pixel-corners-sm border font-mono text-[11px] transition-all"
                style={{
                  borderColor: usable ? meta.color : 'hsl(var(--border))',
                  color: usable ? meta.color : 'hsl(var(--tx3))',
                  background: 'transparent',
                  cursor: usable ? 'pointer' : 'default',
                  opacity: (!isPotion && !isEscape) ? 0.7 : usable ? 1 : 0.45,
                }}
              >
                <AmuletIcon type={a.type} size={16} color={usable ? meta.color : undefined} />
                <span>{meta.name}</span>
                {isPotion  && showPlayerHp && <span style={{ color: 'hsl(var(--python))' }}> [usar]</span>}
                {isEscape  && canEscape    && <span style={{ color: 'hsl(var(--accent))' }}> [escapar]</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Player defeated screen */}
      {isPlayerDefeated ? (
        <div className="card p-8 flex flex-col items-center gap-4 text-center">
          <div className="font-mono text-4xl font-bold" style={{ color: 'hsl(var(--danger))' }}>
            ¡DERROTA!
          </div>
          <p className="text-tx2 font-mono text-sm">
            Tu vida llegó a 0. Tenés que empezar la batalla de nuevo.
          </p>
          <button onClick={handleRestart} className="btn-primary">
            ↺ Reintentar batalla
          </button>
          <a href="/dashboard" className="font-mono text-xs" style={{ color: 'hsl(var(--tx3))' }}>
            ← Volver al mapa
          </a>
        </div>
      ) : isDefeated ? (
        <div className="card p-8 flex flex-col items-center gap-4 text-center">
          <div className="font-mono text-4xl font-bold" style={{ color: boss.color }}>
            VICTORIA
          </div>
          <p className="text-tx2">Derrotaste a <strong>{boss.name}</strong>.</p>
          <a href="/dashboard" className="btn-primary">
            ← Volver al mapa
          </a>
        </div>
      ) : challenge ? (
        <div className="flex-1 min-h-0">
          <CodeEditor
            boss={boss}
            challenge={challenge}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            lastResult={lastResult}
          />
        </div>
      ) : (
        <div className="card p-6 text-center font-mono" style={{ color: 'hsl(var(--tx3))' }}>
          No hay challenges disponibles para este jefe.
        </div>
      )}

      {/* Combat log */}
      {log.length > 0 && (
        <div className="card p-3 max-h-32 overflow-y-auto no-scrollbar">
          <div className="label-mono mb-1.5">Log de combate</div>
          {log.map((entry, i) => (
            <div key={i} className="font-mono text-xs leading-relaxed" style={{ color: 'hsl(var(--tx3))' }}>
              {entry}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
