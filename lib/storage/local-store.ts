'use client'

import type { ChallengeTier, Amulet, OwnedShopItem, ShopItem } from '@/types'
import { PLAYGROUND_ACTS } from '@/lib/game/playground'
import { DIAMONDS_PER_BOSS, SHOP_CATALOG, discountedPrice } from '@/lib/game/shop'
import { PERK_SLOT_LIMIT } from '@/lib/game/perk-effects'

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
const SHOP_OWNED_KEY = 'pysql:shop-owned'
const STICKER_PLACEMENTS_KEY = 'pysql:sticker-placements'
const EQUIPPED_PERKS_KEY = 'pysql:equipped-perks'

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

// Nivel 1-20 como fracción del XP MÁXIMO posible hoy en el patio de juegos
// (todas las tandas, todos los ejercicios, con la mejor racha) — no un XP
// fijo por nivel. Así nivel 20 es exactamente "completaste todo lo que hay"
// sin importar cuántos actos tenga el patio de juegos en el futuro: al
// agregar más tandas, el nivel de un alumno existente se recalcula solo
// (baja proporcionalmente) hasta que también complete lo nuevo.
export const PLAYGROUND_MAX_LEVEL = 20

function playgroundMaxXp(): number {
  let max = 0
  for (const act of PLAYGROUND_ACTS) {
    for (const topic of act.topics) {
      const n = topic.exercises.length
      max += n * 10 + Math.max(0, n - 2) * 2
    }
  }
  return max
}

export function playgroundLevel(xp: number): { level: number; xpIntoLevel: number; xpForNext: number } {
  const maxXp = playgroundMaxXp()
  const perLevel = maxXp > 0 ? maxXp / (PLAYGROUND_MAX_LEVEL - 1) : PLAYGROUND_XP_PER_LEVEL
  const level = Math.min(PLAYGROUND_MAX_LEVEL, 1 + Math.floor(xp / perLevel))
  const levelFloorXp = (level - 1) * perLevel
  const xpIntoLevel = Math.round(Math.max(0, xp - levelFloorXp))
  const xpForNext = level >= PLAYGROUND_MAX_LEVEL ? xpIntoLevel : Math.round(perLevel)
  return { level, xpIntoLevel, xpForNext }
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

// ─── Tienda del Mercader del Abismo ──────────────────────────────────────────
// Los diamantes NO se guardan como un contador aparte: se calculan (jefes
// derrotados × DIAMONDS_PER_BOSS) menos lo gastado en ítems ya comprados —
// así nunca pueden desincronizarse de la fuente real (battle_records en modo
// cuenta, o el progreso local). Lo único que hace falta guardar es qué
// compró el alumno.

/** Registro completo de compras, incluidos los consumibles ya usados (consumedAt). */
function getShopLedger(): OwnedShopItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SHOP_OWNED_KEY)
    return raw ? (JSON.parse(raw) as OwnedShopItem[]) : []
  } catch { return [] }
}

/** Lo que el alumno TIENE ahora (sin los consumibles que ya usó). */
export function getShopOwned(): OwnedShopItem[] {
  return getShopLedger().filter((o) => !o.consumedAt)
}

function saveShopOwnedRaw(list: OwnedShopItem[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(SHOP_OWNED_KEY, JSON.stringify(list)) } catch { /* ignore quota errors */ }
  import('@/lib/storage/cloud-sync').then(({ queueCloudSync }) => queueCloudSync('shop', list))
}

export function diamondsEarned(bossesDefeated: number): number {
  return bossesDefeated * DIAMONDS_PER_BOSS
}

// Gastado = todo lo comprado (también lo ya usado: usar un ítem no devuelve
// diamantes), salvo lo que salió del catálogo, que se reintegra.
const CATALOG_IDS = new Set(SHOP_CATALOG.map((i) => i.id))

export function diamondsAvailable(bossesDefeated: number): number {
  const spent = getShopLedger().filter((o) => CATALOG_IDS.has(o.id)).reduce((sum, o) => sum + o.pricePaid, 0)
  return diamondsEarned(bossesDefeated) - spent
}

/** Devuelve null si ya lo tenía o no le alcanzaba/no tenía el nivel — el
 *  llamador (ShopApp) ya filtra eso en la UI, esto es el último guardián.
 *  Si hay un Cupón activo, cobra el precio con descuento. */
export function buyShopItem(item: ShopItem, bossesDefeated: number, playerLevel: number): OwnedShopItem | null {
  if (typeof window === 'undefined') return null
  const owned = getShopOwned()
  if (owned.some((o) => o.id === item.id)) return null
  if (playerLevel < item.level) return null
  const price = discountedPrice(item.price, getShopDiscount())
  if (diamondsAvailable(bossesDefeated) < price) return null
  const entry: OwnedShopItem = { id: item.id, pricePaid: price, acquiredAt: new Date().toISOString() }
  saveShopOwnedRaw([...getShopLedger(), entry])
  return entry
}

export function setStickerColorway(itemId: string, colorway: string): void {
  saveShopOwnedRaw(getShopLedger().map((o) => (o.id === itemId && !o.consumedAt ? { ...o, colorway } : o)))
}

/** Gasta un perk consumible: sale del inventario (se puede volver a comprar), pero
 *  queda en el registro como usado — si se borrara, sus diamantes "volverían". */
export function consumePerk(itemId: string): void {
  const ledger = getShopLedger()
  const i = ledger.findIndex((o) => o.id === itemId && !o.consumedAt)
  if (i >= 0) ledger[i] = { ...ledger[i], consumedAt: new Date().toISOString() }
  saveShopOwnedRaw(ledger)
  setEquippedPerks(getEquippedPerks().filter((id) => id !== itemId))
}

// ─── Cupón de Descuento ───────────────────────────────────────────────────
// Usar el cupón lo deja "pendiente"; la próxima vez que se abre la tienda
// pasa a "activo" por 30 minutos (= una visita) y todas las compras de esa
// visita salen con descuento. Así no se gasta en la primera compra sola ni
// queda activo para siempre si el alumno se olvida la pestaña abierta.

const SHOP_COUPON_KEY = 'pysql:shop-coupon'
const COUPON_VISIT_MS = 30 * 60 * 1000

interface CouponState { pct: number; activeUntil?: number }

function readCoupon(): CouponState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SHOP_COUPON_KEY)
    return raw ? (JSON.parse(raw) as CouponState) : null
  } catch { return null }
}

/** Descuento vigente (0 si no hay cupón, o si la visita en que se usó ya terminó). */
export function getShopDiscount(): number {
  const c = readCoupon()
  if (!c) return 0
  if (c.activeUntil && Date.now() > c.activeUntil) {
    try { localStorage.removeItem(SHOP_COUPON_KEY) } catch { /* ignore */ }
    return 0
  }
  return c.pct
}

/** `false` si ya había un cupón esperando — no se apilan. */
export function activateShopCoupon(pct: number): boolean {
  if (getShopDiscount() > 0) return false
  try { localStorage.setItem(SHOP_COUPON_KEY, JSON.stringify({ pct } satisfies CouponState)) } catch { return false }
  return true
}

/** La tienda llama esto al abrirse: un cupón pendiente empieza a correr su visita. */
export function startCouponVisit(): void {
  const c = readCoupon()
  if (!c || c.activeUntil) return
  try { localStorage.setItem(SHOP_COUPON_KEY, JSON.stringify({ ...c, activeUntil: Date.now() + COUPON_VISIT_MS })) } catch { /* ignore */ }
}

// ─── Armadura (Mandarina sin barra de vida) ───────────────────────────────
// En junior/senior no hay vida que perder, así que la Mandarina da Armadura:
// un contador que guardan los jefes especiales (ver spendArmor).

const ARMOR_KEY = 'pysql:armor'

export function getArmor(): number {
  if (typeof window === 'undefined') return 0
  try { return Math.max(0, parseInt(localStorage.getItem(ARMOR_KEY) ?? '0', 10) || 0) } catch { return 0 }
}

export function addArmor(n = 1): number {
  const next = getArmor() + n
  try { localStorage.setItem(ARMOR_KEY, String(next)) } catch { /* ignore */ }
  return next
}

/** Para los jefes especiales: gasta 1 de armadura si hay. Devuelve si pudo. */
export function spendArmor(): boolean {
  const cur = getArmor()
  if (cur <= 0) return false
  try { localStorage.setItem(ARMOR_KEY, String(cur - 1)) } catch { return false }
  return true
}

// ─── Perks pasivos equipados ──────────────────────────────────────────────
// Hasta PERK_SLOT_LIMIT (lib/game/perk-effects.ts) a la vez — es lo que hace
// que equipar sea una decisión real y lo que habilita sinergias futuras
// entre dos equipados juntos. A diferencia de los stickers, esto SÍ viaja
// entre dispositivos: es una elección de juego, no una preferencia de
// escritorio local.

export function getEquippedPerks(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(EQUIPPED_PERKS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch { return [] }
}

function setEquippedPerksRaw(ids: string[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(EQUIPPED_PERKS_KEY, JSON.stringify(ids)) } catch { /* ignore quota errors */ }
  import('@/lib/storage/cloud-sync').then(({ queueCloudSync }) => queueCloudSync('equipped_perks', ids))
}

export function setEquippedPerks(ids: string[]): void {
  setEquippedPerksRaw(ids)
}

/** Devuelve `false` sin hacer nada si se intenta equipar un slot ya lleno. */
export function togglePerkEquipped(itemId: string, slotLimit: number): boolean {
  const current = getEquippedPerks()
  if (current.includes(itemId)) {
    setEquippedPerksRaw(current.filter((id) => id !== itemId))
    return true
  }
  if (current.length >= slotLimit) return false
  setEquippedPerksRaw([...current, itemId])
  return true
}

// ─── Dónde pegó cada sticker el alumno ────────────────────────────────────────
// Dos superficies decorables (el escritorio del dashboard y el patio de
// prácticas) — pero cada sticker ocupa un solo lugar a la vez: pegarlo en una
// pantalla lo saca de la otra si estaba ahí (decisión del profe: así conecta
// más con el alumno, que arma su espacio a gusto cada vez, en vez de
// "completar" las dos pantallas de una sola pasada). Posición en porcentaje
// (0-100) del contenedor, para que no se desarme si cambia el tamaño de
// ventana. Vive solo en este dispositivo/sesión (`localStorage`, sin
// sincronizar a la nube) a propósito — es la parte "propia de esta PC" del
// espacio de trabajo, no progreso que deba viajar entre máquinas.

export type StickerSurface = 'dashboard' | 'practice'
export interface StickerPlacement { surface: StickerSurface; x: number; y: number }
type Placements = Record<string, StickerPlacement>

function getAllPlacements(): Placements {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STICKER_PLACEMENTS_KEY)
    return raw ? (JSON.parse(raw) as Placements) : {}
  } catch { return {} }
}

function saveAllPlacements(all: Placements): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STICKER_PLACEMENTS_KEY, JSON.stringify(all)) } catch { /* ignore quota errors */ }
}

/** Solo los stickers puestos en ESTA superficie — los que están en la otra no aparecen acá. */
export function getStickerPlacements(surface: StickerSurface): Record<string, StickerPlacement> {
  const out: Record<string, StickerPlacement> = {}
  for (const [id, p] of Object.entries(getAllPlacements())) if (p.surface === surface) out[id] = p
  return out
}

/** ¿En qué superficie está este sticker ahora mismo (si está en alguna)? */
export function getStickerSurface(itemId: string): StickerSurface | null {
  return getAllPlacements()[itemId]?.surface ?? null
}

/** Pega (o mueve) el sticker acá — si estaba en la otra superficie, se saca de ahí solo. */
export function setStickerPlacement(surface: StickerSurface, itemId: string, pos: { x: number; y: number }): void {
  const all = getAllPlacements()
  all[itemId] = { surface, ...pos }
  saveAllPlacements(all)
}

export function removeStickerPlacement(itemId: string): void {
  const all = getAllPlacements()
  delete all[itemId]
  saveAllPlacements(all)
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
  shop: OwnedShopItem[] | null
  equipped_perks: string[] | null
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

  // Ítems de la tienda: unión por id (una vez comprado, es para siempre) — si
  // un lado personalizó el color y el otro no, se respeta la personalización.
  saveShopOwnedRaw(mergeOwnedById(cloud.shop ?? [], getShopLedger()))

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

  // Perks equipados: unión recortada al límite de slots — es una elección,
  // no un progreso acumulable, así que si los dos lados equiparon cosas
  // distintas se prioriza lo que ya estaba en la nube.
  const localEquipped = getEquippedPerks()
  if (cloud.equipped_perks) {
    const merged = [...new Set([...cloud.equipped_perks, ...localEquipped])].slice(0, PERK_SLOT_LIMIT)
    setEquippedPerksRaw(merged)
  } else if (localEquipped.length > 0) {
    setEquippedPerksRaw(localEquipped)
  }
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

/** Une los registros de compras de la nube y de este dispositivo. Cada compra
 *  es única por (id, fecha) — un consumible puede comprarse varias veces —, y
 *  si un lado ya la marcó como usada, gana "usada" (si no, el ítem revivía al
 *  sincronizar). Entre dos versiones sin usar, gana la personalizada. */
function mergeOwnedById(a: OwnedShopItem[], b: OwnedShopItem[]): OwnedShopItem[] {
  const key = (o: OwnedShopItem) => `${o.id}@${o.acquiredAt}`
  const byKey = new Map(a.map((o) => [key(o), o] as const))
  for (const o of b) {
    const existing = byKey.get(key(o))
    if (!existing) { byKey.set(key(o), o); continue }
    const consumedAt = existing.consumedAt ?? o.consumedAt
    const colorway = existing.colorway ?? o.colorway
    byKey.set(key(o), { ...existing, ...(consumedAt ? { consumedAt } : {}), ...(colorway ? { colorway } : {}) })
  }
  return [...byKey.values()]
}
