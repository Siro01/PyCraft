'use client'

import { PixelBitmap, type Bitmap } from '@/components/game/architect/desktop/PixelBitmap'

// Chispas pixel que titilan y flotan a los costados del título (tomadas del
// espíritu del arranque de Omarchy). Solo adorno: aria-hidden, sin eventos.

const FLAKE: Bitmap = [
  '...#...',
  '.#.#.#.',
  '..###..',
  '#######',
  '..###..',
  '.#.#.#.',
  '...#...',
]
const PLUS: Bitmap = ['..#..', '..#..', '#####', '..#..', '..#..']
const DOT: Bitmap = ['##', '##']

type Kind = 'flake' | 'plus' | 'dot'
interface Spark { x: number; y: number; kind: Kind; ink: string; scale: number; delay: number; rise?: boolean }

const ACCENT = 'hsl(var(--accent))'
const PY = 'hsl(var(--python))'
const SQL = 'hsl(var(--sql))'
const TX = 'hsl(var(--tx2))'

// Lado izquierdo (x en % del ancho de la sección); el derecho es su espejo
const LEFT: Spark[] = [
  { x: 5,  y: 22, kind: 'flake', ink: ACCENT, scale: 5, delay: 0.2, rise: true },
  { x: 11, y: 12, kind: 'dot',   ink: PY,     scale: 4, delay: 1.1 },
  { x: 15, y: 30, kind: 'plus',  ink: SQL,    scale: 4, delay: 0.7, rise: true },
  { x: 3,  y: 44, kind: 'dot',   ink: TX,     scale: 3, delay: 1.7 },
  { x: 9,  y: 52, kind: 'flake', ink: PY,     scale: 3, delay: 1.4 },
  { x: 17,  y: 60, kind: 'dot',  ink: ACCENT, scale: 4, delay: 0.4 },
  { x: 6,  y: 70, kind: 'plus',  ink: TX,     scale: 3, delay: 2.0, rise: true },
  { x: 13, y: 78, kind: 'dot',   ink: SQL,    scale: 3, delay: 0.9 },
]

export default function HeroSparks() {
  const items = [
    ...LEFT.map(s => ({ ...s, side: 'l' as const })),
    ...LEFT.map((s, i) => ({ ...s, x: 100 - s.x, delay: s.delay + 0.5 + (i % 3) * 0.2, side: 'r' as const })),
  ]
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none hidden md:block">
      {items.map((s, i) => (
        <span
          key={i}
          className={s.rise ? 'spark-rise' : undefined}
          style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.delay}s` }}
        >
          <span className="spark" style={{ display: 'block', animationDelay: `${s.delay}s` }}>
            <PixelBitmap rows={s.kind === 'flake' ? FLAKE : s.kind === 'plus' ? PLUS : DOT} scale={s.scale} ink={s.ink} />
          </span>
        </span>
      ))}
    </div>
  )
}
