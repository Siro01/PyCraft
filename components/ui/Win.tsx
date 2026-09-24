'use client'

import type { CSSProperties, ReactNode } from 'react'
import { PixelBitmap, ICON_CLOSE } from '@/components/game/architect/desktop/PixelBitmap'

// Ventana 1-bit en flujo normal (sin arrastre): la pieza base del escritorio del
// alumno en dashboard y batallas. Barra rayada cuando está en reposo, barra
// sólida de acento cuando `active`. Todo por tokens del tema activo.

interface WinProps {
  title: ReactNode
  /** Barra sólida (ventana en foco). */
  active?: boolean
  tone?: 'normal' | 'danger' | 'safe'
  /** Contenido a la derecha de la barra de título. */
  right?: ReactNode
  onClose?: () => void
  className?: string
  style?: CSSProperties
  bodyStyle?: CSSProperties
  children: ReactNode
}

export default function Win({ title, active = false, tone = 'normal', right, onClose, className, style, bodyStyle, children }: WinProps) {
  const ink = tone === 'danger' ? 'hsl(var(--danger))' : tone === 'safe' ? 'hsl(var(--accent))' : 'hsl(var(--tx))'
  return (
    <section
      className={`win ${className ?? ''}`}
      style={{
        background: 'hsl(var(--surface))',
        border: `2px solid ${active ? ink : 'hsl(var(--border2))'}`,
        boxShadow: active ? '4px 4px 0 hsl(var(--tx) / 0.2)' : '3px 3px 0 hsl(var(--tx) / 0.1)',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        ...style,
      }}
    >
      <div
        className={active ? undefined : 'hatch'}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, minHeight: 26, padding: '0 6px 0 8px', flexShrink: 0,
          background: active ? ink : undefined,
          borderBottom: `2px solid ${active ? ink : 'hsl(var(--border2))'}`,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-jersey), monospace', fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase',
            lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
            color: active ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
            background: active ? 'transparent' : 'hsl(var(--surface))',
            padding: active ? 0 : '2px 6px',
          }}
        >
          {title}
        </span>
        <span style={{ flex: 1 }} />
        {right}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
              background: active ? 'hsl(var(--bg))' : 'hsl(var(--surface))',
              border: `1px solid ${active ? 'hsl(var(--bg))' : 'hsl(var(--tx))'}`,
            }}
          >
            <PixelBitmap rows={ICON_CLOSE} scale={2} ink={active ? ink : 'hsl(var(--tx))'} />
          </button>
        )}
      </div>
      <div style={{ minWidth: 0, ...bodyStyle }}>{children}</div>
    </section>
  )
}
