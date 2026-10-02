// Mercader del Abismo — rediseño (ronda 4).
//
// Figura encapuchada alta: un vacío negro que baja desde la capucha hasta el
// piso, tres ojos-estrella que titilan, garras ocre aferradas al manto, una
// manga con pliegue en espiral, una mochila redonda a la espalda y un farol.
// Dibujado por código, píxel a píxel, en una grilla de 56×64 (sin imágenes
// generadas ni calcadas) — mismo principio que el resto de los sprites.
//
// A diferencia de los sprites de tokens (PixelBitmap), este usa una paleta
// propia con rampas de luz/sombra: el Mercader vive en la tienda, que ya
// tiene su paleta fija del Abismo, y las sombras necesitan más de 6 tonos.

export const MV2_W = 56
export const MV2_H = 64

export type MercaderV2Id = 'fiel' | 'abismo' | 'penumbra' | 'viajero' | 'ambulante'

/** Un carácter = un rol de color; cada variante resuelve los roles a su paleta. */
export type MV2Palette = Record<string, string>

const BASE: MV2Palette = {
  K: '#111216', // contorno
  V: '#040406', // el vacío
  E: '#1b2226', // manto: sombra profunda
  D: '#26323a', // manto: sombra
  C: '#34444a', // manto: base
  B: '#4a5c5b', // manto: luz
  A: '#64786d', // manto: borde iluminado
  S: '#2a2950', // mochila: base
  T: '#1c1b37', // mochila: sombra
  U: '#3b3a6c', // mochila: luz
  R: '#545392', // mochila: borde iluminado
  Y: '#c4ae60', // garra
  Z: '#7c6a37', // garra: sombra
  W: '#ffffff', // estrella
  w: '#a9b3d8', // destello de estrella
  M: '#3a3d48', // metal
  m: '#6c707e', // metal: luz
  X: '#0b0d10', // sombra en el piso
  // luz del farol (cálida por defecto)
  F: '#fff3c0', // llama: núcleo
  G: '#ffc544', // llama
  g: '#e0862c', // llama: borde
  c: '#4f5948', // manto base iluminado
  b: '#6c785a', // manto luz iluminado
  e: '#33403d', // manto sombra iluminado
  s: '#3f3a4e', // mochila iluminada
}

const PALETTES: Record<MercaderV2Id, MV2Palette> = {
  // Lo más cercano a la referencia: manto verde-gris, mochila índigo, farol cálido.
  fiel: BASE,
  // Farol con la luz cian de la tienda del Abismo.
  abismo: {
    ...BASE,
    F: '#e6fcff', G: '#4fe0f5', g: '#1b8fb0',
    c: '#36555c', b: '#4a7a80', e: '#24383f', s: '#2f3e66',
  },
  // Más oscuro: el manto casi se pierde en el fondo, solo el farol lo dibuja.
  penumbra: {
    ...BASE,
    E: '#121719', D: '#1a2328', C: '#232e33', B: '#334140', A: '#4a5a51',
    S: '#1e1d3b', T: '#141328', U: '#2b2a52', R: '#3e3d70',
    c: '#4a5340', b: '#6e7650', e: '#2b3530',
  },
  // Viajero: misma paleta, otra silueta (farol en un bastón, mochila con parche).
  viajero: BASE,
  // El Mercader Ambulante, su hermano: los mismos colores INTERCAMBIADOS (manto
  // índigo como la mochila del Abismo, mochila verde-gris como su manto) y
  // farol cálido contra el cian del hermano.
  ambulante: {
    ...BASE,
    E: '#15142b', D: '#1f1e3d', C: '#2a2950', B: '#3b3a6c', A: '#545392',
    S: '#34444a', T: '#26323a', U: '#4a5c5b', R: '#64786d',
    c: '#4a3f58', b: '#6b5a6c', e: '#2f2a42', s: '#4f5948',
  },
}

export interface MercaderV2Meta {
  id: MercaderV2Id
  name: string
  note: string
}

export const MERCADER_V2_VARIANTS: MercaderV2Meta[] = [
  { id: 'fiel', name: 'Fiel', note: 'La composición de la referencia, con farol cálido colgando de la mano izquierda.' },
  { id: 'abismo', name: 'Abismo', note: 'Igual, pero el farol tiene la luz cian de la tienda: tiñe el manto de azul.' },
  { id: 'penumbra', name: 'Penumbra', note: 'Manto más oscuro: casi se funde con el fondo y el farol lo recorta. El más inquietante.' },
  { id: 'ambulante', name: 'Ambulante (hermano)', note: 'El Mercader Ambulante: bajo y redondo, un solo ojo que guiña, colores del hermano intercambiados y farol cálido.' },
  { id: 'viajero', name: 'Viajero', note: 'El farol cuelga de un bastón alto y la mochila tiene un parche cosido. Más "mercader ambulante".' },
]

// ── Grilla ────────────────────────────────────────────────────────────────────
type Grid = string[][]
const blank = (): Grid => Array.from({ length: MV2_H }, () => Array(MV2_W).fill('.'))
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < MV2_W && y < MV2_H
function set(g: Grid, x: number, y: number, ch: string) {
  if (inside(x, y)) g[y][x] = ch
}
function get(g: Grid, x: number, y: number) {
  return inside(x, y) ? g[y][x] : '.'
}
function hash(x: number, y: number, s = 0) {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453
  return v - Math.floor(v)
}

/** Contornea con K todo píxel vacío vecino de la máscara dada. */
function outlineMask(g: Grid, mask: boolean[][]) {
  for (let y = 0; y < MV2_H; y++)
    for (let x = 0; x < MV2_W; x++) {
      if (!mask[y][x]) continue
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (inside(nx, ny) && !mask[ny][nx] && g[ny][nx] === '.') g[ny][nx] = 'K'
      }
    }
}
const emptyMask = () => Array.from({ length: MV2_H }, () => Array(MV2_W).fill(false))

// ── Silueta del manto ────────────────────────────────────────────────────────
// Las medidas de la figura viven en un "Shape": el Abismo es alto, flaco y con
// la capucha inclinada; su hermano el Ambulante es bajo, redondo y derecho.
interface Shape {
  cx: number
  tipY: number
  tipX: number
  /** Fila donde termina la capucha. */
  hoodEnd: number
  hoodHw: number
  /** Curvatura de la capucha (más chico = más redonda). */
  hoodPow: number
  shoulderEnd: number
  bodyHw: number
  bodyGrow: number
  floorY: number
  hood: { cx: number; cy: number; rx: number; ry: number }
  voidTop: number
  voidHw: [number, number]
}

const ABISMO_SHAPE: Shape = {
  cx: 26, tipY: 3, tipX: 22, hoodEnd: 17, hoodHw: 10, hoodPow: 0.8, shoulderEnd: 24,
  bodyHw: 15.2, bodyGrow: 3.6, floorY: 61,
  hood: { cx: 25.2, cy: 13.5, rx: 4.6, ry: 7.4 }, voidTop: 19, voidHw: [2.4, 2.6],
}

const AMBULANTE_SHAPE: Shape = {
  cx: 26, tipY: 15, tipX: 26, hoodEnd: 27, hoodHw: 11.5, hoodPow: 0.55, shoulderEnd: 32,
  bodyHw: 16, bodyGrow: 4.4, floorY: 61,
  hood: { cx: 26, cy: 22.5, rx: 5.2, ry: 5.6 }, voidTop: 27, voidHw: [2.2, 2.0],
}

let S: Shape = ABISMO_SHAPE

/** Centro y medio-ancho del manto en la fila y (null = fuera del manto). */
function cloakRow(y: number): { cx: number; hw: number } | null {
  if (y < S.tipY || y > S.floorY) return null
  if (y <= S.hoodEnd) {
    const t = (y - S.tipY) / (S.hoodEnd - S.tipY)
    return { cx: S.tipX + t * (S.cx - S.tipX), hw: 0.6 + Math.pow(t, S.hoodPow) * S.hoodHw }
  }
  const shoulderTop = S.hoodHw + 0.6
  if (y <= S.shoulderEnd) return { cx: S.cx, hw: shoulderTop + (y - S.hoodEnd) * 0.65 }
  const t = (y - S.shoulderEnd) / (S.floorY - S.shoulderEnd)
  return { cx: S.cx, hw: S.bodyHw + t * S.bodyGrow + (y > S.floorY - 6 ? (y - (S.floorY - 6)) * 0.45 : 0) }
}

function inCloak(x: number, y: number): boolean {
  const r = cloakRow(y)
  if (!r) return false
  if (Math.abs(x + 0.5 - r.cx) > r.hw) return false
  // Ruedo deshilachado: algunas columnas terminan antes.
  if (y >= S.floorY - 1 && hash(x, 0) < 0.35) return false
  return true
}

// La abertura de la capucha (elipse) y el vacío que baja hasta el piso.
function inVoid(x: number, y: number): boolean {
  const H = S.hood
  const px = x + 0.5, py = y + 0.5
  const e = ((px - H.cx) / H.rx) ** 2 + ((py - H.cy) / H.ry) ** 2
  if (e <= 1) return true
  if (y >= S.voidTop && y <= S.floorY) {
    const t = (y - S.voidTop) / (S.floorY - S.voidTop)
    const hw = S.voidHw[0] + t * S.voidHw[1]
    const cx = S.cx - 0.2 + Math.sin(y / 9) * 0.6
    return Math.abs(px - cx) <= hw
  }
  return false
}
function hoodRimDist(x: number, y: number): number {
  const H = S.hood
  const px = x + 0.5, py = y + 0.5
  return Math.sqrt(((px - H.cx) / H.rx) ** 2 + ((py - H.cy) / H.ry) ** 2)
}

// ── Capas ────────────────────────────────────────────────────────────────────
interface Opts {
  id: MercaderV2Id
  frame: number
}

function drawSack(g: Grid, o: Opts) {
  const big = o.id === 'viajero'
  const amb = o.id === 'ambulante'
  const s = amb
    ? { cx: 39.5, cy: 31, rx: 11.5, ry: 10.5 }
    : { cx: big ? 40.5 : 39.5, cy: big ? 22 : 23, rx: big ? 13 : 11.5, ry: big ? 12.5 : 11 }
  const mask = emptyMask()
  for (let y = 0; y < MV2_H; y++)
    for (let x = 0; x < MV2_W; x++) {
      const nx = (x + 0.5 - s.cx) / s.rx, ny = (y + 0.5 - s.cy) / s.ry
      const d = nx * nx + ny * ny
      // un poco caída abajo, como una bolsa cargada
      if (d > 1 + (ny > 0.4 ? 0.12 : 0)) continue
      mask[y][x] = true
      const light = nx + ny // < 0: arriba-izquierda (luz)
      let ch = 'S'
      if (light < -0.95) ch = 'R'
      else if (light < -0.45) ch = 'U'
      else if (light > 0.7) ch = 'T'
      // Pliegues en arco (anillos parciales del lado de la sombra)
      const r = Math.sqrt(d)
      if (light > -0.2 && (Math.abs(r - 0.48) < 0.06 || Math.abs(r - 0.76) < 0.05)) ch = 'T'
      if (light > -0.2 && (Math.abs(r - 0.42) < 0.05 || Math.abs(r - 0.7) < 0.04)) ch = light > 0.6 ? 'S' : 'U'
      g[y][x] = ch
    }
  // Atadura arriba (donde la cuerda junta la tela)
  for (let i = -2; i <= 2; i++) if (mask[Math.round(s.cy - s.ry + 1)]?.[Math.round(s.cx) + i]) set(g, Math.round(s.cx) + i, Math.round(s.cy - s.ry + 1), 'T')
  if (big) {
    // Parche cosido
    const px = Math.round(s.cx + 3), py = Math.round(s.cy + 2)
    for (let y = py; y < py + 4; y++) for (let x = px; x < px + 5; x++) set(g, x, y, 'M')
    for (let x = px; x < px + 5; x += 2) { set(g, x, py - 1, 'm'); set(g, x, py + 4, 'm') }
  }
  outlineMask(g, mask)
  if (amb) {
    // Amuletos colgando de la mochila (él es el que los regala): un hilo y una cuenta que se mece.
    const sw = [0, 1, 0, -1][Math.floor(o.frame / 2) % 4]
    for (const [ax, len, gem] of [[44, 4, 'Y'], [48, 6, 'G'], [51, 3, 'Y']] as [number, number, string][]) {
      const top = Math.round(s.cy + Math.sqrt(Math.max(0, 1 - ((ax + 0.5 - s.cx) / s.rx) ** 2)) * s.ry * 0.95)
      for (let k = 1; k <= len; k++) set(g, ax + (k > len / 2 ? sw : 0), top + k, 'm')
      set(g, ax + sw, top + len + 1, gem); set(g, ax + sw, top + len + 2, 'Z')
      set(g, ax + sw - 1, top + len + 1, 'K'); set(g, ax + sw + 1, top + len + 1, 'K')
    }
  }
}

function drawCloak(g: Grid) {
  const mask = emptyMask()
  for (let y = 0; y < MV2_H; y++)
    for (let x = 0; x < MV2_W; x++) {
      if (!inCloak(x, y)) continue
      mask[y][x] = true
      const r = cloakRow(y)!
      const t = (x + 0.5 - r.cx) / r.hw // -1 izquierda … 1 derecha
      let ch = t < -0.72 ? 'B' : t < 0.32 ? 'C' : t < 0.68 ? 'D' : 'E'
      // Pliegues verticales del cuerpo (ondulan un poco)
      if (y > S.shoulderEnd - 1) {
        for (const f of [-0.52, -0.12, 0.3, 0.62]) {
          const ff = f + Math.sin((y + f * 20) / 6) * 0.05
          const d = (t - ff) * r.hw
          if (d >= 0 && d < 1) ch = t > 0.3 ? 'E' : 'D'
          else if (d >= -1 && d < 0 && t < 0.5) ch = t < -0.3 ? 'A' : 'B'
        }
      }
      // Borde de la capucha: luz del lado izquierdo, sombra del derecho
      const rd = hoodRimDist(x, y)
      if (y < S.hoodEnd + 6 && rd > 1 && rd < 1.32) ch = x < S.hood.cx ? 'A' : 'B'
      else if (y < S.hoodEnd + 6 && rd >= 1.32 && rd < 1.55) ch = x < S.hood.cx ? 'B' : 'D'
      g[y][x] = ch
    }
  // Sombra interna junto al vacío
  for (let y = 0; y < MV2_H; y++)
    for (let x = 0; x < MV2_W; x++) {
      if (!mask[y][x] || inVoid(x, y)) continue
      if (y >= S.voidTop && (inVoid(x - 1, y) || inVoid(x + 1, y))) g[y][x] = 'E'
    }
  outlineMask(g, mask)
  // El vacío
  for (let y = 0; y < MV2_H; y++) for (let x = 0; x < MV2_W; x++) if (mask[y][x] && inVoid(x, y)) g[y][x] = 'V'
}

/** Manga: una bocamanga redonda con UNA línea en espiral (como la referencia),
 *  sombreada con luz desde arriba a la izquierda. */
function drawSleeve(g: Grid, cx: number, cy: number, rx: number, ry: number, mirror: boolean) {
  const mask = emptyMask()
  for (let y = 0; y < MV2_H; y++)
    for (let x = 0; x < MV2_W; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry
      if (nx * nx + ny * ny > 1) continue
      mask[y][x] = true
      const lx = mirror ? -nx : nx
      const l = lx * 0.8 + ny * 0.6
      g[y][x] = l < -0.55 ? 'B' : l < 0.25 ? 'C' : l < 0.65 ? 'D' : 'E'
    }
  // Espiral de Arquímedes: 1,6 vueltas desde el centro hacia afuera.
  const turns = 1.6
  for (let k = 0; k <= 400; k++) {
    const th = (k / 400) * turns * Math.PI * 2
    const r = 0.12 + (0.78 * th) / (turns * Math.PI * 2)
    const dir = mirror ? -1 : 1
    const x = Math.round(cx - 0.5 + dir * Math.cos(th) * r * rx)
    const y = Math.round(cy - 0.5 + Math.sin(th) * r * ry)
    if (!mask[y]?.[x]) continue
    g[y][x] = 'E'
    // brillo del lado externo de la línea, solo en la mitad iluminada
    const ox = Math.round(cx - 0.5 + dir * Math.cos(th) * (r * rx + 1))
    const oy = Math.round(cy - 0.5 + Math.sin(th) * (r * ry + 1))
    if (mask[oy]?.[ox] && g[oy][ox] !== 'E' && Math.sin(th) < 0.3) g[oy][ox] = 'A'
  }
  outlineMask(g, mask)
}

/** Garras: 3 dedos finos y curvos, en ocre, que se aferran al borde del vacío. */
function drawClaws(g: Grid, x0: number, y0: number, dir: 1 | -1) {
  for (let i = 0; i < 3; i++) {
    const y = y0 + i * 2
    const len = 3 + (i === 1 ? 1 : 0)
    for (let k = 0; k < len; k++) {
      const x = x0 + dir * k
      const yy = y + (k >= len - 1 ? 1 : 0)
      set(g, x, yy, k === len - 1 ? 'Z' : 'Y')
      if (get(g, x, yy + 1) !== 'Y') set(g, x, yy + 1, k === 0 ? 'K' : get(g, x, yy + 1) === 'V' ? 'V' : 'Z')
    }
    set(g, x0 - dir, y, 'K')
  }
}

function drawStar(g: Grid, x: number, y: number, phase: number) {
  // 0 apagada (punto), 1 media, 2 llena con brazos
  const p = phase % 4
  set(g, x, y, 'W')
  if (p === 1 || p === 2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(g, x + dx, y + dy, p === 2 ? 'W' : 'w')
  if (p === 2) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) if (get(g, x + dx, y + dy) === 'V') set(g, x + dx, y + dy, 'w')
}

/** El ojo único del Ambulante: grande, centrado, que de vez en cuando guiña. */
function drawBigEye(g: Grid, x: number, y: number, frame: number) {
  if (frame % 8 === 6) {
    // guiño: se cierra en una rayita
    for (let i = -2; i <= 2; i++) set(g, x + i, y, i === 0 ? 'W' : 'w')
    return
  }
  const pulse = frame % 4 === 1
  set(g, x, y, 'W')
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) set(g, x + dx, y + dy, 'W')
  for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3], [0, -3], [1, 1], [-1, -1], [1, -1], [-1, 1]]) set(g, x + dx, y + dy, 'w')
  if (pulse) for (const [dx, dy] of [[4, 0], [-4, 0], [0, -4]]) if (get(g, x + dx, y + dy) === 'V') set(g, x + dx, y + dy, 'w')
}

/** Farol: tapa, vidrio con llama, base. Devuelve el centro de la llama (para la luz). */
function drawLantern(g: Grid, x: number, top: number, frame: number): { x: number; y: number } {
  // tapa + aro
  set(g, x, top - 1, 'm')
  for (let i = -2; i <= 2; i++) set(g, x + i, top, i === -2 ? 'm' : 'M')
  for (let i = -1; i <= 1; i++) set(g, x + i, top - 1, i === 0 ? 'm' : 'M')
  // vidrio
  for (let y = top + 1; y <= top + 6; y++) {
    set(g, x - 2, y, y === top + 1 ? 'm' : 'M')
    set(g, x + 2, y, 'M')
    for (let i = -1; i <= 1; i++) set(g, x + i, y, 'g')
  }
  // llama (4 cuadros)
  const fy = top + 4
  const shapes: [number, number, string][][] = [
    [[0, 0, 'F'], [0, -1, 'G'], [0, 1, 'G'], [-1, 1, 'G'], [1, 1, 'G'], [0, -2, 'G']],
    [[0, 0, 'F'], [0, -1, 'F'], [1, -2, 'G'], [0, 1, 'G'], [-1, 1, 'G'], [1, 1, 'G']],
    [[0, 0, 'F'], [0, -1, 'G'], [-1, -2, 'G'], [0, 1, 'G'], [-1, 1, 'G'], [1, 1, 'G']],
    [[0, 0, 'F'], [0, 1, 'F'], [0, -1, 'G'], [-1, 1, 'G'], [1, 1, 'G']],
  ]
  for (const [dx, dy, c] of shapes[frame % 4]) set(g, x + dx, fy + dy, c)
  // base
  for (let i = -2; i <= 2; i++) set(g, x + i, top + 7, 'M')
  for (let i = -1; i <= 1; i++) set(g, x + i, top + 8, i === 0 ? 'm' : 'M')
  // contorno
  for (let y = top - 2; y <= top + 9; y++)
    for (let i = -3; i <= 3; i++) {
      const c = get(g, x + i, y)
      if (c !== '.' && c !== 'K') continue
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => 'MmgFG'.includes(get(g, x + i + dx, y + dy)))
      if (near && c === '.') set(g, x + i, y, 'K')
    }
  return { x, y: fy }
}

/** Luz del farol sobre el manto y la mochila: núcleo pleno + aro tramado. */
function applyGlow(g: Grid, lx: number, ly: number, radius: number, frame: number) {
  const LIT: Record<string, string> = { C: 'c', B: 'b', A: 'b', D: 'e', E: 'D', S: 's', T: 'S', U: 's' }
  const r = radius + (frame % 2 === 0 ? 0 : -0.6)
  for (let y = 0; y < MV2_H; y++)
    for (let x = 0; x < MV2_W; x++) {
      const lit = LIT[g[y][x]]
      if (!lit) continue
      const d = Math.hypot(x - lx, y - ly)
      if (d <= r * 0.72 || (d <= r * 0.92 && (x + y) % 2 === 0)) g[y][x] = lit
    }
}

function drawFloorShadow(g: Grid) {
  for (let x = 6; x < 50; x++) {
    const t = Math.abs(x - 27) / 22
    if (t > 1) continue
    set(g, x, 62, 'X')
    if (t < 0.7) set(g, x, 63, 'X')
  }
}

// ── Cuadros ───────────────────────────────────────────────────────────────────
// 8 cuadros: las estrellas titilan desfasadas, el farol se mece y su llama
// parpadea, y el cuerpo "respira" (la mitad de arriba sube 1px en 4-7).
const SWAY = [0, 0, 1, 1, 0, 0, -1, -1]

function frameOf(id: MercaderV2Id, frame: number): string[] {
  const o: Opts = { id, frame }
  const amb = id === 'ambulante'
  S = amb ? AMBULANTE_SHAPE : ABISMO_SHAPE
  const g = blank()
  drawFloorShadow(g)
  drawSack(g, o)
  drawCloak(g)
  if (amb) {
    drawSleeve(g, 13.5, 40, 6.6, 7.6, false)
    drawSleeve(g, 38.5, 39, 6, 7.2, true)
    drawClaws(g, 19, 34, 1)
    drawClaws(g, 33, 33, -1)
    drawBigEye(g, 26, 22, frame)
  } else {
    drawSleeve(g, 13.5, 31, 6.4, 8.2, false)
    drawSleeve(g, 37.5, 29, 5.6, 7.6, true)
    drawClaws(g, 19, 25, 1)
    drawClaws(g, 32, 24, -1)
    // ojos-estrella: dos arriba, uno abajo a la izquierda (como la referencia)
    drawStar(g, 24, 10, frame)
    drawStar(g, 27, 12, frame + 2)
    drawStar(g, 24, 15, frame + 1)
  }

  let light: { x: number; y: number }
  if (id === 'viajero') {
    // Bastón desde la mano izquierda, farol colgando de la punta
    const sx = 7
    for (let y = 8; y <= 60; y++) { set(g, sx, y, y % 7 === 0 ? 'm' : 'M'); set(g, sx + 1, y, 'K') }
    for (let x = sx; x <= sx + 5; x++) set(g, x, 8, 'M')
    const lx = sx + 5 + SWAY[frame % 8]
    set(g, sx + 5, 9, 'm'); set(g, lx, 10, 'm')
    light = drawLantern(g, lx, 12, frame)
  } else {
    // El Ambulante lleva el farol más abajo (es más bajo) y se mece más lento.
    const sway = amb ? SWAY[Math.floor(frame / 2) % 8] : SWAY[frame % 8]
    const hook = amb ? 47 : 39
    const lx = 11 + sway
    for (let y = hook; y <= hook + 2; y++) set(g, y === hook + 1 ? lx : 11, y, y === hook + 1 ? 'm' : 'M')
    light = drawLantern(g, lx, hook + 4, frame)
  }
  applyGlow(g, light.x, light.y, id === 'penumbra' ? 12 : 9, frame)

  // Respiración: la parte de arriba sube 1px en la segunda mitad del ciclo.
  if (frame % 8 >= 4) {
    const until = amb ? 38 : 30
    for (let y = 0; y < until; y++) g[y] = [...g[y + 1]]
  }
  S = ABISMO_SHAPE
  return g.map((r) => r.join(''))
}

export const MERCADER_V2_FRAME_COUNT = 8

const cache = new Map<string, string[]>()
export function mercaderV2Frame(id: MercaderV2Id, frame: number): string[] {
  const key = `${id}:${frame % MERCADER_V2_FRAME_COUNT}`
  let rows = cache.get(key)
  if (!rows) { rows = frameOf(id, frame % MERCADER_V2_FRAME_COUNT); cache.set(key, rows) }
  return rows
}

export function mercaderV2Palette(id: MercaderV2Id): MV2Palette {
  return PALETTES[id]
}

/** La variante elegida por el profe (2026-10-02): farol cian de la tienda del Abismo. */
export const ACTIVE_MERCADER_V2: MercaderV2Id = 'abismo'

/** El Mercader Ambulante (hermano del Abismo) usa el mismo dibujo con su forma y paleta. */
export const MERCADER_AMBULANTE_V2: MercaderV2Id = 'ambulante'

/** Recorte "plano medio" para la tienda y los modales: se corta el ruedo del
 *  manto (y el aire vacío de arriba del Ambulante) pero quedan la capucha, los
 *  ojos, las garras, la mochila y el farol enteros — así se ven más grandes en
 *  el mismo lugar. La batalla usa la figura completa. */
export const MERCADER_V2_CROP: Partial<Record<MercaderV2Id, { x: number; y: number; w: number; h: number }>> = {
  abismo: { x: 3, y: 1, w: 50, h: 52 },
  fiel: { x: 3, y: 1, w: 50, h: 52 },
  penumbra: { x: 3, y: 1, w: 50, h: 52 },
  ambulante: { x: 2, y: 12, w: 52, h: 49 },
}
