// El Dragón Rojo (jefe 13) dibujado a mano en ASCII.
// Referencia: public/sprites/dragon-rojo.gif — de frente, alas abiertas con
// membranas y nervaduras, cuernos de hueso, ojos amarillos, vientre de fuego
// en placas, patas con garras blancas y la cola que se enrosca a la derecha.
// Unidades de diseño: 100 × 80 · grilla fina 720 × 576 → 180 × 72 caracteres.

import { HandCanvas, TAU, clamp, hash2, rot, smooth, type HandArt, type Pt } from './kit'

const W = 720
const H = 576
const UW = 100

// Tintas
const ESCAMA = 0
const MEMBRANA = 1
const FUEGO = 2
const HUESO = 3
const OJO = 4

export const DRAGON_PALETTE = ['#FF5A3C', '#C9303A', '#FFB841', '#FFF1D6', '#FFE45A'] as const

/** Un ala (lado -1 izquierda, +1 derecha). `flap` = ángulo extra del batido. */
function wing(c: HandCanvas, side: -1 | 1, flap: number) {
  const mx = (p: Pt): Pt => [50 + (p[0] - 50) * side, p[1]]
  const S: Pt = mx([40, 30])
  const a = -flap * side
  const r = (p: Pt) => rot(mx(p), S, a)
  const wrist = r([17, 9])
  const tips = [r([2, 25]), r([7, 39]), r([18, 46]), r([31, 45])]
  const outline: Pt[] = [S, wrist, ...tips]

  // Membrana: el borde entre dedos es cóncavo (festones), más clara cerca de los huesos.
  const bones: [Pt, Pt][] = [[S, wrist], ...tips.map((t) => [wrist, t] as [Pt, Pt])]
  const segDist = (x: number, y: number, a0: Pt, b0: Pt) => {
    const dx = b0[0] - a0[0], dy = b0[1] - a0[1]
    const k = clamp(((x - a0[0]) * dx + (y - a0[1]) * dy) / (dx * dx + dy * dy))
    return Math.hypot(x - (a0[0] + dx * k), y - (a0[1] + dy * k))
  }
  const scallops: [Pt, number][] = []
  for (let i = 0; i < tips.length - 1; i++) {
    const m: Pt = [(tips[i][0] + tips[i + 1][0]) / 2, (tips[i][1] + tips[i + 1][1]) / 2]
    const len = Math.hypot(tips[i + 1][0] - tips[i][0], tips[i + 1][1] - tips[i][1])
    const dir: Pt = [m[0] - wrist[0], m[1] - wrist[1]]
    const dl = Math.hypot(dir[0], dir[1])
    scallops.push([[m[0] + (dir[0] / dl) * len * 0.42, m[1] + (dir[1] / dl) * len * 0.42], len * 0.6])
  }
  c.with(MEMBRANA, () => {
    c.poly(outline, (x, y) => {
      if (scallops.some(([p, rr]) => Math.hypot(x - p[0], y - p[1]) < rr)) return null
      const near = Math.min(...bones.map(([p, q]) => segDist(x, y, p, q)))
      const fromWrist = Math.hypot(x - wrist[0], y - wrist[1]) / 40
      const vein = Math.sin((x + y) * 1.7) * Math.sin((x - y) * 0.9) > 0.55 ? 0.05 : 0
      return 0.16 + 0.26 * Math.exp(-near * 0.35) + 0.08 * (1 - fromWrist) + vein
    })
  })
  // Huesos del ala: brazo grueso y dedos que se afinan, con una garra en la muñeca.
  c.with(ESCAMA, () => {
    c.stroke(S, wrist, 2, (k, d) => (d > 0.82 ? 0.08 : 0.95 - d * d * 0.3 - k * 0.06))
    for (const t of tips) c.stroke(wrist, t, 1.05, (k, d) => (d > 0.8 ? 0.1 : (0.92 - k * 0.25) * (1 - d * 0.3)))
    c.ellipse(wrist[0], wrist[1], 2.2, 2.2, (nx, ny, r) => (r > 0.8 ? 0.08 : 0.95 - (nx + ny) * 0.1))
  })
  c.with(HUESO, () => {
    const claw = rot(mx([14, 5.5]), S, a)
    c.stroke(wrist, claw, 0.7, (k) => 0.95 - k * 0.2)
  })
}

function tail(c: HandCanvas, t: number) {
  const sway = Math.sin(t * TAU) * 1.2
  const p0: Pt = [60, 66], p1: Pt = [76, 74], p2: Pt = [90, 66], p3: Pt = [86 + sway, 50]
  c.with(ESCAMA, () => {
    c.curve(p0, p1, p2, p3, (k) => 4.6 - k * 3, (k, d) => {
      if (d > 0.84) return 0.05
      const stripe = Math.sin(k * 30) > 0.4 && d > 0.2 ? -0.14 : 0
      return 0.7 - d * d * 0.35 + stripe
    })
  })
  // Púas de la punta
  c.with(HUESO, () => {
    const tip: Pt = [86 + sway, 50]
    c.poly([[tip[0] - 2.2, tip[1] + 1], [tip[0] + 0.4, tip[1] - 6], [tip[0] + 2.4, tip[1] + 1]], (x, y) => 0.95 - (y - tip[1] + 6) * 0.04)
  })
}

function legs(c: HandCanvas) {
  for (const side of [-1, 1] as const) {
    const cx = 50 + side * 12.5
    c.with(ESCAMA, () => {
      // Muslo y pata, con la luz que viene de arriba a la izquierda.
      c.ellipse(cx, 63, 8, 10.5, (nx, ny, r) => (r > 0.86 ? 0.05 : 0.52 + 0.3 * (1 - r) - (nx * side * -1 + ny) * 0.1))
      c.ellipse(cx + side * 1.5, 73.5, 6.5, 3.8, (nx, ny, r) => (r > 0.8 ? 0.05 : 0.62 - ny * 0.15))
    })
    // Tres garras blancas por pata
    c.with(HUESO, () => {
      for (let k = -1; k <= 1; k++) {
        const x = cx + side * 1.5 + k * 3
        c.stroke([x, 75.5], [x + k * 0.3, 79.5], 0.75, (kk) => 0.98 - kk * 0.3)
      }
    })
  }
}

function body(c: HandCanvas, t: number) {
  c.with(ESCAMA, () => {
    // Torso: escamas en rombo que se ven por la textura.
    c.ellipse(50, 49, 14, 20, (nx, ny, r) => {
      if (r > 0.9) return 0.05
      const scale = Math.sin(nx * 14 + ny * 9) * Math.sin(nx * 14 - ny * 9) > 0.35 ? 0.1 : 0
      return 0.4 + 0.28 * (1 - r) - (nx * 0.6 + ny * 0.4) * 0.16 + scale
    })
    // Cuello
    c.ellipse(50, 32, 8.5, 7, (nx, ny, r) => (r > 0.88 ? 0.05 : 0.5 + 0.2 * (1 - r) - nx * 0.1))
  })
  // Vientre de fuego en placas: arriba casi blanco, abajo naranja; late con el aliento.
  const glow = 0.06 * Math.sin(t * TAU)
  c.with(FUEGO, () => {
    c.ellipse(50, 50, 9.5, 19.5, (nx, ny, r) => {
      const plate = Math.sin((ny + 1) * 14) > 0.85 ? -0.42 : 0
      return clamp(1 - (ny + 1) * 0.1 - Math.abs(nx) * 0.15 + plate + glow) * (r > 0.92 ? 0.5 : 1)
    })
  })
}

/** Brazos cortos sobre el pecho, con garras blancas. */
function arms(c: HandCanvas) {
  for (const side of [-1, 1] as const) {
    const sh: Pt = [50 + side * 11, 37], el: Pt = [50 + side * 13, 44], hand: Pt = [50 + side * 9.5, 47]
    c.with(ESCAMA, () => {
      c.stroke(sh, el, 2.6, (k, d) => (d > 0.82 ? 0.05 : 0.62 - d * d * 0.3))
      c.stroke(el, hand, 2.2, (k, d) => (d > 0.8 ? 0.05 : 0.66 - d * d * 0.3))
    })
    c.with(HUESO, () => {
      for (let k = -1; k <= 1; k++) c.stroke([hand[0] + k * 1.2, hand[1] + 1.2], [hand[0] + k * 1.4 - side * 0.6, hand[1] + 3.4], 0.55, (kk) => 0.98 - kk * 0.3)
    })
  }
}

function head(c: HandCanvas, blink: boolean, t: number) {
  // Cuernos de hueso, curvos y con anillos.
  c.with(HUESO, () => {
    for (const side of [-1, 1] as const) {
      const b: Pt = [50 + side * 6.5, 14]
      c.curve(b, [50 + side * 10, 10], [50 + side * 12, 6], [50 + side * 15.5, 2.5], (k) => 3.2 - k * 2.4, (k, d) => (Math.sin(k * 24) > 0.55 ? 0.68 : 0.98) - d * 0.18)
    }
    c.stroke([50, 14], [50, 9.5], 0.8, (k) => 0.9 - k * 0.2)
  })
  c.with(MEMBRANA, () => {
    // Golas a los costados de la cabeza.
    for (const side of [-1, 1] as const) {
      c.poly([[50 + side * 8, 17], [50 + side * 15, 15], [50 + side * 12, 23], [50 + side * 8, 24]], (x) => 0.36 + Math.abs(x - 50) * 0.008)
    }
  })
  c.with(ESCAMA, () => {
    // Cráneo y hocico
    c.ellipse(50, 20.5, 11.5, 9.5, (nx, ny, r) => (r > 0.9 ? 0.05 : 0.6 + 0.28 * (1 - r) - (nx * 0.5 + ny * 0.5) * 0.16))
    c.ellipse(50, 27, 7.5, 4.8, (nx, ny, r) => (r > 0.84 ? 0.05 : 0.72 - ny * 0.15))
    // Cejas duras sobre los ojos
    for (const side of [-1, 1] as const) c.stroke([50 + side * 2.4, 16.6], [50 + side * 9, 18.2], 0.9, () => 0.95)
  })
  // Ojos amarillos rasgados (parpadean)
  c.with(OJO, () => {
    for (const side of [-1, 1] as const) {
      if (blink) c.stroke([50 + side * 3.2, 20.6], [50 + side * 8, 20.8], 0.4, () => 0.8)
      else {
        c.ellipse(50 + side * 5.6, 20.5, 2.8, 1.4, (nx) => 1 - Math.abs(nx) * 0.12)
        c.cut(50 + side * 5.6 - 0.4, 19.2, 50 + side * 5.6 + 0.4, 21.8, () => true) // pupila de reptil
      }
    }
  })
  // Narinas y colmillos
  c.cut(45.5, 26.3, 48, 28.2, (x, y) => Math.hypot(x - 46.8, y - 27.2) < 0.95)
  c.cut(52, 26.3, 54.5, 28.2, (x, y) => Math.hypot(x - 53.2, y - 27.2) < 0.95)
  c.with(HUESO, () => {
    for (const side of [-1, 1] as const) c.poly([[50 + side * 3, 30.4], [50 + side * 5, 30.4], [50 + side * 4, 33.4]], () => 0.97)
  })
  // Brasas que suben de las narinas
  c.with(FUEGO, () => {
    for (let k = 0; k < 6; k++) {
      const life = (t + k / 6) % 1
      const x = 50 + (k % 2 ? 3 : -3) + Math.sin(life * TAU + k) * 1.2
      const y = 26 - life * 14
      c.pt(x, y, (1 - life) * 0.8 * smooth(0, 0.15, life), true)
    }
  })
}

function drawDragon(t: number, i: number) {
  const c = new HandCanvas(W, H, UW)
  const flap = Math.sin(t * TAU) * 0.1
  wing(c, -1, flap)
  wing(c, 1, flap)
  tail(c, t)
  legs(c)
  body(c, t)
  arms(c)
  head(c, i === 9, t)
  // Grano de terminal: unos puntos sueltos en la membrana para que respire.
  for (let k = 0; k < c.out.length; k++) if (c.out[k] > 0 && c.ink[k] === MEMBRANA && hash2(k, 3, 13) > 0.97) c.out[k] *= 0.6
  return c.frame()
}

export const DRAGON_ART: HandArt = {
  id: 'dragon-rojo',
  w: W,
  h: H,
  palette: DRAGON_PALETTE,
  frames: 12,
  ms: 2400,
  make: drawDragon,
}
