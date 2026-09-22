import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { BOSSES } from '@/lib/game/bosses'
import AdminPanel from './AdminPanel'
import type { BattleRow, AttackRow } from '@/lib/admin/stats'
import { getTestUserIds } from '@/lib/test-student/server'

// PostgREST devuelve como máximo 1000 filas por consulta: se pagina hasta agotar.
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const size = 1000
  const rows: T[] = []
  for (let from = 0; ; from += size) {
    const { data } = await page(from, from + size - 1)
    rows.push(...(data ?? []))
    if (!data || data.length < size) return rows
  }
}

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

  // El alumno TEST (pruebas en PCs) no cuenta en listas ni estadísticas
  const testIds = await getTestUserIds(supabase)

  // Fetch all students
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, username, role, aula_id, created_at')
    .order('username')
  const students = (allProfiles ?? []).filter((p: { id: string }) => !testIds.has(p.id))

  // Fetch all aulas
  const { data: aulas } = await supabase
    .from('aulas')
    .select('id, nombre, turno, created_at')
    .order('nombre')

  // Fetch boss states from DB
  const { data: bossRows } = await supabase
    .from('bosses')
    .select('id, is_enabled')

  const bossEnabledMap: Record<string, boolean> = {}
  ;(bossRows ?? []).forEach((b: { id: string; is_enabled: boolean }) => {
    bossEnabledMap[b.id] = b.is_enabled
  })

  // Jefes habilitados por aula
  const { data: aulaBossRows } = await supabase
    .from('aula_bosses')
    .select('aula_id, boss_id, is_enabled')

  const aulaBossMap: Record<string, Record<string, boolean>> = {}
  ;(aulaBossRows ?? []).forEach((r: { aula_id: string; boss_id: string; is_enabled: boolean }) => {
    ;(aulaBossMap[r.aula_id] ??= {})[r.boss_id] = r.is_enabled
  })

  // Alumnos activos = con algún ataque en los últimos 10 minutos
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: recentAttacks } = await supabase
    .from('attack_records')
    .select('user_id')
    .gte('submitted_at', since)
  const activeIds = Array.from(new Set((recentAttacks ?? []).map((a: { user_id: string }) => a.user_id))).filter((id) => !testIds.has(id))

  // Dificultades por aula (sin fila rige el valor por defecto de la app)
  const { data: aulaTierRows } = await supabase
    .from('aula_tiers')
    .select('aula_id, tier, is_enabled')

  const aulaTierMap: Record<string, Record<string, boolean>> = {}
  ;(aulaTierRows ?? []).forEach((r: { aula_id: string; tier: string; is_enabled: boolean }) => {
    ;(aulaTierMap[r.aula_id] ??= {})[r.tier] = r.is_enabled
  })

  // Datos crudos para las estadísticas (sin el código enviado, que es pesado)
  const battleRows = (await fetchAll<{ user_id: string; boss_id: string; is_completed: boolean; attacks_count: number; started_at: string; completed_at: string | null }>(
    (from, to) => supabase
      .from('battle_records')
      .select('user_id, boss_id, is_completed, attacks_count, started_at, completed_at')
      .order('started_at')
      .range(from, to),
  )).filter((b) => !testIds.has(b.user_id))
  const attackRows = (await fetchAll<{ user_id: string; challenge_id: string; is_correct: boolean; submitted_at: string }>(
    (from, to) => supabase
      .from('attack_records')
      .select('user_id, challenge_id, is_correct, submitted_at')
      .order('submitted_at')
      .range(from, to),
  )).filter((a) => !testIds.has(a.user_id))

  const battles: BattleRow[] = battleRows.map((b) => ({
    u: b.user_id, b: b.boss_id, c: b.is_completed, n: b.attacks_count, s: b.started_at, e: b.completed_at,
  }))
  const attacks: AttackRow[] = attackRows.map((a) => ({
    u: a.user_id, ch: a.challenge_id, ok: a.is_correct, t: a.submitted_at,
  }))

  const scoreMap: Record<string, { defeated: number; attacks: number }> = {}
  battleRows.forEach((b) => {
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
          students={students}
          scoreMap={scoreMap}
          aulas={aulas ?? []}
          aulaBossMap={aulaBossMap}
          activeIds={activeIds}
          aulaTierMap={aulaTierMap}
          battles={battles}
          attacks={attacks}
        />
      </main>
    </div>
  )
}
