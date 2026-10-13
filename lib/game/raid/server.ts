// Lado servidor de las raids (solo se importa desde app/api/raid).
// Todo lo que decide algo — quién entra, qué ejercicio le toca, cuánta vida
// queda — se calcula acá con la service role.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChallengeTier } from '@/types'
import { pickTier, resolveEnabledTiers } from '@/lib/game/tiers'
import { defeatedBy } from '@/lib/game/arena/server'
import { PISTOLERO_BY_ID, pickExercise, toPublicExercise } from './pistolero-ejercicios'
import type { RaidMemberView, RaidView, MyTaskView, TaskStatus } from './types'

export interface RaidRow {
  id: string
  aula_id: string | null
  kind: 'pistolero' | 'secreto'
  boss_id: string | null
  leader_id: string
  status: RaidView['status']
  boss_hp: number
  boss_hp_max: number
  team_hp: number | null
  team_hp_max: number | null
  attacks: Record<string, number>
  created_at: string
  started_at: string | null
}

export interface TaskRow {
  id: number
  raid_id: string
  user_id: string
  exercise_id: string
  status: TaskStatus
  code: string | null
  output: string | null
  auto_ok: boolean | null
  created_at: string
  submitted_at: string | null
}

export const RAID_COLS = 'id, aula_id, kind, boss_id, leader_id, status, boss_hp, boss_hp_max, team_hp, team_hp_max, attacks, created_at, started_at'
export const TASK_COLS = 'id, raid_id, user_id, exercise_id, status, code, output, auto_ok, created_at, submitted_at'

export async function loadRaid(admin: SupabaseClient, id: string): Promise<RaidRow | null> {
  const { data } = await admin.from('raids').select(RAID_COLS).eq('id', id).maybeSingle()
  return (data as RaidRow | null) ?? null
}

/** El Pistolero vivo (en el lobby o peleando) de un aula, si hay. */
export async function livePistolero(admin: SupabaseClient, aulaId: string): Promise<RaidRow | null> {
  const { data } = await admin.from('raids').select(RAID_COLS)
    .eq('aula_id', aulaId).eq('kind', 'pistolero').in('status', ['lobby', 'active'])
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data as RaidRow | null) ?? null
}

/** El último Pistolero del aula aunque haya terminado (para mostrar el final). */
export async function latestPistolero(admin: SupabaseClient, aulaId: string): Promise<RaidRow | null> {
  const { data } = await admin.from('raids').select(RAID_COLS)
    .eq('aula_id', aulaId).eq('kind', 'pistolero')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data as RaidRow | null) ?? null
}

export async function raidView(admin: SupabaseClient, r: RaidRow): Promise<RaidView> {
  const { data } = await admin.from('raid_members').select('user_id, role, state, solved').eq('raid_id', r.id)
  const rows = (data ?? []) as { user_id: string; role: 'alumno' | 'docente'; state: RaidMemberView['state']; solved: number }[]
  const { data: people } = rows.length
    ? await admin.from('profiles').select('id, username').in('id', rows.map((m) => m.user_id))
    : { data: [] }
  const names = new Map(((people ?? []) as { id: string; username: string }[]).map((p) => [p.id, p.username]))
  return {
    id: r.id, kind: r.kind, status: r.status,
    bossHp: r.boss_hp, bossHpMax: r.boss_hp_max, teamHp: r.team_hp, teamHpMax: r.team_hp_max,
    attacks: r.attacks ?? {}, startedAt: r.started_at,
    members: rows.map((m) => ({ id: m.user_id, username: names.get(m.user_id) ?? '¿?', role: m.role, state: m.state, solved: m.solved }))
      .sort((a, b) => a.username.localeCompare(b.username)),
  }
}

/** Nivel de un alumno: su preferencia (cookie) si el aula la tiene habilitada. */
export async function tierFor(admin: SupabaseClient, aulaId: string | null, preferred?: string): Promise<ChallengeTier> {
  if (!aulaId) return pickTier(['junior', 'trainee'], preferred) ?? 'junior'
  const { data } = await admin.from('aula_tiers').select('tier, is_enabled').eq('aula_id', aulaId)
  return pickTier(resolveEnabledTiers((data ?? []) as { tier: string; is_enabled: boolean }[]), preferred) ?? 'junior'
}

export async function tasksOf(admin: SupabaseClient, raidId: string, userId: string): Promise<TaskRow[]> {
  const { data } = await admin.from('raid_tasks').select(TASK_COLS).eq('raid_id', raidId).eq('user_id', userId).order('created_at')
  return (data ?? []) as TaskRow[]
}

/**
 * Le da al alumno su próximo ejercicio si no tiene uno abierto: primero lo
 * que el docente dejó en cola, si no, uno al azar de su nivel que no le tocó.
 */
export async function ensureTask(admin: SupabaseClient, raidId: string, userId: string, tier: ChallengeTier, retryExerciseId?: string): Promise<void> {
  const tasks = await tasksOf(admin, raidId, userId)
  if (tasks.some((t) => t.status === 'asignado' || t.status === 'enviado')) return
  const queued = tasks.find((t) => t.status === 'en_cola')
  if (queued) {
    await admin.from('raid_tasks').update({ status: 'asignado' }).eq('id', queued.id)
    return
  }
  const defeated = retryExerciseId ? new Set<string>() : (await defeatedBy(admin, [userId])).get(userId) ?? new Set<string>()
  const exerciseId = retryExerciseId ?? pickExercise(tier, new Set(tasks.map((t) => t.exercise_id)), defeated).id
  await admin.from('raid_tasks').insert({ raid_id: raidId, user_id: userId, exercise_id: exerciseId, status: 'asignado' })
}

/** Nivel del alumno según su último ejercicio (para sortear el siguiente). */
export function tierOfTasks(tasks: TaskRow[], fallback: ChallengeTier): ChallengeTier {
  for (let i = tasks.length - 1; i >= 0; i--) {
    const e = PISTOLERO_BY_ID.get(tasks[i].exercise_id)
    if (e) return e.tier
  }
  return fallback
}

export function myTaskView(t: TaskRow | undefined): MyTaskView | null {
  if (!t) return null
  const e = PISTOLERO_BY_ID.get(t.exercise_id)
  if (!e) return null
  return { id: t.id, status: t.status, exercise: toPublicExercise(e) }
}
