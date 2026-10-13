// Lado servidor de La Arena (solo se importa desde app/api/arena y app/arena).
//
// Todo lo que decide algo — si un alumno puede retar, cuántos diamantes tiene
// de verdad, quién ganó — se calcula acá con la service role, nunca con datos
// que mande el navegador.

import type { SupabaseClient } from '@supabase/supabase-js'
import { BOSSES } from '@/lib/game/bosses'
import { DIAMONDS_PER_BOSS, SHOP_CATALOG } from '@/lib/game/shop'
import { playgroundDiamonds } from '@/lib/game/playground-rewards'
import type { OwnedShopItem } from '@/types'
import { ARENA_UNLOCK_BOSS_ID, maxStakeFor, type ArenaStake } from './rules'
import type { PublicArenaExercise } from './generators'
import type { ArenaStats, MatchView } from './types'

export interface ArenaCaller {
  id: string
  username: string
  isAdmin: boolean
  isTest: boolean
  aulaId: string | null
}

export interface RosterEntry {
  id: string
  username: string
  isTest: boolean
  isAdmin: boolean
  unlocked: boolean
  defeated: string[]
  /** Los diamantes más altos por los que se puede retar hoy (0 = solo amistoso). */
  maxStake: ArenaStake
}

/** El usuario logueado (con su sesión), o null. */
export async function getArenaCaller(): Promise<ArenaCaller | null> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('username, role, aula_id, is_test').eq('id', user.id).single()
  return {
    id: user.id,
    username: p?.username ?? user.email?.split('@')[0] ?? 'Jugador',
    isAdmin: p?.role === 'admin',
    isTest: p?.is_test === true,
    aulaId: p?.aula_id ?? null,
  }
}

/** Jefes derrotados por cada alumno (el docente cuenta como que vio todo). */
export async function defeatedBy(admin: SupabaseClient, ids: string[], adminIds: Set<string> = new Set()): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>(ids.map((id) => [id, new Set<string>()]))
  for (const id of adminIds) out.set(id, new Set(BOSSES.map((b) => b.id)))
  const students = ids.filter((id) => !adminIds.has(id))
  if (students.length) {
    const { data } = await admin.from('battle_records').select('user_id, boss_id').in('user_id', students).eq('is_completed', true)
    for (const r of (data ?? []) as { user_id: string; boss_id: string }[]) out.get(r.user_id)?.add(r.boss_id)
  }
  return out
}

/** Comienzo del día en Argentina (UTC−3), para los topes diarios. */
export function startOfDayAR(now = new Date()): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(now)
  return new Date(`${day}T00:00:00-03:00`).toISOString()
}

const CATALOG_IDS = new Set(SHOP_CATALOG.map((i) => i.id))

/**
 * Saldo CONSERVADOR de diamantes: jefes × 20 + patio + arena − lo gastado en
 * la tienda (lo que ya sincronizó game_extras). Deja afuera el bono del
 * docente, así que nunca habilita retarse por diamantes que el alumno no tiene.
 */
export async function balances(admin: SupabaseClient, ids: string[], defeated: Map<string, Set<string>>): Promise<Map<string, { balance: number; lostToday: number }>> {
  const out = new Map<string, { balance: number; lostToday: number }>()
  if (!ids.length) return out
  const [{ data: extras }, { data: ledger }] = await Promise.all([
    admin.from('game_extras').select('user_id, shop, playground').in('user_id', ids),
    admin.from('arena_ledger').select('user_id, delta, created_at').in('user_id', ids),
  ])
  const since = Date.parse(startOfDayAR())
  for (const id of ids) {
    const ex = (extras ?? []).find((e) => e.user_id === id) as { shop: OwnedShopItem[] | null; playground: { xpAwarded?: Record<string, boolean>; bestScore?: Record<string, number> } | null } | undefined
    const spent = (ex?.shop ?? []).filter((o) => CATALOG_IDS.has(o.id) || o.id.startsWith('secret:')).reduce((s, o) => s + (o.pricePaid ?? 0), 0)
    const pg = ex?.playground ? playgroundDiamonds({ xpAwarded: ex.playground.xpAwarded ?? {}, bestScore: ex.playground.bestScore ?? {} }) : 0
    const mine = ((ledger ?? []) as { user_id: string; delta: number; created_at: string }[]).filter((l) => l.user_id === id)
    const net = mine.reduce((s, l) => s + l.delta, 0)
    const lostToday = -mine.filter((l) => l.delta < 0 && Date.parse(l.created_at) >= since).reduce((s, l) => s + l.delta, 0)
    const bosses = defeated.get(id)?.size ?? 0
    out.set(id, { balance: bosses * DIAMONDS_PER_BOSS + pg + net - spent, lostToday })
  }
  return out
}

/** Compañeros del aula que pueden aparecer en el lobby (sin mí). */
export async function aulaRoster(admin: SupabaseClient, aulaId: string, meId: string): Promise<RosterEntry[]> {
  const { data: people } = await admin.from('profiles').select('id, username, role, is_test').eq('aula_id', aulaId).neq('id', meId).order('username')
  const list = (people ?? []) as { id: string; username: string; role: string; is_test: boolean }[]
  const adminIds = new Set(list.filter((p) => p.role === 'admin').map((p) => p.id))
  const ids = list.map((p) => p.id)
  const defeated = await defeatedBy(admin, ids, adminIds)
  const money = await balances(admin, ids.filter((id) => !adminIds.has(id)), defeated)
  return list.map((p) => {
    const d = defeated.get(p.id) ?? new Set<string>()
    const m = money.get(p.id)
    const isAdmin = adminIds.has(p.id)
    return {
      id: p.id, username: p.username, isTest: p.is_test, isAdmin,
      unlocked: isAdmin || d.has(ARENA_UNLOCK_BOSS_ID),
      defeated: [...d],
      maxStake: isAdmin || p.is_test || !m ? 0 : maxStakeFor(m.balance, m.lostToday),
    }
  })
}

/** Diamantes netos y XP de la arena de un alumno. */
export async function arenaStats(admin: SupabaseClient, userId: string): Promise<ArenaStats> {
  const [{ data: ledger }, { data: xp }] = await Promise.all([
    admin.from('arena_ledger').select('delta').eq('user_id', userId),
    admin.from('arena_xp').select('xp').eq('user_id', userId),
  ])
  return {
    net: ((ledger ?? []) as { delta: number }[]).reduce((s, l) => s + l.delta, 0),
    xp: ((xp ?? []) as { xp: number }[]).reduce((s, l) => s + l.xp, 0),
  }
}

// ─── Fila de arena_matches → lo que ve cada jugador ─────────────────────────
export interface MatchRow {
  id: string
  aula_id: string | null
  player_a: string
  player_b: string
  boss_id: string
  act_key: string
  stake: number
  status: MatchView['status']
  exercises: PublicArenaExercise[]
  progress_a: number
  progress_b: number
  winner_id: string | null
  end_reason: string | null
  created_at: string
  started_at: string | null
  ends_at: string | null
}

export async function usernames(admin: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const { data } = await admin.from('profiles').select('id, username').in('id', [...new Set(ids)])
  return new Map(((data ?? []) as { id: string; username: string }[]).map((p) => [p.id, p.username]))
}

export async function toView(admin: SupabaseClient, m: MatchRow, meId: string, names?: Map<string, string>): Promise<MatchView> {
  const n = names ?? await usernames(admin, [m.player_a, m.player_b])
  const iAmA = m.player_a === meId
  const rivalId = iAmA ? m.player_b : m.player_a
  let result: MatchView['result']
  if (m.status === 'finished') {
    const [{ data: led }, { data: xp }] = await Promise.all([
      admin.from('arena_ledger').select('delta').eq('match_id', m.id).eq('user_id', meId),
      admin.from('arena_xp').select('xp').eq('match_id', m.id).eq('user_id', meId),
    ])
    result = {
      diamonds: ((led ?? []) as { delta: number }[]).reduce((s, l) => s + l.delta, 0),
      xp: ((xp ?? []) as { xp: number }[]).reduce((s, l) => s + l.xp, 0),
    }
  }
  return {
    id: m.id,
    status: m.status,
    stake: m.stake,
    bossId: m.boss_id,
    actKey: m.act_key,
    iChallenged: iAmA,
    me: { id: meId, username: n.get(meId) ?? 'vos', progress: iAmA ? m.progress_a : m.progress_b },
    rival: { id: rivalId, username: n.get(rivalId) ?? 'rival', progress: iAmA ? m.progress_b : m.progress_a },
    // Los ejercicios recién se ven cuando el duelo arranca.
    exercises: m.status === 'active' || m.status === 'finished' ? m.exercises : [],
    createdAt: m.created_at,
    startedAt: m.started_at,
    endsAt: m.ends_at,
    serverNow: new Date().toISOString(),
    winnerId: m.winner_id,
    endReason: m.end_reason,
    result,
  }
}
