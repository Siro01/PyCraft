import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '@/lib/test-student/server'
import { DIAMONDS_PER_BOSS, SHOP_CATALOG } from '@/lib/game/shop'
import { playgroundDiamonds } from '@/lib/game/playground-rewards'
import { playgroundLevel } from '@/lib/game/level'
import type { OwnedShopItem } from '@/types'

// Compensaciones del docente (pestaña "Compensar" del panel admin).
// GET    ?aula=…  → alumnos con su saldo, nivel y compensaciones, más dos
//                   avisos del incidente del 15/10: compras copiadas de otra
//                   cuenta y saldo negativo.
// POST   { userId, diamonds, xp, note } → da la compensación.
// DELETE { id }                         → la deshace.
// Se guardan en arena_ledger (reason 'compensacion'), que el juego ya suma al
// saldo y al nivel en todas partes. Requiere la migración 018.

const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })
const HINT = ' — ¿ejecutaste la migración 018_compensaciones.sql?'
const MAX_DIAMONDS = 500
const MAX_XP = 1000
const CATALOG_IDS = new Set(SHOP_CATALOG.map((i) => i.id))

export interface CompensationRow { id: number; diamonds: number; xp: number; note: string | null; createdAt: string }
export interface StudentStanding {
  id: string
  username: string
  aulaId: string | null
  bosses: number
  diamonds: number
  xp: number
  level: number
  /** Compras que también figuran, idénticas, en la cuenta de otro alumno. */
  copied: number
  compensations: CompensationRow[]
}

type Playground = { xp?: number; xpAwarded?: Record<string, boolean>; bestScore?: Record<string, number> } | null

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const admin = adminClient()
  const aulaId = request.nextUrl.searchParams.get('aula')

  let q = admin.from('profiles').select('id, username, aula_id').eq('role', 'student').eq('is_test', false).order('username')
  if (aulaId) q = q.eq('aula_id', aulaId)
  const { data: people, error } = await q
  if (error) return err(error.message, 500)
  const ids = (people ?? []).map((p) => p.id as string)
  if (!ids.length) return NextResponse.json({ students: [] })

  // Todo en un solo viaje a la base. Las compras se leen de TODOS los alumnos
  // para poder detectar las copiadas entre cuentas (aunque sean de otra aula).
  const [battles, extras, allShops, ledger, arenaXp, raids] = await Promise.all([
    admin.from('battle_records').select('user_id, boss_id').eq('is_completed', true).in('user_id', ids),
    admin.from('game_extras').select('user_id, shop, playground').in('user_id', ids),
    admin.from('game_extras').select('user_id, shop'),
    admin.from('arena_ledger').select('id, user_id, delta, xp, reason, note, created_at').in('user_id', ids),
    admin.from('arena_xp').select('user_id, xp').in('user_id', ids),
    admin.from('raid_ledger').select('user_id, delta, xp').in('user_id', ids),
  ])
  if (ledger.error) return err(ledger.error.message + HINT, 500)

  const owners = new Map<string, Set<string>>()
  for (const e of (allShops.data ?? []) as { user_id: string; shop: OwnedShopItem[] | null }[]) {
    for (const o of e.shop ?? []) {
      const k = `${o.id}@${o.acquiredAt}`
      ;(owners.get(k) ?? owners.set(k, new Set()).get(k)!).add(e.user_id)
    }
  }

  const students: StudentStanding[] = (people ?? []).map((p) => {
    const id = p.id as string
    const bosses = new Set(((battles.data ?? []) as { user_id: string; boss_id: string }[]).filter((b) => b.user_id === id).map((b) => b.boss_id)).size
    const ex = ((extras.data ?? []) as { user_id: string; shop: OwnedShopItem[] | null; playground: Playground }[]).find((e) => e.user_id === id)
    const shop = ex?.shop ?? []
    const pg = ex?.playground ?? null
    const spent = shop.filter((o) => CATALOG_IDS.has(o.id) || o.id.startsWith('secret:')).reduce((s, o) => s + (o.pricePaid ?? 0), 0)
    const led = ((ledger.data ?? []) as { id: number; user_id: string; delta: number; xp: number | null; reason: string | null; note: string | null; created_at: string }[]).filter((l) => l.user_id === id)
    const raid = ((raids.data ?? []) as { user_id: string; delta: number; xp: number }[]).filter((r) => r.user_id === id)
    const axp = ((arenaXp.data ?? []) as { user_id: string; xp: number }[]).filter((x) => x.user_id === id)

    const diamonds = bosses * DIAMONDS_PER_BOSS
      + (pg ? playgroundDiamonds({ xpAwarded: pg.xpAwarded ?? {}, bestScore: pg.bestScore ?? {} }) : 0)
      + led.reduce((s, l) => s + l.delta, 0) + raid.reduce((s, r) => s + r.delta, 0) - spent
    const xp = (pg?.xp ?? 0) + axp.reduce((s, x) => s + x.xp, 0) + led.reduce((s, l) => s + (l.xp ?? 0), 0) + raid.reduce((s, r) => s + (r.xp ?? 0), 0)

    return {
      id, username: p.username as string, aulaId: (p.aula_id as string | null) ?? null,
      bosses, diamonds, xp, level: playgroundLevel(xp).level,
      copied: shop.filter((o) => (owners.get(`${o.id}@${o.acquiredAt}`)?.size ?? 0) > 1).length,
      compensations: led.filter((l) => l.reason === 'compensacion')
        .map((l) => ({ id: l.id, diamonds: l.delta, xp: l.xp ?? 0, note: l.note, createdAt: l.created_at }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }
  })
  return NextResponse.json({ students })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => ({}))
  const userId = String(body.userId ?? '')
  const diamonds = Math.trunc(Number(body.diamonds) || 0)
  const xp = Math.trunc(Number(body.xp) || 0)
  const note = String(body.note ?? '').trim().slice(0, 160)
  if (diamonds < 0 || diamonds > MAX_DIAMONDS) return err(`Los diamantes van de 0 a ${MAX_DIAMONDS}.`)
  if (xp < 0 || xp > MAX_XP) return err(`La XP va de 0 a ${MAX_XP}.`)
  if (!diamonds && !xp) return err('Poné diamantes, XP o las dos cosas.')
  if (!note) return err('Escribí el motivo (lo ves vos en el historial).')

  const admin = adminClient()
  const { data: who } = await admin.from('profiles').select('id, role').eq('id', userId).maybeSingle()
  if (!who || who.role !== 'student') return err('Ese alumno no existe.', 404)
  const { error } = await admin.from('arena_ledger').insert({ user_id: userId, delta: diamonds, xp, reason: 'compensacion', note, granted_by: auth.userId })
  if (error) return err(error.message + HINT, 500)
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const body = await request.json().catch(() => ({}))
  const id = Number(body.id)
  if (!Number.isInteger(id)) return err('Compensación inválida.')
  // Solo compensaciones: nunca borra diamantes ganados o perdidos en duelos.
  const { error, count } = await adminClient().from('arena_ledger').delete({ count: 'exact' }).eq('id', id).eq('reason', 'compensacion')
  if (error) return err(error.message + HINT, 500)
  if (!count) return err('Esa compensación ya no existe.', 404)
  return NextResponse.json({ ok: true })
}
