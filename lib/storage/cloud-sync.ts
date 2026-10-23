'use client'

import { isLocalMode } from '@/lib/local-mode'
import type { CloudExtras, RepasoProgressMap } from '@/lib/storage/local-store'

// ─── Sync con Supabase para lo que vive 100% en el navegador ────────────────
// El patio de juegos (XP), los amuletos, la tienda y el cofre final se guardan
// y leen de localStorage siempre, incluso en modo cuenta — este módulo además
// los empuja a la tabla `game_extras` (con debounce, sin romper el juego si
// falla la red) y trae la fila guardada para combinarla con lo que ya haya en
// el dispositivo (ver `hydrateFromCloud` en local-store.ts). Así un alumno
// que cambia de PC en el aula no pierde ese progreso.
//
// Tres reglas para no PERDER ni MEZCLAR progreso (incidente del 15/10):
// 1. Lo guardado en la PC es de UNA cuenta (pysql:owner). Si entra otra, se
//    borra su progreso local antes de traer el de la cuenta nueva.
// 2. Nada se sube a la nube hasta que la carga inicial salió BIEN. Si falla
//    (wifi del taller), se reintenta; nunca se toma "no pude leer" como
//    "no tiene nada" (eso subía listas vacías y pisaba los ítems).
// 3. La carga arranca en cualquier página (CloudSyncBoot en el layout raíz),
//    no solo en las que tienen Header (el Pistolero y los raids no lo tienen).

const OWNER_KEY = 'pysql:owner'

let cachedUserId: string | null | undefined

async function getUserId(): Promise<string | null> {
  if (isLocalMode()) return null
  if (cachedUserId !== undefined) return cachedUserId
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { data } = await createClient().auth.getUser()
    // Solo se recuerda una cuenta, nunca el "nadie": en /login todavía no hay
    // sesión, y si quedaba guardado el null, el alumno que entraba después
    // jugaba sin cargar lo suyo (veía y tocaba el progreso local del anterior).
    if (data.user) cachedUserId = data.user.id
    return data.user?.id ?? null
  } catch {
    // Sin red no sabemos quién es: se vuelve a preguntar.
    return null
  }
}

type Field = 'amulets' | 'playground' | 'finale' | 'finale_deco' | 'shop' | 'equipped_perks' | 'repasos'
const timers: Partial<Record<Field, ReturnType<typeof setTimeout>>> = {}

// ─── Estado de la carga inicial ────────────────────────────────────────────
type LoadState = 'idle' | 'loading' | 'ready'
let loadState: LoadState = 'idle'
let retryMs = 2_000
let retryTimer: ReturnType<typeof setTimeout> | null = null
const readyWaiters: (() => void)[] = []

// ─── ¿Ya llegó TODO el progreso de la cuenta? ──────────────────────────────
// Recién entonces el nivel y los diamantes son los reales: mientras tanto las
// pantallas muestran "…" en vez de un número equivocado. Se marca cuando llega
// la arena (lo último que se trae), cuando no hay cuenta, o a los 20 s como
// red de seguridad (wifi caído: se muestra lo que haya en la PC).
const PROGRESS_TIMEOUT_MS = 20_000
let progressLoaded = false
let progressTimer: ReturnType<typeof setTimeout> | null = null

/**
 * ¿Se puede comprar? Solo con la lista de compras de la cuenta ya traída de la
 * nube. A diferencia de isProgressLoaded, NO se habilita por tiempo: con lo que
 * hay en la PC el saldo puede ser más alto que el real (no ve compras hechas
 * en otra PC) y el alumno termina en negativo — pasó con ezetae15 el 21/10.
 */
export function canSpendDiamonds(): boolean {
  return loadState === 'ready' || isLocalMode()
}

export function isProgressLoaded(): boolean {
  return progressLoaded || isLocalMode()
}

function markProgressLoaded(): void {
  if (progressTimer) { clearTimeout(progressTimer); progressTimer = null }
  progressLoaded = true
  window.dispatchEvent(new Event(CLOUD_READY_EVENT))
}

/** Se resuelve cuando la carga inicial terminó bien (el progreso local ya es el de esta cuenta). */
function whenReady(): Promise<void> {
  if (loadState === 'ready') return Promise.resolve()
  syncOnLoad()
  return new Promise((resolve) => readyWaiters.push(resolve))
}

/** Sube un campo del progreso a la nube (con un pequeño debounce por campo). */
export function queueCloudSync(field: Field, value: unknown): void {
  if (typeof window === 'undefined') return
  getUserId().then((userId) => {
    if (!userId) return
    // Antes de la carga inicial NO se sube nada: lo local puede ser de otra
    // cuenta o estar incompleto. El cambio queda guardado en la PC y la carga,
    // al combinar con la nube, lo vuelve a subir ya mezclado con lo de la nube.
    if (loadState !== 'ready') { syncOnLoad(); return }
    const existing = timers[field]
    if (existing) clearTimeout(existing)
    timers[field] = setTimeout(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const { error } = await createClient()
          .from('game_extras')
          .upsert({ user_id: userId, [field]: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        if (error) console.error('No se pudo sincronizar el progreso con la nube', error)
      } catch (err) {
        console.error('No se pudo sincronizar el progreso con la nube', err)
      }
    }, 600)
  })
}

/**
 * Carga inicial (una vez por página cargada, solo en modo cuenta): trae la
 * fila guardada en la nube y la combina con lo que ya haya en este
 * dispositivo. Si falla, reintenta con espera creciente (hasta 30 s).
 * Llamarla de nuevo mientras carga o después de cargar no hace nada.
 */
export function syncOnLoad(): void {
  if (typeof window === 'undefined' || loadState !== 'idle') return
  loadState = 'loading'
  progressTimer ??= setTimeout(markProgressLoaded, PROGRESS_TIMEOUT_MS)
  void (async () => {
    const userId = await getUserId()
    if (!userId) { loadState = 'idle'; markProgressLoaded(); return }
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const main = await supabase
        .from('game_extras')
        .select('amulets, playground, finale, finale_deco, shop, equipped_perks')
        .eq('user_id', userId)
        .maybeSingle()
      // Un error NO es "no tiene nada": sin esto, una falla de red subía listas vacías.
      if (main.error) throw main.error
      // Consulta aparte: si la migración 011 todavía no se corrió, la columna
      // no existe y esto falla solo — sin arrastrar al resto del progreso.
      const rep = await supabase.from('game_extras').select('repasos').eq('user_id', userId).maybeSingle()

      const local = await import('@/lib/storage/local-store')
      // Regla 1: lo que haya en esta PC de OTRA cuenta no se mezcla con esta.
      let owner: string | null = null
      try { owner = localStorage.getItem(OWNER_KEY) } catch { /* modo privado */ }
      if (owner && owner !== userId) local.clearUserProgress()
      try { localStorage.setItem(OWNER_KEY, userId) } catch { /* modo privado */ }

      loadState = 'ready'
      retryMs = 2_000
      local.hydrateFromCloud(
        (main.data as CloudExtras | null) ?? { amulets: null, playground: null, finale: null, finale_deco: null, shop: null, equipped_perks: null }
      )
      if (!rep.error) local.hydrateRepasosFromCloud((rep.data as { repasos: RepasoProgressMap | null } | null)?.repasos ?? null)
      readyWaiters.splice(0).forEach((r) => r())
      window.dispatchEvent(new Event(CLOUD_READY_EVENT))
      await syncArenaStats()
    } catch (err) {
      console.error('No se pudo traer el progreso de la nube; reintento en', retryMs / 1000, 's', err)
      loadState = 'idle'
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = setTimeout(() => { retryTimer = null; syncOnLoad() }, retryMs)
      retryMs = Math.min(retryMs * 2, 30_000)
    }
  })()
}

/** Se dispara cuando el progreso local ya es el de la cuenta (para que las pantallas se actualicen). */
export const CLOUD_READY_EVENT = 'pysql:cloud-ready'

/**
 * Diamantes netos y XP de La Arena y de las raids (arena_ledger / arena_xp /
 * raid_ledger, solo lectura para el alumno). Se guardan juntos en la misma
 * copia local. Si una migración (013 o 014) todavía no se corrió, su tabla no
 * existe y simplemente no suma.
 */
export async function syncArenaStats(): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  // Entrega stickers (escribe la lista de compras): solo con la carga inicial
  // hecha, para no subir una lista de esta PC que no es la de la cuenta.
  await whenReady()
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    // xp de arena_ledger = XP de revancha del 2 vs 2 (017); sin la columna, se pide sin ella.
    const ledWithXp = await supabase.from('arena_ledger').select('delta, xp').eq('user_id', userId)
    const [led, xp, raid] = await Promise.all([
      ledWithXp.error ? supabase.from('arena_ledger').select('delta').eq('user_id', userId) : Promise.resolve(ledWithXp),
      supabase.from('arena_xp').select('xp').eq('user_id', userId),
      supabase.from('raid_ledger').select('delta, xp, reason, raids(boss_id)').eq('user_id', userId),
    ])
    if (led.error || xp.error) { markProgressLoaded(); return }
    const raidRows = raid.error ? [] : (raid.data as unknown as { delta: number; xp: number; reason: string; raids: { boss_id: string | null } | null }[])
    const pistolero = raidRows.filter((r) => r.reason === 'pistolero').length
    const { setArenaStats, claimChestSticker, recordSecretWin } = await import('@/lib/storage/local-store')
    const { SE_BUSCA_ID, raidStickerFor } = await import('@/lib/game/chest-stickers')
    // El botín de equipo llega solo, aunque el alumno no haya visto la pantalla del final:
    // el cartel SE BUSCA y, por cada jefe secreto vencido en raid, su sticker y la
    // marca de «derrotado» en la guarida (sin diamantes: esos vienen de raid_ledger).
    if (pistolero > 0) claimChestSticker(SE_BUSCA_ID)
    for (const r of raidRows) {
      const boss = r.raids?.boss_id
      if (!boss || (r.reason !== 'raid-primera' && r.reason !== 'raid-revancha')) continue
      claimChestSticker(raidStickerFor(boss))
      recordSecretWin(boss, 0)
    }
    setArenaStats({
      pistolero,
      net: (led.data as { delta: number }[]).reduce((s, l) => s + l.delta, 0) + raidRows.reduce((s, l) => s + l.delta, 0),
      xp: (xp.data as { xp: number }[]).reduce((s, l) => s + l.xp, 0) + raidRows.reduce((s, l) => s + l.xp, 0)
        + (led.data as { xp?: number }[]).reduce((s, l) => s + (l.xp ?? 0), 0),
    })
  } catch { /* sin red: queda la copia anterior */ }
  // Llega DESPUÉS del aviso de la carga inicial: sin este segundo aviso, el
  // mapa y la tienda se quedaban sin el XP y los diamantes de arena, raids y
  // compensaciones (nivel 1 y solo los diamantes de los jefes) en una PC nueva.
  markProgressLoaded()
}
