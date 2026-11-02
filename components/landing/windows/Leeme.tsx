'use client'

import { useEffect, useState } from 'react'
import { PixelBitmap, ICON_PIG, STICKER_BITMAPS } from '@/components/game/architect/desktop/PixelBitmap'

// LEEME.txt: Rodolfo le cuenta al creeper de qué se trata el taller.

export function Bubble({ text, side, visible, delay }: {
  text: string; side: 'left' | 'right'; visible: boolean; delay: number
}) {
  const right = side === 'right'
  return (
    <div
      className={`flex items-end gap-3 ${right ? 'flex-row-reverse' : ''}`}
      style={{
        transition: `opacity 0.5s steps(5) ${delay}ms, transform 0.5s steps(5) ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : right ? 'translateX(20px)' : 'translateX(-20px)',
      }}
    >
      <span
        className="hatch shrink-0 flex"
        style={{ border: '2px solid hsl(var(--tx))', padding: 4 }}
        aria-hidden="true"
      >
        <span style={{ background: 'hsl(var(--surface))', display: 'flex', padding: 3 }}>
          {right
            ? <PixelBitmap rows={STICKER_BITMAPS.creeper} scale={4} ink="hsl(var(--accent))" />
            : <PixelBitmap rows={ICON_PIG} scale={3} />}
        </span>
      </span>
      <div
        className="max-w-xs px-4 py-3"
        style={{
          fontFamily: 'var(--font-vt323), monospace', fontSize: 22, lineHeight: 1.15,
          background: right ? 'hsl(var(--accent))' : 'hsl(var(--surface))',
          color: right ? 'var(--on-accent, hsl(var(--bg)))' : 'hsl(var(--tx))',
          border: `2px solid ${right ? 'hsl(var(--accent))' : 'hsl(var(--tx))'}`,
          boxShadow: '4px 4px 0 hsl(var(--tx) / 0.22)',
        }}
      >
        {text}
      </div>
    </div>
  )
}

const LINES: { side: 'left' | 'right'; text: string }[] = [
  { side: 'left', text: 'print(" En este taller vamos a trabajar con PROGRAMACIÓN, Python y... Minecraft?")' },
  { side: 'right', text: '¿Como que Minecraft? ¡Ella JURA!' },
  { side: 'left', text: '¡Una BOSS RUSH para practicar Python y SQL! Derrotás jefes escribiendo código real.' },
]

export default function LeemeWindow({ onNext }: { onNext: () => void }) {
  const [step, setStep] = useState(0)

  // Las burbujas entran de a una cada vez que se abre el archivo.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setStep(LINES.length); return }
    const timers = LINES.map((_, i) => setTimeout(() => setStep(i + 1), 250 + i * 1100))
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="flex flex-col" style={{ gap: 18, padding: 4 }}>
      {LINES.map((l, i) => <Bubble key={i} side={l.side} text={l.text} visible={step > i} delay={0} />)}
      <button
        type="button"
        onClick={onNext}
        style={{
          alignSelf: 'flex-end', fontFamily: 'var(--font-jersey), monospace', fontSize: 18, letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '5px 22px', cursor: 'pointer', background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))',
          transition: 'opacity 0.3s steps(3)', opacity: step >= LINES.length ? 1 : 0, pointerEvents: step >= LINES.length ? 'auto' : 'none',
        }}
      >
        ¡Dale! Ver los jefes
      </button>
    </div>
  )
}
