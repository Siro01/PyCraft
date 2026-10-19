// Elige el carácter ASCII de cada celda por su FORMA, no solo por su brillo.
//
// 1. Se dibujan las 94 letras imprimibles de la fuente real en grande y se
//    reducen a una plantilla de CW×CH puntos (cuánta tinta cae en cada punto).
// 2. El dibujo a mano se pinta a la misma resolución fina; cada celda de
//    carácter recibe su bloque de CW×CH puntos.
// 3. Gana la letra cuya plantilla se parece más al bloque (mínima diferencia
//    cuadrada): un borde en diagonal sale "/", una curva "(", una punta "^",
//    una zona llena "@" o "#". Eso es lo que le da detalle al ASCII.

export const CELL_W = 4
export const CELL_H = 8
const N = CELL_W * CELL_H
/** Cuánto pesa acertar el brillo frente a acertar la forma. */
const TONE_W = 3.5

export const FONT = '"Courier New", ui-monospace, Consolas, monospace'

export interface Glyph { ch: string; mask: Float32Array; mean: number }

let atlas: Glyph[] | null = null

/** Plantillas de las letras (se calculan una vez por pestaña). */
export function glyphAtlas(): Glyph[] {
  if (atlas) return atlas
  const S = 12 // sobremuestreo por punto de plantilla
  const w = CELL_W * S, h = CELL_H * S
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  // La letra ocupa la celda como en pantalla: 0.6em de ancho, 1.2em de alto.
  const em = w / 0.6
  ctx.font = `bold ${em}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const raw: Glyph[] = []
  for (let c = 33; c < 127; c++) {
    const ch = String.fromCharCode(c)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#fff'
    ctx.fillText(ch, w / 2, h / 2 + em * 0.04)
    const d = ctx.getImageData(0, 0, w, h).data
    const mask = new Float32Array(N)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[((y / S) | 0) * CELL_W + ((x / S) | 0)] += d[(y * w + x) * 4 + 3] / 255
    let sum = 0
    for (let i = 0; i < N; i++) { mask[i] /= S * S; sum += mask[i] }
    raw.push({ ch, mask, mean: sum / N })
  }
  // Se normaliza para que la letra más cargada valga "lleno" (1).
  const top = Math.max(...raw.map((g) => g.mean))
  const k = 1 / top
  atlas = raw.map((g) => ({ ch: g.ch, mean: g.mean * k, mask: g.mask.map((v) => Math.min(1, v * k)) as Float32Array }))
  atlas.push({ ch: ' ', mean: 0, mask: new Float32Array(N) })
  return atlas
}

export interface CellPick { ch: string; ink: number; tone: number }

/**
 * Convierte una grilla fina (luma + tinta, w×h) en celdas de carácter.
 * Devuelve cols × rows elecciones (ch ' ' = vacío).
 */
export function matchGlyphs(w: number, h: number, luma: Float32Array, ink: Uint8Array, inks: number): { cols: number; rows: number; cells: CellPick[] } {
  const glyphs = glyphAtlas()
  const cols = Math.floor(w / CELL_W)
  const rows = Math.floor(h / CELL_H)
  const cells: CellPick[] = new Array(cols * rows)
  const block = new Float32Array(N)
  const votes = new Float32Array(inks)
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      let sum = 0
      votes.fill(0)
      for (let y = 0; y < CELL_H; y++) {
        for (let x = 0; x < CELL_W; x++) {
          const i = (cy * CELL_H + y) * w + cx * CELL_W + x
          // Curva de tono: los medios tonos suben un poco (si no, se vuelven espacios).
          const v = Math.pow(luma[i], 0.8)
          block[y * CELL_W + x] = v
          sum += v
          votes[ink[i]] += v
        }
      }
      const mean = sum / N
      if (mean < 0.035) { cells[cy * cols + cx] = { ch: ' ', ink: 0, tone: 0 }; continue }
      // Costo = forma (diferencias sin el promedio) + tono (promedio contra promedio).
      // El tono pesa más: primero el brillo correcto, después la letra con la
      // forma que mejor sigue el dibujo dentro de ese brillo.
      let best = glyphs[0], bestCost = Infinity
      for (const g of glyphs) {
        const dm = g.mean - mean
        const toneCost = TONE_W * N * dm * dm
        if (toneCost > bestCost) continue
        let shape = 0
        for (let i = 0; i < N; i++) { const d = (block[i] - mean) - (g.mask[i] - g.mean); shape += d * d }
        const cost = shape + toneCost
        if (cost < bestCost) { bestCost = cost; best = g }
      }
      let inkBest = 0
      for (let k = 1; k < inks; k++) if (votes[k] > votes[inkBest]) inkBest = k
      cells[cy * cols + cx] = { ch: best.ch, ink: inkBest, tone: Math.min(1, mean * 1.6) }
    }
  }
  return { cols, rows, cells }
}
