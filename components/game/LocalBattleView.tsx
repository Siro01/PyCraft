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
}

const TIER_LABELS: Record<ChallengeTier, string> = {
  junior: 'JUNIOR',
  trainee: 'TRAINEE',
  senior: 'SENIOR',
}

export default function LocalBattleView({ boss, victoryHref }: Props) {
  const router = useRouter()
  const [username, setUsername]         = useState<string | null>(null)
  const [role, setRole]                 = useState<string | undefined>()
  const [tier, setTier]                 = useState<ChallengeTier>('junior')
  const [arenaKey, setArenaKey]         = useState(0)
  const [amulets, setAmulets]           = useState<Amulet[]>([])
  const [amuletNotice, setAmuletNotice] = useState<string | null>(null)

  useEffect(() => {
    const user = getLocalUser()
    if (!user) { router.replace('/login'); return }
    setUsername(user.name)
    setRole(user.role)
    const t = getLocalTier()
    setTier(t)

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
  }, [router, boss.id, boss.hpMax, boss.name])

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

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">

        {/* Breadcrumb + tier badge + admin reset + skip-boss */}
        <div className="flex items-center gap-2 mb-4 font-mono text-xs flex-wrap" style={{ color: 'hsl(var(--tx3))' }}>
          <a href="/dashboard" className="hover:text-tx transition-colors">← Mapa</a>
          <span>/</span>
          <span style={{ color: 'hsl(var(--tx2))' }}>{boss.title}</span>
          <span>/</span>
          <span className="text-tx">{boss.name}</span>

          {/* Tier badge */}
          <span
            className="ml-2 px-2 py-0.5 pixel-corners-sm font-mono text-[10px] tracking-widest font-bold"
            style={{
              background: tier === 'junior'  ? 'hsl(var(--python) / 0.15)'
                        : tier === 'trainee' ? 'hsl(var(--accent) / 0.15)'
                        : 'hsl(var(--danger) / 0.15)',
              color: tier === 'junior'  ? 'hsl(var(--python))'
                   : tier === 'trainee' ? 'hsl(var(--accent))'
                   : 'hsl(var(--danger))',
            }}
          >
            {TIER_LABELS[tier]}
          </span>

          {/* Skip boss amulet button */}
          {skipAmulet && (
            <button
              onClick={handleSkipBoss}
              className="ml-2 px-2 py-0.5 pixel-corners-sm border font-mono text-[10px] tracking-wide transition-all"
              style={{ borderColor: '#FFB800', color: '#FFB800', background: 'transparent' }}
              title={AMULET_META['skip-boss'].description}
            >
              <span className="inline-flex items-center gap-1">
                <IconCrystal size={10} color="#FFB800" />
                Teletransportador
              </span>
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={handleReset}
              className="ml-auto px-2 py-1 pixel-corners-sm border font-mono text-[10px] tracking-wide transition-all"
              style={{ borderColor: 'hsl(var(--border2))', color: 'hsl(var(--tx3))', background: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--danger) / 0.5)'
                e.currentTarget.style.color = 'hsl(var(--danger))'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'hsl(var(--border2))'
                e.currentTarget.style.color = 'hsl(var(--tx3))'
              }}
              title="Reinicia el HP de este jefe al máximo (solo admin)"
            >
              ↺ Reiniciar jefe
            </button>
          )}
        </div>

        {/* Amulet activation notice */}
        {amuletNotice && (
          <div
            className="mb-4 px-3 py-2 pixel-corners-sm border font-mono text-xs"
            style={{
              background: 'hsl(var(--danger) / 0.08)',
              borderColor: 'hsl(var(--danger) / 0.4)',
              color: 'hsl(var(--danger))',
            }}
          >
            {amuletNotice}
          </div>
        )}

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
            key={arenaKey}
            boss={boss}
            challenges={challenges}
            victoryHref={victoryHref}
            localMode
            showGuide={tier !== 'senior'}
            tier={tier}
          />
        )}
      </main>
    </div>
  )
}
