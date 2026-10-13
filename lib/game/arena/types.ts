import type { PublicArenaExercise } from './generators'

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

export type AttackEffect = 'freeze' | 'wind' | 'taunt'

/** Mensajes del lobby del aula. */
export type LobbyEvent =
  | { type: 'invite'; from: string; to: string; matchId: string }
  | { type: 'answer'; from: string; to: string; matchId: string; accepted: boolean }
  | { type: 'cancel'; from: string; to: string; matchId: string }

export interface ArenaStats {
  /** Diamantes netos ganados/perdidos en la arena. */
  net: number
  xp: number
  /** Veces que le ganó al Pistolero con al menos un acierto (numera el cartel SE BUSCA). */
  pistolero?: number
}
