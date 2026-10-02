'use client'

import { useEffect, useState } from 'react'
import { PLAYGROUND_MAX_LEVEL, playgroundLevel } from '@/lib/storage/local-store'

interface Props {
  /** XP total ANTES de este resultado — la barra arranca acá y sube animada. */
  fromXp: number
  /** XP total DESPUÉS — a donde llega la barra. Si es igual a fromXp, no anima. */
  toXp: number
}

// Barra de nivel segmentada (mismo lenguaje que .hp-track de las batallas):
// arranca en el valor viejo y sube animada al valor nuevo, cruzando de
// segmento cuando el alumno sube de nivel.
export default function LevelBar({ fromXp, toXp }: Props) {
  const from = playgroundLevel(fromXp)
  const to = playgroundLevel(toXp)
  const leveledUp = to.level > from.level
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120)
    return () => clearTimeout(t)
  }, [])

  const pct = animated ? (to.xpIntoLevel / to.xpForNext) * 100 : (from.xpIntoLevel / from.xpForNext) * 100
  const shownLevel = animated ? to.level : from.level

  return (
    <div>
      <div className="flex items-center justify-between label-mono mb-1">
        <span style={{ color: 'hsl(var(--tx3))' }}>Nivel</span>
        <span
          className="tabular"
          style={{ color: 'hsl(var(--accent))', transition: 'transform 0.2s', transform: leveledUp && animated ? 'scale(1.25)' : 'scale(1)' }}
          suppressHydrationWarning
        >
          {shownLevel}
        </span>
      </div>
      <div className="hp-track h-3">
        {/* El XP viene de localStorage: en el servidor no existe, así que el
            primer render del cliente siempre difiere del HTML de servidor a
            propósito — se avisa a React que no lo trate como un bug. */}
        <div className="h-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: 'hsl(var(--accent))' }} suppressHydrationWarning />
      </div>
      <div className="flex items-center justify-between label-mono mt-1" style={{ color: 'hsl(var(--tx3))' }}>
        <span suppressHydrationWarning>
          {shownLevel >= PLAYGROUND_MAX_LEVEL
            ? '¡Nivel máximo!'
            : `${animated ? to.xpIntoLevel : from.xpIntoLevel} / ${animated ? to.xpForNext : from.xpForNext} XP`}
        </span>
        {leveledUp && animated && (
          <span className="animate-caret-line" style={{ color: 'hsl(var(--accent))' }}>¡SUBISTE DE NIVEL!</span>
        )}
      </div>
    </div>
  )
}
