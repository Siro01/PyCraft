'use client'

import type { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  body?: string
  status: string
  /** Estado "bueno" (disponible/abierto) — la línea de estado va en acento. */
  positive?: boolean
  /** Si está parado encima, se puede entrar con este botón (o Enter). */
  onEnter?: () => void
  enterLabel?: string
  /** Se abre hacia abajo cuando no hay lugar arriba. */
  below?: boolean
  /** Corrimiento horizontal cuando el nodo está pegado a un borde. */
  align?: 'center' | 'left' | 'right'
}

// Placa chica que aparece al pararse (o pasar el mouse) sobre un lugar del
// mapa: es el ÚNICO texto del mapa — el resto se lee por íconos. Barra
// sólida + cuerpo VT323 + estado; si el avatar está encima, un botón para
// entrar (además de Enter/Espacio).
export default function NodeDetailPopover({ icon, title, body, status, positive, onEnter, enterLabel = 'Entrar', below = false, align = 'center' }: Props) {
  const card = (
    <div style={{ background: 'hsl(var(--surface))', border: '2px solid hsl(var(--tx))', boxShadow: '3px 3px 0 hsl(var(--tx) / 0.25)' }}>
      <div className="flex items-center gap-1.5 px-2" style={{ background: 'hsl(var(--tx))', minHeight: 22 }}>
        {icon}
        <span style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 15, letterSpacing: '0.04em', color: 'hsl(var(--bg))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </span>
      </div>
      {body && (
        <div className="px-2 pt-1.5" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 18, lineHeight: 1.1, color: 'hsl(var(--tx2))' }}>
          {body}
        </div>
      )}
      <div className="px-2 py-1.5 flex items-center justify-between gap-2">
        <span className="label-mono" style={{ color: positive ? 'hsl(var(--accent))' : 'hsl(var(--tx3))' }}>{status}</span>
        {onEnter && (
          <button
            type="button"
            className="map-enter-btn"
            onClick={(e) => { e.stopPropagation(); onEnter() }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {enterLabel} ↵
          </button>
        )}
      </div>
    </div>
  )

  const arrowSide = align === 'left' ? { marginLeft: 14 } : align === 'right' ? { marginLeft: 'auto', marginRight: 14 } : { marginLeft: 'auto', marginRight: 'auto' }
  const arrow = (
    <div
      style={{
        width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
        ...(below ? { borderBottom: '6px solid hsl(var(--tx))' } : { borderTop: '6px solid hsl(var(--tx))' }),
        ...arrowSide,
      }}
    />
  )

  const x = align === 'left' ? { left: -20 } : align === 'right' ? { right: -20 } : { left: '50%', transform: 'translateX(-50%)' }

  return (
    <div
      className="map-detail-in absolute"
      style={{
        ...x,
        ...(below ? { top: '100%', marginTop: 6 } : { bottom: '100%', marginBottom: 6 }),
        width: 210, zIndex: 8, pointerEvents: onEnter ? 'auto' : 'none',
      }}
    >
      {below ? <>{arrow}{card}</> : <>{card}{arrow}</>}
    </div>
  )
}
