'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import ActEmblem from '@/components/game/map/ActEmblem'
import { ACT_MAPS } from '@/lib/game/act-maps'
import { TIER_META, TIER_ORDER } from '@/lib/game/tiers'
import { sfx } from '@/lib/game/architect/sound'
import type { Boss, ChallengeTier } from '@/types'

// JEFES.EXE: una matriz aulas × jefes. Cada celda es una puerta de jefe con
// el lenguaje del mapa (cuadrado dentro de cuadrado + glifo del tema):
// habilitado = interior en tinta, bloqueado = borde punteado tenue. Arriba,
// la placa del jefe señalado (como la placa del inventario); al final de
// cada fila, las dificultades del aula.

export interface JefesRow {
  /** '' = alumnos sin aula (tabla `bosses`); si no, el id del aula. */
  id: string
  label: string
  sub?: string
}

interface Props {
  rows: JefesRow[]
  isEnabled: (rowId: string, bossId: string) => boolean
  onToggle: (rowId: string, boss: Boss) => void
  tierOn: (rowId: string, tier: ChallengeTier) => boolean
  onToggleTier: (rowId: string, tier: ChallengeTier) => void
}

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const ACTS = ACT_MAPS.map((a) => ({ key: a.key, roman: a.roman.replace('ACTO ', ''), title: a.title, bosses: a.bosses }))
const ALL = ACTS.flatMap((a) => a.bosses)
const actStart = new Set(ACTS.map((a) => a.bosses[0]?.id))

export default function JefesWindow({ rows, isEnabled, onToggle, tierOn, onToggleTier }: Props) {
  const [sel, setSel] = useState({ r: 0, c: 0 })
  // La última puerta tocada hace un "sello" corto; las demás quedan quietas.
  const [stamped, setStamped] = useState<string | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const size = rows.length > 1 ? 30 : 36
  const selR = Math.min(sel.r, Math.max(0, rows.length - 1))
  const boss = ALL[sel.c] ?? ALL[0]
  const enabledIn = rows.filter((r) => isEnabled(r.id, boss.id)).length

  const focusDoor = (r: number, c: number) => {
    setSel({ r, c })
    tableRef.current?.querySelector<HTMLElement>(`[data-door="${r}-${c}"]`)?.focus()
  }

  const onKey = (e: KeyboardEvent, r: number, c: number) => {
    const moves: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    const nr = Math.min(rows.length - 1, Math.max(0, r + m[0]))
    const nc = Math.min(ALL.length - 1, Math.max(0, c + m[1]))
    if (nr !== r || nc !== c) { sfx.hover(); focusDoor(nr, nc) }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Placa del jefe señalado */}
      <div className="flex items-center gap-4" style={{ minHeight: 64, padding: '8px 12px', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))' }}>
        <Door boss={boss} on={enabledIn > 0} size={44} />
        <div className="min-w-0 flex-1">
          <div className="label-mono">{boss.title}</div>
          <div style={{ fontFamily: jersey, fontSize: 22, lineHeight: 1, color: 'hsl(var(--tx))' }}>{boss.name}</div>
          <div style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.1, color: 'hsl(var(--tx2))' }}>{boss.topic}</div>
        </div>
        <div className="text-right" style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.1, color: enabledIn > 0 ? 'hsl(var(--tx))' : 'hsl(var(--tx3))' }}>
          {rows.length > 1
            ? <><span className="tabular" style={{ fontFamily: jersey, fontSize: 22 }}>{enabledIn}/{rows.length}</span><br />aulas</>
            : enabledIn > 0 ? 'Habilitado' : 'Bloqueado'}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table ref={tableRef} className="jefes-matrix" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="jefes-rowhead" />
              {ACTS.map((a) => (
                <th key={a.key} colSpan={a.bosses.length} className="jefes-act" scope="colgroup" title={`Acto ${a.roman} · ${a.title}`}>
                  <span className="flex items-center gap-1.5" style={{ whiteSpace: 'nowrap' }}>
                    <ActEmblem actKey={a.key} size={14} color="hsl(var(--tx))" />
                    {/* Los actos cortos (1-2 jefes) no tienen lugar para el nombre: solo el número. */}
                    <span className="label-mono" style={{ color: 'hsl(var(--tx))' }}>{a.bosses.length >= 3 ? `${a.roman} · ${a.title}` : a.roman}</span>
                  </span>
                </th>
              ))}
              {TIER_ORDER.map((t, i) => (
                <th key={t} scope="col" className={`jefes-tierhead${i === 0 ? ' jefes-sep' : ''}`} title={TIER_META[t].desc}>
                  <span className="label-mono">{TIER_META[t].label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={row.id || 'sin-aula'}>
                <th scope="row" className="jefes-rowhead">
                  <div style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1, color: 'hsl(var(--tx))', whiteSpace: 'nowrap' }}>{row.label}</div>
                  {row.sub && <div style={{ fontFamily: vt, fontSize: 16, lineHeight: 1.1, color: 'hsl(var(--tx2))', whiteSpace: 'nowrap' }}>{row.sub}</div>}
                </th>
                {ALL.map((b, c) => {
                  const on = isEnabled(row.id, b.id)
                  const picked = selR === r && sel.c === c
                  const cell = `${r}-${c}`
                  return (
                    <td key={b.id} className={actStart.has(b.id) ? 'jefes-sep' : undefined}>
                      <button
                        type="button"
                        data-door={cell}
                        tabIndex={picked ? 0 : -1}
                        aria-pressed={on}
                        aria-label={`${b.name} en ${row.label}: ${on ? 'habilitado' : 'bloqueado'}`}
                        className={`jefes-door${picked ? ' jefes-door--sel' : ''}`}
                        onPointerEnter={() => setSel({ r, c })}
                        onFocus={() => setSel({ r, c })}
                        onKeyDown={(e) => onKey(e, r, c)}
                        onClick={() => { sfx.toggle(!on); setStamped(cell); onToggle(row.id, b) }}
                      >
                        <Door key={String(on)} boss={b} on={on} size={size} stamp={stamped === cell} />
                      </button>
                    </td>
                  )
                })}
                {TIER_ORDER.map((t, i) => {
                  if (!row.id) return <td key={t} className={i === 0 ? 'jefes-sep' : undefined} />
                  const on = tierOn(row.id, t)
                  return (
                    <td key={t} className={i === 0 ? 'jefes-sep' : undefined} style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        aria-pressed={on}
                        aria-label={`${TIER_META[t].label} en ${row.label}: ${on ? 'habilitada' : 'deshabilitada'}`}
                        title={TIER_META[t].desc}
                        className="jefes-tier"
                        onClick={() => { sfx.toggle(!on); onToggleTier(row.id, t) }}
                      >
                        <span aria-hidden className="jefes-tier-box" data-on={on || undefined} />
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Puerta de jefe del mapa, sin insignias: el estado se lee por tinta invertida. */
export function Door({ boss, on, size, stamp = false }: { boss: Boss; on: boolean; size: number; stamp?: boolean }) {
  const b = Math.max(2, Math.round(size / 16))
  const line = on ? 'hsl(var(--tx))' : 'hsl(var(--tx3))'
  return (
    <span
      className={stamp ? 'jefes-door-face' : undefined}
      aria-hidden
      style={{
        display: 'block', width: size, height: size, padding: b, background: 'hsl(var(--bg))',
        border: `${b}px ${on ? 'solid' : 'dashed'} ${line}`,
      }}
    >
      <span
        style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: on ? 'hsl(var(--tx))' : 'transparent',
          border: `${b}px ${on ? 'solid' : 'dashed'} ${line}`,
        }}
      >
        <BossTopicIcon bossId={boss.id} size={Math.max(10, Math.round(size * 0.42))} color={on ? 'hsl(var(--bg))' : 'hsl(var(--tx3))'} />
      </span>
    </span>
  )
}
