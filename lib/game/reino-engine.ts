'use client'

import type { Database } from 'sql.js'
import {
  getSqlJs, snapshot, diffTables, toSchema, cellToString, WRITE_RE,
  type TableDiff, type TableSchema, type TableSnapshot,
} from '@/lib/game/executor/sql-runner'
import type { JournalEntry } from './reino-store'
import { TABLAS_REGLAS, sqlTablasReglas } from './cartas/reglas'

// ─── "Mi Reino": la base viva en el navegador ───────────────────────────────
// Se arma volviendo a ejecutar el registro de sentencias. A diferencia de las
// batallas, la base NO se descarta después de cada orden: es la del alumno.

/** Vuelve a ejecutar el registro. Una sentencia que hoy falla (p. ej. un trofeo
 *  sobre una tabla que el alumno cambió) se saltea: el reino nunca queda roto.
 *  Al final se agregan las tablas del juego (reglas y economia): no están en el
 *  registro, se inyectan siempre frescas. */
export async function openReino(entries: JournalEntry[]): Promise<Database> {
  const SQL = await getSqlJs()
  const db = new SQL.Database()
  for (const e of entries) {
    try { db.run(e.statement) } catch { /* se saltea */ }
  }
  inyectarTablasJuego(db)
  return db
}

// ─── Las tablas del juego: se leen, no se cambian ───────────────────────────

export const TABLAS_JUEGO: readonly string[] = TABLAS_REGLAS

/** Repone `reglas` y `economia` como manda REGLAS (pisa cualquier cambio). */
export function inyectarTablasJuego(db: Database): void {
  for (const t of TABLAS_JUEGO) db.run(`DROP TABLE IF EXISTS ${t};`)
  db.run(sqlTablasReglas())
}

// UPDATE / DELETE / DROP / ALTER / INSERT / REPLACE / CREATE sobre reglas o economia
// (con o sin comillas alrededor del nombre).
const VERBO_ESCRITURA = /^\s*(?:UPDATE(?:\s+OR\s+\w+)?|DELETE\s+FROM|DROP\s+TABLE(?:\s+IF\s+EXISTS)?|ALTER\s+TABLE|INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO|CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?)\s+["`[]?(\w+)/i
const TOCA_JUEGO = {
  test: (s: string) => {
    const m = s.match(VERBO_ESCRITURA)
    return !!m && (TABLAS_REGLAS as readonly string[]).includes(m[1].toLowerCase())
  },
}

export const MENSAJE_REGLAS = 'Las reglas son del juego, no se pueden cambiar. ¡Lo que sí podés cambiar son tus cartas!'

/** ¿Esta orden quiere cambiar las tablas del juego? */
export function tocaTablasJuego(stmt: string): boolean {
  return TOCA_JUEGO.test(stmt.replace(/^(\s*--[^\n]*\n)+/, ''))
}

/** Copia descartable del reino, para "Probar en la pizarra" sin tocar el de verdad. */
export async function cloneReino(db: Database): Promise<Database> {
  const SQL = await getSqlJs()
  return new SQL.Database(db.export())
}

export function reinoTables(db: Database): TableSnapshot[] {
  return Array.from(snapshot(db).values()).map(({ name, columns, rows, types }) => ({ name, columns, types, rows: rows.map((r) => r.cells) }))
}

export interface ReinoRun {
  columns: string[]
  rows: string[][]
  changes: TableDiff[]
  schema: TableSchema[]
  error: string | null
  /** Sentencias que cambiaron la base y salieron bien: van al registro. */
  applied: string[]
  /** Todas las sentencias que salieron bien (también los SELECT), en orden. */
  executed: string[]
}

/** Ejecuta lo que escribió el alumno sobre su reino, sentencia por sentencia.
 *  Si una falla, las anteriores ya quedaron hechas (y se guardan); la que falló no. */
export function runInReino(db: Database, code: string): ReinoRun {
  const before = snapshot(db)
  const stmts = code.split(';').map((s) => s.trim()).filter((s) => s && !/^--[^\n]*$/.test(s))
  const applied: string[] = []
  const executed: string[] = []
  let last: { columns: string[]; values: unknown[][] } | null = null
  let error: string | null = null

  for (const stmt of stmts) {
    if (tocaTablasJuego(stmt)) {
      error = MENSAJE_REGLAS
      inyectarTablasJuego(db)
      break
    }
    try {
      const res = db.exec(stmt)
      if (res.length > 0) last = res[res.length - 1]
      executed.push(stmt)
      if (WRITE_RE.test(stmt.replace(/^(--[^\n]*\n\s*)+/, ''))) applied.push(`${stmt};`)
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      break
    }
  }

  return {
    columns: last?.columns ?? [],
    rows: (last?.values ?? []).map((r) => r.map(cellToString)),
    changes: applied.length ? diffTables(before, snapshot(db)) : [],
    schema: toSchema(before),
    error,
    applied,
    executed,
  }
}

/** El reino como archivo .db, para llevárselo. */
export function exportReino(db: Database): Uint8Array {
  return db.export()
}
