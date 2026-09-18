import { redirect } from 'next/navigation'
import { isLocalMode } from '@/lib/local-mode'
import LocalDashboard from '@/components/game/LocalDashboard'
import Header from '@/components/layout/Header'
import BossMap from '@/components/game/BossMap'
import { BOSSES } from '@/lib/game/bosses'

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

  const { data: enabledRows } = await supabase
    .from('bosses')
    .select('id')
    .eq('is_enabled', true)

  const enabledIds = new Set((enabledRows ?? []).map((r: { id: string }) => r.id))

  const { data: battles } = await supabase
    .from('battle_records')
    .select('boss_id, hp_current, is_completed')
    .eq('user_id', user.id)

  const battleMap = new Map(
    (battles ?? []).map((b: { boss_id: string; hp_current: number; is_completed: boolean }) => [
      b.boss_id,
      { hp: b.hp_current, completed: b.is_completed },
    ])
  )

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
        username={username}
        totalDefeated={totalDefeated}
        emptyState={
          <div className="mb-12 card p-6 text-center">
            <div className="font-mono text-sm text-tx2">Tu docente todavía no habilitó ningún jefe.</div>
            <div className="font-mono text-xs text-tx3 mt-1">Los jefes se habilitan clase a clase desde el panel admin.</div>
          </div>
        }
      />
    </div>
  )
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  if (isLocalMode()) return <LocalDashboard />
  return <SupabaseDashboard />
}
