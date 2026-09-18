'use client'

import type { SqlJsStatic, Database } from 'sql.js'

let sqlJsInstance: SqlJsStatic | null = null
let sqlJsLoading: Promise<SqlJsStatic> | null = null

async function getSqlJs(): Promise<SqlJsStatic> {
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
}

function cellToString(val: unknown): string {
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

  try {
    db = new SQL.Database()

    // 1. Seed the DB with initial table/data
    if (seedSQL?.trim()) {
      db.run(seedSQL)
    }

    // 2. Run each statement from the user, collecting the last result set
    const stmts = userSQL.trim().split(';').map((s) => s.trim()).filter(Boolean)
    let lastResult: { columns: string[]; values: unknown[][] }[] = []

    for (const stmt of stmts) {
      const res = db.exec(stmt)
      if (res.length > 0) lastResult = res
    }

    // 3. DDL/DML produces no rows → run verifySQL to check the result
    if (lastResult.length === 0 && verifySQL?.trim()) {
      lastResult = db.exec(verifySQL)
    }

    if (lastResult.length === 0) {
      return { rows: [], columns: [], error: null }
    }

    const { columns, values } = lastResult[0]
    const rows = values.map((row) => row.map(cellToString))
    return { rows, columns, error: null }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { rows: [], columns: [], error: msg }
  } finally {
    db?.close()
  }
}

export function preloadSqlJs(): void {
  if (typeof window !== 'undefined') {
    getSqlJs().catch(() => {})
  }
}
