'use client'

import Win from '@/components/ui/Win'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import BossMap from '@/components/game/BossMap'
import { LoadingScreen } from '@/components/ui/LoadingBar'
import { BOSSES } from '@/lib/game/bosses'
import { REPASO_BOSS_IDS } from '@/lib/game/repasos'
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
import { useSysConfirm } from '@/components/ui/SysDialog'

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

  const [ask, confirmNode] = useSysConfirm()
  const handleResetAll = async () => {
    const ok = await ask({ title: 'RESETEAR.EXE', body: <>¿Borrar el progreso de <b>todos</b> los jefes en este navegador?</>, ok: 'Resetear', danger: true })
    if (!ok) return
    clearAllProgress()
    setProgress({})
    setResetCount((c) => c + 1)
  }

  const handleTierChange = (t: ChallengeTier) => {
    setLocalTier(t)
    setTierState(t)
  }

  if (!ready) {
    return <LoadingScreen label="Cargando mapa de jefes..." estimatedMs={1500} />
  }

  const totalDefeated = Object.values(progress).filter((p) => p.defeated).length

  return (
    <div className="min-h-screen desk-theme">
      {confirmNode}
      <Header username={user?.name} role={user?.role} />

      <BossMap
        bosses={BOSSES}
        progress={progress}
        enabledIds={enabledIds}
        username={user?.name}
        isAdmin={user?.role === 'admin'}
        totalDefeated={totalDefeated}
        // Sin panel docente (modo local) no hay quién los habilite: quedan todos a mano.
        repasoIds={REPASO_BOSS_IDS}
        headerExtra={
          <div className="flex flex-col items-end gap-2 self-end">
            {/* Tier selector */}
            <div className="flex" role="radiogroup" aria-label="Dificultad">
              {TIERS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={tier === t.value}
                  onClick={() => handleTierChange(t.value)}
                  title={t.desc}
                  disabled={t.value === 'senior'}
                  className="aula-seg"
                  style={t.value === 'senior' ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {user?.role === 'admin' && (
              <button type="button" onClick={handleResetAll} className="sys-danger-btn">
                ↺ Resetear todo el progreso
              </button>
            )}
          </div>
        }
        // Modo local: una etiqueta en la barra del escritorio, no una tira encima.
        barNote={
          <span className="desk-note" title="El progreso se guarda en este navegador. Si se borran los datos del navegador, se reinicia.">LOCAL</span>
        }
        emptyState={
          <Win title="MAPA_DE_JEFES.EXE" active bodyStyle={{ padding: '18px 20px' }}>
            <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 21, lineHeight: 1.2, color: 'hsl(var(--tx))', margin: 0 }}>Ningún jefe habilitado.</p>
            <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 18, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: '6px 0 0' }}>Entrá como Admin para habilitarlos.</p>
          </Win>
        }
      />
    </div>
  )
}
