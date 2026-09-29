'use client'

import { useRef, type CSSProperties, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'
import { PixelBitmap, ICON_CLOSE, ICON_MINIMIZE, ICON_MAXIMIZE } from '@/components/game/architect/desktop/PixelBitmap'
import { sfx } from '@/lib/game/architect/sound'

export type WindowMode = 'normal' | 'minimized' | 'maximized'

interface Props {
  title: string
  icon?: ReactNode
  x: number
  y: number
  w: number
  z: number
  active: boolean
  mode: WindowMode
  /** Ventana de gameplay (el mapa): no se puede cerrar ni minimizar, solo agrandar. */
  essential?: boolean
  /** El mapa vive en el flujo normal de la página (le da su alto a `<main>`),
   *  no flotando por encima — las demás ventanas sí flotan y se arrastran. */
  flow?: boolean
  onFocus: () => void
  onMove?: (x: number, y: number) => void
  onClose?: () => void
  onMinimize?: () => void
  onToggleMaximize?: () => void
  bodyStyle?: CSSProperties
  children: ReactNode
}

// Ventana del escritorio del dashboard: mismo lenguaje que DeskWindow (barra
// rayada/sólida, sombra dura, esquinas rectas) pero con minimizar y
// pantalla-completa-sin-tapar-el-header, que el cofre no necesita. Vive
// aparte de DeskWindow para no arriesgar esa pantalla, ya aprobada, con
// cambios que solo hacían falta acá.
export default function AppWindow({
  title, icon, x, y, w, z, active, mode, essential = false, flow = false,
  onFocus, onMove, onClose, onMinimize, onToggleMaximize, bodyStyle, children,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const maximized = mode === 'maximized'

  if (mode === 'minimized') return null

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    onFocus()
    if (maximized || flow || !onMove) return
    if ((e.target as HTMLElement).closest('button')) return
    sfx.pick()
    const rect = rootRef.current?.getBoundingClientRect()
    const parent = rootRef.current?.offsetParent as HTMLElement | null
    if (!rect || !parent) return
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !onMove) return
    const parent = rootRef.current?.offsetParent as HTMLElement | null
    const pr = parent?.getBoundingClientRect()
    if (!pr) return
    const nx = Math.min(Math.max(0, e.clientX - pr.left - drag.current.dx), Math.max(0, pr.width - 80))
    const ny = Math.min(Math.max(0, e.clientY - pr.top - drag.current.dy), Math.max(0, pr.height - 40))
    onMove(nx, ny)
  }

  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current) sfx.drop()
    drag.current = null
  }

  const ink = 'hsl(var(--tx))'

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={title}
      onPointerDown={onFocus}
      className="win-pop"
      style={maximized
        ? {
            position: 'fixed', left: 0, right: 0, bottom: 0, top: 'var(--dash-header-h, 56px)',
            zIndex: 60, background: 'hsl(var(--surface))', border: `2px solid ${ink}`, display: 'flex', flexDirection: 'column',
          }
        : flow
        ? {
            position: 'relative', width: '100%', marginBottom: 16,
            background: 'hsl(var(--surface))',
            border: `2px solid ${active ? ink : 'hsl(var(--border2))'}`,
            boxShadow: active ? '5px 5px 0 hsl(var(--tx) / 0.22)' : '3px 3px 0 hsl(var(--tx) / 0.12)',
          }
        : {
            position: 'absolute', left: x, top: y, width: w, maxWidth: '100%', zIndex: z,
            background: 'hsl(var(--surface))',
            border: `2px solid ${active ? ink : 'hsl(var(--border2))'}`,
            boxShadow: active ? '5px 5px 0 hsl(var(--tx) / 0.22)' : '3px 3px 0 hsl(var(--tx) / 0.12)',
          }}
    >
      <div
        onPointerDown={onDown}
        onPointerMove={onDrag}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={active ? undefined : 'hatch'}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, height: 26, padding: '0 6px 0 8px', flexShrink: 0,
          background: active ? ink : undefined,
          borderBottom: `2px solid ${active ? ink : 'hsl(var(--border2))'}`,
          cursor: maximized || flow || !onMove ? 'default' : 'grab',
          touchAction: 'none', userSelect: 'none',
        }}
      >
        {icon}
        <span
          style={{
            fontFamily: 'var(--font-jersey), monospace', fontSize: 15, letterSpacing: '0.06em',
            textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            color: active ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
            background: active ? 'transparent' : 'hsl(var(--surface))',
            padding: active ? 0 : '2px 6px',
          }}
        >
          {title}
        </span>
        <span style={{ flex: 1 }} />
        {onMinimize && !essential && (
          <button
            type="button"
            onClick={() => { sfx.click(); onMinimize() }}
            aria-label={`Minimizar ${title}`}
            style={titleBtnStyle(active, ink)}
          >
            <PixelBitmap rows={ICON_MINIMIZE} scale={2} ink={active ? ink : 'hsl(var(--tx))'} />
          </button>
        )}
        {onToggleMaximize && (
          <button
            type="button"
            onClick={() => { sfx.click(); onToggleMaximize() }}
            aria-label={maximized ? `Restaurar ${title}` : `Pantalla completa ${title}`}
            aria-pressed={maximized}
            style={titleBtnStyle(active, ink)}
          >
            <PixelBitmap rows={ICON_MAXIMIZE} scale={2} ink={active ? ink : 'hsl(var(--tx))'} />
          </button>
        )}
        {onClose && !essential && (
          <button
            type="button"
            onClick={() => { sfx.close(); onClose() }}
            aria-label={`Cerrar ${title}`}
            style={titleBtnStyle(active, ink)}
          >
            <PixelBitmap rows={ICON_CLOSE} scale={2} ink={active ? ink : 'hsl(var(--tx))'} />
          </button>
        )}
      </div>
      <div style={{ minHeight: 0, ...(maximized ? { flex: 1, overflow: 'auto' } : {}), ...bodyStyle }}>
        {children}
      </div>
    </div>
  )
}

function titleBtnStyle(active: boolean, ink: string): CSSProperties {
  return {
    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
    background: active ? 'hsl(var(--bg))' : 'hsl(var(--surface))',
    border: `1px solid ${active ? 'hsl(var(--bg))' : ink}`,
  }
}
