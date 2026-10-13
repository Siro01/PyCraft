// Tipos que viajan entre /api/raid y las pantallas (Mesa del docente y vista del alumno).

import type { ChallengeTier, ChallengeType } from '@/types'
import type { AttackId } from './pistolero'

export type RaidStatus = 'lobby' | 'active' | 'won' | 'lost' | 'cancelled'
export type TaskStatus = 'en_cola' | 'asignado' | 'enviado' | 'correcto' | 'incorrecto' | 'cambiado'

export interface RaidMemberView {
  id: string
  username: string
  role: 'alumno' | 'docente'
  state: 'alive' | 'down' | 'left'
  solved: number
}

export interface RaidView {
  id: string
  kind: 'pistolero' | 'secreto'
  status: RaidStatus
  bossHp: number
  bossHpMax: number
  teamHp: number | null
  teamHpMax: number | null
  /** Usos de cada ataque, más marcas de ítems (`bengala_until`, `espuelas:<alumno>`). */
  attacks: Partial<Record<AttackId, number>> & Record<string, number>
  startedAt: string | null
  members: RaidMemberView[]
}

/** Ejercicio como lo ve el alumno (sin salida esperada, solución ni pista). */
export interface RaidExercisePublic {
  id: string
  tier: ChallengeTier
  type: ChallengeType
  title: string
  description: string
  initialCode: string
  seedSQL?: string
}

/** El ejercicio que tiene ahora un alumno. */
export interface MyTaskView {
  id: number
  status: TaskStatus
  exercise: RaidExercisePublic
}

/** Lo que recibe el alumno en GET /api/raid. */
export interface StudentRaidState {
  /** Aula del alumno (para el canal del aviso sorpresa). */
  aulaId: string | null
  me: string
  armed: boolean
  raid: RaidView | null
  joined: boolean
  task: MyTaskView | null
  /** Cómo le fue a su último envío corregido (para mostrar ✔ / ✘). */
  lastVerdict: { taskId: number; ok: boolean } | null
  /** Pista de su ejercicio mientras alguien tiene una Bengala prendida. */
  hint: string | null
  /** Hasta cuándo dura la Bengala (ms epoch), 0 si no hay. */
  bengalaUntil: number
}

/** Una fila de la Mesa del docente. */
export interface BoardTask {
  id: number
  userId: string
  exerciseId: string
  title: string
  tier: ChallengeTier
  type: ChallengeType
  status: TaskStatus
  code: string | null
  output: string | null
  autoOk: boolean | null
  expected: string
  createdAt: string
  submittedAt: string | null
}

export interface CatalogEntry {
  id: string
  /** Jefe que enseña el tema del ejercicio. */
  needs: string
  tier: ChallengeTier
  type: ChallengeType
  title: string
  description: string
  hint: string
  solution: string
  expected: string
}

/** Lo que recibe el docente en GET /api/raid?aula=… */
export interface BoardState {
  aulaId: string
  armed: boolean
  raid: RaidView | null
  tasks: BoardTask[]
  /** `defeated` = jefes que venció (para no darle temas que no vio). */
  roster: { id: string; username: string; tier: ChallengeTier | null; defeated: string[] }[]
  catalog: CatalogEntry[]
}
