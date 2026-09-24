'use client'

import { useRef, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { PixelBitmap, ICON_CLOSE } from './PixelBitmap'
import { sfx } from '@/lib/game/architect/sound'

interface Props {
  title: string
  x: number
  y: number
  w: number
  z: number
  active: boolean
  /** Móvil: sin posición absoluta ni arrastre, la ventana fluye en la columna. */
  flow?: boolean
  /** Móvil: los errores flotan sobre la pantalla entera en vez de sobre el escritorio. */
  fixed?: boolean
  tone?: 'normal' | 'danger' | 'safe'
  popDelay?: number
  onFocus: () => void
  /** Recibe también la posición del puntero (cx, cy) en pantalla. */
  onMove?: (x: number, y: number, cx: number, cy: number) => void
  /** Al soltar tras arrastrar. */
  onDragEnd?: (cx: number, cy: number) => void
  onClose?: () => void
  children: ReactNode
}

export default function DeskWindow({
  title, x, y, w, z, active, flow = false, fixed = false, tone = 'normal', popDelay = 0,
  onFocus, onMove, onDragEnd, onClose, children,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    onFocus()
    if (flow || !onMove) return
    if ((e.target as HTMLElement).closest('button')) return
    sfx.pick()
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !onMove) return
    const parent = rootRef.current?.offsetParent as HTMLElement | null
    const pr = fixed || !parent
      ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
      : parent.getBoundingClientRect()
    const nx = Math.min(Math.max(0, e.clientX - pr.left - drag.current.dx), Math.max(0, pr.width - 80))
    const ny = Math.min(Math.max(fixed ? 0 : 28, e.clientY - pr.top - drag.current.dy), Math.max(28, pr.height - 60))
    onMove(nx, ny, e.clientX, e.clientY)
  }

  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current) { sfx.drop(); onDragEnd?.(e.clientX, e.clientY) }
    drag.current = null
  }

  const ink =
    tone === 'danger' ? 'hsl(var(--danger))' : tone === 'safe' ? 'hsl(var(--accent))' : 'hsl(var(--tx))'

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={title}
      onPointerDown={onFocus}
      className="win-pop"
      style={{
        position: flow ? 'relative' : fixed ? 'fixed' : 'absolute',
        left: flow ? undefined : x,
        top: flow ? undefined : y,
        width: flow ? '100%' : w,
        maxWidth: '100%',
        zIndex: z,
        background: 'hsl(var(--surface))',
        border: `2px solid ${active ? ink : 'hsl(var(--border2))'}`,
        boxShadow: active ? '5px 5px 0 hsl(var(--tx) / 0.22)' : '3px 3px 0 hsl(var(--tx) / 0.12)',
        animationDelay: `${popDelay}ms`,
      }}
    >
      <div
        onPointerDown={onDown}
        onPointerMove={onDrag}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={active ? undefined : 'hatch'}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 26, padding: '0 6px 0 8px',
          background: active ? ink : undefined,
          borderBottom: `2px solid ${active ? ink : 'hsl(var(--border2))'}`,
          cursor: flow || !onMove ? 'default' : 'grab',
          touchAction: 'none', userSelect: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-jersey), monospace', fontSize: 16, letterSpacing: '0.06em',
            textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            color: active ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
            background: active ? 'transparent' : 'hsl(var(--surface))',
            padding: active ? 0 : '2px 6px',
          }}
        >
          {title}
        </span>
        <span style={{ flex: 1 }} />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Cerrar ${title}`}
            style={{
              width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              background: active ? 'hsl(var(--bg))' : 'hsl(var(--surface))',
              border: `1px solid ${active ? 'hsl(var(--bg))' : 'hsl(var(--tx))'}`,
              padding: 0,
            }}
          >
            <PixelBitmap rows={ICON_CLOSE} scale={2} ink={active ? ink : 'hsl(var(--tx))'} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
