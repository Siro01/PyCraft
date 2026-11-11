// ─── La tabla `cartas` dentro del reino ─────────────────────────────────────
// Funciones puras sobre una base sql.js (sin React ni navegador): leer el
// mazo, sacarle una foto para "volver atrás", saber si una orden es peligrosa
// y armar el SQL que lo restaura. Tests en tests/cartas/mazo.test.ts.

import type { Database } from 'sql.js'
import { COLUMNAS_FIJAS, type Fila } from './reglas'

export interface TablaCartas {
  columnas: string[]
  filas: Fila[]
  /** El CREATE TABLE tal como lo escribió el alumno. */
  createSql: string
}

/** El mazo como está ahora. null si todavía no existe la tabla `cartas`. */
export function leerTablaCartas(db: Database): TablaCartas | null {
  const meta = db.exec("SELECT sql FROM sqlite_master WHERE type = 'table' AND lower(name) = 'cartas'")
  const createSql = meta[0]?.values[0]?.[0]
  if (typeof createSql !== 'string') return null
  const info = db.exec('PRAGMA table_info(cartas)')
  const columnas = (info[0]?.values ?? []).map((v) => String(v[1]))
  const res = db.exec('SELECT * FROM cartas ORDER BY rowid')
  const filas = (res[0]?.values ?? []).map((v) => Object.fromEntries(columnas.map((c, i) => [c, v[i]])) as Fila)
  return { columnas, filas, createSql }
}

/** Columnas fijas que le faltan a la tabla, y las que inventó el alumno. */
export function revisarColumnas(columnas: string[]): { faltan: string[]; inventadas: string[] } {
  const lower = columnas.map((c) => c.toLowerCase())
  return {
    faltan: COLUMNAS_FIJAS.filter((c) => !lower.includes(c)),
    inventadas: columnas.filter((c) => !(COLUMNAS_FIJAS as readonly string[]).includes(c.toLowerCase())),
  }
}

// ─── Fotos para "volver atrás" ───────────────────────────────────────────────

export interface FotoCartas {
  create_sql: string
  columnas: string[]
  filas: Fila[]
}

export function fotoCartas(db: Database): FotoCartas | null {
  const t = leerTablaCartas(db)
  return t ? { create_sql: t.createSql, columnas: t.columnas, filas: t.filas } : null
}

const valorSql = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

const nombreSql = (c: string) => `"${c.replace(/"/g, '""')}"`

/** Las sentencias que dejan `cartas` como en la foto (o la borran si la foto es null).
 *  Una por fila: cada una entra sola en el registro del reino. */
export function sqlRestaurar(foto: FotoCartas | null): string[] {
  const out = ['DROP TABLE IF EXISTS cartas;']
  if (!foto) return out
  out.push(`${foto.create_sql.trim().replace(/;+\s*$/, '')};`)
  const cols = foto.columnas.map(nombreSql).join(', ')
  for (const f of foto.filas) {
    out.push(`INSERT INTO cartas (${cols}) VALUES (${foto.columnas.map((c) => valorSql(f[c])).join(', ')});`)
  }
  return out
}

// ─── Órdenes peligrosas ──────────────────────────────────────────────────────
// Antes de una de estas se guarda una versión, por las dudas.

/** DELETE / UPDATE sobre cartas sin WHERE, o DROP de cartas. */
export function esPeligrosa(stmt: string): boolean {
  const s = stmt.replace(/--[^\n]*/g, ' ').trim()
  if (/^DROP\s+TABLE\s+(IF\s+EXISTS\s+)?["`[]?cartas\b/i.test(s)) return true
  if (/^(DELETE\s+FROM|UPDATE(\s+OR\s+\w+)?)\s+["`[]?cartas\b/i.test(s)) return !/\bWHERE\b/i.test(s)
  return false
}

/** Parte un bloque de SQL en sentencias (igual que runInReino). */
export function sentencias(code: string): string[] {
  return code.split(';').map((s) => s.trim()).filter((s) => s && !/^--[^\n]*$/.test(s))
}
