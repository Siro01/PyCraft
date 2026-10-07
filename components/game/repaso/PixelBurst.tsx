'use client'

import { useMemo } from 'react'

interface Props {
  /** 'chalk' = polvo de tiza que salta del acierto · 'confetti' = papelitos al terminar. */
  kind: 'chalk' | 'confetti'
}

// Pixeles sueltos con keyframes por pasos — mismo truco que NodeSplash del
// mapa: sin canvas ni requestAnimationFrame, nada que pese en las PCs del
// taller. Se monta con un `key` nuevo cada vez que hay que dispararlo y se
// apaga solo (la animación termina en opacidad 0). Con reduced-motion no se ve.
export default function PixelBurst({ kind }: Props) {
  const pieces = useMemo(() => {
    if (kind === 'chalk') {
      return Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4
        const d = 26 + Math.random() * 30
        return {
          x: Math.round(Math.cos(a) * d), y: Math.round(Math.sin(a) * d * 0.8) - 6,
          s: i % 3 === 0 ? 6 : 4, c: i % 4 === 0 ? 'var(--accent)' : 'var(--tx)', delay: Math.random() * 60,
        }
      })
    }
    return Array.from({ length: 34 }, (_, i) => ({
      x: Math.round((Math.random() - 0.5) * 520), y: Math.round(180 + Math.random() * 160),
      s: [4, 6, 8][i % 3], c: ['var(--accent)', 'var(--tx)', 'var(--tx2)'][i % 3], delay: Math.random() * 500,
      r: Math.round((Math.random() - 0.5) * 540),
    }))
  }, [kind])

  return (
    <span className={`pixel-burst pixel-burst--${kind}`} aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            width: p.s, height: p.s, background: `hsl(${p.c})`, animationDelay: `${p.delay}ms`,
            ['--bx' as string]: `${p.x}px`, ['--by' as string]: `${p.y}px`, ['--br' as string]: `${'r' in p ? p.r : 0}deg`,
          }}
        />
      ))}
    </span>
  )
}
