// Reglas de La Arena — duelos entre alumnos del mismo aula.
//
// Las comparten el servidor (/api/arena) y el navegador (lobby y duelo). Los
// números de XP y la cantidad de ejercicios están repetidos en
// supabase/migrations/013_arena.sql (arena_settle): si cambian acá, cambiar allá.

import { BOSSES } from '@/lib/game/bosses'
import type { Boss } from '@/types'

/** Se abre al vencer al Jefe 3. */
export const ARENA_UNLOCK_BOSS_ID = 'golem-infinito'
export const ARENA_UNLOCK_BOSS_NAME = 'Golem Infinito'

export const ARENA_EXERCISES = 3
/** 6 minutos de duelo (+4 s de cuenta regresiva, que suma el servidor). */
export const ARENA_DUEL_SECONDS = 360
export const ARENA_COUNTDOWN_SECONDS = 4
/** Un reto que nadie acepta vence solo. */
export const ARENA_INVITE_SECONDS = 60

/** Diamantes por los que se pueden retar (0 = amistoso). */
export const ARENA_STAKES = [5, 10] as const
export type ArenaStake = 0 | (typeof ARENA_STAKES)[number]

/** Tope de diamantes que un alumno puede perder por día en la arena. */
export const ARENA_DAILY_LOSS_CAP = 30
/** Máximo de retos por diamantes por día contra el mismo compañero. */
export const ARENA_PAIR_DAILY_STAKED = 3

export const ARENA_XP_WIN = 15
export const ARENA_XP_LOSS = 5

/** Tema especial: cada ejercicio sale de un tema distinto de los que vieron los dos. */
export const ARENA_MIX = 'mezcla'

/** Temas que pueden salir en la arena: todos los jefes menos el final. */
export const ARENA_TOPICS: Boss[] = BOSSES.filter((b) => b.type !== 'final')

export function actKeyOf(bossId: string): string {
  return BOSSES.find((b) => b.id === bossId)?.type ?? 'python'
}

/** Temas que los dos ya vieron (jefes derrotados por ambos), en orden de clase. */
export function sharedTopics(a: Iterable<string>, b: Iterable<string>): Boss[] {
  const sa = new Set(a)
  const sb = new Set(b)
  return ARENA_TOPICS.filter((t) => sa.has(t.id) && sb.has(t.id))
}

/** Acto del duelo para la regla de XP: el de su tema (o el del tema más avanzado de la mezcla). */
export function duelActKey(topic: string, shared: Boss[]): string {
  if (topic !== ARENA_MIX) return actKeyOf(topic)
  return shared[shared.length - 1]?.type ?? 'python'
}

/** El reto por diamantes más alto que se puede ofrecer con este saldo y lo ya perdido hoy. */
export function maxStakeFor(balance: number, lostToday: number): ArenaStake {
  let best: ArenaStake = 0
  for (const s of ARENA_STAKES) if (balance >= s && lostToday + s <= ARENA_DAILY_LOSS_CAP) best = s
  return best
}

/** Misma normalización que el executor: bordes, \r\n y espacios al final de cada línea. */
export function normalizeOutput(s: string): string {
  return s.trim().replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n')
}

export const ARENA_REASON_LABEL: Record<string, string> = {
  solved: 'resolvió los 3',
  timeout: 'se terminó el tiempo',
  forfeit: 'abandono',
  draw: 'empate',
  voided: 'anulado por el docente',
}
