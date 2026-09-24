'use client'

import { useEffect, useState } from 'react'
import type { Boss } from '@/types'
import ArchitectCanvas from './architect/ArchitectCanvas'

interface BossSpriteProps {
  boss: Boss
  size?: 'sm' | 'md' | 'lg'
  defeated?: boolean
  animated?: boolean
  /** hp actual / hp máximo (0..1). Solo El Arquitecto lo usa: se deshace a medida que pierde vida. */
  hpRatio?: number
}

// ─── Display sizes (matches the old CSS-grid sizes) ──────────────────────────
// Source sprites are 32×32 px; sizes are integer multiples (2×/3×/4×) so pixels stay crisp
// with image-rendering: pixelated. 16×16 sprites (creeper) scale 4×/6×/8×.
const DISPLAY_PX = { sm: 64, md: 96, lg: 128 } as const

// ─── CSS fallback pixel maps (8×8 grids) ─────────────────────────────────────
// Colors: 0=transparent  1=primary  2=darkened  3=lightened
const PIXEL_MAPS: Record<string, number[][]> = {
  'creeper-formulario': [
    [0,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,0],
    [0,1,2,2,1,2,2,1],
    [0,1,2,2,1,2,2,1],
    [0,1,1,2,2,1,1,0],
    [0,1,2,2,2,2,1,0],
    [0,1,2,1,1,2,1,0],
    [0,0,1,0,0,1,0,0],
  ],
  'guardian-puerta': [
    [0,0,3,3,3,3,0,0],
    [0,1,1,1,1,1,1,0],
    [0,1,2,1,1,2,1,0],
    [0,1,1,3,3,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,3,2,1,1,2,3,1],
    [0,1,0,1,1,0,1,0],
    [0,1,0,0,0,0,1,0],
  ],
  'golem-infinito': [
    [1,1,1,1,1,1,1,1],
    [1,2,1,1,1,1,2,1],
    [1,1,3,1,1,3,1,1],
    [2,1,1,1,1,1,1,2],
    [1,1,1,1,1,1,1,1],
    [1,2,1,2,2,1,2,1],
    [1,1,0,1,1,0,1,1],
    [1,0,0,1,1,0,0,1],
  ],
  'mercader-abismo': [
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,0],
    [1,1,2,1,1,2,1,1],
    [0,1,1,3,3,1,1,0],
    [0,1,3,3,3,3,1,0],
    [0,1,0,1,1,0,1,0],
    [0,1,0,1,1,0,1,0],
  ],
  'maestro-craftero': [
    [0,0,1,1,1,1,0,0],
    [0,1,1,2,2,1,1,0],
    [0,1,2,1,1,2,1,0],
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [3,1,2,1,1,2,1,3],
    [0,1,0,0,0,0,1,0],
    [0,1,0,0,0,0,1,0],
  ],
  'archivista': [
    [0,0,0,1,1,0,0,0],
    [0,0,1,1,1,1,0,0],
    [0,1,1,2,2,1,1,0],
    [0,1,3,1,1,3,1,0],
    [1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,1],
    [0,1,2,3,3,2,1,0],
    [0,0,1,1,1,1,0,0],
  ],
  'constructor-vacio': [
    [0,3,3,3,3,3,3,0],
    [1,1,1,1,1,1,1,1],
    [0,1,2,1,1,2,1,0],
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,3,1,1,1,1,3,1],
    [0,1,1,0,0,1,1,0],
    [0,1,0,0,0,0,1,0],
  ],
  'oraculo-oscuro': [
    [0,0,1,1,1,1,0,0],
    [0,1,3,3,3,3,1,0],
    [1,3,3,2,1,3,3,1],
    [1,3,2,1,2,1,3,1],
    [1,3,1,2,1,2,3,1],
    [0,1,3,3,3,3,1,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,2,2,0,0,0],
  ],
  'contador-almas': [
    [2,1,1,1,1,1,1,2],
    [2,3,0,3,0,3,0,2],
    [2,1,1,1,1,1,1,2],
    [2,0,3,0,3,0,3,2],
    [2,1,1,1,1,1,1,2],
    [0,2,0,0,0,0,2,0],
    [0,1,1,0,0,1,1,0],
    [0,0,1,1,1,1,0,0],
  ],
  'falsificador': [
    [0,1,1,1,1,1,1,0],
    [1,3,1,3,2,1,2,1],
    [1,3,2,3,2,2,2,1],
    [1,3,3,1,2,2,1,1],
    [0,1,1,1,1,1,1,0],
    [0,1,2,1,1,3,1,0],
    [0,1,0,1,1,0,1,0],
    [0,1,0,0,0,0,1,0],
  ],
  'el-nexo': [
    [1,0,0,0,0,0,0,1],
    [1,1,0,0,0,0,1,1],
    [1,3,0,0,0,0,3,1],
    [1,1,3,1,1,3,1,1],
    [1,1,1,3,3,1,1,1],
    [0,1,1,1,1,1,1,0],
    [0,0,1,0,0,1,0,0],
    [0,0,1,0,0,1,0,0],
  ],
  'la-hydra': [
    [1,0,1,0,1,0,1,0],
    [1,1,1,1,1,1,1,1],
    [1,2,1,2,1,2,1,1],
    [0,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,0,0],
    [0,1,2,1,1,2,1,0],
    [0,1,0,1,1,0,1,0],
    [0,0,0,1,1,0,0,0],
  ],
  'dragon-rojo': [
    [0,0,3,0,0,3,0,0],
    [0,1,1,1,1,1,1,0],
    [1,2,1,2,2,1,2,1],
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [0,3,1,1,1,1,3,0],
    [0,0,1,2,2,1,0,0],
    [0,0,0,1,1,0,0,0],
  ],
  'el-arquitecto': [
    [0,3,1,1,1,1,3,0],
    [1,1,1,1,1,1,1,1],
    [1,1,2,1,1,2,1,1],
    [3,1,1,1,1,1,1,3],
    [1,1,3,3,3,3,1,1],
    [1,1,1,1,1,1,1,1],
    [0,1,1,0,0,1,1,0],
    [0,1,0,1,1,0,1,0],
  ],
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
function darken(hex: string, amount = 0.35) {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${Math.round(r*(1-amount))},${Math.round(g*(1-amount))},${Math.round(b*(1-amount))})`
}
function lighten(hex: string, amount = 0.4) {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${Math.min(255,Math.round(r+(255-r)*amount))},${Math.min(255,Math.round(g+(255-g)*amount))},${Math.min(255,Math.round(b+(255-b)*amount))})`
}

// ─── CSS fallback grid ────────────────────────────────────────────────────────
function CssFallback({ boss, size, defeated }: { boss: Boss; size: 'sm'|'md'|'lg'; defeated: boolean }) {
  const CELL_SIZES = { sm: 6, md: 10, lg: 14 }
  const cellPx = CELL_SIZES[size]
  const map = PIXEL_MAPS[boss.id] ?? PIXEL_MAPS['creeper-formulario']
  const colors: Record<number, string> = {
    0: 'transparent',
    1: defeated ? '#4A4A5A' : boss.color,
    2: defeated ? '#2A2A3A' : darken(boss.color),
    3: defeated ? '#6A6A7A' : lighten(boss.color),
  }
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${map[0].length}, ${cellPx}px)`,
      gap: '2px',
      imageRendering: 'pixelated',
    }}>
      {map.flatMap((row, ri) =>
        row.map((cell, ci) => (
          <div key={`${ri}-${ci}`} style={{
            width: cellPx, height: cellPx,
            background: colors[cell],
            boxShadow: cell !== 0 && !defeated ? `inset 0 0 0 1px ${darken(boss.color, 0.15)}` : undefined,
          }} />
        ))
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
// El Arquitecto (BOSS-14) no usa sprite: es una imagen de caracteres/puntos que se deshace con el HP.
const ARCHITECT_PX = { sm: 64, md: 120, lg: 240 } as const

function ArchitectSprite({ boss, size, defeated, animated, hpRatio }: Required<Pick<BossSpriteProps, 'size' | 'defeated' | 'animated'>> & { boss: Boss; hpRatio: number }) {
  return (
    <div
      className={animated && !defeated ? 'animate-boss-idle' : ''}
      style={{ width: ARCHITECT_PX[size], opacity: defeated ? 0.7 : 1 }}
    >
      <ArchitectCanvas
        mode={size === 'lg' ? 'ascii' : 'dots'}
        integrity={defeated ? 0.12 : hpRatio}
        color={defeated ? '#7A8794' : '#BFE9FF'}
        animate={animated && !defeated}
        label={boss.name}
      />
    </div>
  )
}

export default function BossSprite({ boss, size = 'md', defeated = false, animated = false, hpRatio = 1 }: BossSpriteProps) {
  if (boss.id === 'el-arquitecto') {
    return <ArchitectSprite boss={boss} size={size} defeated={defeated} animated={animated} hpRatio={hpRatio} />
  }
  return <StaticBossSprite boss={boss} size={size} defeated={defeated} animated={animated} />
}

// Sprites que todavía no existen: se prueba cada archivo una sola vez por sesión y se
// recuerda el resultado, así no se pide (ni falla con 404) en cada render, y mientras
// tanto se muestra el dibujo alternativo en lugar del texto de la imagen rota.
const spriteStatus = new Map<string, 'ok' | 'missing'>()

function readCached(src: string): 'ok' | 'missing' | undefined {
  const mem = spriteStatus.get(src)
  if (mem) return mem
  try {
    // "missing" caduca a los 5 min: si se sube el dibujo, aparece sin tener que cerrar la pestaña.
    const v = sessionStorage.getItem(`sprite:${src}`)
    if (v === 'ok') return 'ok'
    if (v?.startsWith('missing@') && Date.now() - Number(v.slice(8)) < 5 * 60_000) return 'missing'
  } catch {}
  return undefined
}

function useSpriteStatus(src: string): 'loading' | 'ok' | 'missing' {
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing'>('loading')
  useEffect(() => {
    const cached = readCached(src)
    if (cached) { setStatus(cached); return }
    let alive = true
    const probe = new window.Image()
    const done = (r: 'ok' | 'missing') => {
      spriteStatus.set(src, r)
      try { sessionStorage.setItem(`sprite:${src}`, r === 'ok' ? 'ok' : `missing@${Date.now()}`) } catch {}
      if (alive) setStatus(r)
    }
    probe.onload = () => done('ok')
    probe.onerror = () => done('missing')
    probe.src = src
    return () => { alive = false }
  }, [src])
  return status
}

function StaticBossSprite({ boss, size, defeated, animated }: { boss: Boss; size: 'sm' | 'md' | 'lg'; defeated: boolean; animated: boolean }) {
  const px = DISPLAY_PX[size]

  // Naming convention: /sprites/{boss.id}.gif (animated) or .png (static)
  // Defeated variant: /sprites/{boss.id}-defeated.gif or .png  (optional)
  const idleSrc     = `/sprites/${boss.id}.gif`
  const defeatedSrc = `/sprites/${boss.id}-defeated.gif`
  const src = defeated ? defeatedSrc : idleSrc
  const status = useSpriteStatus(src)

  const wrapperStyle: React.CSSProperties = {
    opacity: defeated ? 0.5 : 1,
    filter: defeated ? 'grayscale(0.7)' : 'none',
  }

  return (
    <div
      className={animated && !defeated ? 'animate-boss-idle' : ''}
      style={wrapperStyle}
    >
      {status === 'ok' ? (
        <img
          src={src}
          alt={boss.name}
          width={px}
          height={px}
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
      ) : (
        <CssFallback boss={boss} size={size} defeated={defeated} />
      )}
    </div>
  )
}
