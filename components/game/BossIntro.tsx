'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import BossSprite from './BossSprite'
import type { Boss, DialogueLine } from '@/types'

interface Props {
  boss: Boss
  lines: DialogueLine[]
  onDone: () => void
  /** Apuntes con ejemplos paso a paso de este jefe (si existen). */
  onOpenLesson?: () => void
}

// ── Sonido de tipeo ──────────────────────────────────────────────────────────
// Crea un AudioContext una sola vez por componente montado y lo reutiliza.
function makeTypingSound(ctx: AudioContext, color: string) {
  // Derivamos un tono base del color del jefe para que cada uno suene diferente
  const hue = parseInt(color.replace('#', '').slice(0, 2), 16)
  const freq = 180 + (hue % 80) * 2   // rango ~180-340 Hz

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.type = 'square'
  osc.frequency.setValueAtTime(freq, ctx.currentTime)

  gain.gain.setValueAtTime(0.06, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.04)
}

// ── Renderizado de texto con wave ────────────────────────────────────────────
function WaveText({ text, bossColor }: { text: string; bossColor: string }) {
  return (
    <>
      {text.split('').map((ch, i) => (
        <span
          key={i}
          className="dialogue-letter"
          style={{ '--li': i, color: ch === '¡' || ch === '!' ? 'hsl(var(--accent))' : undefined } as React.CSSProperties}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function BossIntro({ boss, lines, onDone, onOpenLesson }: Props) {
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState('')
  const [done, setDone] = useState(false)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const charRef    = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const currentLine = lines[idx]
  const isLast = idx === lines.length - 1

  // Inicializar AudioContext en primer click/tecla (política de autoplay)
  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new AudioContext() } catch {}
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }, [])

  // Typewriter con sonido
  useEffect(() => {
    const text = currentLine?.text ?? ''
    charRef.current = 0
    setShown('')
    setDone(false)

    const tick = () => {
      charRef.current += 1
      setShown(text.slice(0, charRef.current))

      // Sonido: solo en caracteres visibles (no espacios al inicio)
      if (audioCtxRef.current && text[charRef.current - 1] !== ' ') {
        try { makeTypingSound(audioCtxRef.current, boss.color) } catch {}
      }

      if (charRef.current < text.length) {
        timerRef.current = setTimeout(tick, 30)
      } else {
        setDone(true)
      }
    }
    timerRef.current = setTimeout(tick, 30)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [idx, currentLine?.text, boss.color])

  const skipOrAdvance = useCallback(() => {
    ensureAudio()
    if (!done) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setShown(currentLine?.text ?? '')
      setDone(true)
    } else if (isLast) {
      onDone()
    } else {
      setIdx((i) => i + 1)
    }
  }, [done, isLast, currentLine?.text, onDone, ensureAudio])

  // Teclado: Enter / Espacio avanzan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) return
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); skipOrAdvance() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [skipOrAdvance])

  // Activar audio en el primer clic del usuario sobre cualquier parte de la página
  useEffect(() => {
    const unlock = () => ensureAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [ensureAudio])

  return (
    <div className="flex flex-col items-center gap-6 py-4 select-none">

      {/* Sprite del jefe */}
      <div style={{ opacity: 0.92 }}>
        <BossSprite boss={boss} size="lg" defeated={false} animated />
      </div>

      {/* Caja de diálogo */}
      <div
        className="w-full cursor-pointer"
        style={{ maxWidth: 640 }}
        onClick={skipOrAdvance}
      >
        {/* Label speaker */}
        <div
          className="inline-block px-2 py-0.5 mb-0"
          style={{ background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', fontFamily: 'var(--font-jersey), monospace', fontSize: 15, letterSpacing: '0.08em' }}
        >
          {currentLine?.speaker ?? boss.name.toUpperCase()}
        </div>

        {/* Texto con typewriter / wave */}
        <div
          style={{
            border: '2px solid hsl(var(--tx))',
            boxShadow: '5px 5px 0 hsl(var(--tx) / 0.2)',
            background: 'hsl(var(--surface))',
            padding: '18px 20px 16px',
            fontFamily: 'var(--font-vt323), "Courier New", monospace',
            fontSize: 26,
            lineHeight: 1.3,
            color: 'hsl(var(--tx))',
            letterSpacing: '0.02em',
            position: 'relative',
            minHeight: 80,
          }}
        >
          {/* Texto invisible reserva altura (siempre el texto completo) */}
          <span style={{ visibility: 'hidden', display: 'block', fontFamily: 'var(--font-vt323), "Courier New", monospace', fontSize: 26, lineHeight: 1.3 }}>
            {currentLine?.text}
          </span>

          {/* Texto animado */}
          <span style={{ position: 'absolute', top: 18, left: 20, right: 20 }}>
            {done
              ? <WaveText text={shown} bossColor={boss.color} />
              : <>
                  {shown}
                  <span style={{ color: 'hsl(var(--accent))' }} className="animate-caret">█</span>
                </>
            }
          </span>

          {/* Indicador de avance */}
          {done && !isLast && (
            <span
              className="animate-caret"
              style={{ position: 'absolute', right: 12, bottom: 6, color: 'hsl(var(--accent))', fontSize: 16 }}
            >▼</span>
          )}
        </div>

        {/* Indicador de página */}
        <div className="flex justify-between items-center mt-2 px-1">
          <div className="flex gap-1">
            {lines.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8, height: 8,
                  background: i === idx ? 'hsl(var(--accent))' : 'hsl(var(--border2))',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
          <span
            className="font-mono text-[10px] tracking-widest"
            style={{ color: 'hsl(var(--tx3))' }}
          >
            {done ? (isLast ? 'Enter para combatir' : 'Enter para continuar') : 'Enter para saltar'}
          </span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3">
        {isLast && done ? (
          <>
            <button
              onClick={onDone}
              className="btn-primary text-sm px-6 py-2"
            >
              ¡A combatir!
            </button>
            {onOpenLesson && (
              <button
                onClick={onOpenLesson}
                className="text-sm px-5 py-2"
                style={{ fontFamily: 'var(--font-jersey), monospace', letterSpacing: '0.04em', border: '2px solid hsl(var(--tx))', background: 'transparent', color: 'hsl(var(--tx))', cursor: 'pointer' }}
              >
                Ver ejemplos paso a paso
              </button>
            )}
          </>
        ) : (
          <button
            onClick={skipOrAdvance}
            style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 16, letterSpacing: '0.04em', padding: '6px 16px', border: '2px solid hsl(var(--tx))', background: 'transparent', color: 'hsl(var(--tx))', cursor: 'pointer' }}
          >
            {done ? 'Siguiente' : 'Saltar intro'}
          </button>
        )}
        {!(isLast && done) && (
          <button
            onClick={onDone}
            className="font-mono text-[11px] text-tx3 hover:text-tx2 transition-colors"
          >
            Ir al combate →
          </button>
        )}
      </div>
    </div>
  )
}
