'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { makeFace, makeCat, morph, dissolve, glitch } from '@/lib/game/architect/art'
import { drawLuma, logicalSize, type RenderMode } from '@/lib/game/architect/render'

interface Props {
  /** 0 = Arquitecto I (rostro) · 1 = Arquitecto real (gato). Valores intermedios = transición. */
  morphT?: number
  mode?: RenderMode
  /** 1 = entero · 0 = desintegrado (se liga a bossHp / hpMax). Los cambios se animan. */
  integrity?: number
  color?: string
  bg?: string
  /** Parpadeo periódico y glitch. Se apaga solo con prefers-reduced-motion. */
  animate?: boolean
  glitchy?: boolean
  /** Fuerza el frame con los ojos cerrados (parpadeo controlado desde afuera). */
  forceBlink?: boolean
  label?: string
  className?: string
}

const TICK_MS = 140
const INTEGRITY_TWEEN_MS = 600

export default function ArchitectCanvas({
  morphT = 0,
  mode = 'ascii',
  integrity = 1,
  color = '#BFE9FF',
  bg = '#000',
  animate = true,
  glitchy = true,
  forceBlink = false,
  label = 'El Arquitecto',
  className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const frames = useMemo(
    () => ({ face: [makeFace(false), makeFace(true)], cat: [makeCat(false), makeCat(true)] }),
    [],
  )

  const [reduced, setReduced] = useState(false)
  const [tick, setTick] = useState(0)
  const [shownIntegrity, setShownIntegrity] = useState(integrity)
  const shownRef = useRef(integrity)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // Tick para parpadeo / glitch
  useEffect(() => {
    if (!animate || reduced) return
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [animate, reduced])

  // Interpola la integridad (el jefe se deshace de a poco, no de golpe)
  useEffect(() => {
    if (reduced || Math.abs(shownRef.current - integrity) < 0.005) {
      shownRef.current = integrity
      setShownIntegrity(integrity)
      return
    }
    const from = shownRef.current
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / INTEGRITY_TWEEN_MS)
      shownRef.current = from + (integrity - from) * k
      setShownIntegrity(shownRef.current)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [integrity, reduced])

  // Dibujo
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const animated = animate && !reduced
    const blink = forceBlink || (animated && tick > 0 && tick % 34 === 0)
    const idx = blink ? 1 : 0
    let luma = morph(frames.face[idx], frames.cat[idx], morphT)
    luma = dissolve(luma, shownIntegrity)
    if (animated && glitchy && morphT < 1 && tick % 23 > 20) luma = glitch(luma, tick)

    const { w, h } = logicalSize(mode)
    const pw = Math.round(w * dpr)
    if (canvas.width !== pw) {
      canvas.width = pw
      canvas.height = Math.round(h * dpr)
    }
    drawLuma(ctx, luma, mode, color, bg, dpr)
  }, [frames, morphT, mode, shownIntegrity, color, bg, tick, animate, reduced, glitchy, forceBlink])

  const { w, h } = logicalSize(mode)
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className={className}
      style={{ width: '100%', height: 'auto', aspectRatio: `${w} / ${h}`, background: bg, display: 'block' }}
    />
  )
}
