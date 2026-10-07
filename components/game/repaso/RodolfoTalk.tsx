'use client'

import { useEffect, useRef, useState } from 'react'
import { PixelBitmap, ICON_ARROW_RIGHT } from '@/components/game/architect/desktop/PixelBitmap'
import { sfx } from '@/lib/game/architect/sound'

const vt = 'var(--font-vt323), monospace'
const jersey = 'var(--font-jersey), monospace'

interface Props {
  /** Globos de esta tanda — se leen de a uno. */
  lines: string[]
  /** Cambia cuando Rodolfo "reacciona" (acierto, pista…) para reiniciar la animación del GIF. */
  mood?: 'talk' | 'happy' | 'think'
  /** Avisa cuando el alumno ya leyó el último globo. */
  onReadAll?: () => void
}

// Rodolfo en su pupitre, con un globo que se escribe letra por letra (con su
// tic agudo de "voz"). Clic en el globo, o Enter, completa la línea; si ya
// estaba completa, pasa al globo siguiente.
export default function RodolfoTalk({ lines, mood = 'talk', onReadAll }: Props) {
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(0)
  const [gifKey, setGifKey] = useState(0)
  const reduce = useRef(false)
  const linesKey = lines.join('\u0000')

  useEffect(() => {
    reduce.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    setIdx(0)
    setShown(0)
    setGifKey((k) => k + 1)
  }, [linesKey, mood])

  const text = lines[idx] ?? ''
  const typing = shown < text.length

  useEffect(() => {
    if (!typing) return
    if (reduce.current) { setShown(text.length); return }
    const t = setTimeout(() => {
      setShown((n) => Math.min(text.length, n + 2))
      const ch = text[shown]
      if (shown % 4 === 0 && ch && /[a-záéíóúñ]/i.test(ch)) sfx.rodolfoBlip(ch)
    }, 26)
    return () => clearTimeout(t)
  }, [typing, shown, text])

  const last = idx >= lines.length - 1
  useEffect(() => {
    if (last && !typing) onReadAll?.()
  }, [last, typing, onReadAll])

  const advance = () => {
    if (typing) { setShown(text.length); return }
    if (!last) { setIdx((i) => i + 1); setShown(0); sfx.select() }
  }

  return (
    <div className="repaso-rodolfo">
      <button
        key={`${gifKey}-${idx}`}
        type="button"
        onClick={advance}
        className="repaso-bubble"
        aria-live="polite"
        aria-label={typing ? 'Mostrar todo el texto' : last ? text : 'Siguiente globo de Rodolfo'}
        data-mood={mood}
      >
        <span className="repaso-bubble-head">
          <span style={{ fontFamily: jersey, fontSize: 15, letterSpacing: '0.08em' }}>RODOLFO</span>
          {lines.length > 1 && (
            <span className="label-mono" style={{ color: 'inherit', opacity: 0.85 }}>{idx + 1}/{lines.length}</span>
          )}
        </span>
        <span className="repaso-bubble-body" style={{ fontFamily: vt }}>
          {text.slice(0, shown)}
          {typing && <span className="animate-caret" aria-hidden="true">█</span>}
        </span>
        {!typing && !last && (
          <span className="repaso-bubble-next" aria-hidden="true">
            <span className="label-mono" style={{ color: 'hsl(var(--tx3))' }}>clic para seguir</span>
            <span className="repaso-next-arrow"><PixelBitmap rows={ICON_ARROW_RIGHT} scale={2} ink="hsl(var(--accent))" /></span>
          </span>
        )}
      </button>
      <img
        key={gifKey}
        src="/rodolfo/rodolfo.gif"
        width={112}
        height={112}
        alt=""
        className={mood === 'happy' ? 'repaso-pig repaso-pig--happy' : 'repaso-pig'}
      />
    </div>
  )
}
