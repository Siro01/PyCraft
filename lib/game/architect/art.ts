// Arte de El Arquitecto — grillas de luminancia (0..1) generadas por código.
// Una sola imagen fuente por personaje; render.ts la dibuja como ASCII, halftone o braille.
// Píxeles cuadrados: W×H. El renderer ASCII agrupa 2 filas por carácter.

export const W = 64
export const H = 80

export type Luma = Float32Array

export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

function blank(): Luma {
  return new Float32Array(W * H)
}

function put(out: Luma, x: number, y: number, l: number) {
  const xi = Math.round(x)
  const yi = Math.round(y)
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return
  out[yi * W + xi] = l
}

function line(out: Luma, x0: number, y0: number, x1: number, y1: number, l: number) {
  const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    put(out, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, l)
  }
}

function inTri(px: number, py: number, a: number[], b: number[], c: number[]) {
  const d = (p: number[], q: number[]) => (px - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (py - q[1])
  const d1 = d(a, b), d2 = d(b, c), d3 = d(c, a)
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos)
}

// ─── Arquitecto I · figura encapuchada, rostro en sombra, ojos brillantes ─────
export function makeFace(blink = false): Luma {
  const out = blank()
  const cx = 31.5

  // Hombros / túnica
  for (let y = 54; y < H; y++) {
    const half = 9 + (y - 54) * 1.75
    for (let x = 0; x < W; x++) {
      const dx = x - cx
      if (Math.abs(dx) > half) continue
      const fold = 0.5 + 0.5 * Math.sin(dx * 0.6 + Math.sin(y * 0.18) * 1.6)
      let l = 0.2 + 0.26 * fold - (dx / half) * 0.1
      if (half - Math.abs(dx) < 1.6) l += 0.32 // borde iluminado
      out[y * W + x] = clamp(l)
    }
  }

  // Capucha (superelipse)
  const a = 22, b = 30, n = 2.6, hy = 31
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / a
      const ny = (y - hy) / b
      const r = Math.pow(Math.abs(nx), n) + Math.pow(Math.abs(ny), n)
      if (r >= 1) continue
      let l = 0.42 - nx * 0.22 - ny * 0.16 + 0.07 * Math.sin(nx * 14 + ny * 3)
      if (r > 0.84) l += 0.38 * ((r - 0.84) / 0.16) // rim de la capucha
      out[y * W + x] = clamp(l)
    }
  }

  // Abertura del rostro: vacío casi negro con partículas de datos
  const fa = 12.5, fb = 17, fy = 37
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / fa
      const ny = (y - fy) / fb
      const r = nx * nx + ny * ny
      if (r >= 1) continue
      let l = 0.03
      if (r > 0.8 && nx < 0) l += 0.3 * ((r - 0.8) / 0.2) // luz en el borde izquierdo
      if (hash2(x, y, 11) < 0.035) l = 0.32 + 0.3 * hash2(x, y, 12) // bits flotando
      out[y * W + x] = l
    }
  }

  // Ojos: elipses inclinadas con halo
  for (const [ex, ey, ang] of [[26.5, 35.5, 0.32], [36.5, 35.5, -0.32]] as const) {
    const ry = blink ? 0.45 : 1.9
    const cs = Math.cos(ang), sn = Math.sin(ang)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - ex, dy = y - ey
        const u = dx * cs + dy * sn
        const v = -dx * sn + dy * cs
        const r2 = (u / 4.2) ** 2 + (v / ry) ** 2
        const i = y * W + x
        if (r2 < 1) out[i] = 1
        else if (r2 < 3.2) out[i] = Math.max(out[i], 0.5 * (1 - (r2 - 1) / 2.2))
      }
    }
  }

  // Líneas de escaneo
  for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) out[y * W + x] *= 0.75
  return out
}

// ─── Arquitecto real · gato adorable ─────────────────────────────────────────
export function makeCat(blink = false): Luma {
  const out = blank()
  const cx = 31.5

  // Cuerpo
  for (let y = 54; y < H; y++) {
    const half = 8 + (y - 54) * 0.68
    for (let x = 0; x < W; x++) {
      if (Math.abs(x - cx) > half) continue
      out[y * W + x] = 0.95 - 0.03 * Math.sin((x - cx) * 1.4)
    }
  }

  // Orejas
  const earL = [[10, 36], [12, 6], [30, 27]]
  const earR = [[53, 36], [51, 6], [33, 27]]
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (inTri(x, y, earL[0], earL[1], earL[2]) || inTri(x, y, earR[0], earR[1], earR[2])) {
        out[y * W + x] = 0.96
      }
    }
  }

  // Cabeza
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = (x - cx) / 23
      const ny = (y - 42) / 17
      if (nx * nx + ny * ny < 1) out[y * W + x] = 0.97 - ny * 0.05
    }
  }

  // Interior de las orejas
  const inL = [[15, 29], [14, 14], [25, 26]]
  const inR = [[48, 29], [49, 14], [38, 26]]
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (inTri(x, y, inL[0], inL[1], inL[2]) || inTri(x, y, inR[0], inR[1], inR[2])) {
        out[y * W + x] = 0.5
      }
    }
  }

  // Ojos grandes con brillos
  const ry = blink ? 0.9 : 7
  for (const ex of [22.5, 40.5]) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (((x - ex) / 5.6) ** 2 + ((y - 41.5) / ry) ** 2 < 1) out[y * W + x] = 0
      }
    }
    if (!blink) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if ((x - (ex - 1.6)) ** 2 + (y - 38.5) ** 2 < 5) out[y * W + x] = 1
          if ((x - (ex + 2)) ** 2 + (y - 44) ** 2 < 1.6) out[y * W + x] = 0.9
        }
      }
    }
  }

  // Nariz
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (inTri(x, y, [29.5, 48], [33.5, 48], [31.5, 50.6])) out[y * W + x] = 0.22
    }
  }
  // Boquita en 'w'
  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    const yy = 50.6 + Math.sin(t * Math.PI) * 1.8
    put(out, cx - t * 4, yy, 0.22)
    put(out, cx + t * 4, yy, 0.22)
  }
  // Bigotes
  for (const [y0, y1] of [[46, 43], [49, 51], [52, 58]] as const) {
    line(out, 12, y0, 0, y1, 0.9)
    line(out, 51, y0, 63, y1, 0.9)
  }
  return out
}

// ─── Utilidades de composición ────────────────────────────────────────────────

// Transición celda a celda de a → b (t: 0..1), barrido desde el centro hacia afuera.
export function morph(a: Luma, b: Luma, t: number): Luma {
  if (t <= 0) return a
  if (t >= 1) return b
  const out = blank()
  const maxD = Math.hypot(W / 2, H / 2)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const key = 0.65 * hash2(x, y, 7) + 0.35 * (Math.hypot(x - W / 2, y - H / 2) / maxD)
      const i = y * W + x
      out[i] = key <= t ? b[i] : a[i]
    }
  }
  return out
}

// Desintegración: integrity 1 = entero, 0 = desaparecido. Se deshace de arriba hacia abajo.
export function dissolve(src: Luma, integrity: number): Luma {
  if (integrity >= 1) return src
  const out = blank()
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const key = 0.75 * hash2(x, y, 3) + 0.25 * (y / H)
      const i = y * W + x
      if (key > integrity + 0.12) out[i] = 0
      else if (key > integrity) out[i] = src[i] * 0.4
      else out[i] = src[i]
    }
  }
  return out
}

// Glitch: desplaza algunas franjas horizontales.
export function glitch(src: Luma, seed: number): Luma {
  const out = new Float32Array(src)
  for (let k = 0; k < 2; k++) {
    const y0 = Math.floor(hash2(seed, k, 21) * (H - 10))
    const h = 2 + Math.floor(hash2(seed, k, 22) * 6)
    const dx = Math.round((hash2(seed, k, 23) - 0.5) * 16)
    for (let y = y0; y < Math.min(H, y0 + h); y++) {
      for (let x = 0; x < W; x++) {
        out[y * W + x] = src[y * W + (((x - dx) % W) + W) % W]
      }
    }
  }
  return out
}

// ─── Signo de pregunta ASCII (carrusel y CTA de la landing) ───────────────────
// Máscara a mano (# = trazo). Se suaviza y se convierte en caracteres con la misma
// rampa que el Arquitecto, así el icono comparte textura con el jefe.
const QUESTION_MASK = [
  '...######...',
  '..########..',
  '.###....###.',
  '.##......##.',
  '.##......##.',
  '........###.',
  '.......###..',
  '......###...',
  '.....###....',
  '....###.....',
  '....###.....',
  '....###.....',
  '............',
  '............',
  '....###.....',
  '....###.....',
  '....###.....',
  '............',
]

export function makeQuestionLuma(): { luma: Luma; w: number; h: number } {
  const h = QUESTION_MASK.length
  const w = QUESTION_MASK[0].length
  const raw = new Float32Array(w * h)
  QUESTION_MASK.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') raw[y * w + x] = 1 }))
  // Blur 3×3 ligero para que los bordes den caracteres de densidad intermedia
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
        s += raw[yy * w + xx] * (dx === 0 && dy === 0 ? 2 : 1)
        n += dx === 0 && dy === 0 ? 2 : 1
      }
      out[y * w + x] = Math.min(1, (s / n) * 1.5)
    }
  }
  return { luma: out, w, h }
}
