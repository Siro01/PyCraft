'use client'

import { useEffect, useRef, useState } from 'react'
import { dissolve, glitch } from '@/lib/game/architect/art'
import { drawLuma, logicalSize, type RenderMode } from '@/lib/game/architect/render'
import { makeNexo, nexoBlink, NEXO_LINKS, type NexoId } from '@/lib/game/nexo-art'

// El Nexo dibujado con el motor ASCII del Arquitecto, cuadro a cuadro en vivo:
// los tentáculos ondulan, parpadea y los datos viajan por los tentáculos.

const TICK_MS = 140
const LOOP_TICKS = 28   // ~4 s por vuelta de animación

interface Props {
  variant: NexoId
  /** Ancho en pantalla (px). */
  width: number
  defeated?: boolean
  animated?: boolean
  /** ASCII en tamaño grande; puntos (halftone) en chico, donde los caracteres no se leen. */
  mode?: RenderMode
  color?: string
  label?: string
  /** Vida 0..1: cada golpe hace temblar al Nexo y, en La Red, le corta una conexión. */
  hpRatio?: number
}

export default function NexoCanvas({ variant, width, defeated = false, animated = true, mode, color, label = 'El Nexo', hpRatio = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [tick, setTick] = useState(0)
  const [reduced, setReduced] = useState(false)
  const m: RenderMode = mode ?? (width >= 160 ? 'ascii' : 'dots')

  useEffect(() => { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches) }, [])

  // Golpe: unos cuadros de temblor (glitch) con los ojos cerrados.
  const [hurtUntil, setHurtUntil] = useState(-1)
  const tickRef = useRef(0)
  tickRef.current = tick
  const prevHp = useRef(hpRatio)
  useEffect(() => {
    if (hpRatio < prevHp.current - 1e-6 && !defeated) setHurtUntil(tickRef.current + 5)
    prevHp.current = hpRatio
  }, [hpRatio, defeated])
  // Conexiones que le quedan: 5 con la vida llena, una menos por cada quinto perdido (mínimo 1 hasta caer).
  const links = defeated ? 0 : Math.max(1, Math.ceil(hpRatio * NEXO_LINKS - 1e-6))

  useEffect(() => {
    if (!animated || reduced || defeated) return
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [animated, reduced, defeated])

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const { w, h } = logicalSize(m)
    const pw = Math.round(w * dpr)
    if (canvas.width !== pw) { canvas.width = pw; canvas.height = Math.round(h * dpr) }
    const still = !animated || reduced
    const hurt = !still && !defeated && tick <= hurtUntil
    let luma = makeNexo(variant, {
      t: still ? 0 : (tick % LOOP_TICKS) / LOOP_TICKS,
      blink: hurt ? 1 : still || defeated ? 0 : nexoBlink(tick),
      dead: defeated,
      links,
    })
    if (hurt) luma = glitch(luma, tick * 7 + 3)
    if (defeated) luma = dissolve(luma, 0.55)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawLuma(ctx, luma, m, color ?? (defeated ? '#7A7590' : '#A78BFA'), 'rgba(0,0,0,0)', dpr)
  }, [variant, tick, defeated, animated, reduced, m, color, hurtUntil, links])

  const { w, h } = logicalSize(m)
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={defeated ? `${label} derrotado` : label}
      style={{ width, height: 'auto', aspectRatio: `${w} / ${h}`, display: 'block' }}
    />
  )
}
