// La Arena 2 vs 2 — reglas y lógica pura (sin red, sin React).
//
// Dos equipos (Espada y Escudo) de dos integrantes. Cada equipo tiene 6
// ejercicios en dos columnas de 3: la del lugar 1 (idx 0-2) y la del lugar 2
// (idx 3-5). Los dos equipos reciben los mismos 6.
//
// RELEVO: quien terminó su columna se lleva el ÚLTIMO ejercicio de su
// compañero que todavía nadie empezó. Uno por persona por duelo (así el más
// lento siempre resuelve al menos 2), salvo que el compañero se haya ido.
//
// Esta lógica la usa el simulador de /demo/arena; el duelo real la corre en
// SQL (016_arena_2v2.sql: room_ready, room_solve, room_relay, room_timeout),
// que es quien manda. Si cambia algo acá, cambiar allá.

export type Team = 'espada' | 'escudo'
export type Slot = 1 | 2
export type SeatRole = 'alumno' | 'docente'

export const TEAMS: Team[] = ['espada', 'escudo']
export const TEAM_NAME: Record<Team, string> = { espada: 'Espada', escudo: 'Escudo' }
export const otherTeam = (t: Team): Team => (t === 'espada' ? 'escudo' : 'espada')

export const TEAM_EXERCISES = 6
export const TEAM_COLUMN = 3
/** 8 minutos (+4 s de cuenta regresiva, que suma el servidor). */
export const TEAM_DUEL_SECONDS = 480
export const TEAM_RELAYS = 1
/** Sin señales durante este tiempo = se fue (sus ejercicios quedan libres). */
export const TEAM_GONE_SECONDS = 60

/** Revancha (ningún rival nuevo en el acto): poco XP, con tope diario. Espejo de 017. */
export const TEAM_REPEAT_XP_WIN = 2
export const TEAM_REPEAT_XP_LOSS = 1
export const TEAM_REPEAT_XP_DAILY = 10

/** Señas al compañero: frases fijas, sin chat libre. */
export const SENAS = ['¡vamos!', '¡ayuda!', '¡te tomo uno!'] as const

export interface RoomSeat {
  team: Team
  slot: Slot
  userId: string
  username: string
  role: SeatRole
  ready: boolean
  relays: number
  /** Se fue o lleva más de TEAM_GONE_SECONDS sin señales. */
  gone: boolean
}

export interface RoomTask {
  team: Team
  /** 0-2 columna del lugar 1, 3-5 columna del lugar 2. */
  idx: number
  ownerSlot: Slot
  /** Índice en la lista de ejercicios de la sala (6-8 = columna del docente). */
  ex: number
  claimedBy: string | null
  solvedBy: string | null
  solvedAt: number | null
}

export const slotOfIdx = (idx: number): Slot => (idx < TEAM_COLUMN ? 1 : 2)
const columnIdx = (slot: Slot) => (slot === 1 ? [0, 1, 2] : [3, 4, 5])
const partnerSlot = (s: Slot): Slot => (s === 1 ? 2 : 1)

/**
 * Las 12 tareas de una sala que arranca. El docente resuelve su columna con
 * los ejercicios 6-8 (más difíciles); todos los demás, los comunes 0-5.
 * Cada uno arranca con el primero de su columna ya tomado.
 */
export function initialTasks(seats: RoomSeat[]): RoomTask[] {
  const out: RoomTask[] = []
  for (const team of TEAMS) {
    for (let idx = 0; idx < TEAM_EXERCISES; idx++) {
      const ownerSlot = slotOfIdx(idx)
      const owner = seats.find((s) => s.team === team && s.slot === ownerSlot)
      const ex = owner?.role === 'docente' ? TEAM_EXERCISES + (idx % TEAM_COLUMN) : idx
      const first = idx % TEAM_COLUMN === 0
      out.push({ team, idx, ownerSlot, ex, claimedBy: first && owner ? owner.userId : null, solvedBy: null, solvedAt: null })
    }
  }
  return out
}

/** El ejercicio que tengo ahora (tomado por mí y sin resolver). */
export function myTask(tasks: RoomTask[], team: Team, userId: string): RoomTask | null {
  return tasks.find((t) => t.team === team && t.claimedBy === userId && !t.solvedBy) ?? null
}

/** El próximo libre de mi columna (de arriba para abajo). */
export function nextOwnTask(tasks: RoomTask[], team: Team, slot: Slot): RoomTask | null {
  for (const i of columnIdx(slot)) {
    const t = tasks.find((x) => x.team === team && x.idx === i)
    if (t && !t.solvedBy && !t.claimedBy) return t
  }
  return null
}

/** Lo que me daría el relevo: el último libre de la columna de mi compañero. */
export function relayCandidate(tasks: RoomTask[], team: Team, slot: Slot): RoomTask | null {
  for (const i of [...columnIdx(partnerSlot(slot))].reverse()) {
    const t = tasks.find((x) => x.team === team && x.idx === i)
    if (t && !t.solvedBy && !t.claimedBy) return t
  }
  return null
}

export type RelayState = 'busy' | 'ready' | 'used' | 'none' | 'teacher'

/**
 * ¿Puedo hacer relevo? 'busy' = todavía tengo trabajo en mi columna ·
 * 'ready' = sí · 'used' = ya usé el mío · 'none' = no queda nada libre ·
 * 'teacher' = el docente no hace relevo.
 */
export function relayState(tasks: RoomTask[], seats: RoomSeat[], me: RoomSeat): RelayState {
  if (myTask(tasks, me.team, me.userId) || nextOwnTask(tasks, me.team, me.slot)) return 'busy'
  if (me.role === 'docente') return 'teacher'
  if (!relayCandidate(tasks, me.team, me.slot)) return 'none'
  const partner = seats.find((s) => s.team === me.team && s.slot === partnerSlot(me.slot))
  if (me.relays >= TEAM_RELAYS && !partner?.gone) return 'used'
  return 'ready'
}

export const solvedBy = (tasks: RoomTask[], team: Team) => tasks.filter((t) => t.team === team && t.solvedBy).length

/** Se terminó el tiempo: más resueltos gana; empatados, quien llegó antes; 0 a 0, empate. */
export function timeoutWinner(tasks: RoomTask[]): Team | null {
  const [a, b] = TEAMS.map((t) => solvedBy(tasks, t))
  if (a !== b) return a > b ? 'espada' : 'escudo'
  if (a === 0) return null
  const last = (team: Team) => Math.max(...tasks.filter((t) => t.team === team && t.solvedAt).map((t) => t.solvedAt!))
  return last('espada') <= last('escudo') ? 'espada' : 'escudo'
}

// ─── Movimientos (el simulador los aplica igual que el servidor) ───────────

/** Resolví mi ejercicio: lo marco y tomo el siguiente de mi columna, si hay. */
export function applySolve(tasks: RoomTask[], me: RoomSeat, at: number): RoomTask[] {
  const cur = myTask(tasks, me.team, me.userId)
  if (!cur) return tasks
  let next = tasks.map((t) => (t === cur ? { ...t, solvedBy: me.userId, solvedAt: at } : t))
  const own = nextOwnTask(next, me.team, me.slot)
  if (own) next = next.map((t) => (t === own ? { ...t, claimedBy: me.userId } : t))
  return next
}

/** Relevo: me llevo el último libre de mi compañero. */
export function applyRelay(tasks: RoomTask[], me: RoomSeat): RoomTask[] {
  const c = relayCandidate(tasks, me.team, me.slot)
  return c ? tasks.map((t) => (t === c ? { ...t, claimedBy: me.userId } : t)) : tasks
}

/** Alguien se fue: lo que tenía tomado sin resolver vuelve a quedar libre. */
export function releaseTasks(tasks: RoomTask[], userId: string): RoomTask[] {
  return tasks.map((t) => (t.claimedBy === userId && !t.solvedBy ? { ...t, claimedBy: null } : t))
}

/** Cuando un compañero ya no está, su columna se puede tomar entera (no solo por relevo). */
export function nextForLoneMate(tasks: RoomTask[], me: RoomSeat): RoomTask | null {
  return nextOwnTask(tasks, me.team, me.slot) ?? relayCandidate(tasks, me.team, me.slot)
}
