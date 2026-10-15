import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminClient } from '@/lib/test-student/server'
import { ARENA_TOPIC_IDS, toPublic } from '@/lib/game/arena/generators'
import { ARENA_MIX, ARENA_STAKES, ARENA_TOPICS, ARENA_UNLOCK_BOSS_ID, duelActKey, maxStakeFor, normalizeOutput } from '@/lib/game/arena/rules'
import { balances, defeatedBy, getArenaCaller, type ArenaCaller } from '@/lib/game/arena/server'
import { TEAMS, TEAM_GONE_SECONDS, type Team } from '@/lib/game/arena/team'
import { buildRoomExercises, ROOM_COLS, roomViews, type RoomRow } from '@/lib/game/arena/team-server'
import type { RoomView } from '@/lib/game/arena/types'

// API del 2 vs 2. Igual que /api/arena: el navegador nunca escribe en las
// tablas; todo pasa por acá (service role) y por las funciones de
// 016_arena_2v2.sql, que reparten ejercicios, relevos y premios de forma atómica.
//
// GET  ?aula=…&room=… → salas abiertas del aula + la mía
// POST { action: 'create' | 'seat' | 'leave' | 'ready' | 'call' | 'solve' | 'relay' | 'tick' | 'rematch' | 'void', … }

const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })
const HINT = ' — ¿ejecutaste la migración 016_arena_2v2.sql?'
const HINT_017 = 'Para la revancha falta correr la migración 017_arena_2v2_revancha.sql.'
/** Una sala sin arrancar se cierra sola pasado este tiempo. */
const LOBBY_MAX_MIN = 30

async function loadRoom(admin: SupabaseClient, id: string): Promise<RoomRow | null> {
  const { data } = await admin.from('arena_rooms').select(ROOM_COLS).eq('id', id).maybeSingle()
  return (data as RoomRow | null) ?? null
}

async function viewFor(admin: SupabaseClient, id: string, meId: string): Promise<RoomView | null> {
  const r = await loadRoom(admin, id)
  return r ? (await roomViews(admin, [r], meId))[0] : null
}

/** La sala en la que estoy (esperando o jugando), si hay. */
async function liveRoomOf(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin.from('arena_room_players').select('room_id, arena_rooms!inner(status)')
    .eq('user_id', userId).is('left_at', null).in('arena_rooms.status', ['lobby', 'active']).limit(1)
  return ((data ?? []) as { room_id: string }[])[0]?.room_id ?? null
}

async function arenaClosedFor(admin: SupabaseClient, me: ArenaCaller): Promise<string | null> {
  if (me.isAdmin) return null
  if (!me.aulaId) return 'No estás en ningún aula.'
  const { data: aula } = await admin.from('aulas').select('arena_enabled').eq('id', me.aulaId).maybeSingle()
  if (aula && aula.arena_enabled === false) return 'Tu docente cerró la arena por ahora.'
  return null
}

/** ¿Puede este alumno sentarse en una sala por esa cantidad de diamantes? */
async function stakeProblem(admin: SupabaseClient, me: ArenaCaller, defeated: Map<string, Set<string>>, stake: number): Promise<string | null> {
  if (stake === 0 || me.isAdmin) return null
  if (me.isTest) return 'Con la cuenta de prueba solo hay amistosos.'
  const m = (await balances(admin, [me.id], defeated)).get(me.id)
  if (!m || maxStakeFor(m.balance, m.lostToday) < stake) return 'No te alcanzan los diamantes para esta sala (o ya llegaste al tope de hoy).'
  return null
}

async function inOneVsOne(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { count } = await admin.from('arena_matches').select('id', { count: 'exact', head: true })
    .eq('status', 'active').gt('ends_at', new Date().toISOString()).or(`player_a.eq.${userId},player_b.eq.${userId}`)
  return (count ?? 0) > 0
}

// ─── GET ───────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const me = await getArenaCaller()
  if (!me) return err('No autenticado', 401)
  const admin = adminClient()
  const aulaId = me.isAdmin ? request.nextUrl.searchParams.get('aula') ?? me.aulaId : me.aulaId
  const asked = request.nextUrl.searchParams.get('room')

  const now = new Date().toISOString()
  const readAula = () => aulaId
    ? admin.from('arena_rooms').select(ROOM_COLS).eq('aula_id', aulaId).in('status', ['lobby', 'active']).order('created_at', { ascending: false }).limit(20)
    : Promise.resolve({ data: [] as RoomRow[], error: null })

  // La sala en la que estoy y las del aula, a la vez.
  const [mineId, first] = await Promise.all([liveRoomOf(admin, me.id), readAula()])
  if (first.error) return err(first.error.message + HINT, 500)
  let rows = (first.data ?? []) as RoomRow[]

  // Al día, solo si hace falta: salas viejas sin arrancar y duelos con el tiempo cumplido.
  const old = rows.filter((r) => r.status === 'lobby' && Date.parse(r.created_at) < Date.now() - LOBBY_MAX_MIN * 60_000).map((r) => r.id)
  const ended = rows.filter((r) => r.status === 'active' && r.ends_at && Date.parse(r.ends_at) < Date.now()).map((r) => r.id)
  if (old.length || ended.length) {
    await Promise.all([
      old.length ? admin.from('arena_rooms').update({ status: 'cancelled', finished_at: now }).in('id', old).eq('status', 'lobby') : null,
      ...ended.map((id) => admin.rpc('room_timeout', { p_room: id })),
    ])
    rows = ((await readAula()).data ?? []) as RoomRow[]
  }

  const missing = [mineId, asked].filter((id): id is string => !!id && !rows.some((r) => r.id === id))
  const [extra, views0] = await Promise.all([
    Promise.all(missing.map((id) => loadRoom(admin, id))),
    roomViews(admin, rows, me.id),
    mineId ? admin.from('arena_room_players').update({ last_seen: now }).eq('room_id', mineId).eq('user_id', me.id) : null,
  ])
  const extraRows = extra.filter((r): r is RoomRow => !!r)
  const views = extraRows.length ? [...views0, ...(await roomViews(admin, extraRows, me.id))] : views0
  const mine = views.find((v) => v.id === (mineId ?? asked)) ?? null
  return NextResponse.json({ rooms: views.filter((v) => v.status === 'lobby' || v.status === 'active'), mine })
}

// ─── POST ──────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const me = await getArenaCaller()
  if (!me) return err('No autenticado', 401)
  const body = await request.json().catch(() => ({}))
  const admin = adminClient()
  const action = String(body.action ?? '')
  const done = async (id: string, extra: Record<string, unknown> = {}) => NextResponse.json({ ...extra, room: await viewFor(admin, id, me.id) })

  try {
    if (action === 'create') {
      if (me.isAdmin) return err('El docente no arma salas: se suma a una.')
      const closed = await arenaClosedFor(admin, me)
      if (closed) return err(closed, 403)
      const defeated = await defeatedBy(admin, [me.id])
      const mine = defeated.get(me.id) ?? new Set<string>()
      if (!mine.has(ARENA_UNLOCK_BOSS_ID)) return err('La arena se abre al vencer al Golem Infinito.')
      if (await liveRoomOf(admin, me.id)) return err('Ya estás en una sala.')
      if (await inOneVsOne(admin, me.id)) return err('Estás en un duelo 1 vs 1.')
      const topics = ARENA_TOPICS.filter((t) => mine.has(t.id) && ARENA_TOPIC_IDS.has(t.id))
      const topic = String(body.topic ?? '')
      if (topic !== ARENA_MIX && !topics.some((t) => t.id === topic)) return err('Ese tema todavía no lo viste.')
      const stake = Number(body.stake) || 0
      if (stake && !(ARENA_STAKES as readonly number[]).includes(stake)) return err('Cantidad de diamantes inválida.')
      const problem = await stakeProblem(admin, me, defeated, stake)
      if (problem) return err(problem)

      const exercises = buildRoomExercises(topic, topics, Math.floor(Math.random() * 2 ** 31))
      const { data: row, error } = await admin.from('arena_rooms').insert({
        aula_id: me.aulaId, leader_id: me.id, boss_id: topic, act_key: duelActKey(topic, topics), stake,
        exercises: exercises.map(toPublic),
      }).select('id').single()
      if (error || !row) return err((error?.message ?? 'No se pudo armar la sala') + HINT, 500)
      const { error: e2 } = await admin.from('arena_room_secrets').insert(exercises.map((e, ex) => ({ room_id: row.id, ex, expected: e.expectedOutput })))
      if (e2) return err(e2.message, 500)
      const { error: e3 } = await admin.rpc('room_seat', { p_room: row.id, p_user: me.id, p_team: 'espada', p_slot: 1, p_role: 'alumno' })
      if (e3) return err(e3.message, 500)
      return done(row.id)
    }

    const room = await loadRoom(admin, String(body.roomId ?? ''))
    if (!room) return err('Esa sala no existe.', 404)
    if (!me.isAdmin && room.aula_id !== me.aulaId) return err('Esa sala es de otra aula.', 403)

    if (action === 'void') {
      if (!me.isAdmin) return err('Sin permisos', 403)
      const { error } = await admin.rpc('room_void', { p_room: room.id })
      if (error) return err(error.message, 500)
      return done(room.id)
    }

    if (action === 'rematch') {
      if (room.status !== 'finished' || room.end_reason === 'voided') return err('Esa sala no terminó.')
      const { data: oldRows } = await admin.from('arena_room_players').select('user_id, team, slot, role, left_at').eq('room_id', room.id)
      const before = (oldRows ?? []) as { user_id: string; team: Team; slot: 1 | 2; role: 'alumno' | 'docente'; left_at: string | null }[]
      const mineBefore = before.find((p) => p.user_id === me.id)
      if (!mineBefore) return err('No estabas en esa sala.', 403)

      // ¿Ya la armó alguno de los otros? Entonces me sumo a esa.
      const linked = await admin.from('arena_rooms').select('rematch_id').eq('id', room.id).maybeSingle()
      if (linked.error) return err(HINT_017, 500)
      const joinExisting = async (id: string) => {
        const next = await loadRoom(admin, id)
        if (!next || next.status !== 'lobby') return err('La revancha ya arrancó (o se cerró).')
        const { data: sitting } = await admin.from('arena_room_players').select('user_id').eq('room_id', id).eq('user_id', me.id).is('left_at', null).maybeSingle()
        if (!sitting) {
          const { error } = await admin.rpc('room_seat', { p_room: id, p_user: me.id, p_team: mineBefore.team, p_slot: mineBefore.slot, p_role: mineBefore.role })
          if (error) return err('Tu lugar en la revancha ya lo ocupó otro.', 409)
        }
        return done(id)
      }
      if (linked.data?.rematch_id) return joinExisting(linked.data.rematch_id as string)

      // Armarla: los mismos que terminaron, en los mismos lugares (salvo quien ya está en otra sala).
      if (await liveRoomOf(admin, me.id)) return err('Ya estás en otra sala.')
      const keep: typeof before = []
      for (const p of before.filter((x) => !x.left_at)) if (p.user_id === me.id || !(await liveRoomOf(admin, p.user_id))) keep.push(p)
      const alumnos = keep.filter((p) => p.role === 'alumno').map((p) => p.user_id)
      const defeated = await defeatedBy(admin, alumnos)
      const shared = ARENA_TOPICS.filter((t) => ARENA_TOPIC_IDS.has(t.id) && alumnos.every((id) => defeated.get(id)?.has(t.id)))
      let stake = room.stake
      if (stake > 0) {
        const [{ data: profs }, money] = await Promise.all([
          admin.from('profiles').select('id, is_test').in('id', alumnos),
          balances(admin, alumnos, defeated),
        ])
        const anyTest = ((profs ?? []) as { is_test: boolean }[]).some((p) => p.is_test)
        const short = alumnos.some((id) => { const m = money.get(id); return !m || maxStakeFor(m.balance, m.lostToday) < stake })
        if (anyTest || short) stake = 0
      }
      const exercises = buildRoomExercises(room.boss_id, shared.length ? shared : ARENA_TOPICS.filter((t) => t.id === room.boss_id), Math.floor(Math.random() * 2 ** 31))
      const { data: fresh, error } = await admin.from('arena_rooms').insert({
        aula_id: room.aula_id, leader_id: me.id, boss_id: room.boss_id, act_key: room.act_key, stake, exercises: exercises.map(toPublic),
      }).select('id').single()
      if (error || !fresh) return err((error?.message ?? 'No se pudo armar la revancha') + HINT, 500)
      // Si dos tocaron "revancha" a la vez, gana la primera: la otra se borra y se suma a esa.
      const { data: won } = await admin.from('arena_rooms').update({ rematch_id: fresh.id }).eq('id', room.id).is('rematch_id', null).select('id')
      if (!won?.length) {
        await admin.from('arena_rooms').delete().eq('id', fresh.id)
        const again = await admin.from('arena_rooms').select('rematch_id').eq('id', room.id).maybeSingle()
        return again.data?.rematch_id ? joinExisting(again.data.rematch_id as string) : err('No se pudo armar la revancha.', 409)
      }
      const [{ error: e2 }, { error: e3 }] = await Promise.all([
        admin.from('arena_room_secrets').insert(exercises.map((e, ex) => ({ room_id: fresh.id, ex, expected: e.expectedOutput }))),
        admin.from('arena_room_players').insert(keep.map((p) => ({ room_id: fresh.id, user_id: p.user_id, team: p.team, slot: p.slot, role: p.role }))),
      ])
      if (e2 || e3) return err((e2 ?? e3)!.message, 500)
      return done(fresh.id, { stakeDropped: stake !== room.stake })
    }

    if (action === 'seat') {
      const team = String(body.team) as Team
      const slot = Number(body.slot)
      if (!TEAMS.includes(team) || (slot !== 1 && slot !== 2)) return err('Lugar inválido.')
      if (room.status !== 'lobby') return err('Esa sala ya arrancó.')
      const live = await liveRoomOf(admin, me.id)
      if (live && live !== room.id) return err('Ya estás en otra sala.')
      if (!me.isAdmin) {
        const closed = await arenaClosedFor(admin, me)
        if (closed) return err(closed, 403)
        if (await inOneVsOne(admin, me.id)) return err('Estás en un duelo 1 vs 1.')
        const defeated = await defeatedBy(admin, [me.id])
        const mine = defeated.get(me.id) ?? new Set<string>()
        const need = [...new Set((room.exercises ?? []).slice(0, 6).map((e) => e.bossId))]
        if (!mine.has(ARENA_UNLOCK_BOSS_ID) || need.some((id) => !mine.has(id))) return err('Esta sala tiene temas que todavía no viste.')
        const problem = await stakeProblem(admin, me, defeated, room.stake)
        if (problem) return err(problem)
      } else {
        const { count } = await admin.from('arena_room_players').select('user_id', { count: 'exact', head: true })
          .eq('room_id', room.id).eq('role', 'docente').is('left_at', null).neq('user_id', me.id)
        if ((count ?? 0) > 0) return err('Ya hay un docente en esta sala.')
      }
      const { error } = await admin.rpc('room_seat', { p_room: room.id, p_user: me.id, p_team: team, p_slot: slot, p_role: me.isAdmin ? 'docente' : 'alumno' })
      if (error) return err(error.message.includes('ocupado') ? 'Ese lugar ya está ocupado.' : error.message.includes('arrancó') ? 'Esa sala ya arrancó.' : error.message, 409)
      return done(room.id)
    }

    const { data: seat } = await admin.from('arena_room_players').select('team, slot, role').eq('room_id', room.id).eq('user_id', me.id).is('left_at', null).maybeSingle()
    if (!seat) return err('No estás en esta sala.', 403)
    await admin.from('arena_room_players').update({ last_seen: new Date().toISOString() }).eq('room_id', room.id).eq('user_id', me.id)

    if (action === 'leave') {
      const { error } = await admin.rpc('room_leave', { p_room: room.id, p_user: me.id })
      if (error) return err(error.message, 500)
      return done(room.id)
    }
    if (action === 'ready') {
      const { error } = await admin.rpc('room_ready', { p_room: room.id, p_user: me.id, p_ready: body.ready !== false })
      if (error) return err(error.message, 500)
      return done(room.id)
    }
    if (action === 'call') {
      await admin.from('arena_rooms').update({ needs_teacher: true }).eq('id', room.id).eq('status', 'lobby')
      return done(room.id)
    }
    if (action === 'tick') {
      await admin.rpc('room_timeout', { p_room: room.id })
      return done(room.id)
    }
    if (action === 'relay') {
      const { error } = await admin.rpc('room_relay', { p_room: room.id, p_user: me.id, p_gone_secs: TEAM_GONE_SECONDS })
      if (error) {
        const m = error.message
        return err(m.includes('docente') ? 'El docente no hace relevo.' : m.includes('terminá') ? 'Primero terminá tu columna.' : m.includes('usaste') ? 'Ya usaste tu relevo.' : m, 409)
      }
      return done(room.id)
    }
    if (action === 'solve') {
      const idx = Number(body.idx)
      const output = String(body.output ?? '').slice(0, 10_000)
      if (!Number.isInteger(idx) || idx < 0 || idx > 5) return err('Ejercicio inválido.')
      if (room.status !== 'active') return done(room.id, { correct: false })
      const { data: task } = await admin.from('arena_room_tasks').select('ex, claimed_by, solved_by')
        .eq('room_id', room.id).eq('team', seat.team).eq('idx', idx).maybeSingle()
      if (!task || task.claimed_by !== me.id || task.solved_by) return done(room.id, { correct: false })
      const { data: secret } = await admin.from('arena_room_secrets').select('expected').eq('room_id', room.id).eq('ex', task.ex).maybeSingle()
      const correct = !!secret && normalizeOutput(output) === normalizeOutput(secret.expected)
      const { error } = correct
        ? await admin.rpc('room_solve', { p_room: room.id, p_user: me.id, p_idx: idx })
        : await admin.rpc('room_timeout', { p_room: room.id })
      if (error) return err(error.message, 500)
      return done(room.id, { correct })
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Error inesperado', 500)
  }
  return err('Acción inválida')
}
