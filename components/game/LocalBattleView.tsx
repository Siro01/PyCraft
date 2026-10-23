'use client'

import Win from '@/components/ui/Win'
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
import { useSysConfirm } from '@/components/ui/SysDialog'

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

  const [ask, confirmNode] = useSysConfirm()
  const handleSkipBoss = useCallback(async () => {
    const skipAmulet = amulets.find((a) => a.type === 'skip-boss')
    if (!skipAmulet) return
    const ok = await ask({ title: 'TELETRANSPORTADOR', body: <>¿Usar el Teletransportador para saltarte a <b>{boss.name}</b>? El amuleto se gasta.</>, ok: 'Saltar' })
    if (!ok) return
    saveBossProgress(boss.id, 0, true)
    removeAmulet(skipAmulet.id)
    router.push('/dashboard')
  }, [amulets, boss.id, boss.name, router, ask])

  if (username === null) return <LoadingScreen label="Cargando batalla..." estimatedMs={1500} />

  const challenges = getChallengesForBoss(boss.id, tier)
  const skipAmulet = amulets.find((a) => a.type === 'skip-boss')

  return (
    <div className="min-h-screen flex flex-col desk-theme">
      {confirmNode}
      <Header username={username} role={role} />

      <main className="flex-1 mx-auto w-full px-4 py-5" style={{ maxWidth: 1180 }}>

        {/* Amulet activation notice */}
        {amuletNotice && <p className="arena-note" role="status" style={{ marginBottom: 12 }}>{amuletNotice}</p>}

        {challenges.length === 0 ? (
          <Win title="PROXIMAMENTE.EXE" active style={{ maxWidth: 520, margin: '0 auto' }} bodyStyle={{ padding: '18px 20px' }}>
            <div className="flex items-start gap-4">
              <IconLock size={32} color="hsl(var(--tx2))" />
              <div>
                <p style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 22, lineHeight: 1.1, color: 'hsl(var(--tx))', margin: 0 }}>Nivel {TIER_LABELS[tier]} — próximamente</p>
                <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: '6px 0 0' }}>Los desafíos de este nivel están en construcción. Probá con JUNIOR o TRAINEE.</p>
              </div>
            </div>
            <a href="/dashboard" className="cta-btn cta-btn--primary" style={{ marginTop: 16 }}>← Volver al mapa</a>
          </Win>
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
