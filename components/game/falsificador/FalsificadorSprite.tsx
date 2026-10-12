'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from '@/lib/game/architect/sound'

// ─── El Falsificador (jefe 10, UPDATE · DELETE) ──────────────────────────────
// Un cambiaformas hecho de cursores: los mismos de la plataforma (contorno
// negro, relleno blanco, sombra gris; colores según el tema), achicados a la
// tamaño de una flechita. Cada golpe o cada clic lo hace volar en bandada a
// otra criatura amigable; derrotado, los cursores forman una X.
// No es una tira de cuadros: se dibuja en vivo en un <canvas> a 12 cuadros
// por segundo, con píxeles enteros para que se vea pixel art. Las formas se
// escriben en coordenadas de 64 (como los demás jefes) y se dibujan en una
// grilla de 128: así entran el doble de cursores por lado y la silueta se lee.

const G = 128               // grilla del canvas (1 px real en la batalla, que lo muestra a 128)
const K = G / 64            // de coordenadas de forma (64) a píxeles del canvas
const N = 112               // cursores en la bandada
const STEP_MS = 1000 / 12   // ritmo de cuadros (pasos, como un sprite)
const MORPH_MS = 760

type Dir = 'nw' | 'ne' | 'se' | 'sw'
interface Pt { x: number; y: number; d: Dir }
interface Shape { pts: Pt[]; eyes: [number, number][] }

// ── Cursor mini (7×11), con la silueta del cursor de la plataforma ──────────
const CURSOR = [
  'k......',
  'kk.....',
  'kwk....',
  'kwwk...',
  'kwwwk..',
  'kwwwwk.',
  'kwwwwwk',
  'kwwkkkk',
  'kk.kwk.',
  '....kwk',
  '.....kk',
]

const PALETTES: Record<string, { k: string; w: string; s: string; shadow: string }> = {
  dark: { k: '#050505', w: '#f4f4f5', s: '#7a7a80', shadow: 'rgba(0,0,0,0.45)' },
  light: { k: '#0a0a0a', w: '#ffffff', s: '#9b9ba1', shadow: 'rgba(0,0,0,0.16)' },
  red: { k: '#0b0b12', w: '#f5f5fa', s: '#dc143c', shadow: 'rgba(0,0,0,0.45)' },
}

/** Rota la grilla del cursor: nw = original (punta arriba a la izquierda). */
function rotated(d: Dir): string[] {
  const rot = (rows: string[]) => rows[0].split('').map((_, x) => rows.map((r) => r[x]).reverse().join(''))
  let r = CURSOR
  const turns = { nw: 0, ne: 1, se: 2, sw: 3 }[d]
  for (let i = 0; i < turns; i++) r = rot(r)
  return r
}

function makeBitmaps(theme: string): Record<Dir, HTMLCanvasElement> {
  const pal = PALETTES[theme] ?? PALETTES.dark
  const out = {} as Record<Dir, HTMLCanvasElement>
  for (const d of ['nw', 'ne', 'se', 'sw'] as Dir[]) {
    const rows = rotated(d)
    const c = document.createElement('canvas')
    c.width = rows[0].length + 1
    c.height = rows.length + 1
    const g = c.getContext('2d')!
    // sombra: la silueta corrida 1 px abajo a la derecha, como el cursor real
    g.fillStyle = pal.s
    rows.forEach((row, y) => row.split('').forEach((ch, x) => { if (ch !== '.') g.fillRect(x + 1, y + 1, 1, 1) }))
    rows.forEach((row, y) => row.split('').forEach((ch, x) => {
      if (ch === '.') return
      g.fillStyle = ch === 'k' ? pal.k : pal.w
      g.fillRect(x, y, 1, 1)
    }))
    out[d] = c
  }
  return out
}

// ── Formas ───────────────────────────────────────────────────────────────────
const TAU = Math.PI * 2
const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v) }

function dirOf(dx: number, dy: number, fallback: Dir = 'ne'): Dir {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback
  if (dy <= 0) return dx >= 0 ? 'ne' : 'nw'
  return dx >= 0 ? 'se' : 'sw'
}

/** Relleno de una elipse con una grilla corrida (los cursores se pisan, como en la referencia). */
function blob(cx: number, cy: number, rx: number, ry: number, d: Dir, step = 2.9, seed = 0): Pt[] {
  const out: Pt[] = []
  let row = 0
  for (let y = cy - ry; y <= cy + ry + 0.01; y += step * 0.85, row++) {
    for (let x = cx - rx + (row % 2 ? step / 2 : 0); x <= cx + rx + 0.01; x += step) {
      if (((x - cx) / (rx + 0.6)) ** 2 + ((y - cy) / (ry + 0.6)) ** 2 <= 1) {
        out.push({ x: x + (hash(out.length, seed) - 0.5) * 0.6, y: y + (hash(seed, out.length) - 0.5) * 0.6, d })
      }
    }
  }
  return out
}

/** Trazo: cursores a lo largo de una línea quebrada, apuntando hacia donde va. */
function stroke(path: [number, number][], step = 2.5, d?: Dir): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i]
    const [x1, y1] = path[i + 1]
    const len = Math.hypot(x1 - x0, y1 - y0)
    const n = Math.max(1, Math.round(len / step))
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const t = k / n
      out.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, d: d ?? dirOf(x1 - x0, y1 - y0) })
    }
  }
  return out
}

const s = (t: number, ph = 0) => Math.sin(TAU * t + ph)

/** Cada forma es una función del tiempo (0..1, en bucle): así se mueve viva. */
const FORMS: { name: string; at: (t: number) => Shape }[] = [
  {
    name: 'caminante',   // saluda con la mano mientras camina en el lugar
    at: (t) => ({
      pts: [
        ...blob(30, 11, 4.5, 4.5, 'ne', 2.9, 9),
        ...blob(30, 26, 4.5, 8, 'ne', 2.9, 1),
        ...stroke([[34, 20], [39, 17], [42 + s(t) * 2, 10]]),
        ...stroke([[26, 20], [23, 27], [22, 33]]),
        ...stroke([[29, 34], [27 + s(t) * 2, 43], [25 + s(t) * 3, 52], [21 + s(t) * 3, 53]]),
        ...stroke([[32, 34], [34 - s(t) * 2, 43], [36 - s(t) * 3, 52], [40 - s(t) * 3, 53]]),
      ],
      eyes: [[33, 10]],
    }),
  },
  {
    name: 'perro',       // mueve la cola
    at: (t) => ({
      pts: [
        ...blob(36, 31, 11, 5, 'nw', 2.9, 2),
        ...blob(19, 23, 5, 4, 'nw', 2.9, 3),
        ...stroke([[14, 26], [9, 27]]),
        ...stroke([[17, 19], [15, 13]]),
        ...stroke([[22, 19], [24, 13]]),
        ...stroke([[47, 29], [51, 22], [51 + s(t, 0) * 3, 15]]),
        ...stroke([[28, 36], [27, 50]]),
        ...stroke([[32, 36], [33 + s(t * 2) * 1, 50]]),
        ...stroke([[41, 36], [40, 50]]),
        ...stroke([[45, 36], [46 - s(t * 2) * 1, 50]]),
      ],
      eyes: [[18, 22], [8, 27]],
    }),
  },
  {
    name: 'arañita',     // redonda, con patitas que zapatean
    at: (t) => {
      const legs: Pt[] = []
      for (let k = 0; k < 3; k++) {
        const tap = s(t * 2, k * 1.4) * 1.5
        const y0 = 29 + k * 4
        legs.push(...stroke([[25, y0], [16, 21 + k * 7], [9, 32 + k * 8 + tap]]))
        legs.push(...stroke([[39, y0], [48, 21 + k * 7], [55, 32 + k * 8 - tap]]))
      }
      return {
        pts: [...blob(32, 34, 8, 7, 'nw', 2.9, 4), ...blob(32, 23, 5, 3, 'ne', 2.9, 5), ...legs],
        eyes: [[30, 22], [34, 22]],
      }
    },
  },
  {
    name: 'pájaro',      // aletea
    at: (t) => {
      const flap = s(t * 2)
      return {
        pts: [
          ...blob(30, 33, 9, 5, 'ne', 2.9, 6),
          ...blob(41, 28, 4, 3, 'ne', 2.9, 7),
          ...stroke([[45, 28], [50, 29]]),
          ...stroke([[21, 34], [14, 37], [11, 33]]),
          ...stroke([[28, 30], [22, 22 + flap * 6], [16, 12 + flap * 14]]),
          ...stroke([[33, 30], [37, 22 + flap * 5], [40, 14 + flap * 12]]),
        ],
        eyes: [[42, 27]],
      }
    },
  },
  {
    name: 'pez',         // nada moviendo la cola
    at: (t) => {
      const w = s(t * 2) * 3
      return {
        pts: [
          ...blob(30, 33, 12, 6, 'nw', 2.9, 8),
          ...stroke([[42, 33], [51, 26 + w]]),
          ...stroke([[42, 33], [51, 40 + w]]),
          ...stroke([[51, 26 + w], [51, 40 + w]]),
          ...stroke([[26, 27], [31, 21], [36, 27]]),
        ],
        eyes: [[22, 31]],
      }
    },
  },
]

/** Derrotado: todos los cursores forman una X, quietos. */
function xShape(): Shape {
  // dos trazos paralelos por diagonal: una X gruesa, hecha de cursores
  const per = N / 4
  const line = (a: [number, number], b: [number, number], d: Dir) => stroke([a, b], Math.hypot(b[0] - a[0], b[1] - a[1]) / (per - 1), d).slice(0, per)
  return {
    pts: [
      ...line([12, 11], [52, 51], 'se'), ...line([12, 15], [48, 51], 'se'),
      ...line([52, 11], [12, 51], 'sw'), ...line([52, 15], [16, 51], 'sw'),
    ],
    eyes: [],
  }
}

/** Unos pocos cursores sueltos revolotean lejos del cuerpo, como en la referencia. */
const STRAYS = 4
function stray(i: number, t: number): Pt {
  const k = i % STRAYS
  const r = 22 + (k % 2) * 4
  const sp = k % 2 ? 0.5 : -0.4
  const a = TAU * (t * sp + k / STRAYS + 0.12)
  const x = 32 + Math.cos(a) * r * 0.95
  const y = 32 + Math.sin(a) * r * 0.75
  return { x, y, d: dirOf(-Math.sin(a) * sp, Math.cos(a) * sp) }
}

/** Los que sobran se suman al cuerpo (encima de otro cursor, corridos 1 px) para
 *  que la silueta quede limpia; solo STRAYS quedan sueltos. */
function targets(shape: Shape, t: number): Pt[] {
  // Si la forma pide más cursores que los que hay, se toman salteados (parejo).
  const room = N - STRAYS
  const pts = shape.pts.length > room && shape.eyes.length
    ? Array.from({ length: room }, (_, i) => shape.pts[Math.floor((i * shape.pts.length) / room)])
    : shape.pts
  const n = pts.length
  return Array.from({ length: N }, (_, i) => {
    if (i < n) return pts[i]
    if (i >= N - STRAYS || n === 0) return stray(i, t)
    const p = pts[Math.floor(hash(i, 11) * n)]
    return { x: p.x + 0.5, y: p.y + 0.5, d: p.d }
  })
}

// ── Componente ───────────────────────────────────────────────────────────────

interface Props {
  /** Tamaño en pantalla (64, 96 o 128 px: 1×, 1,5×, 2×). */
  px: number
  defeated?: boolean
  animated?: boolean
  /** Vida del jefe 0..1: cada vez que baja, cambia de forma. */
  hpRatio?: number
  /** Cambiar de forma con un clic (en la batalla y en la vitrina). */
  clickable?: boolean
  label?: string
  /** Vitrina: fija una forma (índice en FALSIFICADOR_FORMS) en vez de cambiarla. */
  fixedForm?: number
}

export default function FalsificadorSprite({ px, defeated = false, animated = true, hpRatio = 1, clickable = true, label = 'El Falsificador', fixedForm }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [form, setForm] = useState(fixedForm ?? 0)
  const st = useRef({
    form: fixedForm ?? 0,
    defeated,
    from: [] as Pt[],
    morphAt: -Infinity,
    last: [] as Pt[],
    bitmaps: null as Record<Dir, HTMLCanvasElement> | null,
    theme: '',
    reduced: false,
  })

  const startMorph = useCallback(() => {
    st.current.from = st.current.last.slice()
    st.current.morphAt = performance.now()
  }, [])

  const nextForm = useCallback(() => {
    if (st.current.defeated || fixedForm !== undefined) return
    setForm((f) => {
      const n = (f + 1) % FORMS.length
      st.current.form = n
      return n
    })
    startMorph()
    sfx.pick()
  }, [startMorph, fixedForm])

  // Cada golpe (la vida baja) → otra forma.
  const prevHp = useRef(hpRatio)
  useEffect(() => {
    if (hpRatio < prevHp.current - 1e-6 && !defeated) nextForm()
    prevHp.current = hpRatio
  }, [hpRatio, defeated, nextForm])

  // Derrota → la bandada arma la X.
  useEffect(() => {
    if (st.current.defeated !== defeated) {
      st.current.defeated = defeated
      if (st.current.last.length) startMorph()
    }
  }, [defeated, startMorph])

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const g = cv.getContext('2d')!
    g.imageSmoothingEnabled = false
    st.current.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let lastStep = -1

    const draw = (now: number) => {
      const S = st.current
      const theme = document.documentElement.dataset.theme ?? 'dark'
      if (theme !== S.theme || !S.bitmaps) { S.theme = theme; S.bitmaps = makeBitmaps(theme) }
      const step = Math.floor(now / STEP_MS)
      if (step !== lastStep) {
        lastStep = step
        const still = S.reduced || !animated
        const t = still ? 0 : ((step * STEP_MS) / 1600) % 1
        const shape = S.defeated ? xShape() : FORMS[S.form].at(t)
        const goal = targets(shape, t)
        const p0 = S.reduced ? 1 : (now - S.morphAt) / MORPH_MS
        const cur: Pt[] = goal.map((g2, i) => {
          const from = S.from[i]
          if (!from || p0 >= 1.35) return g2
          // cada cursor sale un poco después que el anterior y vuela en arco
          const p = Math.min(1, Math.max(0, (p0 - (i / N) * 0.35) / 0.65))
          const e = 1 - (1 - p) ** 3
          const arc = Math.sin(Math.PI * e) * (hash(i, 9) - 0.5) * 18
          const x = from.x + (g2.x - from.x) * e + arc * 0.6
          const y = from.y + (g2.y - from.y) * e - Math.abs(arc) * 0.5
          return p >= 1 ? g2 : { x, y, d: dirOf(g2.x - from.x, g2.y - from.y, g2.d) }
        })
        S.last = cur

        g.clearRect(0, 0, G, G)
        // sombra en el piso
        const pal = PALETTES[theme] ?? PALETTES.dark
        g.fillStyle = pal.shadow
        for (let x = -24; x <= 24; x++) {
          const h = Math.round(Math.sqrt(1 - (x / 25) ** 2) * 3)
          g.fillRect(64 + x, 119 - h, 1, h * 2 + 1)
        }
        // de atrás hacia adelante: los de más abajo tapan a los de arriba
        const order = cur.map((p, i) => [p, i] as const).sort((a, b) => a[0].y - b[0].y)
        for (const [p] of order) {
          const bm = S.bitmaps![p.d]
          g.drawImage(bm, Math.round(p.x * K - bm.width / 2), Math.round(p.y * K - bm.height / 2))
        }
        // ojitos (aparecen cuando la forma ya se armó)
        if (p0 >= 1.1 && !S.defeated) {
          g.fillStyle = pal.k
          for (const [ex, ey] of shape.eyes) g.fillRect(Math.round(ex * K) - 1, Math.round(ey * K) - 1, 3, 3)
        }
      }
      if (animated || now - S.morphAt < MORPH_MS * 1.5) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [animated, form, defeated])

  const canClick = clickable && !defeated && fixedForm === undefined
  return (
    <canvas
      ref={ref}
      width={G}
      height={G}
      role="img"
      aria-label={defeated ? `${label} derrotado` : `${label} con forma de ${FORMS[form].name}`}
      onClick={canClick ? nextForm : undefined}
      title={canClick ? 'Hacé clic: cambia de forma' : undefined}
      style={{ width: px, height: px, imageRendering: 'pixelated', display: 'block', cursor: canClick ? 'pointer' : undefined }}
    />
  )
}

export const FALSIFICADOR_FORMS = FORMS.map((f) => f.name)
