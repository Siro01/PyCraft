'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
import { sfx } from '@/lib/game/architect/sound'

// Los <canvas> no resuelven var(): hay que leer el acento del tema activo y
// releerlo cuando cambia data-theme.
export function useAccentTriplet(varName = '--accent'): string {
  const [triplet, setTriplet] = useState('0 0% 90%')
  useEffect(() => {
    const read = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
      if (raw) setTriplet(raw)
    }
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [varName])
  return triplet
}

// Sonido retro de tecleo para inputs y textareas.
export function keySound(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key.length === 1) sfx.type('machine')
  else if (e.key === 'Backspace' || e.key === 'Delete') sfx.type('cat')
  else if (e.key === 'Enter') sfx.select()
}
