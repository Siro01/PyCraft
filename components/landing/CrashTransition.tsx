'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ArchitectCanvas from '@/components/game/architect/ArchitectCanvas'
import { sfx } from '@/lib/game/architect/sound'

const CRASH_MS = 700      // bloques de píxeles que "rompen" la pantalla
const FLICKER_STEP_MS = 85
const PALETTE = ['#000000', '#FFFFFF', '#F59E0B', '#BFE9FF', '#DC143C', '#111111']

// Parpadeo del Arquitecto: cara, ojos cerrados, negro, cara invertida…
type Frame = 'face' | 'blink' | 'black' | 'invert' | 'noise'
const FLICKER: Frame[] = ['face', 'blink', 'black', 'invert', 'face', 'noise', 'blink', 'face', 'black', 'invert', 'face']

interface Props {
  href: string
}

/** Overlay a pantalla completa: la landing se "crashea" en píxeles, parpadea el Arquitecto y navega a `href`. */
export default function CrashTransition({ href }: Props) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'crash' | 'flicker' | 'out'>('crash')
  const [frame, setFrame] = useState<Frame>('face')

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    router.prefetch(href)
    if (reduced) {
      const t = setTimeout(() => router.push(href), 250)
      return () => clearTimeout(t)
    }

    sfx.crash()

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight }

    const drawBlocks = (count: number) => {
      if (!canvas || !ctx) return
      for (let i = 0; i < count; i++) {
        const s = [8, 16, 24, 48, 96][Math.floor(Math.random() * 5)]
        const x = Math.floor((Math.random() * canvas.width) / s) * s
        const y = Math.floor((Math.random() * canvas.height) / s) * s
        ctx.fillStyle = PALETTE[Math.floor(Math.random() * PALETTE.length)]
        // Mezcla de bloques cuadrados y franjas horizontales (tearing)
        if (Math.random() < 0.25) ctx.fillRect(0, y, canvas.width, 4 + Math.random() * 20)
        else ctx.fillRect(x, y, s, s)
      }
    }

    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      const k = Math.min(1, (now - start) / CRASH_MS)
      drawBlocks(6 + Math.floor(k * k * 90)) // cada vez más bloques por frame
      if (k < 1) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setPhase('flicker'), CRASH_MS))

    FLICKER.forEach((f, i) => {
      timers.push(setTimeout(() => {
        setFrame(f)
        if (f === 'noise') drawBlocks(200)
        if (f === 'blink' || f === 'invert' || f === 'noise') sfx.glitch()
      }, CRASH_MS + 120 + i * FLICKER_STEP_MS))
    })

    const end = CRASH_MS + 120 + FLICKER.length * FLICKER_STEP_MS + 120
    timers.push(setTimeout(() => setPhase('out'), end))
    timers.push(setTimeout(() => router.push(href), end + 160))

    return () => {
      cancelAnimationFrame(raf)
      timers.forEach(clearTimeout)
    }
  }, [href, router])

  const inverted = frame === 'invert'
  const showFace = phase === 'flicker' && (frame === 'face' || frame === 'blink' || frame === 'invert')
  const solid = phase !== 'crash'

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 1000, background: solid ? (inverted ? '#BFE9FF' : '#000') : 'transparent' }}
    >
      {/* Bloques de píxeles: se ven durante el crash y en el frame "noise" */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: phase === 'crash' || frame === 'noise' ? 1 : 0, imageRendering: 'pixelated' }}
      />
      {showFace && (
        <div style={{ position: 'relative', width: 'min(78vw, 46vh, 420px)' }}>
          <ArchitectCanvas
            mode="ascii"
            animate={false}
            forceBlink={frame === 'blink'}
            color={inverted ? '#000' : '#BFE9FF'}
            bg={inverted ? '#BFE9FF' : '#000'}
          />
        </div>
      )}
      {phase === 'out' && <div className="absolute inset-0" style={{ background: '#000' }} />}
    </div>
  )
}
