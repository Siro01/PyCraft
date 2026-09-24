'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Win from '@/components/ui/Win'
import { PixelBitmap, ICON_PIG, ICON_ARROW_RIGHT } from '@/components/game/architect/desktop/PixelBitmap'
import { sfx } from '@/lib/game/architect/sound'
import type { Lesson, LessonLang, LessonTable } from '@/lib/game/lessons'

// Apuntes de Rodolfo: una ventana 1-bit con el código de ejemplo, las líneas
// importantes marcadas y un botón para ver qué imprime cada paso. Se abre desde
// el cerdito (vuela desde su esquina) y se puede volver a abrir cuando se quiera.

const vt = 'var(--font-vt323), monospace'
const jersey = 'var(--font-jersey), monospace'
const monoLabel = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'hsl(var(--tx3))' }

// ── Colores de sintaxis mínimos, por tokens ──────────────────────────────────

const PY_KW = /^(def|return|if|elif|else|for|while|in|import|not|is|None|True|False|and|or|print|input|range|type|break|continue)$/
const SQL_KW = /^(SELECT|FROM|WHERE|ORDER|BY|DESC|ASC|LIMIT|INSERT|INTO|VALUES|CREATE|TABLE|UPDATE|SET|DELETE|GROUP|COUNT|SUM|AVG|PRIMARY|KEY|INTEGER|TEXT|AND|OR)$/i

function tokenize(line: string, lang: LessonLang): { t: string; c?: string }[] {
  const out: { t: string; c?: string }[] = []
  const re = /(#.*$)|("[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z_0-9]*)|(\s+)|(.)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    if (m[1]) out.push({ t: m[1], c: 'hsl(var(--tx3))' })
    else if (m[2]) out.push({ t: m[2], c: 'hsl(var(--python))' })
    else if (m[3]) out.push({ t: m[3], c: 'hsl(var(--tx))' })
    else if (m[4]) {
      const kw = lang === 'sql' ? SQL_KW.test(m[4]) : PY_KW.test(m[4])
      out.push({ t: m[4], c: kw ? 'hsl(var(--accent))' : undefined })
    } else out.push({ t: m[0] })
  }
  return out
}

function CodeBlock({ code, lang, highlight }: { code: string; lang: LessonLang; highlight?: number[] }) {
  const lines = code.split('\n')
  return (
    <div style={{ border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))', overflowX: 'auto' }} aria-label="Código de ejemplo">
      {lines.map((ln, i) => {
        const on = highlight?.includes(i + 1)
        return (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'stretch', fontFamily: vt, fontSize: 21, lineHeight: 1.3,
              background: on ? 'hsl(var(--accent) / 0.16)' : 'transparent',
            }}
          >
            <span style={{ width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-hidden="true">
              {on && <PixelBitmap rows={ICON_ARROW_RIGHT} scale={2} ink="hsl(var(--accent))" />}
            </span>
            <span style={{ width: 22, textAlign: 'right', paddingRight: 8, color: 'hsl(var(--tx3))', flexShrink: 0, userSelect: 'none' }} aria-hidden="true">{i + 1}</span>
            <code style={{ whiteSpace: 'pre', color: 'hsl(var(--tx2))', paddingRight: 12 }}>
              {ln === '' ? ' ' : tokenize(ln, lang).map((tk, j) => (
                <span key={j} style={tk.c ? { color: tk.c, fontWeight: tk.c === 'hsl(var(--accent))' ? 700 : undefined } : undefined}>{tk.t}</span>
              ))}
            </code>
          </div>
        )
      })}
    </div>
  )
}

function MiniTable({ table, caption, maxRows }: { table: LessonTable; caption?: string; maxRows?: number }) {
  const rows = maxRows === undefined ? table.rows : table.rows.slice(0, maxRows)
  return (
    <div style={{ border: '2px solid hsl(var(--tx))', overflowX: 'auto' }}>
      {caption && <div style={{ ...monoLabel, padding: '3px 8px', borderBottom: '1px solid hsl(var(--border2))' }}>{caption}</div>}
      <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: vt, fontSize: 19 }}>
        <thead>
          <tr>
            {table.cols.map(c => (
              <th key={c} style={{ padding: '2px 10px', textAlign: 'left', fontWeight: 400, background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', letterSpacing: '0.04em' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={table.cols.length} style={{ padding: '4px 10px', color: 'hsl(var(--tx3))' }}>(vacía)</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              {r.map((cell, j) => <td key={j} style={{ padding: '2px 10px', color: 'hsl(var(--tx))' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface Props {
  lesson: Lesson
  bossName: string
  onClose: () => void
}

export default function LessonWindow({ lesson, bossName, onClose }: Props) {
  const [idx, setIdx] = useState(0)
  const [ran, setRan] = useState(0)          // cuántas líneas de salida ya se mostraron
  const [running, setRunning] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [closing, setClosing] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const nextRef = useRef<HTMLButtonElement>(null)

  const step = lesson.steps[idx]
  const last = idx === lesson.steps.length - 1
  const outLines = step.output ?? []
  const finished = !running && ran >= outLines.length && (ran > 0 || showTable)
  const hasResult = outLines.length > 0 || !!step.table

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const reset = useCallback(() => {
    clearTimers()
    setRan(0)
    setRunning(false)
    setShowTable(false)
  }, [])

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= lesson.steps.length) return
    reset()
    setIdx(i)
    sfx.select()
  }, [lesson.steps.length, reset])

  const run = useCallback(() => {
    if (!hasResult || running) return
    reset()
    setRunning(true)
    sfx.attack()
    let t = 260
    outLines.forEach((_, i) => {
      timers.current.push(setTimeout(() => { setRan(i + 1); sfx.type('machine') }, t))
      t += 380
    })
    timers.current.push(setTimeout(() => {
      if (step.table) { setShowTable(true); sfx.confirm() }
      setRunning(false)
    }, t))
  }, [hasResult, running, reset, outLines, step.table])

  const close = useCallback(() => {
    if (closing) return
    setClosing(true)
    sfx.select()
    setTimeout(onClose, 240)
  }, [closing, onClose])

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    nextRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close() }
      else if (e.key === 'ArrowRight') goTo(idx + 1)
      else if (e.key === 'ArrowLeft') goTo(idx - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, goTo, close])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Apuntes: ${bossName}`}
      style={{ position: 'fixed', inset: 0, zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
    >
      <div
        onClick={close}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'hsl(var(--bg) / 0.72)', opacity: closing ? 0 : 1, transition: 'opacity 0.24s' }}
      />

      <div
        className={closing ? 'lesson-out' : 'lesson-in'}
        style={{ position: 'relative', width: 'min(880px, 100%)', maxHeight: 'calc(100vh - 24px)', display: 'flex', flexDirection: 'column' }}
      >
        <Win
          title={`APUNTES · ${lesson.file}`}
          active
          onClose={close}
          right={<span style={{ ...monoLabel, color: 'hsl(var(--bg))', marginRight: 6 }}>Paso {idx + 1}/{lesson.steps.length}</span>}
          style={{ maxHeight: 'calc(100vh - 24px)' }}
          bodyStyle={{ overflowY: 'auto', flex: 1 }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {/* Pasos */}
            <nav
              aria-label="Pasos"
              style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 12, borderRight: '2px solid hsl(var(--border2))', flex: '0 0 200px', minWidth: 0 }}
              className="lesson-steps"
            >
              <div style={{ ...monoLabel, marginBottom: 4 }}>{bossName}</div>
              {lesson.steps.map((s, i) => {
                const done = i < idx
                const active = i === idx
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={active ? 'step' : undefined}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left', cursor: 'pointer', padding: '4px 6px',
                      background: active ? 'hsl(var(--tx))' : 'transparent',
                      color: active ? 'hsl(var(--bg))' : done ? 'hsl(var(--accent))' : 'hsl(var(--tx2))',
                      border: `1px solid ${active ? 'hsl(var(--tx))' : 'hsl(var(--border2))'}`,
                      fontFamily: vt, fontSize: 17, lineHeight: 1.05,
                    }}
                  >
                    <span style={{ fontFamily: jersey, fontSize: 17, minWidth: 14 }}>{i + 1}</span>
                    <span>{s.title}</span>
                  </button>
                )
              })}
            </nav>

            {/* Contenido del paso */}
            <div style={{ flex: '1 1 380px', minWidth: 0, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <PixelBitmap rows={ICON_PIG} scale={4} title="Rodolfo" />
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontFamily: jersey, fontSize: 26, lineHeight: 1.05, color: 'hsl(var(--tx))', margin: 0, letterSpacing: '0.02em' }}>{step.title}</h2>
                  <p style={{ fontFamily: vt, fontSize: 21, lineHeight: 1.22, color: 'hsl(var(--tx2))', margin: '4px 0 0', maxWidth: '62ch' }}>{step.text}</p>
                </div>
              </div>

              {lesson.context && (
                <MiniTable table={lesson.context.table} caption={lesson.context.label} />
              )}

              <CodeBlock code={step.code} lang={step.lang} highlight={step.highlight} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {hasResult && (
                  <button
                    type="button"
                    onClick={run}
                    disabled={running}
                    className="cta-btn cta-btn--primary"
                    style={{ fontSize: 13, padding: '9px 16px', 
                      
                      cursor: running ? 'wait' : 'pointer', opacity: running ? 0.6 : 1,
                    }}
                  >
                    {finished ? 'Ver de nuevo' : running ? 'Ejecutando…' : 'Ver qué pasa'}
                  </button>
                )}
                <span style={{ ...monoLabel, letterSpacing: '0.06em', textTransform: 'none' }}>
                  Las líneas marcadas son las importantes
                </span>
              </div>

              {hasResult && (
                <div
                  aria-live="polite"
                  style={{ border: '2px solid hsl(var(--border2))', background: 'hsl(var(--surface2))', minHeight: 58, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div style={monoLabel}>Salida</div>
                  {ran === 0 && !showTable && !running && (
                    <div style={{ fontFamily: vt, fontSize: 19, color: 'hsl(var(--tx3))' }}>Tocá "Ver qué pasa" para ejecutar este paso.</div>
                  )}
                  {outLines.slice(0, ran).map((o, i) => (
                    <div key={i} className="lesson-line" style={{ fontFamily: vt, fontSize: 21, color: 'hsl(var(--tx))', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      <span style={{ color: 'hsl(var(--accent))' }}>&gt; </span>{o}
                    </div>
                  ))}
                  {running && <span className="animate-caret" style={{ color: 'hsl(var(--accent))', fontFamily: vt, fontSize: 21 }}>█</span>}
                  {showTable && step.table && (
                    <div className="lesson-line"><MiniTable table={step.table} /></div>
                  )}
                </div>
              )}

              {step.warn && finished && (
                <div role="alert" className="lesson-line" style={{ border: '2px solid hsl(var(--danger))', color: 'hsl(var(--danger))', padding: '6px 10px', fontFamily: vt, fontSize: 20, lineHeight: 1.2 }}>
                  ¡Ojo! {step.warn}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => goTo(idx - 1)}
                  disabled={idx === 0}
                  style={{ fontFamily: jersey, fontSize: 19, padding: '5px 16px', cursor: idx === 0 ? 'default' : 'pointer', background: 'transparent', color: 'hsl(var(--tx))', border: '2px solid hsl(var(--tx))', opacity: idx === 0 ? 0.35 : 1 }}
                >
                  Anterior
                </button>
                {last ? (
                  <button ref={nextRef} type="button" onClick={close} className="cta-btn cta-btn--primary" style={{ fontSize: 13, padding: '9px 16px',  cursor: 'pointer', color: 'hsl(var(--bg))' }}>
                    Volver al combate
                  </button>
                ) : (
                  <button ref={nextRef} type="button" onClick={() => goTo(idx + 1)} style={{ fontFamily: jersey, fontSize: 19, padding: '5px 16px', cursor: 'pointer', background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))' }}>
                    Siguiente
                  </button>
                )}
              </div>
            </div>
          </div>
        </Win>
      </div>
    </div>
  )
}
