'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { SqlJsStatic, Database } from 'sql.js'
import { sfx } from '@/lib/game/architect/sound'
import CrashTransition from '@/components/landing/CrashTransition'
import MascotGuide from '@/components/game/MascotGuide'
import ArchitectCanvas from '@/components/game/architect/ArchitectCanvas'
import {
  getFinaleProgress, saveFinaleProgress, clearFinaleProgress, type FinaleRow,
  getFinaleDecoration, saveFinaleDecoration,
} from '@/lib/storage/local-store'

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
  verb: string
  instruction: string
  hint?: string
  defaultCode: string
  check: MissionCheck
}

const MISSIONS: Mission[] = [
  {
    id: 'create',
    label: 'Crear la tabla',
    verb: 'CRT',
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
    verb: 'INS',
    instruction: 'Llenás el cofre con ítems de Minecraft. Ejecutá el INSERT al menos dos veces con ítems distintos.',
    hint: 'Podés cambiar los valores y ejecutar de nuevo.',
    defaultCode: "INSERT INTO cofre (nombre, cantidad, material)\nVALUES ('Espada de diamante', 5, 'diamante');",
    check: 'insert',
  },
  {
    id: 'select',
    label: 'Consultar inventario',
    verb: 'SEL',
    instruction: '¿Qué tiene el cofre? Mostrá todos los ítems con SELECT.',
    defaultCode: 'SELECT * FROM cofre;',
    check: 'select',
  },
  {
    id: 'update',
    label: 'Actualizar cantidad',
    verb: 'UPD',
    instruction: 'Encontraste más materiales. Actualizá la cantidad de un ítem con UPDATE.',
    hint: 'Siempre usá WHERE o vas a modificar todos los ítems a la vez.',
    defaultCode: 'UPDATE cofre\nSET cantidad = 10\nWHERE id = 1;',
    check: 'update',
  },
  {
    id: 'delete',
    label: 'Eliminar un ítem',
    verb: 'DEL',
    instruction: 'Usaste todo el material. Borrá un ítem del cofre con DELETE.',
    hint: 'Sin WHERE, DELETE borra todo. Siempre filtrá.',
    defaultCode: 'DELETE FROM cofre WHERE id = 1;',
    check: 'delete',
  },
]

const MISSION_ORDER = MISSIONS.map(m => m.id)
const GRID_LAYOUT = [...MISSION_ORDER, 'deco1', 'deco2', 'deco3', 'deco4']

// Rodolfo acompaña cada paso con la mirada "de qué va esto", distinta del
// hint técnico que ya muestra la misión (sintaxis vs. sentido del paso).
const RODOLFO_TIPS: Record<string, string> = {
  create: 'Yo ya dejé la tabla armada. Vos concentrate en llenar el cofre.',
  insert: 'Cargá al menos 2 ítems distintos. Podés ejecutar el INSERT las veces que quieras.',
  select: 'Un SELECT * te muestra todo lo que hay adentro del cofre.',
  update: 'Fijate el id en la tabla de abajo antes de armar el WHERE.',
  delete: 'Último paso: después de borrar un ítem no hay vuelta atrás.',
}

const STICKERS = ['▲', '●', '■', '◆', '✦', '✕', '▮', '░']

const MATERIALS: { id: string; name: string }[] = [
  { id: 'solid', name: 'Roble' },
  { id: 'stripes', name: 'Forjado' },
  { id: 'dots', name: 'Grabado' },
  { id: 'cross', name: 'Encantado' },
  { id: 'frame', name: 'Reforzado' },
]

function materialOverlayStyle(id: string, tint: string): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', left: 6, right: 6, top: 8, bottom: '34%', pointerEvents: 'none', opacity: 0.5 }
  switch (id) {
    case 'stripes': return { ...base, backgroundImage: `repeating-linear-gradient(45deg, ${tint} 0 2px, transparent 2px 7px)` }
    case 'dots': return { ...base, backgroundImage: `radial-gradient(${tint} 1.4px, transparent 1.4px)`, backgroundSize: '8px 8px' }
    case 'cross': return { ...base, backgroundImage: `repeating-linear-gradient(45deg, ${tint} 0 1.5px, transparent 1.5px 7px), repeating-linear-gradient(-45deg, ${tint} 0 1.5px, transparent 1.5px 7px)` }
    case 'frame': return { ...base, outline: `2px solid ${tint}`, outlineOffset: -4 }
    default: return { display: 'none' }
  }
}

// ── CSS vars → colores reales para <canvas> (fillStyle no resuelve var()) ────

function useAccentTriplet(): string {
  const [triplet, setTriplet] = useState('190 90% 84%')
  useEffect(() => {
    const read = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
      if (raw) setTriplet(raw)
    }
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return triplet
}

// ── ASCII Crash Overlay — recolorea con el acento del tema activo ────────────

const CRASH_CHARS = '░▒▓█│─┼@#%^&*+=[]{};:,.<>?/~'

function CrashOverlay({ intensity, accentTriplet }: { intensity: number; accentTriplet: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const intRef = useRef(intensity)
  intRef.current = intensity
  const colorRef = useRef(accentTriplet)
  colorRef.current = accentTriplet

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
      ctx.fillStyle = `hsl(${colorRef.current} / ${(k * 0.75).toFixed(2)})`
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

// ── Cofre — tokenizado con las variables del tema activo, no colores fijos ──

function Chest({ open, materialId }: { open: boolean; materialId: string }) {
  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox="0 0 32 32" width={104} height={104}
        style={{ imageRendering: 'pixelated', display: 'block', transition: 'filter 0.4s' }}
        aria-label={open ? 'Cofre abierto' : 'Cofre cerrado'}
      >
        <rect x="1" y="17" width="30" height="14" fill="hsl(var(--border2))" />
        <rect x="2" y="18" width="28" height="12" fill="hsl(var(--surface2))" />
        <rect x="2" y="18" width="28" height="2" fill="hsl(var(--border2))" />
        <rect x="13" y="22" width="6" height="5" fill="hsl(var(--accent))" />
        <rect x="14" y="23" width="4" height="3" fill="hsl(var(--accent2))" />
        {!open ? (
          <g>
            <rect x="1" y="7" width="30" height="11" fill="hsl(var(--border2))" />
            <rect x="2" y="8" width="28" height="9" fill="hsl(var(--surface2))" />
            <rect x="2" y="8" width="28" height="2" fill="hsl(var(--border))" />
            <rect x="13" y="14" width="6" height="4" fill="hsl(var(--accent))" />
            <rect x="14" y="15" width="4" height="2" fill="hsl(var(--accent2))" />
          </g>
        ) : (
          <g>
            <rect x="1" y="1" width="30" height="8" fill="hsl(var(--border2))" />
            <rect x="2" y="2" width="28" height="6" fill="hsl(var(--surface2))" />
            <rect x="2" y="7" width="28" height="1" fill="hsl(var(--border))" />
            <rect x="2" y="18" width="28" height="12" fill="hsl(var(--bg))" />
            <rect x="3" y="19" width="26" height="10" fill="hsl(var(--surface))" />
          </g>
        )}
      </svg>
      <div style={materialOverlayStyle(materialId, 'hsl(var(--tx) / 0.35)')} />
    </div>
  )
}

// ── Inline result table ───────────────────────────────────────────────────────

function ResultTable({ cols, rows }: { cols: string[]; rows: (string | number | null)[][] }) {
  if (rows.length === 0) return null
  return (
    <div style={{ overflowX: 'auto', border: '1px solid hsl(var(--border))' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'var(--font-vt323), monospace', fontSize: 18 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ padding: '4px 10px', color: 'hsl(var(--tx))', textAlign: 'left', borderBottom: '1px solid hsl(var(--border2))', letterSpacing: '0.05em' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '4px 10px', color: 'hsl(var(--tx2))' }}>
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
  const workbenchRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const accentTriplet = useAccentTriplet()

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
  const [restored, setRestored] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [stickerSlot, setStickerSlot] = useState<string | null>(null)

  // Decoración del cofre — nombre, lema, material, grabados. Persiste aparte
  // del progreso de misiones (reiniciar el cofre no borra la identidad del alumno).
  const [chestName, setChestName] = useState('')
  const [chestMotto, setChestMotto] = useState('')
  const [material, setMaterial] = useState('solid')
  const [stickers, setStickers] = useState<Record<string, string>>({})

  useEffect(() => {
    const deco = getFinaleDecoration()
    if (deco) {
      setChestName(deco.name ?? '')
      setChestMotto(deco.motto ?? '')
      setMaterial(deco.material ?? 'solid')
      setStickers(deco.stickers ?? {})
    }
  }, [])

  // El efecto de guardado y el de lectura de arriba corren los dos al montar;
  // sin este guard, el guardado se dispara primero con los valores por
  // defecto (antes de que el setState de la lectura se aplique) y pisa la
  // decoración ya guardada. Se salta solo esa primera pasada espuria.
  const skipFirstDecoSave = useRef(true)
  useEffect(() => {
    if (skipFirstDecoSave.current) { skipFirstDecoSave.current = false; return }
    saveFinaleDecoration({ name: chestName, motto: chestMotto, material, stickers })
  }, [chestName, chestMotto, material, stickers])

  const intensity = (completed.size - 1) / (MISSIONS.length - 1) // 0 when only create done, 1 when all done
  const remaining = MISSIONS.length - completed.size

  // ── Load sql.js — y retomar el cofre guardado si el alumno ya venía jugando ──
  useEffect(() => {
    getSql().then(SQL => {
      const db = new SQL.Database()
      db.run(INIT_SQL)

      const saved = getFinaleProgress()
      if (saved && saved.rows.length > 0) {
        for (const row of saved.rows) {
          db.run('INSERT INTO cofre (id, nombre, cantidad, material) VALUES (?, ?, ?, ?)', [row.id, row.nombre, row.cantidad, row.material])
        }
        // sqlite AUTOINCREMENT sigue solo desde el máximo id explícito insertado.
        setChestOpen(true)
        setCompleted(new Set(saved.completed))
        setAllDone(saved.completed.length >= MISSIONS.length)
        const idx = Math.min(saved.mIdx, MISSIONS.length - 1)
        setMIdx(idx)
        setCode(MISSIONS[idx].defaultCode)
        setRestored(true)
      }

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

  // La tabla recién existe cuando sql.js terminó de cargar (y, si había un
  // cofre guardado, de restaurarlo) — reflejarla en la mini-tabla en ese momento.
  useEffect(() => {
    if (ready) refreshInventory()
  }, [ready, refreshInventory])

  // ── Guardado de partida — cada cambio de estado relevante se persiste solo ──
  // Corre client-side (sql.js, sin servidor): si se corta la luz o el wifi del
  // aula, el localStorage del navegador sigue intacto y el alumno retoma igual.
  useEffect(() => {
    if (!ready) return
    saveFinaleProgress({
      rows: inventoryRows.map((r): FinaleRow => ({
        id: Number(r[0]),
        nombre: String(r[1] ?? ''),
        cantidad: Number(r[2] ?? 1),
        material: r[3] == null ? null : String(r[3]),
      })),
      completed: Array.from(completed),
      mIdx,
    })
  }, [ready, inventoryRows, completed, mIdx])

  // ── Reiniciar el cofre (borra el guardado local, no toca Supabase) ──────────
  const resetProject = useCallback(() => {
    clearFinaleProgress()
    const db = dbRef.current
    if (db) {
      db.run('DELETE FROM cofre;')
      refreshInventory()
    }
    setCompleted(new Set(['create']))
    setMIdx(1)
    setCode(MISSIONS[1].defaultCode)
    setChestOpen(false)
    setAllDone(false)
    setFeedback(null)
    setResultRows([])
    setResultCols([])
    setResultError(null)
    setConfirmReset(false)
    setRestored(false)
  }, [refreshInventory])

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
  const GOLD = 'hsl(38 92% 60%)'

  return (
    <main style={{ minHeight: '100vh', background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', position: 'relative', overflow: 'hidden' }}>

      {/* El Arquitecto observa de fondo — decorativo, nunca tapa la interfaz */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 'min(80vw, 760px)', opacity: 0.06, pointerEvents: 'none', zIndex: 0,
        }}
      >
        <ArchitectCanvas mode="ascii" integrity={1} color={`hsl(${accentTriplet})`} bg="transparent" glitchy={false} label="" />
      </div>

      <CrashOverlay intensity={intensity * 0.8} accentTriplet={accentTriplet} />

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 10, filter: glitch }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'hsl(var(--tx3))', letterSpacing: '0.18em' }}>
              EL ARQUITECTO
            </span>
            <div style={{ display: 'flex', gap: 3 }} className={flash ? 'animate-damage-flash' : ''}>
              {Array.from({ length: MISSIONS.length }, (_, i) => (
                <div key={i} style={{
                  width: 30, height: 14,
                  background: i < remaining ? 'hsl(var(--accent))' : 'hsl(var(--border2))',
                  boxShadow: i < remaining ? '0 0 5px hsl(var(--accent) / 0.6)' : 'none',
                  transition: 'background 0.35s, box-shadow 0.35s',
                }} />
              ))}
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'hsl(var(--tx3))' }}>
              {remaining}/{MISSIONS.length}
            </span>
            {restored && (
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'hsl(var(--accent))', letterSpacing: '0.1em' }}>
                ▮ RETOMASTE TU COFRE
              </span>
            )}
            <span style={{ marginLeft: 'auto' }}>
              {confirmReset ? (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'hsl(var(--tx3))' }}>¿Borrar todo el cofre?</span>
                  <button
                    onClick={resetProject}
                    style={{ fontFamily: 'monospace', fontSize: 9, color: 'hsl(var(--danger))', background: 'none', border: '1px solid hsl(var(--danger) / 0.3)', padding: '2px 6px', cursor: 'pointer' }}
                  >sí, reiniciar</button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    style={{ fontFamily: 'monospace', fontSize: 9, color: 'hsl(var(--tx3))', background: 'none', border: 'none', cursor: 'pointer' }}
                  >cancelar</button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  style={{ fontFamily: 'monospace', fontSize: 9, color: 'hsl(var(--tx3))', letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer' }}
                >↺ reiniciar cofre</button>
              )}
            </span>
          </div>
          <div style={{
            fontFamily: 'var(--font-jersey), monospace',
            fontSize: allDone ? 13 : 10,
            letterSpacing: '0.18em',
            color: allDone ? 'hsl(var(--accent))' : 'hsl(var(--tx3) / 0.7)',
            textShadow: allDone ? '0 0 12px hsl(var(--accent) / 0.4)' : 'none',
            transition: 'color 0.4s',
          }}>
            {allDone ? '⚠  SISTEMA COMPROMETIDO' : 'PROYECTO FINAL · MESA DE CRAFTEO'}
          </div>
        </div>

        {/* ── Three-column layout: cofre | receta 3×3 | banco de trabajo ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '210px minmax(0,1fr) minmax(0,1.05fr)', gap: 16, alignItems: 'start' }}>

          {/* ── Rail: cofre + personalización ── */}
          <div
            className="pixel-corners"
            style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--surface))', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Chest open={chestOpen} materialId={material} />
              <div style={{
                fontFamily: 'var(--font-jersey), monospace', fontSize: 17, letterSpacing: '0.02em',
                color: 'hsl(var(--tx))', textAlign: 'center', maxWidth: 180, overflowWrap: 'break-word', lineHeight: 1.15,
              }}>
                {chestName ? `EL COFRE DE ${chestName.toUpperCase()}` : 'EL COFRE DE ___'}
              </div>
              {chestMotto && (
                <div style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 14, color: 'hsl(var(--tx3))', textAlign: 'center', maxWidth: 180 }}>
                  {chestMotto}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: 'hsl(var(--tx3))' }}>
                <span className={`status-dot ${chestOpen ? 'active' : 'locked'}`} />
                {chestOpen ? 'ABIERTO' : 'CERRADO'}
              </div>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', color: 'hsl(var(--tx3))', textTransform: 'uppercase' }}>Nombre en la placa</span>
              <input
                value={chestName}
                onChange={e => setChestName(e.target.value.slice(0, 18))}
                placeholder="Tu nombre"
                className="input"
                style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 17 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', color: 'hsl(var(--tx3))', textTransform: 'uppercase' }}>Lema (opcional)</span>
              <input
                value={chestMotto}
                onChange={e => setChestMotto(e.target.value.slice(0, 30))}
                placeholder="ej: nadie toca mi cofre"
                className="input"
                style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 17 }}
              />
            </label>

            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.12em', color: 'hsl(var(--tx3))', marginBottom: 6, textTransform: 'uppercase' }}>
                Material del cofre
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {MATERIALS.map(mat => (
                  <button
                    key={mat.id}
                    title={mat.name}
                    onClick={() => setMaterial(mat.id)}
                    className="pixel-corners-sm"
                    style={{
                      aspectRatio: '1', position: 'relative', overflow: 'hidden', cursor: 'pointer',
                      background: 'hsl(var(--surface2))',
                      border: material === mat.id ? '1px solid hsl(var(--accent))' : '1px solid hsl(var(--border))',
                      boxShadow: material === mat.id ? '0 0 0 1px hsl(var(--accent) / 0.4)' : 'none',
                    }}
                  >
                    <span style={{ position: 'absolute', inset: 0, ...(mat.id === 'solid' ? { background: 'hsl(var(--tx2))' } : materialOverlayStyle(mat.id, 'hsl(var(--tx2))')), opacity: 1, top: 0, bottom: 0, left: 0, right: 0 }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Pasos secuenciales: 1 → 2 → 3 → 4 → 5, uno a la vez, sin saltos */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
              {MISSIONS.map((m, i) => {
                const done   = completed.has(m.id)
                const active = i === mIdx && !allDone
                const locked = !done && !active
                const isLast = i === MISSIONS.length - 1
                return (
                  <div key={m.id} style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20 }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
                        border: `1px solid hsl(var(${done ? '--accent' : active ? '--tx' : '--border2'}))`,
                        color: done ? 'hsl(var(--bg))' : active ? 'hsl(var(--tx))' : 'hsl(var(--tx3))',
                        background: done ? 'hsl(var(--accent))' : 'transparent',
                        boxShadow: active ? '0 0 8px hsl(var(--accent) / 0.5)' : 'none',
                      }}>
                        {done ? '✓' : i + 1}
                      </span>
                      {!isLast && (
                        <span style={{ width: 1, flex: 1, minHeight: 10, background: done ? 'hsl(var(--accent))' : 'hsl(var(--border2))', opacity: done ? 0.6 : 0.5 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: isLast ? 0 : 10 }}>
                      <div style={{
                        fontFamily: 'var(--font-vt323), monospace', fontSize: 17, lineHeight: 1,
                        color: done ? 'hsl(var(--accent))' : active ? 'hsl(var(--tx))' : 'hsl(var(--tx3))',
                      }}>
                        {m.label}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.1em', color: 'hsl(var(--tx3))', marginTop: 2 }}>
                        {done ? 'HECHO' : active ? 'AHORA' : locked ? 'DESPUÉS' : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Receta 3×3: misiones + slots decorativos ── */}
          <div
            className="pixel-corners"
            style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--surface))', padding: 14 }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.18em', color: 'hsl(var(--tx3))', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              Receta · 3×3
              <span className="badge badge-sql">SQL</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gridTemplateRows: 'repeat(3, 60px)', gap: 5,
                background: 'hsl(var(--bg))', padding: 7, border: '1px solid hsl(var(--border))',
              }}>
                {GRID_LAYOUT.map(id => {
                  const m = MISSIONS.find(mm => mm.id === id)
                  if (m) {
                    const idx = MISSION_ORDER.indexOf(id)
                    const done = completed.has(id)
                    const active = idx === mIdx && !allDone
                    const status = done ? 'done' : active ? 'active' : 'locked'
                    return (
                      <button
                        key={id}
                        disabled={status === 'locked'}
                        onClick={() => { if (status !== 'locked') { setMIdx(idx); setCode(MISSIONS[idx].defaultCode) } }}
                        title={m.label}
                        style={{
                          width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                          fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: '0.03em',
                          background: 'hsl(var(--surface2))',
                          border: `1px solid hsl(var(${status === 'done' || status === 'active' ? '--accent' : '--border'}))`,
                          color: status === 'done' ? 'hsl(var(--accent))' : status === 'active' ? 'hsl(var(--tx))' : 'hsl(var(--tx3))',
                          opacity: status === 'locked' ? 0.4 : 1,
                          cursor: status === 'locked' ? 'default' : 'pointer',
                          boxShadow: status === 'done' ? '0 0 8px hsl(var(--accent) / 0.35)' : status === 'active' ? '0 0 0 1px hsl(var(--accent) / 0.3)' : 'none',
                        }}
                      >
                        {status === 'locked' ? '···' : m.verb}
                        {status === 'done' && <span className="status-dot active" style={{ position: 'absolute', top: 3, right: 3 }} />}
                      </button>
                    )
                  }
                  const glyph = stickers[id]
                  return (
                    <button
                      key={id}
                      onClick={() => setStickerSlot(id)}
                      title="Grabar un símbolo"
                      style={{
                        width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'monospace', fontSize: 20, cursor: 'pointer',
                        background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--accent))', opacity: glyph ? 1 : 0.35,
                      }}
                    >
                      {glyph || '+'}
                    </button>
                  )
                })}
              </div>

              <div style={{ fontFamily: 'monospace', fontSize: 20, color: 'hsl(var(--tx3))' }}>→</div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div
                  onClick={() => { if (allDone) workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}
                  style={{
                    width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'monospace', fontSize: 22,
                    background: 'hsl(var(--surface2))',
                    border: `2px solid hsl(var(${allDone ? '--accent' : '--border'}))`,
                    color: allDone ? 'hsl(var(--accent))' : 'hsl(var(--tx3))',
                    boxShadow: allDone ? '0 0 16px hsl(var(--accent) / 0.4)' : 'none',
                    cursor: allDone ? 'pointer' : 'default',
                  }}
                >
                  {allDone ? '★' : '···'}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.12em', color: 'hsl(var(--tx3))', textAlign: 'center' }}>ITEM FINAL</div>
              </div>
            </div>

            {stickerSlot && (
              <div style={{
                marginTop: 12, display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center',
                background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--border))', padding: 8, maxWidth: 300, marginInline: 'auto',
              }}>
                {STICKERS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setStickers(prev => ({ ...prev, [stickerSlot]: s })); setStickerSlot(null) }}
                    style={{ width: 28, height: 28, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', fontSize: 15, cursor: 'pointer', color: 'hsl(var(--tx))' }}
                  >{s}</button>
                ))}
                <button
                  onClick={() => { setStickers(prev => { const n = { ...prev }; delete n[stickerSlot]; return n }); setStickerSlot(null) }}
                  title="Quitar"
                  style={{ width: 28, height: 28, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', fontFamily: 'monospace', fontSize: 15, cursor: 'pointer', color: 'hsl(var(--danger))' }}
                >✕</button>
              </div>
            )}

            {/* Live inventory */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'hsl(var(--tx3))', letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase' }}>
                Contenido del cofre
              </div>
              {inventoryRows.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 16, color: 'hsl(var(--tx3))' }}>vacío por ahora</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'var(--font-vt323), monospace', fontSize: 14 }}>
                    <thead>
                      <tr>
                        {['id', 'nombre', 'cant.'].map(h => (
                          <th key={h} style={{ padding: '2px 6px', color: 'hsl(var(--tx))', textAlign: 'left', borderBottom: '1px solid hsl(var(--border2))', fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryRows.map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding: '2px 6px', color: 'hsl(var(--tx3))' }}>{row[0]}</td>
                          <td style={{ padding: '2px 6px', color: 'hsl(var(--tx2))', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[1]}</td>
                          <td style={{ padding: '2px 6px', color: 'hsl(var(--tx2))' }}>{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Banco de trabajo ── */}
          <div
            ref={workbenchRef}
            className="pixel-corners"
            style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--surface))', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.18em', color: 'hsl(var(--tx3))', textTransform: 'uppercase' }}>
              Banco de trabajo
            </div>

            {!allDone ? (
              <>
                {/* Mission card */}
                <div style={{ border: '1px solid hsl(var(--border))', padding: '12px 14px', background: 'hsl(var(--surface2))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 10, color: 'hsl(var(--tx3))', letterSpacing: '0.14em', marginBottom: 6, textTransform: 'uppercase' }}>
                    <span className="badge badge-sql">SQL</span>
                    MISIÓN {mIdx + 1} / {MISSIONS.length} · {mission.label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: 'hsl(var(--tx))', lineHeight: 1.3 }}>
                    {mission.instruction}
                  </div>
                  {mission.hint && (
                    <div style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 16, color: 'hsl(var(--tx3))', marginTop: 5 }}>
                      💡 {mission.hint}
                    </div>
                  )}
                </div>

                {/* CREATE: show code read-only */}
                {mission.check === 'pre' && (
                  <pre style={{
                    fontFamily: 'var(--font-vt323), "Courier New", monospace', fontSize: 18,
                    padding: '10px 12px', background: 'hsl(var(--bg))', color: 'hsl(var(--tx2))',
                    border: '1px solid hsl(var(--border))', margin: 0, overflowX: 'auto',
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
                        background: 'hsl(var(--bg))', color: 'hsl(var(--tx))',
                        border: '1px solid hsl(var(--border))',
                        fontFamily: 'var(--font-vt323), "Courier New", monospace',
                        fontSize: 20, padding: '10px 12px', outline: 'none',
                        resize: 'vertical', lineHeight: 1.4,
                      }}
                    />
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button
                        onClick={() => void execute()}
                        disabled={running || !ready}
                        className="pixel-corners pixel-shadow"
                        style={{
                          fontFamily: 'var(--font-jersey), monospace', fontSize: 20,
                          padding: '8px 22px', background: 'hsl(var(--accent))', color: 'hsl(var(--bg))',
                          border: 'none', cursor: running ? 'wait' : 'pointer',
                          letterSpacing: '0.04em',
                          opacity: running || !ready ? 0.55 : 1,
                        }}
                      >
                        {ready ? (running ? '…' : '⚔ Ejecutar') : 'Cargando…'}
                      </button>
                      <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'hsl(var(--tx3))' }}>Ctrl+Enter</span>
                    </div>
                  </>
                )}

                {/* Feedback */}
                {feedback && (
                  <div style={{
                    fontFamily: 'var(--font-vt323), monospace', fontSize: 20, padding: '8px 12px',
                    color: feedback.ok ? 'hsl(var(--accent))' : 'hsl(var(--danger))',
                    border: `1px solid hsl(var(${feedback.ok ? '--accent' : '--danger'}) / 0.3)`,
                    background: 'hsl(var(--surface2))',
                  }}>
                    {feedback.ok ? '✓ ' : '✗ '}{feedback.msg}
                  </div>
                )}

                {/* SQL result */}
                {resultRows.length > 0 && <ResultTable cols={resultCols} rows={resultRows} />}
                {resultError && (
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'hsl(var(--danger))', padding: '8px 10px', background: 'hsl(var(--surface2))', border: '1px solid hsl(var(--danger) / 0.3)' }}>
                    {resultError}
                  </div>
                )}
              </>
            ) : (
              /* ── All-done panel ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  fontFamily: 'var(--font-jersey), monospace', fontSize: 26,
                  color: 'hsl(var(--accent))', letterSpacing: '0.05em',
                  textShadow: '0 0 20px hsl(var(--accent) / 0.4)',
                  animation: 'caret-blink 1.4s steps(1) infinite',
                }}>
                  ⚠ SISTEMA COMPROMETIDO
                </div>

                <div style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: 'hsl(var(--tx2))', lineHeight: 1.5 }}>
                  Completaste el inventario. Descargá tu archivo SQL y guardalo en tu compu.<br />
                  Después podés abrirlo en VS Code o en DB Browser y el cofre va a estar ahí.
                </div>

                {/* Full inventory table */}
                {inventoryRows.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'hsl(var(--tx3))', letterSpacing: '0.15em', marginBottom: 6 }}>
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
                    className="pixel-corners pixel-shadow"
                    style={{
                      fontFamily: 'var(--font-jersey), monospace', fontSize: 20,
                      padding: '10px 22px', background: GOLD, color: '#000',
                      border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
                    }}
                  >
                    📥 Descargar mi_inventario.sql
                  </button>
                  <button
                    onClick={() => setCrash(true)}
                    className="pixel-corners pixel-shadow"
                    style={{
                      fontFamily: 'var(--font-jersey), monospace', fontSize: 20,
                      padding: '10px 22px', background: 'hsl(var(--accent))', color: 'hsl(var(--bg))',
                      border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
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

      <MascotGuide tip={!allDone ? RODOLFO_TIPS[mission.id] : undefined} variant="pixel" />
    </main>
  )
}
