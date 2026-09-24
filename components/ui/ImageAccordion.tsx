'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { sfx } from '@/lib/game/architect/sound'

/* ══ Image accordion (adaptado) ═══════════════════════════════
   Componente original: "Image accordion" de Bencho (MIT,
   bencho.dev/licence). Una fila de FOTOS recortadas a tiras;
   apuntar a una la abre y las demás ceden exactamente lo que
   eso cuesta.

   Este proyecto no tiene fotografías — es pixel-art — así que
   en vez de <img src=...> cada panel muestra un ícono pixel
   (mismo lenguaje que PixelIcons: <rect> sobre una grilla) más
   título y descripción, revelados progresivamente al abrirse.
   La física del resorte y la aritmética del "quién paga" son
   EXACTAMENTE las del original — eso es lo que vale la pena
   copiar, no reescribirlo — y los comentarios que explican por
   qué los números son los que son se mantuvieron.

   Se fijó en 4 paneles (no 5): son las 4 mecánicas del juego,
   no una foto de stock reemplazable, así que — igual que el
   original ligaba KEEP a la cantidad de hooks — acá el conteo
   de hooks (a0..a3) está atado a esa lista específica, no es
   una prop genérica.

   ── LA FILA ES UN ANCHO FIJO, Y ESO ES EL COMPONENTE ────────
   Nada acá crece. La tira mide lo mismo pase lo que pase
   adentro, así que abrir un panel es una NEGOCIACIÓN en vez de
   una expansión: cada píxel que gana el que estás señalando lo
   pagaron entre los otros tres. Por eso es flexbox con cuatro
   números de crecimiento y no anchos calculados a mano — flex
   hace la aritmética de quién paga, en cualquier cantidad y
   cualquier gap, y no se puede errar.

   ── Y LA HINCHAZÓN SE CONTAGIA ──────────────────────────────
   Los vecinos del panel abierto se abren un poco también. Un
   reflejo de un panel de ancho y los demás angostos se lee
   como un interruptor; una caída gradual se lee como una fuerza
   llegando a alguna parte. `reach` es esa caída, expuesta.

   ── POR QUÉ SEÑALAR ES ESTABLE ──────────────────────────────
   Vale la pena anotarlo, porque una fila que cambia de tamaño
   bajo el cursor suena como si debiera oscilar y no lo hace: el
   panel al que apuntás es el que CRECE. Sus bordes se alejan
   del puntero, nunca lo cruzan, así que no puede encogerse
   debajo tuyo y pasarle el hover a un vecino. */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/* ── cuántos paneles tiene esta versión ────────────────────
   Fijo en 4: las 4 mecánicas del juego (mercader, amuleto de
   debilidad, poción, teletransportador). Igual que el original
   ligaba su lista de fotos a la cantidad de hooks, acá el
   conteo de useSpring de abajo (a0..a3) está atado a esto —
   no es una prop, es la forma del componente. */
const N = 4

/* ── el corner, y SIGUE AL GAP ─────────────────────────────
   Un panel redondeado junto a otro redondeado sin aire entre
   medio deja una muesca de fondo en cada unión. La solución
   habitual es fijar el radio, que cambia un knob por un bug.

   Así que el radio es el gap, con un tope propio. En Gap 0 los
   paneles son cuadrados y la tira es una banda continua; en el
   tope cada panel está completamente redondeado. No hay
   ajuste intermedio donde pueda aparecer una muesca, porque el
   radio nunca puede ser mayor que el aire en el que tiene que
   entrar.

   RMAX baja de 12 (el original, pensado para fotos) a 5: acá
   el resto del proyecto usa esquinas escalonadas de 3-8px, no
   redondeadas — este número mantiene el truco pero se queda
   cerca de esa escala. */
const RMAX = 0

/* ── cuánto toma el que está abierto ───────────────────────
   Como proporción de lo que tiene un panel en reposo. 1.8
   significa que el abierto es casi tres veces uno en reposo —
   la regla que sigue todo knob elástico acá: en el medio del
   rango no cambió nada. */
const lift = (open: number) => 0.4 + (clamp(open, 0, 100) / 100) * 2.8

/* ── y cuánto se contagia la hinchazón ─────────────────────
   Una gaussiana sobre la distancia en paneles, así que es
   suave y nunca "salta" al vecino de al lado con algo que se
   note de más. */
const fall = (d: number, reach: number) => {
  const s = 0.35 + (clamp(reach, 0, 100) / 100) * 0.9
  return Math.exp(-((d / s) ** 2))
}

/* ── un resorte, para todo lo que se asienta ───────────────
   Frames, no milisegundos. `dt` se expresa en sesentavos de
   segundo y el amortiguamiento se ELEVA a esa potencia en vez
   de multiplicarse por ella, así un frame perdido decae la
   misma energía que los dos frames que reemplaza. Multiplicar
   es la versión que hace que un resorte se comporte distinto
   en una página ocupada, que es el bug más difícil de ver. */
const springOf = (tune: number) => ({
  k: 0.08 + (tune / 100) * 0.16,
  d: 0.62 + (tune / 100) * 0.2,
})

function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target)
  const cur = useRef(target)
  const vel = useRef(0)
  const raf = useRef(0)

  useEffect(() => {
    if (instant) {
      cur.current = target
      vel.current = 0
      setAt(target)
      return
    }
    const { k, d } = springOf(tune)
    let prev = 0
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1
      prev = t
      vel.current += (target - cur.current) * k * dt
      vel.current *= Math.pow(d, dt)
      cur.current += vel.current * dt
      if (Math.abs(target - cur.current) < 0.02 && Math.abs(vel.current) < 0.02) {
        cur.current = target
        vel.current = 0
        setAt(target)
        raf.current = 0
        return
      }
      setAt(cur.current)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [target, tune, instant])

  return at
}

const stillness = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export interface AccordionPanel {
  id: string
  Icon: ComponentType<{ size?: number; color?: string }>
  title: string
  desc: string
  color: string
}

/* ── Glitch de atención ─────────────────────────────────────
   Probado en /dev/mechanics-animations antes de traerlo acá. Dos capas:
   un titileo ambiental (CSS puro, ver .acc-cell en globals.css) que corre
   siempre, y este "crash" de píxeles al click — misma paleta y mismo
   algoritmo de bloques/franjas que CrashTransition.tsx usa al clickear
   "Empezar el taller" en la landing, pero recortado al tamaño de la
   tarjeta y sin navegar a ningún lado. Se reimplementa acá en vez de
   importarse de CrashTransition a propósito: esa es una transición de
   PÁGINA (tiene su propio phase/frame, la cara del Arquitecto, un
   router.push) y esto es un gesto de tarjeta — cosas distintas que solo
   comparten el estilo visual. */
const PALETTE = ['#000000', '#FFFFFF', '#F59E0B', '#BFE9FF', '#DC143C', '#111111']
const CRASH_MS = 380

function CardCrash({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const w = rect.width
    const h = rect.height

    const drawBlocks = (count: number) => {
      for (let i = 0; i < count; i++) {
        const s = [3, 5, 8, 14][Math.floor(Math.random() * 4)]
        const x = Math.floor((Math.random() * w) / s) * s
        const y = Math.floor((Math.random() * h) / s) * s
        ctx.fillStyle = PALETTE[Math.floor(Math.random() * PALETTE.length)]
        if (Math.random() < 0.25) ctx.fillRect(0, y, w, 2 + Math.random() * 6)
        else ctx.fillRect(x, y, s, s)
      }
    }

    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      const k = Math.min(1, (now - start) / CRASH_MS)
      drawBlocks(4 + Math.floor(k * k * 50))
      if (k < 1) {
        raf = requestAnimationFrame(loop)
      } else {
        setTimeout(onDone, 90)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas ref={canvasRef} className="acc-crash-canvas" aria-hidden="true" />
}

export function ImageAccordion({
  panels,
  open = 50,
  reach = 35,
  bounce = 10,
  gap = 10,
  height = 320,
}: {
  panels: AccordionPanel[]
  open?: number
  reach?: number
  bounce?: number
  gap?: number
  height?: number
}) {
  const [at, setAt] = useState<number | null>(null)
  const [crashId, setCrashId] = useState<string | null>(null)
  const [flickerId, setFlickerId] = useState<string | null>(null)
  const still = stillness()

  const handleCrashClick = (id: string) => {
    if (crashId) return
    sfx.glitch()
    setCrashId(id)
  }
  const handleCrashDone = (id: string) => {
    setCrashId(null)
    // Un único frame invertido al salir del crash — el eco de la fase
    // "flicker" de CrashTransition, condensado a un solo golpe.
    setFlickerId(id)
    setTimeout(() => setFlickerId((cur) => (cur === id ? null : cur)), 110)
  }

  const want = (i: number) => (at === null ? 0 : fall(Math.abs(i - at), reach) * 100)
  const a0 = useSpring(want(0), bounce, still)
  const a1 = useSpring(want(1), bounce, still)
  const a2 = useSpring(want(2), bounce, still)
  const a3 = useSpring(want(3), bounce, still)
  const swell = [a0, a1, a2, a3]

  const g = clamp(gap, 0, 20)
  const k = lift(open)
  const items = panels.slice(0, N)

  return (
    <div
      className="acc"
      style={{ height, gap: g, borderRadius: Math.min(RMAX, g) }}
      onPointerOut={(e) => {
        const to = e.relatedTarget as Node | null
        if (!to || !e.currentTarget.contains(to)) setAt(null)
      }}
      onPointerCancel={() => setAt(null)}
    >
      {items.map((panel, i) => {
        const u = swell[i] / 100
        const isOpen = at === i
        return (
          <div
            key={panel.id}
            className={[
              'acc-cell',
              crashId === panel.id ? 'acc-cell-shake' : '',
              flickerId === panel.id ? 'acc-cell-flicker' : '',
            ].filter(Boolean).join(' ')}
            data-open={isOpen || undefined}
            style={{
              flexGrow: 1 + k * u,
              borderRadius: Math.min(RMAX, g),
              // color-mix en vez del truco "${color}30" — ese sufijo de
              // alpha solo funciona si panel.color es hex; acá también
              // llegan strings hsl(var(--token)), donde concatenar un
              // sufijo produce un color CSS inválido (se ignora en
              // silencio). color-mix funciona igual para los dos formatos.
              borderColor: `color-mix(in srgb, ${panel.color} 30%, transparent)`,
              background: `color-mix(in srgb, ${panel.color} ${isOpen ? 12 : 6}%, transparent)`,
              // --pc y --i alimentan el titileo ambiental (glitch) en
              // globals.css: --pc es el color de la mecánica, --i escalona
              // el delay para que las 4 tarjetas no titilen juntas.
              ['--pc' as string]: panel.color,
              ['--i' as string]: i,
            } as React.CSSProperties}
            onPointerEnter={() => { if (at !== i) setAt(i) }}
            onFocus={() => setAt(i)}
            onClick={() => handleCrashClick(panel.id)}
            tabIndex={0}
          >
            {/* Tamaño fijo — el crecimiento visual lo da el transform
                (scale) en CSS, no el width/height del SVG, para no
                disparar layout en cada frame de la transición. */}
            <panel.Icon size={30} color={panel.color} />
            <span className="acc-title" style={{ color: panel.color }}>{panel.title}</span>
            <div className="acc-desc-wrap">
              <p className="acc-desc" style={{ color: 'hsl(var(--tx3))' }}>{panel.desc}</p>
            </div>
            {crashId === panel.id && <CardCrash onDone={() => handleCrashDone(panel.id)} />}
          </div>
        )
      })}
    </div>
  )
}
