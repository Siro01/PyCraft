'use client'

// Efectos visuales pixel-art compartidos por toda la plataforma: fondo de
// polvo de píxeles, clúster decorativo de esquina, y la explosión de píxeles
// al hacer click. Mismo lenguaje que PixelIcons (grillas de <rect>, sin
// círculos), usando siempre los tokens de color del tema activo.

import { useEffect, useRef } from 'react'

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

export function PixelBlob({ size = 14, color = 'hsl(var(--accent))', opacity = 0.5 }: {
  size?: number; color?: string; opacity?: number
}) {
  return (
    <svg
      width={size * 10}
      height={size * 8}
      viewBox={`0 0 ${size * 10} ${size * 8}`}
      aria-hidden="true"
      style={{ imageRendering: 'pixelated' }}
    >
      {PIXEL_BLOB_CELLS.map(([cx, cy], i) => (
        <rect key={i} x={cx * size} y={cy * size} width={size} height={size} fill={color} opacity={opacity} />
      ))}
    </svg>
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
