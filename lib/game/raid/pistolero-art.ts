// Arte de El Pistolero (El Bandido sin Nombre) — grillas de luminancia generadas
// por código, sin imports (se puede renderizar con `node --experimental-strip-types`).
//
// Es el jefe más cargado del juego, a propósito:
// - El doble de resolución que los jefes secretos (120×144, un carácter por píxel).
// - Cuatro tintas (los demás jefes son de un solo color): hueso, brasa, metal y polvo.
// - Se dibuja en «unidades de diseño» de 80×96 y la grilla se muestrea a 1,5×,
//   así las curvas salen más finas sin reescribir cada coordenada.

export const PW = 120
export const PH = 144
/** Píxeles por unidad de diseño. */
const B = PW / 80

export type Luma = Float32Array

/** Tinta de cada píxel. */
export const INK = { hueso: 0, brasa: 1, metal: 2, polvo: 3 } as const
export type InkId = (typeof INK)[keyof typeof INK]

/** Paleta: el índice es la tinta. */
export const PISTOLERO_PALETTE = ['#EBC79E', '#FF5A36', '#FFF1D0', '#9C6A48'] as const

export interface Frame {
  luma: Luma
  ink: Uint8Array
}

export const PISTOLERO_INFO = {
  name: 'El Bandido sin Nombre',
  blurb: 'Pañuelo rojo sobre la cara, ojos de brasa, cartuchera cruzada y un revólver de cachas de marfil.',
  color: PISTOLERO_PALETTE[0],
}

export type PistoleroPose =
  | 'idle'        // respira, el poncho y la bufanda flamean, la mano ronda la funda
  | 'desenfundar' // saca el revólver y apunta
  | 'disparo'     // fogonazo, retroceso y humo
  | 'giro'        // hace girar el revólver en el dedo
  | 'tambor'      // abre el tambor y lo hace girar (ruleta)
  | 'recarga'     // mete balas en el tambor
  | 'golpe'       // recibe un acierto: retrocede
  | 'saludo'      // se toca el sombrero
  | 'retirada'    // se da vuelta y se va hacia el atardecer

/** Duración (ms) y cantidad de cuadros de cada pose. `loop` = se repite. */
export const POSES: Record<PistoleroPose, { frames: number; ms: number; loop?: boolean; label: string }> = {
  idle: { frames: 20, ms: 2600, loop: true, label: 'En guardia' },
  desenfundar: { frames: 8, ms: 520, label: 'Desenfundar' },
  disparo: { frames: 10, ms: 700, label: 'Disparo' },
  giro: { frames: 16, ms: 1300, label: 'Girar el revólver' },
  tambor: { frames: 18, ms: 1600, label: 'Girar el tambor' },
  recarga: { frames: 18, ms: 1700, label: 'Recargar' },
  golpe: { frames: 8, ms: 560, label: 'Recibe un golpe' },
  saludo: { frames: 14, ms: 1400, label: 'Tocarse el sombrero' },
  retirada: { frames: 36, ms: 4200, label: 'Retirada al atardecer' },
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
const TAU = Math.PI * 2

/**
 * Lienzo en unidades de diseño (80×96) que pinta en la grilla real (120×144).
 * `s`, `ox`, `oy` mueven y escalan la figura (la retirada); `ink` es la tinta activa.
 */
class Canvas {
  out = new Float32Array(PW * PH)
  ink = new Uint8Array(PW * PH)
  pen: InkId = INK.hueso
  ox = 0
  oy = 0
  s = 1
  cx = 34
  private tx(x: number) { return ((x - this.cx) * this.s + this.cx + this.ox) * B }
  private ty(y: number) { return ((y - 90) * this.s + 90 + this.oy) * B }
  /** Escribe un píxel de la grilla real. */
  raw(px: number, py: number, l: number, max = false, pen = this.pen) {
    const xi = Math.round(px), yi = Math.round(py)
    if (xi < 0 || yi < 0 || xi >= PW || yi >= PH) return
    const i = yi * PW + xi
    if (max && this.out[i] >= l) return
    this.out[i] = clamp(l)
    this.ink[i] = pen
  }
  /** Un punto en unidades de diseño. */
  pt(x: number, y: number, l: number, max = false) {
    this.raw(this.tx(x), this.ty(y), l, max)
  }
  /** Recorre la región (en unidades de diseño) evaluando `f` en cada píxel real. */
  region(x0: number, y0: number, x1: number, y1: number, f: (x: number, y: number) => number | null) {
    const ax = Math.floor(Math.min(this.tx(x0), this.tx(x1))) - 1, bx = Math.ceil(Math.max(this.tx(x0), this.tx(x1))) + 1
    const ay = Math.floor(this.ty(y0)) - 1, by = Math.ceil(this.ty(y1)) + 1
    for (let py = Math.max(0, ay); py <= Math.min(PH - 1, by); py++) {
      for (let px = Math.max(0, ax); px <= Math.min(PW - 1, bx); px++) {
        const fx = (px / B - this.ox - this.cx) / this.s + this.cx
        const fy = (py / B - this.oy - 90) / this.s + 90
        const l = f(fx, fy)
        if (l !== null) {
          const i = py * PW + px
          this.out[i] = clamp(l)
          this.ink[i] = this.pen
        }
      }
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, shade: (nx: number, ny: number, r: number) => number | null) {
    this.region(cx - rx, cy - ry, cx + rx, cy + ry, (x, y) => {
      const nx = (x - cx) / rx, ny = (y - cy) / ry
      const r = nx * nx + ny * ny
      return r <= 1 ? shade(nx, ny, r) : null
    })
  }
  poly(pts: number[][], shade: (x: number, y: number) => number | null) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
    this.region(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), (x, y) => (inPoly(x, y, pts) ? shade(x, y) : null))
  }
  /** Trazo grueso entre dos puntos (radio r). `k` = 0..1 a lo largo, `d` = distancia al eje / r. */
  stroke(x0: number, y0: number, x1: number, y1: number, r: number, shade: (k: number, d: number) => number | null) {
    const dx = x1 - x0, dy = y1 - y0
    const len2 = dx * dx + dy * dy || 1
    this.region(Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r, Math.max(y0, y1) + r, (x, y) => {
      const k = clamp(((x - x0) * dx + (y - y0) * dy) / len2)
      const d = Math.hypot(x - (x0 + dx * k), y - (y0 + dy * k))
      return d <= r ? shade(k, d / r) : null
    })
  }
  with(pen: InkId, draw: () => void) {
    const prev = this.pen
    this.pen = pen
    draw()
    this.pen = prev
  }
}

function inPoly(x: number, y: number, pts: number[][]) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// ─── Fondo: sol de brasa, mesetas, saguaro, buitres, polvo y rodador ─────────

function backdrop(c: Canvas, t: number, sunset = 0) {
  const sunX = 60, sunY = 66 + sunset * 8, sunR = 24 + sunset * 6
  const hor = 84
  // Sol con franjas que se afinan hacia abajo (atardecer retro) y halo de puntos
  c.with(INK.brasa, () => {
    c.region(sunX - sunR - 6, sunY - sunR - 6, sunX + sunR + 6, hor, (x, y) => {
      const d = Math.hypot(x - sunX, (y - sunY) * 1.08)
      if (d < sunR) {
        const band = (y - (sunY - sunR)) / (sunR * 1.7)
        if (Math.sin(y * (1.1 + band * 1.8)) > 0.62 - band * 0.7) return null
        return 0.3 + 0.24 * (1 - d / sunR) + sunset * 0.12
      }
      if (d < sunR + 5 && hash2(Math.round(x * B), Math.round(y * B), 8) > 0.9) return 0.13
      return null
    })
  })
  c.with(INK.polvo, () => {
    // Mesetas en el horizonte (tapan la base del sol)
    const mesa = (x: number) => {
      const m1 = x > 38 && x < 54 ? 77 + (x < 40 ? (40 - x) * 3 : 0) + (x > 52 ? (x - 52) * 3 : 0) : 99
      const m2 = x > 62 && x < 80 ? 79 + (x < 64 ? (64 - x) * 2 : 0) + Math.sin(x * 0.9) * 0.4 : 99
      const m3 = x < 20 ? 80 + Math.sin(x * 0.4) * 0.8 : 99
      return Math.min(m1, m2, m3)
    }
    c.region(0, 74, 80, hor, (x, y) => (y >= mesa(x) ? 0.12 + ((Math.round(y * B) + Math.round(x * B)) % 5 === 0 ? 0.05 : 0) : null))
    // Línea del horizonte y suelo con grietas y piedritas
    c.region(0, hor, 80, 96, (x, y) => {
      const px = Math.round(x * B), py = Math.round(y * B)
      if (py === Math.round(hor * B)) return 0.24
      let l = 0.04 + (y - hor) * 0.004
      if (hash2(px, py, 9) > 0.94) l += 0.13
      if (hash2(px >> 2, py, 4) > 0.86 && y > 90) l += 0.08
      const crack = Math.abs(Math.sin(x * 0.35 + y * 1.7) + Math.sin(x * 0.11 - y)) < 0.05 && y > 87
      return crack ? 0.18 : l
    })
    // Saguaro con costillas
    const sx = 10
    c.stroke(sx, 62, sx, hor, 1.6, (_, d) => 0.18 + (d < 0.3 ? 0.08 : 0))
    c.stroke(sx - 1, 72, sx - 5, 72, 1.1, () => 0.16)
    c.stroke(sx - 5, 72, sx - 5, 65, 1.1, (_, d) => 0.16 + (d < 0.3 ? 0.06 : 0))
    c.stroke(sx + 1, 69, sx + 5, 69, 1.1, () => 0.16)
    c.stroke(sx + 5, 69, sx + 5, 63, 1.1, (_, d) => 0.16 + (d < 0.3 ? 0.06 : 0))
    // Buitres que dan vueltas
    for (let b = 0; b < 2; b++) {
      const a = t * TAU + b * Math.PI
      const vx = 56 + Math.cos(a) * (9 + b * 4), vy = 22 + b * 6 + Math.sin(a) * 3
      const flap = Math.sin(t * TAU * 4 + b) * 0.8
      for (let s = -1; s <= 1; s += 2) {
        for (let u = 0; u <= 1; u += 0.12) c.pt(vx + s * u * 3.2, vy - u * (1.2 + flap) + u * u * 1.4, 0.3)
      }
      c.pt(vx, vy, 0.34)
    }
    // Polvo que vuela con el viento (lazo perfecto: velocidades enteras)
    for (let k = 0; k < 26; k++) {
      const px = (hash2(k, 1, 31) * 80 + t * 80 * (1 + Math.floor(hash2(k, 2, 31) * 2))) % 80
      const py = 58 + hash2(k, 3, 31) * 36 + Math.sin(t * TAU + k) * 1.5
      c.pt(px, py, 0.16 + 0.14 * hash2(k, 4, 31))
    }
  })
}

function tumbleweed(c: Canvas, t: number) {
  const x = (t % 1) * 100 - 10
  const y = 87 - Math.abs(Math.sin(t * TAU * 3)) * 3
  const rot = t * TAU * 3
  c.with(INK.polvo, () => {
    for (let k = 0; k < 90; k++) {
      const a = (k / 90) * TAU * 3 + rot
      const r = 2 + hash2(k, 7, 77) * 2.6
      c.pt(x + Math.cos(a) * r, y + Math.sin(a * 1.3) * r * 0.9, 0.36, true)
    }
  })
}

// ─── El revólver: Colt antiguo con cachas de marfil y grabados ───────────────

/** Revólver de costado. (gx, gy) = mano; ang = ángulo del cañón. Devuelve la boca del cañón. */
function revolver(c: Canvas, gx: number, gy: number, ang: number, glint: number, cylSpin = 0, open = 0) {
  const S = 1.45
  const ca = Math.cos(ang) * S, sa = Math.sin(ang) * S
  const at = (u: number, v: number) => [gx + ca * u - sa * v, gy + sa * u + ca * v]
  // cachas de marfil (curvas, con el tornillo de bronce)
  c.with(INK.hueso, () => {
    const g0 = at(-1, 0), g1 = at(-2.6, 3), g2 = at(-3.2, 5.2)
    c.stroke(g0[0], g0[1], g1[0], g1[1], 1.5, (_, d) => 0.82 - d * 0.25)
    c.stroke(g1[0], g1[1], g2[0], g2[1], 1.4, (_, d) => 0.78 - d * 0.25)
  })
  c.with(INK.metal, () => {
    const sc = at(-2, 2.2)
    c.pt(sc[0], sc[1], 1)
    // armazón con grabado (rayitas)
    const f0 = at(-1.2, -1.2), f1 = at(4.2, -1.2)
    c.stroke(f0[0], f0[1], f1[0], f1[1], 1.35, (k, d) => (Math.sin(k * 40) > 0.6 && d < 0.6 ? 0.95 : 0.58 - d * 0.15))
    // martillo
    const h0 = at(-1.4, -2.1), h1 = at(-2.8, -3.8)
    c.stroke(h0[0], h0[1], h1[0], h1[1], 0.7, () => 0.8)
    // guardamonte y gatillo
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI
      const p = at(1.2 + Math.cos(a) * 1.5, 0.6 + Math.sin(a) * 1.8)
      c.pt(p[0], p[1], 0.62)
    }
    const tr0 = at(1, 0.2), tr1 = at(0.6, 1.6)
    c.stroke(tr0[0], tr0[1], tr1[0], tr1[1], 0.35, () => 0.8)
    // tambor con estrías (se abre hacia abajo al recargar)
    const cy = at(2.3, -1.1 + open * 3.2)
    c.ellipse(cy[0], cy[1], 3.5, 2.8, (nx, ny) => {
      const flute = Math.sin((nx * 2 + cylSpin) * 5) > 0.55 ? 0.25 : 0.62
      return flute - ny * 0.15 + (ny < -0.6 ? 0.25 : 0)
    })
    // cañón largo octogonal con mira y brillo que lo recorre
    const b0 = at(4.2, -1.7), b1 = at(16, -1.7)
    c.stroke(b0[0], b0[1], b1[0], b1[1], 0.95, (k, d) => {
      const shine = Math.max(0, 1 - Math.abs(k - glint) * 7)
      return 0.55 + (d < 0.35 ? 0.2 : 0) + shine * 0.45
    })
    const ej0 = at(5, -0.5), ej1 = at(12, -0.5)
    c.stroke(ej0[0], ej0[1], ej1[0], ej1[1], 0.4, () => 0.5) // varilla expulsora
    const m = at(15.4, -3)
    c.pt(m[0], m[1], 0.95)
  })
  return at(17, -1.7)
}

/** Tambor de frente (6 recámaras) flotando grande: ruleta y recarga. */
function bigCylinder(c: Canvas, cx: number, cy: number, r: number, rot: number, loaded: number, glow = 0) {
  c.with(INK.metal, () => {
    c.ellipse(cx, cy, r, r, (nx, ny, rr) => {
      const rim = rr > 0.84 ? 0.35 : 0
      const engrave = rr > 0.7 && rr < 0.78 && Math.sin(Math.atan2(ny, nx) * 24 + rot * 3) > 0 ? 0.25 : 0
      return 0.3 - ny * 0.12 + rim + engrave + glow * 0.18
    })
    c.ellipse(cx, cy, r * 0.17, r * 0.17, () => 0.08)
  })
  for (let k = 0; k < 6; k++) {
    const a = rot + (k / 6) * TAU
    const hx = cx + Math.cos(a) * r * 0.56, hy = cy + Math.sin(a) * r * 0.56
    const full = k < loaded
    c.with(full ? INK.brasa : INK.metal, () => {
      c.ellipse(hx, hy, r * 0.21, r * 0.21, (nx, ny, rr) => (full ? (rr < 0.35 ? 1 : 0.62 - (nx + ny) * 0.15) : 0.02))
    })
  }
}

function muzzleFlash(c: Canvas, x: number, y: number, k: number, seed: number) {
  const size = 9 * (1 - k)
  if (size < 0.6) return
  c.with(INK.brasa, () => {
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * TAU + hash2(seed, i, 5)
      const len = size * (0.5 + 0.8 * hash2(seed, i, 6))
      for (let s = 0; s <= len; s += 0.3) c.pt(x + Math.cos(a) * s * 1.4, y + Math.sin(a) * s * 0.75, 1 - (s / len) * 0.5, true)
    }
  })
  c.with(INK.metal, () => c.ellipse(x + size * 0.2, y, size * 0.5, size * 0.35, () => 1))
}

// ─── La figura ────────────────────────────────────────────────────────────────

interface Pose {
  breathe: number    // 0..1
  wind: number       // -1..1
  arm: number        // 0 = mano en la funda · 1 = brazo extendido apuntando
  aim: number        // ángulo del cañón (rad, 0 = a la derecha)
  recoil: number
  gunOut: boolean
  spin: number       // >0 = el revólver gira en el dedo
  cylSpin: number
  cylOpen: number
  otherHand: number  // 0 = abajo · 1 = arriba (sombrero / tambor)
  hatLift: number
  lean: number
  blink: boolean
  eyes: number       // brillo de los ojos (0..1)
  back: boolean      // de espaldas (retirada)
  step: number
  glint: number      // dónde está el brillo del cañón (0..1, fuera = sin brillo)
}

const BASE: Pose = {
  breathe: 0, wind: 0, arm: 0, aim: 0, recoil: 0, gunOut: false, spin: 0, cylSpin: 0, cylOpen: 0,
  otherHand: 0, hatLift: 0, lean: 0, blink: false, eyes: 1, back: false, step: 0, glint: -1,
}

function figure(c: Canvas, p: Pose) {
  const cx = 34
  const by = p.breathe * 0.8
  const X = (x: number, y: number) => x + p.lean * (90 - y) * 0.06
  const sh = 36 - by // hombros

  // ── Piernas con chaparreras de flecos, botas cosidas y espuelas ──
  const walk = p.back ? Math.sin(p.step) : 0
  for (const side of [-1, 1]) {
    const footX = cx + side * 6 + side * walk * 2.2
    const hipX = cx + side * 4.5
    c.with(INK.hueso, () => {
      c.poly([[X(hipX - 3.3, 62), 62], [X(hipX + 3.3, 62), 62], [X(footX + 2.7, 82), 82], [X(footX - 2.7, 82), 82]], (x, y) => {
        let l = 0.22 + 0.03 * Math.sin(y * 0.7 + x * 0.4) + (x > footX ? 0.06 : 0)
        if (Math.abs(x - (footX + side * 1.8)) < 0.35) l = 0.44 // costura
        return l
      })
      // flecos a los costados de la pierna
      for (let y = 64; y < 80; y += 1.2) {
        const ex = X(lerp(hipX + side * 3.3, footX + side * 2.7, (y - 62) / 20), y)
        for (let u = 0; u < 2.2; u += 0.4) c.pt(ex + side * u + p.wind * u * 0.4, y + u * 0.5, 0.42 - u * 0.08)
      }
    })
    c.with(INK.hueso, () => {
      const toe = p.back ? -5.5 : 6
      c.poly([[footX - 3.2, 79.5], [footX + 3.2, 79.5], [footX + 3.5, 87.5], [footX + toe, 88.8], [footX + toe, 90.2], [footX - 3.6, 90.2]], (x, y) => {
        let l = 0.36 + (y < 81.5 ? 0.2 : 0) - (x - footX) * 0.008
        if (y > 82.5 && y < 86.5 && Math.abs(Math.sin((x - footX) * 1.6 + y * 0.8)) < 0.15) l = 0.62 // arabescos cosidos
        if (y > 89.4) l = 0.18 // suela
        return l
      })
    })
    // espuela: estrella que gira
    c.with(INK.metal, () => {
      const sx = footX + (p.back ? 4 : -4.2), sy = 88.4
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + p.step + p.breathe
        for (let u = 0.4; u <= 2.2; u += 0.3) c.pt(sx + Math.cos(a) * u, sy + Math.sin(a) * u, 0.92 - u * 0.12, true)
      }
      c.pt(sx, sy, 1)
    })
  }

  // ── Cinturón con cartuchos, hebilla y funda repujada ──
  c.with(INK.hueso, () => {
    c.poly([[X(cx - 9.5, 59 - by), 59 - by], [X(cx + 9.5, 59 - by), 59 - by], [X(cx + 9.5, 62 - by), 62 - by], [X(cx - 9.5, 62 - by), 62 - by]], () => 0.3)
    const holX = X(cx + 10, 66), holY = 63
    c.poly([[holX - 2.2, holY], [holX + 2.6, holY], [holX + 1.8, holY + 10], [holX - 1.3, holY + 10]], (x, y) =>
      Math.abs(Math.sin(x * 2.2) * Math.cos(y * 1.4)) > 0.75 ? 0.52 : 0.3)
  })
  c.with(INK.metal, () => {
    for (let x = cx - 8; x <= cx + 8; x += 1.4) if (Math.abs(x - cx) > 2.2) c.pt(X(x, 60), 60 - by, 0.78) // cartuchos
    c.ellipse(X(cx, 60.5 - by), 60.5 - by, 2, 1.5, (nx, ny) => 0.7 + (nx * nx + ny * ny < 0.3 ? 0.3 : 0))
  })
  if (!p.gunOut) {
    const holX = X(cx + 10, 66)
    c.with(INK.hueso, () => c.stroke(holX, 63, holX - 1.8, 58.5, 1.45, (_, d) => 0.86 - d * 0.3)) // cacha de marfil asomando
  }

  // ── Brazos con guantes ── (bajo el poncho si están quietos)
  let hand = [0, 0]
  const drawArms = () => {
    const shoulderR = [X(cx + 8, sh + 3), sh + 3]
    const shoulderL = [X(cx - 8, sh + 3), sh + 3]
    const restHand = [X(cx + 10, 62), 62]
    const aimLen = 17 - p.recoil * 3
    const aimHand = [shoulderR[0] + Math.cos(p.aim) * aimLen, shoulderR[1] + Math.sin(p.aim) * aimLen - p.recoil * 2]
    const k = ease(p.arm)
    hand = [lerp(restHand[0], aimHand[0], k), lerp(restHand[1], aimHand[1], k)]
    const elbow = [lerp(shoulderR[0] + 3, (shoulderR[0] + aimHand[0]) / 2, k), lerp(sh + 14, (shoulderR[1] + aimHand[1]) / 2, k)]
    const lk = ease(p.otherHand)
    const lRest = [X(cx - 10, 61), 61]
    const lUp = p.hatLift > 0 || (p.spin === 0 && p.cylOpen === 0) ? [cx - 6, 17 - by] : [hand[0] - 4, hand[1] + 2]
    const lHand = [lerp(lRest[0], lUp[0], lk), lerp(lRest[1], lUp[1], lk)]
    const lElbow = [lerp(shoulderL[0] - 3, shoulderL[0] - 6, lk), lerp(sh + 14, sh + 4, lk)]
    c.with(INK.hueso, () => {
      const sleeve = (k2: number, d: number) => 0.3 + 0.06 * Math.sin(k2 * 14) - d * 0.08
      c.stroke(shoulderR[0], shoulderR[1], elbow[0], elbow[1], 2.5, sleeve)
      c.stroke(elbow[0], elbow[1], hand[0], hand[1], 2.1, sleeve)
      c.stroke(shoulderL[0], shoulderL[1], lElbow[0], lElbow[1], 2.5, sleeve)
      c.stroke(lElbow[0], lElbow[1], lHand[0], lHand[1], 2.1, sleeve)
      // guantes de cuero con puño
      for (const [hx, hy] of [hand, lHand]) {
        c.ellipse(hx, hy, 2, 1.8, (nx, ny) => 0.5 - ny * 0.12 + (nx > 0.4 ? 0.1 : 0))
      }
    })
  }
  const armsBehind = p.arm < 0.15 && p.otherHand < 0.15
  if (armsBehind) drawArms()

  // ── Poncho rasgado, con parche y textura de telar ──
  const flap = p.wind * 3
  const bot = 66 - by * 0.5
  const hem = (x: number) => bot + Math.sin(x * 1.7) * 0.8 + (hash2(Math.round(x * 2), 3, 41) > 0.82 ? -2.2 : 0) // borde roto
  c.with(INK.hueso, () => {
    c.poly([[cx - 4, sh - 1], [cx + 4, sh - 1], [cx + 19.5 + flap, bot + 1], [cx - 19.5 + flap * 0.4, bot + 1]], (x, y) => {
      if (y > hem(x)) return null
      const rel = (y - sh) / (bot - sh)
      let l = 0.22 + 0.09 * Math.sin((x - cx) * 0.55 + rel * 2) + (x > cx ? 0.05 : -0.02)
      if ((Math.round(x * B) + Math.round(y * B) * 2) % 6 === 0) l += 0.07 // telar en diagonal
      // parche cosido
      if (x > cx - 13 && x < cx - 8 && y > sh + 18 && y < sh + 23) {
        const edge = x < cx - 12.4 || x > cx - 8.6 || y < sh + 18.6 || y > sh + 22.4
        l = edge ? ((Math.round(x * B) + Math.round(y * B)) % 2 ? 0.58 : 0.2) : 0.34
      }
      return l
    })
    // flecos
    for (let x = Math.round(cx - 18 + flap * 0.4); x <= cx + 18 + flap; x += 1.3) {
      const len = 1.5 + hash2(Math.round(x * 3), 1, 91) * 2.5
      for (let u = 0; u < len; u += 0.4) c.pt(x + p.wind * u * 0.6, hem(x) + u + 0.4, 0.38 - u * 0.06)
    }
  })

  // ── Cartuchera cruzada (del hombro izquierdo a la cadera derecha) ──
  if (!p.back) {
    const a0 = [cx - 8, sh + 1], a1 = [cx + 13 + flap * 0.6, bot - 4]
    c.with(INK.hueso, () => c.stroke(a0[0], a0[1], a1[0], a1[1], 2, (_, d) => 0.18 + (d > 0.82 ? 0.22 : 0)))
    c.with(INK.metal, () => {
      for (let u = 0.07; u < 0.95; u += 0.1) {
        const bx = lerp(a0[0], a1[0], u), byy = lerp(a0[1], a1[1], u)
        c.stroke(bx - 0.45, byy - 1.3, bx + 0.45, byy + 1.3, 0.42, (k) => (k < 0.3 ? 1 : 0.66)) // cartucho con punta brillante
      }
    })
  }

  if (!armsBehind) drawArms()

  let muzzle: number[] | null = null
  if (p.gunOut) muzzle = revolver(c, hand[0], hand[1], p.spin ? p.spin : p.aim - p.recoil * 0.5, p.glint, p.cylSpin, p.cylOpen)

  // ── Bufanda larga y deshilachada que flamea ──
  const neckY = sh - 3
  c.with(INK.brasa, () => {
    for (let s = 0; s < 22; s++) {
      const wx = cx - 3 - s * (1 + p.wind * 0.45)
      const wy = neckY + 1 + s * 0.35 + Math.sin(s * 0.6 + p.wind * 3 + p.breathe * 4) * 1.6
      const w = 2.3 - s * 0.07
      c.ellipse(wx, wy, w, w * 0.8, (nx, ny) => (s > 17 && hash2(s, Math.round(ny * 4), 13) > 0.5 ? null : 0.42 - s * 0.01 + (ny < -0.4 ? 0.14 : 0)))
    }
  })

  // ── Cabeza ──
  const hy = 26 - by
  if (p.back) {
    c.with(INK.hueso, () => c.ellipse(cx, hy, 5.8, 6.4, (nx, ny) => 0.28 - ny * 0.1 + 0.05 * Math.sin(nx * 22)))
    // nudo del pañuelo en la nuca
    c.with(INK.brasa, () => c.ellipse(cx, hy + 3, 2, 1.4, () => 0.6))
  } else {
    c.with(INK.hueso, () => {
      c.ellipse(X(cx, hy), hy, 5.8, 6.4, (nx, ny) => {
        let l = 0.4 + nx * 0.14
        if (ny < 0.15) l -= 0.25 * (1 - Math.max(0, ny + 0.6)) // sombra profunda del ala
        return l
      })
      // cejas en ángulo (ceño)
      for (const s of [-1, 1]) for (let u = 0; u <= 1; u += 0.15) c.pt(X(cx + s * (1 + u * 2.8), hy - 3), hy - 3.6 + (1 - u) * 0.9, 0.55)
    })
    // ojos de brasa con destello horizontal
    c.with(INK.brasa, () => {
      for (const s of [-1, 1]) {
        const ex = cx + s * 2.4, ey = hy - 1.2
        if (p.blink) { c.pt(X(ex, ey + 0.4), ey + 0.4, 0.5); continue }
        c.ellipse(X(ex, ey), ey, 1.1, 0.7, () => 0.85 + 0.15 * p.eyes)
        const glare = 2.5 * p.eyes
        for (let u = 1; u < 1 + glare; u += 0.25) c.pt(X(ex + s * u, ey), ey, (1 - (u - 1) / glare) * 0.75 * p.eyes, true)
      }
    })
    // pañuelo rojo sobre nariz y boca: pliegues y dibujo de cachemira
    c.with(INK.brasa, () => {
      c.poly([[cx - 6.3, hy + 1], [cx + 6.3, hy + 1], [cx + 4.3, hy + 6.2], [cx, hy + 9.6], [cx - 4.3, hy + 6.2]], (x, y) => {
        let l = 0.4 + 0.12 * Math.sin((x - cx) * 0.9 - (y - hy) * 1.4) // pliegues
        const px = Math.round(x * B), py = Math.round(y * B)
        if ((px % 4 === 0 && py % 4 === 0) || ((px + 2) % 4 === 0 && (py + 2) % 4 === 0 && hash2(px, py, 2) > 0.4)) l = 0.82
        if (y < hy + 1.6) l = 0.6 // borde doblado
        return l
      })
    })
  }

  // ── Sombrero: ala ancha deshilachada, copa con pliegue, conchas de plata y un balazo ──
  const lift = p.hatLift * 4
  const hatY = hy - 6 - lift
  const tilt = p.hatLift * 0.12
  const ty = (x: number) => (x - cx) * tilt
  const crownH = 11
  const brimRx = 17
  c.with(INK.hueso, () => {
    c.region(cx - 9, hatY - crownH - 3, cx + 9, hatY + 1, (x, y) => {
      const yy = y - ty(x)
      const h = (hatY - yy) / crownH
      if (h < 0 || h > 1) return null
      // copa redondeada arriba (sin escalones)
      const w = (7.4 - h * 1.5) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, h - 0.7) / 0.3, 2)))
      const dx = Math.abs(x - cx)
      if (dx > w) return null
      let l = 0.36 + (x - cx) * 0.028 + (1 - h) * 0.05
      if (dx < 0.7 && h > 0.62) l = 0.24 // pliegue
      if (h > 0.5 && Math.abs(dx - 2.6) < 0.45) l -= 0.08
      if (h < 0.26) l = 0.2 // cinta
      // balazo en la copa: se ve el cielo
      if (Math.hypot(x - (cx + 3.2), yy - (hatY - 7)) < 0.75) return null
      return l
    })
    c.region(cx - brimRx - 1.5, hatY - 5, cx + brimRx + 1.5, hatY + 3, (x, y) => {
      const nx = (x - cx) / brimRx
      const fray = hash2(Math.round(x * B), 0, 23) > 0.8 ? 0.06 : 0
      if (Math.abs(nx) > 1 - fray) return null
      const curl = Math.pow(Math.abs(nx), 3) * 1.6
      const top = hatY - 0.5 - curl + ty(x)
      const bot2 = hatY + 1.7 * Math.sqrt(1 - nx * nx) - curl + ty(x)
      if (y < top || y > bot2) return null
      let l = 0.46 + nx * 0.08
      if (y - top < 0.7) l += 0.25
      if (bot2 - y < 0.55 && Math.round(x * B) % 2 === 0) l = 0.7 // pespunte
      return l
    })
  })
  c.with(INK.metal, () => {
    for (let k = -2; k <= 2; k++) {
      const x = cx + k * 2.7, y = hatY - 1.3 + ty(cx + k * 2.7)
      c.ellipse(x, y, 0.95, 0.85, (nx, ny) => (nx * nx + ny * ny < 0.25 ? 1 : 0.62))
    }
  })

  return { muzzle, hand }
}

/** Luz de borde del atardecer en el lado derecho de la silueta. */
function rimLight(out: Luma, mask: Uint8Array) {
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW - 1; x++) {
      const i = y * PW + x
      if (mask[i] && !mask[i + 1]) out[i] = clamp(out[i] + 0.32)
    }
  }
}

// ─── Cuadro completo ──────────────────────────────────────────────────────────

/** Un cuadro de una pose. `k` = progreso 0..1 de la pose; `t` = tiempo del fondo (viento, buitres). */
export function makePistolero(pose: PistoleroPose, k: number, t = 0): Frame {
  const bg = new Canvas()
  const fig = new Canvas()
  const fx = new Canvas()
  const wind = Math.sin(t * TAU) * 0.6 + Math.sin(t * TAU * 2) * 0.25
  const breathe = (Math.sin(t * TAU) + 1) / 2
  const p: Pose = { ...BASE, wind, breathe }
  let sunset = 0
  let dust = 0

  switch (pose) {
    case 'idle':
      p.arm = 0.04 + 0.04 * Math.max(0, Math.sin(k * TAU * 2))
      p.blink = k > 0.9 && k < 0.95
      p.eyes = 0.75 + 0.25 * Math.sin(k * TAU * 2)
      break
    case 'desenfundar':
      p.gunOut = k > 0.25
      p.arm = ease(clamp((k - 0.1) / 0.8))
      p.aim = lerp(1.2, 0, ease(clamp(k / 0.9)))
      p.glint = k > 0.6 ? (k - 0.6) / 0.4 : -1
      dust = k < 0.5 ? k * 2 : 0
      break
    case 'disparo':
      p.gunOut = true
      p.arm = 1
      p.recoil = k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.15) / 0.5)
      p.eyes = 1
      break
    case 'giro':
      p.gunOut = true
      p.arm = 0.55
      p.aim = 0.3
      p.spin = k * TAU * 3
      break
    case 'tambor':
    case 'recarga':
      p.gunOut = true
      p.arm = 0.45
      p.aim = -0.2
      p.cylOpen = Math.min(1, Math.sin(k * Math.PI) * 2)
      p.otherHand = Math.min(1, Math.sin(k * Math.PI) * 2)
      p.cylSpin = k * 8
      break
    case 'golpe':
      p.lean = -Math.sin(k * Math.PI) * 1.2
      p.eyes = 0.3
      p.blink = k > 0.3 && k < 0.6
      break
    case 'saludo': {
      const up = Math.sin(k * Math.PI)
      p.otherHand = Math.min(1, up * 1.6)
      p.hatLift = Math.max(0, up * 1.4 - 0.4)
      break
    }
    case 'retirada': {
      sunset = clamp((k - 0.2) / 0.8)
      if (k < 0.2) {
        const up = Math.sin((k / 0.2) * Math.PI)
        p.otherHand = up
        p.hatLift = Math.max(0, up - 0.3)
      } else {
        p.back = k > 0.25
        const w = clamp((k - 0.3) / 0.7)
        p.step = w * 40
        fig.s = lerp(1, 0.22, ease(w))
        fig.ox = lerp(0, 24, ease(w))
        fig.oy = lerp(0, -6, ease(w))
      }
      break
    }
  }

  backdrop(bg, t, sunset)
  if (pose === 'idle') tumbleweed(bg, t)

  const { muzzle, hand } = figure(fig, p)

  if (pose === 'disparo' && muzzle && k < 0.4) muzzleFlash(fx, muzzle[0], muzzle[1], k / 0.4, 3)
  if (pose === 'disparo' && k > 0.15) {
    const s = (k - 0.15) / 0.85
    fx.with(INK.polvo, () => {
      for (let i = 0; i < 26; i++) {
        const sx = (muzzle?.[0] ?? 70) + Math.sin(i * 0.7 + s * 5) * 2.6 * s + hash2(i, 1, 3)
        const sy = (muzzle?.[1] ?? 40) - s * 16 - i * 0.5
        fx.pt(sx, sy, 0.5 * (1 - s), true)
      }
    })
  }
  if (pose === 'tambor' || pose === 'recarga') {
    const show = Math.min(1, Math.sin(k * Math.PI) * 2.2)
    if (show > 0.05) {
      const loaded = pose === 'recarga' ? Math.min(6, Math.floor(k * 8)) : 6
      bigCylinder(fx, 63, 21, 12 * show, k * (pose === 'tambor' ? 18 : 3), loaded, pose === 'tambor' ? Math.sin(k * 30) * 0.5 + 0.5 : 0)
      if (pose === 'recarga' && k < 0.8) {
        const bk = (k * 8) % 1
        const bx = lerp(hand[0] - 6, 63, bk), byy = lerp(hand[1] + 4, 21, bk)
        fx.with(INK.brasa, () => fx.stroke(bx - 1, byy, bx + 1, byy, 0.5, () => 1))
      }
    }
  }
  if (dust > 0) {
    fx.with(INK.polvo, () => {
      for (let i = 0; i < 40; i++) {
        const a = hash2(i, 1, 66) * Math.PI
        const r = dust * 13 * hash2(i, 2, 66)
        fx.pt(34 + Math.cos(a) * r * 1.4, 90 - Math.sin(a) * r * 0.4, 0.4 * (1 - dust), true)
      }
    })
  }

  // Composición: fondo, figura (más brillante, con luz de borde) y efectos
  const luma = bg.out
  const ink = bg.ink
  const mask = new Uint8Array(PW * PH)
  for (let i = 0; i < luma.length; i++) if (fig.out[i] > 0) mask[i] = 1
  for (let i = 0; i < luma.length; i++) if (mask[i]) fig.out[i] = clamp(fig.out[i] * 1.3 + 0.04)
  rimLight(fig.out, mask)
  for (let i = 0; i < luma.length; i++) {
    if (mask[i]) { luma[i] = fig.out[i]; ink[i] = fig.ink[i] }
    if (fx.out[i] > 0 && fx.out[i] >= luma[i]) { luma[i] = fx.out[i]; ink[i] = fx.ink[i] }
  }
  return { luma, ink }
}

/** Todos los cuadros de una pose (para precalcular una vez). */
export function makePoseFrames(pose: PistoleroPose): Frame[] {
  const { frames, loop } = POSES[pose]
  return Array.from({ length: frames }, (_, i) => {
    const k = loop ? i / frames : i / (frames - 1)
    return makePistolero(pose, k, loop ? k : i / frames / 4)
  })
}

// ─── Efectos sobre la imagen ─────────────────────────────────────────────────

export function dissolveP(src: Frame, integrity: number): Frame {
  if (integrity >= 1) return src
  const luma = new Float32Array(PW * PH)
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      const key = 0.75 * hash2(x, y, 3) + 0.25 * (y / PH)
      const i = y * PW + x
      luma[i] = key > integrity + 0.12 ? 0 : key > integrity ? src.luma[i] * 0.4 : src.luma[i]
    }
  }
  return { luma, ink: src.ink }
}

export function glitchP(src: Frame, seed: number): Frame {
  const luma = new Float32Array(src.luma)
  const ink = new Uint8Array(src.ink)
  for (let k = 0; k < 4; k++) {
    const y0 = Math.floor(hash2(seed, k, 21) * (PH - 14))
    const h = 3 + Math.floor(hash2(seed, k, 22) * 9)
    const dx = Math.round((hash2(seed, k, 23) - 0.5) * 26)
    for (let y = y0; y < Math.min(PH, y0 + h); y++) {
      for (let x = 0; x < PW; x++) {
        const j = y * PW + (((x - dx) % PW) + PW) % PW
        luma[y * PW + x] = src.luma[j]
        ink[y * PW + x] = k === 0 ? INK.brasa : src.ink[j] // una franja sale roja
      }
    }
  }
  return { luma, ink }
}

// ─── ASCII ────────────────────────────────────────────────────────────────────

export const BINS = [' ', '.`', "'^,", '~=-:', '<;v!', 'zcu1', 'n0XN', 'RBH@', '$@0B']

/** Grilla → filas de texto (un carácter por píxel). Para revisar el arte en la terminal. */
export function toAscii(frame: Frame): string[] {
  const rows: string[] = []
  for (let y = 0; y < PH; y++) {
    let line = ''
    for (let x = 0; x < PW; x++) {
      const l = frame.luma[y * PW + x]
      const set = BINS[Math.min(BINS.length - 1, Math.floor(l * BINS.length))]
      line += set[Math.floor(hash2(x, y, 5) * set.length)]
    }
    rows.push(line)
  }
  return rows
}
