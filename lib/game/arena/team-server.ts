// Lado servidor del 2 vs 2 (solo lo importan app/api/arena/sala y app/arena).

import type { SupabaseClient } from '@supabase/supabase-js'
import { getChallengesForBoss } from '@/lib/game/challenges'
import { arenaRng, buildDuel, type ArenaExercise } from './generators'
import { ARENA_MIX } from './rules'
import { ledgerRows } from './server'
import { TEAM_EXERCISES, TEAM_GONE_SECONDS, type SeatRole, type Slot, type Team } from './team'
import type { RoomView } from './types'
import type { Boss } from '@/types'

/**
 * Los 9 ejercicios de una sala: 0-5 los comunes (los mismos para los dos
 * equipos) y 6-8 los "un poco más difíciles" que resuelve el docente si ocupa
 * un lugar: desafíos TRAINEE de los mismos temas, ya probados en los jefes.
 */
export function buildRoomExercises(topic: string, shared: Boss[], seed: number): ArenaExercise[] {
  const base = buildDuel(topic, shared, seed, TEAM_EXERCISES)
  const r = arenaRng(seed ^ 0x5eed)
  const topics = topic === ARENA_MIX ? [...new Set(base.map((e) => e.bossId))] : [topic]
  const pool = topics.flatMap((id) => getChallengesForBoss(id, 'trainee'))
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  const hard: ArenaExercise[] = Array.from({ length: 3 }, (_, i) => {
    const c = pool[i % pool.length]
    return {
      id: `${c.id}#docente${i}`, bossId: c.bossId, type: c.type, title: c.title, description: c.description,
      initialCode: c.initialCode, seedSQL: c.seedSQL, verifySQL: c.verifySQL, expectedOutput: c.expectedOutput, solution: '',
    }
  })
  return [...base, ...hard]
}

export interface RoomRow {
  id: string
  aula_id: string | null
  leader_id: string
  boss_id: string
  act_key: string
  stake: number
  status: RoomView['status']
  exercises: RoomView['exercises']
  needs_teacher: boolean
  winner_team: Team | null
  end_reason: string | null
  created_at: string
  started_at: string | null
  ends_at: string | null
}
export const ROOM_COLS = 'id, aula_id, leader_id, boss_id, act_key, stake, status, exercises, needs_teacher, winner_team, end_reason, created_at, started_at, ends_at'

interface PlayerRow { room_id: string; user_id: string; team: Team; slot: Slot; role: SeatRole; ready: boolean; relays: number; last_seen: string; left_at: string | null }
interface TaskRow { room_id: string; team: Team; idx: number; owner_slot: Slot; ex: number; claimed_by: string | null; solved_by: string | null; solved_at: string | null }

/** Arma la vista de varias salas de una vez (3 consultas en total, no 3 por sala). */
export async function roomViews(admin: SupabaseClient, rooms: RoomRow[], meId: string): Promise<RoomView[]> {
  if (!rooms.length) return []
  const ids = rooms.map((r) => r.id)
  // Todo en UN solo viaje a la base: lugares (con el nombre de cada uno, por la
  // relación con profiles), tareas y, de las salas terminadas, mis premios.
  const finished = rooms.filter((r) => r.status === 'finished').map((r) => r.id)
  const [{ data: players }, { data: tasks }, led, { data: xp }] = await Promise.all([
    admin.from('arena_room_players').select('room_id, user_id, team, slot, role, ready, relays, last_seen, left_at, profiles(username)').in('room_id', ids),
    admin.from('arena_room_tasks').select('room_id, team, idx, owner_slot, ex, claimed_by, solved_by, solved_at').in('room_id', ids),
    finished.length ? ledgerRows(admin.from('arena_ledger'), (q) => q.eq('user_id', meId).in('room_id', finished), 'room_id') : Promise.resolve([]),
    finished.length ? admin.from('arena_xp').select('room_id, xp').eq('user_id', meId).in('room_id', finished) : Promise.resolve({ data: [] }),
  ])
  const ps = (players ?? []) as unknown as (PlayerRow & { profiles: { username: string } | null })[]
  const names = new Map(ps.map((p) => [p.user_id, p.profiles?.username ?? '…']))
  const goneBefore = Date.now() - TEAM_GONE_SECONDS * 1000

  const results = new Map<string, { diamonds: number; xp: number }>()
  for (const id of finished.filter((rid) => ps.some((p) => p.room_id === rid && p.user_id === meId))) {
    const mine = led.filter((l) => l.room_id === id)
    results.set(id, {
      diamonds: mine.reduce((s, l) => s + l.delta, 0),
      xp: ((xp ?? []) as { room_id: string; xp: number }[]).filter((l) => l.room_id === id).reduce((s, l) => s + l.xp, 0)
        + mine.reduce((s, l) => s + (l.xp ?? 0), 0),
    })
  }

  return rooms.map((r) => {
    const started = r.status === 'active' || r.status === 'finished'
    const seats = ps.filter((p) => p.room_id === r.id && (started || !p.left_at)).map((p) => ({
      team: p.team, slot: p.slot, userId: p.user_id, username: names.get(p.user_id) ?? '…', role: p.role, ready: p.ready, relays: p.relays,
      gone: !!p.left_at || (r.status === 'active' && Date.parse(p.last_seen) < goneBefore),
    }))
    const exercises = r.exercises ?? []
    return {
      id: r.id, status: r.status, leaderId: r.leader_id, bossId: r.boss_id, actKey: r.act_key, stake: r.stake, needsTeacher: r.needs_teacher,
      topics: [...new Set(exercises.slice(0, TEAM_EXERCISES).map((e) => e.bossId))],
      seats,
      exercises: started ? exercises : [],
      tasks: ((tasks ?? []) as TaskRow[]).filter((t) => t.room_id === r.id).map((t) => ({
        team: t.team, idx: t.idx, ownerSlot: t.owner_slot, ex: t.ex, claimedBy: t.claimed_by, solvedBy: t.solved_by,
        solvedAt: t.solved_at ? Date.parse(t.solved_at) : null,
      })),
      createdAt: r.created_at, startedAt: r.started_at, endsAt: r.ends_at, serverNow: new Date().toISOString(),
      winnerTeam: r.winner_team, endReason: r.end_reason,
      result: results.get(r.id),
    }
  })
}
