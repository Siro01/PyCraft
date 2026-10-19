// Kit para dibujar personajes en ASCII "a mano": el mismo método que El
// Pistolero (lib/game/raid/pistolero-art.ts). Se dibuja con formas (óvalos,
// polígonos, trazos, curvas) en "unidades de diseño" y cada forma pinta una
// grilla de brillo (0..1) con una tinta. El renderer convierte cada punto de la
// grilla en un carácter: más brillo, carácter más cargado.

export type Luma = Float32Array

export interface HandFrame { w: number; h: number; luma: Luma; ink: Uint8Array }

/** Un personaje dibujado a mano: su grilla, su paleta y su animación en bucle. */
export interface HandArt {
  id: string
  /** Grilla fina en la que se dibuja (cada carácter toma un bloque de 4×8 puntos). */
  w: number
  h: number
  /** Color de cada tinta (el índice es la tinta). */
  palette: readonly string[]
  /** Cuadros del bucle y duración total en ms. */
  frames: number
  ms: number
  /** Dibuja el cuadro `i` (t = i / frames, 0..1). */
  make: (t: number, i: number) => HandFrame
}

export const TAU = Math.PI * 2
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
export const smooth = (a: number, b: number, v: number) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k) }

export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export type Pt = [number, number]

export function inPoly(x: number, y: number, pts: Pt[]) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Punto de una curva de Bézier cúbica. */
export function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, k: number): Pt {
  const u = 1 - k
  return [
    u * u * u * p0[0] + 3 * u * u * k * p1[0] + 3 * u * k * k * p2[0] + k * k * k * p3[0],
    u * u * u * p0[1] + 3 * u * u * k * p1[1] + 3 * u * k * k * p2[1] + k * k * k * p3[1],
  ]
}

/** Rota el punto p alrededor de o. */
export const rot = (p: Pt, o: Pt, a: number): Pt => {
  const c = Math.cos(a), s = Math.sin(a)
  return [o[0] + (p[0] - o[0]) * c - (p[1] - o[1]) * s, o[1] + (p[0] - o[0]) * s + (p[1] - o[1]) * c]
}

/** Lienzo en unidades de diseño (`uw` de ancho) que pinta una grilla real de w×h. */
export class HandCanvas {
  readonly w: number
  readonly h: number
  readonly B: number
  out: Float32Array
  ink: Uint8Array
  pen = 0

  constructor(w: number, h: number, uw: number) {
    this.w = w; this.h = h; this.B = w / uw
    this.out = new Float32Array(w * h)
    this.ink = new Uint8Array(w * h)
  }

  frame(): HandFrame { return { w: this.w, h: this.h, luma: this.out, ink: this.ink } }

  with(pen: number, draw: () => void) {
    const prev = this.pen
    this.pen = pen
    draw()
    this.pen = prev
  }

  /** Un punto en unidades de diseño (un toque de pincel de radio `r`, en unidades).
   *  `max`: no baja un brillo que ya está más alto. */
  pt(x: number, y: number, l: number, max = false, r = 0.45) {
    const R = Math.max(0.5, r * this.B)
    const cx = x * this.B, cy = y * this.B
    for (let yi = Math.floor(cy - R); yi <= Math.ceil(cy + R); yi++) {
      for (let xi = Math.floor(cx - R); xi <= Math.ceil(cx + R); xi++) {
        if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) continue
        if (Math.hypot(xi - cx, yi - cy) > R) continue
        const i = yi * this.w + xi
        if (max && this.out[i] >= l) continue
        this.out[i] = clamp(l)
        this.ink[i] = this.pen
      }
    }
  }

  /** Apaga una zona (deja el negro del fondo): para separar formas con un hueco. */
  cut(x0: number, y0: number, x1: number, y1: number, f: (x: number, y: number) => boolean) {
    this.region(x0, y0, x1, y1, (x, y) => (f(x, y) ? 0 : null))
  }

  /** Recorre la zona (en unidades de diseño) evaluando `f` en cada punto real. */
  region(x0: number, y0: number, x1: number, y1: number, f: (x: number, y: number) => number | null) {
    const B = this.B
    const ax = Math.max(0, Math.floor(Math.min(x0, x1) * B) - 1), bx = Math.min(this.w - 1, Math.ceil(Math.max(x0, x1) * B) + 1)
    const ay = Math.max(0, Math.floor(Math.min(y0, y1) * B) - 1), by = Math.min(this.h - 1, Math.ceil(Math.max(y0, y1) * B) + 1)
    for (let py = ay; py <= by; py++) {
      for (let px = ax; px <= bx; px++) {
        const l = f(px / B, py / B)
        if (l === null) continue
        const i = py * this.w + px
        this.out[i] = clamp(l)
        this.ink[i] = this.pen
      }
    }
  }

  /** Óvalo. `shade(nx, ny, r)`: nx, ny en -1..1 y r = nx² + ny². */
  ellipse(cx: number, cy: number, rx: number, ry: number, shade: (nx: number, ny: number, r: number) => number | null) {
    this.region(cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry
      const r = nx * nx + ny * ny
      return r <= 1 ? shade(nx, ny, r) : null
    })
  }

  poly(pts: Pt[], shade: (x: number, y: number) => number | null) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    this.region(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), (x, y) => (inPoly(x, y, pts) ? shade(x, y) : null))
  }

  /** Trazo grueso de radio r. `shade(k, d)`: k = 0..1 a lo largo, d = distancia al eje / r. */
  stroke(a: Pt, b: Pt, r: number, shade: (k: number, d: number) => number | null) {
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const len2 = dx * dx + dy * dy || 1
    this.region(Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, (x, y) => {
      const k = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / len2)
      const d = Math.hypot(x - (a[0] + dx * k), y - (a[1] + dy * k))
      return d <= r ? shade(k, d / r) : null
    })
  }

  /** Curva gruesa (Bézier cúbica) con radio variable `r(k)`. `shade(k, d)` como en stroke. */
  curve(p0: Pt, p1: Pt, p2: Pt, p3: Pt, r: (k: number) => number, shade: (k: number, d: number) => number | null, steps = 40) {
    let prev = bez(p0, p1, p2, p3, 0)
    for (let s = 1; s <= steps; s++) {
      const k = s / steps
      const cur = bez(p0, p1, p2, p3, k)
      const k0 = (s - 1) / steps
      this.stroke(prev, cur, r(k), (kk, d) => shade(k0 + (k - k0) * kk, d))
      prev = cur
    }
  }
}
