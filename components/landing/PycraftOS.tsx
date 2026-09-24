'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import DeskWindow from '@/components/game/architect/desktop/DeskWindow'
import {
  PixelBitmap, ICON_FOLDER, ICON_TERMINAL, ICON_BIN, ICON_BIN_OPEN, ICON_WARN, type Bitmap,
} from '@/components/game/architect/desktop/PixelBitmap'
import { IconSnake, IconDatabase, IconSword } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'

// Primer acercamiento a PyCraft OS: las tres fases del taller como carpetas y
// programas de un escritorio. Se abren, se arrastran y se apilan. La papelera
// no acepta nada: explica por qué.

interface Phase {
  id: string
  file: string
  kind: 'folder' | 'exe'
  bmp: Bitmap
  step: string
  title: string
  colorVar: string
  icon: ReactNode
  desc: string
  at: { x: number; y: number }
}

const PHASES: Phase[] = [
  {
    id: 'python', file: '01_python', kind: 'folder', bmp: ICON_FOLDER, step: '01', title: 'Aprendés Python', colorVar: '--python',
    icon: <IconSnake size={28} color="hsl(var(--python))" />,
    desc: 'Variables, condicionales, bucles, listas y funciones. El arsenal base para el combate contra los primeros 6 jefes.',
    at: { x: 130, y: 44 },
  },
  {
    id: 'sqlite', file: '02_sqlite.exe', kind: 'exe', bmp: ICON_TERMINAL, step: '02', title: 'Aprendés SQLite', colorVar: '--sql',
    icon: <IconDatabase size={28} color="hsl(var(--sql))" />,
    desc: 'CREATE, SELECT, WHERE, GROUP BY, UPDATE, DELETE. La base de datos al servicio del código. Jefes 7 al 10.',
    at: { x: 200, y: 96 },
  },
  {
    id: 'integracion', file: '03_integracion', kind: 'folder', bmp: ICON_FOLDER, step: '03', title: 'Integrás y derrotás', colorVar: '--accent',
    icon: <IconSword size={28} color="hsl(var(--accent))" />,
    desc: 'Python + sqlite3 combinados. Proyectos reales: sistema de inventario, búsqueda, actualización. Jefes 11 al 14.',
    at: { x: 270, y: 148 },
  },
]

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const monoLabel = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'hsl(var(--tx3))' }

const BIN_MESSAGE =
  'Pedagógicamente cada parte está pensada para gamificar, acompañar y aprender con nuevas metodologías. Próximamente se suman más herramientas a la aventura que te acompaña en el aprendizaje.'

const WIN_W = 340

export default function PycraftOS() {
  const deskRef = useRef<HTMLDivElement>(null)
  const binRef = useRef<HTMLDivElement>(null)
  const [deskW, setDeskW] = useState(0)
  const [open, setOpen] = useState<Record<string, boolean>>({ python: true, sqlite: false, integracion: false })
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({})
  const [order, setOrder] = useState<string[]>(['python'])
  const [binHot, setBinHot] = useState(false)
  const [binShake, setBinShake] = useState(false)
  const [error, setError] = useState<{ x: number; y: number } | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number; bmp: Bitmap } | null>(null)
  const safe = useRef<Record<string, { x: number; y: number }>>({})
  const dragMoved = useRef(false)

  const mobile = deskW > 0 && deskW < 720

  useEffect(() => {
    const el = deskRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setDeskW(el.clientWidth))
    ro.observe(el)
    setDeskW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const overBin = useCallback((cx: number, cy: number) => {
    const r = binRef.current?.getBoundingClientRect()
    if (!r) return false
    const pad = 14
    return cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad
  }, [])

  const focus = useCallback((id: string) => {
    setOrder(o => (o[o.length - 1] === id ? o : [...o.filter(x => x !== id), id]))
  }, [])

  const openWin = useCallback((id: string) => {
    setOpen(o => ({ ...o, [id]: true }))
    focus(id)
    sfx.open()
  }, [focus])

  const reject = useCallback(() => {
    const W = deskRef.current?.clientWidth ?? 800
    setError({ x: Math.max(12, Math.round((W - 400) / 2)), y: 96 })
    setBinShake(true)
    setTimeout(() => setBinShake(false), 420)
    sfx.trash()
    setTimeout(() => sfx.error(), 180)
  }, [])

  const posOf = (p: Phase) => pos[p.id] ?? p.at
  const activeId = order[order.length - 1]

  // ── Arrastrar un ícono hacia la papelera ─────────────────────────────────────
  const iconPointerDown = (e: React.PointerEvent<HTMLButtonElement>, p: Phase) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    dragMoved.current = false
    const sx = e.clientX
    const sy = e.clientY
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const move = (ev: PointerEvent) => {
      if (!dragMoved.current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return
      dragMoved.current = true
      setGhost({ x: ev.clientX, y: ev.clientY, bmp: p.bmp })
      setBinHot(overBin(ev.clientX, ev.clientY))
    }
    const up = (ev: PointerEvent) => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      if (dragMoved.current && overBin(ev.clientX, ev.clientY)) reject()
      setGhost(null)
      setBinHot(false)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  return (
    <div>
      <div
        ref={deskRef}
        className="desk"
        style={{
          position: 'relative',
          minHeight: mobile ? undefined : 500,
          overflow: 'hidden',
          border: '2px solid hsl(var(--tx))',
          background: 'hsl(var(--bg))',
          backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.18) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          boxShadow: '6px 6px 0 hsl(var(--tx) / 0.18)',
          display: mobile ? 'flex' : 'block',
          flexDirection: 'column',
        }}
      >
        {/* Menú superior */}
        <div
          style={{
            position: mobile ? 'relative' : 'absolute', top: 0, left: 0, right: 0, height: 28, zIndex: 900,
            display: 'flex', alignItems: 'center', gap: 12, padding: '0 10px', whiteSpace: 'nowrap', overflow: 'hidden',
            background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))',
          }}
        >
          <span style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.08em' }}>PYCRAFT OS</span>
          <span style={{ flex: 1 }} />
          <span className="hidden sm:inline" style={{ ...monoLabel, color: 'hsl(var(--tx2))' }}>Abrí las carpetas · arrastrá las ventanas</span>
        </div>

        {/* Íconos */}
        <div
          style={{
            position: mobile ? 'relative' : 'absolute', left: mobile ? undefined : 10, top: mobile ? undefined : 40, zIndex: 5,
            display: 'flex', flexDirection: mobile ? 'row' : 'column', flexWrap: 'wrap', gap: mobile ? 6 : 10, padding: mobile ? 8 : 0,
          }}
        >
          {PHASES.map(p => (
            <button
              key={p.id}
              type="button"
              className="desk-icon"
              onPointerDown={e => iconPointerDown(e, p)}
              onClick={() => { if (!dragMoved.current) openWin(p.id) }}
              style={{ touchAction: 'none' }}
              title={`Abrir ${p.file}`}
            >
              <PixelBitmap rows={p.bmp} scale={4} />
              <span className="desk-lbl">{p.file}</span>
            </button>
          ))}
        </div>

        {/* Ventanas */}
        <div style={{ position: 'relative', display: mobile ? 'flex' : 'contents', flexDirection: 'column', gap: 14, padding: mobile ? '4px 8px 12px' : 0 }}>
          {PHASES.filter(p => open[p.id]).map(p => (
            <DeskWindow
              key={p.id}
              title={p.file}
              x={posOf(p).x}
              y={posOf(p).y}
              w={WIN_W}
              z={10 + order.indexOf(p.id)}
              active={activeId === p.id}
              flow={mobile}
              onFocus={() => focus(p.id)}
              onMove={(x, y, cx, cy) => {
                setPos(m => ({ ...m, [p.id]: { x, y } }))
                const hot = overBin(cx, cy)
                setBinHot(hot)
                if (!hot) safe.current[p.id] = { x, y }
              }}
              onDragEnd={(cx, cy) => {
                if (overBin(cx, cy)) {
                  const back = safe.current[p.id] ?? p.at
                  setPos(m => ({ ...m, [p.id]: back }))
                  reject()
                }
                setBinHot(false)
              }}
              onClose={() => setOpen(o => ({ ...o, [p.id]: false }))}
            >
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontFamily: jersey, fontSize: 30, lineHeight: 1, color: `hsl(var(${p.colorVar}))` }}>{p.step}</span>
                  {p.icon}
                </div>
                <div style={{ fontFamily: jersey, fontSize: 26, lineHeight: 1.05, color: `hsl(var(${p.colorVar}))` }}>{p.title}</div>
                <p style={{ fontFamily: vt, fontSize: 21, lineHeight: 1.22, color: 'hsl(var(--tx2))', margin: 0 }}>{p.desc}</p>
              </div>
            </DeskWindow>
          ))}
        </div>

        {/* Papelera */}
        <div
          ref={binRef}
          className={binShake ? 'desk-shake' : undefined}
          style={{
            position: mobile ? 'relative' : 'absolute', right: mobile ? undefined : 16, bottom: mobile ? undefined : 44, zIndex: 5,
            alignSelf: mobile ? 'flex-end' : undefined, margin: mobile ? '0 12px 8px' : 0,
          }}
        >
          <button
            type="button"
            className="desk-icon"
            onClick={() => reject()}
            style={{ outline: binHot ? '2px dashed hsl(var(--danger))' : undefined, outlineOffset: 2 }}
            title="Papelera de reciclaje"
          >
            <PixelBitmap rows={binHot ? ICON_BIN_OPEN : ICON_BIN} scale={4} />
            <span className="desk-lbl">Papelera</span>
          </button>
        </div>

        {/* Error de la papelera */}
        {error && (
          <DeskWindow
            title="PAPELERA.EXE"
            x={error.x}
            y={error.y}
            w={400}
            z={500}
            active
            flow={mobile}
            tone="danger"
            onFocus={() => {}}
            onMove={(x, y) => setError({ x, y })}
            onClose={() => setError(null)}
          >
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <PixelBitmap rows={ICON_WARN} scale={4} />
                <div>
                  <div style={{ fontFamily: jersey, fontSize: 22, lineHeight: 1, color: 'hsl(var(--danger))', letterSpacing: '0.04em' }}>NO SE PUEDE ELIMINAR</div>
                  <p style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx))', margin: '6px 0 0' }}>{BIN_MESSAGE}</p>
                </div>
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  style={{ fontFamily: jersey, fontSize: 17, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 22px', cursor: 'pointer', background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))' }}
                >
                  Entendido
                </button>
              </div>
            </div>
          </DeskWindow>
        )}

        {/* Barra de tareas */}
        <div
          style={{
            position: mobile ? 'relative' : 'absolute', bottom: 0, left: 0, right: 0, height: 34, zIndex: 900,
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', overflow: 'hidden',
            background: 'hsl(var(--surface))', borderTop: '2px solid hsl(var(--tx))', marginTop: mobile ? 'auto' : undefined,
          }}
        >
          {PHASES.filter(p => open[p.id]).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => focus(p.id)}
              style={{
                fontFamily: vt, fontSize: 17, lineHeight: 1, padding: '2px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                background: activeId === p.id ? 'hsl(var(--tx))' : 'transparent',
                color: activeId === p.id ? 'hsl(var(--bg))' : 'hsl(var(--tx2))',
                border: '2px solid hsl(var(--tx))',
              }}
            >
              {p.file}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ ...monoLabel, color: 'hsl(var(--tx2))' }}>{PHASES.filter(p => open[p.id]).length} abiertas</span>
        </div>
      </div>

      {/* Ícono fantasma mientras se arrastra */}
      {ghost && (
        <div aria-hidden="true" style={{ position: 'fixed', left: ghost.x - 24, top: ghost.y - 24, zIndex: 1000, pointerEvents: 'none', opacity: 0.85 }}>
          <PixelBitmap rows={ghost.bmp} scale={4} />
        </div>
      )}
    </div>
  )
}
