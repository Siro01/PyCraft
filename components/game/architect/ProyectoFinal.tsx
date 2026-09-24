'use client'

/*
 THESIS: el cofre es una computadora de ventanas 1-bit que el alumno arma y decora; el error es espectáculo, nunca pérdida. Rechaza: el formulario de misiones en columnas.
 OWN-WORLD: escritorio tramado con menú, íconos pixel, ventanas de barra rayada (activa = barra sólida de acento), sombra dura, tokens hsl(var(--…)) de los 3 temas.
 STORY: abro el COFRE, leo la MISIÓN, escribo SQL en la CONSOLA; si me equivoco el escritorio se inunda de ventanitas pero mi cofre sigue a salvo.
 FIRST VIEWPORT: menú arriba, íconos a la izquierda, COFRE a la izquierda, MISIÓN y CONSOLA a la derecha, barra de tareas con progreso abajo; Ejecutar en la consola.
 FORM: Escritorio 1-bit (opción 6 de mi lista, sorteo surface 514cc472).
 FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
*/

import { useState, useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { StatusMark } from '@/components/ui/StatusMark'
import type { SqlJsStatic, Database } from 'sql.js'
import { sfx, isMuted, setMuted } from '@/lib/game/architect/sound'
import CrashTransition from '@/components/landing/CrashTransition'
import MascotGuide from '@/components/game/MascotGuide'
import ArchitectCanvas from '@/components/game/architect/ArchitectCanvas'
import DeskWindow from '@/components/game/architect/desktop/DeskWindow'
import { useAccentTriplet, keySound } from '@/components/game/architect/desktop/hooks'
import {
  PixelBitmap, CHEST_CLOSED, CHEST_OPEN, ICON_FOLDER, ICON_TERMINAL, ICON_FILE, ICON_WALL,
  ICON_CUBE, ICON_CHECK, STICKER_BITMAPS, STICKER_IDS,
} from '@/components/game/architect/desktop/PixelBitmap'
import { buildErrorWindows, buildTakeoverWindow, explainSqlError, ErrorBody, type ErrWin } from '@/components/game/architect/desktop/errors'
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
    verb: 'CREATE',
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
    verb: 'INSERT',
    instruction: 'Llenás el cofre con ítems de Minecraft. Ejecutá el INSERT al menos dos veces con ítems distintos.',
    hint: 'Podés cambiar los valores y ejecutar de nuevo.',
    defaultCode: "INSERT INTO cofre (nombre, cantidad, material)\nVALUES ('Espada de diamante', 5, 'diamante');",
    check: 'insert',
  },
  {
    id: 'select',
    label: 'Consultar inventario',
    verb: 'SELECT',
    instruction: '¿Qué tiene el cofre? Mostrá todos los ítems con SELECT.',
    defaultCode: 'SELECT * FROM cofre;',
    check: 'select',
  },
  {
    id: 'update',
    label: 'Actualizar cantidad',
    verb: 'UPDATE',
    instruction: 'Encontraste más materiales. Actualizá la cantidad de un ítem con UPDATE.',
    hint: 'Siempre usá WHERE o vas a modificar todos los ítems a la vez.',
    defaultCode: 'UPDATE cofre\nSET cantidad = 10\nWHERE id = 1;',
    check: 'update',
  },
  {
    id: 'delete',
    label: 'Eliminar un ítem',
    verb: 'DELETE',
    instruction: 'Usaste todo el material. Borrá un ítem del cofre con DELETE.',
    hint: 'Sin WHERE, DELETE borra todo. Siempre filtrá.',
    defaultCode: 'DELETE FROM cofre WHERE id = 1;',
    check: 'delete',
  },
]

// Rodolfo acompaña cada paso con la mirada "de qué va esto", distinta del
// hint técnico que ya muestra la misión (sintaxis vs. sentido del paso).
const RODOLFO_TIPS: Record<string, string> = {
  create: 'Yo ya dejé la tabla armada. Vos concentrate en llenar el cofre.',
  insert: 'Cargá al menos 2 ítems distintos. Podés ejecutar el INSERT las veces que quieras.',
  select: 'Un SELECT * te muestra todo lo que hay adentro del cofre.',
  update: 'Fijate el id en la lista del cofre antes de armar el WHERE.',
  delete: 'Último paso: después de borrar un ítem no hay vuelta atrás.',
}

// ── Decoración ───────────────────────────────────────────────────────────────

const MATERIALS: { id: string; name: string }[] = [
  { id: 'solid', name: 'Roble' },
  { id: 'stripes', name: 'Forjado' },
  { id: 'dots', name: 'Grabado' },
  { id: 'cross', name: 'Encantado' },
  { id: 'frame', name: 'Reforzado' },
]

function materialOverlayStyle(id: string, tint: string): CSSProperties {
  const base: CSSProperties = { position: 'absolute', left: 8, right: 8, top: 8, bottom: '40%', pointerEvents: 'none', opacity: 0.55 }
  switch (id) {
    case 'stripes': return { ...base, backgroundImage: `repeating-linear-gradient(45deg, ${tint} 0 2px, transparent 2px 7px)` }
    case 'dots': return { ...base, backgroundImage: `radial-gradient(${tint} 1.4px, transparent 1.4px)`, backgroundSize: '8px 8px' }
    case 'cross': return { ...base, backgroundImage: `repeating-linear-gradient(45deg, ${tint} 0 1.5px, transparent 1.5px 7px), repeating-linear-gradient(-45deg, ${tint} 0 1.5px, transparent 1.5px 7px)` }
    case 'frame': return { ...base, outline: `2px solid ${tint}`, outlineOffset: -4 }
    default: return { display: 'none' }
  }
}

const WALLS: { id: string; name: string }[] = [
  { id: 'dots', name: 'Puntos' },
  { id: 'dither', name: 'Tramado' },
  { id: 'grid', name: 'Cuadrícula' },
  { id: 'plain', name: 'Liso' },
]

function wallStyle(id: string): CSSProperties {
  switch (id) {
    case 'dither': return { backgroundImage: 'conic-gradient(hsl(var(--tx) / 0.09) 25%, transparent 0 50%, hsl(var(--tx) / 0.09) 0 75%, transparent 0)', backgroundSize: '6px 6px' }
    case 'grid': return { backgroundImage: 'linear-gradient(hsl(var(--border) / 0.7) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.7) 1px, transparent 1px)', backgroundSize: '32px 32px' }
    case 'plain': return {}
    default: return { backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.2) 1px, transparent 1px)', backgroundSize: '14px 14px' }
  }
}

// ── Layout del escritorio ────────────────────────────────────────────────────

type WinId = 'cofre' | 'mision' | 'consola' | 'final'

const WIN_TITLES: Record<WinId, string> = {
  cofre: 'COFRE.SYS',
  mision: 'MISIÓN.TXT',
  consola: 'CONSOLA_SQL.EXE',
  final: 'SISTEMA_COMPROMETIDO.EXE',
}

const RIGHT_X = 436

function defaultPos(id: WinId, W: number) {
  switch (id) {
    case 'cofre': return { x: 112, y: 42 }
    case 'mision': return { x: RIGHT_X, y: 42 }
    case 'consola': return { x: RIGHT_X, y: 276 }
    case 'final': return { x: Math.max(20, Math.round((W - 500) / 2)), y: 110 }
  }
}

function widthOf(id: WinId, W: number) {
  if (id === 'cofre') return 300
  if (id === 'final') return 500
  return Math.max(360, Math.min(700, W - RIGHT_X - 18))
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
    // Sin animación si el sistema lo pidió: la niebla es puro adorno.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

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
      // ~11–14 cuadros por segundo: se sigue viendo como estática de terminal y
      // gasta una fracción del CPU (antes redibujaba a ~60 fps miles de caracteres).
      const gap = k > 0.6 ? 70 : 90
      if (now - lastDraw < gap) return
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
          ctx.fillText(CRASH_CHARS[Math.floor(Math.random() * CRASH_CHARS.length)], c * CELL, (r + 1) * CELL)
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

// ── Tabla de resultados ──────────────────────────────────────────────────────

function ResultTable({ cols, rows }: { cols: string[]; rows: (string | number | null)[][] }) {
  if (rows.length === 0) return null
  return (
    <div style={{ overflow: 'auto', maxHeight: 130, border: '2px solid hsl(var(--tx))' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: 'var(--font-vt323), monospace', fontSize: 18 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ padding: '3px 10px', color: 'hsl(var(--bg))', background: 'hsl(var(--tx))', textAlign: 'left', letterSpacing: '0.05em', fontWeight: 400 }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border2))' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '3px 10px', color: 'hsl(var(--tx))' }}>{cell ?? 'NULL'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const monoLabel: CSSProperties = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(var(--tx3))' }

// ── Main component ───────────────────────────────────────────────────────────

export default function ProyectoFinal() {
  const dbRef = useRef<Database | null>(null)
  const deskRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const accentTriplet = useAccentTriplet()

  // Mission progress
  const [mIdx, setMIdx] = useState(1)
  const [completed, setCompleted] = useState<Set<string>>(new Set(['create']))
  const [code, setCode] = useState(MISSIONS[1].defaultCode)

  // Execution
  const [running, setRunning] = useState(false)
  const [resultCols, setResultCols] = useState<string[]>([])
  const [resultRows, setResultRows] = useState<(string | number | null)[][]>([])
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [undoRows, setUndoRows] = useState<FinaleRow[] | null>(null)

  // Cofre / estado
  const [chestOpen, setChestOpen] = useState(false)
  const [inventoryRows, setInventoryRows] = useState<(string | number | null)[][]>([])
  const [allDone, setAllDone] = useState(false)
  const [crash, setCrash] = useState(false)
  const [restored, setRestored] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [stickerSlot, setStickerSlot] = useState<string | null>(null)
  const [dropKey, setDropKey] = useState(0)
  const [savedTick, setSavedTick] = useState(0)
  const [muted, setMutedState] = useState(false)
  const [clock, setClock] = useState('')

  // Decoración — persiste aparte del progreso (reiniciar el cofre no la borra)
  const [chestName, setChestName] = useState('')
  const [chestMotto, setChestMotto] = useState('')
  const [material, setMaterial] = useState('solid')
  const [stickers, setStickers] = useState<Record<string, string>>({})
  const [wall, setWall] = useState('dots')

  // Escritorio: ventanas, orden, errores
  const [deskW, setDeskW] = useState(0)
  const [open, setOpen] = useState<Record<WinId, boolean>>({ cofre: true, mision: true, consola: true, final: false })
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({})
  const [order, setOrder] = useState<string[]>(['cofre', 'mision', 'consola'])
  const [errWins, setErrWins] = useState<ErrWin[]>([])
  const [shake, setShake] = useState(false)
  const streakRef = useRef(0)
  const reducedMotionRef = useRef(false)
  useEffect(() => { reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches }, [])
  const [phase, setPhase] = useState<'idle' | 'congrats' | 'takeover'>('idle')
  const [downloaded, setDownloaded] = useState(false)
  const [confirmFight, setConfirmFight] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  const mobile = deskW > 0 && deskW < 860

  const mIdxRef = useRef(mIdx)
  mIdxRef.current = mIdx
  const savedRef = useRef(0)
  savedRef.current = inventoryRows.length
  const mobileRef = useRef(mobile)
  mobileRef.current = mobile

  // ── Tamaño del escritorio ───────────────────────────────────────────────────
  useEffect(() => {
    const el = deskRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setDeskW(el.clientWidth))
    ro.observe(el)
    setDeskW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setMutedState(isMuted())
    const tick = () => setClock(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }))
    tick()
    const id = setInterval(tick, 20000)
    return () => clearInterval(id)
  }, [])

  // ── Decoración: leer al montar, guardar después ─────────────────────────────
  useEffect(() => {
    const deco = getFinaleDecoration()
    if (deco) {
      setChestName(deco.name ?? '')
      setChestMotto(deco.motto ?? '')
      setMaterial(deco.material ?? 'solid')
      setStickers(deco.stickers ?? {})
      setWall(deco.wall ?? 'dots')
    }
  }, [])

  // El guardado corre también en el primer montaje, antes de que la lectura de
  // arriba se aplique, y pisaría lo guardado con los valores por defecto.
  const skipFirstDecoSave = useRef(true)
  useEffect(() => {
    if (skipFirstDecoSave.current) { skipFirstDecoSave.current = false; return }
    saveFinaleDecoration({ name: chestName, motto: chestMotto, material, stickers, wall })
  }, [chestName, chestMotto, material, stickers, wall])

  const intensity = (completed.size - 1) / (MISSIONS.length - 1)

  // ── sql.js — y retomar el cofre guardado ────────────────────────────────────
  useEffect(() => {
    getSql().then(SQL => {
      const db = new SQL.Database()
      db.run(INIT_SQL)

      const saved = getFinaleProgress()
      if (saved && saved.rows.length > 0) {
        for (const row of saved.rows) {
          db.run('INSERT INTO cofre (id, nombre, cantidad, material) VALUES (?, ?, ?, ?)', [row.id, row.nombre, row.cantidad, row.material])
        }
        setChestOpen(true)
        setCompleted(new Set(saved.completed))
        const done = saved.completed.length >= MISSIONS.length
        setAllDone(done)
        if (done) setOpen(o => ({ ...o, final: true }))
        const idx = Math.min(saved.mIdx, MISSIONS.length - 1)
        setMIdx(idx)
        setCode(MISSIONS[idx].defaultCode)
        setRestored(true)
      }

      dbRef.current = db
      setReady(true)
    })
  }, [])

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

  useEffect(() => {
    if (ready) refreshInventory()
  }, [ready, refreshInventory])

  // ── Guardado de partida ─────────────────────────────────────────────────────
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
    setSavedTick(t => t + 1)
  }, [ready, inventoryRows, completed, mIdx])

  // ── Diluvio de errores ──────────────────────────────────────────────────────
  const closeAllErrors = useCallback(() => {
    setErrWins([])
    setOrder(o => o.filter(id => !id.startsWith('e')))
  }, [])

  const closeError = useCallback((id: number) => {
    setErrWins(w => w.filter(x => x.id !== id))
    setOrder(o => o.filter(x => x !== `e${id}`))
  }, [])

  const spawnErrors = useCallback((text: string, raw?: string) => {
    streakRef.current += 1
    const isMobile = mobileRef.current
    const el = deskRef.current
    const W = isMobile ? window.innerWidth : (el?.clientWidth ?? 900)
    const H = isMobile ? window.innerHeight : (el?.clientHeight ?? 700)
    const wins = buildErrorWindows({
      streak: streakRef.current,
      text, raw,
      tip: RODOLFO_TIPS[MISSIONS[mIdxRef.current].id],
      saved: savedRef.current,
      deskW: W, deskH: H,
    })
    setErrWins(prev => [...prev, ...wins].slice(-9))
    setOrder(prev => [...prev, ...[...wins].reverse().map(w => `e${w.id}`)])
    setShake(true)
    setTimeout(() => setShake(false), 300)
    wins.forEach((w, i) => setTimeout(() => {
      try { if (i === 0) sfx.miss(); else if (i % 2) sfx.glitch(); else sfx.select() } catch {}
    }, w.delay))
  }, [])

  useEffect(() => {
    if (errWins.length === 0) return
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') closeAllErrors() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [errWins.length, closeAllErrors])

  // ── Ventanas ────────────────────────────────────────────────────────────────
  const focus = useCallback((id: string) => {
    setOrder(o => (o[o.length - 1] === id ? o : [...o.filter(x => x !== id), id]))
  }, [])

  const openWin = useCallback((id: WinId) => {
    setOpen(o => ({ ...o, [id]: true }))
    focus(id)
    sfx.select()
  }, [focus])

  const closeWin = useCallback((id: WinId) => {
    setOpen(o => ({ ...o, [id]: false }))
  }, [])

  const zOf = (id: string) => 10 + Math.max(0, order.indexOf(id))
  const activeId = order[order.length - 1]
  const posOf = (id: WinId) => moved[id] ?? defaultPos(id, deskW)

  // ── Reiniciar el cofre ──────────────────────────────────────────────────────
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
    setOpen(o => ({ ...o, final: false }))
    setFeedback(null)
    setResultRows([])
    setResultCols([])
    setUndoRows(null)
    setConfirmReset(false)
    setRestored(false)
    streakRef.current = 0
    timers.current.forEach(clearTimeout)
    setPhase('idle')
    setDownloaded(false)
    setConfirmFight(false)
    closeAllErrors()
  }, [refreshInventory, closeAllErrors])

  // ── Deshacer el último cambio de datos ──────────────────────────────────────
  const undo = useCallback(() => {
    const db = dbRef.current
    if (!db || !undoRows) return
    db.run('DELETE FROM cofre;')
    for (const row of undoRows) {
      db.run('INSERT INTO cofre (id, nombre, cantidad, material) VALUES (?, ?, ?, ?)', [row.id, row.nombre, row.cantidad, row.material])
    }
    refreshInventory()
    setChestOpen(undoRows.length > 0)
    setUndoRows(null)
    setFeedback({ ok: true, msg: 'Deshice el último cambio. Tu cofre volvió a como estaba.' })
    sfx.confirm()
  }, [undoRows, refreshInventory])

  // ── Avanzar de misión ───────────────────────────────────────────────────────
  const advance = useCallback((id: string, nextId: string | null) => {
    setCompleted(prev => {
      const next = new Set(prev)
      next.add(id)
      if (next.size === MISSIONS.length) { setAllDone(true); setPhase('congrats'); setOrder(ord => [...ord.filter(x => x !== 'congrats'), 'congrats']) }
      return next
    })
    try { sfx.jingle() } catch {}
    if (nextId) {
      const nextIdx = MISSIONS.findIndex(m => m.id === nextId)
      if (nextIdx !== -1) {
        setMIdx(nextIdx)
        setCode(MISSIONS[nextIdx].defaultCode)
      }
    }
  }, [])

  // ── Ejecutar SQL ────────────────────────────────────────────────────────────
  const execute = useCallback(async () => {
    const db = dbRef.current
    if (!db || !ready || running) return
    setRunning(true)
    setFeedback(null)
    setResultRows([])
    setResultCols([])
    sfx.attack()

    const sql = code.trim()
    const verb = sql.toUpperCase().split(/\s/)[0]
    const mission = MISSIONS[mIdx]
    const snapshot: FinaleRow[] = inventoryRows.map(r => ({
      id: Number(r[0]), nombre: String(r[1] ?? ''), cantidad: Number(r[2] ?? 1), material: r[3] == null ? null : String(r[3]),
    }))

    try {
      let cols: string[] = []
      let rows: (string | number | null)[][] = []
      let modified = 0

      if (verb === 'SELECT') {
        const res = db.exec(sql)
        cols = res[0]?.columns ?? []
        rows = (res[0]?.values ?? []) as (string | number | null)[][]
      } else {
        db.run(sql)
        modified = db.getRowsModified()
        if (modified > 0) setUndoRows(snapshot)
      }

      setResultCols(cols)
      setResultRows(rows)
      refreshInventory()

      let missionMiss: string | null = null
      if (!completed.has(mission.id)) {
        if (mission.check === 'insert') {
          const cnt = Number(db.exec('SELECT COUNT(*) FROM cofre')[0]?.values[0]?.[0] ?? 0)
          setDropKey(k => k + 1)
          if (cnt >= 2) {
            setChestOpen(true)
            setFeedback({ ok: true, msg: `¡Perfecto! Cargaste ${cnt} ítems al cofre.` })
            advance('insert', 'select')
          } else {
            setChestOpen(true)
            setFeedback({ ok: true, msg: `Ya hay ${cnt} ítem en el cofre. Falta uno más: cambiá el nombre y ejecutá de nuevo.` })
          }
        } else if (mission.check === 'select') {
          setFeedback({ ok: true, msg: `¡Bien! Consultaste el inventario: ${rows.length} ítem(s).` })
          advance('select', 'update')
        } else if (mission.check === 'update') {
          if (modified >= 1) {
            setFeedback({ ok: true, msg: `¡Actualizado! Modificaste ${modified} fila(s).` })
            advance('update', 'delete')
          } else {
            missionMiss = 'No se modificó nada. ¿El WHERE coincide con algún id del cofre?'
          }
        } else if (mission.check === 'delete') {
          if (modified >= 1) {
            setFeedback({ ok: true, msg: `¡Eliminado! Borraste ${modified} fila(s).` })
            advance('delete', null)
          } else {
            missionMiss = 'No se borró nada. ¿El id existe en el cofre?'
          }
        }
      } else {
        setFeedback({ ok: true, msg: verb === 'SELECT' ? `${rows.length} fila(s) encontrada(s).` : `${modified} fila(s) afectada(s).` })
      }

      if (missionMiss) {
        setFeedback({ ok: false, msg: missionMiss })
        spawnErrors(missionMiss)
      } else {
        streakRef.current = 0
        closeAllErrors()
      }
    } catch (err) {
      const raw = (err as Error).message
      setFeedback({ ok: false, msg: 'Error en la consulta. Mirá las ventanitas: ahí te explico qué pasó.' })
      spawnErrors(explainSqlError(raw), raw)
    }

    setRunning(false)
  }, [code, mIdx, ready, running, completed, inventoryRows, advance, refreshInventory, spawnErrors, closeAllErrors])

  // ── La toma de control del Arquitecto (teatro: no toca datos ni progreso) ──
  const runTakeover = useCallback(() => {
    setPhase('takeover')
    setConfirmFight(false)
    closeAllErrors()
    const isMobile = mobileRef.current
    const W = isMobile ? window.innerWidth : (deskRef.current?.clientWidth ?? 900)
    const H = isMobile ? window.innerHeight : (deskRef.current?.clientHeight ?? 700)
    const push = (win: ErrWin, sound: 'glitch' | 'crash' | 'miss') => {
      setErrWins(prev => [...prev, win].slice(-12))
      setOrder(prev => [...prev, `e${win.id}`])
      setShake(true)
      setTimeout(() => setShake(false), 300)
      try { sfx[sound]() } catch {}
    }
    const centered = { x: Math.max(12, Math.round(W / 2 - 180)), y: Math.max(60, Math.round(H / 2 - 150)) }
    const steps: [number, () => void][] = [
      [0, () => push(buildTakeoverWindow('alert', 'ALERTA: EL ARQUITECTO ESTÁ ENTRANDO AL SISTEMA', W, H), 'crash')],
      [1300, () => push(buildTakeoverWindow('alert', 'NO HAY VUELTA ATRÁS. TU COFRE ES MÍO.', W, H), 'glitch')],
      [2500, () => push(buildTakeoverWindow('progress', 'TOMANDO CONTROL DEL SISTEMA...', W, H), 'glitch')],
      [3700, () => push(buildTakeoverWindow('unknown', 'ERROR DESCONOCIDO', W, H), 'miss')],
      [4600, () => push(buildTakeoverWindow('download', '¡RÁPIDO! Descargá tu cofre antes de que el Arquitecto se lo lleve.', W, H, 'ALERTA', centered), 'crash')],
      [5800, () => push(buildTakeoverWindow('critical', 'SISTEMA COMPROMETIDO', W, H), 'glitch')],
      [7000, () => {
        setOpen(o => ({ ...o, final: true }))
        setOrder(ord => [...ord.filter(x => x !== 'final'), 'final'])
        setPhase('idle')
        try { sfx.jingle() } catch {}
      }],
    ]
    steps.forEach(([ms, fn]) => timers.current.push(setTimeout(fn, ms)))
  }, [closeAllErrors])

  // ── Exportar .sql ───────────────────────────────────────────────────────────
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
      setDownloaded(true)
      try { sfx.jingle() } catch {}
    } catch {}
  }, [])

  if (crash) return <CrashTransition href="/finale" />

  const mission = MISSIONS[mIdx]
  const savedCount = inventoryRows.length
  const cycleWall = () => {
    const i = WALLS.findIndex(w => w.id === wall)
    setWall(WALLS[(i + 1) % WALLS.length].id)
    sfx.select()
  }
  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
    if (!next) sfx.select()
  }

  // helper para el borde de cada ventana normal
  const winProps = (id: WinId) => ({
    title: WIN_TITLES[id],
    x: posOf(id).x, y: posOf(id).y, w: widthOf(id, deskW),
    z: zOf(id), active: activeId === id, flow: mobile,
    onFocus: () => focus(id),
    onMove: (x: number, y: number) => setMoved(m => ({ ...m, [id]: { x, y } })),
    onClose: () => closeWin(id),
  })

  // ─────────────── contenido de cada ventana ───────────────

  const cofreBody = (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 96, height: 84, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div className={chestOpen ? undefined : 'chest-bob'} style={{ position: 'relative' }}>
          <PixelBitmap rows={chestOpen ? CHEST_OPEN : CHEST_CLOSED} scale={6} title={chestOpen ? 'Cofre abierto' : 'Cofre cerrado'} />
          <div style={materialOverlayStyle(material, 'hsl(var(--tx) / 0.5)')} />
        </div>
        {dropKey > 0 && (
          <div key={dropKey} className="item-drop" style={{ position: 'absolute', left: '50%', top: 0, marginLeft: -16 }}>
            <PixelBitmap rows={ICON_CUBE} scale={4} />
          </div>
        )}
      </div>

      <div
        className="hatch"
        style={{ border: '2px solid hsl(var(--tx))', padding: 3, width: '100%' }}
      >
        <div style={{ background: 'hsl(var(--surface))', padding: '4px 8px', textAlign: 'center' }}>
          <div style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.04em', color: 'hsl(var(--tx))', lineHeight: 1.1, overflowWrap: 'anywhere' }}>
            {chestName ? `EL COFRE DE ${chestName.toUpperCase()}` : 'EL COFRE DE ___'}
          </div>
          {chestMotto && <div style={{ fontFamily: vt, fontSize: 15, color: 'hsl(var(--tx3))' }}>{chestMotto}</div>}
        </div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={monoLabel}>Nombre en la placa</span>
          <input
            value={chestName}
            onChange={e => setChestName(e.target.value.slice(0, 18))}
            onKeyDown={keySound}
            placeholder="Tu nombre"
            className="input"
            style={{ fontFamily: vt, fontSize: 18 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={monoLabel}>Lema (opcional)</span>
          <input
            value={chestMotto}
            onChange={e => setChestMotto(e.target.value.slice(0, 30))}
            onKeyDown={keySound}
            placeholder="ej: nadie toca mi cofre"
            className="input"
            style={{ fontFamily: vt, fontSize: 18 }}
          />
        </label>
      </div>

      <div style={{ width: '100%' }}>
        <div style={{ ...monoLabel, marginBottom: 5 }}>Material</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
          {MATERIALS.map(mat => (
            <button
              key={mat.id}
              type="button"
              title={mat.name}
              aria-label={`Material ${mat.name}`}
              aria-pressed={material === mat.id}
              onClick={() => { setMaterial(mat.id); sfx.select() }}
              style={{
                aspectRatio: '1', position: 'relative', overflow: 'hidden', cursor: 'pointer', padding: 0,
                background: 'hsl(var(--surface2))',
                border: material === mat.id ? '2px solid hsl(var(--accent))' : '2px solid hsl(var(--border2))',
              }}
            >
              <span style={{ position: 'absolute', inset: 0, ...(mat.id === 'solid' ? { background: 'hsl(var(--tx2))' } : { ...materialOverlayStyle(mat.id, 'hsl(var(--tx2))'), opacity: 1, top: 0, bottom: 0, left: 0, right: 0 }) }} />
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <div style={{ ...monoLabel, marginBottom: 5 }}>Grabados</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['deco1', 'deco2', 'deco3', 'deco4'].map(slot => {
            const st = stickers[slot]
            const bmp = st ? STICKER_BITMAPS[st] : undefined
            return (
              <button
                key={slot}
                type="button"
                onClick={() => { setStickerSlot(stickerSlot === slot ? null : slot); sfx.select() }}
                aria-label="Grabar un símbolo"
                style={{
                  width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  background: 'hsl(var(--surface2))',
                  border: `2px ${bmp ? 'solid' : 'dashed'} ${stickerSlot === slot ? 'hsl(var(--accent))' : 'hsl(var(--border2))'}`,
                  color: 'hsl(var(--tx3))', fontFamily: jersey, fontSize: 18, padding: 0,
                }}
              >
                {bmp ? <PixelBitmap rows={bmp} scale={3} ink="hsl(var(--accent))" /> : '+'}
              </button>
            )
          })}
        </div>
        {stickerSlot && (
          <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap', padding: 6, border: '2px solid hsl(var(--border2))', background: 'hsl(var(--surface2))' }}>
            {STICKER_IDS.map(id => (
              <button
                key={id}
                type="button"
                title={id}
                aria-label={`Grabar ${id}`}
                onClick={() => { setStickers(prev => ({ ...prev, [stickerSlot]: id })); setStickerSlot(null); sfx.confirm() }}
                style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border2))' }}
              >
                <PixelBitmap rows={STICKER_BITMAPS[id]} scale={3} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setStickers(prev => { const n = { ...prev }; delete n[stickerSlot]; return n }); setStickerSlot(null) }}
              style={{ padding: '0 8px', height: 30, cursor: 'pointer', background: 'transparent', border: '1px solid hsl(var(--border2))', color: 'hsl(var(--danger))', fontFamily: vt, fontSize: 16 }}
            >quitar</button>
          </div>
        )}
      </div>

      <div style={{ width: '100%' }}>
        <div style={{ ...monoLabel, marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Contenido · {savedCount}</span>
          {undoRows && (
            <button
              type="button"
              onClick={undo}
              style={{ fontFamily: vt, fontSize: 15, letterSpacing: 0, textTransform: 'none', cursor: 'pointer', background: 'transparent', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--accent))', padding: '0 6px' }}
            >Deshacer</button>
          )}
        </div>
        {inventoryRows.length === 0 ? (
          <div style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx3))' }}>vacío por ahora</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 120, overflow: 'auto' }}>
            {inventoryRows.map((row, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx))' }}>
                <PixelBitmap rows={ICON_CUBE} scale={2} />
                <span style={{ color: 'hsl(var(--tx3))', minWidth: 14 }}>{row[0]}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[1]}</span>
                <span style={{ color: 'hsl(var(--accent))' }}>×{row[2]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  const misionBody = (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {MISSIONS.map((m, i) => {
          const done = completed.has(m.id)
          const active = i === mIdx && !allDone
          const locked = !done && !active
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <span style={{ flex: 1, height: 0, borderTop: i === 0 ? 'none' : `2px dashed ${done || active ? 'hsl(var(--accent))' : 'hsl(var(--border2))'}` }} />
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => { if (!locked && !MISSIONS[i].check.startsWith('pre')) { setMIdx(i); setCode(MISSIONS[i].defaultCode); sfx.select() } }}
                  aria-label={`Paso ${i + 1}: ${m.label}`}
                  aria-current={active ? 'step' : undefined}
                  className={active ? 'chest-bob' : undefined}
                  style={{
                    width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    fontFamily: jersey, fontSize: 18, cursor: locked ? 'default' : 'pointer',
                    border: `2px solid ${done || active ? 'hsl(var(--accent))' : 'hsl(var(--border2))'}`,
                    background: done ? 'hsl(var(--accent))' : 'hsl(var(--surface2))',
                    color: done ? 'hsl(var(--bg))' : active ? 'hsl(var(--tx))' : 'hsl(var(--tx3))',
                    opacity: locked ? 0.55 : 1,
                  }}
                >
                  {done ? <PixelBitmap rows={ICON_CHECK} scale={3} ink="hsl(var(--bg))" /> : i + 1}
                </button>
                <span style={{ flex: 1, height: 0, borderTop: i === MISSIONS.length - 1 ? 'none' : `2px dashed ${done ? 'hsl(var(--accent))' : 'hsl(var(--border2))'}` }} />
              </div>
              <span style={{ fontFamily: vt, fontSize: 15, lineHeight: 1, textAlign: 'center', color: done ? 'hsl(var(--accent))' : active ? 'hsl(var(--tx))' : 'hsl(var(--tx3))' }}>
                {m.verb}
              </span>
            </div>
          )
        })}
      </div>

      {allDone ? (
        <div style={{ fontFamily: vt, fontSize: 20, color: 'hsl(var(--accent))', lineHeight: 1.25 }}>
          ¡Completaste las 5 misiones! Abrí mi_inventario.sql en el escritorio.
        </div>
      ) : (
        <div>
          <div style={{ fontFamily: jersey, fontSize: 24, letterSpacing: '0.03em', color: 'hsl(var(--tx))', lineHeight: 1.05, marginBottom: 4 }}>
            Paso {mIdx + 1}: {mission.label}
          </div>
          <div style={{ fontFamily: vt, fontSize: 20, color: 'hsl(var(--tx2))', lineHeight: 1.25, maxWidth: '62ch' }}>{mission.instruction}</div>
          {mission.hint && (
            <div style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx3))', marginTop: 5 }}>
              <span style={{ color: 'hsl(var(--accent))', fontFamily: 'ui-monospace, Consolas, monospace' }}>&gt; </span>{mission.hint}
            </div>
          )}
        </div>
      )}
    </div>
  )

  const consolaBody = (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {mission.check === 'pre' ? (
        <pre style={{ fontFamily: vt, fontSize: 18, margin: 0, padding: '8px 10px', background: 'hsl(var(--bg))', color: 'hsl(var(--tx2))', border: '2px solid hsl(var(--border2))', overflowX: 'auto' }}>
          {mission.defaultCode}
        </pre>
      ) : (
        <>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => {
              keySound(e)
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
              width: '100%', boxSizing: 'border-box', background: 'hsl(var(--bg))', color: 'hsl(var(--tx))',
              border: '2px solid hsl(var(--tx))', fontFamily: vt, fontSize: 20, padding: '8px 10px',
              resize: 'vertical', lineHeight: 1.35, caretColor: 'hsl(var(--accent))',
            }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => void execute()}
              disabled={running || !ready}
              className="cta-btn cta-btn--primary"
              style={{ fontSize: 13, padding: '9px 16px', 
                
                cursor: running ? 'wait' : 'pointer',
                opacity: running || !ready ? 0.55 : 1,
              }}
            >
              {ready ? (running ? '…' : 'Ejecutar') : 'Cargando…'}
            </button>
            <span style={{ ...monoLabel, letterSpacing: '0.06em', textTransform: 'none' }}>Ctrl + Enter</span>
          </div>
        </>
      )}

      {feedback && (
        <div
          role="status"
          style={{
            fontFamily: vt, fontSize: 19, padding: '6px 10px',
            color: feedback.ok ? 'hsl(var(--accent))' : 'hsl(var(--danger))',
            border: `2px solid ${feedback.ok ? 'hsl(var(--accent))' : 'hsl(var(--danger))'}`,
          }}
        >
          <StatusMark ok={feedback.ok} scale={2} />{feedback.msg}
        </div>
      )}
      {resultRows.length > 0 && <ResultTable cols={resultCols} rows={resultRows} />}
    </div>
  )

  const finalBody = (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="animate-ascii-flicker" style={{ fontFamily: jersey, fontSize: 30, letterSpacing: '0.05em', color: 'hsl(var(--accent))', lineHeight: 1 }}>
        SISTEMA COMPROMETIDO
      </div>
      <div style={{ fontFamily: vt, fontSize: 20, color: 'hsl(var(--tx2))', lineHeight: 1.3 }}>
        El Arquitecto ya controla el sistema, pero tu cofre todavía es tuyo. Descargá el archivo SQL y guardalo en tu compu: después podés abrirlo en VS Code o en DB Browser y el cofre va a estar ahí.
      </div>
      {inventoryRows.length > 0 && (
        <ResultTable cols={['id', 'nombre', 'cantidad', 'material']} rows={inventoryRows} />
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={exportSQL}
          style={{ fontFamily: jersey, fontSize: 20, padding: '8px 18px', cursor: 'pointer', background: downloaded ? 'transparent' : 'hsl(var(--tx))', color: downloaded ? 'hsl(var(--tx))' : 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <PixelBitmap rows={ICON_FILE} scale={2} ink={downloaded ? undefined : 'hsl(var(--bg))'} /> {downloaded ? 'Descargado (otra vez)' : 'Descargar mi_inventario.sql'}
        </button>
        <button
          type="button"
          onClick={() => { if (downloaded) setCrash(true); else setConfirmFight(true) }}
          className="cta-btn cta-btn--primary"
          style={{ fontSize: 13, padding: '9px 16px',  cursor: 'pointer', color: 'hsl(var(--bg))' }}
        >
          Enfrentar al Arquitecto
        </button>
      </div>
      {confirmFight && !downloaded && (
        <div role="alert" style={{ border: '2px solid hsl(var(--danger))', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: vt, fontSize: 19, color: 'hsl(var(--danger))', lineHeight: 1.2 }}>
            ¿ESTÁS SEGURO? Todavía no descargaste tu cofre. Si el Arquitecto gana, se lo lleva.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={exportSQL} style={{ fontFamily: jersey, fontSize: 17, padding: '4px 14px', cursor: 'pointer', background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))' }}>Descargar primero</button>
            <button type="button" onClick={() => setCrash(true)} style={{ fontFamily: jersey, fontSize: 17, padding: '4px 14px', cursor: 'pointer', background: 'transparent', color: 'hsl(var(--tx))', border: '2px solid hsl(var(--tx))' }}>Enfrentar igual</button>
          </div>
        </div>
      )}
    </div>
  )

  const iconItems: { key: string; label: string; bmp: readonly string[]; onClick: () => void; disabled?: boolean }[] = [
    { key: 'cofre', label: 'Mi cofre', bmp: chestOpen ? CHEST_OPEN : CHEST_CLOSED, onClick: () => openWin('cofre') },
    { key: 'mision', label: 'Misión', bmp: ICON_FOLDER, onClick: () => openWin('mision') },
    { key: 'consola', label: 'Consola SQL', bmp: ICON_TERMINAL, onClick: () => openWin('consola') },
    { key: 'fondo', label: 'Fondo', bmp: ICON_WALL, onClick: cycleWall },
    { key: 'final', label: 'mi_inventario .sql', bmp: ICON_FILE, onClick: () => openWin('final'), disabled: !allDone },
  ]

  return (
    <main style={{ minHeight: '100vh', background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', position: 'relative', overflow: 'hidden', padding: '16px 12px' }}>
      <CrashOverlay intensity={intensity * 0.45} accentTriplet={accentTriplet} />

      <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div
          ref={deskRef}
          className={`desk${shake ? ' desk-shake' : ''}${phase === 'takeover' ? ' animate-ascii-flicker' : ''}`}
          style={{
            position: 'relative',
            minHeight: mobile ? undefined : 720,
            paddingBottom: mobile ? 0 : 34,
            overflow: 'hidden',
            border: '2px solid hsl(var(--tx))',
            background: 'hsl(var(--bg))',
            ...wallStyle(wall),
            display: mobile ? 'flex' : 'block',
            flexDirection: 'column',
          }}
        >
          {/* El Arquitecto mira todo desde el fondo */}
          <div
            aria-hidden="true"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(72%, 680px)', opacity: 0.1, pointerEvents: 'none', zIndex: 0 }}
          >
            <ArchitectCanvas mode="ascii" integrity={1} color={`hsl(${accentTriplet})`} bg="transparent" glitchy={false} label="" />
          </div>

          {/* Menú superior */}
          <div
            style={{
              position: mobile ? 'relative' : 'absolute', top: 0, left: 0, right: 0, height: 28, zIndex: 900,
              display: 'flex', alignItems: 'center', gap: mobile ? 8 : 14, padding: '0 10px', whiteSpace: 'nowrap', overflow: 'hidden',
              background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))',
            }}
          >
            <span style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.08em' }}>PYCRAFT OS</span>
            {restored && <span style={{ ...monoLabel, color: 'hsl(var(--accent))' }}>Retomaste tu cofre</span>}
            <span style={{ flex: 1 }} />
            {errWins.length >= 2 && (
              <button
                type="button"
                onClick={closeAllErrors}
                style={{ fontFamily: jersey, fontSize: 15, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', background: 'hsl(var(--danger))', color: 'hsl(var(--bg))', border: 'none', padding: '2px 10px' }}
              >
                {mobile ? `Cerrar ${errWins.length}` : `Cerrar ${errWins.length} errores (Esc)`}
              </button>
            )}
            <span key={savedTick} style={{ ...monoLabel, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'hsl(var(--tx2))' }}>
              <span className="status-dot active win-pop" />
              {mobile ? 'Guardado' : 'Autoguardado'}
            </span>
            <span style={{ ...monoLabel, color: 'hsl(var(--tx2))', fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
          </div>

          {/* Íconos */}
          <div
            style={{
              position: mobile ? 'relative' : 'absolute', left: mobile ? undefined : 12, top: mobile ? undefined : 40, zIndex: 5,
              display: 'flex', flexDirection: mobile ? 'row' : 'column', flexWrap: 'wrap', gap: mobile ? 4 : 10,
              padding: mobile ? '8px' : 0,
            }}
          >
            {iconItems.map(it => (
              <button key={it.key} type="button" className="desk-icon" onClick={it.onClick} disabled={it.disabled} title={it.disabled ? 'Se habilita al terminar las 5 misiones' : it.label}>
                <PixelBitmap rows={it.bmp} scale={4} />
                <span className="desk-lbl">{it.label}</span>
              </button>
            ))}
          </div>

          {/* Ventanas */}
          <div style={{ position: 'relative', display: mobile ? 'flex' : 'contents', flexDirection: 'column', gap: 14, padding: mobile ? '4px 8px 12px' : 0 }}>
            {open.cofre && <DeskWindow {...winProps('cofre')}>{cofreBody}</DeskWindow>}
            {open.mision && <DeskWindow {...winProps('mision')}>{misionBody}</DeskWindow>}
            {open.consola && <DeskWindow {...winProps('consola')}>{consolaBody}</DeskWindow>}
            {open.final && allDone && <DeskWindow {...winProps('final')} tone="safe">{finalBody}</DeskWindow>}
          </div>

          {/* Felicitaciones al terminar las 5 misiones */}
          {phase === 'congrats' && (
            <DeskWindow
              title="¡FELICITACIONES!"
              x={moved.congrats?.x ?? Math.max(12, Math.round((deskW - 440) / 2))}
              y={moved.congrats?.y ?? (mobile ? 60 : 120)}
              w={440}
              z={zOf('congrats') + 100}
              active
              fixed={mobile}
              tone="safe"
              onFocus={() => focus('congrats')}
              onMove={(x, y) => setMoved(m => ({ ...m, congrats: { x, y } }))}
            >
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
                <div style={{ fontFamily: jersey, fontSize: 32, letterSpacing: '0.04em', lineHeight: 1, color: 'hsl(var(--accent))' }}>¡LO LOGRASTE!</div>
                <div style={{ fontFamily: vt, fontSize: 21, lineHeight: 1.25, color: 'hsl(var(--tx))' }}>
                  Armaste tu propio cofre con SQL de verdad: CREATE, INSERT, SELECT, UPDATE y DELETE. Eso es lo que hace un programador todos los días.
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <PixelBitmap rows={CHEST_OPEN} scale={3} />
                  <span style={{ fontFamily: vt, fontSize: 19, color: 'hsl(var(--tx2))' }}>
                    {savedCount} {savedCount === 1 ? 'ítem guardado' : 'ítems guardados'} en {chestName ? `el cofre de ${chestName}` : 'tu cofre'}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={runTakeover}
                  className="cta-btn cta-btn--primary"
                  style={{ fontSize: 13, padding: '9px 16px',  alignSelf: 'flex-start', cursor: 'pointer', color: 'hsl(var(--bg))' }}
                >
                  Seguir
                </button>
                {!reducedMotionRef.current && Array.from({ length: 22 }, (_, i) => {
                  const a = (i / 22) * Math.PI * 2
                  const d = 60 + (i % 4) * 26
                  return (
                    <span
                      key={i}
                      aria-hidden="true"
                      style={{
                        position: 'absolute', left: '50%', top: 34, width: 5, height: 5, pointerEvents: 'none',
                        background: i % 3 === 0 ? 'hsl(var(--accent))' : i % 3 === 1 ? 'hsl(var(--tx))' : 'hsl(var(--tx2))',
                        animation: `pixel-burst ${700 + (i % 5) * 120}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                        ['--dx' as string]: `${Math.cos(a) * d}px`,
                        ['--dy' as string]: `${Math.sin(a) * d * 0.7}px`,
                      } as CSSProperties}
                    />
                  )
                })}
              </div>
            </DeskWindow>
          )}

          {/* Diluvio de errores */}
          {errWins.map(w => (
            <DeskWindow
              key={w.id}
              title={w.title}
              x={mobile ? Math.min(w.x, 24) : w.x}
              y={moved[`e${w.id}`]?.y ?? w.y}
              w={Math.min(w.w, mobile ? 320 : w.w)}
              z={zOf(`e${w.id}`) + 100}
              active={activeId === `e${w.id}`}
              fixed={mobile}
              tone={w.kind === 'safe' ? 'safe' : 'danger'}
              popDelay={w.delay}
              onFocus={() => focus(`e${w.id}`)}
              onMove={(x, y) => setMoved(m => ({ ...m, [`e${w.id}`]: { x, y } }))}
              onClose={() => closeError(w.id)}
            >
              <ErrorBody win={w} onClose={() => closeError(w.id)} onCloseAll={closeAllErrors} onDownload={exportSQL} />
            </DeskWindow>
          ))}

          {/* Barra de tareas */}
          <div
            style={{
              position: mobile ? 'relative' : 'absolute', bottom: 0, left: 0, right: 0, height: 34, zIndex: 900,
              display: 'flex', alignItems: 'center', gap: 12, padding: mobile ? '0 10px' : '0 96px 0 10px',
              background: 'hsl(var(--surface))', borderTop: '2px solid hsl(var(--tx))', marginTop: mobile ? 'auto' : undefined,
            }}
          >
            <div style={{ display: 'flex', gap: 3 }} aria-label={`${completed.size - 1} de 4 misiones hechas`}>
              {MISSIONS.map((m, i) => (
                <span
                  key={m.id}
                  style={{
                    width: 22, height: 12,
                    background: completed.has(m.id) ? 'hsl(var(--accent))' : 'transparent',
                    border: `2px solid ${completed.has(m.id) ? 'hsl(var(--accent))' : 'hsl(var(--border2))'}`,
                    transition: 'background 0.3s',
                  }}
                  title={`${i + 1}. ${m.label}`}
                />
              ))}
            </div>
            <span style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx2))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {allDone ? 'Sistema comprometido' : `Paso ${mIdx + 1}/5 · ${mission.label}`}
            </span>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={toggleMute} aria-pressed={!muted} style={{ ...monoLabel, cursor: 'pointer', background: 'none', border: 'none', color: 'hsl(var(--tx2))' }}>
              Sonido {muted ? 'off' : 'on'}
            </button>
            {confirmReset ? (
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <span style={monoLabel}>¿Borrar el cofre?</span>
                <button type="button" onClick={resetProject} style={{ ...monoLabel, cursor: 'pointer', background: 'none', border: '1px solid hsl(var(--danger))', color: 'hsl(var(--danger))', padding: '1px 6px' }}>Sí</button>
                <button type="button" onClick={() => setConfirmReset(false)} style={{ ...monoLabel, cursor: 'pointer', background: 'none', border: 'none' }}>No</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmReset(true)} style={{ ...monoLabel, cursor: 'pointer', background: 'none', border: 'none', color: 'hsl(var(--tx2))' }}>
                Reiniciar
              </button>
            )}
          </div>
        </div>
      </div>

      <MascotGuide tip={!allDone ? RODOLFO_TIPS[mission.id] : undefined} />
    </main>
  )
}
