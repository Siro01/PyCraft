'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MERCADER_V2_CROP, MERCADER_V2_FRAME_COUNT, MV2_H, MV2_W, mercaderV2Frame, mercaderV2Palette, type MercaderV2Id,
} from '@/lib/game/mercader-v2-sprite'

/** Mercader del Abismo (rediseño): 8 cuadros a 180ms; quieto con prefers-reduced-motion.
 *  `crop`: plano medio (ver MERCADER_V2_CROP) para que se vea más grande en el mismo espacio. */
export default function MercaderV2({ variant, scale = 4, animated = true, crop = false }: { variant: MercaderV2Id; scale?: number; animated?: boolean; crop?: boolean }) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!animated || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setFrame((f) => (f + 1) % MERCADER_V2_FRAME_COUNT), 180)
    return () => clearInterval(id)
  }, [animated])

  const palette = mercaderV2Palette(variant)
  const rects = useMemo(() => {
    const out: { x: number; y: number; n: number; c: string }[] = []
    mercaderV2Frame(variant, frame).forEach((row, y) => {
      let x = 0
      while (x < row.length) {
        const ch = row[x]
        if (ch === '.' || !palette[ch]) { x++; continue }
        let n = 1
        while (x + n < row.length && row[x + n] === ch) n++
        out.push({ x, y, n, c: palette[ch] })
        x += n
      }
    })
    return out
  }, [variant, frame, palette])

  const box = (crop && MERCADER_V2_CROP[variant]) || { x: 0, y: 0, w: MV2_W, h: MV2_H }

  return (
    <svg
      width={box.w * scale}
      height={box.h * scale}
      viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={variant === 'ambulante' ? 'El Mercader Ambulante' : 'El Mercader del Abismo'}
      style={{ display: 'block' }}
    >
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.n} height={1} fill={r.c} />)}
    </svg>
  )
}
