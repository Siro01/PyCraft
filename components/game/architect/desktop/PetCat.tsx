'use client'

import { useEffect, useRef, useState } from 'react'
import { PixelBitmap, PET_A, PET_B, ICON_ARROW_DOWN } from './PixelBitmap'
import { useTypewriter } from '../useTypewriter'

// El Arquitecto real: un gato pixel que camina por el borde inferior del
// escritorio y habla con globos de diálogo. Reemplaza al bloque de texto.

const PET_W = 14 * 5
const STEP = 7
const TICK = 140

interface Props {
  /** Lo que dice ahora. null = camina en silencio. */
  text: string | null
  /** true: al terminar de escribir, click / Enter / Espacio llama a onNext. */
  advance?: boolean
  onNext?: () => void
  onTyped?: () => void
  /** Altura de la barra de tareas sobre la que camina. */
  floor?: number
  /** Clic en el gato. */
  onClick?: () => void
}

function Bubble({ text, advance, onNext, onTyped, style }: {
  text: string; advance: boolean; onNext?: () => void; onTyped?: () => void; style: React.CSSProperties
}) {
  const { shown, done, skip } = useTypewriter(text, 'cat')
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
      if (el && ['TEXTAREA', 'INPUT', 'SELECT', 'BUTTON'].includes(el.tagName)) return
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div
      onClick={act}
      role="status"
      style={{
        position: 'fixed', zIndex: 600, cursor: advance || !done ? 'pointer' : 'default',
        background: 'hsl(var(--surface))', border: '2px solid hsl(var(--accent))',
        boxShadow: '5px 5px 0 hsl(var(--tx) / 0.2)', padding: '12px 16px 14px',
        fontFamily: 'var(--font-jersey), "Courier New", monospace', fontSize: 24, lineHeight: 1.22,
        color: 'hsl(var(--tx))', letterSpacing: '0.02em', userSelect: 'none',
        ...style,
      }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" style={{ visibility: 'hidden' }}>{text}</span>
      <span aria-hidden="true" style={{ position: 'absolute', top: 12, left: 16, right: 16 }}>
        {shown}
        {!done && <span className="animate-caret" style={{ color: 'hsl(var(--accent))' }}>█</span>}
      </span>
      {advance && done && (
        <span aria-hidden="true" className="animate-caret" style={{ position: 'absolute', right: 10, bottom: 6 }}>
          <PixelBitmap rows={ICON_ARROW_DOWN} scale={3} ink="hsl(var(--accent))" />
        </span>
      )}
      <span aria-hidden="true" style={{ position: 'absolute', bottom: -14, left: 'var(--tail, 36px)' }}>
        <PixelBitmap rows={ICON_ARROW_DOWN} scale={3} ink="hsl(var(--accent))" />
      </span>
    </div>
  )
}

export default function PetCat({ text, advance = false, onNext, onTyped, floor = 34, onClick }: Props) {
  const [vw, setVw] = useState(0)
  const [x, setX] = useState(40)
  const [dir, setDir] = useState<1 | -1>(1)
  const [frame, setFrame] = useState(0)
  const reduced = useRef(false)

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    onResize()
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const talking = text !== null

  useEffect(() => {
    if (talking || reduced.current || vw === 0) return
    const id = setInterval(() => {
      setFrame(f => 1 - f)
      setX(prev => {
        const next = prev + STEP * dir
        if (next > vw - PET_W - 16) { setDir(-1); return vw - PET_W - 16 }
        if (next < 16) { setDir(1); return 16 }
        return next
      })
    }, TICK)
    return () => clearInterval(id)
  }, [talking, dir, vw])

  // cuando habla, se queda quieto y mira hacia el centro
  const facing = talking ? (x > vw / 2 ? -1 : 1) : dir

  const bubbleW = Math.min(460, Math.max(240, vw - 24))
  const bubbleLeft = Math.min(Math.max(12, x - 24), Math.max(12, vw - bubbleW - 12))
  const tail = Math.min(Math.max(16, x + PET_W / 2 - bubbleLeft - 9), bubbleW - 34)

  return (
    <>
      <button
        type="button"
        className="pet-land"
        aria-label="Ver al Arquitecto en ASCII"
        title="Clic para ver al Arquitecto"
        onClick={(e) => { e.currentTarget.blur(); onClick?.() }}
        style={{ position: 'fixed', left: x, bottom: floor + 4, zIndex: 500, padding: 0, background: 'none', border: 'none', cursor: 'pointer', transform: `scaleX(${facing})`, transition: 'left 0.14s steps(2)' }}
      >
        <PixelBitmap rows={frame === 0 ? PET_A : PET_B} scale={5} />
      </button>
      {text !== null && vw > 0 && (
        <Bubble
          key={text}
          text={text}
          advance={advance}
          onNext={onNext}
          onTyped={onTyped}
          style={{ left: bubbleLeft, width: bubbleW, bottom: floor + 5 * 12 + 24, ['--tail' as string]: `${tail}px` } as React.CSSProperties}
        />
      )}
    </>
  )
}
