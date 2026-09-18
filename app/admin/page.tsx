import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { BOSSES } from '@/lib/game/bosses'
import AdminPanel from './AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch all students
  const { data: students } = await supabase
    .from('profiles')
    .select('id, username, role, created_at')
    .order('username')

  // Fetch boss states from DB
  const { data: bossRows } = await supabase
    .from('bosses')
    .select('id, is_enabled')

  const bossEnabledMap: Record<string, boolean> = {}
  ;(bossRows ?? []).forEach((b: { id: string; is_enabled: boolean }) => {
    bossEnabledMap[b.id] = b.is_enabled
  })

  // Fetch score summary per student
  const { data: battles } = await supabase
    .from('battle_records')
    .select('user_id, boss_id, is_completed, attacks_count')

  const scoreMap: Record<string, { defeated: number; attacks: number }> = {}
  ;(battles ?? []).forEach((b: { user_id: string; is_completed: boolean; attacks_count: number }) => {
    if (!scoreMap[b.user_id]) scoreMap[b.user_id] = { defeated: 0, attacks: 0 }
    if (b.is_completed) scoreMap[b.user_id].defeated++
    scoreMap[b.user_id].attacks += b.attacks_count
  })

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <Header username={profile.username} role="admin" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="label-mono mb-1">Panel de docente</div>
          <h1 className="text-3xl font-bold text-tx tracking-wide">Admin</h1>
        </div>

        <AdminPanel
          bosses={BOSSES}
          bossEnabledMap={bossEnabledMap}
          students={students ?? []}
          scoreMap={scoreMap}
        />
      </main>
    </div>
  )
}
