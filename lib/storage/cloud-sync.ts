'use client'

import { isLocalMode } from '@/lib/local-mode'
import type { CloudExtras, RepasoProgressMap } from '@/lib/storage/local-store'

// ─── Sync con Supabase para lo que vive 100% en el navegador ────────────────
// El patio de juegos (XP), los amuletos y el cofre final se guardan y leen de
// localStorage siempre, incluso en modo cuenta — este módulo además los
// empuja a la tabla `game_extras` (con debounce, sin romper el juego si falla
// la red) y trae la fila guardada una vez por sesión para combinarla con lo
// que ya haya en el dispositivo (ver `hydrateFromCloud` en local-store.ts).
// Así un alumno que cambia de PC en el aula no pierde ese progreso.

let cachedUserId: string | null | undefined

async function getUserId(): Promise<string | null> {
  if (isLocalMode()) return null
  if (cachedUserId !== undefined) return cachedUserId
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { data } = await createClient().auth.getUser()
    cachedUserId = data.user?.id ?? null
  } catch {
    cachedUserId = null
  }
  return cachedUserId
}

type Field = 'amulets' | 'playground' | 'finale' | 'finale_deco' | 'shop' | 'equipped_perks' | 'repasos'
const timers: Partial<Record<Field, ReturnType<typeof setTimeout>>> = {}

/** Sube un campo del progreso a la nube (con un pequeño debounce por campo). */
export function queueCloudSync(field: Field, value: unknown): void {
  if (typeof window === 'undefined') return
  getUserId().then((userId) => {
    if (!userId) return
    const existing = timers[field]
    if (existing) clearTimeout(existing)
    timers[field] = setTimeout(async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        await createClient()
          .from('game_extras')
          .upsert({ user_id: userId, [field]: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      } catch (err) {
        console.error('No se pudo sincronizar el progreso con la nube', err)
      }
    }, 600)
  })
}

let hydrated = false

/**
 * Se corre una sola vez por sesión de navegador (y solo en modo cuenta): trae
 * la fila guardada en la nube y la combina con lo que ya haya en este
 * dispositivo. Llamarla más de una vez no hace nada después de la primera.
 */
export function syncOnLoad(): void {
  if (hydrated) return
  hydrated = true
  getUserId().then(async (userId) => {
    if (!userId) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data } = await createClient()
        .from('game_extras')
        .select('amulets, playground, finale, finale_deco, shop, equipped_perks')
        .eq('user_id', userId)
        .maybeSingle()
      const { hydrateFromCloud, hydrateRepasosFromCloud } = await import('@/lib/storage/local-store')
      hydrateFromCloud(
        (data as CloudExtras | null) ?? { amulets: null, playground: null, finale: null, finale_deco: null, shop: null, equipped_perks: null }
      )
      // Consulta aparte: si la migración 011 todavía no se corrió, la columna
      // no existe y esto falla solo — sin arrastrar al resto del progreso.
      const { data: rep, error } = await createClient()
        .from('game_extras')
        .select('repasos')
        .eq('user_id', userId)
        .maybeSingle()
      if (!error) hydrateRepasosFromCloud((rep as { repasos: RepasoProgressMap | null } | null)?.repasos ?? null)
      await syncArenaStats()
    } catch (err) {
      console.error('No se pudo traer el progreso de la nube', err)
    }
  })
}

/**
 * Diamantes netos y XP de La Arena y de las raids (arena_ledger / arena_xp /
 * raid_ledger, solo lectura para el alumno). Se guardan juntos en la misma
 * copia local. Si una migración (013 o 014) todavía no se corrió, su tabla no
 * existe y simplemente no suma.
 */
export async function syncArenaStats(): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
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
    if (led.error || xp.error) return
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
}
