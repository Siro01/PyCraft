'use client'

// Momentos de batalla de los ítems: el 67, el destello al usar un ítem sobre
// el jefe y la ráfaga del Zonda. Son decorativos (pointer-events: none) y se
// desmontan solos — nunca tapan el editor ni bloquean un clic.

import { useEffect } from 'react'
import { ItemSprite } from './ItemSprites'

const jersey = 'var(--font-jersey), monospace'

export function SixSevenOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none" aria-live="polite">
      <div className="six-seven-pop flex items-center gap-4" style={{ filter: 'drop-shadow(6px 6px 0 hsl(var(--tx) / 0.25))' }}>
        <span className="six-seven-hand-l" aria-hidden style={{ display: 'block' }}><Hand /></span>
        <span
          style={{
            fontFamily: jersey, fontSize: 'clamp(120px, 22vw, 220px)', lineHeight: 0.8, color: 'hsl(var(--accent))',
            WebkitTextStroke: '3px hsl(var(--tx))', textShadow: '8px 8px 0 hsl(var(--tx) / 0.3)',
          }}
        >
          67
        </span>
        <span className="six-seven-hand-r" aria-hidden style={{ display: 'block' }}><Hand /></span>
      </div>
    </div>
  )
}

/** Mano abierta pixelart (el gesto del six seven: subir y bajar las palmas). */
function Hand() {
  const rows = [
    '..k.k.k.....',
    '.kfkfkfk....',
    '.kfkfkfk.k..',
    '.kfkfkfkkfk.',
    '.kffffffkfk.',
    '.kffffffffk.',
    '.kfffffffk..',
    '..kffffffk..',
    '...kffffk...',
    '...kkkkkk...',
  ]
  const fill: Record<string, string> = { k: 'hsl(var(--tx))', f: 'hsl(var(--surface2))' }
  return (
    <svg width={48} height={40} viewBox="0 0 12 10" shapeRendering="crispEdges">
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[c]} />)))}
    </svg>
  )
}

/** El sprite del ítem salta sobre el jefe y se desvanece. */
export function ItemUseBurst({ sprite, label, onDone }: { sprite: string; label: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1550)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ zIndex: 12 }}>
      <div className="item-use-out flex flex-col items-center gap-1">
        <div className="item-use-pop" style={{ filter: 'drop-shadow(3px 3px 0 hsl(var(--tx) / 0.3))' }}>
          <ItemSprite sprite={sprite} size={64} />
        </div>
        <span style={{ fontFamily: jersey, fontSize: 18, padding: '1px 8px', background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', whiteSpace: 'nowrap' }}>{label}</span>
      </div>
    </div>
  )
}

/** Ráfaga del Zonda: líneas de viento que cruzan la pantalla una vez. */
export function ZondaSweep({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200)
    return () => clearTimeout(t)
  }, [onDone])
  const gusts = [12, 24, 38, 51, 63, 77, 88]
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden pointer-events-none" aria-hidden>
      {gusts.map((top, i) => (
        <div
          key={top}
          className="zonda-sweep absolute"
          style={{
            top: `${top}%`, left: 0, width: `${40 + (i % 3) * 18}%`, height: i % 2 ? 3 : 5,
            background: i % 3 === 0 ? 'hsl(var(--accent))' : 'hsl(var(--tx) / 0.55)',
            animationDelay: `${i * 55}ms`,
            boxShadow: '0 0 0 1px hsl(var(--bg) / 0.4)',
          }}
        />
      ))}
    </div>
  )
}

/** Explicación del Pingüino Linux la primera vez que se activa (después, nunca más). */
export function PenguinTip({ language, onClose }: { language: 'python' | 'sql'; onClose: () => void }) {
  const example = language === 'sql' ? ['SE', 'SELECT'] : ['pr', 'print()']
  return (
    <div className="fixed z-50 item-status-in" style={{ right: 16, bottom: 140, width: 'min(300px, calc(100vw - 32px))' }} role="status">
      <div style={{ background: 'hsl(var(--surface))', border: '2px solid hsl(var(--tx))', boxShadow: '4px 4px 0 hsl(var(--tx) / 0.2)' }}>
        <div className="flex items-center gap-2 px-2" style={{ minHeight: 24, background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', fontFamily: jersey, fontSize: 15, letterSpacing: '0.06em' }}>
          PINGÜINO LINUX
        </div>
        <div className="flex gap-3 p-3">
          <span className="item-anim-waddle shrink-0" style={{ display: 'block' }}><ItemSprite sprite="pinguino" size={44} /></span>
          <div style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 18, lineHeight: 1.15, color: 'hsl(var(--tx))' }}>
            <p>¡Hola! Yo me sé muchas palabras de {language === 'sql' ? 'SQL' : 'Python'}.</p>
            <p style={{ marginTop: 4, color: 'hsl(var(--tx2))' }}>
              Escribí las primeras letras (por ejemplo <code style={{ fontFamily: "'Courier New', monospace", fontSize: 14, color: 'hsl(var(--tx))' }}>{example[0]}</code>) y te muestro cómo sigue. Elegí con las flechas y apretá Enter para completar <code style={{ fontFamily: "'Courier New', monospace", fontSize: 14, color: 'hsl(var(--tx))' }}>{example[1]}</code>.
            </p>
            <button type="button" onClick={onClose} className="label-mono" style={{ marginTop: 8, padding: '3px 10px', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', cursor: 'pointer' }}>
              Dale
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
