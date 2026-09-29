'use client'

import { useEffect } from 'react'

const CHEERS = [
  '¡Vas requetebién!',
  '¡Racha increíble!',
  '¡Ni el Creeper te para!',
  '¡Imparable!',
  '¡Así se hace!',
]

interface Props {
  streak: number
  onDone: () => void
}

// Rodolfo asoma a festejar una racha de aciertos — mismo lenguaje visual que
// su aviso de puerta bloqueada, pero en tono de festejo, y se cierra solo.
export default function RodolfoCheer({ streak, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [onDone])

  const msg = CHEERS[streak % CHEERS.length]

  return (
    <div className="fixed bottom-6 right-0 z-50 flex items-end gap-3 pr-3" style={{ pointerEvents: 'none' }}>
      <div
        className="map-rodolfo-in"
        style={{ background: 'hsl(var(--accent))', color: 'var(--on-accent)', border: '2px solid hsl(var(--tx))', boxShadow: '4px 4px 0 hsl(var(--tx) / 0.25)', padding: '8px 14px' }}
      >
        <div style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 16, letterSpacing: '0.05em' }}>
          {msg}
        </div>
        <div className="label-mono" style={{ color: 'var(--on-accent)', opacity: 0.85 }}>Racha de {streak}</div>
      </div>
      <img
        src="/rodolfo/rodolfo.gif"
        width={80}
        height={80}
        alt="Rodolfo festejando"
        style={{ imageRendering: 'pixelated', display: 'block', border: '2px solid hsl(var(--accent))', boxShadow: '0 4px 16px hsl(0 0% 0% / 0.35)' }}
      />
    </div>
  )
}
