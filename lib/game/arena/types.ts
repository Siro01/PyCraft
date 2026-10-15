import type { PublicArenaExercise } from './generators'
import type { SeatRole, Slot, Team } from './team'

export type MatchStatus = 'pending' | 'active' | 'finished' | 'declined' | 'cancelled' | 'expired'

export interface DuelPlayer {
  id: string
  username: string
  progress: number
}

/** Un duelo visto desde uno de los dos jugadores (lo que devuelve /api/arena). */
export interface MatchView {
  id: string
  status: MatchStatus
  stake: number
  bossId: string
  actKey: string
  /** Soy quien retó. */
  iChallenged: boolean
  me: DuelPlayer
  rival: DuelPlayer
  /** Vacío hasta que el duelo arranca. */
  exercises: PublicArenaExercise[]
  createdAt: string
  startedAt: string | null
  endsAt: string | null
  /** Hora del servidor al armar la respuesta: para corregir el reloj de la PC. */
  serverNow: string
  winnerId: string | null
  endReason: string | null
  /** Solo cuando terminó: lo que gané o perdí en ESTE duelo. */
  result?: { diamonds: number; xp: number }
}

/** Mensajes en tiempo real entre los dos navegadores de un duelo (Broadcast). */
export type DuelEvent =
  | { type: 'progress'; from: string }
  | { type: 'typing'; from: string }
  | { type: 'item'; from: string; to: string; effect: AttackEffect; seconds: number; item: string }
  | { type: 'blocked'; from: string; to: string; reason: 'shield' | 'clover' | 'immune' | 'limit' }
  | { type: 'left'; from: string }
  /** 2 vs 2: seña rápida al compañero (frases fijas de SENAS). */
  | { type: 'sena'; from: string; text: string }

export type AttackEffect = 'freeze' | 'wind' | 'taunt'

/** Mensajes del lobby del aula. */
export type LobbyEvent =
  | { type: 'invite'; from: string; to: string; matchId: string }
  | { type: 'answer'; from: string; to: string; matchId: string; accepted: boolean }
  | { type: 'cancel'; from: string; to: string; matchId: string }
  /** 2 vs 2: cambió alguna sala (se abrió, se llenó un lugar…): que todos relean la lista. */
  | { type: 'rooms'; from: string; to?: undefined }

export interface ArenaStats {
  /** Diamantes netos ganados/perdidos en la arena. */
  net: number
  xp: number
  /** Veces que le ganó al Pistolero con al menos un acierto (numera el cartel SE BUSCA). */
  pistolero?: number
}

// ─── 2 vs 2 ────────────────────────────────────────────────────────────────

export interface RoomSeatView {
  team: Team
  slot: Slot
  userId: string
  username: string
  role: SeatRole
  ready: boolean
  relays: number
  gone: boolean
}

export interface RoomTaskView {
  team: Team
  idx: number
  ownerSlot: Slot
  ex: number
  claimedBy: string | null
  solvedBy: string | null
  /** ms (hora del servidor). */
  solvedAt: number | null
}

/** Una sala 2 vs 2 vista por cualquiera del aula (lo que devuelve /api/arena/sala). */
export interface RoomView {
  id: string
  status: 'lobby' | 'active' | 'finished' | 'cancelled'
  leaderId: string
  bossId: string
  actKey: string
  stake: number
  needsTeacher: boolean
  /** Temas que hay que haber visto para sumarse (los de sus ejercicios). */
  topics: string[]
  seats: RoomSeatView[]
  /** Vacío hasta que arranca. 0-5 comunes, 6-8 la columna del docente. */
  exercises: PublicArenaExercise[]
  tasks: RoomTaskView[]
  createdAt: string
  startedAt: string | null
  endsAt: string | null
  serverNow: string
  winnerTeam: Team | null
  endReason: string | null
  /** Solo de quien pregunta, cuando terminó. */
  result?: { diamonds: number; xp: number }
}
