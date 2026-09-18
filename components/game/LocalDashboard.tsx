'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import BossMap from '@/components/game/BossMap'
import { BOSSES } from '@/lib/game/bosses'
import {
  getLocalUser,
  getAllProgress,
  getLocalEnabledBosses,
  clearAllProgress,
  getLocalTier,
  setLocalTier,
  type LocalUser,
  type BossProgress,
} from '@/lib/storage/local-store'
import type { ChallengeTier } from '@/types'

const TIERS: { value: ChallengeTier; label: string; desc: string }[] = [
  { value: 'junior',  label: 'JUNIOR',  desc: 'Ejercicios guiados, completá los huecos' },
  { value: 'trainee', label: 'TRAINEE', desc: 'Escribís más código vos' },
  { value: 'senior',  label: 'SENIOR',  desc: 'Próximamente' },
]

export default function LocalDashboard() {
  const router = useRouter()
  const [user, setUser]           = useState<LocalUser | null>(null)
  const [progress, setProgress]   = useState<Record<string, BossProgress>>({})
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set())
  const [tier, setTierState]      = useState<ChallengeTier>('junior')
  const [ready, setReady]         = useState(false)
  const [resetCount, setResetCount] = useState(0)

  useEffect(() => {
    const localUser = getLocalUser()
    if (!localUser) {
      router.replace('/login')
      return
    }
    setUser(localUser)
    setTierState(getLocalTier())

    const prog = getAllProgress()
    setProgress(prog)
    setResetCount(0) // re-read on mount

    // Admin gets all bosses; students get whatever is in localStorage (or first boss by default)
    if (localUser.role === 'admin') {
      setEnabledIds(new Set(BOSSES.map((b) => b.id)))
    } else {
      const saved = getLocalEnabledBosses()
      if (saved) {
        setEnabledIds(new Set(saved))
      } else {
        // First boss unlocked by default so there's always something to play
        setEnabledIds(new Set([BOSSES[0].id]))
      }
    }
    setReady(true)
  }, [router])

  const handleResetAll = () => {
    if (!confirm('¿Resetear el progreso de TODOS los jefes?')) return
    clearAllProgress()
    setProgress({})
    setResetCount((c) => c + 1)
  }

  const handleTierChange = (t: ChallengeTier) => {
    setLocalTier(t)
    setTierState(t)
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--bg))' }}>
        <span className="font-mono text-xs text-tx3 animate-pulse">Cargando…</span>
      </div>
    )
  }

  const totalDefeated = Object.values(progress).filter((p) => p.defeated).length

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <Header username={user?.name} role={user?.role} />

      <BossMap
        bosses={BOSSES}
        progress={progress}
        enabledIds={enabledIds}
        username={user?.name}
        totalDefeated={totalDefeated}
        headerExtra={
          <div className="flex flex-col items-end gap-2 self-end">
            {/* Tier selector */}
            <div className="flex gap-1">
              {TIERS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTierChange(t.value)}
                  title={t.desc}
                  disabled={t.value === 'senior'}
                  className="font-mono text-[10px] px-2 py-1 pixel-corners-sm border transition-all"
                  style={{
                    borderColor: tier === t.value
                      ? t.value === 'junior'  ? 'hsl(var(--python))'
                      : t.value === 'trainee' ? 'hsl(var(--accent))'
                      : 'hsl(var(--danger))'
                      : 'hsl(var(--border2))',
                    color: tier === t.value
                      ? t.value === 'junior'  ? 'hsl(var(--python))'
                      : t.value === 'trainee' ? 'hsl(var(--accent))'
                      : 'hsl(var(--danger))'
                      : 'hsl(var(--tx3))',
                    background: tier === t.value ? 'hsl(var(--surface2))' : 'transparent',
                    opacity: t.value === 'senior' ? 0.4 : 1,
                    cursor: t.value === 'senior' ? 'not-allowed' : 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {user?.role === 'admin' && (
              <button
                onClick={handleResetAll}
                className="font-mono text-[10px] px-2 py-1 pixel-corners-sm border transition-all"
                style={{
                  borderColor: 'hsl(var(--border2))',
                  color: 'hsl(var(--tx3))',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(var(--danger) / 0.5)'
                  e.currentTarget.style.color = 'hsl(var(--danger))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(var(--border2))'
                  e.currentTarget.style.color = 'hsl(var(--tx3))'
                }}
              >
                ↺ Resetear todo el progreso
              </button>
            )}
          </div>
        }
        notice={
          <div
            className="mb-8 px-3 py-2 pixel-corners-sm border font-mono text-xs"
            style={{
              background: 'hsl(var(--surface2))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--tx3))',
            }}
          >
            <span style={{ color: 'hsl(var(--accent))' }}>◉ LOCAL</span>
            {' '}— El progreso se guarda en este navegador. Si limpiás el storage se reinicia.
          </div>
        }
        emptyState={
          <div className="mb-12 card p-6 text-center">
            <div className="font-mono text-sm text-tx2">Ningún jefe habilitado.</div>
            <div className="font-mono text-xs text-tx3 mt-1">
              Iniciá sesión como Admin para habilitarlos.
            </div>
          </div>
        }
      />
    </div>
  )
}
