'use client'

import { useEffect, useState } from 'react'

interface Props {
  /** PNG con los cuadros cuadrados uno al lado del otro. */
  src: string
  frames: number
  frameMs: number
  /** Lado en px en pantalla. */
  px: number
  animated?: boolean
  label: string
}

/** Sprite animado desde una tira horizontal de cuadros; quieto con prefers-reduced-motion. */
export default function StripSprite({ src, frames, frameMs, px, animated = true, label }: Props) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    setFrame(0)
    if (!animated || frames < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setFrame((f) => (f + 1) % frames), frameMs)
    return () => clearInterval(id)
  }, [animated, frames, frameMs, src])

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        width: px,
        height: px,
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${frames * px}px ${px}px`,
        backgroundPosition: `${-frame * px}px 0`,
        imageRendering: 'pixelated',
      }}
    />
  )
}
