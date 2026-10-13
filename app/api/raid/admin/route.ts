import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/test-student/server'
import { getArenaCaller } from '@/lib/game/arena/server'
import { loadRaid } from '@/lib/game/raid/server'

// Panel docente → pestaña Raids. Anular una raid (del Pistolero o de un jefe
// secreto) devuelve todo lo que movió: borra su botín y sus castigos de
// raid_ledger y las «primeras victorias» de raid_firsts, así el premio de 40
// se puede volver a ganar. Si la raid seguía viva, primero se cancela.
// Lo que ya se guardó en la PC del alumno (stickers, guarida vencida) no se toca.

const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

export async function POST(request: NextRequest) {
  const me = await getArenaCaller()
  if (!me) return err('No autenticado', 401)
  if (!me.isAdmin) return err('Sin permisos', 403)
  const body = await request.json().catch(() => ({}))
  if (body.action !== 'void') return err('Acción inválida')
  const admin = adminClient()
  const raid = await loadRaid(admin, String(body.raidId ?? ''))
  if (!raid) return err('Esa raid no existe.', 404)

  if (raid.status === 'lobby' || raid.status === 'active') {
    const { error } = await admin.rpc('raid_settle', { p_raid: raid.id, p_status: 'cancelled' })
    if (error) return err(error.message, 500)
  }
  const [led, firsts] = await Promise.all([
    admin.from('raid_ledger').delete().eq('raid_id', raid.id),
    admin.from('raid_firsts').delete().eq('raid_id', raid.id),
  ])
  if (led.error || firsts.error) return err((led.error ?? firsts.error)!.message, 500)
  await admin.from('raids').update({ attacks: { ...(raid.attacks ?? {}), voided: Date.now() } }).eq('id', raid.id)
  return NextResponse.json({ ok: true })
}
