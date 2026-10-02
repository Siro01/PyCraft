'use client'

import MercaderV2 from './MercaderV2'
import { ACTIVE_MERCADER_V2 } from '@/lib/game/mercader-v2-sprite'

interface Props {
  scale?: number
  /** Se mantiene por compatibilidad: tienda y jefe usan hoy el mismo dibujo. */
  variant?: 'detail' | 'boss'
  animated?: boolean
  /** Plano medio: corta el ruedo del manto para que se vea más grande (tienda). */
  crop?: boolean
}

// El Mercader del Abismo (rediseño, variante "Abismo"): ojos-estrella que
// titilan, farol cian que se mece y cuerpo que respira. Ver
// lib/game/mercader-v2-sprite.ts. Quieto bajo prefers-reduced-motion.
export function MercaderPortrait({ scale = 4, animated = true, crop = false }: Props) {
  return <MercaderV2 variant={ACTIVE_MERCADER_V2} scale={scale} animated={animated} crop={crop} />
}
