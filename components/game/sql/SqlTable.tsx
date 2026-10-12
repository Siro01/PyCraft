'use client'

import type { DiffRow, RowState } from '@/lib/game/executor/sql-runner'
import { IconDatabase } from '@/components/ui/PixelIcons'

// Una tabla de la base de datos como la ve un chico: grilla con encabezados,
// y — si su código la cambió — cada fila marcada con lo que le pasó.
// Sin colores de estado: lo nuevo se tiñe de acento, lo cambiado se invierte
// (tinta sobre papel) y lo borrado se tacha, así funciona en los 3 temas.

const STATE_LABEL: Record<Exclude<RowState, 'same'>, string> = {
  new: 'Nueva',
  changed: 'Cambió',
  deleted: 'Borrada',
}

interface SqlTableProps {
  /** Nombre que va en la pestaña (nombre de la tabla, o "resultado"). */
  label: string
  /** Pestaña con el ícono de base de datos (tablas reales, no resultados). */
  isTable?: boolean
  /** La tabla la acaba de crear el alumno. */
  created?: boolean
  /** Sin columnas = grilla sin fila de encabezado. */
  columns: string[]
  rows: (string[] | DiffRow)[]
  /** Alto máximo del cuerpo antes de scrollear. */
  maxHeight?: number
}

const isNum = (v: string) => v !== '' && v !== 'NULL' && !Number.isNaN(Number(v))

export default function SqlTable({ label, isTable = false, created = false, columns, rows, maxHeight = 196 }: SqlTableProps) {
  const norm: DiffRow[] = rows.map((r) => (Array.isArray(r) ? { cells: r, state: 'same' } : r))
  const width = Math.max(columns.length, ...norm.map((r) => r.cells.length), 1)
  const hasStates = norm.some((r) => r.state !== 'same')
  const numeric = Array.from({ length: width }, (_, ci) => norm.length > 0 && norm.every((r) => isNum(r.cells[ci] ?? '')))

  return (
    <figure className="sqlt">
      <figcaption className="sqlt-tab">
        {isTable && <IconDatabase size={13} color="currentColor" />}
        <span>{label}</span>
        {created && <span className="sqlt-tab-note">tabla nueva</span>}
      </figcaption>
      <div className="sqlt-scroll" style={{ maxHeight }}>
        <table>
          {columns.length > 0 && (
            <thead>
              <tr>
                {columns.map((c, ci) => (
                  <th key={ci} style={{ textAlign: numeric[ci] ? 'right' : 'left' }}>{c}</th>
                ))}
                {hasStates && <th aria-label="Qué pasó" />}
              </tr>
            </thead>
          )}
          <tbody>
            {norm.length === 0 ? (
              <tr>
                <td className="sqlt-empty" colSpan={width + (hasStates ? 1 : 0)}>Sin filas todavía</td>
              </tr>
            ) : (
              norm.map((r, ri) => (
                <tr key={ri} className={r.state === 'same' ? undefined : `sqlt-row sqlt-row--${r.state}`}>
                  {Array.from({ length: width }, (_, ci) => (
                    <td
                      key={ci}
                      className={r.changedCols?.includes(ci) ? 'sqlt-cell--changed' : undefined}
                      style={{ textAlign: numeric[ci] ? 'right' : 'left' }}
                    >
                      {r.cells[ci] ?? ''}
                    </td>
                  ))}
                  {hasStates && (
                    <td className="sqlt-state">
                      {r.state !== 'same' && <span className={`sqlt-chip sqlt-chip--${r.state}`}>{STATE_LABEL[r.state]}</span>}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
