import { redirect } from 'next/navigation'
import StudentPistolero from '@/components/game/raid/StudentPistolero'
import { getArenaCaller } from '@/lib/game/arena/server'
import { isLocalMode } from '@/lib/local-mode'

export const metadata = { title: 'Duelo contra El Pistolero · PySQLBossRush' }
export const dynamic = 'force-dynamic'

// El duelo del aula contra El Pistolero (el docente en vivo). Se llega por el
// aviso sorpresa; el docente lo maneja desde /admin/pistolero.
export default async function PistoleroPage() {
  if (isLocalMode()) redirect('/dashboard')
  const me = await getArenaCaller()
  if (!me) redirect('/login')
  if (me.isAdmin) redirect('/admin/pistolero')
  return <StudentPistolero />
}
