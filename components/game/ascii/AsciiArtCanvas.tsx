'use client'

import { useEffect, useRef } from 'react'
import type { AsciiArt, AsciiStyle } from '@/lib/game/ascii/sprite-ascii'

// Dibuja un AsciiArt en un <canvas>, siempre sobre negro (como el Arquitecto y
// los jefes secretos). `color` es el fósforo del personaje.

interface Props {
  art: AsciiArt
  style: AsciiStyle
  color: string
  /** Caja máxima en px; el tamaño de letra sale de acá. */
  width: number
  height?: number
  label: string
}

const CHAR_W = 0.6 // ancho de una letra monoespaciada, en "em"

/** Color del sprite con el brillo de la celda: mismo tono, legible sobre negro. */
function litColor(r: number, g: number, b: number, tone: number): string {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255
  const l = (mx + mn) / 2
  const d = mx - mn
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d) {
    const R = r / 255, G = g / 255, B = b / 255
    h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return `hsl(${h.toFixed(0)} ${(s * 100).toFixed(0)}% ${(38 + 50 * tone).toFixed(0)}%)`
}

export default function AsciiArtCanvas({ art, style, color, width, height = Infinity, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const font = Math.max(4, Math.min(width / (art.cols * CHAR_W), height / (art.rows * 1.2)))
  const cw = font * CHAR_W
  const lh = font * 1.2 // CELL_ASPECT = 2 → 1.2em de alto / 0.6em de ancho
  const w = Math.ceil(art.cols * cw)
  const h = Math.ceil(art.rows * lh)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    cv.width = Math.ceil(w * dpr)
    cv.height = Math.ceil(h * dpr)
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    ctx.font = `bold ${font}px "Courier New", ui-monospace, Consolas, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (style === 'fosforo') { ctx.shadowColor = color; ctx.shadowBlur = Math.max(2, font * 0.5) }

    art.cells.forEach((c, i) => {
      if (c.ch === ' ') return
      const x = (i % art.cols) * cw + cw / 2
      const y = Math.floor(i / art.cols) * lh + lh / 2
      if (style === 'fosforo') {
        ctx.fillStyle = color
        ctx.globalAlpha = 0.35 + 0.65 * c.tone
      } else if (style === 'color') {
        ctx.fillStyle = c.edge ? litColor(c.r, c.g, c.b, 0.9) : litColor(c.r, c.g, c.b, c.tone)
        ctx.globalAlpha = 0.6 + 0.4 * c.cover
      } else {
        ctx.fillStyle = c.edge ? '#F5F5F5' : color
        ctx.globalAlpha = c.edge ? 1 : 0.25 + 0.6 * c.tone
      }
      ctx.fillText(c.ch, x, y)
    })
    ctx.globalAlpha = 1
  }, [art, style, color, font, cw, lh, w, h])

  return <canvas ref={ref} role="img" aria-label={label} style={{ width: w, height: h, display: 'block' }} />
}
