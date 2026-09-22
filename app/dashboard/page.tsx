import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { isLocalMode } from '@/lib/local-mode'
import LocalDashboard from '@/components/game/LocalDashboard'
import Header from '@/components/layout/Header'
import BossMap from '@/components/game/BossMap'
import TierSelector from '@/components/game/TierSelector'
import { BOSSES } from '@/lib/game/bosses'
import { TIER_COOKIE, pickTier } from '@/lib/game/tiers'
import { getEnabledBossIds } from '@/lib/supabase/enabled-bosses'
import { getEnabledTiers } from '@/lib/supabase/enabled-tiers'
import TestHud from '@/components/game/TestHud'
import { isTestUser } from '@/lib/test-student/server'

// ─── Supabase mode ────────────────────────────────────────────────────────────
// createClient is dynamically imported so the module doesn't crash when
// NEXT_PUBLIC_SUPABASE_URL is absent (local mode).
async function SupabaseDashboard() {
  const { createClient } = await import('@/lib/supabase/server')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  const enabledTiers = await getEnabledTiers(supabase, user.id, profile?.role === 'admin')
  const tier = pickTier(enabledTiers, (await cookies()).get(TIER_COOKIE)?.value)

  // Sin ninguna dificultad habilitada el alumno no puede combatir: no se muestra ningún jefe.
  const enabledIds = tier ? await getEnabledBossIds(supabase, user.id) : new Set<string>()

  const { data: battles } = await supabase
    .from('battle_records')
    .select('boss_id, hp_current, is_completed')
    .eq('user_id', user.id)

  // Si un jefe tiene algún registro completado, cuenta como derrotado.
  const battleMap = new Map<string, { hp: number; completed: boolean }>()
  for (const b of (battles ?? []) as { boss_id: string; hp_current: number; is_completed: boolean }[]) {
    const prev = battleMap.get(b.boss_id)
    if (!prev || (b.is_completed && !prev.completed)) {
      battleMap.set(b.boss_id, { hp: b.hp_current, completed: b.is_completed })
    }
  }

  const isTest = await isTestUser(supabase, user.id)
  const username = profile?.username ?? user.email?.split('@')[0] ?? 'Jugador'
  const role = profile?.role ?? 'student'
  const totalDefeated = [...battleMap.values()].filter((b) => b.completed).length

  const progress: Record<string, { hp: number; defeated: boolean }> = {}
  for (const [bossId, b] of battleMap) {
    progress[bossId] = { hp: b.hp, defeated: b.completed }
  }

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <Header username={username} role={role} />

      <BossMap
        bosses={BOSSES}
        progress={progress}
        enabledIds={enabledIds}
        testMode={isTest}
        username={username}
        totalDefeated={totalDefeated}
        headerExtra={tier && enabledTiers.length > 1 ? <TierSelector enabled={enabledTiers} current={tier} /> : undefined}
        emptyState={
          <div className="mb-12 card p-6 text-center">
            <div className="font-mono text-sm text-tx2">
              {tier ? 'Tu docente todavía no habilitó ningún jefe.' : 'Tu docente todavía no habilitó ninguna dificultad.'}
            </div>
            <div className="font-mono text-xs text-tx3 mt-1">Los jefes se habilitan clase a clase desde el panel admin.</div>
          </div>
        }
      />
      {isTest && <TestHud />}
    </div>
  )
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  if (isLocalMode()) return <LocalDashboard />
  return <SupabaseDashboard />
}
