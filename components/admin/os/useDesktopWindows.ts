'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WindowMode } from '@/components/ui/AppWindow'

// Gestor de ventanas del escritorio docente: qué programa está abierto,
// minimizado o en pantalla completa, dónde quedó cada uno y cuál va arriba.
// Se recuerda por PC (localStorage), así el docente encuentra su escritorio
// como lo dejó. El dashboard del alumno maneja sus ventanas a mano en
// BossMap y no se toca.

export type DeskMode = 'closed' | WindowMode

export interface DeskWin {
  mode: DeskMode
  x: number
  y: number
  z: number
}

type DeskState<Id extends string> = Record<Id, DeskWin>

const topZ = (s: Record<string, DeskWin>) => Math.max(0, ...Object.values(s).map((w) => w.z))

function initial<Id extends string>(ids: readonly Id[], openAtStart: readonly Id[]): DeskState<Id> {
  const s = {} as DeskState<Id>
  ids.forEach((id, i) => {
    // Cascada: cada ventana nueva aparece un poco más abajo y a la derecha.
    s[id] = { mode: openAtStart.includes(id) ? 'normal' : 'closed', x: 16 + (i % 6) * 28, y: 12 + (i % 6) * 24, z: openAtStart.includes(id) ? 1 : 0 }
  })
  return s
}

export function useDesktopWindows<Id extends string>(ids: readonly Id[], storageKey: string, openAtStart: readonly Id[]) {
  const [wins, setWins] = useState<DeskState<Id>>(() => initial(ids, openAtStart))
  const loaded = useRef(false)

  // Leer después de montar: el servidor no conoce el localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<DeskState<Id>>
        setWins((prev) => {
          const next = { ...prev }
          for (const id of ids) {
            const w = saved[id]
            if (w && typeof w.x === 'number' && typeof w.y === 'number') next[id] = { ...prev[id], ...w }
          }
          return next
        })
      }
    } catch { /* sin storage: escritorio por defecto */ }
    loaded.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    if (!loaded.current) return
    try { localStorage.setItem(storageKey, JSON.stringify(wins)) } catch { /* sin storage */ }
  }, [wins, storageKey])

  const patch = useCallback((id: Id, fn: (w: DeskWin, s: DeskState<Id>) => Partial<DeskWin>) => {
    setWins((s) => ({ ...s, [id]: { ...s[id], ...fn(s[id], s) } }))
  }, [])

  const focus = useCallback((id: Id) => patch(id, (w, s) => (w.z === topZ(s) ? {} : { z: topZ(s) + 1 })), [patch])
  const open = useCallback((id: Id) => patch(id, (w, s) => ({ mode: w.mode === 'closed' || w.mode === 'minimized' ? 'normal' : w.mode, z: topZ(s) + 1 })), [patch])
  const close = useCallback((id: Id) => patch(id, () => ({ mode: 'closed' })), [patch])
  const minimize = useCallback((id: Id) => patch(id, () => ({ mode: 'minimized' })), [patch])
  const toggleMaximize = useCallback((id: Id) => patch(id, (w, s) => ({ mode: w.mode === 'maximized' ? 'normal' : 'maximized', z: topZ(s) + 1 })), [patch])
  const move = useCallback((id: Id, x: number, y: number) => patch(id, () => ({ x, y })), [patch])

  // Enfocada = la de más arriba entre las visibles.
  const visible = ids.filter((id) => wins[id].mode === 'normal' || wins[id].mode === 'maximized')
  const active = visible.reduce<Id | null>((best, id) => (best === null || wins[id].z > wins[best].z ? id : best), null)

  return { wins, active, focus, open, close, minimize, toggleMaximize, move }
}

/** true bajo 720px: las ventanas dejan de flotar y van una debajo de otra. */
export function useNarrowDesk(): boolean {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 719px)')
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}
