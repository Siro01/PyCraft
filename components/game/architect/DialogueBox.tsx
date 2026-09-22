'use client'

import { useEffect, useRef } from 'react'
import { useTypewriter } from './useTypewriter'

interface Props {
  text: string
  speaker?: string
  voice?: 'machine' | 'cat'
  /** Color del borde y del nombre (el rostro es azul fósforo, el gato ámbar). */
  accent?: string
  /** true: al terminar de escribir, click / Enter / Espacio llama a onNext. */
  advance?: boolean
  onNext?: () => void
  /** Se llama una vez cuando termina de escribirse el texto. */
  onTyped?: () => void
}

export default function DialogueBox({
  text, speaker = 'ARQUITECTO', voice = 'machine', accent = '#BFE9FF', advance = false, onNext, onTyped,
}: Props) {
  const { shown, done, skip } = useTypewriter(text, voice)
  const typedRef = useRef(onTyped)
  typedRef.current = onTyped

  useEffect(() => { if (done) typedRef.current?.() }, [done, text])

  const act = () => {
    if (!done) skip()
    else if (advance) onNext?.()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'BUTTON')) return
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div
      onClick={act}
      className="relative w-full select-none"
      style={{
        maxWidth: 680,
        cursor: advance || !done ? 'pointer' : 'default',
        marginTop: 14,
      }}
    >
      <div
        className="absolute font-mono text-[11px] font-bold tracking-widest px-2 py-0.5"
        style={{ top: -14, left: 14, background: accent, color: '#000', zIndex: 1 }}
      >
        {speaker}
      </div>
      <div
        style={{
          border: `4px solid ${accent}`,
          background: '#04060a',
          boxShadow: `6px 6px 0 ${accent}33`,
          padding: '22px 22px 18px',
          fontFamily: 'var(--font-jersey), "Courier New", monospace',
          fontSize: 26,
          lineHeight: 1.25,
          color: '#fff',
          letterSpacing: '0.02em',
          position: 'relative',
        }}
      >
        <span className="sr-only">{text}</span>
        {/* Texto completo invisible: reserva el alto y la caja no salta mientras se escribe */}
        <span aria-hidden="true" style={{ visibility: 'hidden' }}>{text}</span>
        <span aria-hidden="true" style={{ position: 'absolute', top: 22, left: 22, right: 22 }}>
          {shown}
          {!done && <span className="animate-caret" style={{ color: accent }}>█</span>}
        </span>
        {advance && done && (
          <span
            aria-hidden="true"
            className="animate-caret"
            style={{ position: 'absolute', right: 14, bottom: 6, color: accent, fontSize: 20 }}
          >
            ▼
          </span>
        )}
      </div>
    </div>
  )
}
