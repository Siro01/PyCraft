import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/test-student/server'
import { buildDuel, toPublic, ARENA_TOPIC_IDS } from '@/lib/game/arena/generators'
import {
  ARENA_EXERCISES, ARENA_INVITE_SECONDS, ARENA_MIX, ARENA_PAIR_DAILY_STAKED, ARENA_STAKES, ARENA_UNLOCK_BOSS_ID,
  duelActKey, maxStakeFor, normalizeOutput, sharedTopics,
} from '@/lib/game/arena/rules'
import {
  arenaStats, balances, defeatedBy, getArenaCaller, startOfDayAR, toView, usernames,
  type ArenaCaller, type MatchRow,
} from '@/lib/game/arena/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// API de La Arena. El navegador nunca escribe en las tablas de la arena: todo
// pasa por acá (service role) y por las funciones de 013_arena.sql, que
// liquidan cada duelo en una sola transacción.
//
// GET  → estado del alumno: duelo en curso, retos recibidos, historial, XP y diamantes.
// POST → { action: 'challenge' | 'accept' | 'decline' | 'cancel' | 'forfeit' | 'submit' | 'tick' | 'void', … }

const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

const MATCH_COLS = 'id, aula_id, player_a, player_b, boss_id, act_key, stake, status, exercises, progress_a, progress_b, winner_id, end_reason, created_at, started_at, ends_at'

async function loadMatch(admin: SupabaseClient, id: string): Promise<MatchRow | null> {
  const { data } = await admin.from('arena_matches').select(MATCH_COLS).eq('id', id).maybeSingle()
  return (data as MatchRow | null) ?? null
}

/** Pone al día lo vencido de este alumno: retos sin respuesta y duelos sin tiempo. */
async function sweep(admin: SupabaseClient, userId: string) {
  const cutoff = new Date(Date.now() - ARENA_INVITE_SECONDS * 1000).toISOString()
  await admin.from('arena_matches').update({ status: 'expired', finished_at: new Date().toISOString() })
    .eq('status', 'pending').lt('created_at', cutoff).or(`player_a.eq.${userId},player_b.eq.${userId}`)
  const { data: stale } = await admin.from('arena_matches').select('id')
    .eq('status', 'active').lt('ends_at', new Date().toISOString()).or(`player_a.eq.${userId},player_b.eq.${userId}`)
  for (const m of (stale ?? []) as { id: string }[]) await admin.rpc('arena_timeout', { p_match: m.id })
}

async function canOpenArena(admin: SupabaseClient, who: ArenaCaller): Promise<string | null> {
  if (who.isAdmin) return null
  if (!who.aulaId) return 'No estás en ningún aula.'
  const { data: aula } = await admin.from('aulas').select('arena_enabled').eq('id', who.aulaId).maybeSingle()
  if (aula && aula.arena_enabled === false) return 'Tu docente cerró la arena por ahora.'
  const d = await defeatedBy(admin, [who.id])
  if (!d.get(who.id)?.has(ARENA_UNLOCK_BOSS_ID)) return 'La arena se abre al vencer al Golem Infinito.'
  return null
}

/** ¿Se puede jugar por diamantes entre estos dos hoy? Devuelve el motivo si no. */
async function stakeProblem(admin: SupabaseClient, a: { id: string; isAdmin: boolean; isTest: boolean }, b: { id: string; isAdmin: boolean; isTest: boolean }, stake: number): Promise<string | null> {
  if (stake === 0) return null
  if (!(ARENA_STAKES as readonly number[]).includes(stake)) return 'Cantidad de diamantes inválida.'
  if (a.isAdmin || b.isAdmin || a.isTest || b.isTest) return 'Con el docente o la cuenta de prueba solo hay amistosos.'
  const defeated = await defeatedBy(admin, [a.id, b.id])
  const money = await balances(admin, [a.id, b.id], defeated)
  for (const p of [a, b]) {
    const m = money.get(p.id)
    if (!m || maxStakeFor(m.balance, m.lostToday) < stake) {
      return p.id === a.id ? 'No te alcanzan los diamantes para ese reto (o ya llegaste al tope de hoy).' : 'A tu rival no le alcanzan los diamantes para ese reto hoy.'
    }
  }
  const { count } = await admin.from('arena_matches').select('id', { count: 'exact', head: true })
    .gt('stake', 0).in('status', ['active', 'finished']).gte('created_at', startOfDayAR())
    .or(`and(player_a.eq.${a.id},player_b.eq.${b.id}),and(player_a.eq.${b.id},player_b.eq.${a.id})`)
  if ((count ?? 0) >= ARENA_PAIR_DAILY_STAKED) return `Hoy ya se retaron ${ARENA_PAIR_DAILY_STAKED} veces por diamantes. Por hoy, solo amistosos.`
  return null
}

async function profileOf(admin: SupabaseClient, id: string) {
  const { data } = await admin.from('profiles').select('id, username, role, aula_id, is_test').eq('id', id).maybeSingle()
  return data as { id: string; username: string; role: string; aula_id: string | null; is_test: boolean } | null
}

// ─── GET ───────────────────────────────────────────────────────────────────
export async function GET() {
  const me = await getArenaCaller()
  if (!me) return err('No autenticado', 401)
  const admin = adminClient()
  await sweep(admin, me.id)

  const { data: rows, error } = await admin.from('arena_matches').select(MATCH_COLS)
    .or(`player_a.eq.${me.id},player_b.eq.${me.id}`).order('created_at', { ascending: false }).limit(12)
  if (error) return err(`${error.message} — ¿ejecutaste la migración 013_arena.sql?`, 500)
  const list = (rows ?? []) as MatchRow[]
  const names = await usernames(admin, list.flatMap((m) => [m.player_a, m.player_b]).concat(me.id))

  const live = list.find((m) => m.status === 'active') ?? list.find((m) => m.status === 'pending' && m.player_a === me.id) ?? null
  const incoming = list.filter((m) => m.status === 'pending' && m.player_b === me.id)
  const history = list.filter((m) => m.status === 'finished').slice(0, 8)

  return NextResponse.json({
    stats: await arenaStats(admin, me.id),
    live: live ? await toView(admin, live, me.id, names) : null,
    incoming: await Promise.all(incoming.map((m) => toView(admin, m, me.id, names))),
    history: await Promise.all(history.map((m) => toView(admin, m, me.id, names))),
  })
}

// ─── POST ──────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const me = await getArenaCaller()
  if (!me) return err('No autenticado', 401)
  const body = await request.json().catch(() => ({}))
  const admin = adminClient()
  const action = String(body.action ?? '')

  try {
    if (action === 'challenge') {
      const closed = await canOpenArena(admin, me)
      if (closed) return err(closed, 403)
      const rival = await profileOf(admin, String(body.opponentId ?? ''))
      if (!rival || rival.id === me.id) return err('Ese compañero no existe.')
      const rivalAdmin = rival.role === 'admin'
      if (!me.isAdmin && !rivalAdmin && rival.aula_id !== me.aulaId) return err('Solo podés retar a compañeros de tu aula.')

      const defeated = await defeatedBy(admin, [me.id, rival.id], new Set([me.isAdmin ? me.id : '', rivalAdmin ? rival.id : ''].filter(Boolean)))
      if (!rivalAdmin && !defeated.get(rival.id)?.has(ARENA_UNLOCK_BOSS_ID)) return err(`${rival.username} todavía no abrió la arena.`)
      const shared = sharedTopics(defeated.get(me.id) ?? [], defeated.get(rival.id) ?? []).filter((t) => ARENA_TOPIC_IDS.has(t.id))
      const topic = String(body.topic ?? '')
      if (!shared.length) return err('Todavía no tienen temas en común.')
      if (topic !== ARENA_MIX && !shared.some((t) => t.id === topic)) return err('Ese tema no lo vieron los dos.')

      const stake = Number(body.stake) || 0
      const problem = await stakeProblem(admin, me, { id: rival.id, isAdmin: rivalAdmin, isTest: rival.is_test }, stake)
      if (problem) return err(problem)

      const { count: busy } = await admin.from('arena_matches').select('id', { count: 'exact', head: true })
        .eq('status', 'active').gt('ends_at', new Date().toISOString()).or(`player_a.eq.${me.id},player_b.eq.${me.id}`)
      if ((busy ?? 0) > 0) return err('Ya estás en un duelo.')

      // Un reto pendiente a la vez: el anterior se cancela.
      await admin.from('arena_matches').update({ status: 'cancelled', finished_at: new Date().toISOString() }).eq('player_a', me.id).eq('status', 'pending')

      const seed = Math.floor(Math.random() * 2 ** 31)
      const exercises = buildDuel(topic, shared, seed)
      const { data: row, error } = await admin.from('arena_matches').insert({
        aula_id: me.aulaId ?? rival.aula_id,
        player_a: me.id, player_b: rival.id,
        boss_id: topic, act_key: duelActKey(topic, shared), stake,
        exercises: exercises.map(toPublic),
      }).select(MATCH_COLS).single()
      if (error || !row) return err(error?.message ?? 'No se pudo crear el reto', 500)
      const { error: secErr } = await admin.from('arena_match_secrets').insert(
        exercises.map((e, idx) => ({ match_id: row.id, idx, expected: e.expectedOutput })),
      )
      if (secErr) return err(secErr.message, 500)
      return NextResponse.json({ match: await toView(admin, row as MatchRow, me.id) })
    }

    const matchId = String(body.matchId ?? '')
    const m = await loadMatch(admin, matchId)
    if (!m || (me.id !== m.player_a && me.id !== m.player_b && !(action === 'void' && me.isAdmin))) return err('Ese duelo no existe.', 404)

    if (action === 'accept') {
      if (m.player_b !== me.id || m.status !== 'pending') return err('Ese reto ya no está disponible.')
      if (m.stake > 0) {
        const [a, b] = await Promise.all([profileOf(admin, m.player_a), profileOf(admin, m.player_b)])
        // Desde el punto de vista de quien acepta (b): "vos" es b y "tu rival" es a.
        const problem = a && b && await stakeProblem(admin,
          { id: b.id, isAdmin: b.role === 'admin', isTest: b.is_test },
          { id: a.id, isAdmin: a.role === 'admin', isTest: a.is_test }, m.stake)
        if (problem) return err(problem)
      }
      const { data, error } = await admin.rpc('arena_accept', { p_match: m.id, p_user: me.id })
      if (error) return err(error.message.includes('otro duelo') ? 'Uno de los dos ya está en otro duelo.' : error.message, 409)
      const row = data as MatchRow
      if (row.status === 'expired') return err('El reto venció: pasó más de un minuto.')
      return NextResponse.json({ match: await toView(admin, row, me.id) })
    }

    if (action === 'decline' || action === 'cancel' || action === 'forfeit') {
      const { data, error } = await admin.rpc('arena_leave', { p_match: m.id, p_user: me.id })
      if (error) return err(error.message, 500)
      return NextResponse.json({ match: await toView(admin, data as MatchRow, me.id) })
    }

    if (action === 'tick') {
      const { data } = await admin.rpc('arena_timeout', { p_match: m.id })
      return NextResponse.json({ match: await toView(admin, (data as MatchRow | null) ?? m, me.id) })
    }

    if (action === 'submit') {
      const idx = Number(body.idx)
      const output = String(body.output ?? '').slice(0, 10_000)
      if (!Number.isInteger(idx) || idx < 0 || idx >= ARENA_EXERCISES) return err('Ejercicio inválido.')
      if (m.status !== 'active') return NextResponse.json({ correct: false, match: await toView(admin, m, me.id) })
      const { data: secret } = await admin.from('arena_match_secrets').select('expected').eq('match_id', m.id).eq('idx', idx).maybeSingle()
      const correct = !!secret && normalizeOutput(output) === normalizeOutput(secret.expected)
      const { data } = correct
        ? await admin.rpc('arena_record_solve', { p_match: m.id, p_user: me.id, p_idx: idx, p_total: ARENA_EXERCISES })
        : await admin.rpc('arena_timeout', { p_match: m.id })
      return NextResponse.json({ correct, match: await toView(admin, (data as MatchRow | null) ?? m, me.id) })
    }

    if (action === 'void') {
      if (!me.isAdmin) return err('Sin permisos', 403)
      const { data, error } = await admin.rpc('arena_void', { p_match: m.id })
      if (error) return err(error.message, 500)
      return NextResponse.json({ match: data })
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Error inesperado', 500)
  }

  return err('Acción inválida')
}
