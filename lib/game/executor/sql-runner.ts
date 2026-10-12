'use client'

import type { SqlJsStatic, Database } from 'sql.js'

let sqlJsInstance: SqlJsStatic | null = null
let sqlJsLoading: Promise<SqlJsStatic> | null = null

export async function getSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsInstance) return sqlJsInstance
  if (sqlJsLoading) return sqlJsLoading

  sqlJsLoading = (async () => {
    // Dynamic import so the module is never evaluated server-side
    const mod = await import('sql.js')
    const initSqlJs = (mod as unknown as { default: (opts: unknown) => Promise<SqlJsStatic> }).default
    const instance = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    })
    sqlJsInstance = instance
    return instance
  })()

  return sqlJsLoading
}

export interface SQLRunResult {
  rows: string[][]
  columns: string[]
  error: string | null
  /** Tablas que el código del alumno cambió (INSERT/UPDATE/DELETE/CREATE…), fila por fila. */
  changes?: TableDiff[]
  /** Las filas salieron de la consulta de control del jefe (verifySQL), no del código del alumno. */
  fromVerify?: boolean
  /** Tablas y columnas que había antes de su código (para sugerir nombres en los errores). */
  schema?: TableSchema[]
}

export interface TableSchema {
  name: string
  columns: string[]
}

export interface TableSnapshot extends TableSchema {
  rows: string[][]
  /** Tipo declarado de cada columna (INTEGER, TEXT…), para saber si un valor va entre comillas. */
  types: string[]
}

export type RowState = 'same' | 'new' | 'changed' | 'deleted'

export interface DiffRow {
  cells: string[]
  state: RowState
  /** Índices de las celdas que cambiaron (solo en filas 'changed'). */
  changedCols?: number[]
}

export interface TableDiff {
  name: string
  columns: string[]
  rows: DiffRow[]
  /** La tabla no existía antes del código del alumno. */
  created: boolean
}

const MAX_ROWS = 50

export interface RawSnapshot extends TableSchema {
  rows: { rid: string | null; cells: string[] }[]
  types: string[]
}

function columnTypes(db: Database, quoted: string): string[] {
  const info = db.exec(`PRAGMA table_info(${quoted})`)
  return (info[0]?.values ?? []).map((r) => String(r[2] ?? ''))
}

/** Foto de todas las tablas del alumno (con rowid para saber qué fila es cuál). */
export function snapshot(db: Database): Map<string, RawSnapshot> {
  const out = new Map<string, RawSnapshot>()
  const names = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
  for (const [name] of names[0]?.values ?? []) {
    const table = String(name)
    const quoted = `"${table.replace(/"/g, '""')}"`
    let res
    let withRid = true
    try {
      res = db.exec(`SELECT rowid AS __rid, * FROM ${quoted} LIMIT ${MAX_ROWS}`)
    } catch {
      withRid = false
      res = db.exec(`SELECT * FROM ${quoted} LIMIT ${MAX_ROWS}`)
    }
    let columns = res[0]?.columns ?? []
    if (!res[0]) {
      // Tabla vacía: exec no devuelve columnas, las pedimos aparte.
      const info = db.exec(`PRAGMA table_info(${quoted})`)
      columns = (info[0]?.values ?? []).map((r) => String(r[1]))
      out.set(table, { name: table, columns, rows: [], types: columnTypes(db, quoted) })
      continue
    }
    const rows = res[0].values.map((v) => ({
      rid: withRid ? String(v[0]) : null,
      cells: (withRid ? v.slice(1) : v).map(cellToString),
    }))
    out.set(table, { name: table, columns: withRid ? columns.slice(1) : columns, rows, types: columnTypes(db, quoted) })
  }
  return out
}

export function diffTables(before: Map<string, RawSnapshot>, after: Map<string, RawSnapshot>): TableDiff[] {
  const diffs: TableDiff[] = []
  for (const [name, now] of after) {
    const prev = before.get(name)
    const sameShape = !!prev && prev.columns.join('|') === now.columns.join('|')
    if (!prev || !sameShape) {
      diffs.push({ name, columns: now.columns, created: !prev, rows: now.rows.map((r) => ({ cells: r.cells, state: prev ? 'same' : 'new' })) })
      continue
    }
    const prevById = new Map(prev.rows.map((r, i) => [r.rid ?? `#${i}`, r]))
    const seen = new Set<string>()
    const rows: DiffRow[] = []
    let touched = false
    now.rows.forEach((r, i) => {
      const id = r.rid ?? `#${i}`
      const old = prevById.get(id)
      seen.add(id)
      if (!old) { rows.push({ cells: r.cells, state: 'new' }); touched = true; return }
      const changedCols = r.cells.flatMap((c, ci) => (c !== old.cells[ci] ? [ci] : []))
      if (changedCols.length) { rows.push({ cells: r.cells, state: 'changed', changedCols }); touched = true }
      else rows.push({ cells: r.cells, state: 'same' })
    })
    // Las filas borradas se muestran en su lugar original (tachadas).
    prev.rows.forEach((r, i) => {
      const id = r.rid ?? `#${i}`
      if (seen.has(id)) return
      touched = true
      const at = rows.findIndex((x, xi) => xi >= i && x.state !== 'new')
      rows.splice(at === -1 ? rows.length : at, 0, { cells: r.cells, state: 'deleted' })
    })
    if (touched) diffs.push({ name, columns: now.columns, created: false, rows })
  }
  return diffs
}

export function toSchema(snap: Map<string, RawSnapshot>): TableSchema[] {
  return Array.from(snap.values()).map(({ name, columns }) => ({ name, columns }))
}

/** Las tablas con las que arranca un desafío, para mostrarlas antes de escribir. */
export async function getSeedTables(seedSQL?: string): Promise<TableSnapshot[]> {
  if (!seedSQL?.trim()) return []
  const SQL = await getSqlJs()
  const db = new SQL.Database()
  try {
    db.run(seedSQL)
    return Array.from(snapshot(db).values()).map(({ name, columns, rows, types }) => ({ name, columns, types, rows: rows.map((r) => r.cells) }))
  } catch {
    return []
  } finally {
    db.close()
  }
}

export const WRITE_RE = /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|DROP|ALTER)\b/i

export function cellToString(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (val instanceof Uint8Array) return `[blob ${val.length}B]`
  return String(val)
}

export async function runSQL(
  userSQL: string,
  seedSQL?: string,
  verifySQL?: string,
): Promise<SQLRunResult> {
  const SQL = await getSqlJs()
  let db: Database | null = null

  let before: Map<string, RawSnapshot> | null = null

  try {
    db = new SQL.Database()

    // 1. Seed the DB with initial table/data
    if (seedSQL?.trim()) {
      db.run(seedSQL)
    }
    before = snapshot(db)

    // 2. Run each statement from the user, collecting the last result set
    const stmts = userSQL.trim().split(';').map((s) => s.trim()).filter(Boolean)
    let lastResult: { columns: string[]; values: unknown[][] }[] = []
    let wrote = false

    for (const stmt of stmts) {
      if (WRITE_RE.test(stmt)) wrote = true
      const res = db.exec(stmt)
      if (res.length > 0) lastResult = res
    }

    const changes = wrote ? diffTables(before, snapshot(db)) : []
    const schema = toSchema(before)

    // 3. DDL/DML produces no rows → run verifySQL to check the result
    const fromVerify = lastResult.length === 0 && !!verifySQL?.trim()
    if (fromVerify) {
      lastResult = db.exec(verifySQL!)
    }

    if (lastResult.length === 0) {
      return { rows: [], columns: [], error: null, changes, schema, fromVerify }
    }

    const { columns, values } = lastResult[0]
    const rows = values.map((row) => row.map(cellToString))
    return { rows, columns, error: null, changes, schema, fromVerify }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { rows: [], columns: [], error: msg, schema: before ? toSchema(before) : undefined }
  } finally {
    db?.close()
  }
}

export function preloadSqlJs(): void {
  if (typeof window !== 'undefined') {
    getSqlJs().catch(() => {})
  }
}
