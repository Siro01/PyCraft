'use client'

import type { SqlDetail } from '@/lib/game/executor'
import type { TableSnapshot } from '@/lib/game/executor/sql-runner'
import { friendlySqlError } from '@/lib/game/friendly-error'
import SqlTable from './SqlTable'

// Lo que pasó en la base de datos después de atacar, en el idioma del alumno:
// una tabla que se ve, nunca un texto con barras. Una sola idea por estado.

interface SqlResultProps {
  isCorrect: boolean
  error: string | null
  expected: string
  sql: SqlDetail
  /** Código que mandó el alumno (para detectar huecos ___ en el error). */
  code: string
  /** Tablas con las que arrancó el desafío (para ponerle nombre a las columnas esperadas). */
  seedTables?: TableSnapshot[]
}

const vt = 'var(--font-vt323), monospace'
const jersey = 'var(--font-jersey), monospace'

function parseExpected(s: string): string[][] {
  const t = s.trim()
  return t ? t.split('\n').map((l) => l.split('|')) : []
}

/** Encabezados para lo que pide el jefe: el desafío solo guarda los valores, así que
 *  buscamos en las tablas la columna que contiene todos esos valores. Si una columna
 *  no aparece en ninguna (un COUNT, una suma) queda sin nombre; si ninguna aparece, sin encabezado. */
function guessColumns(exp: string[][], tables: { columns: string[]; rows: string[][] }[]): string[] {
  const width = exp[0]?.length ?? 0
  const names = Array.from({ length: width }, (_, ci) => {
    const wanted = exp.map((r) => r[ci])
    for (const t of tables) {
      const col = t.columns.findIndex((_, tci) => {
        const have = new Set(t.rows.map((r) => r[tci]))
        return wanted.every((v) => have.has(v))
      })
      if (col !== -1) return t.columns[col]
    }
    return ''
  })
  return names.some(Boolean) ? names : []
}

/** Lo que hizo el código: la tabla cambiada (si cambió algo) o el resultado de la consulta. */
export function Produced({ sql }: { sql: SqlDetail }) {
  const { changes } = sql
  if (changes.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        {changes.map((c) => (
          <SqlTable key={c.name} label={c.name} isTable created={c.created} columns={c.columns} rows={c.rows} />
        ))}
      </div>
    )
  }
  return <SqlTable label="resultado" columns={sql.columns} rows={sql.rows} />
}

export default function SqlResult({ isCorrect, error, expected, sql, code, seedTables = [] }: SqlResultProps) {
  if (error) {
    const help = friendlySqlError(error, code, sql.schema)
    return (
      <div className="flex flex-col gap-2">
        <p style={{ fontFamily: vt, fontSize: 22, lineHeight: 1.15, color: 'hsl(var(--tx))', margin: 0, maxWidth: '60ch' }}>
          {help.message}
        </p>
        {help.suggestion && (
          <p style={{ fontFamily: vt, fontSize: 22, lineHeight: 1.15, color: 'hsl(var(--tx2))', margin: 0 }}>
            ¿Quisiste decir <code className="code-chip">{help.suggestion}</code>?
          </p>
        )}
        <details className="mt-1">
          <summary className="label-mono" style={{ cursor: 'pointer', color: 'hsl(var(--tx3))', width: 'fit-content' }}>
            Ver el mensaje de la compu
          </summary>
          <pre className="whitespace-pre-wrap break-all mt-1" style={{ color: 'hsl(var(--tx2))', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, lineHeight: 1.5 }}>
            {error}
          </pre>
        </details>
      </div>
    )
  }

  if (isCorrect) return <Produced sql={sql} />

  const exp = parseExpected(expected)
  const expWidth = exp[0]?.length ?? 0
  // Si las filas salieron de la consulta de control del jefe, sus columnas son justo las que pide.
  const expColumns = sql.fromVerify && sql.columns.length === expWidth ? sql.columns : guessColumns(exp, [...seedTables, ...sql.changes.map((c) => ({ ...c, rows: c.rows.map((r) => r.cells) }))])

  return (
    <div className="grid gap-4 sm:grid-cols-2 items-start">
      <div className="flex flex-col gap-1.5 min-w-0">
        <span style={{ fontFamily: jersey, fontSize: 17, color: 'hsl(var(--tx2))' }}>Lo que hizo tu código</span>
        <Produced sql={sql} />
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        <span style={{ fontFamily: jersey, fontSize: 17, color: 'hsl(var(--tx2))' }}>Lo que pide el jefe</span>
        <SqlTable label="objetivo" columns={expColumns} rows={exp} />
      </div>
    </div>
  )
}
