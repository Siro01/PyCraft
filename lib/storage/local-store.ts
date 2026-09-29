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
const PRACTICE_KEY = 'pysql:practice-code'
const TEXT_ZOOM_KEY = 'pysql:text-zoom'
const PRACTICE_LAYOUT_KEY = 'pysql:practice-layout'
const PRACTICE_INTRO_KEY = 'pysql:practice-intro-hidden'

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

// Guarda la lista completa y la empuja a la nube (modo cuenta) — usado por
// las tres funciones de abajo y por hydrateFromCloud al combinar dispositivos.
function saveAmuletsRaw(list: Amulet[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(AMULETS_KEY, JSON.stringify(list)) } catch { /* ignore quota errors */ }
  import('@/lib/storage/cloud-sync').then(({ queueCloudSync }) => queueCloudSync('amulets', list))
}

export function addAmulet(amulet: Amulet): void {
  if (typeof window === 'undefined') return
  saveAmuletsRaw([...getAmulets(), amulet])
}

export function removeAmulet(id: string): void {
  if (typeof window === 'undefined') return
  saveAmuletsRaw(getAmulets().filter((a) => a.id !== id))
}

export function clearAmulets(): void {
  if (typeof window === 'undefined') return
  saveAmuletsRaw([])
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
  import('@/lib/storage/cloud-sync').then(({ queueCloudSync }) => queueCloudSync('finale', progress))
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
  import('@/lib/storage/cloud-sync').then(({ queueCloudSync }) => queueCloudSync('finale_deco', deco))
}

export function clearFinaleProgress(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FINALE_KEY)
  import('@/lib/storage/cloud-sync').then(({ queueCloudSync }) => queueCloudSync('finale', null))
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
  /** Tandas que ya dieron XP alguna vez — repetirlas no vuelve a sumar XP, para que no se pueda farmear infinito. */
  xpAwarded: Record<string, boolean>
}

export const EMPTY_PLAYGROUND: PlaygroundState = { xp: 0, bestStreak: {}, bestScore: {}, xpAwarded: {} }

export function getPlaygroundState(): PlaygroundState {
  if (typeof window === 'undefined') return EMPTY_PLAYGROUND
  try {
    const raw = localStorage.getItem(PLAYGROUND_KEY)
    return raw ? { ...EMPTY_PLAYGROUND, ...(JSON.parse(raw) as PlaygroundState) } : EMPTY_PLAYGROUND
  } catch { return EMPTY_PLAYGROUND }
}

// Guarda el estado completo y lo empuja a la nube (modo cuenta) — usado por
// recordPlaygroundResult y por hydrateFromCloud al combinar dispositivos.
function savePlaygroundStateRaw(state: PlaygroundState): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PLAYGROUND_KEY, JSON.stringify(state)) } catch { /* ignore quota errors */ }
  import('@/lib/storage/cloud-sync').then(({ queueCloudSync }) => queueCloudSync('playground', state))
}

/**
 * Suma XP y actualiza los mejores récords de una tanda; devuelve el estado
 * nuevo junto con el XP realmente otorgado. Una tanda solo da XP la primera
 * vez que se completa — repetirla actualiza racha/puntaje para que el
 * alumno siga practicando, pero no vuelve a sumar XP (si no, se podía
 * repetir el mismo ejercicio para farmear XP sin límite).
 */
export function recordPlaygroundResult(topicKey: string, xpGained: number, streak: number, score: number): { state: PlaygroundState; xpAwarded: number } {
  if (typeof window === 'undefined') return { state: EMPTY_PLAYGROUND, xpAwarded: 0 }
  const cur = getPlaygroundState()
  const alreadyAwarded = cur.xpAwarded[topicKey] === true
  const awarded = alreadyAwarded ? 0 : xpGained
  const next: PlaygroundState = {
    xp: cur.xp + awarded,
    bestStreak: { ...cur.bestStreak, [topicKey]: Math.max(cur.bestStreak[topicKey] ?? 0, streak) },
    bestScore: { ...cur.bestScore, [topicKey]: Math.max(cur.bestScore[topicKey] ?? 0, score) },
    xpAwarded: { ...cur.xpAwarded, [topicKey]: true },
  }
  savePlaygroundStateRaw(next)
  return { state: next, xpAwarded: awarded }
}

export function playgroundLevel(xp: number): { level: number; xpIntoLevel: number; xpForNext: number } {
  const level = Math.floor(xp / PLAYGROUND_XP_PER_LEVEL) + 1
  const xpIntoLevel = xp % PLAYGROUND_XP_PER_LEVEL
  return { level, xpIntoLevel, xpForNext: PLAYGROUND_XP_PER_LEVEL }
}

// ─── Patio de prácticas: el código Python libre del alumno ──────────────────
// Un solo bloc de notas que persiste entre visitas — no hay "proyectos" ni
// nombres, es la libreta de pruebas de variables/inputs/etc.

export function getPracticeCode(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(PRACTICE_KEY) } catch { return null }
}

export function savePracticeCode(code: string): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PRACTICE_KEY, code) } catch { /* ignore quota errors */ }
}

// ─── Zoom de texto: patio de juegos y patio de prácticas ─────────────────────
// Un multiplicador de CSS `zoom` sobre el contenido (nunca sobre la barra de
// la ventana) — agranda letra, íconos y botones juntos en vez de solo la
// tipografía, que es lo que un alumno de 10 años realmente necesita para leer
// mejor en las PCs del aula. Se recuerda entre visitas.

export const TEXT_ZOOM_MIN = 0.85
export const TEXT_ZOOM_MAX = 1.6
export const TEXT_ZOOM_STEP = 0.15
export const TEXT_ZOOM_DEFAULT = 1

export function getTextZoom(): number {
  if (typeof window === 'undefined') return TEXT_ZOOM_DEFAULT
  try {
    const raw = localStorage.getItem(TEXT_ZOOM_KEY)
    const n = raw ? parseFloat(raw) : NaN
    return Number.isFinite(n) ? Math.min(TEXT_ZOOM_MAX, Math.max(TEXT_ZOOM_MIN, n)) : TEXT_ZOOM_DEFAULT
  } catch { return TEXT_ZOOM_DEFAULT }
}

export function setTextZoom(zoom: number): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(TEXT_ZOOM_KEY, String(zoom)) } catch { /* ignore quota errors */ }
}

// ─── Layout del patio de prácticas: ancho editor/consola + ayuda oculta ──────
// El alumno puede arrastrar el divisor entre el editor y la consola para
// armar su propio espacio de trabajo — se guarda como fracción (0 a 1) del
// ancho que le toca al editor. También puede ocultar el párrafo de ayuda del
// encabezado para ganar espacio vertical.

export const PRACTICE_SPLIT_MIN = 0.3
export const PRACTICE_SPLIT_MAX = 0.75
export const PRACTICE_SPLIT_DEFAULT = 0.62

export function getPracticeSplit(): number {
  if (typeof window === 'undefined') return PRACTICE_SPLIT_DEFAULT
  try {
    const raw = localStorage.getItem(PRACTICE_LAYOUT_KEY)
    const n = raw ? parseFloat(raw) : NaN
    return Number.isFinite(n) ? Math.min(PRACTICE_SPLIT_MAX, Math.max(PRACTICE_SPLIT_MIN, n)) : PRACTICE_SPLIT_DEFAULT
  } catch { return PRACTICE_SPLIT_DEFAULT }
}

export function setPracticeSplit(ratio: number): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PRACTICE_LAYOUT_KEY, String(ratio)) } catch { /* ignore quota errors */ }
}

export function getPracticeIntroHidden(): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(PRACTICE_INTRO_KEY) === '1' } catch { return false }
}

export function setPracticeIntroHidden(hidden: boolean): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(PRACTICE_INTRO_KEY, hidden ? '1' : '0') } catch { /* ignore quota errors */ }
}

// ─── Sync con la nube (solo modo cuenta) ─────────────────────────────────────
// El patio de juegos, los amuletos y el cofre final corren 100% en el
// navegador, incluso con cuenta — sin esto, un alumno que cambia de PC en el
// aula los perdía por completo. `syncOnLoad` (lib/storage/cloud-sync.ts) se
// corre una vez por sesión y llama acá con lo que haya guardado en la tabla
// `game_extras`; esta función lo combina con lo que ya haya en el dispositivo,
// quedándose siempre con el mayor avance de cada lado en vez de pisar ninguno.

export interface CloudExtras {
  amulets: Amulet[] | null
  playground: PlaygroundState | null
  finale: FinaleProgress | null
  finale_deco: FinaleDecoration | null
}

export function hydrateFromCloud(cloud: CloudExtras): void {
  if (typeof window === 'undefined') return

  // Patio de juegos: XP y "ya la jugué" (xpAwarded) por tanda se combinan
  // tomando lo mayor de cada lado — así tampoco se puede farmear XP jugando
  // la misma tanda en dos PCs distintas.
  const localPg = getPlaygroundState()
  if (cloud.playground) {
    savePlaygroundStateRaw({
      xp: Math.max(cloud.playground.xp, localPg.xp),
      bestStreak: mergeMax(cloud.playground.bestStreak, localPg.bestStreak),
      bestScore: mergeMax(cloud.playground.bestScore, localPg.bestScore),
      xpAwarded: { ...cloud.playground.xpAwarded, ...localPg.xpAwarded },
    })
  } else if (localPg.xp > 0 || Object.keys(localPg.bestScore).length > 0) {
    savePlaygroundStateRaw(localPg)
  }

  // Amuletos: unión por id — son consumibles, no hay "mejor" versión de cada uno.
  saveAmuletsRaw(mergeAmuletsById(cloud.amulets ?? [], getAmulets()))

  // Cofre final: se queda con el que tenga más misiones completadas.
  const localFinale = getFinaleProgress()
  const cloudFinale = cloud.finale
  const bestFinale =
    !cloudFinale ? localFinale
    : !localFinale ? cloudFinale
    : cloudFinale.completed.length >= localFinale.completed.length ? cloudFinale : localFinale
  if (bestFinale) saveFinaleProgress(bestFinale)

  // Decoración del cofre: se respeta la que ya está en este dispositivo (es
  // la que el alumno ve ahora mismo); si acá no hay ninguna, se trae la de la nube.
  const bestDeco = getFinaleDecoration() ?? cloud.finale_deco
  if (bestDeco) saveFinaleDecoration(bestDeco)
}

function mergeMax(a: Record<string, number> = {}, b: Record<string, number> = {}): Record<string, number> {
  const out: Record<string, number> = { ...a }
  for (const k of Object.keys(b)) out[k] = Math.max(out[k] ?? 0, b[k])
  return out
}

function mergeAmuletsById(a: Amulet[], b: Amulet[]): Amulet[] {
  const byId = new Map(a.map((am) => [am.id, am] as const))
  for (const am of b) if (!byId.has(am.id)) byId.set(am.id, am)
  return [...byId.values()]
}
