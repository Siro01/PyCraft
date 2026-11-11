'use client'

import { isLocalMode } from '@/lib/local-mode'
import type { FotoCartas } from './mazo'
import type { Marcas } from './guia'
import { DISENOS_VACIOS, sanearDisenos, type DisenosMazo } from './paleta'

// ─── Dónde vive el proyecto de AreaTrabajo ──────────────────────────────────
// Las cartas viven en el reino (sql_journal). Todo lo demás (título, código
// Python, consultas, pasos, dibujos) vive acá:
// · Siempre primero un borrador en este navegador (wifi inestable).
// · Después se sube a area_proyectos (migración 020). Si no hay red, o la
//   migración no se corrió, queda el borrador y se reintenta en el próximo guardado.
// · Al abrir: si el borrador local es más nuevo que el de la cuenta, gana el local.

export interface Consulta {
  nombre: string
  sql: string
  es_orden_batalla: boolean
}

export interface AreaProyecto {
  titulo: string
  lema: string
  alias: string
  python_code: string
  consultas: Consulta[]
  pasos: Marcas
  sin_red: Record<string, true>
  /** Frente de cada carta, dorso del mazo y volteo. */
  disenos: DisenosMazo
  /** El borrador del editor SQL (solo en este navegador). */
  sql_borrador: string
  publicado: boolean
  updated_at: string
}

/** 'local' = tiene cuenta pero no se pudo subir · 'navegador' = sin cuenta (modo local o página de prueba). */
export type EstadoGuardado = 'guardado' | 'guardando' | 'local' | 'navegador'

export const PROYECTO_VACIO: AreaProyecto = {
  titulo: '', lema: '', alias: '', python_code: '', consultas: [], pasos: {}, sin_red: {}, disenos: DISENOS_VACIOS,
  sql_borrador: '', publicado: false, updated_at: new Date(0).toISOString(),
}

const LIMITES = { titulo: 60, lema: 120, alias: 20 }
export const limitar = (campo: keyof typeof LIMITES, v: string) => v.slice(0, LIMITES[campo])

function readJSON<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function writeJSON(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sin espacio: seguimos en memoria */ }
}

let cachedUid: string | null | undefined
export async function usuarioActual(): Promise<string | null> {
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

const claveBorrador = (uid: string | null) => `pysql:area:${uid ?? 'local'}`
const claveVersiones = (uid: string | null) => `pysql:area-versiones:${uid ?? 'local'}`

const COLUMNAS_NUBE = 'titulo, lema, alias, python_code, consultas, pasos, sin_red, disenos, publicado, updated_at'

const completar = (p: Partial<AreaProyecto>): AreaProyecto => ({ ...PROYECTO_VACIO, ...p, disenos: sanearDisenos(p.disenos) })

/** Abre el proyecto: borrador local o cuenta, el más nuevo. */
export async function cargarProyecto(): Promise<{ proyecto: AreaProyecto; estado: EstadoGuardado }> {
  const uid = await usuarioActual()
  const local = completar(readJSON<Partial<AreaProyecto>>(claveBorrador(uid), {}))
  if (!uid) return { proyecto: local, estado: 'navegador' }
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { data, error } = await createClient().from('area_proyectos').select(COLUMNAS_NUBE).eq('user_id', uid).maybeSingle()
    if (error) return { proyecto: local, estado: 'local' }
    if (!data) return { proyecto: local, estado: local.updated_at > PROYECTO_VACIO.updated_at ? 'local' : 'guardado' }
    const nube = completar({ ...(data as Partial<AreaProyecto>), sql_borrador: local.sql_borrador })
    if (local.updated_at > nube.updated_at) {
      // El borrador de esta PC es más nuevo (se cortó la red): se sube.
      const estado = await subir(uid, local)
      return { proyecto: local, estado }
    }
    writeJSON(claveBorrador(uid), nube)
    return { proyecto: nube, estado: 'guardado' }
  } catch {
    return { proyecto: local, estado: 'local' }
  }
}

async function subir(uid: string, p: AreaProyecto): Promise<EstadoGuardado> {
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient()
    const { data: perfil } = await sb.from('profiles').select('aula_id').eq('id', uid).maybeSingle()
    const { error } = await sb.from('area_proyectos').upsert({
      user_id: uid,
      aula_id: (perfil as { aula_id?: string | null } | null)?.aula_id ?? null,
      titulo: p.titulo, lema: p.lema, alias: p.alias, python_code: p.python_code,
      consultas: p.consultas, pasos: p.pasos, sin_red: p.sin_red, disenos: p.disenos, updated_at: p.updated_at,
    })
    return error ? 'local' : 'guardado'
  } catch {
    return 'local'
  }
}

/** Guarda: al toque en este navegador, y en la cuenta si se puede. */
export async function guardarProyecto(p: AreaProyecto): Promise<EstadoGuardado> {
  const uid = await usuarioActual()
  const conFecha = { ...p, updated_at: new Date().toISOString() }
  writeJSON(claveBorrador(uid), conFecha)
  if (!uid) return 'navegador'
  return subir(uid, conFecha)
}

// ─── Versiones ("volver atrás") ──────────────────────────────────────────────

export type MotivoVersion = 'auto' | 'peligro' | 'publicar' | 'restaurar'

export interface Version {
  id: string
  motivo: MotivoVersion
  created_at: string
  python_code: string
  cartas_snapshot: FotoCartas | null
  consultas: Consulta[]
  disenos: DisenosMazo | null
}

export const MAX_VERSIONES = 30

function podarLocales(vs: Version[]): Version[] {
  const comunes = vs.filter((v) => v.motivo !== 'publicar')
  if (comunes.length <= MAX_VERSIONES) return vs
  const fuera = new Set(comunes.slice(MAX_VERSIONES).map((v) => v.id))
  return vs.filter((v) => !fuera.has(v.id))
}

/** Guarda una versión (la más nueva primero). En la cuenta si se puede; si no, en este navegador. */
export async function crearVersion(v: Omit<Version, 'id' | 'created_at'>): Promise<void> {
  const uid = await usuarioActual()
  const nueva: Version = { ...v, id: `l${Date.now()}`, created_at: new Date().toISOString() }
  if (uid) {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error } = await createClient().from('area_versiones').insert({
        user_id: uid, motivo: v.motivo, python_code: v.python_code,
        cartas_snapshot: v.cartas_snapshot, consultas: v.consultas, disenos: v.disenos,
      })
      if (!error) return
    } catch { /* sin red: queda en este navegador */ }
  }
  writeJSON(claveVersiones(uid), podarLocales([nueva, ...readJSON<Version[]>(claveVersiones(uid), [])]))
}

/** Todas las versiones (cuenta + las que quedaron en este navegador), la más nueva primero. */
export async function listarVersiones(): Promise<Version[]> {
  const uid = await usuarioActual()
  const locales = readJSON<Version[]>(claveVersiones(uid), [])
  if (!uid) return locales
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { data } = await createClient()
      .from('area_versiones')
      .select('id, motivo, created_at, python_code, cartas_snapshot, consultas, disenos')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(60)
    const nube = ((data ?? []) as (Omit<Version, 'id'> & { id: number })[]).map((v) => ({ ...v, id: String(v.id), consultas: v.consultas ?? [] }))
    return [...nube, ...locales].sort((a, b) => b.created_at.localeCompare(a.created_at))
  } catch {
    return locales
  }
}

// ─── Publicar (paso 10) ──────────────────────────────────────────────────────
// Una foto completa e independiente del mazo: es lo que lee la muestra. Se
// puede volver a publicar las veces que haga falta (pisa la foto anterior).

export interface FotoPublicada {
  titulo: string
  lema: string
  alias: string
  /** 'PYCRAFT MAÑANA' | 'PYCRAFT TARDE' (sale del turno del aula) o null. */
  equipo: string | null
  columnas: string[]
  filas: Record<string, unknown>[]
  /** Las cartas en el orden de batalla del alumno (ids). */
  orden_ids: number[]
  python_code: string
  /** Lo que devuelve carta(fila) para cada carta (por id), si anda. */
  textos_carta: Record<string, string>
  disenos: DisenosMazo
  publicado_at: string
}

const clavePublicado = (uid: string | null) => `pysql:area-publicado:${uid ?? 'local'}`

export const EQUIPO_POR_TURNO: Record<string, string> = { 'mañana': 'PYCRAFT MAÑANA', 'tarde': 'PYCRAFT TARDE' }

/** El equipo del alumno según el turno de su aula (null sin cuenta o sin aula). */
export async function equipoDelAlumno(): Promise<string | null> {
  const uid = await usuarioActual()
  if (!uid) return null
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient()
    const { data: perfil } = await sb.from('profiles').select('aula_id').eq('id', uid).maybeSingle()
    const aulaId = (perfil as { aula_id?: string | null } | null)?.aula_id
    if (!aulaId) return null
    const { data: aula } = await sb.from('aulas').select('turno').eq('id', aulaId).maybeSingle()
    return EQUIPO_POR_TURNO[(aula as { turno?: string } | null)?.turno ?? ''] ?? null
  } catch {
    return null
  }
}

/** Publica: guarda la foto en este navegador y en la cuenta. */
export async function publicarProyecto(foto: FotoPublicada): Promise<EstadoGuardado> {
  const uid = await usuarioActual()
  writeJSON(clavePublicado(uid), foto)
  if (!uid) return 'navegador'
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const { error } = await createClient().from('area_proyectos')
      .update({ publicado: true, publicado_snapshot: foto, publicado_at: foto.publicado_at })
      .eq('user_id', uid)
    return error ? 'local' : 'guardado'
  } catch {
    return 'local'
  }
}

export function fotoPublicadaLocal(uid: string | null): FotoPublicada | null {
  return readJSON<FotoPublicada | null>(clavePublicado(uid), null)
}

/** Guarda una partida de prueba (para el docente). Si no se puede, no pasa nada. */
export async function guardarPartidaPrueba(p: { seed: number; ganador: 'a' | 'b' | 'empate'; registro: unknown }): Promise<void> {
  const uid = await usuarioActual()
  if (!uid) return
  try {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().from('partidas').insert({ modo: 'prueba', mazo_a: uid, mazo_b: null, ganador: p.ganador, seed: p.seed, registro: p.registro })
  } catch { /* no es crítico */ }
}
