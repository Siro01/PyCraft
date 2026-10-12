'use client'

import type { Database } from 'sql.js'
import {
  getSqlJs, snapshot, diffTables, toSchema, cellToString, WRITE_RE,
  type TableDiff, type TableSchema, type TableSnapshot,
} from '@/lib/game/executor/sql-runner'
import type { JournalEntry } from './reino-store'

// ─── "Mi Reino": la base viva en el navegador ───────────────────────────────
// Se arma volviendo a ejecutar el registro de sentencias. A diferencia de las
// batallas, la base NO se descarta después de cada orden: es la del alumno.

/** Vuelve a ejecutar el registro. Una sentencia que hoy falla (p. ej. un trofeo
 *  sobre una tabla que el alumno cambió) se saltea: el reino nunca queda roto. */
export async function openReino(entries: JournalEntry[]): Promise<Database> {
  const SQL = await getSqlJs()
  const db = new SQL.Database()
  for (const e of entries) {
    try { db.run(e.statement) } catch { /* se saltea */ }
  }
  return db
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
}

/** Ejecuta lo que escribió el alumno sobre su reino, sentencia por sentencia.
 *  Si una falla, las anteriores ya quedaron hechas (y se guardan); la que falló no. */
export function runInReino(db: Database, code: string): ReinoRun {
  const before = snapshot(db)
  const stmts = code.split(';').map((s) => s.trim()).filter((s) => s && !/^--[^\n]*$/.test(s))
  const applied: string[] = []
  let last: { columns: string[]; values: unknown[][] } | null = null
  let error: string | null = null

  for (const stmt of stmts) {
    try {
      const res = db.exec(stmt)
      if (res.length > 0) last = res[res.length - 1]
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
  }
}

/** El reino como archivo .db, para llevárselo. */
export function exportReino(db: Database): Uint8Array {
  return db.export()
}
