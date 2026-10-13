'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTypewriter } from '@/components/game/architect/useTypewriter'

// Diálogo de un jefe secreto: cada línea aparece letra por letra (con su
// tecleo), clic / Enter / espacio para seguir. Lo usan la arena secreta y La
// Arena (El Errante la presenta). Estilos: .secret-speech en globals.css.

export default function Speech({ lines, color, onDone, cta, choices }: {
  lines: string[]; color: string; onDone: () => void; cta?: string
  choices?: { label: string; onPick: () => void }[]
}) {
  const [i, setI] = useState(0)
  const { shown, done, skip } = useTypewriter(lines[i] ?? '', 'machine', 30)
  const last = i >= lines.length - 1
  const next = useCallback(() => {
    if (!done) { skip(); return }
    if (!last) { setI((n) => n + 1); return }
    if (!choices) onDone()
  }, [done, last, skip, choices, onDone])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next])

  return (
    <div className="secret-speech" onClick={next} style={{ color }}>
      {lines.slice(0, i).map((l, k) => <p key={k} className="secret-speech-old">{l}</p>)}
      <p>{shown}<span className="secret-caret">█</span></p>
      {done && last && (choices ? (
        <div className="secret-choices">
          {choices.map((c) => <button key={c.label} type="button" className="secret-go" onClick={(e) => { e.stopPropagation(); c.onPick() }}>{c.label}</button>)}
        </div>
      ) : (
        <button type="button" className="secret-go" onClick={(e) => { e.stopPropagation(); onDone() }}>{cta ?? 'seguir'} ▸</button>
      ))}
    </div>
  )
}
