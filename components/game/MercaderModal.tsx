'use client'

import { useEffect } from 'react'
import { AMULET_META } from '@/lib/game/amulets'
import { IconWizard, AmuletIcon } from '@/components/ui/PixelIcons'
import Win from '@/components/ui/Win'
import { sfx } from '@/lib/game/architect/sound'
import type { AmuletType } from '@/types'

interface Props {
  offers: AmuletType[]
  onChoose: (type: AmuletType) => void
  onSkip: () => void
}

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

// Carta de amuleto: franja de nombre, marco rayado con el ícono, efecto y pie.
export function AmuletCard({ type, onClick, disabled, compact = false, footer }: {
  type: AmuletType
  onClick?: () => void
  disabled?: boolean
  compact?: boolean
  footer?: string
}) {
  const meta = AMULET_META[type]
  const w = compact ? 118 : 168
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={meta.description}
      className={onClick && !disabled ? 'amulet-card' : undefined}
      style={{
        width: w, display: 'flex', flexDirection: 'column', textAlign: 'left', padding: 0,
        background: 'hsl(var(--surface))', border: '2px solid hsl(var(--tx))',
        boxShadow: '4px 4px 0 hsl(var(--tx) / 0.2)',
        cursor: onClick && !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          fontFamily: jersey, fontSize: compact ? 14 : 16, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.05,
          background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', padding: '4px 8px', minHeight: compact ? 0 : 40,
          display: 'flex', alignItems: 'center',
        }}
      >
        {meta.name}
      </span>
      <span
        className="hatch"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 6, border: '2px solid hsl(var(--tx))', padding: compact ? 6 : 12 }}
      >
        <span style={{ background: 'hsl(var(--surface))', padding: 6, display: 'flex' }}>
          <AmuletIcon type={type} size={compact ? 28 : 44} color="hsl(var(--tx))" />
        </span>
      </span>
      {!compact && (
        <span style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.08, color: 'hsl(var(--tx2))', padding: '0 8px 8px', flex: 1 }}>
          {meta.description}
        </span>
      )}
      <span
        style={{
          fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
          borderTop: '2px solid hsl(var(--tx))', padding: '3px 8px', color: 'hsl(var(--tx3))',
          display: 'flex', justifyContent: 'space-between', gap: 6,
        }}
      >
        <span>{footer ?? 'Uso único'}</span>
        {onClick && !disabled && !compact && <span style={{ color: 'hsl(var(--accent))' }}>Elegir</span>}
      </span>
    </button>
  )
}

export default function MercaderModal({ offers, onChoose, onSkip }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSkip])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'hsl(var(--bg) / 0.78)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mercader-title"
        className="animate-mercader-in w-full"
        style={{ maxWidth: 460 }}
      >
        <Win title="MERCADER_AMBULANTE.EXE" active onClose={onSkip} bodyStyle={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="flex items-center gap-3">
            <span style={{ border: '2px solid hsl(var(--tx))', padding: 6, display: 'flex' }} className="hatch">
              <span style={{ background: 'hsl(var(--surface))', display: 'flex', padding: 4 }}>
                <IconWizard size={40} color="hsl(var(--tx))" />
              </span>
            </span>
            <div>
              <h2 id="mercader-title" style={{ fontFamily: jersey, fontSize: 26, lineHeight: 1, color: 'hsl(var(--tx))', margin: 0 }}>
                ¡El Mercader Ambulante!
              </h2>
              <p style={{ fontFamily: vt, fontSize: 20, color: 'hsl(var(--tx2))', margin: '2px 0 0' }}>
                Elegí una carta: te acompaña en tus próximas batallas.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {offers.map((type) => (
              <AmuletCard key={type} type={type} onClick={() => { sfx.confirm(); onChoose(type) }} />
            ))}
          </div>

          <button
            type="button"
            onClick={onSkip}
            style={{ alignSelf: 'center', fontFamily: vt, fontSize: 20, color: 'hsl(var(--tx3))', background: 'none', border: 'none', cursor: 'pointer' }}
            className="hover:text-tx transition-colors"
          >
            Continuar sin amuleto →
          </button>
        </Win>
      </div>
    </div>
  )
}
