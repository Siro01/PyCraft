'use client'

// Barra de carga pixel-art con segmentos, para que ninguna espera se sienta
// como una página trabada. Sin `progress` simula avance (se acerca al 96 % sin
// llegar nunca) — el componente se desmonta cuando la carga real termina.

import { useEffect, useState } from 'react'
import { PixelDust } from './PixelFX'

type Size = 'md' | 'sm' | 'xs'

const CFG: Record<Size, { segments: number; height: number; border: number; gap: number; pad: number }> = {
  md: { segments: 32, height: 26, border: 6, gap: 3, pad: 5 },
  sm: { segments: 24, height: 14, border: 3, gap: 2, pad: 3 },
  xs: { segments: 12, height: 8,  border: 2, gap: 1, pad: 2 },
}

function useSimulatedProgress(controlled: number | undefined, estimatedMs: number) {
  const [p, setP] = useState(0)
  useEffect(() => {
    if (controlled !== undefined) return
    const start = performance.now()
    const tau = estimatedMs / 3
    const id = setInterval(() => {
      setP(96 * (1 - Math.exp(-(performance.now() - start) / tau)))
    }, 100)
    return () => clearInterval(id)
  }, [controlled, estimatedMs])
  return Math.max(0, Math.min(100, controlled ?? p))
}

interface LoadingBarProps {
  label?: string
  size?: Size
  /** 0–100. Si se omite, el avance se simula. */
  progress?: number
  /** Duración estimada de la carga real (solo para el avance simulado). */
  estimatedMs?: number
  /** 'current' hereda el color del texto (útil dentro de botones). */
  tone?: 'default' | 'current'
  className?: string
}

export function LoadingBar({
  label = 'Cargando...', size = 'sm', progress, estimatedMs = 4000, tone = 'default', className = '',
}: LoadingBarProps) {
  const pct = useSimulatedProgress(progress, estimatedMs)
  const { segments, height, border, gap, pad } = CFG[size]
  const filled = Math.floor((pct / 100) * segments)
  const current = tone === 'current'
  const frame = current ? 'currentColor' : 'hsl(var(--tx))'
  const fill = current ? 'currentColor' : 'hsl(var(--accent))'

  const bar = (
    <div
      aria-hidden="true"
      style={{
        border: `${border}px solid ${frame}`,
        background: current ? 'transparent' : 'hsl(var(--bg))',
        padding: pad,
        display: 'flex',
        gap,
        width: size === 'xs' ? 84 : '100%',
        flexShrink: 0,
      }}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          style={{ flex: 1, height, background: i < filled ? fill : 'transparent' }}
        />
      ))}
    </div>
  )

  const pctText = <span className="tabular">{Math.round(pct)}%</span>

  if (size === 'xs') {
    return (
      <span
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className={`inline-flex items-center gap-2 font-mono text-xs ${className}`}
      >
        <span>{label}</span>
        {bar}
        {pctText}
      </span>
    )
  }

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={`w-full ${className}`}
    >
      <div
        className={size === 'md' ? 'font-jersey text-2xl mb-4' : 'font-mono text-xs mb-2'}
        style={{ color: current ? 'inherit' : 'hsl(var(--tx))' }}
      >
        {label}
      </div>
      {bar}
      <div
        className={`text-right mt-2 ${size === 'md' ? 'font-jersey text-xl' : 'font-mono text-xs'}`}
        style={{ color: current ? 'inherit' : 'hsl(var(--tx))' }}
      >
        {pctText}
      </div>
    </div>
  )
}

// Pantalla completa — para rutas y vistas que todavía no tienen nada que mostrar.
export function LoadingScreen({ label = 'Cargando...', estimatedMs = 3000 }: { label?: string; estimatedMs?: number }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden"
      style={{ background: 'hsl(var(--bg))' }}
      role="status"
      aria-live="polite"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.6) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <PixelDust />
      <div className="relative z-10 w-full max-w-lg">
        <LoadingBar size="md" label={label} estimatedMs={estimatedMs} />
      </div>
    </div>
  )
}
