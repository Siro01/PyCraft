'use client'

import { memo, useMemo, type CSSProperties } from 'react'
import { TRANSPARENTE, colorHex } from '@/lib/game/cartas/paleta'

// Un dibujo de la paleta PyCraft como SVG: cada fila se junta en tiras del
// mismo color (pocos <rect>), bordes nítidos, sin suavizado.

export interface Tira { x: number; y: number; n: number; c: string }

export function tiras(p: string, w: number, h: number): Tira[] {
  const out: Tira[] = []
  for (let y = 0; y < h; y++) {
    let x = 0
    while (x < w) {
      const ch = p[y * w + x]
      if (!ch || ch === TRANSPARENTE) { x++; continue }
      let n = 1
      while (x + n < w && p[y * w + x + n] === ch) n++
      const c = colorHex(ch)
      if (c) out.push({ x, y, n, c })
      x += n
    }
  }
  return out
}

function PixelArte({ p, w, h, ajuste = 'meet', style, fondo }: {
  p: string
  w: number
  h: number
  /** 'meet' = entra entero centrado · 'none' = estira para llenar (el dorso). */
  ajuste?: 'meet' | 'none'
  style?: CSSProperties
  /** Color detrás del dibujo (fondo liso). */
  fondo?: string
}) {
  const rects = useMemo(() => tiras(p, w, h), [p, w, h])
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      preserveAspectRatio={ajuste === 'none' ? 'none' : 'xMidYMid meet'}
      shapeRendering="crispEdges"
      aria-hidden
      style={{ display: 'block', ...style }}
    >
      {fondo && <rect width={w} height={h} fill={fondo} />}
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.n} height={1} fill={r.c} />)}
    </svg>
  )
}

export default memo(PixelArte)
