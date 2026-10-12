'use client'

import { isLocalMode } from '@/lib/local-mode'
import type { Boss } from '@/types'

// ─── "Mi Reino": dónde vive la base de datos propia del alumno ──────────────
// No guardamos el archivo de la base: guardamos el registro de sentencias que
// la cambiaron y salieron bien (tabla `sql_journal`, migración 012). Al entrar,
// reino-engine las vuelve a ejecutar en orden y el reino aparece como quedó.
//
// · Modo cuenta: Supabase es la fuente de verdad. Lo nuevo se anota primero en
//   este navegador (cola `pending`) y se sube; si no hay red o la migración no
//   se corrió todavía, queda en la cola y se reintenta en la próxima carga.
//   Nunca se pierde lo que el alumno escribió.
// · Modo local: todo en localStorage.

export type JournalSource = 'libre' | 'botin' | 'reinicio'

export interface JournalEntry {
  statement: string
  source: JournalSource
  created_at: string
}

export type SyncState = 'local' | 'synced' | 'pending'

export const MAX_STATEMENT = 2000
/** Sentencias activas (desde el último reinicio) que entran en un reino. */
export const MAX_ACTIVE = 500

const LOCAL_KEY = 'pysql:reino'
const cacheKey = (uid: string) => `pysql:reino:${uid}`

interface Cache { synced: JournalEntry[]; pending: JournalEntry[] }

function readJSON<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sin espacio o bloqueado: seguimos en memoria */ }
}

let cachedUid: string | null | undefined

async function getUserId(): Promise<string | null> {
  if (isLocalMode()) return null
  if (cachedUid !== undefined) return cachedUid
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { data } = await createClient().auth.getUser()
    cachedUid = data.user?.id ?? null
  } catch {
    cachedUid = null
  }
  return cachedUid
}

/** Intenta subir la cola pendiente. Devuelve true si quedó vacía. */
async function flush(uid: string): Promise<boolean> {
  const cache = readJSON<Cache>(cacheKey(uid), { synced: [], pending: [] })
  if (cache.pending.length === 0) return true
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { error } = await createClient()
      .from('sql_journal')
      .insert(cache.pending.map((e) => ({ user_id: uid, statement: e.statement, source: e.source, created_at: e.created_at })))
    if (error) return false
    writeJSON(cacheKey(uid), { synced: [...cache.synced, ...cache.pending], pending: [] })
    return true
  } catch {
    return false
  }
}

export interface LoadedJournal {
  entries: JournalEntry[]
  sync: SyncState
}

/** Trae el registro completo (de la cuenta si se puede; si no, de este navegador). */
export async function loadJournal(): Promise<LoadedJournal> {
  const uid = await getUserId()
  if (!uid) return { entries: readJSON<JournalEntry[]>(LOCAL_KEY, []), sync: 'local' }

  let cache = readJSON<Cache>(cacheKey(uid), { synced: [], pending: [] })
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { data, error } = await createClient()
      .from('sql_journal')
      .select('statement, source, created_at')
      .eq('user_id', uid)
      .order('id', { ascending: true })
      .limit(5000)
    if (!error && data) {
      cache = { synced: data as JournalEntry[], pending: cache.pending }
      writeJSON(cacheKey(uid), cache)
    }
  } catch { /* sin red: usamos lo que hay en este navegador */ }

  const ok = await flush(uid)
  cache = readJSON<Cache>(cacheKey(uid), cache)
  return { entries: [...cache.synced, ...cache.pending], sync: ok ? 'synced' : 'pending' }
}

/** Agrega sentencias al final del registro. Devuelve en qué estado quedó el guardado. */
export async function appendJournal(entries: Omit<JournalEntry, 'created_at'>[]): Promise<SyncState> {
  if (entries.length === 0) return 'synced'
  const now = new Date().toISOString()
  const stamped = entries.map((e) => ({ ...e, statement: e.statement.slice(0, MAX_STATEMENT), created_at: now }))
  const uid = await getUserId()
  if (!uid) {
    writeJSON(LOCAL_KEY, [...readJSON<JournalEntry[]>(LOCAL_KEY, []), ...stamped])
    return 'local'
  }
  const cache = readJSON<Cache>(cacheKey(uid), { synced: [], pending: [] })
  writeJSON(cacheKey(uid), { synced: cache.synced, pending: [...cache.pending, ...stamped] })
  return (await flush(uid)) ? 'synced' : 'pending'
}

/** Las sentencias que arman el reino hoy: todo lo posterior al último reinicio. */
export function activeEntries(entries: JournalEntry[]): JournalEntry[] {
  let from = 0
  entries.forEach((e, i) => { if (e.source === 'reinicio') from = i + 1 })
  return entries.slice(from)
}

// ─── Botín de batalla ────────────────────────────────────────────────────────
// Cada jefe vencido deja una fila en la tabla `trofeos` del reino. INSERT OR
// IGNORE: si se repite (o el alumno ya la tenía), no duplica.

const q = (s: string) => `'${s.replace(/'/g, "''")}'`

export function trophyStatement(boss: Boss, date = new Date()): string {
  const fecha = date.toISOString().slice(0, 10)
  return 'CREATE TABLE IF NOT EXISTS trofeos (numero INTEGER PRIMARY KEY, jefe TEXT, tema TEXT, fecha TEXT);\n'
    + `INSERT OR IGNORE INTO trofeos VALUES (${boss.classNumber}, ${q(boss.name)}, ${q(boss.topic)}, ${q(fecha)});`
}

const hasTrophy = (entries: JournalEntry[], boss: Boss) =>
  entries.some((e) => e.source === 'botin' && e.statement.includes(`VALUES (${boss.classNumber}, `))

/** Al vencer a un jefe (nunca en práctica): suma su trofeo al reino. Falla en silencio. */
export async function grantTrophy(boss: Boss): Promise<void> {
  try {
    await appendJournal([{ statement: trophyStatement(boss), source: 'botin' }])
  } catch { /* el trofeo no es crítico: la próxima visita al reino lo repone */ }
}

/** Trofeos de jefes vencidos antes de que existiera el reino (o que no llegaron a guardarse). */
export function missingTrophies(entries: JournalEntry[], defeated: Boss[]): Omit<JournalEntry, 'created_at'>[] {
  return defeated
    .filter((b) => !hasTrophy(entries, b))
    .sort((a, b) => a.classNumber - b.classNumber)
    .map((b) => ({ statement: trophyStatement(b), source: 'botin' as const }))
}

/** Ids de los jefes que el alumno ya venció (cuenta o navegador). */
export async function defeatedBossIds(): Promise<string[]> {
  const uid = await getUserId()
  if (!uid) {
    const { getAllProgress } = await import('@/lib/storage/local-store')
    return Object.entries(getAllProgress()).filter(([, p]) => p.defeated).map(([id]) => id)
  }
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { data } = await createClient().from('battle_records').select('boss_id').eq('user_id', uid).eq('is_completed', true)
    return Array.from(new Set((data ?? []).map((r: { boss_id: string }) => r.boss_id)))
  } catch {
    return []
  }
}
