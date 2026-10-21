'use client'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import AppWindow from '@/components/ui/AppWindow'
import { sfx } from '@/lib/game/architect/sound'
import type { AdminAula } from '@/app/admin/aula-label'
import AulaPicker from './AulaPicker'
import StatusLine, { type Status } from './StatusLine'
import { useDesktopWindows, useNarrowDesk } from './useDesktopWindows'

// Escritorio "PyCraft OS" del docente: el mismo marco que el dashboard del
// alumno (borde de 2px, fondo de puntos, sombra dura), con barra de menú
// arriba (aula activa, activos, hora), programas a la izquierda, ventanas
// flotantes en el medio y barra de tareas abajo.

export interface DeskProgram<Id extends string = string> {
  id: Id
  /** Nombre del ícono en el escritorio: `jefes.exe`. */
  file: string
  /** Barra de título de la ventana: `JEFES.EXE`. */
  title: string
  /** Glifo de 48px (bitmap del sistema). */
  icon: ReactNode
  /** Ancho de la ventana flotante. */
  w?: number
  body?: ReactNode
  status?: Status | null
  /** Programas que son un acceso directo a otra pantalla. */
  href?: string
  /** 'corner' = va en la otra punta del escritorio (el cartel del Pistolero). */
  place?: 'grid' | 'corner'
  /** Número en acento sobre el ícono: solo cuando hay algo que hacer. */
  badge?: number
  badgeLabel?: string
}

interface Props<Id extends string> {
  programs: DeskProgram<Id>[]
  openAtStart: Id[]
  aulas: AdminAula[]
  aulaId: string
  onAula: (id: string) => void
  activeCount: number
  /** Algo más que vive en la otra punta del escritorio (la papelera). */
  cornerExtra?: ReactNode
}

const jersey = 'var(--font-jersey), monospace'
// --admin-bar-space: lugar para la barra DOCENTE flotante (abajo a la izquierda), así no tapa la barra de tareas.
const DESK_H = 'max(600px, calc(100vh - var(--dash-header-h, 56px) - 128px - var(--admin-bar-space, 0px)))'

export default function AdminDesktop<Id extends string>({ programs, openAtStart, aulas, aulaId, onAula, activeCount, cornerExtra }: Props<Id>) {
  const windowed = programs.filter((p) => !p.href)
  const ids = windowed.map((p) => p.id)
  const desk = useDesktopWindows(ids, 'pysql:admin-desk', openAtStart)
  const narrow = useNarrowDesk()
  const clock = useClock()

  // "Pantalla completa" llena lo que queda debajo del header del sitio.
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const measure = () => document.documentElement.style.setProperty('--dash-header-h', `${header.getBoundingClientRect().height}px`)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  // Esc cierra la ventana enfocada (salvo que esté abierto un diálogo o se esté escribiendo).
  const activeRef = useRef(desk.active)
  activeRef.current = desk.active
  const closeWin = desk.close
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || !activeRef.current) return
      if (document.querySelector('[role="alertdialog"]')) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return
      sfx.close()
      closeWin(activeRef.current)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeWin])

  const launch = (p: DeskProgram<Id>) => {
    if (p.href) { sfx.open(); return }
    const w = desk.wins[p.id]
    if (w.mode === 'closed' || w.mode === 'minimized') sfx.open()
    desk.open(p.id)
    // Angosto: la ventana queda debajo de los íconos, así que se baja hasta ella.
    if (narrow) requestAnimationFrame(() => document.querySelector(`[role="dialog"][aria-label="${p.title}"]`)?.scrollIntoView({ block: 'start' }))
  }

  // Flechas entre íconos, como en un escritorio de verdad.
  const onIconsKey = (e: KeyboardEvent<HTMLElement>) => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']
    if (!keys.includes(e.key)) return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('.desk-icon'))
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    e.preventDefault()
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1
    items[(i + step + items.length) % items.length]?.focus()
  }

  const icon = (p: DeskProgram<Id>) => {
    const open = !p.href && desk.wins[p.id].mode !== 'closed'
    const inner = (
      <>
        <span className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
          {p.icon}
          {!!p.badge && <span className="desk-badge tabular" title={p.badgeLabel}>{p.badge}</span>}
        </span>
        <span className="desk-lbl">{p.file}</span>
      </>
    )
    return p.href ? (
      <a key={p.id} href={p.href} className="desk-icon" onClick={() => launch(p)} title={`Abrir ${p.file}`} style={{ textDecoration: 'none' }}>
        {inner}
      </a>
    ) : (
      <button
        key={p.id}
        type="button"
        className={`desk-icon${open ? ' desk-icon--open' : ''}`}
        onClick={() => launch(p)}
        title={p.badge && p.badgeLabel ? `Abrir ${p.file} — ${p.badgeLabel}` : `Abrir ${p.file}`}
      >
        {inner}
      </button>
    )
  }

  const grid = programs.filter((p) => p.place !== 'corner')
  const corner = programs.filter((p) => p.place === 'corner')
  const shown = narrow ? windowed.filter((p) => p.id === desk.active) : windowed
  const tasks = windowed.filter((p) => desk.wins[p.id].mode !== 'closed')

  const windowFor = (p: DeskProgram<Id>) => {
    const w = desk.wins[p.id]
    if (w.mode === 'closed') return null
    const maximized = w.mode === 'maximized'
    const bodyStyle: CSSProperties = maximized
      ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
      : { display: 'flex', flexDirection: 'column', maxHeight: narrow ? undefined : `calc(${DESK_H} - ${w.y}px - 64px)` }
    return (
      <AppWindow
        key={p.id}
        title={p.title}
        x={w.x}
        y={w.y}
        w={p.w ?? 720}
        z={w.z + 10}
        active={desk.active === p.id}
        mode={w.mode}
        flow={narrow}
        onFocus={() => desk.focus(p.id)}
        onMove={(x, y) => desk.move(p.id, x, y)}
        onClose={() => desk.close(p.id)}
        onMinimize={() => { sfx.minimize(); desk.minimize(p.id) }}
        onToggleMaximize={() => desk.toggleMaximize(p.id)}
        bodyStyle={bodyStyle}
      >
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>{p.body}</div>
        <StatusLine status={p.status ?? null} />
      </AppWindow>
    )
  }

  return (
    <div
      className="desk relative"
      style={{
        border: '2px solid hsl(var(--tx))',
        background: 'hsl(var(--bg))',
        backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.18) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        boxShadow: '6px 6px 0 hsl(var(--tx) / 0.18)',
      }}
    >
      {/* Barra de menú: solo lo que vale para todo el escritorio. */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-2.5 py-1"
        style={{ minHeight: 34, background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))', position: 'relative', zIndex: 80 }}
      >
        <span style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.08em', color: 'hsl(var(--tx))', whiteSpace: 'nowrap' }}>
          PYCRAFT OS <span style={{ color: 'hsl(var(--tx3))' }}>·</span> DOCENTE
        </span>
        <span className="hidden sm:block" style={{ flex: 1 }} />
        <AulaPicker aulas={aulas} value={aulaId} onChange={onAula} />
        <span
          className="flex items-center gap-1.5"
          title="Alumnos de esta aula con algún ataque en los últimos 10 minutos"
          style={{ fontFamily: jersey, fontSize: 16, color: activeCount > 0 ? 'hsl(var(--tx))' : 'hsl(var(--tx3))', whiteSpace: 'nowrap' }}
        >
          <span aria-hidden style={{ width: 10, height: 10, border: '2px solid currentColor', background: activeCount > 0 ? 'hsl(var(--accent))' : 'transparent' }} />
          <span className="tabular">{activeCount}</span> {activeCount === 1 ? 'activo' : 'activos'}
        </span>
        <span className="tabular" aria-label="Hora" style={{ fontFamily: jersey, fontSize: 16, color: 'hsl(var(--tx2))', minWidth: 40, textAlign: 'right' }}>{clock}</span>
      </div>

      <div className={narrow ? 'flex flex-col' : 'flex'} style={narrow ? undefined : { height: DESK_H }}>
        <nav
          aria-label="Programas del docente"
          onKeyDown={onIconsKey}
          className={narrow ? 'flex flex-wrap gap-1 p-2' : 'grid content-start gap-x-1 gap-y-2 p-2.5'}
          style={narrow ? undefined : { gridTemplateColumns: 'repeat(2, 88px)', flexShrink: 0 }}
        >
          {grid.map(icon)}
          {narrow && corner.map(icon)}
          {narrow && cornerExtra}
        </nav>

        <div className="relative" style={{ flex: 1, minWidth: 0, padding: narrow ? '0 8px 8px' : undefined }}>
          {shown.map(windowFor)}
          {!narrow && (corner.length > 0 || cornerExtra) && (
            <div className="absolute flex items-end gap-1" style={{ right: 10, bottom: 8 }}>{corner.map(icon)}{cornerExtra}</div>
          )}
        </div>
      </div>

      {/* Barra de tareas: cada ventana abierta o minimizada. */}
      <div
        role="toolbar"
        aria-label="Ventanas abiertas"
        className="flex flex-wrap items-center gap-1.5 px-2 py-1.5"
        style={{ minHeight: 40, background: 'hsl(var(--surface))', borderTop: '2px solid hsl(var(--tx))' }}
      >
        {tasks.map((p) => {
          const w = desk.wins[p.id]
          const on = desk.active === p.id
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                if (on) { sfx.minimize(); desk.minimize(p.id) }
                else { if (w.mode === 'minimized') sfx.open(); desk.open(p.id) }
              }}
              title={on ? `Minimizar ${p.title}` : `Mostrar ${p.title}`}
              style={{
                fontFamily: jersey, fontSize: 15, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1,
                padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                border: `2px solid ${w.mode === 'minimized' ? 'hsl(var(--border2))' : 'hsl(var(--tx))'}`,
                background: on ? 'hsl(var(--tx))' : 'hsl(var(--bg))',
                color: on ? 'hsl(var(--bg))' : w.mode === 'minimized' ? 'hsl(var(--tx2))' : 'hsl(var(--tx))',
              }}
            >
              {p.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function useClock() {
  const [now, setNow] = useState('')
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }))
    tick()
    const t = setInterval(tick, 15_000)
    return () => clearInterval(t)
  }, [])
  return now
}
