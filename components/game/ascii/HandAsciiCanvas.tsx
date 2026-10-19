'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { HandArt } from '@/lib/game/ascii/hand/kit'
import { CELL_H, CELL_W, FONT, matchGlyphs, type CellPick } from './glyph-match'

// Dibuja un personaje ASCII hecho a mano (lib/game/ascii/hand/*). Cada celda de
// carácter elige su letra por forma (glyph-match): por eso el dibujo tiene
// bordes, curvas y puntas en vez de manchas de densidad. Una tinta por celda,
// resplandor de fósforo por CSS y una lupa para ver las letras de cerca.

const ALPHA_STEPS = 4
const LENS = 200 // lado de la lupa (px)
const ZOOM = 3

interface Props {
  art: HandArt
  /** Caja máxima en px. */
  width: number
  height: number
  label: string
}

interface Built { cols: number; rows: number; cells: CellPick[] }

export default function HandAsciiCanvas({ art, width, height, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const lensRef = useRef<HTMLCanvasElement>(null)
  const cache = useMemo(() => new Map<number, Built>(), [art])
  const [frame, setFrame] = useState(0)
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null)

  const cols = Math.floor(art.w / CELL_W)
  const rows = Math.floor(art.h / CELL_H)
  // Celda con la forma de una letra: el doble de alta que de ancha.
  const cw = Math.min(width / cols, height / (rows * 2))
  const chh = cw * 2
  const w = Math.round(cols * cw)
  const h = Math.round(rows * chh)

  const build = useCallback((i: number): Built => {
    let b = cache.get(i)
    if (!b) {
      const f = art.make(i / art.frames, i)
      b = matchGlyphs(f.w, f.h, f.luma, f.ink, art.palette.length)
      cache.set(i, b)
    }
    return b
  }, [art, cache])

  useEffect(() => {
    setFrame(0)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setFrame((f) => (f + 1) % art.frames), art.ms / art.frames)
    return () => clearInterval(id)
  }, [art])

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    cv.width = Math.ceil(w * dpr)
    cv.height = Math.ceil(h * dpr)
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // Fondo transparente: la ventana ya es negra y así el resplandor no dibuja un recuadro.
    ctx.clearRect(0, 0, w, h)
    ctx.font = `bold ${cw / 0.6}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const b = build(frame)
    // Se agrupa por tinta y brillo para cambiar de pincel pocas veces.
    const groups: number[][] = Array.from({ length: art.palette.length * ALPHA_STEPS }, () => [])
    b.cells.forEach((c, i) => {
      if (c.ch === ' ') return
      groups[c.ink * ALPHA_STEPS + Math.min(ALPHA_STEPS - 1, Math.floor(c.tone * ALPHA_STEPS))].push(i)
    })
    groups.forEach((cells, g) => {
      if (!cells.length) return
      ctx.fillStyle = art.palette[Math.floor(g / ALPHA_STEPS)]
      ctx.globalAlpha = 0.62 + 0.38 * (((g % ALPHA_STEPS) + 0.5) / ALPHA_STEPS)
      for (const i of cells) {
        const x = i % b.cols, y = (i / b.cols) | 0
        ctx.fillText(b.cells[i].ch, x * cw + cw / 2, y * chh + chh / 2)
      }
    })
    ctx.globalAlpha = 1
  }, [build, frame, art, cw, chh, w, h])

  // Lupa: vuelve a escribir las letras de alrededor del puntero, 3 veces más
  // grandes (texto real, no una imagen agrandada: se ven nítidas).
  useEffect(() => {
    const dst = lensRef.current
    if (!lens || !dst) return
    const dpr = window.devicePixelRatio || 1
    dst.width = LENS * dpr
    dst.height = LENS * dpr
    const ctx = dst.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, LENS, LENS)
    const zw = cw * ZOOM, zh = chh * ZOOM
    ctx.font = `bold ${zw / 0.6}px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const b = build(frame)
    // Celda bajo el puntero y origen de la lupa (en px de la lupa).
    const ox = LENS / 2 - lens.x * ZOOM, oy = LENS / 2 - lens.y * ZOOM
    const x0 = Math.max(0, Math.floor(-ox / zw)), x1 = Math.min(b.cols - 1, Math.ceil((LENS - ox) / zw))
    const y0 = Math.max(0, Math.floor(-oy / zh)), y1 = Math.min(b.rows - 1, Math.ceil((LENS - oy) / zh))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const c = b.cells[y * b.cols + x]
        if (c.ch === ' ') continue
        ctx.fillStyle = art.palette[c.ink]
        ctx.globalAlpha = 0.62 + 0.38 * c.tone
        ctx.fillText(c.ch, ox + x * zw + zw / 2, oy + y * zh + zh / 2)
      }
    }
    ctx.globalAlpha = 1
  }, [lens, frame, build, art, cw, chh])

  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    setLens({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <div className="hand-ascii" style={{ width: w, height: h }}>
      <canvas
        ref={ref}
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerLeave={() => setLens(null)}
        style={{ width: w, height: h, display: 'block', filter: `drop-shadow(0 0 ${Math.max(2, cw * 0.8)}px ${art.palette[0]}44)` }}
      />
      {lens && (
        <canvas
          ref={lensRef}
          className="hand-ascii-lens"
          aria-hidden="true"
          style={{
            width: LENS, height: LENS,
            left: Math.min(w - LENS, Math.max(0, lens.x + 24)),
            top: Math.min(h - LENS, Math.max(0, lens.y - LENS / 2)),
          }}
        />
      )}
    </div>
  )
}
