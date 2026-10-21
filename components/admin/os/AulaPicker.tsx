'use client'

import { useEffect, useRef, useState } from 'react'
import { PixelBitmap, ICON_ARROW_DOWN } from '@/components/game/architect/desktop/PixelBitmap'
import { aulaLabel, type AdminAula } from '@/app/admin/aula-label'
import { sfx } from '@/lib/game/architect/sound'

const STORAGE_KEY = 'pysql:admin-aula'
/** '' = alumnos sin aula (mismo valor que usaban los selectores de cada pestaña). */
export const SIN_AULA = ''
/** Todas las aulas a la vez (la vista por defecto del escritorio). */
export const TODAS = '*'

/** Aula activa del escritorio docente: una sola para todas las ventanas, recordada por PC. */
export function useAulaActiva(aulas: AdminAula[]) {
  const [aulaId, setAulaId] = useState<string>(TODAS)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved !== null && (saved === SIN_AULA || saved === TODAS || aulas.some((a) => a.id === saved))) setAulaId(saved)
    } catch { /* sin storage */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Si borran el aula activa, vuelve a "Todas las aulas".
  useEffect(() => {
    if (aulaId !== SIN_AULA && aulaId !== TODAS && !aulas.some((a) => a.id === aulaId)) setAulaId(TODAS)
  }, [aulas, aulaId])
  const choose = (id: string) => {
    setAulaId(id)
    try { localStorage.setItem(STORAGE_KEY, id) } catch { /* sin storage */ }
  }
  return [aulaId, choose] as const
}

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

// Desplegable propio del sistema (no el <select> nativo): lista con tinta
// invertida para la opción marcada, flechas + Enter + Esc.
export default function AulaPicker({ aulas, value, onChange }: { aulas: AdminAula[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const options = [{ id: TODAS, label: 'Todas las aulas' }, ...aulas.map((a) => ({ id: a.id, label: aulaLabel(a) })), { id: SIN_AULA, label: 'Sin aula' }]
  const [hi, setHi] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.id === value) ?? options[options.length - 1]

  useEffect(() => {
    if (!open) return
    setHi(Math.max(0, options.findIndex((o) => o.id === value)))
    const away = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('pointerdown', away)
    return () => window.removeEventListener('pointerdown', away)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pick = (id: string) => {
    sfx.select()
    onChange(id)
    setOpen(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sfx.open(); setOpen(true) }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => (h + 1) % options.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => (h - 1 + options.length) % options.length) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(options[hi].id) }
  }

  return (
    <div ref={rootRef} className="relative" style={{ minWidth: 0 }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Aula activa: ${current.label}`}
        onClick={() => { sfx.click(); setOpen((o) => !o) }}
        onKeyDown={onKey}
        className="flex items-center gap-2"
        style={{
          maxWidth: '100%', padding: '2px 8px', cursor: 'pointer',
          border: '2px solid hsl(var(--tx))',
          background: open ? 'hsl(var(--tx))' : 'hsl(var(--bg))',
          color: open ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
        }}
      >
        <span className="label-mono" style={{ color: 'inherit', opacity: 0.7 }}>AULA</span>
        <span style={{ fontFamily: jersey, fontSize: 16, letterSpacing: '0.04em', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {current.label}
        </span>
        <PixelBitmap rows={ICON_ARROW_DOWN} scale={2} ink="currentColor" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Elegir aula activa"
          className="win-pop"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 90, minWidth: '100%', maxHeight: 320, overflowY: 'auto',
            margin: 0, padding: 2, listStyle: 'none',
            background: 'hsl(var(--surface))', border: '2px solid hsl(var(--tx))', boxShadow: '4px 4px 0 hsl(var(--tx) / 0.22)',
          }}
        >
          {options.map((o, i) => {
            const selected = o.id === value
            const lit = i === hi
            return (
              <li
                key={o.id || 'sin-aula'}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setHi(i)}
                onClick={() => pick(o.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: vt, fontSize: 19, lineHeight: 1.1,
                  background: lit ? 'hsl(var(--tx))' : 'transparent',
                  color: lit ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
                  borderTop: o.id === SIN_AULA || i === 1 ? '1px dashed hsl(var(--border2))' : undefined,
                }}
              >
                <span aria-hidden style={{ width: 8, height: 8, flexShrink: 0, border: '2px solid currentColor', background: selected ? 'currentColor' : 'transparent' }} />
                {o.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
