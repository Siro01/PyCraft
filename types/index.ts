export type BossType = 'python' | 'sql' | 'mixed' | 'final'
export type ChallengeType = 'python' | 'sql'
export type ChallengeTier = 'junior' | 'trainee' | 'senior'
export type UserRole = 'student' | 'admin'
export type AmuletType = 'boss-hp-reduction' | 'health-potion' | 'escape' | 'skip-boss'

export interface Amulet {
  id: string
  type: AmuletType
}

export interface Boss {
  id: string
  classNumber: number
  name: string
  title: string
  topic: string
  type: BossType
  hpMax: number
  color: string
  description: string
  isEnabled?: boolean
}

export interface Challenge {
  id: string
  bossId: string
  title: string
  description: string
  type: ChallengeType
  tier: ChallengeTier
  expectedOutput: string
  initialCode: string
  damage: number
  tip?: string
  orderIndex: number
  // SQL-only: SQL to run before the user's code to pre-populate the DB
  seedSQL?: string
  // SQL DDL/DML: SQL to run after the user's code to verify the result (when user code produces no rows)
  verifySQL?: string
}

export interface BattleRecord {
  id: string
  userId: string
  bossId: string
  hpCurrent: number
  isCompleted: boolean
  attacksCount: number
  startedAt: string
  completedAt?: string
}

export interface AttackRecord {
  id: string
  battleId: string
  userId: string
  challengeId: string
  submittedCode: string
  isCorrect: boolean
  damageDealt: number
  submittedAt: string
}

export interface Profile {
  id: string
  username: string
  role: UserRole
  createdAt: string
}

export interface Score {
  userId: string
  username: string
  totalDamage: number
  bossesDefeated: number
  attacksCount: number
}
