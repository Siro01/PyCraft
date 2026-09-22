import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { BOSSES } from '@/lib/game/bosses'
import { TIER_ORDER } from '@/lib/game/tiers'
import { usernameToEmail } from '@/lib/auth/username-email'
import { TEST_AULA_NAME, TEST_USERNAME } from './constants'

// Sin 0/O/1/I/L: el código se tipea a mano en las PCs del taller.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`
}

export function normalizeCode(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

export function adminClient(): SupabaseClient {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

/** Verifica que quien llama es admin. Devuelve su id o la respuesta de error. */
export async function requireAdmin(): Promise<{ userId: string } | { error: NextResponse }> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Sin permisos' }, { status: 403 }) }
  return { userId: user.id }
}

/**
 * Crea (si falta) el alumno TEST y su aula con TODOS los jefes y dificultades
 * habilitados, para que pueda recorrer el flujo completo. Idempotente.
 */
export async function ensureTestStudent(admin: SupabaseClient): Promise<{ userId: string; email: string }> {
  const email = usernameToEmail(TEST_USERNAME)

  // Aula
  let { data: aula } = await admin.from('aulas').select('id').eq('nombre', TEST_AULA_NAME).maybeSingle()
  if (!aula) {
    const { data, error } = await admin.from('aulas').insert({ nombre: TEST_AULA_NAME, turno: 'otro' }).select('id').single()
    if (error) throw new Error(`aula: ${error.message}`)
    aula = data
  }
  const aulaId = aula!.id as string

  await admin.from('aula_bosses').upsert(
    BOSSES.map((b) => ({ aula_id: aulaId, boss_id: b.id, is_enabled: true })),
    { onConflict: 'aula_id,boss_id' },
  )
  await admin.from('aula_tiers').upsert(
    TIER_ORDER.map((tier) => ({ aula_id: aulaId, tier, is_enabled: true })),
    { onConflict: 'aula_id,tier' },
  )

  // Usuario
  let { data: profile } = await admin.from('profiles').select('id').eq('is_test', true).maybeSingle()
  if (!profile) {
    const password = crypto.randomUUID() + crypto.randomUUID() // nunca se usa: se entra por código
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    let userId = data?.user?.id
    if (error || !userId) {
      // Ya existía en auth (por ejemplo, perfil borrado a mano): se recupera.
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
      userId = list?.users.find((u) => u.email === email)?.id
      if (!userId) throw new Error(`usuario: ${error?.message ?? 'no se pudo crear'}`)
    }
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({ id: userId, username: TEST_USERNAME, role: 'student', aula_id: aulaId, is_test: true }, { onConflict: 'id' })
    if (profileError) throw new Error(`perfil: ${profileError.message}`)
    profile = { id: userId }
  } else {
    await admin.from('profiles').update({ aula_id: aulaId, role: 'student' }).eq('id', profile.id)
  }

  return { userId: profile.id as string, email }
}

/** Borra todo el progreso del alumno TEST (batallas, ataques y feedback). */
export async function resetTestProgress(admin: SupabaseClient, userId: string): Promise<void> {
  await admin.from('attack_records').delete().eq('user_id', userId)
  await admin.from('battle_records').delete().eq('user_id', userId)
  await admin.from('feedback').delete().eq('user_id', userId)
}

/** ¿Este usuario es el alumno TEST? Tolera que la migración 007 todavía no esté aplicada. */
export async function isTestUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('profiles').select('is_test').eq('id', userId).single()
    return !error && data?.is_test === true
  } catch {
    return false
  }
}

/** ¿La sesión actual es la del alumno TEST? (para mostrar el HUD y las herramientas de prueba). */
export async function isTestSession(): Promise<boolean> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user ? await isTestUser(supabase, user.id) : false
  } catch {
    return false
  }
}

/** Ids de alumnos TEST, para excluirlos de estadísticas. Vacío si la migración 007 no está aplicada. */
export async function getTestUserIds(supabase: SupabaseClient): Promise<Set<string>> {
  try {
    const { data, error } = await supabase.from('profiles').select('id').eq('is_test', true)
    return new Set(error ? [] : (data ?? []).map((r: { id: string }) => r.id))
  } catch {
    return new Set()
  }
}
