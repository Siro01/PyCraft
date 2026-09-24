'use client'

import { useState, useEffect } from 'react'
import { IconBulb } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'

interface Props {
  tip?: string
  /** 'gif' = Rodolfo (público en todas las batallas). 'pixel' = cerdito SVG original,
   * reservado para el jefe final para no romper su estética ASCII/terminal. */
  variant?: 'gif' | 'pixel'
  /** Si hay apuntes con ejemplos para este jefe: abre la ventana de Rodolfo. */
  onOpenLesson?: () => void
}

type MascotState = 'peeking' | 'open'

export default function MascotGuide({ tip, variant = 'gif', onOpenLesson }: Props) {
  const [state, setState] = useState<MascotState>('peeking')
  const [wiggling, setWiggling] = useState(false)
  const [reactKey, setReactKey] = useState(0)

  // Reset to peeking whenever the tip changes (new challenge)
  useEffect(() => {
    setState('peeking')
  }, [tip])

  if (!tip && !onOpenLesson) return null

  const handleClick = () => {
    if (state === 'peeking') {
      setState('open')
      setWiggling(true)
      setReactKey((k) => k + 1) // reinicia el GIF para que Rodolfo "reaccione" al clic
      setTimeout(() => setWiggling(false), 600)
    } else {
      setState('peeking')
    }
  }

  const openLesson = () => {
    setState('peeking')
    sfx.confirm()
    onOpenLesson?.()
  }

  return (
    <div
      className="fixed bottom-6 right-0 z-50 flex items-end select-none"
      style={{ pointerEvents: 'none' }}
    >
      {/* Globo de Rodolfo — solo visible cuando está abierto */}
      {state === 'open' && (
        <div className="mb-3 mr-3 max-w-[250px]" style={{ pointerEvents: 'auto' }}>
          <div
            className="relative"
            style={{ background: 'hsl(var(--surface))', border: '2px solid hsl(var(--accent))', boxShadow: '4px 4px 0 hsl(var(--tx) / 0.2)' }}
          >
            <div className="flex items-center gap-1.5 px-2" style={{ background: 'hsl(var(--accent))', color: 'var(--on-accent)', minHeight: 22 }}>
              <IconBulb size={12} color="var(--on-accent)" />
              <span style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 15, letterSpacing: '0.08em' }}>RODOLFO</span>
            </div>
            {tip && (
              <div className="px-3 py-2" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, lineHeight: 1.15, color: 'hsl(var(--tx))' }}>
                {tip}
              </div>
            )}
            {onOpenLesson && (
              <div className="px-3 pb-2.5 pt-1">
                <button
                  type="button"
                  onClick={openLesson}
                  className="cta-btn cta-btn--primary"
                  style={{ fontSize: 12, padding: '6px 12px', 
                    
                    cursor: 'pointer', 
                  }}
                >
                  Ver ejemplos paso a paso
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col items-end" style={{ gap: 4 }}>
        {/* Acceso directo a los apuntes, siempre visible junto a Rodolfo */}
        {onOpenLesson && state === 'peeking' && (
          <button
            type="button"
            onClick={openLesson}
            title="Abrir los apuntes de Rodolfo"
            className="animate-mascot-wiggle"
            style={{
              pointerEvents: 'auto', marginRight: 8, cursor: 'pointer',
              fontFamily: 'var(--font-jersey), monospace', fontSize: 15, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '2px 10px', background: 'hsl(var(--surface))', color: 'hsl(var(--tx))',
              border: '2px solid hsl(var(--tx))', boxShadow: '3px 3px 0 hsl(var(--tx) / 0.2)',
            }}
          >
            Apuntes
          </button>
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
        {variant === 'gif' ? <RodolfoGif reactKey={reactKey} /> : <PigSVG />}
      </button>
      </div>
    </div>
  )
}

function RodolfoGif({ reactKey }: { reactKey: number }) {
  return (
    <img
      key={reactKey}
      src="/rodolfo/rodolfo.gif"
      width={104}
      height={104}
      alt="Rodolfo, el cerdito guía"
      className="pixel-corners-sm"
      style={{
        imageRendering: 'pixelated',
        display: 'block',
        border: '2px solid hsl(var(--accent) / 0.5)',
        boxShadow: '0 4px 16px hsl(0 0% 0% / 0.35)',
      }}
    />
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
