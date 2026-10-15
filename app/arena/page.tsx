import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import ArenaApp from '@/components/game/arena/pvp/ArenaApp'
import { isLocalMode } from '@/lib/local-mode'
import { adminClient } from '@/lib/test-student/server'
import { aulaRoster, balances, defeatedBy, getArenaCaller } from '@/lib/game/arena/server'
import { ARENA_UNLOCK_BOSS_ID, ARENA_UNLOCK_BOSS_NAME, maxStakeFor } from '@/lib/game/arena/rules'

export const metadata = { title: 'La Arena · PySQLBossRush' }
export const dynamic = 'force-dynamic'

// La Arena: duelos entre compañeros del mismo aula. Se abre al vencer al
// Jefe 3; el docente la puede cerrar por aula desde el panel. El docente entra
// a cualquier aula (?aula=…) para mirar o para retar al alumno TEST.

function Closed({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen flex flex-col desk-theme">
      <Header />
      <main className="flex-1 mx-auto w-full px-4 py-10" style={{ maxWidth: 720 }}>
        <header className="arena-top"><a href="/dashboard" className="arena-link">← mapa</a></header>
        <div className="arena-end">
          <div className="arena-end-title">{title}</div>
          <p>{body}</p>
        </div>
      </main>
    </div>
  )
}

export default async function ArenaPage({ searchParams }: { searchParams: Promise<{ aula?: string }> }) {
  if (isLocalMode()) return <Closed title="LA ARENA" body="Los duelos son entre compañeros del taller: necesitan la cuenta del aula." />

  const me = await getArenaCaller()
  if (!me) redirect('/login')
  const admin = adminClient()
  const { aula: aulaParam } = await searchParams

  // Lo que no depende de nada va en paralelo: aulas (solo el docente) y mis jefes vencidos.
  type AulaRow = { id: string; nombre: string; arena_enabled: boolean | null }
  const [aulasRes, defeated] = await Promise.all([
    me.isAdmin ? admin.from('aulas').select('*').order('nombre') : Promise.resolve({ data: [] as AulaRow[] }),
    defeatedBy(admin, [me.id], me.isAdmin ? new Set([me.id]) : new Set()),
  ])
  // Aula: la del alumno; el docente elige (por defecto, la primera).
  const aulas = (aulasRes.data ?? []) as AulaRow[]
  const aulaId = me.isAdmin ? (aulas.find((a) => a.id === aulaParam)?.id ?? me.aulaId ?? aulas[0]?.id ?? null) : me.aulaId
  if (!aulaId) return <Closed title="SIN AULA" body="Todavía no estás en ningún aula. Pedile a tu docente que te sume a una." />

  const mine = defeated.get(me.id) ?? new Set<string>()
  if (!me.isAdmin && !mine.has(ARENA_UNLOCK_BOSS_ID)) {
    return <Closed title="BLOQUEADA" body={`La arena se abre al vencer al ${ARENA_UNLOCK_BOSS_NAME}. ¡Seguí jugando!`} />
  }

  // El aula, los compañeros y mi saldo: también en paralelo.
  const [aulaRes, roster, money] = await Promise.all([
    me.isAdmin ? Promise.resolve({ data: aulas.find((a) => a.id === aulaId) ?? null }) : admin.from('aulas').select('*').eq('id', aulaId).maybeSingle(),
    aulaRoster(admin, aulaId, me.id),
    me.isAdmin || me.isTest ? Promise.resolve(null) : balances(admin, [me.id], defeated),
  ])
  const aula = aulaRes.data as AulaRow | null
  if (!me.isAdmin && aula?.arena_enabled === false) {
    return <Closed title="CERRADA" body="Tu docente cerró la arena por ahora. Volvé más tarde." />
  }
  const m = money?.get(me.id)

  return (
    <div className="min-h-screen flex flex-col desk-theme">
      <Header username={me.username} role={me.isAdmin ? 'admin' : 'student'} />
      <main className="flex-1 mx-auto w-full px-4 py-5" style={{ maxWidth: 1180 }}>
        {me.isAdmin && aula?.arena_enabled === false && (
          <p className="arena-note" style={{ marginBottom: 12 }}>Esta aula tiene la arena cerrada: los alumnos no pueden entrar. La podés abrir desde el panel admin → Aulas.</p>
        )}
        <ArenaApp
          me={{ id: me.id, username: me.username, isAdmin: me.isAdmin, isTest: me.isTest }}
          aulaId={aulaId}
          aulaName={aula?.nombre ?? 'Aula'}
          aulas={me.isAdmin ? aulas.map((a) => ({ id: a.id, nombre: a.nombre })) : undefined}
          roster={roster}
          myDefeated={[...mine]}
          myMaxStake={m ? maxStakeFor(m.balance, m.lostToday) : 0}
        />
      </main>
    </div>
  )
}
