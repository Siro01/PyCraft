'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import CombatArena from '@/components/game/CombatArena'
import {
  getLocalUser,
  saveBossProgress,
  getLocalTier,
  getAmulets,
  removeAmulet,
  getBossProgress,
} from '@/lib/storage/local-store'
import { getChallengesForBoss } from '@/lib/game/challenges'
import { AMULET_META } from '@/lib/game/amulets'
import { IconCrystal, IconLock } from '@/components/ui/PixelIcons'
import { LoadingScreen } from '@/components/ui/LoadingBar'
import type { Boss, ChallengeTier, Amulet } from '@/types'

interface Props {
  boss: Boss
  victoryHref?: string
  /** Pidió `?practica=1` — se respeta solo si el jefe ya figura derrotado en este navegador. */
  practiceRequested?: boolean
}

const TIER_LABELS: Record<ChallengeTier, string> = {
  junior: 'JUNIOR',
  trainee: 'TRAINEE',
  senior: 'SENIOR',
}

export default function LocalBattleView({ boss, victoryHref, practiceRequested = false }: Props) {
  const router = useRouter()
  const [username, setUsername]         = useState<string | null>(null)
  const [role, setRole]                 = useState<string | undefined>()
  const [tier, setTier]                 = useState<ChallengeTier>('junior')
  const [arenaKey, setArenaKey]         = useState(0)
  const [amulets, setAmulets]           = useState<Amulet[]>([])
  const [amuletNotice, setAmuletNotice] = useState<string | null>(null)
  const [practice, setPractice]         = useState(false)

  useEffect(() => {
    const user = getLocalUser()
    if (!user) { router.replace('/login'); return }
    setUsername(user.name)
    setRole(user.role)
    const t = getLocalTier()
    setTier(t)
    setPractice(practiceRequested && !!getBossProgress(boss.id)?.defeated)

    // Load amulets and apply boss-hp-reduction if boss hasn't started yet
    const currentAmulets = getAmulets()
    setAmulets(currentAmulets)

    const hpAmulet = currentAmulets.find((a) => a.type === 'boss-hp-reduction')
    if (hpAmulet) {
      const progress = getBossProgress(boss.id)
      if (!progress) {
        const reducedHp = Math.round(boss.hpMax * 0.6)
        saveBossProgress(boss.id, reducedHp, false)
        removeAmulet(hpAmulet.id)
        setAmulets(getAmulets())
        setAmuletNotice(
          `Amuleto de Debilidad activado — ${boss.name} comienza con ${reducedHp}/${boss.hpMax} HP`
        )
        setTimeout(() => setAmuletNotice(null), 5000)
      }
    }
  }, [router, boss.id, boss.hpMax, boss.name, practiceRequested])

  const handleReset = useCallback(() => {
    saveBossProgress(boss.id, boss.hpMax, false)
    setArenaKey((k) => k + 1)
  }, [boss.id, boss.hpMax])

  const handleSkipBoss = useCallback(() => {
    const skipAmulet = amulets.find((a) => a.type === 'skip-boss')
    if (!skipAmulet) return
    if (!confirm(`¿Usar Teletransportador para saltarte a ${boss.name}?`)) return
    saveBossProgress(boss.id, 0, true)
    removeAmulet(skipAmulet.id)
    router.push('/dashboard')
  }, [amulets, boss.id, boss.name, router])

  if (username === null) return <LoadingScreen label="Cargando batalla..." estimatedMs={1500} />

  const challenges = getChallengesForBoss(boss.id, tier)
  const skipAmulet = amulets.find((a) => a.type === 'skip-boss')

  return (
    <div className="min-h-screen flex flex-col desk-theme">
      <Header username={username} role={role} />

      <main className="flex-1 mx-auto w-full px-4 py-5" style={{ maxWidth: 1180 }}>

        {/* Amulet activation notice */}
        {amuletNotice && <p className="arena-note" role="status" style={{ marginBottom: 12 }}>{amuletNotice}</p>}

        {challenges.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="flex justify-center mb-3">
              <IconLock size={32} color="hsl(var(--tx3))" />
            </div>
            <div className="font-mono text-sm font-bold text-tx mb-2">
              Nivel {TIER_LABELS[tier]} — Próximamente
            </div>
            <p className="font-mono text-xs max-w-xs mx-auto" style={{ color: 'hsl(var(--tx3))' }}>
              Los desafíos para este nivel están en construcción. Probá con JUNIOR o TRAINEE.
            </p>
            <a href="/dashboard" className="btn-primary mt-6 inline-block">← Volver al mapa</a>
          </div>
        ) : (
          <CombatArena
            key={`${arenaKey}-${practice ? 'p' : 'n'}`}
            boss={boss}
            challenges={challenges}
            victoryHref={practice ? undefined : victoryHref}
            practice={practice}
            localMode
            showGuide={tier !== 'senior'}
            tier={tier}
            topExtra={
              <>
                <span className="arena-tag">{TIER_LABELS[tier]}</span>
                {skipAmulet && (
                  <button type="button" className="arena-link" onClick={handleSkipBoss} title={AMULET_META['skip-boss'].description}>
                    teletransportador
                  </button>
                )}
                {role === 'admin' && (
                  <button type="button" className="arena-link" onClick={handleReset} title="Reinicia el HP de este jefe al máximo (solo admin)">
                    ↺ reiniciar jefe
                  </button>
                )}
              </>
            }
          />
        )}
      </main>
    </div>
  )
}
