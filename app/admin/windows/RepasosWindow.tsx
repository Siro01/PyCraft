'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import ActEmblem from '@/components/game/map/ActEmblem'
import { ACT_MAPS } from '@/lib/game/act-maps'
import { REPASOS } from '@/lib/game/repasos'
import { sfx } from '@/lib/game/architect/sound'
import { Door } from './JefesWindow'
import type { Boss } from '@/types'

// REPASOS.EXE: la misma matriz que JEFES.EXE, pero de repasos con Rodolfo.
// Una fila por aula, una puerta por repaso (llena = habilitado para toda el
// aula). Debajo, los alumnos del aula para el repaso señalado: ahí se ve
// quién lo terminó y se habilita solo para quien faltó.

type BoolMap = Record<string, Record<string, boolean>>
type ProgressMap = Record<string, Record<string, { beat: number; done: boolean }>>

export interface RepasoRow { id: string; label: string; sub?: string }
interface Alumno { id: string; username: string; aula_id: string | null }

interface Props {
  rows: RepasoRow[]
  alumnos: Alumno[]
  aulaRepasos: BoolMap
  alumnoRepasos: BoolMap
  progress: ProgressMap
  onToggleAula: (aulaId: string, bossId: string) => void
  onToggleAlumno: (a: Alumno, bossId: string) => void
}

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const ACTS = ACT_MAPS
  .map((a) => ({ key: a.key, roman: a.roman.replace('ACTO ', ''), title: a.title, items: REPASOS.filter((r) => a.bosses.some((b) => b.id === r.bossId)).map((r) => ({ r, boss: a.bosses.find((b) => b.id === r.bossId) as Boss })) }))
  .filter((a) => a.items.length > 0)
const ALL = ACTS.flatMap((a) => a.items)
const actStart = new Set(ACTS.map((a) => a.items[0].r.bossId))

export default function RepasosWindow({ rows, alumnos, aulaRepasos, alumnoRepasos, progress, onToggleAula, onToggleAlumno }: Props) {
  const [sel, setSel] = useState({ r: 0, c: 0 })
  const [stamped, setStamped] = useState<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const size = rows.length > 1 ? 30 : 36
  const selR = Math.min(sel.r, Math.max(0, rows.length - 1))
  const item = ALL[sel.c] ?? ALL[0]
  const row = rows[selR]

  if (!row) {
    return (
      <p style={{ fontFamily: vt, fontSize: 19, color: 'hsl(var(--tx2))' }}>
        Los repasos se habilitan por aula. A un alumno sin aula se le habilitan desde su ficha en alumnos.exe.
      </p>
    )
  }

  const forAula = (aulaId: string, bossId: string) => !!aulaRepasos[aulaId]?.[bossId]
  const roster = alumnos.filter((a) => a.aula_id === row.id)
  const sees = (a: Alumno) => forAula(row.id, item.r.bossId) || !!alumnoRepasos[a.id]?.[item.r.bossId]
  const assigned = roster.filter(sees)
  const done = assigned.filter((a) => progress[a.id]?.[item.r.bossId]?.done).length

  const onKey = (e: KeyboardEvent, r: number, c: number) => {
    const moves: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    const nr = Math.min(rows.length - 1, Math.max(0, r + m[0]))
    const nc = Math.min(ALL.length - 1, Math.max(0, c + m[1]))
    if (nr !== r || nc !== c) {
      sfx.hover()
      setSel({ r: nr, c: nc })
      tableRef.current?.querySelector<HTMLElement>(`[data-door="${nr}-${nc}"]`)?.focus()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Placa del repaso señalado */}
      <div className="flex items-center gap-4" style={{ minHeight: 64, padding: '8px 12px', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))' }}>
        <Door boss={item.boss} on={forAula(row.id, item.r.bossId)} size={44} />
        <div className="min-w-0 flex-1">
          <div className="label-mono">Antes del jefe {item.boss.classNumber} · {item.boss.name}</div>
          <div style={{ fontFamily: jersey, fontSize: 22, lineHeight: 1, color: 'hsl(var(--tx))' }}>{item.r.title}</div>
          <div className="sys-sub">{item.r.topics.join(' · ')} · {item.r.beats.length} pasos</div>
        </div>
        <div className="text-right" style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.1, color: assigned.length ? 'hsl(var(--tx))' : 'hsl(var(--tx3))' }}>
          <span className="tabular" style={{ fontFamily: jersey, fontSize: 22 }}>{done}/{assigned.length}</span><br />terminaron
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table ref={tableRef} className="jefes-matrix" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="jefes-rowhead" />
              {ACTS.map((a) => (
                <th key={a.key} colSpan={a.items.length} className="jefes-act" scope="colgroup" title={`Acto ${a.roman} · ${a.title}`}>
                  <span className="flex items-center gap-1.5" style={{ whiteSpace: 'nowrap' }}>
                    <ActEmblem actKey={a.key} size={14} color="hsl(var(--tx))" />
                    <span className="label-mono" style={{ color: 'hsl(var(--tx))' }}>{a.items.length >= 3 ? `${a.roman} · ${a.title}` : a.roman}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((rw, r) => (
              <tr key={rw.id}>
                <th scope="row" className="jefes-rowhead">
                  <div style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1, color: 'hsl(var(--tx))', whiteSpace: 'nowrap' }}>{rw.label}</div>
                  {rw.sub && <div className="sys-sub" style={{ whiteSpace: 'nowrap' }}>{rw.sub}</div>}
                </th>
                {ALL.map(({ r: rep, boss }, c) => {
                  const on = forAula(rw.id, rep.bossId)
                  const picked = selR === r && sel.c === c
                  const cell = `${r}-${c}`
                  return (
                    <td key={rep.bossId} className={actStart.has(rep.bossId) ? 'jefes-sep' : undefined}>
                      <button
                        type="button"
                        data-door={cell}
                        tabIndex={picked ? 0 : -1}
                        aria-pressed={on}
                        aria-label={`${rep.title} en ${rw.label}: ${on ? 'habilitado para toda el aula' : 'no habilitado'}`}
                        className={`jefes-door${picked ? ' jefes-door--sel' : ''}`}
                        onPointerEnter={() => setSel({ r, c })}
                        onFocus={() => setSel({ r, c })}
                        onKeyDown={(e) => onKey(e, r, c)}
                        onClick={() => { sfx.toggle(!on); setStamped(cell); onToggleAula(rw.id, rep.bossId) }}
                      >
                        <Door key={String(on)} boss={boss} on={on} size={size} stamp={stamped === cell} />
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alumnos del aula señalada para el repaso señalado */}
      <section className="flex flex-col gap-2" aria-label={`Alumnos de ${row.label}`}>
        <h3 className="label-mono" style={{ color: 'hsl(var(--tx))' }}>{row.label}</h3>
        {roster.length === 0 ? (
          <p className="sys-sub">No hay alumnos en esta aula.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {roster.map((a) => {
              const byAula = forAula(row.id, item.r.bossId)
              const own = !!alumnoRepasos[a.id]?.[item.r.bossId]
              const p = progress[a.id]?.[item.r.bossId]
              const state = byAula ? 'aula' : own ? 'on' : 'off'
              const status = p?.done ? '✓' : p && p.beat > 0 ? `${p.beat + 1}/${item.r.beats.length}` : null
              return (
                <button
                  key={a.id}
                  type="button"
                  className="rep-chip"
                  data-state={state}
                  disabled={byAula}
                  aria-pressed={byAula || own}
                  title={byAula ? 'Lo tiene por el aula' : own ? 'Habilitado solo para este alumno — clic para quitarlo' : 'Clic para habilitárselo solo a este alumno'}
                  onClick={() => { sfx.toggle(!own); onToggleAlumno(a, item.r.bossId) }}
                >
                  {a.username}
                  {status && <small>{status === '✓' ? 'terminó' : `paso ${status}`}</small>}
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
