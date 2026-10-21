'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { sfx } from '@/lib/game/architect/sound'

// Arrastrar algo del escritorio docente hasta la papelera. Mismo mecanismo
// de pointer events que los stickers y las ventanas (sin drag-and-drop
// nativo): un fantasma sigue al puntero y, al soltar arriba de la papelera,
// se llama a onDrop (que igual pregunta antes de borrar).

export interface DragGhost { label: string; x: number; y: number }

export function useDragToTrash<T>(trashRef: RefObject<HTMLElement>, onDrop: (item: T) => void) {
  const [ghost, setGhost] = useState<DragGhost | null>(null)
  const [over, setOver] = useState(false)
  const item = useRef<T | null>(null)
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop

  const hit = (x: number, y: number) => {
    const r = trashRef.current?.getBoundingClientRect()
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  useEffect(() => {
    if (!ghost) return
    const move = (e: PointerEvent) => {
      setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g))
      const h = hit(e.clientX, e.clientY)
      setOver((o) => { if (h && !o) sfx.hover(); return h })
    }
    const up = (e: PointerEvent) => {
      const dropped = hit(e.clientX, e.clientY)
      const it = item.current
      item.current = null
      setGhost(null)
      setOver(false)
      if (dropped && it !== null) onDropRef.current(it)
      else sfx.drop()
    }
    const cancel = () => { item.current = null; setGhost(null); setOver(false) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!ghost])

  const start = (it: T, label: string, e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    sfx.pick()
    item.current = it
    setGhost({ label, x: e.clientX, y: e.clientY })
  }

  return { ghost, over, dragging: !!ghost, start }
}
