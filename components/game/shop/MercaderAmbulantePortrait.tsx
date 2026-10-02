'use client'

import MercaderV2 from './MercaderV2'
import { MERCADER_AMBULANTE_V2 } from '@/lib/game/mercader-v2-sprite'

interface Props {
  scale?: number
  /** Plano medio (por defecto): sin el aire de arriba ni el ruedo, se ve más grande. */
  crop?: boolean
}

// El Mercader Ambulante — hermano del Mercader del Abismo, dibujado con el
// mismo lenguaje (lib/game/mercader-v2-sprite.ts): más bajo y redondo, un
// solo ojo grande que guiña, los colores del hermano intercambiados (manto
// índigo, mochila verde-gris), farol cálido y amuletos colgando de la mochila.
export function MercaderAmbulantePortrait({ scale = 3, crop = true }: Props) {
  return <MercaderV2 variant={MERCADER_AMBULANTE_V2} scale={scale} crop={crop} />
}
