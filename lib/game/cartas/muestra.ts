// ─── Datos de la muestra (muestra.json) ─────────────────────────────────────
// Lo exporta el docente desde areatrabajo.exe y lo lee /muestra, también sin
// internet. Puro: se prueba en tests/cartas/muestra.test.ts.

import type { FotoPublicada } from './area-store'
import { sanearDisenos } from './paleta'
import { mazoDesdeFoto, type Equipo, type MazoPublicado } from './torneo'
import type { Rng } from './reglas'

export const EQUIPOS: Equipo[] = ['PYCRAFT MAÑANA', 'PYCRAFT TARDE']

export interface MazoMuestra extends MazoPublicado {
  /** La carta destacada del torneo (id), si se corrió. */
  destacada: number | null
}

export interface DatosMuestra {
  generado: string
  marcadorTorneo: Record<Equipo, number> | null
  mazos: MazoMuestra[]
}

/** Lee el archivo exportado. Los mazos que no cumplen la economía quedan afuera. */
export function leerMuestra(json: unknown): DatosMuestra | { error: string } {
  const o = json as { version?: number; generado?: string; marcador?: Record<string, number> | null; mazos?: unknown[] } | null
  if (!o || o.version !== 1 || !Array.isArray(o.mazos)) return { error: 'Ese archivo no es una muestra de PyCraft (muestra.json).' }
  const mazos: MazoMuestra[] = []
  for (const x of o.mazos) {
    const m = x as { n?: number; alias?: string; equipo?: string; destacada?: number | null; foto?: FotoPublicada }
    if (!m?.foto || !EQUIPOS.includes(m.equipo as Equipo)) continue
    const foto = { ...m.foto, alias: m.alias || m.foto.alias, disenos: sanearDisenos(m.foto.disenos) }
    const pub = mazoDesdeFoto(String(m.n ?? mazos.length + 1), m.alias ?? '', m.equipo as Equipo, foto)
    if (pub) mazos.push({ ...pub, destacada: typeof m.destacada === 'number' ? m.destacada : null })
  }
  if (!mazos.length) return { error: 'La muestra no tiene mazos publicados que puedan pelear.' }
  const mt = o.marcador
  return {
    generado: o.generado ?? '',
    marcadorTorneo: mt ? { 'PYCRAFT MAÑANA': mt['PYCRAFT MAÑANA'] ?? 0, 'PYCRAFT TARDE': mt['PYCRAFT TARDE'] ?? 0 } : null,
    mazos,
  }
}

export const mazosDe = (d: DatosMuestra, e: Equipo) => d.mazos.filter((m) => m.equipo === e)

/** Una pelea al azar: uno de la mañana contra uno de la tarde. */
export function parejaAlAzar(d: DatosMuestra, rng: Rng): [MazoMuestra, MazoMuestra] | null {
  const m = mazosDe(d, 'PYCRAFT MAÑANA')
  const t = mazosDe(d, 'PYCRAFT TARDE')
  if (!m.length || !t.length) return null
  return [m[Math.floor(rng() * m.length)], t[Math.floor(rng() * t.length)]]
}

// ─── "Mi mazo en números": SQL de verdad sobre la foto del mazo ─────────────

export const CONSULTAS_NUMEROS = {
  total: 'SELECT SUM(poder) FROM cartas',
  rareza: 'SELECT rareza, COUNT(*) FROM cartas GROUP BY rareza',
  color: 'SELECT color, COUNT(*) FROM cartas GROUP BY color',
} as const

/** El SQL que arma la tabla `cartas` de la foto (para correr las consultas en sql.js). */
export function sqlDeFoto(foto: FotoPublicada): string {
  const cols = foto.columnas.map((c) => `"${c.replace(/"/g, '""')}"`)
  const val = (v: unknown) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
  return [
    `CREATE TABLE cartas (${cols.join(', ')});`,
    ...foto.filas.map((f) => `INSERT INTO cartas VALUES (${foto.columnas.map((c) => val(f[c])).join(', ')});`),
  ].join('\n')
}

// ─── Marcador acumulado de la muestra (en la PC del stand) ──────────────────

export type MarcadorMuestra = Record<Equipo, number>
export const MARCADOR_VACIO: MarcadorMuestra = { 'PYCRAFT MAÑANA': 0, 'PYCRAFT TARDE': 0 }
