'use client'

import type { BookLang } from './biblioteca'
import type { AskInput } from './executor/pyodide-runner'

export interface BookRun {
  /** Líneas impresas (Python) — vacío si fue SQL o hubo error. Las respuestas
   *  de input() vienen marcadas (ver ConsoleLine). */
  lines: string[]
  /** Resultado SQL (la última consulta, o la de "mirar la tabla"). */
  table: { cols: string[]; rows: string[][] } | null
  error: string | null
  /** La salida comparable: texto de Python, o filas SQL con `|`. */
  flat: string
}

export function normalizeOutput(s: string): string {
  return s.trim().replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n')
}

/** Corre el ejemplo de una página o un hechizo con el mismo motor que los jefes.
 *  `prelude` (Python) arma la base de datos sin que el alumno lo vea; los
 *  números de línea de los errores se corrigen para que apunten a SU código. */
export async function runBookCode(
  lang: BookLang,
  code: string,
  opts: { seed?: string; peek?: string; prelude?: string; ask?: AskInput } = {},
): Promise<BookRun> {
  if (lang === 'python') {
    const { runPython } = await import('./executor/pyodide-runner')
    const pre = opts.prelude ? `${opts.prelude}\n` : ''
    const offset = pre ? pre.split('\n').length - 1 : 0
    const { output, display, error } = await runPython(pre + code, { ask: opts.ask })
    if (error) {
      const fixed = offset ? error.replace(/línea (\d+)/g, (_, n) => `línea ${Math.max(1, Number(n) - offset)}`) : error
      return { lines: display ? display.split('\n') : [], table: null, error: fixed, flat: output }
    }
    return { lines: display ? display.split('\n') : [], table: null, error: null, flat: output }
  }
  const { runSQL } = await import('./executor/sql-runner')
  const { rows, columns, error } = await runSQL(code, opts.seed, opts.peek)
  if (error) return { lines: [], table: null, error, flat: '' }
  if (columns.length === 0) return { lines: [], table: null, error: null, flat: '' }
  return { lines: [], table: { cols: columns, rows }, error: null, flat: rows.map((r) => r.join('|')).join('\n') }
}
