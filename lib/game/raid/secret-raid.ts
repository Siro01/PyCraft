// Raids contra los jefes secretos: reglas compartidas entre el servidor
// (/api/raid/secreto) y las pantallas (lobby y pelea). Sin React ni Supabase.
// Decisiones en PLAN-RAID.md §3 y §8.

import type { ChallengeTier, ChallengeType } from '@/types'

export const RAID_MIN_MEMBERS = 2
export const RAID_MAX_MEMBERS = 4
/** Todos los integrantes tienen que haber derrotado al menos 4 jefes (el 4 es el Mercader). */
export const RAID_UNLOCK_DEFEATED = 4
export const RAID_FIRST_DIAMONDS = 40
export const RAID_FIRST_XP = 30
export const RAID_REMATCH_XP = 15
export const RAID_ABANDON_PENALTY = 5
/** Sin señales de vida por más de esto = se fue (cuenta como abandono). */
export const RAID_GRACE_SECONDS = 60
export const RAID_PING_SECONDS = 15
export const RAID_RESCUE_HP = 50
/** Ayuda del docente por raid. */
export const TEACHER_HEALS = 2
export const TEACHER_HEAL_HP = 30
export const TEACHER_REVIVES = 1
/** Ítems del Mercader que sirven en estas raids. */
export const RAID_ITEMS = ['botiquin', 'bandera', 'espuelas'] as const
export const RAID_BANDERA_HP = 20

/** Frases rápidas (sin chat libre: son chicos de 10 a 13). */
export const QUICK_PHRASES = ['¡Voy!', '¡Ayuda!', '¡Listo!', '¡Bien ahí!', 'Me trabé', '¡Ya casi!'] as const

export interface SecretRaidMember {
  id: string
  username: string
  role: 'alumno' | 'docente'
  state: 'alive' | 'down' | 'left'
  hp: number
  solved: number
  step: number
  rescuing: string | null
  /** Título comprado en el Mercader (el último), si tiene. */
  title: string | null
}

export interface SecretRaidView {
  id: string
  bossId: string
  leaderId: string
  status: 'lobby' | 'active' | 'won' | 'lost' | 'cancelled'
  bossHp: number
  bossHpMax: number
  members: SecretRaidMember[]
  support: { heals: number; revives: number }
  /** Color del estandarte del líder (si compró uno). */
  banner: string | null
  createdAt: string
}

export interface RaidChallengePublic {
  id: string
  type: ChallengeType
  tier: ChallengeTier
  title: string
  description: string
  initialCode: string
  seedSQL?: string
  verifySQL?: string
}

/** Lo que recibe el alumno en GET /api/raid/secreto?raid=<id>. */
export interface SecretFightState {
  me: string
  raid: SecretRaidView
  challenge: RaidChallengePublic | null
  /** Ronda del alumno (1 = primer ejercicio). */
  round: number
  /** Botín de este alumno si ganaron. */
  loot: { diamonds: number; xp: number } | null
}

/** Lo que recibe el alumno en GET /api/raid/secreto (lobby). */
export interface SecretLobbyState {
  me: string
  isAdmin: boolean
  aulaId: string | null
  defeated: number
  /** Guaridas que puede liderar (cumple el requisito de cada una). */
  canLead: string[]
  /** Raids del aula que se están armando o peleando. */
  raids: SecretRaidView[]
  /** Su raid viva, si tiene. */
  mine: string | null
  /** Primeras victorias en raid (jefes por los que ya cobró los 40). */
  firsts: string[]
}
