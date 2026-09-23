'use client'

// ─────────────────────────────────────────────────────────────────────────
// PÁGINA DE PRUEBA — no forma parte del sitio (no está linkeada desde
// ningún lado). Propuesta para rediseñar "Cómo funciona" como 3 carpetas
// retro pixel-art: click para abrir (revela la info hacia arriba, como si
// la carpeta escupiera un papel), arrastrables, con un tacho de basura
// abajo a la derecha que NUNCA borra nada — solo rechaza con un gesto
// (no un sonido de error) y la carpeta vuelve sola a su lugar.
//
// Los íconos (carpeta, tacho) están hechos acá con el mismo lenguaje que
// PixelIcons.tsx (rects de 2x2 sobre una grilla de 16x16, fill="currentColor")
// — si se aprueba, se migran a ese archivo. IconSnake/IconDatabase/IconSword
// SÍ son los reales, importados del proyecto, para no duplicar esos.
// ─────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react'
import { IconSnake, IconDatabase, IconSword } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'

// ── Carpeta — papel asomando atrás + tapa con muesca adelante ───────────
// Grilla de 1px (no la convención de 2x2 del resto de PixelIcons.tsx: este
// ícono necesita más detalle para el corte irregular de la solapa y el
// papel asomando, referencia del usuario). Filas como [y, x, ancho] — se
// puede repetir el mismo y con otro x/w para dejar un hueco en el medio
// de una fila (así el papel asoma por una MUESCA, no por una diagonal
// completa que se leía como una cuña en vez de una carpeta).
type Row = [number, number, number]

const PAPER_ROWS: Row[] = [
  [0, 3, 5],
  [1, 3, 5],
  [2, 1, 13],
  [3, 1, 13],
  [4, 1, 14],
  [5, 4, 6],   // asoma justo por la muesca de la tapa
]

const FLAP_ROWS: Row[] = [
  [5, 0, 4], [5, 10, 6],   // muesca: hueco en el medio de esta fila
  [6, 0, 3], [6, 12, 4],   // la muesca se va cerrando
  [7, 0, 16],              // de acá para abajo, ancho completo — la tapa
  [8, 0, 16],              // domina el ícono, el papel solo asoma arriba
  [9, 0, 16],
  [10, 0, 16],
  [11, 0, 16],
  [12, 0, 16],
  [13, 0, 16],
  [14, 0, 16],
  [15, 0, 16],
]

function PixelRows({ rows, fill }: { rows: Row[]; fill: string }) {
  return (
    <>
      {rows.map(([y, x, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={1} fill={fill} />
      ))}
    </>
  )
}

function FolderGlyph({ size = 44, color, open }: { size?: number; color: string; open: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ imageRendering: 'pixelated', display: 'block', filter: 'drop-shadow(1px 1.5px 0 rgba(0,0,0,0.4))' }}
      aria-hidden="true"
    >
      {/* Papel — asoma detrás, se corre un toque hacia arriba al abrir */}
      <g
        style={{
          transformBox: 'fill-box',
          transformOrigin: 'bottom',
          transform: open ? 'translateY(-1.5px)' : 'none',
          transition: 'transform 0.25s steps(4)',
        }}
      >
        <PixelRows rows={PAPER_ROWS} fill="hsl(var(--tx))" />
      </g>
      {/* Tapa — gira como bisagra desde abajo, con corte escalonado (no
          una línea recta) para que se lea como una solapa real */}
      <g
        style={{
          transformBox: 'fill-box',
          transformOrigin: 'bottom',
          transform: open ? 'rotate(-16deg) translateY(-1px)' : 'none',
          transition: 'transform 0.25s steps(5)',
        }}
      >
        <PixelRows rows={FLAP_ROWS} fill={color} />
      </g>
    </svg>
  )
}

// ── Tacho de basura — mismo lenguaje, sin animación propia (la maneja el padre) ──
function TrashGlyph({ size = 40, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated', display: 'block' }} aria-hidden="true">
      <g fill={color}>
        <rect x="6" y="0" width="4" height="2" />
        <rect x="3" y="2" width="10" height="2" />
        <rect x="4" y="4" width="8" height="10" />
      </g>
    </svg>
  )
}

const FOLDERS = [
  {
    id: 'python',
    step: '01',
    title: 'Aprendés Python',
    color: 'hsl(var(--python))',
    Icon: IconSnake,
    desc: 'Variables, condicionales, bucles, listas y funciones. El arsenal base para el combate contra los primeros 6 jefes.',
  },
  {
    id: 'sqlite',
    step: '02',
    title: 'Aprendés SQLite',
    color: 'hsl(var(--sql))',
    Icon: IconDatabase,
    desc: 'CREATE, SELECT, WHERE, GROUP BY, UPDATE, DELETE. La base de datos al servicio del código. Jefes 7 al 10.',
  },
  {
    id: 'integracion',
    step: '03',
    title: 'Integrás y derrotás',
    color: 'hsl(var(--accent))',
    Icon: IconSword,
    desc: 'Python + sqlite3 combinados. Proyectos reales: sistema de inventario, búsqueda, actualización. Jefes 11 al 14.',
  },
] as const

function FolderCard({
  data, trashRef, onDragOverTrash, onDropOutcome,
}: {
  data: (typeof FOLDERS)[number]
  trashRef: React.RefObject<HTMLDivElement>
  onDragOverTrash: (over: boolean) => void
  onDropOutcome: (onTrash: boolean) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [returning, setReturning] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const start = useRef({ x: 0, y: 0, moved: false })

  const handlePointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, moved: false }
    // Puede fallar si el pointer ya no está activo (soltó justo antes, o
    // un caso límite de touch) — no es algo que el usuario tenga que ver.
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch {}
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (!start.current.moved && Math.hypot(dx, dy) > 6) {
      start.current.moved = true
      setDragging(true)
      setOpen(false)
    }
    if (start.current.moved) {
      setPos({ x: dx, y: dy })
      const t = trashRef.current
      if (t) {
        const tr = t.getBoundingClientRect()
        const over = e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom
        onDragOverTrash(over)
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (start.current.moved) {
      const t = trashRef.current
      const f = ref.current
      let onTrash = false
      if (t && f) {
        const tr = t.getBoundingClientRect()
        const fr = f.getBoundingClientRect()
        onTrash = !(fr.right < tr.left || fr.left > tr.right || fr.bottom < tr.top || fr.top > tr.bottom)
      }
      onDropOutcome(onTrash)
      onDragOverTrash(false)
      setDragging(false)
      setReturning(true)
      setPos({ x: 0, y: 0 })
      setTimeout(() => setReturning(false), 320)
    } else {
      setOpen((o) => !o)
    }
    start.current.moved = false
  }

  const { Icon, step, title, color, desc } = data

  return (
    <div
      ref={ref}
      className={['folder-card', dragging ? 'is-dragging' : '', returning ? 'is-returning' : ''].filter(Boolean).join(' ')}
      data-open={open || undefined}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="button"
      tabIndex={0}
      aria-label={`${title} — click para ver el detalle`}
    >
      <div className="folder-panel" style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}>
        <div className="folder-panel-titlebar" style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}>
          <div className="pv-dots">
            <span style={{ background: '#FF5F57' }} />
            <span style={{ background: '#FEBC2E' }} />
            <span style={{ background: '#28C840' }} />
          </div>
          <button
            type="button"
            className="folder-panel-close"
            onClick={(e) => { e.stopPropagation(); setOpen(false) }}
            aria-label="Cerrar"
          >×</button>
        </div>
        <div className="folder-panel-body">
          <div className="folder-panel-head">
            <span className="folder-panel-step" style={{ color }}>{step}</span>
            <Icon size={20} color={color} />
          </div>
          <div className="folder-panel-title" style={{ color }}>{title}</div>
          <p className="folder-panel-desc">{desc}</p>
        </div>
      </div>

      <div className="folder-glyph-wrap">
        <FolderGlyph color={color} open={open} size={48} />
      </div>
      <span className="folder-label" style={{ color }}>{title}</span>
    </div>
  )
}

export default function FoldersPreview() {
  const trashRef = useRef<HTMLDivElement>(null)
  const [trashHover, setTrashHover] = useState(false)
  const [trashWiggle, setTrashWiggle] = useState(false)

  const handleDropOutcome = (onTrash: boolean) => {
    if (!onTrash) return
    // Sonido neutro, NO de error — un tick suave, el mismo que usa la UI
    // para moverse entre opciones de menú.
    sfx.select()
    setTrashWiggle(true)
    setTimeout(() => setTrashWiggle(false), 420)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--bg))', color: 'hsl(var(--tx))' }}>
      <style dangerouslySetInnerHTML={{ __html: PREVIEW_CSS }} />

      {/* Chrome de la página de prueba — esto NO es parte del diseño, solo
          para orientarse. La sección de abajo (fondo distinto) es una
          réplica exacta del contenedor real: max-w-5xl mx-auto px-6,
          mismo padding, mismo fondo de superficie. Así se ve tal cual
          quedaría en la landing, no suelta en una página en blanco. */}
      <div style={{ padding: '32px 24px 0', maxWidth: 720, margin: '0 auto' }}>
        <div className="label-mono" style={{ marginBottom: 4 }}>PREVIEW — réplica del contenedor real de abajo</div>
        <p className="font-mono" style={{ fontSize: 12, color: 'hsl(var(--tx3))' }}>
          Click en una carpeta para ver el detalle (aparece arriba). Arrastrala a donde quieras — siempre vuelve
          sola a su lugar. Si la soltás sobre el tacho, no pasa nada malo: solo hace un gesto de "no" y listo,
          nada de sonido de error.
        </p>
      </div>

      {/* ─── Esto de acá abajo ES la sección real, con su markup real ─── */}
      <section className="py-20" style={{ background: 'hsl(var(--surface))' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div>
            <div className="label-mono mb-2">CÓMO FUNCIONA</div>
            <h2 className="text-3xl font-bold text-tx tracking-wide mb-12">
              Tres fases. Catorce jefes. Un sistema.
            </h2>
          </div>

          <div className="folders-section">
            <div className="folders-row">
              {FOLDERS.map((f) => (
                <FolderCard
                  key={f.id}
                  data={f}
                  trashRef={trashRef}
                  onDragOverTrash={setTrashHover}
                  onDropOutcome={handleDropOutcome}
                />
              ))}
            </div>

            <div
              ref={trashRef}
              className={['trash-can', trashHover ? 'is-hover' : '', trashWiggle ? 'is-wiggle' : ''].filter(Boolean).join(' ')}
              aria-hidden="true"
            >
              <TrashGlyph color={trashHover ? 'hsl(var(--danger))' : 'hsl(var(--tx3))'} size={40} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// CSS crudo vía dangerouslySetInnerHTML — no <style>{texto}</style>: ya nos
// disparó un mismatch de hidratación una vez porque React escapa las
// comillas del texto hijo distinto en servidor que al hidratar.
const PREVIEW_CSS = `
.folders-section {
  position: relative;
  min-height: 260px;
  padding-bottom: 72px;
}
.folders-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 80px;
  padding-top: 64px;
}

.folder-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 110px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.3s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.folder-card.is-dragging {
  transition: none;
  z-index: 40;
  cursor: grabbing;
}
.folder-card.is-returning {
  transition: transform 0.32s cubic-bezier(0.2, 1.4, 0.4, 1);
}
.folder-card:focus-visible { outline: 2px solid hsl(var(--accent)); outline-offset: 4px; }

.folder-glyph-wrap {
  transition: transform 0.15s steps(3);
}
.folder-card:hover .folder-glyph-wrap { transform: translateY(-2px); }
.folder-card.is-dragging .folder-glyph-wrap { transform: scale(1.08) rotate(-3deg); }

.folder-label {
  font-family: monospace;
  font-size: 12px;
  text-align: center;
  letter-spacing: 0.02em;
}

/* ── El panel que "sale" de la carpeta hacia arriba ─────────────────── */
.folder-panel {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 50%;
  width: 230px;
  max-width: 78vw;
  background: hsl(var(--surface));
  border: 1px solid;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(14px) scale(0.94);
  transition: transform 0.28s steps(6), opacity 0.2s steps(4);
  z-index: 10;
  cursor: default;
}
.folder-card[data-open] .folder-panel {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0) scale(1);
}
.folder-panel-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-bottom: 1px solid;
}
.pv-dots { display: flex; gap: 4px; }
.pv-dots span { width: 7px; height: 7px; border-radius: 50%; display: block; }
.folder-panel-close {
  font-family: monospace;
  font-size: 13px;
  line-height: 1;
  color: hsl(var(--tx3));
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
}
.folder-panel-close:hover { color: hsl(var(--tx)); }
.folder-panel-body { padding: 12px 14px 14px; }
.folder-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.folder-panel-step { font-family: monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; }
.folder-panel-title { font-family: monospace; font-size: 13px; font-weight: 700; margin-bottom: 6px; }
.folder-panel-desc { font-family: monospace; font-size: 11px; line-height: 1.6; color: hsl(var(--tx3)); margin: 0; }

/* ── Tacho ────────────────────────────────────────────────────────── */
.trash-can {
  position: absolute;
  right: 4px;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px;
  opacity: 0.6;
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.trash-can.is-hover {
  opacity: 1;
  transform: scale(1.12);
}
.trash-can.is-wiggle {
  animation: trash-wiggle 0.42s steps(6);
}
@keyframes trash-wiggle {
  0%, 100% { transform: rotate(0deg); }
  20%      { transform: rotate(-10deg); }
  40%      { transform: rotate(9deg); }
  60%      { transform: rotate(-7deg); }
  80%      { transform: rotate(5deg); }
}

@media (max-width: 640px) {
  .folders-row { gap: 36px; justify-content: center; }
  .folder-card { width: 92px; }
  .folder-panel { width: 200px; }
  .trash-can { position: static; align-self: flex-end; margin-top: 16px; opacity: 0.8; }
  .folders-section { padding-bottom: 24px; display: flex; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  .folder-card, .folder-glyph-wrap, .folder-panel, .trash-can { transition: none !important; animation: none !important; }
}
`
