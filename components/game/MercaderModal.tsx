'use client'

import { useEffect, useMemo, useState } from 'react'
import { AMULET_META } from '@/lib/game/amulets'
import { buildAmbulanteDialogue } from '@/lib/game/mercader-ambulante-dialogue'
import { AmuletIcon } from '@/components/ui/PixelIcons'
import { MercaderAmbulantePortrait } from '@/components/game/shop/MercaderAmbulantePortrait'
import Win from '@/components/ui/Win'
import { sfx } from '@/lib/game/architect/sound'
import type { AmuletType } from '@/types'

interface Props {
  offers: AmuletType[]
  onChoose: (type: AmuletType) => void
  onSkip: () => void
  /** Jefe recién derrotado — si se conoce, personaliza la felicitación. */
  bossName?: string
  /** El alumno ya derrotó al Mercader del Abismo (jefe #4). `undefined` = no se sabe (no cambia el tono, elige el diálogo más neutro). */
  abismoEncountered?: boolean
}

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

const VISITED_KEY = 'pysql:mercader-ambulante-visited'

// Paleta propia de El Mercader Ambulante — dorado/ámbar/turquesa, contraste
// deliberado con el negro violáceo + cian "brillo de diamante" del hermano
// (ABYSS_PALETTE en ShopApp.tsx). Mismo mecanismo: variables HSL inline que
// nunca pisan el tema global del sitio (dark/light/red siguen intactos
// afuera de este modal).
const AMBULANTE_PALETTE: Record<string, string> = {
  '--bg': '28 38% 10%', '--surface': '30 32% 16%', '--surface2': '30 28% 22%',
  '--border': '32 26% 28%', '--border2': '34 24% 36%',
  '--tx': '42 60% 94%', '--tx2': '38 45% 70%', '--tx3': '36 30% 50%',
  '--accent': '189 75% 58%', '--accent2': '189 55% 72%',
  '--danger': '38 92% 60%', '--on-accent': '28 38% 10%',
}

// Carta de amuleto: franja de nombre, marco rayado con el ícono, efecto y pie.
export function AmuletCard({ type, onClick, disabled, compact = false, footer, selected = false }: {
  type: AmuletType
  onClick?: () => void
  disabled?: boolean
  compact?: boolean
  footer?: string
  /** Resalta la carta como foco de selección actual (ver .book-item-selected). */
  selected?: boolean
}) {
  const meta = AMULET_META[type]
  const w = compact ? 118 : 168
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={meta.description}
      className={[onClick && !disabled ? 'amulet-card' : '', selected ? 'book-item-selected' : ''].filter(Boolean).join(' ') || undefined}
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
          fontFamily: jersey, fontSize: compact ? 13 : 16, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.05,
          background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', padding: '4px 8px', minHeight: compact ? 0 : 40,
          display: 'flex', alignItems: 'center', overflowWrap: 'anywhere',
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

export default function MercaderModal({ offers, onChoose, onSkip, bossName, abismoEncountered }: Props) {
  const [focused, setFocused] = useState<AmuletType | null>(null)
  const [cursor, setCursor] = useState(0)

  // Diálogo armado una sola vez por aparición: felicitación (con o sin
  // presentación si es la primera vez) + el guiño sobre el hermano.
  const dialogue = useMemo(() => {
    let firstVisit = false
    try {
      firstVisit = !localStorage.getItem(VISITED_KEY)
      localStorage.setItem(VISITED_KEY, '1')
    } catch { /* modo privado */ }
    return buildAmbulanteDialogue({ bossName, firstVisit, abismoEncountered })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (focused) setFocused(null); else onSkip(); return }
      if (focused) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sfx.confirm(); onChoose(focused) }
        return
      }
      if (e.key === 'ArrowLeft') setCursor((c) => (c - 1 + offers.length) % offers.length)
      else if (e.key === 'ArrowRight') setCursor((c) => (c + 1) % offers.length)
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sfx.itemFocus(); setFocused(offers[cursor]) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focused, cursor, offers, onSkip, onChoose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 overflow-y-auto"
      style={{ background: 'hsl(0 0% 0% / 0.72)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mercader-title"
        className="animate-mercader-in w-full my-auto"
        style={{ ...(AMBULANTE_PALETTE as React.CSSProperties), maxWidth: 600 }}
      >
        <Win title="MERCADER_AMBULANTE.EXE" active onClose={onSkip} bodyStyle={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ── Presentación: retrato + felicitación + guiño sobre el hermano ── */}
          <div className="flex items-start gap-3 flex-wrap">
            <span style={{ border: '2px solid hsl(var(--tx))', padding: 4, display: 'flex', flexShrink: 0 }} className="hatch">
              <span style={{ background: 'hsl(var(--surface))', display: 'flex', padding: 3 }}>
                <MercaderAmbulantePortrait scale={3} />
              </span>
            </span>
            <div style={{ flex: 1, minWidth: 180 }}>
              <h2 id="mercader-title" style={{ fontFamily: jersey, fontSize: 24, lineHeight: 1, color: 'hsl(var(--tx))', margin: 0 }}>
                ¡El Mercader Ambulante!
              </h2>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dialogue.felicitacion.map((line, i) => (
                  <p key={i} style={{ fontFamily: vt, fontSize: 19, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: 0 }}>
                    {line}
                  </p>
                ))}
                {dialogue.sobreHermano && (
                  <p style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.2, color: 'hsl(var(--tx3))', margin: '2px 0 0', borderLeft: '2px solid hsl(var(--border2))', paddingLeft: 8 }}>
                    {dialogue.sobreHermano}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '2px solid hsl(var(--border2))' }} />

          {/* ── Oferta de amuletos: elegir una carta la agranda en el mismo lugar
              centrado con su explicación adentro — nunca un panel aparte, así
              queda simétrico elijas la carta que elijas. ── */}
          {!focused ? (
            <>
              <p style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx3))', margin: 0, textAlign: 'center' }}>
                Tocá una carta para ver qué hace antes de llevarla.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {offers.map((type, i) => (
                  <AmuletCard
                    key={type}
                    type={type}
                    compact
                    footer="Uso único"
                    selected={cursor === i}
                    onClick={() => { sfx.itemFocus(); setFocused(type); setCursor(i) }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <AmuletCard type={focused} footer="Uso único" selected />
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => { sfx.confirm(); onChoose(focused) }}
                  style={{
                    fontFamily: jersey, fontSize: 15, letterSpacing: '0.04em', textTransform: 'uppercase',
                    padding: '8px 16px', background: 'hsl(var(--accent))', color: 'hsl(var(--on-accent))',
                    border: '2px solid hsl(var(--accent))', boxShadow: '3px 3px 0 hsl(var(--tx) / 0.3)', cursor: 'pointer',
                  }}
                >
                  Llevar este amuleto
                </button>
                <button
                  type="button"
                  onClick={() => setFocused(null)}
                  style={{
                    fontFamily: jersey, fontSize: 14, textTransform: 'uppercase', padding: '8px 14px',
                    background: 'transparent', color: 'hsl(var(--tx2))', border: '2px solid hsl(var(--border2))', cursor: 'pointer',
                  }}
                >
                  ← Ver otra
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onSkip}
            style={{ alignSelf: 'center', fontFamily: vt, fontSize: 19, color: 'hsl(var(--tx3))', background: 'none', border: 'none', cursor: 'pointer' }}
            className="hover:text-tx transition-colors"
          >
            Continuar sin amuleto →
          </button>
        </Win>
      </div>
    </div>
  )
}
