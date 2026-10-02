'use client'

import { memo, useEffect, useMemo, useState } from 'react'

// Título de cada acto en una fuente bitmap propia de 5×7 (+2 filas arriba para
// tildes), dibujada como filas de texto — mismo lenguaje que PixelBitmap. Va
// en SVG de rects para poder animar letra por letra: cada letra cae en 4
// pasos al entrar y después "salta" un píxel en ola cada tanto. En el Acto IV
// (`glitch`) las letras se corrompen a ratos y se separan en dos tintas.

const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
}
// Tildes: la letra base + 2 filas de acento arriba.
const ACCENTED: Record<string, string> = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U' }
const ACCENT_ROWS = ['...#.', '..#..']
const BLANK_ROWS = ['.....', '.....']
const H = 9
const GAP = 1
const SPACE_W = 3

const NOISE = ['#', '%', '?', '!', '0', '1', '_', '/', 'X', 'Z']

function glyphRows(ch: string): string[] | null {
  const up = ch.toUpperCase()
  if (ACCENTED[up]) return [...ACCENT_ROWS, ...GLYPHS[ACCENTED[up]]]
  if (GLYPHS[up]) return [...BLANK_ROWS, ...GLYPHS[up]]
  return null
}

interface Letter { x: number; rects: { x: number; y: number; w: number }[] }

function layout(text: string): { letters: Letter[]; width: number } {
  const letters: Letter[] = []
  let x = 0
  for (const ch of text) {
    const rows = glyphRows(ch)
    if (!rows) { x += SPACE_W; continue }
    const rects: Letter['rects'] = []
    rows.forEach((row, y) => {
      let i = 0
      while (i < row.length) {
        if (row[i] !== '#') { i++; continue }
        let n = 1
        while (row[i + n] === '#') n++
        rects.push({ x: i, y, w: n })
        i += n
      }
    })
    letters.push({ x, rects })
    x += 5 + GAP
  }
  return { letters, width: Math.max(1, x - GAP) }
}

interface Props {
  text: string
  /** Px de pantalla por píxel de la fuente (se achica sola si no entra). */
  scale?: number
  glitch?: boolean
  /** Cambia para volver a correr la animación de entrada. */
  playKey?: string
}

function PixelTitle({ text, scale = 5, glitch = false, playKey }: Props) {
  // Acto IV: cada ~2.4s una ráfaga corta reemplaza letras al azar por ruido.
  const [noisy, setNoisy] = useState<string | null>(null)
  useEffect(() => {
    // Al cambiar de acto el ruido viejo se descarta: si no, salir del Acto IV
    // a mitad de una ráfaga dejaba dibujadas las letras de "EL ARQUITECTO"
    // en el título siguiente (más ancho que su caja → descentrado).
    setNoisy(null)
    if (!glitch) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let burst: ReturnType<typeof setInterval> | null = null
    const tick = setInterval(() => {
      let n = 0
      burst = setInterval(() => {
        n++
        if (n > 4) { if (burst) clearInterval(burst); setNoisy(null); return }
        setNoisy([...text].map((c) => (c !== ' ' && Math.random() < 0.3 ? NOISE[Math.floor(Math.random() * NOISE.length)] : c)).join(''))
      }, 70)
    }, 2400)
    return () => { clearInterval(tick); if (burst) clearInterval(burst); setNoisy(null) }
  }, [glitch, text])

  const shown = noisy && noisy.length === text.length ? noisy : text
  const { letters } = useMemo(() => layout(shown), [shown])
  // Centrado por la TINTA real del texto (no por la caja de las letras ni
  // por la sombra): el viewBox va del primer al último píxel pintado con el
  // mismo margen a cada lado, y la sombra de 1px sobresale (overflow
  // visible). Si no, la sombra de la derecha y las columnas vacías de letras
  // como la P corrían el título hacia la izquierda. Se mide sobre el texto
  // real, así las ráfagas de ruido del Acto IV no lo hacen saltar de lado.
  const ink = useMemo(() => {
    let lo = Infinity, hi = -Infinity
    for (const l of layout(text).letters) {
      for (const r of l.rects) { lo = Math.min(lo, l.x + r.x); hi = Math.max(hi, l.x + r.x + r.w) }
    }
    return Number.isFinite(lo) ? { lo, w: hi - lo } : { lo: 0, w: 1 }
  }, [text])
  const pad = 1
  const vbW = ink.w + pad * 2
  const vbH = H + pad * 2

  const lettersSvg = (fill: string, cls?: string) => (
    <g className={cls}>
      {letters.map((l, i) => (
        <g key={i} transform={`translate(${l.x - ink.lo + pad} ${pad})`}>
          <g className="ptitle-letter" style={{ ['--i' as string]: i }}>
            <g className="ptitle-hop">
              {l.rects.map((r, j) => <rect key={j} x={r.x} y={r.y} width={r.w} height={1} fill={fill} />)}
            </g>
          </g>
        </g>
      ))}
    </g>
  )

  return (
    <svg
      key={playKey}
      className={`ptitle${glitch ? ' ptitle--glitch' : ''}`}
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={vbW * scale}
      height={vbH * scale}
      shapeRendering="crispEdges"
      role="img"
      aria-label={text}
      style={{ display: 'block', maxWidth: '100%', height: 'auto', overflow: 'visible' }}
    >
      {/* Sombra dura: la misma letra desplazada 1px, en tinta tenue. */}
      <g transform="translate(1 1)">{lettersSvg('hsl(var(--tx) / 0.28)')}</g>
      {glitch && lettersSvg('hsl(var(--accent))', 'ptitle-split')}
      {lettersSvg('hsl(var(--tx))')}
    </svg>
  )
}

export default memo(PixelTitle)
