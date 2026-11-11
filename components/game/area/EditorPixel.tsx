'use client'

import { useMemo, useRef, type PointerEvent as RPointerEvent } from 'react'
import { TRANSPARENTE, aclarar, casillasEspejo, oscurecer, pintar, rellenar, type Espejo } from '@/lib/game/cartas/paleta'
import { tiras } from './PixelArte'

// ─── La grilla para dibujar ──────────────────────────────────────────────────
// Clic (o arrastrar) pinta; clic derecho borra. El espejo pinta también las
// casillas reflejadas. Cada trazo es un solo paso para "deshacer".

export type Herramienta = 'lapiz' | 'goma' | 'balde' | 'gotero' | 'sombra' | 'luz'

interface Props {
  w: number
  h: number
  valor: string
  color: string
  herramienta: Herramienta
  espejo: Espejo
  /** Tamaño de cada casilla en px. */
  celda: number
  onCambio: (p: string) => void
  /** Antes de cada trazo (para "deshacer"). */
  onTrazo: () => void
  onGotero: (color: string) => void
  etiqueta: string
}

export default function EditorPixel({ w, h, valor, color, herramienta, espejo, celda, onCambio, onTrazo, onGotero, etiqueta }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const trazo = useRef<{ boton: number; vistas: Set<number>; p: string; ultima: { x: number; y: number } } | null>(null)
  const rects = useMemo(() => tiras(valor, w, h), [valor, w, h])

  const casilla = (e: RPointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const x = Math.floor(((e.clientX - r.left) / r.width) * w)
    const y = Math.floor(((e.clientY - r.top) / r.height) * h)
    return x >= 0 && y >= 0 && x < w && y < h ? { x, y } : null
  }

  const aplicar = (x: number, y: number) => {
    const t = trazo.current
    if (!t) return
    const borrar = t.boton === 2 || herramienta === 'goma'
    const i = y * w + x
    if (t.vistas.has(i)) return
    for (const [a, b] of casillasEspejo(x, y, w, h, espejo)) t.vistas.add(b * w + a)
    const antes = t.p
    let p = t.p
    if (borrar) p = pintar(p, w, h, x, y, TRANSPARENTE, espejo)
    else if (herramienta === 'lapiz') p = pintar(p, w, h, x, y, color, espejo)
    else if (herramienta === 'balde') p = rellenar(p, w, h, x, y, color, espejo)
    else if (herramienta === 'sombra' || herramienta === 'luz') {
      const arr = p.split('')
      for (const [a, b] of casillasEspejo(x, y, w, h, espejo)) {
        const k = b * w + a
        arr[k] = herramienta === 'sombra' ? oscurecer(arr[k]) : aclarar(arr[k])
      }
      p = arr.join('')
    }
    t.p = p
    if (p !== antes) onCambio(p)
  }

  const abajo = (e: RPointerEvent<SVGSVGElement>) => {
    const c = casilla(e)
    if (!c) return
    e.preventDefault()
    if (herramienta === 'gotero' && e.button !== 2) {
      const ch = valor[c.y * w + c.x]
      if (ch && ch !== TRANSPARENTE) onGotero(ch)
      return
    }
    onTrazo()
    trazo.current = { boton: e.button, vistas: new Set(), p: valor, ultima: c }
    ref.current?.setPointerCapture(e.pointerId)
    aplicar(c.x, c.y)
    // El balde es un solo clic: no sigue al arrastrar.
    if (herramienta === 'balde') trazo.current = null
  }

  const mover = (e: RPointerEvent<SVGSVGElement>) => {
    if (!trazo.current) return
    const c = casilla(e)
    if (!c) return
    // Si el mouse saltó varias casillas, se pintan también las del medio (línea continua).
    const { x: x0, y: y0 } = trazo.current.ultima
    const pasos = Math.max(Math.abs(c.x - x0), Math.abs(c.y - y0))
    for (let i = 1; i <= pasos; i++) {
      aplicar(Math.round(x0 + ((c.x - x0) * i) / pasos), Math.round(y0 + ((c.y - y0) * i) / pasos))
    }
    if (trazo.current) trazo.current.ultima = c
  }

  const soltar = () => { trazo.current = null }

  return (
    <svg
      ref={ref}
      role="img"
      aria-label={etiqueta}
      viewBox={`0 0 ${w} ${h}`}
      width={w * celda}
      height={h * celda}
      shapeRendering="crispEdges"
      style={{ display: 'block', touchAction: 'none', cursor: 'crosshair', border: '2px solid hsl(var(--tx))', boxSizing: 'content-box', maxWidth: '100%', height: 'auto' }}
      onPointerDown={abajo}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onContextMenu={(e) => e.preventDefault()}
    >
      <defs>
        {/* Transparente = damero gris (como en cualquier editor) */}
        <pattern id="ep-vacio" width={2} height={2} patternUnits="userSpaceOnUse">
          <rect width={2} height={2} fill="hsl(var(--surface))" />
          <rect width={1} height={1} fill="hsl(var(--surface2))" />
          <rect x={1} y={1} width={1} height={1} fill="hsl(var(--surface2))" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#ep-vacio)" />
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.n} height={1} fill={r.c} />)}
      {/* Líneas de la grilla, y las del medio más marcadas (ayudan con el espejo) */}
      <g stroke="hsl(var(--tx) / 0.18)" strokeWidth={0.04} shapeRendering="auto">
        {Array.from({ length: w - 1 }, (_, i) => <line key={`v${i}`} x1={i + 1} y1={0} x2={i + 1} y2={h} />)}
        {Array.from({ length: h - 1 }, (_, i) => <line key={`h${i}`} x1={0} y1={i + 1} x2={w} y2={i + 1} />)}
      </g>
      {(espejo === 'horizontal' || espejo === 'cuatro') && <line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke="hsl(var(--accent))" strokeWidth={0.12} strokeDasharray="0.4 0.3" />}
      {(espejo === 'vertical' || espejo === 'cuatro') && <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="hsl(var(--accent))" strokeWidth={0.12} strokeDasharray="0.4 0.3" />}
    </svg>
  )
}
