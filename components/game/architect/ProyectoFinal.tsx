'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { SqlJsStatic, Database } from 'sql.js'
import { sfx } from '@/lib/game/architect/sound'
import CrashTransition from '@/components/landing/CrashTransition'

// ── sql.js lazy load ─────────────────────────────────────────────────────────

let _sql: SqlJsStatic | null = null
let _loading: Promise<SqlJsStatic> | null = null

async function getSql(): Promise<SqlJsStatic> {
  if (_sql) return _sql
  if (_loading) return _loading
  _loading = (async () => {
    const mod = await import('sql.js')
    const init = (mod as unknown as { default: (o: unknown) => Promise<SqlJsStatic> }).default
    _sql = await init({ locateFile: () => '/sql-wasm.wasm' })
    return _sql
  })()
  return _loading
}

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS cofre (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre   TEXT    NOT NULL,
  cantidad INTEGER NOT NULL DEFAULT 1,
  material TEXT
);`

// ── Missions ─────────────────────────────────────────────────────────────────

type MissionCheck = 'pre' | 'insert' | 'select' | 'update' | 'delete'

interface Mission {
  id: string
  label: string
  instruction: string
  hint?: string
  defaultCode: string
  check: MissionCheck
}

const MISSIONS: Mission[] = [
  {
    id: 'create',
    label: 'Crear la tabla',
    instruction: 'El Arquitecto ya armó la estructura. Esta es la tabla que vas a usar:',
    defaultCode:
      'CREATE TABLE IF NOT EXISTS cofre (\n' +
      '  id       INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
      '  nombre   TEXT    NOT NULL,\n' +
      '  cantidad INTEGER NOT NULL DEFAULT 1,\n' +
      '  material TEXT\n' +
      ');',
    check: 'pre',
  },
  {
    id: 'insert',
    label: 'Cargar ítems',
    instruction: 'Llenás el cofre con ítems de Minecraft. Ejecutá el INSERT al menos dos veces con ítems distintos.',
    hint: 'Podés cambiar los valores y ejecutar de nuevo.',
    defaultCode: "INSERT INTO cofre (nombre, cantidad, material)\nVALUES ('Espada de diamante', 5, 'diamante');",
    check: 'insert',
  },
  {
    id: 'select',
    label: 'Consultar inventario',
    instruction: '¿Qué tiene el cofre? Mostrá todos los ítems con SELECT.',
    defaultCode: 'SELECT * FROM cofre;',
    check: 'select',
  },
  {
    id: 'update',
    label: 'Actualizar cantidad',
    instruction: 'Encontraste más materiales. Actualizá la cantidad de un ítem con UPDATE.',
    hint: 'Siempre usá WHERE o vas a modificar todos los ítems a la vez.',
    defaultCode: 'UPDATE cofre\nSET cantidad = 10\nWHERE id = 1;',
    check: 'update',
  },
  {
    id: 'delete',
    label: 'Eliminar un ítem',
    instruction: 'Usaste todo el material. Borrá un ítem del cofre con DELETE.',
    hint: 'Sin WHERE, DELETE borra todo. Siempre filtrá.',
    defaultCode: 'DELETE FROM cofre WHERE id = 1;',
    check: 'delete',
  },
]

// ── ASCII Crash Overlay ───────────────────────────────────────────────────────

const CRASH_CHARS = '░▒▓█│─┼@#%^&*+=[]{};:,.<>?/~'

function CrashOverlay({ intensity }: { intensity: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const intRef = useRef(intensity)
  intRef.current = intensity

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const CELL = 14
    let lastDraw = 0

    const draw = (now: number) => {
      const k = intRef.current
      if (k <= 0) { ctx.clearRect(0, 0, canvas.width, canvas.height); return }
      const fps = k > 0.6 ? 10 : 20 // ms between frames
      if (now - lastDraw < fps) return
      lastDraw = now
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = `${CELL}px monospace`
      ctx.fillStyle = `rgba(191,233,255,${(k * 0.75).toFixed(2)})`
      const cols = Math.ceil(canvas.width / CELL)
      const rows = Math.ceil(canvas.height / CELL)
      const density = k * 0.55
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > density) continue
          ctx.fillText(
            CRASH_CHARS[Math.floor(Math.random() * CRASH_CHARS.length)],
            c * CELL,
            (r + 1) * CELL,
          )
        }
      }
    }

    const loop = (now: number) => {
      draw(now)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  if (intensity <= 0) return null
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 40,
        opacity: Math.min(1, intensity * 1.1),
      }}
    />
  )
}

// ── Minecraft Chest ───────────────────────────────────────────────────────────

function MinecraftChest({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32" width={120} height={120}
      style={{ imageRendering: 'pixelated', display: 'block', transition: 'filter 0.4s' }}
      aria-label={open ? 'Cofre abierto' : 'Cofre cerrado'}
    >
      {/* ── Body ── */}
      <rect x="1" y="17" width="30" height="14" fill="#5A3820" />
      <rect x="2" y="18" width="28" height="12" fill="#9B6035" />
      <rect x="2" y="18" width="28" height="2"  fill="#7C4E2D" />
      {/* Gold latch body */}
      <rect x="13" y="22" width="6" height="5" fill="#D4A017" />
      <rect x="14" y="23" width="4" height="3" fill="#F5C518" />

      {!open ? (
        /* ── Closed lid ── */
        <g>
          <rect x="1"  y="7"  width="30" height="11" fill="#5A3820" />
          <rect x="2"  y="8"  width="28" height="9"  fill="#9B6035" />
          <rect x="2"  y="8"  width="28" height="2"  fill="#B07840" />
          {/* Latch lid */}
          <rect x="13" y="14" width="6" height="4" fill="#D4A017" />
          <rect x="14" y="15" width="4" height="2" fill="#F5C518" />
        </g>
      ) : (
        /* ── Open lid (flipped back) ── */
        <g>
          <rect x="1" y="1" width="30" height="8" fill="#5A3820" />
          <rect x="2" y="2" width="28" height="6" fill="#9B6035" />
          <rect x="2" y="7" width="28" height="1" fill="#B07840" />
          {/* Dark inside */}
          <rect x="2" y="18" width="28" height="12" fill="#1E0D03" />
          <rect x="3" y="19" width="26" height="10" fill="#2D1508" />
        </g>
      )}
    </svg>
  )
}

// ── Segmented HP Bar ──────────────────────────────────────────────────────────

const ICE = '#BFE9FF'

function SegmentedHP({ total, remaining, flash }: { total: number; remaining: number; flash: boolean }) {
  return (
    <div className={flash ? 'animate-damage-flash' : ''} style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: 34, height: 16,
            background: i < remaining ? ICE : '#111820',
            border: `1px solid ${ICE}33`,
            boxShadow: i < remaining ? `0 0 5px ${ICE}66` : 'none',
            transition: 'background 0.35s, box-shadow 0.35s',
          }}
        />
      ))}
    </div>
  )
}

// ── Inline result table ───────────────────────────────────────────────────────

function ResultTable({ cols, rows }: { cols: string[]; rows: (string | number | null)[][] }) {
  if (rows.length === 0) return null
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #1a2030' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'var(--font-vt323), monospace', fontSize: 18 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ padding: '4px 10px', color: ICE, textAlign: 'left', borderBottom: `1px solid ${ICE}22`, letterSpacing: '0.05em' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #111' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '4px 10px', color: '#ccc' }}>
                  {cell ?? 'NULL'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProyectoFinal() {
  const dbRef   = useRef<Database | null>(null)
  const [ready, setReady] = useState(false)

  // Mission progress
  const [mIdx, setMIdx] = useState(1) // start at INSERT (0=CREATE pre-done)
  const [completed, setCompleted] = useState<Set<string>>(new Set(['create']))
  const [code, setCode] = useState(MISSIONS[1].defaultCode)

  // Execution
  const [running, setRunning] = useState(false)
  const [resultCols, setResultCols] = useState<string[]>([])
  const [resultRows, setResultRows] = useState<(string | number | null)[][]>([])
  const [resultError, setResultError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  // UI state
  const [chestOpen, setChestOpen] = useState(false)
  const [inventoryRows, setInventoryRows] = useState<(string | number | null)[][]>([])
  const [flash, setFlash] = useState(false)
  const [allDone, setAllDone] = useState(false)
  const [crash, setCrash] = useState(false)

  const intensity = (completed.size - 1) / (MISSIONS.length - 1) // 0 when only create done, 1 when all done
  const remaining = MISSIONS.length - completed.size

  // ── Load sql.js ──────────────────────────────────────────────────────────────
  useEffect(() => {
    getSql().then(SQL => {
      const db = new SQL.Database()
      db.run(INIT_SQL)
      dbRef.current = db
      setReady(true)
    })
  }, [])

  // ── Refresh live inventory ────────────────────────────────────────────────────
  const refreshInventory = useCallback(() => {
    const db = dbRef.current
    if (!db) return
    try {
      const res = db.exec('SELECT id, nombre, cantidad, material FROM cofre ORDER BY id')
      setInventoryRows((res[0]?.values ?? []) as (string | number | null)[][])
    } catch {
      setInventoryRows([])
    }
  }, [])

  // ── Mission completion ────────────────────────────────────────────────────────
  const triggerFlash = useCallback(() => {
    setFlash(true)
    setTimeout(() => setFlash(false), 500)
  }, [])

  const advance = useCallback((id: string, nextId: string | null) => {
    setCompleted(prev => {
      const next = new Set(prev)
      next.add(id)
      if (next.size === MISSIONS.length) setAllDone(true)
      return next
    })
    triggerFlash()
    try { sfx.jingle() } catch {}
    if (nextId) {
      const nextIdx = MISSIONS.findIndex(m => m.id === nextId)
      if (nextIdx !== -1) {
        setMIdx(nextIdx)
        setCode(MISSIONS[nextIdx].defaultCode)
      }
    }
  }, [triggerFlash])

  // ── Execute SQL ───────────────────────────────────────────────────────────────
  const execute = useCallback(async () => {
    const db = dbRef.current
    if (!db || !ready || running) return
    setRunning(true)
    setFeedback(null)
    setResultRows([])
    setResultCols([])
    setResultError(null)

    const sql = code.trim()
    const verb = sql.toUpperCase().split(/\s/)[0]
    const mission = MISSIONS[mIdx]

    try {
      let cols: string[] = []
      let rows: (string | number | null)[][] = []
      let modified = 0

      if (verb === 'SELECT') {
        const res = db.exec(sql)
        cols  = res[0]?.columns ?? []
        rows  = (res[0]?.values ?? []) as (string | number | null)[][]
      } else {
        db.run(sql)
        modified = db.getRowsModified()
      }

      setResultCols(cols)
      setResultRows(rows)
      refreshInventory()

      if (!completed.has(mission.id)) {
        if (mission.check === 'insert') {
          const cnt = Number(db.exec('SELECT COUNT(*) FROM cofre')[0]?.values[0]?.[0] ?? 0)
          if (cnt >= 2) {
            setChestOpen(true)
            setFeedback({ ok: true, msg: `¡Perfecto! Cargaste ${cnt} ítems al cofre.` })
            advance('insert', 'select')
          } else {
            setFeedback({ ok: false, msg: `Solo hay ${cnt} ítem. Ejecutá de nuevo con otro ítem.` })
          }
        } else if (mission.check === 'select') {
          setFeedback({ ok: true, msg: `¡Bien! Consultaste el inventario: ${rows.length} ítem(s).` })
          advance('select', 'update')
        } else if (mission.check === 'update') {
          if (modified >= 1) {
            setFeedback({ ok: true, msg: `¡Actualizado! Modificaste ${modified} fila(s).` })
            advance('update', 'delete')
          } else {
            setFeedback({ ok: false, msg: 'No se modificó nada. ¿El WHERE coincide con algún id del cofre?' })
          }
        } else if (mission.check === 'delete') {
          if (modified >= 1) {
            setFeedback({ ok: true, msg: `¡Eliminado! Borraste ${modified} fila(s).` })
            advance('delete', null)
          } else {
            setFeedback({ ok: false, msg: 'No se borró nada. ¿El id existe en el cofre?' })
          }
        }
      } else {
        setFeedback({ ok: true, msg: verb === 'SELECT' ? `${rows.length} fila(s) encontrada(s).` : `${modified} fila(s) afectada(s).` })
      }
    } catch (err) {
      const msg = (err as Error).message
      setResultError(msg)
      setFeedback({ ok: false, msg: 'Error en la consulta. Revisá la sintaxis.' })
    }

    setRunning(false)
  }, [code, mIdx, ready, running, completed, advance, refreshInventory])

  // ── Export .sql ───────────────────────────────────────────────────────────────
  const exportSQL = useCallback(() => {
    const db = dbRef.current
    if (!db) return
    try {
      const rows = (db.exec('SELECT id, nombre, cantidad, material FROM cofre ORDER BY id')[0]?.values ?? []) as (string | number | null)[][]
      const date = new Date().toLocaleDateString('es-AR')
      let out = `-- Inventario Minecraft · PyCraft BOSSRUSH\n-- Exportado el ${date}\n\n`
      out += `CREATE TABLE IF NOT EXISTS cofre (\n`
      out += `  id       INTEGER PRIMARY KEY AUTOINCREMENT,\n`
      out += `  nombre   TEXT    NOT NULL,\n`
      out += `  cantidad INTEGER NOT NULL DEFAULT 1,\n`
      out += `  material TEXT\n`
      out += `);\n\n`
      for (const row of rows) {
        const nombre = String(row[1] ?? '').replace(/'/g, "''")
        const cantidad = Number(row[2] ?? 1)
        const mat = row[3] != null ? `'${String(row[3]).replace(/'/g, "''")}'` : 'NULL'
        out += `INSERT INTO cofre (nombre, cantidad, material) VALUES ('${nombre}', ${cantidad}, ${mat});\n`
      }
      const blob = new Blob([out], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'mi_inventario.sql'; a.click()
      URL.revokeObjectURL(url)
      try { sfx.jingle() } catch {}
    } catch {}
  }, [])

  // ── Crash transition to finale ────────────────────────────────────────────────
  if (crash) return <CrashTransition href="/finale" />

  const mission = MISSIONS[mIdx]
  const glitch = intensity > 0.3 ? `hue-rotate(${(intensity * 22).toFixed(0)}deg)` : undefined

  return (
    <main style={{ minHeight: '100vh', background: '#04060a', color: '#e0e0e0', position: 'relative' }}>

      <CrashOverlay intensity={intensity * 0.8} />

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 10, filter: glitch }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#445566', letterSpacing: '0.18em' }}>
              EL ARQUITECTO
            </span>
            <SegmentedHP total={MISSIONS.length} remaining={remaining} flash={flash} />
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#445566' }}>
              {remaining}/{MISSIONS.length}
            </span>
          </div>
          <div style={{
            fontFamily: 'var(--font-jersey), monospace',
            fontSize: allDone ? 13 : 10,
            letterSpacing: '0.18em',
            color: allDone ? ICE : '#33445588',
            textShadow: allDone ? `0 0 12px ${ICE}66` : 'none',
            transition: 'color 0.4s',
          }}>
            {allDone ? '⚠  SISTEMA COMPROMETIDO' : 'PROYECTO FINAL · INVENTARIO MINECRAFT'}
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '168px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Left: chest + checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <MinecraftChest open={chestOpen} />
            <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#445' }}>
              {chestOpen ? 'ABIERTO' : 'CERRADO'}
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
              {MISSIONS.map((m, i) => {
                const done   = completed.has(m.id)
                const active = i === mIdx && !allDone
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex', gap: 6, alignItems: 'center',
                      fontFamily: 'var(--font-vt323), monospace', fontSize: 16,
                      color: done ? ICE : active ? '#fff' : '#334',
                    }}
                  >
                    <span style={{ width: 14 }}>{done ? '✓' : active ? '▶' : '○'}</span>
                    <span>{m.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Live inventory */}
            {inventoryRows.length > 0 && (
              <div style={{ width: '100%', marginTop: 12 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#33445566', letterSpacing: '0.12em', marginBottom: 4 }}>
                  COFRE
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'var(--font-vt323), monospace', fontSize: 14 }}>
                    <thead>
                      <tr>
                        {['id','nombre','cant.'].map(h => (
                          <th key={h} style={{ padding: '2px 6px', color: ICE, textAlign: 'left', borderBottom: `1px solid ${ICE}22`, fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryRows.map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding: '2px 6px', color: '#889' }}>{row[0]}</td>
                          <td style={{ padding: '2px 6px', color: '#ccc', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[1]}</td>
                          <td style={{ padding: '2px 6px', color: '#ccc' }}>{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right: mission / finale panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {!allDone ? (
              <>
                {/* Mission card */}
                <div style={{ border: `2px solid ${ICE}22`, padding: '12px 14px', background: '#070b12' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 10, color: ICE, letterSpacing: '0.18em', marginBottom: 5 }}>
                    MISIÓN {mIdx + 1} / {MISSIONS.length} · {mission.label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: '#e0e0e0', lineHeight: 1.3 }}>
                    {mission.instruction}
                  </div>
                  {mission.hint && (
                    <div style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 16, color: '#556', marginTop: 5 }}>
                      💡 {mission.hint}
                    </div>
                  )}
                </div>

                {/* CREATE: show code read-only */}
                {mission.check === 'pre' && (
                  <pre style={{
                    fontFamily: 'var(--font-vt323), "Courier New", monospace', fontSize: 18,
                    padding: '10px 12px', background: '#060a10', color: '#a8c8e8',
                    border: `2px solid ${ICE}22`, margin: 0, overflowX: 'auto',
                  }}>
                    {mission.defaultCode}
                  </pre>
                )}

                {/* Other missions: SQL editor */}
                {mission.check !== 'pre' && (
                  <>
                    <textarea
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Tab') {
                          e.preventDefault()
                          const el = e.currentTarget
                          const s = el.selectionStart
                          const end = el.selectionEnd
                          setCode(c => c.slice(0, s) + '  ' + c.slice(end))
                          setTimeout(() => { el.selectionStart = el.selectionEnd = s + 2 })
                        }
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault(); void execute()
                        }
                      }}
                      spellCheck={false}
                      rows={4}
                      aria-label="Editor SQL"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#060a10', color: '#a8e6cf',
                        border: `2px solid ${ICE}22`,
                        fontFamily: 'var(--font-vt323), "Courier New", monospace',
                        fontSize: 20, padding: '10px 12px', outline: 'none',
                        resize: 'vertical', lineHeight: 1.4,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button
                        onClick={() => void execute()}
                        disabled={running || !ready}
                        style={{
                          fontFamily: 'var(--font-jersey), monospace', fontSize: 20,
                          padding: '8px 22px', background: ICE, color: '#000',
                          border: 'none', cursor: running ? 'wait' : 'pointer',
                          letterSpacing: '0.04em', boxShadow: `4px 4px 0 ${ICE}44`,
                          opacity: running || !ready ? 0.55 : 1,
                        }}
                      >
                        {ready ? (running ? '…' : '⚔ Ejecutar') : 'Cargando…'}
                      </button>
                      <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#334' }}>Ctrl+Enter</span>
                    </div>
                  </>
                )}

                {/* Feedback */}
                {feedback && (
                  <div style={{
                    fontFamily: 'var(--font-vt323), monospace', fontSize: 20, padding: '8px 12px',
                    color: feedback.ok ? '#a8e6cf' : '#ff9999',
                    border: `2px solid ${feedback.ok ? '#a8e6cf22' : '#ff999922'}`,
                    background: '#06080e',
                  }}>
                    {feedback.ok ? '✓ ' : '✗ '}{feedback.msg}
                  </div>
                )}

                {/* SQL result */}
                {resultRows.length > 0 && <ResultTable cols={resultCols} rows={resultRows} />}
                {resultError && (
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#ff6b6b', padding: '8px 10px', background: '#1a0505', border: '1px solid #ff6b6b22' }}>
                    {resultError}
                  </div>
                )}
              </>
            ) : (
              /* ── All-done panel ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  fontFamily: 'var(--font-jersey), monospace', fontSize: 28,
                  color: ICE, letterSpacing: '0.05em',
                  textShadow: `0 0 24px ${ICE}88`,
                  animation: 'caret-blink 1.4s steps(1) infinite',
                }}>
                  ⚠ SISTEMA COMPROMETIDO
                </div>

                <div style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: '#c0d0e0', lineHeight: 1.5 }}>
                  Completaste el inventario. Descargá tu archivo SQL y guardalo en tu compu.<br />
                  Después podés abrirlo en VS Code o en DB Browser y el cofre va a estar ahí.
                </div>

                {/* Full inventory table */}
                {inventoryRows.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#445', letterSpacing: '0.15em', marginBottom: 6 }}>
                      TU INVENTARIO FINAL
                    </div>
                    <ResultTable
                      cols={['id', 'nombre', 'cantidad', 'material']}
                      rows={inventoryRows}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                  <button
                    onClick={exportSQL}
                    style={{
                      fontFamily: 'var(--font-jersey), monospace', fontSize: 20,
                      padding: '10px 22px', background: '#F5C518', color: '#000',
                      border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
                      boxShadow: '4px 4px 0 #D4A01766',
                    }}
                  >
                    📥 Descargar mi_inventario.sql
                  </button>
                  <button
                    onClick={() => setCrash(true)}
                    style={{
                      fontFamily: 'var(--font-jersey), monospace', fontSize: 20,
                      padding: '10px 22px', background: ICE, color: '#000',
                      border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
                      boxShadow: `4px 4px 0 ${ICE}44`,
                    }}
                  >
                    ⚔ Enfrentar al Arquitecto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
