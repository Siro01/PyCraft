'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { makeFrames, IDLE_FRAMES, type SecretArtId } from '@/lib/game/secret/art'
import { dissolve, glitch } from '@/lib/game/architect/art'
import { drawLuma, logicalSize, type RenderMode } from '@/lib/game/architect/render'

// Un jefe secreto dibujado con la misma receta que El Arquitecto: la grilla de
// luminancia pasa a ASCII / halftone / braille, se deshace con la vida y tiembla
// (glitch) cuando recibe un golpe.

interface Props {
  art: SecretArtId
  mode?: RenderMode
  /** 1 = entero · 0 = desintegrado (se liga a la vida). Los cambios se animan. */
  integrity?: number
  color?: string
  animate?: boolean
  /** Número nuevo = sacudón de glitch (golpe recibido). */
  hurtSignal?: number
  label?: string
  className?: string
}

const TICK_MS = 150
const TWEEN_MS = 650
const HURT_MS = 420

export default function SecretCanvas({
  art, mode = 'ascii', integrity = 1, color = '#FFFFFF', animate = true, hurtSignal = 0, label, className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const frames = useMemo(() => makeFrames(art), [art])
  const [reduced, setReduced] = useState(false)
  const [tick, setTick] = useState(0)
  const [shown, setShown] = useState(integrity)
  const shownRef = useRef(integrity)
  const [hurtUntil, setHurtUntil] = useState(0)

  useEffect(() => { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches) }, [])

  useEffect(() => {
    if (!animate || reduced) return
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [animate, reduced])

  useEffect(() => {
    if (!hurtSignal) return
    setHurtUntil(performance.now() + HURT_MS)
    const id = setTimeout(() => setHurtUntil(0), HURT_MS)
    return () => clearTimeout(id)
  }, [hurtSignal])

  useEffect(() => {
    if (reduced || Math.abs(shownRef.current - integrity) < 0.005) {
      shownRef.current = integrity
      setShown(integrity)
      return
    }
    const from = shownRef.current
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / TWEEN_MS)
      shownRef.current = from + (integrity - from) * k
      setShown(shownRef.current)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [integrity, reduced])

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const animated = animate && !reduced
    const blink = animated && tick > 0 && tick % 29 === 0
    let luma = blink ? frames.blink : frames.idle[animated ? tick % IDLE_FRAMES : 0]
    luma = dissolve(luma, Math.max(0.06, shown))
    const hurt = hurtUntil > 0
    if (hurt) luma = glitch(glitch(luma, tick * 7 + 1), tick * 13 + 5)
    else if (animated && tick % 37 > 34) luma = glitch(luma, tick)

    const { w, h } = logicalSize(mode)
    const pw = Math.round(w * dpr)
    if (canvas.width !== pw) {
      canvas.width = pw
      canvas.height = Math.round(h * dpr)
    }
    drawLuma(ctx, luma, mode, color, '#000', dpr)
  }, [frames, mode, shown, color, tick, animate, reduced, hurtUntil])

  const { w, h } = logicalSize(mode)
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className={className}
      style={{ width: '100%', height: 'auto', aspectRatio: `${w} / ${h}`, background: '#000', display: 'block' }}
    />
  )
}
