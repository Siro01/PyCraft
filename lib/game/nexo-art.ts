// El Nexo (jefe 11, Python + sqlite3) — calamar ASCII.
//
// Mismo motor que El Arquitecto (lib/game/architect/render.ts): una grilla de
// luminancia W×H que se dibuja con caracteres según su densidad, como la
// referencia del docente (un calamar hecho de $, S, J, i…). Acá cada cuadro se
// genera por código: los tentáculos ondulan, los ojos parpadean y por los
// tentáculos viajan pulsos de datos — el Nexo conecta los dos mundos,
// cursor.execute es el puente.

import { W, H, hash2, type Luma } from './architect/art'

export type NexoId = 'puente' | 'dos-mundos' | 'red'

export const NEXO_VARIANTS: { id: NexoId; name: string; note: string }[] = [
  {
    id: 'puente',
    name: 'Guardián del Puente',
    note: 'El calamar abrazado al puente que une la tierra de Python con el mar de SQL (como en el mapa del Acto III). Los tentáculos cuelgan de la baranda y se enroscan en espiral.',
  },
  {
    id: 'dos-mundos',
    name: 'Dos Mundos',
    note: 'Con un tentáculo sostiene una serpiente (Python) y con otro un cilindro de base de datos (SQL). Un pulso de datos viaja de uno al otro atravesando al calamar: cursor.execute.',
  },
  {
    id: 'red',
    name: 'La Red',
    note: 'Sus tentáculos se abren como una red y cada punta toca una tablita. Los datos suben por los tentáculos hasta la cabeza y la tabla que responde se enciende.',
  },
]

/** La variante que se ve en el juego. Cambiar acá para elegir otra. */
export const ACTIVE_NEXO: NexoId = 'red'

/** El Nexo usa los tamaños grandes del Arquitecto (es el jefe ASCII anterior a él). */
export const NEXO_PX = { sm: 64, md: 120, lg: 220 } as const

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const TAU = Math.PI * 2

function blank(): Luma { return new Float32Array(W * H) }

/** Pinta tomando el máximo (las formas se suman sin borrarse entre sí). */
function lift(out: Luma, x: number, y: number, l: number) {
  const xi = Math.round(x), yi = Math.round(y)
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return
  const i = yi * W + xi
  if (l > out[i]) out[i] = l
}

/** Pinta encima (para agujeros oscuros: ojos, ventosas, huecos). */
function set(out: Luma, x: number, y: number, l: number) {
  const xi = Math.round(x), yi = Math.round(y)
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return
  out[yi * W + xi] = l
}

/** Disco con volumen: luz arriba a la izquierda, borde más oscuro. */
function disc(out: Luma, cx: number, cy: number, r: number, base = 0.78) {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const d = Math.hypot(x - cx, y - cy)
      if (d > r) continue
      const light = ((cx - x) + (cy - y)) / (2 * r + 0.01)
      const rim = d / r
      lift(out, x, y, clamp(base + light * 0.22 - rim * rim * 0.3))
    }
  }
}

// ── Manto (la cabeza del calamar) ────────────────────────────────────────────
function mantle(out: Luma, cx: number, top: number, w: number, h: number, sway: number) {
  for (let y = top; y < top + h; y++) {
    const k = (y - top) / h                       // 0 arriba, 1 abajo
    // cúpula redonda arriba, lo más ancho al 55 %, y se angosta hacia el cuello
    const half = k < 0.55 ? w * Math.sqrt(Math.max(0, 1 - ((0.55 - k) / 0.55) ** 2)) : w * (1 - ((k - 0.55) / 0.45) * 0.42)
    const c = cx + sway * (1 - k)                 // la punta del manto se mece
    for (let x = Math.floor(c - half); x <= c + half; x++) {
      const dx = (x - c) / (half + 0.01)
      // líneas de contorno curvas, como las "S" de la referencia
      const band = 0.5 + 0.5 * Math.sin(dx * 3.2 + k * 9 + sway * 0.3)
      let l = 0.52 + 0.18 * band - dx * 0.1 - k * 0.08
      if (1 - Math.abs(dx) < 0.12) l += 0.3       // borde iluminado
      lift(out, x, y, clamp(l))
    }
  }
}

/** Ojo de calamar: aro brillante, fondo oscuro, pupila horizontal y un brillo. */
function eye(out: Luma, cx: number, cy: number, r: number, blink: number, dead = false) {
  for (let y = Math.floor(cy - r - 3); y <= cy + r + 3; y++) {
    for (let x = Math.floor(cx - r - 3); x <= cx + r + 3; x++) {
      const d = Math.hypot((x - cx) * 0.9, y - cy)
      if (d > r + 2.6) continue
      if (d > r + 0.6) { set(out, x, y, d > r + 1.8 ? 0.3 : 0.1); continue }   // cuenca oscura: separa el ojo de la piel
      if (d > r - 1.2) { set(out, x, y, 0.98); continue }     // aro brillante
      set(out, x, y, 0)
    }
  }
  if (dead) {
    for (let k = -r + 1; k <= r - 1; k++) { set(out, cx + k, cy + k * 0.6, 0.9); set(out, cx + k, cy - k * 0.6, 0.9) }
    return
  }
  // párpado: la mitad de arriba se llena de piel
  if (blink > 0) {
    for (let y = Math.floor(cy - r); y <= cy - r + blink * (2 * r); y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (Math.hypot((x - cx) * 0.9, y - cy) <= r) set(out, x, y, 0.62)
      }
    }
    if (blink >= 1) return
  }
  for (let x = Math.floor(cx - r * 0.6); x <= cx + r * 0.6; x++) { set(out, x, cy, 0.86); set(out, x, cy + 1, 0.86) }   // pupila horizontal
  set(out, cx + r * 0.4, cy - r * 0.45, 1); set(out, cx + r * 0.4 + 1, cy - r * 0.45, 1)
}

// ── Tentáculos ───────────────────────────────────────────────────────────────
type P = [number, number]

function bezier(p: P[], t: number): P {
  let pts = p
  while (pts.length > 1) {
    const next: P[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      next.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t])
    }
    pts = next
  }
  return pts[0]
}

interface TentacleOpts {
  r0?: number          // grosor en la base
  r1?: number          // grosor en la punta
  curl?: number        // vueltas de espiral en la punta (0 = sin espiral; signo = sentido)
  curlR?: number
  pulse?: number       // 0..1: posición de un pulso de datos que viaja por el tentáculo (-1 = sin pulso)
  suckers?: boolean
}

/** Tentáculo: curva de Bézier que termina (opcional) en una espiral, con ventosas
 *  oscuras de un lado y, si hay datos viajando, un pulso brillante. */
function tentacle(out: Luma, ctrl: P[], o: TentacleOpts = {}) {
  const { r0 = 3.4, r1 = 1, curl = 0, curlR = 4, pulse = -1, suckers = true } = o
  const steps = 70
  const path: P[] = []
  for (let i = 0; i <= steps; i++) path.push(bezier(ctrl, i / steps))
  if (curl) {
    const [ex, ey] = path[path.length - 1]
    const [px, py] = path[path.length - 4]
    let a = Math.atan2(ey - py, ex - px)
    const n = Math.round(Math.abs(curl) * 26)
    let x = ex, y = ey
    for (let i = 1; i <= n; i++) {
      const k = i / n
      a += (Math.sign(curl) * TAU * Math.abs(curl)) / n
      const step = curlR * (1 - k) * 0.24 + 0.15
      x += Math.cos(a) * step; y += Math.sin(a) * step
      path.push([x, y])
    }
  }
  const total = path.length - 1
  path.forEach(([x, y], i) => {
    const k = i / total
    const r = r0 + (r1 - r0) * Math.min(1, k * 1.15)
    disc(out, x, y, Math.max(0.6, r), 0.7 - k * 0.12)
  })
  if (suckers) {
    for (let i = 6; i < total - 4; i += 5) {
      const [x, y] = path[i]
      const [nx, ny] = path[i + 1]
      const a = Math.atan2(ny - y, nx - x) + Math.PI / 2
      const r = r0 + (r1 - r0) * Math.min(1, (i / total) * 1.15)
      set(out, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, 0.12)
    }
  }
  if (pulse >= 0) {
    const i = Math.round(pulse * (total - 1))
    for (let j = -3; j <= 3; j++) {
      const p = path[Math.min(total, Math.max(0, i + j))]
      disc(out, p[0], p[1], 1.6 - Math.abs(j) * 0.3, 1)
    }
  }
}

// ── Objetos ──────────────────────────────────────────────────────────────────
/** Puente de arco con tablones y baranda. */
function bridge(out: Luma, y0: number) {
  for (let x = 0; x < W; x++) {
    const arch = Math.round(Math.sin((x / (W - 1)) * Math.PI) * 4)
    const yy = y0 - arch
    for (let y = yy; y < yy + 4; y++) lift(out, x, y, x % 4 === 0 ? 0.35 : 0.84 - (y - yy) * 0.08)   // tablones
    if (x % 6 === 0) for (let y = yy - 6; y < yy; y++) lift(out, x, y, 0.7)                           // postes
    lift(out, x, yy - 6, 0.9)                                                                          // baranda
    for (let y = yy + 4; y < yy + 7; y++) if (x % 16 < 2) lift(out, x, y, 0.5)                         // pilares
  }
}

/** Serpiente de Python enroscada (con su ojito). */
function snake(out: Luma, cx: number, cy: number, f: number) {
  for (let i = 0; i < 60; i++) {
    const k = i / 59
    const a = k * TAU * 1.6 + f * 0.6
    const r = 6 - k * 3.6
    disc(out, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75 - k * 5, 1.6 - k * 0.4, 0.8)
  }
  const a = TAU * 1.6 + f * 0.6
  const hx = cx + Math.cos(a) * 2.4, hy = cy + Math.sin(a) * 1.8 - 5
  disc(out, hx, hy - 1.5, 2.3, 0.86)
  set(out, hx + 0.8, hy - 2, 0.05)
  if (Math.sin(f * 2.7) > 0.3) { set(out, hx + 2.6, hy - 1, 0.95); set(out, hx + 3.4, hy - 1.4, 0.95) }   // lengüita
}

/** Cilindro de base de datos (tres discos apilados, con brillo). */
function database(out: Luma, cx: number, top: number, glow: number) {
  const rx = 6, ry = 2, h = 11
  for (let y = top; y <= top + h; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx
      lift(out, x, y, clamp(0.62 - dx * 0.18 + glow * 0.2))
    }
  }
  for (const yy of [top, top + 4, top + 8, top + h]) {
    for (let t = 0; t < TAU; t += 0.08) {
      const x = cx + Math.cos(t) * rx, y = yy + Math.sin(t) * ry
      if (yy === top || Math.sin(t) > 0) set(out, x, y, yy === top ? 0.98 : 0.3)
    }
  }
}

/** Tablita de datos (2 columnas × 2 filas) para la punta de un tentáculo.
 *  Desconectada: apagada y cruzada por una X. */
function miniTable(out: Luma, cx: number, cy: number, lit: boolean, cut = false) {
  const w = 9, h = 7
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || x === 4 || y === 3
      const l = cut ? (edge ? 0.34 : 0.04) : edge ? (lit ? 1 : 0.72) : (lit ? 0.55 : 0.08)
      set(out, cx - 4 + x, cy - 3 + y, l)
    }
  }
  if (cut) for (let k = 0; k < 7; k++) { set(out, cx - 3 + k, cy - 3 + k, 0.9); set(out, cx + 3 - k, cy - 3 + k, 0.9) }
}

// ── Las tres propuestas ──────────────────────────────────────────────────────
export interface NexoFrame {
  t: number
  blink: number
  dead: boolean
  /** La Red: cuántas tablas siguen conectadas (0..5). Cada golpe le corta una. */
  links?: number
}

/** Orden en que se cortan las conexiones: primero las de afuera. */
const CUT_ORDER = [0, 4, 1, 3, 2]

function head(out: Luma, cx: number, top: number, s: NexoFrame, sway: number) {
  mantle(out, cx, top, 16, 31, sway)
  const ey = top + 20
  eye(out, cx - 7.5, ey, 5, s.blink, s.dead)
  eye(out, cx + 7.5, ey, 5, s.blink, s.dead)
}

function puente(s: NexoFrame): Luma {
  const out = blank()
  const w = (k: number, ph = 0) => (s.dead ? 0 : Math.sin(TAU * s.t + ph) * k)
  const drop = s.dead ? 6 : 0
  bridge(out, 58)
  const cx = 32, top = 4 + drop
  // tentáculos de atrás (detrás del puente se ven por debajo)
  tentacle(out, [[24, 30 + drop], [18, 46], [12, 64], [6 + w(2), 74]], { curl: s.dead ? 0 : -0.9, curlR: 5 })
  tentacle(out, [[40, 30 + drop], [46, 46], [52, 64], [58 - w(2), 74]], { curl: s.dead ? 0 : 0.9, curlR: 5 })
  head(out, cx, top, s, w(1.5, 1))
  // tentáculos de adelante, colgados de la baranda
  tentacle(out, [[27, 33 + drop], [24, 44], [20, 52], [17 + w(1.5, 2), 62]], { curl: s.dead ? 0 : -1.1, curlR: 4.5 })
  tentacle(out, [[37, 33 + drop], [40, 44], [44, 52], [47 - w(1.5, 2), 62]], { curl: s.dead ? 0 : 1.1, curlR: 4.5 })
  tentacle(out, [[30, 34 + drop], [30, 48], [27, 62], [26 + w(2, 3), 76]], { r0: 3, curl: s.dead ? 0 : 0.8, curlR: 3.5 })
  tentacle(out, [[34, 34 + drop], [34, 48], [37, 62], [38 - w(2, 3), 76]], { r0: 3, curl: s.dead ? 0 : -0.8, curlR: 3.5 })
  return out
}

function dosMundos(s: NexoFrame): Luma {
  const out = blank()
  const w = (k: number, ph = 0) => (s.dead ? 0 : Math.sin(TAU * s.t + ph) * k)
  const drop = s.dead ? 7 : 0
  const cx = 32, top = 2 + drop
  // el pulso va de la serpiente (izquierda) al cilindro (derecha) pasando por el cuerpo
  const p = s.dead ? -1 : (s.t * 2) % 1
  const left = p >= 0 && p < 0.5 ? 1 - p * 2 : -1
  const right = p >= 0.5 ? (p - 0.5) * 2 : -1
  snake(out, 9, 52 + drop + (s.dead ? 8 : 0), s.dead ? 0 : TAU * s.t)
  database(out, 55, 44 + drop + (s.dead ? 10 : 0), right > 0.85 ? 1 : 0)
  head(out, cx, top, s, w(1.2, 0.5))
  tentacle(out, [[25, 31 + drop], [16, 36 + w(1)], [12, 40], [10, 45 + drop]], { r0: 3.4, r1: 1.6, pulse: left, curl: 0 })
  tentacle(out, [[39, 31 + drop], [48, 36 - w(1)], [53, 38], [54, 43 + drop]], { r0: 3.4, r1: 1.6, pulse: right, curl: 0 })
  tentacle(out, [[28, 33 + drop], [24, 50], [20, 62], [16 + w(2, 1), 72]], { r0: 3, curl: s.dead ? 0 : -1, curlR: 4 })
  tentacle(out, [[36, 33 + drop], [40, 50], [44, 62], [48 - w(2, 1), 72]], { r0: 3, curl: s.dead ? 0 : 1, curlR: 4 })
  tentacle(out, [[31, 34 + drop], [30, 52], [31, 66], [30 + w(2, 2), 78]], { r0: 2.8, curl: s.dead ? 0 : 0.7, curlR: 3 })
  tentacle(out, [[33, 34 + drop], [35, 52], [35, 64], [37 - w(2, 2), 74]], { r0: 2.8, curl: s.dead ? 0 : -0.7, curlR: 3 })
  return out
}

const RED_TIPS: P[] = [[6, 50], [14, 68], [32, 76], [50, 68], [58, 50]]

function red(s: NexoFrame): Luma {
  const out = blank()
  const w = (k: number, ph = 0) => (s.dead ? 0 : Math.sin(TAU * s.t + ph) * k)
  const drop = s.dead ? 6 : 0
  const cx = 32, top = 3 + drop
  const links = s.dead ? 0 : (s.links ?? RED_TIPS.length)
  const cut = new Set(CUT_ORDER.slice(0, RED_TIPS.length - links))
  const alive = RED_TIPS.map((_, i) => i).filter((i) => !cut.has(i))
  // el pulso recorre solo las tablas que siguen conectadas, una por vez
  const slot = Math.floor(s.t * RED_TIPS.length * 2)
  const active = alive.length ? alive[slot % alive.length] : -1
  const phase = (s.t * RED_TIPS.length * 2) % 1
  RED_TIPS.forEach(([tx, ty], i) => {
    const off = cut.has(i)
    const bx = cx + (i - 2) * 3.2
    const by = 32 + drop
    // desconectado: el tentáculo cae flojo y se enrosca, sin tocar la tabla
    const ex = tx + (off ? (i < 2 ? 3 : i > 2 ? -3 : 0) : w(1.2, i))
    const ey = ty + (s.dead ? 4 : 0)
    const tip = off ? ey - 9 : ey - 4
    tentacle(out, [[bx, by], [bx + (ex - bx) * 0.3, by + 14], [ex + (bx - ex) * 0.15, tip - 6], [ex, tip]], {
      r0: 3, r1: 1.3, curl: off && !s.dead ? (i < 2 ? 0.8 : -0.8) : 0, curlR: 3,
      pulse: i === active ? 1 - phase : -1,   // el dato sube de la tabla a la cabeza
    })
    miniTable(out, ex + (off ? (i < 2 ? -3 : i > 2 ? 3 : 0) : 0), ey, i === active && phase < 0.35, off)
  })
  head(out, cx, top, s, w(1.3, 0.7))
  return out
}

const MAKERS: Record<NexoId, (s: NexoFrame) => Luma> = { puente, 'dos-mundos': dosMundos, red }

/** Cuadro del Nexo. `t` 0..1 en bucle; `blink` 0..1 (párpado); `dead` = derrotado. */
export const NEXO_LINKS = RED_TIPS.length

export function makeNexo(id: NexoId, s: NexoFrame): Luma {
  return MAKERS[id](s)
}

/** Parpadeo: cada tanto los dos ojos se cierran un instante. */
export function nexoBlink(tick: number): number {
  const k = tick % 40
  return k === 0 ? 0.5 : k === 1 ? 1 : k === 2 ? 0.5 : 0
}

export { hash2 }
