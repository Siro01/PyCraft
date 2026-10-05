'use client'

import { useEffect, useState } from 'react'
import {
  ACTIVE_GUARDIAN, GUARDIAN_FRAMES, GUARDIAN_FRAME_MS, GUARDIAN_GRID, guardianSrc, type GuardianId,
} from '@/lib/game/guardian-sprite'

interface Props {
  /** Lado en px del sprite en pantalla (la grilla es de 64×64). */
  px: number
  variant?: GuardianId
  animated?: boolean
  defeated?: boolean
}

/** Guardián de la Puerta: tira de 6 cuadros a 200ms; quieto con prefers-reduced-motion. */
export default function GuardianSprite({ px, variant = ACTIVE_GUARDIAN, animated = true, defeated = false }: Props) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    setFrame(0)
    if (!animated || defeated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setFrame((f) => (f + 1) % GUARDIAN_FRAMES), GUARDIAN_FRAME_MS)
    return () => clearInterval(id)
  }, [animated, defeated])

  const frames = defeated ? 1 : GUARDIAN_FRAMES
  const scale = px / GUARDIAN_GRID

  return (
    <div
      role="img"
      aria-label="Guardián de la Puerta"
      style={{
        width: px,
        height: px,
        backgroundImage: `url(${guardianSrc(variant, defeated)})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${frames * px}px ${px}px`,
        backgroundPosition: `${-frame * GUARDIAN_GRID * scale}px 0`,
        imageRendering: 'pixelated',
      }}
    />
  )
}
