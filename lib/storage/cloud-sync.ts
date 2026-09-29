'use client'

import { isLocalMode } from '@/lib/local-mode'
import type { CloudExtras } from '@/lib/storage/local-store'

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

type Field = 'amulets' | 'playground' | 'finale' | 'finale_deco'
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
        .select('amulets, playground, finale, finale_deco')
        .eq('user_id', userId)
        .maybeSingle()
      const { hydrateFromCloud } = await import('@/lib/storage/local-store')
      hydrateFromCloud(
        (data as CloudExtras | null) ?? { amulets: null, playground: null, finale: null, finale_deco: null }
      )
    } catch (err) {
      console.error('No se pudo traer el progreso de la nube', err)
    }
  })
}
