'use client'

import { useEffect, useState } from 'react'
import { sfx } from '@/lib/game/architect/sound'

interface Props {
  onYes: () => void
  onNo: () => void
}

const OPTIONS = ['YES', 'NO'] as const

// Pantalla arcade: CONTINUE? ▸YES / NO. Teclado (↑↓ / W S / Enter) y toque.
export default function ContinuePrompt({ onYes, onNo }: Props) {
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
        setSel((s) => 1 - s)
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
    <div className="flex flex-col items-center gap-8 py-16" role="group" aria-label="¿Continuar?">
      <h1
        className="font-jersey"
        style={{ fontSize: 'clamp(48px, 12vw, 96px)', letterSpacing: '0.08em', color: '#fff', margin: 0, lineHeight: 1 }}
      >
        CONTINUE?
      </h1>
      <ul className="flex flex-col gap-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {OPTIONS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onMouseEnter={() => { if (sel !== i) { setSel(i); sfx.select() } }}
              onFocus={() => setSel(i)}
              onClick={() => choose(i)}
              className="font-jersey flex items-center gap-4"
              style={{
                background: 'none', border: 0, cursor: 'pointer', color: '#fff',
                fontSize: 'clamp(36px, 8vw, 56px)', letterSpacing: '0.08em', lineHeight: 1.1,
                padding: '6px 20px', minWidth: 180,
              }}
            >
              <span aria-hidden="true" className={sel === i ? 'animate-caret' : ''} style={{ width: 28, opacity: sel === i ? 1 : 0 }}>▸</span>
              {label}
            </button>
          </li>
        ))}
      </ul>
      <p className="font-mono text-xs" style={{ color: '#666', margin: 0 }}>
        ↑ ↓ para elegir · Enter para confirmar
      </p>
    </div>
  )
}
