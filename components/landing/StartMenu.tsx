'use client'

import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react'
import { SITE } from '@/lib/site-config'
import { PixelBitmap, ICON_ARROW_RIGHT } from '@/components/game/architect/desktop/PixelBitmap'

// Menú INICIO de PyCraft OS: todos los links que antes vivían en el footer.

interface Props {
  /** Dónde se ancla: arriba (desde el cofre de la barra de menú) o abajo (desde INICIO). */
  anchor: CSSProperties
  onClose: () => void
  onEnter: () => void
  onAbout: () => void
}

const itemStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', textAlign: 'left',
  fontFamily: 'var(--font-vt323), monospace', fontSize: 21, lineHeight: 1, color: 'hsl(var(--tx))',
  background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'none',
}

export default function StartMenu({ anchor, onClose, onEnter, onAbout }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (!ref.current?.contains(t) && !t.closest('[data-start-toggle]')) onClose()
    }
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose() } }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    const i = items.indexOf(document.activeElement as HTMLElement)
    e.preventDefault()
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
  }

  const rule = <div role="separator" style={{ height: 2, background: 'hsl(var(--border2))', margin: '4px 0' }} />

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Menú INICIO"
      onKeyDown={onKey}
      className="start-menu"
      style={{
        position: 'absolute', zIndex: 950, width: 268, maxWidth: 'calc(100vw - 16px)', padding: '4px 0',
        background: 'hsl(var(--surface))', border: '2px solid hsl(var(--tx))', boxShadow: '6px 6px 0 hsl(var(--tx) / 0.22)',
        ...anchor,
      }}
    >
      <button type="button" role="menuitem" style={{ ...itemStyle, fontFamily: 'var(--font-jersey), monospace', fontSize: 20, letterSpacing: '0.04em', textTransform: 'uppercase' }} onClick={() => { onClose(); onEnter() }}>
        <PixelBitmap rows={ICON_ARROW_RIGHT} scale={2} ink="currentColor" />
        Entrar al taller
      </button>
      <a role="menuitem" href="/demo" style={itemStyle}>Probar un jefe gratis</a>
      {SITE.inscripcionesUrl && <a role="menuitem" href={SITE.inscripcionesUrl} target="_blank" rel="noopener noreferrer" style={itemStyle}>Inscripciones</a>}
      <a role="menuitem" href={SITE.githubUrl} target="_blank" rel="noopener noreferrer" style={itemStyle}>Código en GitHub</a>
      {rule}
      <a role="menuitem" href="/privacidad" style={itemStyle}>Política de privacidad</a>
      <a role="menuitem" href="/cookies" style={itemStyle}>Política de cookies</a>
      {rule}
      <button type="button" role="menuitem" style={itemStyle} onClick={() => { onClose(); onAbout() }}>Acerca de PyCraft OS</button>
    </div>
  )
}
