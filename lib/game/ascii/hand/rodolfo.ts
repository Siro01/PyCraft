// Rodolfo, el cerdito guía, dibujado a mano en ASCII.
// Referencia: public/rodolfo/rodolfo.gif — cabeza ancha rosada con orejas
// en punta, anteojos grandes de marco oscuro, hocico, remera azul y una manito
// que saluda abajo a la izquierda.
// Unidades de diseño: 80 × 72 · grilla fina 640 × 576 → 160 × 72 caracteres.

import { HandCanvas, TAU, clamp, type HandArt, type Pt } from './kit'

const W = 640
const H = 576
const UW = 80

const PIEL = 0
const ROSA = 1
const LENTE = 2
const MARCO = 3
const REMERA = 4

export const RODOLFO_PALETTE = ['#FF8C8C', '#FFC6C6', '#D8ECFF', '#C3CCEB', '#5D68F0'] as const

/** Rectángulo redondeado (radio r): distancia normalizada al borde, 0 = centro, 1 = borde. */
function rrect(x: number, y: number, cx: number, cy: number, w: number, h: number, r: number): number | null {
  const qx = Math.abs(x - cx) - (w / 2 - r), qy = Math.abs(y - cy) - (h / 2 - r)
  const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  return d <= 0 ? 1 + d / Math.min(w, h) * 2 : null
}

function shirt(c: HandCanvas) {
  c.with(REMERA, () => {
    c.poly([[20, 55], [60, 55], [64, 72], [16, 72]], (x, y) => {
      const fold = Math.sin(x * 0.9) > 0.85 ? -0.12 : 0
      return 0.5 - (y - 55) * 0.012 - (x - 40) * 0.004 + fold
    })
  })
  // Cuello en V
  c.cut(32, 54, 48, 62, (x, y) => y < 54 + (8 - Math.abs(x - 40)) * 0.9 && y > 53 + (8 - Math.abs(x - 40)) * 0.9 - 1.6)
}

function hand(c: HandCanvas, wave: number) {
  const base: Pt = [12, 63]
  const a = -0.35 + wave * 0.35
  c.with(PIEL, () => {
    c.ellipse(base[0], base[1], 4.4, 3.8, (nx, ny, r) => (r > 0.84 ? 0.05 : 0.7 - (nx + ny) * 0.12))
    for (let k = 0; k < 3; k++) {
      const ang = a - 0.5 + k * 0.45 - Math.PI / 2
      const p0: Pt = [base[0] + Math.cos(ang) * 2.4, base[1] + Math.sin(ang) * 2.4]
      const p1: Pt = [base[0] + Math.cos(ang) * 6.6, base[1] + Math.sin(ang) * 6.6]
      c.stroke(p0, p1, 1.25, (kk, d) => (d > 0.78 ? 0.05 : 0.75 - kk * 0.1))
    }
  })
  c.with(ROSA, () => c.ellipse(base[0] - 1, base[1] - 1, 1.6, 1.2, () => 0.8))
}

function headShape(c: HandCanvas, bob: number) {
  const cy = 30 + bob
  // Orejas chicas en punta, en las esquinas de arriba (como el sprite), con el
  // interior rosa claro. Se dibujan antes para que la cabeza las tape en la base.
  for (const side of [-1, 1] as const) {
    const tip: Pt = [40 + side * 27, 5 + bob], a: Pt = [40 + side * 15, 12 + bob], b: Pt = [40 + side * 33, 17 + bob]
    c.with(PIEL, () => c.poly([tip, a, b], (x, y) => 0.7 - (y - tip[1]) * 0.006))
    c.with(ROSA, () => c.poly([[tip[0] - side * 0.6, tip[1] + 3.6], [a[0] + side * 4, a[1] + 1.4], [b[0] - side * 4, b[1] - 1.6]], () => 0.78))
  }
  // Cabeza ancha, casi rectangular con las esquinas redondas (superelipse).
  c.with(PIEL, () => {
    c.region(40 - 33, cy - 21, 40 + 33, cy + 21, (x, y) => {
      const nx = (x - 40) / 32, ny = (y - cy) / 20
      const r = Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2)
      if (r > 1) return null
      if (r > 0.9) return 0.05
      const light = -(nx * 0.45 + ny * 0.6) * 0.14
      const chin = ny > 0.55 ? -(ny - 0.55) * 0.35 : 0
      return clamp(0.7 + 0.18 * (1 - r) + light + chin)
    })
  })
  // Cachetes
  c.with(ROSA, () => {
    for (const side of [-1, 1] as const) c.ellipse(40 + side * 23, cy + 11, 4.8, 3, (nx, ny, r) => 0.42 + 0.18 * (1 - r))
  })
}

function glasses(c: HandCanvas, bob: number, glint: number, blink: boolean) {
  const cy = 28.5 + bob
  for (const side of [-1, 1] as const) {
    const cx = 40 + side * 14
    // Hueco negro alrededor, marco grueso y claro, y otro hueco antes del cristal.
    c.region(cx - 14, cy - 11, cx + 14, cy + 11, (x, y) => (rrect(x, y, cx, cy, 26, 21, 5) === null ? null : 0))
    c.with(MARCO, () => c.region(cx - 12, cy - 9.5, cx + 12, cy + 9.5, (x, y) => {
      const o = rrect(x, y, cx, cy, 23.4, 18.2, 4.2)
      return o === null ? null : 0.9 - (y - cy) * 0.012
    }))
    c.region(cx - 10.5, cy - 8, cx + 10.5, cy + 8, (x, y) => (rrect(x, y, cx, cy, 19.4, 14.4, 3) === null ? null : 0))
    // Cristal con degradé y un brillo diagonal que lo cruza.
    c.with(LENTE, () => c.region(cx - 10, cy - 7.5, cx + 10, cy + 7.5, (x, y) => {
      const o = rrect(x, y, cx, cy, 17.6, 12.6, 2.4)
      if (o === null) return null
      const band = (x - cx) + (y - cy) * 0.9 + 9 - glint * 18
      const shine = Math.abs(band) < 1.3 ? 0.25 : Math.abs(band - 3.2) < 0.6 ? 0.15 : 0
      return clamp(0.74 - (y - cy) * 0.02 + shine)
    }))
    // Ojitos detrás del cristal (parpadean)
    if (blink) c.cut(cx - 3, cy + 1, cx + 3, cy + 2, () => true)
    else c.cut(cx - 2, cy - 1, cx + 2, cy + 3, (x, y) => Math.hypot((x - cx - side * 0.6) / 1.5, (y - cy - 1) / 1.9) < 1)
  }
  // Puente y patillas
  c.with(MARCO, () => {
    c.stroke([37.5, cy - 2], [42.5, cy - 2], 1.5, () => 0.9)
    for (const side of [-1, 1] as const) c.stroke([40 + side * 26, cy - 3], [40 + side * 30.5, cy - 4], 1.2, () => 0.8)
  })
}

function snout(c: HandCanvas, bob: number) {
  const cy = 43 + bob
  c.with(ROSA, () => c.ellipse(40, cy, 7.5, 5.2, (nx, ny, r) => (r > 0.86 ? 0.06 : 0.66 - ny * 0.14 - nx * 0.06)))
  c.cut(35, cy - 2, 45, cy + 2, (x, y) => Math.hypot((x - 37.4) / 1.2, (y - cy) / 1.7) < 1 || Math.hypot((x - 42.6) / 1.2, (y - cy) / 1.7) < 1)
  // Sonrisa
  for (let k = 0; k <= 1; k += 0.04) {
    const x = 33 + k * 14, y = cy + 6.6 + Math.sin(k * Math.PI) * 2.2
    c.cut(x - 0.5, y - 0.45, x + 0.5, y + 0.45, () => true)
  }
}

function drawRodolfo(t: number, i: number) {
  const c = new HandCanvas(W, H, UW)
  const bob = Math.sin(t * TAU) * 0.5
  shirt(c)
  headShape(c, bob)
  glasses(c, bob, (t * 1.6) % 1.6, i === 8)
  snout(c, bob)
  hand(c, Math.sin(t * TAU * 2))
  return c.frame()
}

export const RODOLFO_ART: HandArt = {
  id: 'rodolfo',
  w: W,
  h: H,
  palette: RODOLFO_PALETTE,
  frames: 12,
  ms: 2400,
  make: drawRodolfo,
}
