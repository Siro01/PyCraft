'use client'

import { isLocalMode } from '@/lib/local-mode'
import { getLocalUser } from '@/lib/storage/local-store'

export interface FeedbackInput {
  rating: number | null
  hardestBoss: string | null
  liked: string
  improve: string
  extra: string
}

export interface Viewer {
  loggedIn: boolean
}

const LOCAL_KEY = 'pysql:feedback'

function saveLocal(input: FeedbackInput, source: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as unknown[]
    all.push({ ...input, source, createdAt: new Date().toISOString() })
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch { /* sin storage: no se puede guardar copia local */ }
}

/** ¿Hay una sesión activa? Decide a dónde va el alumno al terminar. */
export async function getViewer(): Promise<Viewer> {
  if (isLocalMode()) return { loggedIn: getLocalUser() !== null }
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { data: { user } } = await createClient().auth.getUser()
    return { loggedIn: !!user }
  } catch {
    return { loggedIn: false }
  }
}

/**
 * Guarda el feedback.
 *  - 'db'    → quedó en Supabase
 *  - 'local' → modo local (sin base): quedó en el navegador
 *  - 'error' → falló la base; quedó una copia en el navegador
 */
export async function submitFeedback(input: FeedbackInput): Promise<'db' | 'local' | 'error'> {
  if (isLocalMode()) {
    saveLocal(input, 'local')
    return 'local'
  }

  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let aulaId: string | null = null
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('aula_id').eq('id', user.id).single()
      aulaId = profile?.aula_id ?? null
    }

    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      aula_id: aulaId,
      source: user ? 'battle' : 'demo',
      rating: input.rating,
      hardest_boss: input.hardestBoss,
      liked: input.liked.trim().slice(0, 600) || null,
      improve: input.improve.trim().slice(0, 600) || null,
      extra: input.extra.trim().slice(0, 600) || null,
    })
    if (error) throw error
    return 'db'
  } catch {
    saveLocal(input, 'fallback')
    return 'error'
  }
}
