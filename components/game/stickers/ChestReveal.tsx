'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CHEST_CLOSED, CHEST_OPEN, PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { ACT_LABEL, getChestSticker } from '@/lib/game/chest-stickers'
import { sfx } from '@/lib/game/architect/sound'
import ChestStickerToy, { ChestSparkle, SecretTag, useTyped, type ToySay } from './ChestStickerToy'

// El momento de abrir un cofre del mapa: la tapa tiembla, se abre, sube el
// sticker entre rayos de luz pixelados y queda flotando — ya se puede tocar.
// Abajo, lo que había en el cofre (y la pista hacia el secreto del acto).
// Es el premio a explorar, así que se toma su segundo; Esc, Enter o el botón
// lo cierran en cualquier momento y el sticker ya quedó guardado igual.

type Phase = 'shake' | 'open' | 'rise'

/** Tokens de color que se copian del lugar donde se abrió el cofre (la paleta del acto). */
const PALETTE_TOKENS = ['--bg', '--surface', '--surface2', '--border', '--border2', '--tx', '--tx2', '--tx3', '--accent', '--accent2', '--python', '--sql', '--danger', '--on-accent']

interface Props {
  stickerId: string
  onClose: () => void
  /** Vista de prueba: los toques al sticker no se guardan. */
  demo?: boolean
}

export default function ChestReveal({ stickerId, onClose, demo = false }: Props) {
  const def = getChestSticker(stickerId)
  const [phase, setPhase] = useState<Phase>('shake')
  const [say, setSay] = useState<ToySay | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const secret = def?.kind === 'secreto'

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setPhase('rise'); sfx.chestOpen(); return }
    const a = setTimeout(() => { setPhase('open'); sfx.chestOpen() }, 520)
    const b = setTimeout(() => setPhase('rise'), 820)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])

  useEffect(() => {
    if (phase === 'rise') btnRef.current?.focus()
  }, [phase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => { sfx.close(); onClose() }

  const found = useTyped(def?.found ?? '', def?.voice ?? 'machine', phase === 'rise')
  // Se monta en <body>: adentro del mapa quedaba atrapada en su capa y los
  // stickers pegados en el escritorio (y otras ventanas) le pasaban por encima.
  // Pero conserva los colores del lugar donde se abrió (la paleta del acto,
  // que el mapa pone como variables en su contenedor): un marcador invisible
  // queda en el lugar original y de ahí se copian los tokens.
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [palette, setPalette] = useState<React.CSSProperties>({})
  const anchorRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    setHost(document.body)
    const el = anchorRef.current
    if (!el) return
    const cs = getComputedStyle(el)
    const vars: Record<string, string> = {}
    for (const t of PALETTE_TOKENS) {
      const v = cs.getPropertyValue(t).trim()
      if (v) vars[t] = v
    }
    setPalette(vars as React.CSSProperties)
  }, [])
  if (!def) return null
  const shown = say ?? null

  const anchor = <span ref={anchorRef} hidden aria-hidden />
  if (!host) return anchor

  return <>{anchor}{createPortal(
    <div className="cs-reveal" role="dialog" aria-modal="true" aria-labelledby="cs-reveal-name" onClick={close} style={palette}>
      <div className={`cs-reveal-win${secret ? ' is-secret' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="cs-reveal-bar">
          <span>{secret ? 'COFRE_SECRETO.DAT' : 'COFRE.DAT'}</span>
          <button type="button" onClick={close} aria-label="Cerrar" className="cs-reveal-x">×</button>
        </div>

        <div className="cs-reveal-stage">
          {phase === 'rise' && <span className="cs-reveal-rays" aria-hidden />}
          <span className={`cs-reveal-chest${phase === 'shake' ? ' is-shaking' : ''}`}>
            <PixelBitmap rows={phase === 'shake' ? CHEST_CLOSED : CHEST_OPEN} scale={5} />
          </span>
          {phase !== 'shake' && (
            <span className={`cs-reveal-sticker${phase === 'rise' ? ' is-up' : ''}`}>
              <ChestStickerToy id={def.id} size={80} bubble="none" demo={demo} interactive={phase === 'rise'} onSay={setSay} />
              <ChestSparkle kind={def.kind} px={11} style={{ right: -14, top: -8 }} />
            </span>
          )}
        </div>

        <div className="cs-reveal-body">
          <div className="cs-reveal-tags">
            <span className={`cs-rarity${secret ? ' is-secret' : ''}`}>{secret ? 'Cofre secreto' : 'Cofre'}</span>
            <span className="cs-rarity cs-rarity--act">{ACT_LABEL[def.act]}</span>
          </div>
          <h2 id="cs-reveal-name" className="cs-reveal-name">{def.name}</h2>

          {/* Lo último que dijo el sticker al tocarlo; si no, lo que había en el cofre. */}
          {shown ? (
            <p className={`cs-reveal-say${shown.secret ? ' is-secret' : ''}`} key={shown.n} aria-live="polite">
              {shown.secret && <SecretTag />}
              <SayLine text={shown.text} voice={def.voice} />
            </p>
          ) : (
            <p className="cs-reveal-text">
              {found}
              <span className="cs-bubble-ghost" aria-hidden>{def.found.slice(found.length)}</span>
            </p>
          )}

          {def.hint && phase === 'rise' && (
            <p className="cs-reveal-hint">
              <span className="cs-reveal-hint-k">Pista</span>
              {def.hint}
            </p>
          )}

          <div className="cs-reveal-actions">
            <button ref={btnRef} type="button" className="inv-go" onClick={close}>¡Me lo quedo!</button>
            <span className="cs-reveal-note">Ya está en tu inventario. Tocalo para que hable.</span>
          </div>
        </div>
      </div>
    </div>,
    host,
  )}</>
}

function SayLine({ text, voice }: { text: string; voice: 'machine' | 'cat' }) {
  const typed = useTyped(text, voice)
  return (
    <>
      {typed}
      <span className="cs-bubble-ghost" aria-hidden>{text.slice(typed.length)}</span>
    </>
  )
}
