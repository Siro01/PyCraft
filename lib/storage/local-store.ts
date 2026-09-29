'use client'

import type { ChallengeTier, Amulet } from '@/types'

// ─── Keys ───────────────────────────────────────────────────────────────────
const USER_KEY     = 'pysql:user'
const PROGRESS_KEY = 'pysql:progress'
const ENABLED_KEY  = 'pysql:enabled'
const TIER_KEY     = 'pysql:tier'
const AMULETS_KEY  = 'pysql:amulets'
const FINALE_KEY   = 'pysql:finale'
const FINALE_DECO_KEY = 'pysql:finale-deco'
const PLAYGROUND_KEY = 'pysql:playground'

// ─── Types ──────────────────────────────────────────────────────────────────
export interface LocalUser {
  name: string
  role: 'student' | 'admin'
}

export interface BossProgress {
  hp: number
  defeated: boolean
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function getLocalUser(): LocalUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as LocalUser) : null
  } catch { return null }
}

export function setLocalUser(user: LocalUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearLocalUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
}

// ─── Progress ────────────────────────────────────────────────────────────────

export function getBossProgress(bossId: string): BossProgress | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    const all: Record<string, BossProgress> = raw ? JSON.parse(raw) : {}
    return all[bossId] ?? null
  } catch { return null }
}

export function saveBossProgress(bossId: string, hp: number, defeated: boolean): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    const all: Record<string, BossProgress> = raw ? JSON.parse(raw) : {}
    all[bossId] = { hp, defeated }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all))
  } catch { /* ignore quota errors */ }
}

export function clearAllProgress(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PROGRESS_KEY)
}

export function getAllProgress(): Record<string, BossProgress> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, BossProgress>) : {}
  } catch { return {} }
}

// ─── Admin: enabled bosses ────────────────────────────────────────────────────
// null = never configured → default to first boss only

export function getLocalEnabledBosses(): string[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ENABLED_KEY)
    return raw ? (JSON.parse(raw) as string[]) : null
  } catch { return null }
}

export function setLocalEnabledBosses(ids: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ENABLED_KEY, JSON.stringify(ids))
}

// ─── Tier ────────────────────────────────────────────────────────────────────
export function getLocalTier(): ChallengeTier {
  if (typeof window === 'undefined') return 'junior'
  const raw = localStorage.getItem(TIER_KEY)
  if (raw === 'trainee' || raw === 'senior') return raw
  return 'junior'
}

export function setLocalTier(tier: ChallengeTier): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TIER_KEY, tier)
}

// ─── Amulets ─────────────────────────────────────────────────────────────────

export function getAmulets(): Amulet[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(AMULETS_KEY)
    return raw ? (JSON.parse(raw) as Amulet[]) : []
  } catch { return [] }
}

export function addAmulet(amulet: Amulet): void {
  if (typeof window === 'undefined') return
  const current = getAmulets()
  localStorage.setItem(AMULETS_KEY, JSON.stringify([...current, amulet]))
}

export function removeAmulet(id: string): void {
  if (typeof window === 'undefined') return
  const current = getAmulets()
  localStorage.setItem(AMULETS_KEY, JSON.stringify(current.filter((a) => a.id !== id)))
}

export function clearAmulets(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AMULETS_KEY)
}

// ─── Proyecto final: cofre (guardado de partida) ─────────────────────────────
// Todo el proyecto corre en sql.js dentro del browser — sin esto, refrescar la
// página o que se corte la luz borra el cofre entero. Se guarda tal cual lo
// necesita ProyectoFinal para reconstruir la tabla (incluye el id de cada fila,
// así el AUTOINCREMENT de sqlite sigue después del máximo restaurado).

export interface FinaleRow {
  id: number
  nombre: string
  cantidad: number
  material: string | null
}

export interface FinaleProgress {
  rows: FinaleRow[]
  completed: string[]
  mIdx: number
}

export function getFinaleProgress(): FinaleProgress | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(FINALE_KEY)
    return raw ? (JSON.parse(raw) as FinaleProgress) : null
  } catch { return null }
}

export function saveFinaleProgress(progress: FinaleProgress): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(FINALE_KEY, JSON.stringify(progress)) } catch { /* ignore quota errors */ }
}

// Decoración del cofre — separada del progreso de misiones para que
// "reiniciar cofre" no le borre al alumno el nombre y los grabados que eligió.
export interface FinaleDecoration {
  name: string
  motto: string
  material: string
  stickers: Record<string, string>
  wall?: string
}

export function getFinaleDecoration(): FinaleDecoration | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(FINALE_DECO_KEY)
    return raw ? (JSON.parse(raw) as FinaleDecoration) : null
  } catch { return null }
}

export function saveFinaleDecoration(deco: FinaleDecoration): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(FINALE_DECO_KEY, JSON.stringify(deco)) } catch { /* ignore quota errors */ }
}

export function clearFinaleProgress(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FINALE_KEY)
}

// ─── Patio de juegos: XP y mejores rachas por tanda ──────────────────────────
// Opcional y aparte del progreso de jefes — corre 100% en el navegador incluso
// en modo cuenta, igual que los amuletos y el cofre final.

export const PLAYGROUND_XP_PER_LEVEL = 100

export interface PlaygroundState {
  xp: number
  /** Mejor racha de respuestas correctas seguidas, alguna vez, por tanda. */
  bestStreak: Record<string, number>
  /** Mejor puntaje (aciertos) de la última vez que se jugó cada tanda. */
  bestScore: Record<string, number>
}

export const EMPTY_PLAYGROUND: PlaygroundState = { xp: 0, bestStreak: {}, bestScore: {} }

export function getPlaygroundState(): PlaygroundState {
  if (typeof window === 'undefined') return EMPTY_PLAYGROUND
  try {
    const raw = localStorage.getItem(PLAYGROUND_KEY)
    return raw ? { ...EMPTY_PLAYGROUND, ...(JSON.parse(raw) as PlaygroundState) } : EMPTY_PLAYGROUND
  } catch { return EMPTY_PLAYGROUND }
}

/** Suma XP y actualiza los mejores récords de una tanda; devuelve el estado nuevo. */
export function recordPlaygroundResult(topicKey: string, xpGained: number, streak: number, score: number): PlaygroundState {
  if (typeof window === 'undefined') return EMPTY_PLAYGROUND
  const cur = getPlaygroundState()
  const next: PlaygroundState = {
    xp: cur.xp + xpGained,
    bestStreak: { ...cur.bestStreak, [topicKey]: Math.max(cur.bestStreak[topicKey] ?? 0, streak) },
    bestScore: { ...cur.bestScore, [topicKey]: Math.max(cur.bestScore[topicKey] ?? 0, score) },
  }
  try { localStorage.setItem(PLAYGROUND_KEY, JSON.stringify(next)) } catch { /* ignore quota errors */ }
  return next
}

export function playgroundLevel(xp: number): { level: number; xpIntoLevel: number; xpForNext: number } {
  const level = Math.floor(xp / PLAYGROUND_XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % PLAYGROUND_XP_PER_LEVEL
  return { level, xpIntoLevel, xpForNext: PLAYGROUND_XP_PER_LEVEL }
}
