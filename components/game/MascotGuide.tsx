'use client'

import { useState, useEffect } from 'react'
import { IconBulb } from '@/components/ui/PixelIcons'

interface Props {
  tip?: string
}

type MascotState = 'peeking' | 'open'

export default function MascotGuide({ tip }: Props) {
  const [state, setState] = useState<MascotState>('peeking')
  const [wiggling, setWiggling] = useState(false)

  // Reset to peeking whenever the tip changes (new challenge)
  useEffect(() => {
    setState('peeking')
  }, [tip])

  if (!tip) return null

  const handleClick = () => {
    if (state === 'peeking') {
      setState('open')
      setWiggling(true)
      setTimeout(() => setWiggling(false), 600)
    } else {
      setState('peeking')
    }
  }

  return (
    <div
      className="fixed bottom-6 right-0 z-50 flex items-end select-none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Speech bubble — only visible when open */}
      {state === 'open' && (
        <div
          className="mb-3 mr-2 max-w-[220px]"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Bubble body */}
          <div
            className="relative pixel-corners-sm px-3 py-2 font-mono text-[11px] leading-relaxed shadow-lg"
            style={{
              background: 'hsl(var(--surface))',
              border: '2px solid hsl(var(--accent))',
              color: 'hsl(var(--tx2))',
              imageRendering: 'pixelated',
            }}
          >
            <span
              className="flex items-center gap-1 mb-1 font-bold text-[10px] tracking-widest"
              style={{ color: 'hsl(var(--accent))' }}
            >
              <IconBulb size={12} color="hsl(var(--accent))" />
              PISTA
            </span>
            {tip}
            {/* Tail pointing right */}
            <span
              className="absolute right-[-10px] bottom-4"
              style={{
                width: 0,
                height: 0,
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderLeft: '10px solid hsl(var(--accent))',
                display: 'block',
              }}
            />
            <span
              className="absolute right-[-7px] bottom-[17px]"
              style={{
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '9px solid hsl(var(--surface))',
                display: 'block',
              }}
            />
          </div>
        </div>
      )}

      {/* Mascot pig — always rendered, peeking from right edge */}
      <button
        onClick={handleClick}
        title={state === 'peeking' ? '¡Clic para ver la pista!' : 'Cerrar pista'}
        className={wiggling ? 'animate-mascot-wiggle' : state === 'peeking' ? 'animate-mascot-peek' : ''}
        style={{
          pointerEvents: 'auto',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          transform: state === 'peeking' ? 'translateX(65%)' : 'translateX(0)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <PigSVG />
      </button>
    </div>
  )
}

function PigSVG() {
  return (
    <svg
      width="64"
      height="72"
      viewBox="0 0 16 18"
      xmlns="http://www.w3.org/2000/svg"
      style={{ imageRendering: 'pixelated', display: 'block' }}
      role="img"
      aria-label="Cerdito guía"
    >
      {/* Body */}
      <rect x="3" y="7" width="10" height="8" fill="#F4A5B0" />
      {/* Head */}
      <rect x="2" y="2" width="12" height="7" rx="1" fill="#F4A5B0" />
      {/* Ears */}
      <rect x="2" y="1" width="3" height="3" fill="#E8869A" />
      <rect x="11" y="1" width="3" height="3" fill="#E8869A" />
      {/* Eyes */}
      <rect x="5" y="4" width="2" height="2" fill="#2A1A1A" />
      <rect x="9" y="4" width="2" height="2" fill="#2A1A1A" />
      {/* Eye shine */}
      <rect x="6" y="4" width="1" height="1" fill="#fff" />
      <rect x="10" y="4" width="1" height="1" fill="#fff" />
      {/* Snout */}
      <rect x="5" y="7" width="6" height="3" rx="1" fill="#E8869A" />
      {/* Nostrils */}
      <rect x="6" y="8" width="1" height="1" fill="#C96B82" />
      <rect x="9" y="8" width="1" height="1" fill="#C96B82" />
      {/* Legs */}
      <rect x="4" y="15" width="2" height="3" fill="#E8869A" />
      <rect x="10" y="15" width="2" height="3" fill="#E8869A" />
      {/* Tail */}
      <rect x="13" y="9" width="1" height="1" fill="#E8869A" />
      <rect x="14" y="8" width="1" height="1" fill="#E8869A" />
      <rect x="14" y="7" width="1" height="1" fill="#E8869A" />
      {/* Blush */}
      <rect x="3" y="6" width="2" height="1" fill="#F2748C" opacity="0.5" />
      <rect x="11" y="6" width="2" height="1" fill="#F2748C" opacity="0.5" />
    </svg>
  )
}
