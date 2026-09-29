'use client'

import { useEffect } from 'react'

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]
const DIST = 18

interface Props {
  /** Posición en píxeles dentro del mundo del mapa (mismo sistema que el avatar). */
  x: number
  y: number
  onDone: () => void
}

// Splash mínimo al confirmar una entrada (jefe disponible, patio de juegos):
// ocho pixeles que saltan del centro y se apagan. Nada de canvas ni de un
// bucle de animación en JS — son puros divs con keyframes CSS, así que no
// pesa en las PCs del taller. Se desmonta solo, medio segundo después.
export default function NodeSplash({ x, y, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 360)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="node-splash" style={{ left: x, top: y }} aria-hidden="true">
      {ANGLES.map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <span
            key={deg}
            style={{
              ['--tx-x' as string]: `${Math.round(Math.cos(rad) * DIST)}px`,
              ['--tx-y' as string]: `${Math.round(Math.sin(rad) * DIST)}px`,
            }}
          />
        )
      })}
    </div>
  )
}
