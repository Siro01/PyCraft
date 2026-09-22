import { W, H, hash2, type Luma } from './art'

export type RenderMode = 'ascii' | 'dots' | 'braille'

export const RENDER_MODES: { id: RenderMode; label: string }[] = [
  { id: 'ascii', label: 'ASCII' },
  { id: 'dots', label: 'Halftone' },
  { id: 'braille', label: 'Braille' },
]

// Cada "bin" agrupa caracteres de densidad similar; se elige uno al azar por celda
// (como en la referencia: textura de terminal, no una rampa perfecta).
const BINS = [' ', '.`', "'^,", '~=-:', '<;v!', 'zcu1', 'n0XN', 'RBH@', '$@0B']
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

const PITCH = 8 // px lógicos por píxel fuente
const BRAILLE_GAP = 7 // separación entre celdas braille (2×4 puntos)

export function logicalSize(mode: RenderMode): { w: number; h: number } {
  if (mode === 'braille') {
    return { w: (W / 2) * (2 * PITCH + BRAILLE_GAP), h: (H / 4) * (4 * PITCH + BRAILLE_GAP) }
  }
  return { w: W * PITCH, h: H * PITCH }
}

// 0.9: las zonas casi blancas (luma ≥ 0.9) salen sólidas, sin huecos de dither
const on = (l: number, x: number, y: number) => l > ((BAYER[y & 3][x & 3] + 0.5) / 16) * 0.9

export function drawLuma(
  ctx: CanvasRenderingContext2D,
  luma: Luma,
  mode: RenderMode,
  color: string,
  bg: string,
  dpr: number,
) {
  const { w, h } = logicalSize(mode)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 5

  if (mode === 'ascii') {
    ctx.font = `bold 14px "Courier New", ui-monospace, Consolas, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let cy = 0; cy < H / 2; cy++) {
      for (let x = 0; x < W; x++) {
        const l = (luma[cy * 2 * W + x] + luma[(cy * 2 + 1) * W + x]) / 2
        const bin = Math.min(BINS.length - 1, Math.floor(l * BINS.length))
        if (bin === 0) continue
        const set = BINS[bin]
        const ch = set[Math.floor(hash2(x, cy, 5) * set.length)]
        ctx.globalAlpha = 0.6 + 0.4 * l
        ctx.fillText(ch, x * PITCH + PITCH / 2, cy * PITCH * 2 + PITCH)
      }
    }
    ctx.globalAlpha = 1
    return
  }

  ctx.beginPath()
  if (mode === 'dots') {
    const r = PITCH * 0.4
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!on(luma[y * W + x], x, y)) continue
        const px = x * PITCH + PITCH / 2, py = y * PITCH + PITCH / 2
        ctx.moveTo(px + r, py)
        ctx.arc(px, py, r, 0, Math.PI * 2)
      }
    }
  } else {
    const r = PITCH * 0.36
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!on(luma[y * W + x], x, y)) continue
        const px = (x >> 1) * (2 * PITCH + BRAILLE_GAP) + (x & 1) * PITCH + PITCH / 2
        const py = (y >> 2) * (4 * PITCH + BRAILLE_GAP) + (y & 3) * PITCH + PITCH / 2
        ctx.moveTo(px + r, py)
        ctx.arc(px, py, r, 0, Math.PI * 2)
      }
    }
  }
  ctx.fill()
}

/** Convierte una grilla de luminancia w×h en filas de texto (2 filas de píxeles = 1 carácter). */
export function lumaToAscii(luma: Luma, w: number, h: number): string[] {
  const rows: string[] = []
  for (let cy = 0; cy < Math.floor(h / 2); cy++) {
    let line = ''
    for (let x = 0; x < w; x++) {
      const l = (luma[cy * 2 * w + x] + luma[(cy * 2 + 1) * w + x]) / 2
      const bin = Math.min(BINS.length - 1, Math.floor(l * BINS.length))
      const set = BINS[bin]
      line += set[Math.floor(hash2(x, cy, 5) * set.length)]
    }
    rows.push(line)
  }
  return rows
}
