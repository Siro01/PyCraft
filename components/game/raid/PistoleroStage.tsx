'use client'

import { useEffect, useRef, useState } from 'react'
import PistoleroSay, { sentences } from './PistoleroSay'
import {
  PW, PH, POSES, BINS, PISTOLERO_PALETTE, hash2, makePoseFrames, dissolveP, glitchP,
  type Frame, type PistoleroPose,
} from '@/lib/game/raid/pistolero-art'

// El Pistolero en escena: el arte ASCII animado (poses en secuencia) más los
// efectos de pantalla de cada ataque (fogonazo, agujeros de bala, polvareda…).
// Lo usan la vitrina /demo/pistolero, la Mesa del docente y la vista del alumno.
// Estilos: .pist-* en globals.css.

export type StageFx = 'disparo' | 'rafaga' | 'polvo' | 'ruleta' | 'cura' | 'none'

export interface StageCue {
  /** Número nuevo = se dispara la secuencia. */
  n: number
  poses: PistoleroPose[]
  fx?: StageFx
}

interface Props {
  /** Color de los efectos (fogonazo, carteles, globo). */
  color?: string
  cue?: StageCue | null
  /** 1 = entero · 0 = deshecho (se liga a la vida). */
  integrity?: number
  /** Número nuevo = recibe un acierto (retrocede y hace glitch). */
  hurtSignal?: number
  /** Globo de diálogo arriba del personaje. */
  line?: string | null
  /** Se queda en el último cuadro de la retirada (final del evento). */
  retired?: boolean
  label?: string
  className?: string
}

const PITCH = 6
const LW = PW * PITCH
const LH = PH * PITCH
const ALPHA_STEPS = 4

// Los cuadros se calculan una vez por pose y se comparten entre escenas
// (la Mesa del docente y la vista previa usan los mismos).
const FRAME_CACHE = new Map<PistoleroPose, Frame[]>()
function framesOf(pose: PistoleroPose): Frame[] {
  let f = FRAME_CACHE.get(pose)
  if (!f) { f = makePoseFrames(pose); FRAME_CACHE.set(pose, f) }
  return f
}

// Un carácter por píxel, con la tinta de cada píxel. Se agrupa por tinta y por
// nivel de brillo para cambiar el color del pincel pocas veces (las PCs del
// taller lo agradecen). El resplandor va por CSS (drop-shadow), no por canvas.
function drawAscii(ctx: CanvasRenderingContext2D, frame: Frame, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, LW, LH)
  ctx.font = `bold 8px "Courier New", ui-monospace, Consolas, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const groups: number[][] = Array.from({ length: PISTOLERO_PALETTE.length * ALPHA_STEPS }, () => [])
  for (let i = 0; i < frame.luma.length; i++) {
    const l = frame.luma[i]
    if (Math.floor(l * BINS.length) === 0) continue
    groups[frame.ink[i] * ALPHA_STEPS + Math.min(ALPHA_STEPS - 1, Math.floor(l * ALPHA_STEPS))].push(i)
  }
  groups.forEach((cells, g) => {
    if (!cells.length) return
    ctx.fillStyle = PISTOLERO_PALETTE[Math.floor(g / ALPHA_STEPS)]
    ctx.globalAlpha = 0.45 + 0.55 * (((g % ALPHA_STEPS) + 0.5) / ALPHA_STEPS)
    for (const i of cells) {
      const x = i % PW, y = (i / PW) | 0
      const set = BINS[Math.min(BINS.length - 1, Math.floor(frame.luma[i] * BINS.length))]
      ctx.fillText(set[Math.floor(hash2(x, y, 5) * set.length)], x * PITCH + PITCH / 2, y * PITCH + PITCH / 2)
    }
  })
  ctx.globalAlpha = 1
}

interface Hole { id: number; x: number; y: number; r: number }

export default function PistoleroStage({
  color = PISTOLERO_PALETTE[0], cue, integrity = 1, hurtSignal = 0, line, retired = false, label, className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const shakeRef = useRef<HTMLDivElement>(null)

  const [reduced, setReduced] = useState(false)
  const queue = useRef<{ pose: PistoleroPose; start: number }[]>([])
  const hurtUntil = useRef(0)
  const integ = useRef(integrity)
  const [fx, setFx] = useState<{ kind: StageFx; n: number } | null>(null)
  const [holes, setHoles] = useState<Hole[]>([])
  const [shake, setShake] = useState(0)

  useEffect(() => { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches) }, [])
  useEffect(() => { integ.current = integrity }, [integrity])

  // Sacudón de pantalla en cada disparo (sin remontar el canvas)
  useEffect(() => {
    if (!shake || reduced) return
    shakeRef.current?.animate(
      [{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(5px,-4px)' },
        { transform: 'translate(-3px,2px)' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(0,0)' }],
      { duration: 260, easing: 'steps(5)' },
    )
  }, [shake, reduced])

  // Nueva secuencia
  useEffect(() => {
    if (!cue || !cue.n) return
    let at = performance.now()
    queue.current = cue.poses.map((pose) => {
      const item = { pose, start: at }
      at += POSES[pose].ms
      return item
    })
    const kind = cue.fx ?? 'none'
    setFx({ kind, n: cue.n })
    // agujeros de bala: uno por disparo, en el momento del fogonazo
    const shots = cue.poses.map((p, i) => (p === 'disparo' ? i : -1)).filter((i) => i >= 0)
    const timers: ReturnType<typeof setTimeout>[] = []
    let offset = 0
    cue.poses.forEach((p, i) => {
      if (shots.includes(i)) {
        timers.push(setTimeout(() => {
          setShake((s) => s + 1)
          if (kind === 'disparo' || kind === 'rafaga') {
            const id = cue.n * 10 + i
            setHoles((h) => [...h.slice(-7), { id, x: 12 + hash2(id, 1, 4) * 76, y: 10 + hash2(id, 2, 4) * 70, r: hash2(id, 3, 4) * 360 }])
          }
        }, offset + 80))
      }
      offset += POSES[p].ms
    })
    timers.push(setTimeout(() => setFx(null), offset + 900))
    return () => timers.forEach(clearTimeout)
  }, [cue])

  // Los agujeros de bala se borran solos
  useEffect(() => {
    if (!holes.length) return
    const id = setTimeout(() => setHoles((h) => h.slice(1)), 6000)
    return () => clearTimeout(id)
  }, [holes])

  useEffect(() => {
    if (!hurtSignal) return
    hurtUntil.current = performance.now() + 420
    queue.current = [{ pose: 'golpe', start: performance.now() }]
  }, [hurtSignal])

  useEffect(() => {
    if (retired) queue.current = [{ pose: 'retirada', start: performance.now() }]
  }, [retired])

  // Bucle de dibujo: solo redibuja cuando cambia el cuadro
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(LW * dpr)
    canvas.height = Math.round(LH * dpr)
    let raf = 0
    let lastKey = ''
    const t0 = performance.now()
    const loop = (now: number) => {
      let pose: PistoleroPose = 'idle'
      let idx = 0
      const q = queue.current
      while (q.length && now - q[0].start >= POSES[q[0].pose].ms && !(q.length === 1 && q[0].pose === 'retirada')) q.shift()
      if (q.length && now >= q[0].start) {
        pose = q[0].pose
        const f = POSES[pose]
        idx = Math.min(f.frames - 1, Math.floor(((now - q[0].start) / f.ms) * f.frames))
      } else {
        const f = POSES.idle
        idx = reduced ? 0 : Math.floor((Math.max(0, now - t0) % f.ms) / f.ms * f.frames)
      }
      const hurt = now < hurtUntil.current
      const key = `${pose}:${idx}:${hurt ? Math.floor(now / 60) : 0}:${integ.current.toFixed(2)}`
      if (key !== lastKey) {
        lastKey = key
        let frame = framesOf(pose)[idx]
        if (integ.current < 1) frame = dissolveP(frame, Math.max(0.08, integ.current))
        if (hurt) frame = glitchP(frame, Math.floor(now / 60))
        drawAscii(ctx, frame, dpr)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  const flashing = fx && (fx.kind === 'disparo' || fx.kind === 'rafaga')

  return (
    <div className={`pist-stage ${className ?? ''}`} style={{ ['--pist' as string]: color }}>
      <div ref={shakeRef}>
        <canvas
          ref={ref}
          role="img"
          aria-label={label ?? 'El Pistolero'}
          style={{ width: '100%', height: 'auto', aspectRatio: `${LW} / ${LH}`, background: '#000', display: 'block', filter: 'drop-shadow(0 0 2px rgba(255, 90, 54, 0.35))' }}
        />
      </div>

      {flashing && <div key={`f${shake}`} className="pist-flash" />}

      {holes.map((h) => (
        <svg key={h.id} className="pist-hole" viewBox="-10 -10 20 20" style={{ left: `${h.x}%`, top: `${h.y}%`, transform: `rotate(${h.r}deg)` }} aria-hidden>
          <circle r="2.6" fill="#000" stroke={color} strokeWidth="0.8" />
          {[0, 52, 118, 170, 236, 300].map((a) => (
            <line key={a} x1={Math.cos((a * Math.PI) / 180) * 3} y1={Math.sin((a * Math.PI) / 180) * 3}
              x2={Math.cos((a * Math.PI) / 180) * (6 + (a % 3))} y2={Math.sin((a * Math.PI) / 180) * (6 + (a % 3))}
              stroke={color} strokeWidth="0.5" opacity="0.8" />
          ))}
        </svg>
      ))}

      {fx?.kind === 'polvo' && (
        <div key={`p${fx.n}`} className="pist-dust" aria-hidden>
          {Array.from({ length: 9 }, (_, r) => (
            <div key={r} style={{ animationDelay: `${r * 70}ms` }}>
              {Array.from({ length: 70 }, (_, c) => ".,:;'`~"[Math.floor(hash2(c, r, fx.n) * 7)]).join('')}
            </div>
          ))}
        </div>
      )}

      {fx?.kind === 'ruleta' && <div key={`r${fx.n}`} className="pist-banner">¡GIRA EL TAMBOR!</div>}
      {fx?.kind === 'cura' && <div key={`c${fx.n}`} className="pist-banner pist-heal">+10 % VIDA</div>}

      {line && <div className="pist-line"><PistoleroSay key={line} lines={sentences(line)} /></div>}
    </div>
  )
}
