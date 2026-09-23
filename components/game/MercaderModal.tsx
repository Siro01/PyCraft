'use client'

import { useEffect } from 'react'
import { AMULET_META } from '@/lib/game/amulets'
import { IconWizard, AmuletIcon } from '@/components/ui/PixelIcons'
import type { AmuletType } from '@/types'

interface Props {
  offers: AmuletType[]
  onChoose: (type: AmuletType) => void
  onSkip: () => void
}

export default function MercaderModal({ offers, onChoose, onSkip }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSkip])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mercader-title"
        className="card p-6 flex flex-col gap-5 w-full max-w-sm mx-4 animate-mercader-in"
        style={{ border: '2px solid #FFB800', boxShadow: '0 0 40px rgba(255,184,0,0.35), 0 0 12px rgba(255,184,0,0.15)' }}
      >
        {/* Header */}
        <div className="text-center">
          <div className="mb-2 flex justify-center">
            <IconWizard size={48} color="#FFB800" />
          </div>
          <h2 id="mercader-title" className="font-mono text-base font-bold" style={{ color: '#FFB800' }}>
            ¡El Mercader Ambulante!
          </h2>
          <p className="font-mono text-xs mt-1" style={{ color: 'hsl(var(--tx3))' }}>
            Elegí un amuleto para tu aventura
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'hsl(var(--border))' }} />

        {/* Amulet offers */}
        <div className="flex flex-col gap-2">
          {offers.map((type) => {
            const meta = AMULET_META[type]
            return (
              <button
                key={type}
                onClick={() => onChoose(type)}
                className="text-left p-3 pixel-corners border transition-all"
                style={{
                  background: 'hsl(var(--surface2))',
                  borderColor: 'hsl(var(--border))',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = meta.color
                  e.currentTarget.style.background = 'hsl(var(--surface))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(var(--border))'
                  e.currentTarget.style.background = 'hsl(var(--surface2))'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0">
                    <AmuletIcon type={type} size={24} color={meta.color} />
                  </span>
                  <div className="min-w-0">
                    <div
                      className="font-mono text-sm font-bold leading-tight"
                      style={{ color: meta.color }}
                    >
                      {meta.name}
                    </div>
                    <div className="font-mono text-xs mt-0.5" style={{ color: 'hsl(var(--tx3))' }}>
                      {meta.description}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Skip */}
        <button
          onClick={onSkip}
          className="font-mono text-xs text-center transition-colors"
          style={{ color: 'hsl(var(--tx3))' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--tx))' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--tx3))' }}
        >
          Continuar sin amuleto →
        </button>
      </div>
    </div>
  )
}
