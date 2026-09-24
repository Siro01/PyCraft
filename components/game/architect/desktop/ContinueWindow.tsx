'use client'

import { useEffect, useState } from 'react'
import { sfx } from '@/lib/game/architect/sound'
import { PixelBitmap, ICON_ARROW_RIGHT } from './PixelBitmap'

const OPTIONS = ['YES', 'NO'] as const

// CONTINUE? ▸YES / NO — la pantalla arcade, ahora como diálogo del sistema.
// Teclado (↑↓ / W S / Enter / Y / N) y toque.
export default function ContinueWindow({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  const [sel, setSel] = useState(0)

  const choose = (i: number) => {
    sfx.confirm()
    if (i === 0) onYes()
    else onNo()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'w' || e.key === 's') {
        e.preventDefault()
        setSel(s => 1 - s)
        sfx.select()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        choose(sel)
      } else if (e.key.toLowerCase() === 'y') choose(0)
      else if (e.key.toLowerCase() === 'n') choose(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div role="group" aria-label="¿Continuar?" style={{ padding: '22px 18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <h1
        className="animate-ascii-flicker"
        style={{ fontSize: 'clamp(44px, 10vw, 84px)', letterSpacing: '0.08em', color: 'hsl(var(--tx))', margin: 0, lineHeight: 1 }}
      >
        CONTINUE?
      </h1>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {OPTIONS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onMouseEnter={() => { if (sel !== i) { setSel(i); sfx.select() } }}
              onFocus={() => setSel(i)}
              onClick={() => choose(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', minWidth: 190,
                fontFamily: 'var(--font-jersey), monospace', fontSize: 'clamp(32px, 7vw, 48px)', letterSpacing: '0.08em', lineHeight: 1.1,
                padding: '4px 18px',
                background: sel === i ? 'hsl(var(--tx))' : 'transparent',
                color: sel === i ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
                border: '2px solid hsl(var(--tx))',
              }}
            >
              <span aria-hidden="true" className={sel === i ? 'animate-caret' : undefined} style={{ width: 16, opacity: sel === i ? 1 : 0 }}>
                <PixelBitmap rows={ICON_ARROW_RIGHT} scale={4} ink="hsl(var(--bg))" />
              </span>
              {label}
            </button>
          </li>
        ))}
      </ul>
      <p style={{ margin: 0, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11, letterSpacing: '0.08em', color: 'hsl(var(--tx3))' }}>
        ↑ ↓ para elegir · Enter para confirmar
      </p>
    </div>
  )
}
