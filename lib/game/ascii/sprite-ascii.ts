// Sprite pixel-art → arte ASCII detallado.
//
// Toma la imagen real del sprite (RGBA), la recorta a lo que tiene dibujo y la
// muestrea en celdas de carácter (cada celda mide el doble de alto que de ancho,
// como una letra monoespaciada). Por celda calcula cobertura, color y brillo, y
// elige el carácter:
//   · relleno  → una rampa larga de densidad (más tinta = carácter más lleno)
//   · contorno → según la dirección del borde: | - / \ _ (estilo "contorno")
// No inventa dibujo: cada carácter sale del píxel que tiene debajo, así la
// versión ASCII y la pixel-art son el mismo personaje.

export interface Raster { w: number; h: number; data: Uint8ClampedArray }

export type AsciiStyle = 'fosforo' | 'color' | 'contorno'

export interface AsciiCell {
  ch: string
  /** Color propio del sprite en esa celda (0-255). */
  r: number; g: number; b: number
  /** 0..1: cuánto dibujo cae en la celda. */
  cover: number
  /** 0..1: brillo de la celda (ya contando la cobertura). */
  tone: number
  edge: boolean
}

export interface AsciiArt { cols: number; rows: number; cells: AsciiCell[] }

// Rampa de densidad pareja (de vacío a lleno): cada paso se ve más cargado que
// el anterior, sin letras de densidad parecida que ensucien la textura.
export const RAMP = " .':;!ilI+xzoO0#%@"

const EDGE_CHARS = { h: '-', hLow: '_', v: '|', d1: '/', d2: '\\' }

/** Proporción alto/ancho de una celda de carácter. */
export const CELL_ASPECT = 2

function bbox(src: Raster): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = src.w, y0 = src.h, x1 = -1, y1 = -1
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      if (src.data[(y * src.w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return { x0: 0, y0: 0, x1: src.w - 1, y1: src.h - 1 }
  return { x0, y0, x1, y1 }
}

/** Promedio (premultiplicado) del rectángulo de origen [x, x+w) × [y, y+h). */
function sample(src: Raster, x: number, y: number, w: number, h: number) {
  const SS = 4
  let r = 0, g = 0, b = 0, a = 0
  for (let j = 0; j < SS; j++) {
    for (let i = 0; i < SS; i++) {
      const sx = Math.min(src.w - 1, Math.max(0, Math.floor(x + ((i + 0.5) / SS) * w)))
      const sy = Math.min(src.h - 1, Math.max(0, Math.floor(y + ((j + 0.5) / SS) * h)))
      const k = (sy * src.w + sx) * 4
      const al = src.data[k + 3] / 255
      r += src.data[k] * al; g += src.data[k + 1] * al; b += src.data[k + 2] * al; a += al
    }
  }
  const n = SS * SS
  return a > 0 ? { r: r / a, g: g / a, b: b / a, a: a / n } : { r: 0, g: 0, b: 0, a: 0 }
}

/** Scale2x (EPX): duplica el sprite redondeando las diagonales, sin inventar colores. */
function scale2x(src: Raster): Raster {
  const { w, h, data } = src
  const out = new Uint8ClampedArray(w * 2 * h * 2 * 4)
  const px = (x: number, y: number) => (Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4
  const eq = (a: number, b: number) => data[a] === data[b] && data[a + 1] === data[b + 1] && data[a + 2] === data[b + 2] && data[a + 3] === data[b + 3]
  const put = (x: number, y: number, k: number) => { const o = (y * w * 2 + x) * 4; out[o] = data[k]; out[o + 1] = data[k + 1]; out[o + 2] = data[k + 2]; out[o + 3] = data[k + 3] }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = px(x, y), A = px(x, y - 1), B = px(x + 1, y), C = px(x - 1, y), D = px(x, y + 1)
      put(2 * x, 2 * y, eq(C, A) && !eq(C, D) && !eq(A, B) ? A : P)
      put(2 * x + 1, 2 * y, eq(A, B) && !eq(A, C) && !eq(B, D) ? B : P)
      put(2 * x, 2 * y + 1, eq(D, C) && !eq(D, B) && !eq(C, A) ? C : P)
      put(2 * x + 1, 2 * y + 1, eq(B, D) && !eq(B, A) && !eq(D, C) ? D : P)
    }
  }
  return { w: w * 2, h: h * 2, data: out }
}

export function rasterToAscii(input: Raster, cols: number, style: AsciiStyle): AsciiArt {
  // Los sprites chicos se suavizan antes de muestrear (las diagonales dejan de ser escalones).
  let src = input
  while (src.w < 256 && src.h < 256) src = scale2x(src)
  const box = bbox(src)
  const bw = box.x1 - box.x0 + 1
  const bh = box.y1 - box.y0 + 1
  const cw = bw / cols
  const ch = cw * CELL_ASPECT
  const rows = Math.max(1, Math.ceil(bh / ch))
  const oy = box.y0 - (rows * ch - bh) / 2

  // 1) muestreo
  const raw = new Array(cols * rows)
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const s = sample(src, box.x0 + cx * cw, oy + cy * ch, cw, ch)
      const lum = (0.299 * s.r + 0.587 * s.g + 0.114 * s.b) / 255
      // Las líneas negras de contorno también son dibujo: brillo mínimo 0.3.
      raw[cy * cols + cx] = { ...s, lum, v: s.a * (0.3 + 0.7 * lum) }
    }
  }

  // 2) elección de carácter
  const cover = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : raw[y * cols + x].a)

  // Estira el brillo al rango propio del sprite (percentiles 5-95 de lo que
  // tiene dibujo): así un jefe oscuro no queda apagado y se separan las sombras.
  const vs = raw.filter((c) => c.a >= 0.12).map((c) => c.v).sort((a, b) => a - b)
  const lo = vs.length ? vs[Math.floor(vs.length * 0.05)] : 0
  const hi = vs.length ? vs[Math.floor(vs.length * 0.95)] : 1
  const span = Math.max(0.05, hi - lo)
  const stretch = (v: number) => Math.min(1, Math.max(0, (v - lo) / span)) ** 0.85

  // Volumen: distancia de cada celda al borde de la figura (las filas pesan el
  // doble porque la celda es el doble de alta). El centro de cada forma queda
  // más claro y el contorno más oscuro, como si tuviera cuerpo; la luz viene de
  // arriba a la izquierda y aclara los bordes que miran hacia ella.
  const inside = (x: number, y: number) => cover(x, y) >= 0.12
  const INF = 1e9
  const dist = new Float32Array(cols * rows).fill(INF)
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!inside(x, y)) dist[y * cols + x] = 0
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : dist[y * cols + x])
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const k = y * cols + x
    if (dist[k] === 0) continue
    dist[k] = Math.min(dist[k], at(x - 1, y) + 1, at(x, y - 1) + CELL_ASPECT, at(x - 1, y - 1) + 2.24, at(x + 1, y - 1) + 2.24)
  }
  for (let y = rows - 1; y >= 0; y--) for (let x = cols - 1; x >= 0; x--) {
    const k = y * cols + x
    if (dist[k] === 0) continue
    dist[k] = Math.min(dist[k], at(x + 1, y) + 1, at(x, y + 1) + CELL_ASPECT, at(x + 1, y + 1) + 2.24, at(x - 1, y + 1) + 2.24)
  }
  const R = Math.max(3, cols * 0.09)
  const shade = (x: number, y: number) => {
    const d = at(x, y)
    const vol = Math.min(1, d / R)
    const gx = at(x + 1, y) - at(x - 1, y)
    const gy = (at(x, y + 1) - at(x, y - 1)) / CELL_ASPECT
    const g = Math.hypot(gx, gy) || 1
    const facing = Math.max(0, (gx + gy) / (g * Math.SQRT2)) // borde que mira arriba-izquierda
    const rim = d < R * 0.5 ? facing * (1 - d / (R * 0.5)) : 0
    return 0.55 + 0.45 * Math.sqrt(vol) + 0.25 * rim
  }

  const cells: AsciiCell[] = raw.map((c, i) => {
    const x = i % cols
    const y = Math.floor(i / cols)
    const base = { r: c.r, g: c.g, b: c.b, cover: c.a, tone: Math.min(1, stretch(c.v) * shade(x, y)), edge: false }
    if (c.a < 0.12) return { ...base, ch: ' ' }

    // Solo la silueta lleva carácter de borde: el dibujo de adentro lo da la rampa.
    const outside = (dx: number, dy: number) => cover(x + dx, y + dy) < 0.12
    const onSilhouette = outside(1, 0) || outside(-1, 0) || outside(0, 1) || outside(0, -1)
    if (onSilhouette && style !== 'fosforo') {
      const gx = (cover(x + 1, y - 1) + 2 * cover(x + 1, y) + cover(x + 1, y + 1)) - (cover(x - 1, y - 1) + 2 * cover(x - 1, y) + cover(x - 1, y + 1))
      const gy = (cover(x - 1, y + 1) + 2 * cover(x, y + 1) + cover(x + 1, y + 1)) - (cover(x - 1, y - 1) + 2 * cover(x, y - 1) + cover(x + 1, y - 1))
      if (Math.hypot(gx, gy) > 0.9) {
        const ang = ((Math.atan2(gy, gx) * 180) / Math.PI + 180) % 180
        let e: string
        if (ang < 22.5 || ang >= 157.5) e = EDGE_CHARS.v
        else if (ang < 67.5) e = EDGE_CHARS.d2
        else if (ang < 112.5) e = gy < 0 ? EDGE_CHARS.hLow : EDGE_CHARS.h
        else e = EDGE_CHARS.d1
        return { ...base, ch: e, edge: true }
      }
    }

    const idx = Math.max(1, Math.min(RAMP.length - 1, Math.round(base.tone * (RAMP.length - 1))))
    return { ...base, ch: RAMP[idx] }
  })

  return { cols, rows, cells }
}

/** Texto plano (para copiar o para el manual). */
export function asciiToText(art: AsciiArt): string {
  const out: string[] = []
  for (let y = 0; y < art.rows; y++) {
    let line = ''
    for (let x = 0; x < art.cols; x++) line += art.cells[y * art.cols + x].ch
    out.push(line.replace(/\s+$/, ''))
  }
  return out.join('\n')
}

// ─── Fuentes de raster ───────────────────────────────────────────────────────

/** Carga una imagen (primer cuadro si es GIF) y opcionalmente recorta un cuadro de una tira. */
export function loadRaster(src: string, frame?: { w: number; h: number; index?: number; y?: number }): Promise<Raster> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = frame?.w ?? img.naturalWidth
      const h = frame?.h ?? img.naturalHeight
      const cv = document.createElement('canvas')
      cv.width = w; cv.height = h
      const ctx = cv.getContext('2d', { willReadFrequently: true })!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, -(frame?.index ?? 0) * w, -(frame?.y ?? 0))
      resolve({ w, h, data: ctx.getImageData(0, 0, w, h).data })
    }
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    img.src = src
  })
}

/** Grilla de texto con roles de color (como PixelGrid) → raster. */
export function rowsToRaster(rows: string[], palette: Record<string, string>): Raster {
  const h = rows.length
  const w = Math.max(...rows.map((r) => r.length))
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    const col = palette[c]
    if (!col) return
    ctx.fillStyle = col
    ctx.fillRect(x, y, 1, 1)
  }))
  return { w, h, data: ctx.getImageData(0, 0, w, h).data }
}

/** Lo que haya dibujado un <canvas> ya en pantalla. */
export function canvasToRaster(canvas: HTMLCanvasElement): Raster {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  return { w: canvas.width, h: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data }
}

/** Un <svg> de rects (PixelGrid, PixelBitmap, MercaderV2) ya en pantalla → raster.
 *  Lee el color resuelto de cada rect, así los tokens del tema quedan aplicados. */
export function svgToRaster(svg: SVGSVGElement): Raster {
  const vb = svg.viewBox.baseVal
  const w = Math.round(vb?.width || svg.width.baseVal.value)
  const h = Math.round(vb?.height || svg.height.baseVal.value)
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  svg.querySelectorAll('rect').forEach((r) => {
    const cs = getComputedStyle(r)
    if (!cs.fill || cs.fill === 'none' || cs.display === 'none' || cs.visibility === 'hidden') return
    ctx.globalAlpha = parseFloat(cs.fillOpacity || '1') * parseFloat(cs.opacity || '1')
    ctx.fillStyle = cs.fill
    ctx.fillRect(r.x.baseVal.value - (vb?.x ?? 0), r.y.baseVal.value - (vb?.y ?? 0), r.width.baseVal.value, r.height.baseVal.value)
  })
  return { w, h, data: ctx.getImageData(0, 0, w, h).data }
}
