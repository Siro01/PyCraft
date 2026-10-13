import { redirect } from 'next/navigation'
import MesaPistolero from '@/components/game/raid/mesa/MesaPistolero'
import { adminClient } from '@/lib/test-student/server'
import { getArenaCaller } from '@/lib/game/arena/server'

export const metadata = { title: 'Mesa del Pistolero · PySQLBossRush' }
export const dynamic = 'force-dynamic'

// La Mesa del Pistolero (solo docente): desde acá se arma el aula, se dispara
// el evento, se corrige y se ataca. ?ensayo=1 = práctica con alumnos de mentira.
export default async function MesaPage({ searchParams }: { searchParams: Promise<{ aula?: string; ensayo?: string }> }) {
  const me = await getArenaCaller()
  if (!me) redirect('/login')
  if (!me.isAdmin) redirect('/dashboard')
  const { aula, ensayo } = await searchParams
  const { data } = await adminClient().from('aulas').select('id, nombre').order('nombre')
  const aulas = (data ?? []) as { id: string; nombre: string }[]
  if (!aulas.length) redirect('/admin')
  const initial = aulas.find((a) => a.id === aula)?.id ?? aulas[0].id
  return <MesaPistolero aulas={aulas} initialAulaId={initial} mode={ensayo ? 'demo' : 'live'} />
}
