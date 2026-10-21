import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import { BOSSES } from '@/lib/game/bosses'
import { CHALLENGES } from '@/lib/game/challenges'
import type { AttackRow, BattleRow } from '@/lib/admin/stats'
import AdminPanel from '@/app/admin/AdminPanel'
import AdminViewBar from '@/components/game/AdminViewBar'

// ─────────────────────────────────────────────────────────────────────────
// PÁGINA DE PRUEBA — solo en desarrollo. El escritorio docente con datos
// inventados, para revisar el rediseño sin iniciar sesión de docente. Los
// botones que escriben en Supabase fallan acá (no hay sesión): se ve el
// error en la línea de estado, que también sirve para probarla.
// ─────────────────────────────────────────────────────────────────────────

const now = Date.now()
const iso = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString()

const aulas = [
  { id: 'a1', nombre: 'PyCraft', turno: 'mañana', created_at: iso(90_000), hora_inicio: '08:00:00', hora_fin: '11:00:00', arena_enabled: true },
  { id: 'a2', nombre: 'PyCraft', turno: 'tarde', created_at: iso(90_000), hora_inicio: '14:00:00', hora_fin: '17:00:00', arena_enabled: false },
]
const names = ['tomi', 'valen', 'lu_mc', 'santi22', 'agus', 'mili', 'franco', 'cata', 'joaco', 'emma', 'bauti', 'sofi']
const students = [
  { id: 'adm', username: 'profe', role: 'admin', aula_id: null, created_at: iso(120_000) },
  ...names.map((n, i) => ({ id: `s${i}`, username: n, role: 'student', aula_id: i < 8 ? 'a1' : 'a2', created_at: iso(60_000 - i * 1000) })),
]
const scoreMap = Object.fromEntries(names.map((_, i) => [`s${i}`, { defeated: (i * 3) % 9, attacks: 12 + i * 7 }]))
// Batallas y ataques inventados: cada alumno avanzó (i*3)%9 jefes y erró más en los SQL.
const battles: BattleRow[] = []
const attacks: AttackRow[] = []
names.forEach((_, i) => {
  const won = (i * 3) % 9
  BOSSES.slice(0, won + 1).forEach((b, k) => {
    const start = now - (won - k + 1) * 3_600_000 - i * 60_000
    const done = k < won
    battles.push({ u: `s${i}`, b: b.id, c: done, n: 6 + ((i + k) % 5), s: new Date(start).toISOString(), e: done ? new Date(start + 1_200_000 + k * 60_000).toISOString() : null })
    CHALLENGES.filter((c) => c.bossId === b.id && c.tier === 'junior').forEach((c, j) => {
      const misses = (i + j + k) % (b.type === 'sql' ? 4 : 2)
      for (let m = 0; m <= misses; m++) attacks.push({ u: `s${i}`, ch: c.id, ok: m === misses && done, t: new Date(start + (j * 3 + m) * 60_000).toISOString() })
    })
  })
})
const aulaBossMap = { a1: Object.fromEntries(BOSSES.slice(0, 5).map((b) => [b.id, true])), a2: Object.fromEntries(BOSSES.slice(0, 3).map((b) => [b.id, true])) }

export default function AdminOsPreview() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className="min-h-screen desk-theme" style={{ background: 'hsl(var(--bg))' }}>
      <Header username="profe" role="admin" />
      <main className="max-w-[1440px] mx-auto px-4 pt-4" style={{ '--admin-bar-space': '64px', paddingBottom: 72 } as React.CSSProperties}>
        <AdminPanel
          bosses={BOSSES}
          bossEnabledMap={{}}
          students={students}
          scoreMap={scoreMap}
          aulas={aulas}
          aulaBossMap={aulaBossMap}
          activeIds={['s0', 's2', 's5']}
          aulaTierMap={{}}
          aulaRepasoMap={{ a1: { [BOSSES[0].id]: true } }}
          alumnoRepasoMap={{ s9: { [BOSSES[1].id]: true } }}
          repasoProgress={{ s0: { [BOSSES[0].id]: { beat: 4, done: true } }, s1: { [BOSSES[0].id]: { beat: 2, done: false } } }}
          battles={battles}
          attacks={attacks}
        />
      </main>
      <AdminViewBar view="admin" />
    </div>
  )
}
