import { CHALLENGES } from '@/lib/game/challenges'
import type { ChallengeTier } from '@/types'

export interface BattleRow { u: string; b: string; c: boolean; n: number; s: string; e: string | null }
export interface AttackRow { u: string; ch: string; ok: boolean; t: string }

// Una pausa mayor a esto entre dos acciones se considera que el alumno se fue: no suma al tiempo.
const BREAK_MS = 15 * 60 * 1000

const CHALLENGE_INDEX = new Map(CHALLENGES.map((c) => [c.id, c]))

export interface BossStat {
  bossId: string
  opened: number
  defeated: number
  attempts: number
  accuracy: number | null
  avgTimeMs: number | null
}

export interface StudentStat {
  id: string
  defeated: number
  attempts: number
  accuracy: number | null
  timeMs: number
  lastActivity: number | null
}

export interface ChallengeStat {
  id: string
  bossId: string
  tier: ChallengeTier
  attempts: number
  correct: number
  solvedBy: number
}

export interface Stats {
  bosses: BossStat[]
  students: StudentStat[]
  challenges: ChallengeStat[]
  totals: { students: number; defeats: number; attempts: number; accuracy: number | null; avgTimeMs: number | null }
}

const pct = (ok: number, total: number) => (total ? Math.round((ok / total) * 100) : null)

function activeTime(events: number[]): number {
  const sorted = [...events].sort((a, b) => a - b)
  let total = 0
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1]
    if (gap <= BREAK_MS) total += gap
  }
  return total
}

export function computeStats(
  studentIds: string[],
  bossIds: string[],
  battles: BattleRow[],
  attacks: AttackRow[],
): Stats {
  const ids = new Set(studentIds)
  const myBattles = battles.filter((b) => ids.has(b.u))
  const myAttacks = attacks.filter((a) => ids.has(a.u) && CHALLENGE_INDEX.has(a.ch))

  // Un alumno derrotó a un jefe si algún registro suyo está completo.
  const defeatedBy = new Set(myBattles.filter((b) => b.c).map((b) => `${b.u}|${b.b}`))
  const startedAt = new Map<string, number>()
  for (const b of myBattles) {
    const key = `${b.u}|${b.b}`
    const s = new Date(b.s).getTime()
    if (!startedAt.has(key) || s < startedAt.get(key)!) startedAt.set(key, s)
  }

  // Eventos (inicio de batalla + ataques) por alumno y jefe, para medir tiempo activo.
  const eventsByPair = new Map<string, number[]>()
  for (const [key, s] of startedAt) eventsByPair.set(key, [s])
  for (const a of myAttacks) {
    const key = `${a.u}|${CHALLENGE_INDEX.get(a.ch)!.bossId}`
    const list = eventsByPair.get(key)
    if (list) list.push(new Date(a.t).getTime())
  }
  const pairTime = new Map<string, number>()
  for (const [key, events] of eventsByPair) pairTime.set(key, activeTime(events))

  const bosses: BossStat[] = bossIds.map((bossId) => {
    const bossAttacks = myAttacks.filter((a) => CHALLENGE_INDEX.get(a.ch)!.bossId === bossId)
    const opened = new Set(myBattles.filter((b) => b.b === bossId).map((b) => b.u))
    const defeaters = [...defeatedBy].filter((k) => k.endsWith(`|${bossId}`))
    const times = defeaters.map((k) => pairTime.get(k) ?? 0)
    return {
      bossId,
      opened: opened.size,
      defeated: defeaters.length,
      attempts: bossAttacks.length,
      accuracy: pct(bossAttacks.filter((a) => a.ok).length, bossAttacks.length),
      avgTimeMs: times.length ? times.reduce((s, t) => s + t, 0) / times.length : null,
    }
  })

  const students: StudentStat[] = studentIds.map((id) => {
    const mine = myAttacks.filter((a) => a.u === id)
    const last = mine.reduce<number | null>((m, a) => Math.max(m ?? 0, new Date(a.t).getTime()), null)
    let timeMs = 0
    for (const [key, t] of pairTime) if (key.startsWith(`${id}|`)) timeMs += t
    return {
      id,
      defeated: [...defeatedBy].filter((k) => k.startsWith(`${id}|`)).length,
      attempts: mine.length,
      accuracy: pct(mine.filter((a) => a.ok).length, mine.length),
      timeMs,
      lastActivity: last,
    }
  })

  const challenges: ChallengeStat[] = CHALLENGES.map((c) => {
    const mine = myAttacks.filter((a) => a.ch === c.id)
    return {
      id: c.id,
      bossId: c.bossId,
      tier: c.tier,
      attempts: mine.length,
      correct: mine.filter((a) => a.ok).length,
      solvedBy: new Set(mine.filter((a) => a.ok).map((a) => a.u)).size,
    }
  })

  const defeatTimes = [...defeatedBy].map((k) => pairTime.get(k) ?? 0)
  return {
    bosses,
    students,
    challenges,
    totals: {
      students: studentIds.length,
      defeats: defeatedBy.size,
      attempts: myAttacks.length,
      accuracy: pct(myAttacks.filter((a) => a.ok).length, myAttacks.length),
      avgTimeMs: defeatTimes.length ? defeatTimes.reduce((s, t) => s + t, 0) / defeatTimes.length : null,
    },
  }
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 1) return '<1 min'
  if (totalMin < 60) return `${totalMin} min`
  return `${Math.floor(totalMin / 60)} h ${totalMin % 60} min`
}
