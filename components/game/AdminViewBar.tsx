'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BOSSES } from '@/lib/game/bosses'
import { ADMIN_VIEW_COOKIE, type AdminView } from '@/lib/admin/view-mode'
import { TIER_COOKIE, TIER_META, TIER_ORDER } from '@/lib/game/tiers'
import type { ChallengeTier } from '@/types'

interface Props {
  view: AdminView
  /** Dificultad actual: si se pasa, la barra deja cambiarla (en batalla cambia los desafíos y la vida del jugador). */
  tier?: ChallengeTier | null
}

const PLACES = [
  { href: '/dashboard', label: 'Mapa de jefes' },
  { href: '/mercader', label: 'Tienda del Mercader' },
  { href: '/patio-de-juegos', label: 'Patio de juegos' },
  { href: '/patio-de-practicas', label: 'Patio de prácticas' },
  { href: '/repaso', label: 'Escuelita de Rodolfo' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/finale', label: 'Final del Arquitecto' },
  { href: '/finale/proyecto', label: 'Proyecto final' },
  { href: '/admin', label: 'Panel admin' },
]

const jersey = 'var(--font-jersey), monospace'

// Barra flotante solo para el docente: alterna entre la vista de alumno y la de
// admin (con herramientas de prueba) y salta directo a cualquier jefe o lugar.
export default function AdminViewBar({ view, tier }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  const choose = (next: AdminView) => {
    if (next === view) return
    document.cookie = `${ADMIN_VIEW_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  const chooseTier = (next: ChallengeTier) => {
    if (next === tier) return
    document.cookie = `${TIER_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  const btn = (active: boolean): React.CSSProperties => ({
    fontFamily: jersey, fontSize: 15, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '2px 10px',
    border: `2px solid ${active ? 'hsl(var(--tx))' : 'hsl(var(--border2))'}`,
    color: active ? 'hsl(var(--bg))' : 'hsl(var(--tx3))',
    background: active ? 'hsl(var(--tx))' : 'transparent',
  })

  return (
    <div
      className="fixed z-[60] flex flex-wrap items-center gap-2"
      style={{
        left: 12, bottom: 12, maxWidth: 'calc(100vw - 24px)', padding: '6px 8px',
        background: 'hsl(var(--surface))', border: '2px solid hsl(var(--accent))', boxShadow: '3px 3px 0 hsl(var(--tx))',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={open ? 'Achicar' : 'Abrir barra docente'}
        style={{ fontFamily: jersey, fontSize: 15, letterSpacing: '0.06em', color: 'hsl(var(--accent))', background: 'none', border: 'none', padding: 0 }}
      >
        DOCENTE {open ? '◂' : '▸'}
      </button>
      {open && (
        <>
          <div className="flex gap-1" role="group" aria-label="Vista">
            <button type="button" style={btn(view === 'admin')} onClick={() => choose('admin')} title="Con herramientas de prueba">
              Vista admin
            </button>
            <button type="button" style={btn(view === 'alumno')} onClick={() => choose('alumno')} title="Tal cual lo ve un alumno">
              Vista alumno
            </button>
          </div>
          {tier && (
            <div className="flex gap-1" role="group" aria-label="Dificultad">
              {TIER_ORDER.map((t) => (
                <button key={t} type="button" style={btn(t === tier)} onClick={() => chooseTier(t)} title={TIER_META[t].desc}>
                  {TIER_META[t].label}
                </button>
              ))}
            </div>
          )}
          <select
            aria-label="Ir a"
            value=""
            onChange={(e) => { if (e.target.value) router.push(e.target.value) }}
            style={{
              fontFamily: 'var(--font-vt323), monospace', fontSize: 17, padding: '1px 4px',
              border: '2px solid hsl(var(--border2))', background: 'hsl(var(--surface2))', color: 'hsl(var(--tx))',
            }}
          >
            <option value="">Ir a…</option>
            <optgroup label="Jefes">
              {BOSSES.map((b) => (
                <option key={b.id} value={`/battle/${b.id}`}>{b.classNumber}. {b.name}</option>
              ))}
            </optgroup>
            <optgroup label="Lugares">
              {PLACES.map((p) => <option key={p.href} value={p.href}>{p.label}</option>)}
            </optgroup>
          </select>
        </>
      )}
    </div>
  )
}
