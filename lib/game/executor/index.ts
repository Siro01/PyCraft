import type { Challenge } from '@/types'
import { runPython } from './pyodide-runner'
import { runSQL, type TableDiff, type TableSchema } from './sql-runner'

export { preloadPyodide, isPyodideLoaded } from './pyodide-runner'
export { preloadSqlJs } from './sql-runner'

/** Lo que vio la base de datos en un ataque SQL — para mostrarlo como tabla. */
export interface SqlDetail {
  columns: string[]
  rows: string[][]
  changes: TableDiff[]
  schema: TableSchema[]
  /** rows/columns vienen de la consulta de control del jefe. */
  fromVerify: boolean
}

export interface ExecuteResult {
  isCorrect: boolean
  actualOutput: string
  expectedOutput: string
  error: string | null
  sql?: SqlDetail
}

// Normalize: trim edges, collapse \r\n, strip trailing spaces per line
function normalize(s: string): string {
  return s
    .trim()
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
}

function rowsToString(rows: string[][]): string {
  return rows.map((row) => row.join('|')).join('\n')
}

export async function executeChallenge(
  challenge: Challenge,
  code: string,
): Promise<ExecuteResult> {
  const expected = challenge.expectedOutput

  if (challenge.type === 'python') {
    const { output, error } = await runPython(code)
    if (error) {
      return { isCorrect: false, actualOutput: '', expectedOutput: expected, error }
    }
    return {
      isCorrect: normalize(output) === normalize(expected),
      actualOutput: output,
      expectedOutput: expected,
      error: null,
    }
  }

  // SQL challenge
  const { rows, columns, error, changes = [], schema = [], fromVerify = false } = await runSQL(code, challenge.seedSQL, challenge.verifySQL)
  const sql: SqlDetail = { columns, rows, changes, schema, fromVerify }
  if (error) {
    return { isCorrect: false, actualOutput: '', expectedOutput: expected, error, sql }
  }
  const actual = rowsToString(rows)
  return {
    isCorrect: normalize(actual) === normalize(expected),
    actualOutput: actual,
    expectedOutput: expected,
    error: null,
    sql,
  }
}
