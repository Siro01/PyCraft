'use client'

import { useEffect, useState } from 'react'
import {
  ACTIVE_MERCADER_V3, MERCADER_V3_CROP, MERCADER_V3_FRAMES, MERCADER_V3_FRAME_MS, mercaderV3Src,
} from '@/lib/game/mercader-v3-sprite'

interface Props {
  /** Píxeles de pantalla por píxel del sprite. */
  scale?: number
  /** Se mantiene por compatibilidad: tienda y jefe usan hoy el mismo dibujo. */
  variant?: 'detail' | 'boss'
  animated?: boolean
  /** Plano medio: corta el ruedo del manto para que se vea más grande (tienda). */
  crop?: boolean
  /** Derrotado: el manto vacío en el piso (batalla del jefe 4). */
  defeated?: boolean
}

const G = 64

// El Mercader del Abismo — el Farolero Abisal (scripts/sprites/mercader.py):
// tres ojos-estrella que titilan, farol-boya que late colgando del cayado y
// jirones que ondulan como algas. Quieto bajo prefers-reduced-motion.
export function MercaderPortrait({ scale = 4, animated = true, crop = false, defeated = false }: Props) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (!animated || defeated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setFrame((f) => (f + 1) % MERCADER_V3_FRAMES), MERCADER_V3_FRAME_MS)
    return () => clearInterval(id)
  }, [animated, defeated])

  const box = crop ? MERCADER_V3_CROP : { x: 0, y: 0, w: G, h: G }
  const frames = defeated ? 1 : MERCADER_V3_FRAMES
  const f = defeated ? 0 : frame
  return (
    <div
      role="img"
      aria-label={defeated ? 'El Mercader del Abismo, derrotado' : 'El Mercader del Abismo'}
      style={{
        width: box.w * scale,
        height: box.h * scale,
        backgroundImage: `url(${mercaderV3Src(ACTIVE_MERCADER_V3, defeated)})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${frames * G * scale}px ${G * scale}px`,
        backgroundPosition: `${-(f * G + box.x) * scale}px ${-box.y * scale}px`,
        imageRendering: 'pixelated',
      }}
    />
  )
}
