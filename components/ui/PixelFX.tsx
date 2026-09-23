'use client'

// Efectos visuales pixel-art compartidos por toda la plataforma: fondo de
// polvo de píxeles, clúster decorativo de esquina, y la explosión de píxeles
// al hacer click. Mismo lenguaje que PixelIcons (grillas de <rect>, sin
// círculos), usando siempre los tokens de color del tema activo.

import { useEffect, useId, useRef, useState } from 'react'

// Gradiente "en bandas" (cortes duros, no blend suave) — la técnica real
// detrás del wordmark de omarchy.org: un linearGradient vertical con cada
// color repetido en dos offsets consecutivos para crear un escalón en vez
// de una transición. Acá usamos nuestros propios tokens de tema (no los
// colores de Omarchy) para respetar la paleta del proyecto.
export const BAND_TOKENS = ['--tx', '--accent', '--accent2', '--tx2', '--tx3']

export function bandedGradient(tokens: readonly string[] = BAND_TOKENS) {
  const n = tokens.length
  const stops: string[] = []
  tokens.forEach((tok, i) => {
    const start = (i / n) * 100
    const end = ((i + 1) / n) * 100
    stops.push(`hsl(var(${tok})) ${start}%`, `hsl(var(${tok})) ${end}%`)
  })
  return `linear-gradient(180deg, ${stops.join(', ')})`
}

// Mismo criterio pero como stops de <linearGradient> SVG (para el cursor y
// el clúster decorativo, que son <rect> y no texto).
function useBandedSvgGradient(tokens: readonly string[] = BAND_TOKENS) {
  const id = useId().replace(/[:]/g, '')
  const n = tokens.length
  return {
    id,
    node: (
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        {tokens.flatMap((tok, i) => [
          <stop key={`${i}a`} offset={`${(i / n) * 100}%`} stopColor={`hsl(var(${tok}))`} />,
          <stop key={`${i}b`} offset={`${((i + 1) / n) * 100}%`} stopColor={`hsl(var(${tok}))`} />,
        ])}
      </linearGradient>
    ),
  }
}

// PRNG con semilla fija: mismo resultado en server y cliente (sin mismatch de
// hidratación) y sin depender de Math.random en el render.
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const PIXEL_DUST = (() => {
  const rand = seededRandom(1337)
  return Array.from({ length: 90 }, () => {
    const r = rand()
    return {
      x: rand() * 100,
      y: rand() * 100,
      size: r < 0.7 ? 2 : r < 0.92 ? 3 : 5,
      opacity: 0.08 + rand() * 0.3,
    }
  })
})()

export function PixelDust() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      {PIXEL_DUST.map((p, i) => (
        <rect
          key={i}
          x={`${p.x}%`}
          y={`${p.y}%`}
          width={p.size}
          height={p.size}
          fill="hsl(var(--tx2))"
          opacity={p.opacity}
          style={{ imageRendering: 'pixelated' }}
        />
      ))}
    </svg>
  )
}

// Clúster de píxeles decorativo — pensado como acento de esquina en vez de
// un blob/gradiente suave.
const PIXEL_BLOB_CELLS: [number, number][] = [
  [4, 0], [5, 0],
  [3, 1], [4, 1], [5, 1], [6, 1],
  [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
  [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3],
  [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
  [3, 5], [4, 5], [5, 5], [6, 5],
  [4, 6], [5, 6],
]

export function PixelBlob({ size = 14, color = 'hsl(var(--accent))', opacity = 0.5, gradient = false }: {
  size?: number; color?: string; opacity?: number; gradient?: boolean
}) {
  const band = useBandedSvgGradient()
  const fill = gradient ? `url(#${band.id})` : color
  return (
    <svg
      width={size * 10}
      height={size * 8}
      viewBox={`0 0 ${size * 10} ${size * 8}`}
      aria-hidden="true"
      style={{ imageRendering: 'pixelated' }}
    >
      {gradient && <defs>{band.node}</defs>}
      {PIXEL_BLOB_CELLS.map(([cx, cy], i) => (
        <rect key={i} x={cx * size} y={cy * size} width={size} height={size} fill={fill} opacity={opacity} />
      ))}
    </svg>
  )
}

// ── Texto con "shatter" por letra ────────────────────────────────────────────
// Cada carácter es su propio span clickeable: al hacer click, la letra hace
// un "punch" (se achica/gira/desvanece con timing por steps, no suave) y
// suelta una lluvia de píxeles + un anillo cuadrado expandiéndose, como si
// se hiciera pedazos — y vuelve a su lugar. e.stopPropagation() evita que
// el mismo click dispare también la explosión global de PixelFXProvider.
function LetterDebris({ color }: { color: string }) {
  const particles = useRef<{ dx: number; dy: number; size: number; delay: number; duration: number; color: string }[] | null>(null)
  if (!particles.current) {
    const count = 12
    particles.current = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
      const dist = 12 + Math.random() * 26
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist * 0.7 + 5,
        size: [2, 2, 3, 3, 4][Math.floor(Math.random() * 5)],
        delay: Math.random() * 40,
        duration: 380 + Math.random() * 240,
        color: Math.random() < 0.65 ? color : 'hsl(var(--tx))',
      }
    })
  }
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <span
        style={{
          position: 'absolute', left: '50%', top: '50%', width: 8, height: 8,
          border: `2px solid ${color}`, transform: 'translate(-50%, -50%) scale(1)',
          animation: 'letter-ring-pulse 0.45s steps(6) forwards',
        }}
      />
      {particles.current.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute', left: '50%', top: '50%', width: p.size, height: p.size,
            background: p.color, imageRendering: 'pixelated',
            animation: `pixel-burst ${p.duration}ms steps(5) ${p.delay}ms forwards`,
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
          } as React.CSSProperties}
        />
      ))}
    </span>
  )
}

function ShatterLetter({ ch, color }: { ch: string; color: string }) {
  const [shatterId, setShatterId] = useState(0)

  useEffect(() => {
    if (!shatterId) return
    const t = setTimeout(() => setShatterId(0), 650)
    return () => clearTimeout(t)
  }, [shatterId])

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setShatterId((id) => id + 1) }}
      style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
    >
      <span key={`ch-${shatterId}`} style={shatterId ? { animation: 'letter-punch 0.6s steps(6) both' } : undefined}>
        {ch}
      </span>
      {shatterId ? <LetterDebris key={`debris-${shatterId}`} color={color} /> : null}
    </span>
  )
}

export function ShatterText({ text, color, className, style }: {
  text: string; color: string; className?: string; style?: React.CSSProperties
}) {
  return (
    <span className={className} style={style}>
      {[...text].map((ch, i) => (
        ch === ' '
          ? <span key={i}>&nbsp;</span>
          : <ShatterLetter key={i} ch={ch} color={color} />
      ))}
    </span>
  )
}

// Explosión de píxeles de colores al hacer click, usando los tokens del tema.
const BURST_COLORS = [
  'hsl(var(--accent))',
  'hsl(var(--accent2))',
  'hsl(var(--python))',
  'hsl(var(--sql))',
  'hsl(var(--tx2))',
]

export function PixelBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  const particles = useRef<{ dx: number; dy: number; size: number; color: string; delay: number; duration: number }[] | null>(null)
  if (!particles.current) {
    const count = 20
    particles.current = Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const dist = 22 + Math.random() * 42
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: [3, 4, 4, 5, 6][Math.floor(Math.random() * 5)],
        color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
        delay: Math.random() * 50,
        duration: 480 + Math.random() * 320,
      }
    })
  }
  useEffect(() => {
    const t = setTimeout(onDone, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="fixed pointer-events-none" style={{ left: x, top: y, zIndex: 999 }} aria-hidden="true">
      {particles.current.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: -p.size / 2,
            top: -p.size / 2,
            width: p.size,
            height: p.size,
            background: p.color,
            imageRendering: 'pixelated',
            animation: `pixel-burst ${p.duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${p.delay}ms forwards`,
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
