'use client'

import { memo, useMemo } from 'react'
import { ACCENT_H, layoutWestern } from '@/lib/game/raid/western-font'

// Títulos del Pistolero con su tipografía pixel de cartel del Oeste
// (lib/game/raid/western-font.ts): sombra de madera quemada, cuerpo de brasa
// que se oscurece hacia abajo y un filo de luz en cada borde de arriba.
// Es un SVG de rectángulos: nítido en cualquier tamaño y sin fuentes extra.

const TONES = {
  brasa: { top: '#FFF1D0', hi: '#FF7A50', lo: '#E0401E', shadow: '#46120A' },
  hueso: { top: '#FFF8E8', hi: '#EBC79E', lo: '#C79C6E', shadow: '#3A2A20' },
} as const

interface Props {
  text: string
  /** Lado de cada píxel, en px. */
  px?: number
  tone?: keyof typeof TONES
  className?: string
  /** Etiqueta para lectores de pantalla (por defecto, el texto). */
  label?: string
}

function WesternText({ text, px = 4, tone = 'brasa', className, label }: Props) {
  const map = useMemo(() => layoutWestern(text), [text])
  const c = TONES[tone]
  const w = map[0]?.length ?? 0
  const h = map.length
  const rects = useMemo(() => {
    const out: { x: number; y: number; fill: string }[] = []
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (map[y][x] !== '#') continue
        const top = y === 0 || map[y - 1][x] !== '#'
        out.push({ x, y, fill: top ? c.top : y - ACCENT_H < 5 ? c.hi : c.lo })
      }
    }
    return out
  }, [map, w, h, c])

  return (
    <svg
      className={className}
      role="img"
      aria-label={label ?? text}
      viewBox={`0 0 ${w + 1} ${h + 1}`}
      width={(w + 1) * px}
      height={(h + 1) * px}
      shapeRendering="crispEdges"
      style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
    >
      {rects.map((r) => <rect key={`s${r.x}-${r.y}`} x={r.x + 1} y={r.y + 1} width={1} height={1} fill={c.shadow} />)}
      {rects.map((r) => <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={1} height={1} fill={r.fill} />)}
    </svg>
  )
}

export default memo(WesternText)
