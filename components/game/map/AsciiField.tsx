'use client'

import { memo, useMemo } from 'react'
import { ART, type ActMapDef } from '@/lib/game/act-maps'
import { hash2, makeFace, W as FACE_W, H as FACE_H } from '@/lib/game/architect/art'
import { BINS } from '@/lib/game/architect/render'
import { clearRects } from './MapArt'

// Terreno del Acto IV: en vez de pixel-art, la misma grilla ASCII con la que
// se dibuja El Arquitecto (mismos BINS de densidad que render.ts). Su cara
// ocupa el lado derecho del mapa y el camino abre un túnel hasta el centro de
// su capucha, donde espera el jefe. Alrededor: ruido de terminal, bandas de
// binario y fragmentos de código roto. Algunas filas "saltan" de lado por un
// cuadro (glitch), todo con CSS para que no pese.

export const ASCII_COLS = 64
export const ASCII_ROWS = 27
const FACE_COL0 = 35

type Tone = 'dim' | 'mid' | 'ink' | 'hot'
interface Cell { ch: string; tone: Tone }

function buildGrid(act: ActMapDef, blink: boolean): Cell[][] {
  const cw = (act.width * ART) / ASCII_COLS
  const ch = (act.height * ART) / ASCII_ROWS
  const grid: Cell[][] = Array.from({ length: ASCII_ROWS }, () => Array.from({ length: ASCII_COLS }, () => ({ ch: ' ', tone: 'dim' as Tone })))

  // Ruido de terminal, más denso hacia la cara.
  for (let r = 0; r < ASCII_ROWS; r++) {
    for (let c = 0; c < FACE_COL0; c++) {
      const h = hash2(c, r, 7)
      const density = 0.05 + (c / FACE_COL0) * 0.1
      if (h < density) {
        const set = BINS[1 + Math.floor(hash2(c, r, 9) * 3)]
        grid[r][c] = { ch: set[Math.floor(hash2(c, r, 11) * set.length)], tone: 'dim' }
      }
    }
  }
  // Bandas de binario: dos filas "volcadas" de memoria.
  for (const r of [4, 22]) {
    for (let c = 0; c < FACE_COL0; c++) {
      if (hash2(c, r, 13) < 0.45) grid[r][c] = { ch: hash2(c, r, 15) < 0.5 ? '0' : '1', tone: 'dim' }
    }
  }

  // La cara del Arquitecto (makeFace → misma luminancia que en su pelea).
  const face = makeFace(blink)
  const fw = ASCII_COLS - FACE_COL0
  for (let r = 0; r < ASCII_ROWS; r++) {
    for (let c = 0; c < fw; c++) {
      const lx = Math.floor((c / fw) * FACE_W)
      const ly = Math.floor((r / ASCII_ROWS) * FACE_H)
      const ly2 = Math.min(FACE_H - 1, ly + 1)
      // Un poco de gamma: el lado en sombra de la capucha no se pierde en el ruido.
      const l = Math.pow((face[ly * FACE_W + lx] + face[ly2 * FACE_W + lx]) / 2, 0.72)
      const bin = Math.min(BINS.length - 1, Math.floor(l * BINS.length))
      if (bin === 0) continue
      const set = BINS[bin]
      const tone: Tone = l > 0.9 ? 'hot' : l > 0.58 ? 'ink' : l > 0.32 ? 'mid' : 'dim'
      grid[r][FACE_COL0 + c] = { ch: set[Math.floor(hash2(c, r, 5) * set.length)], tone }
    }
  }

  // Túnel: el camino y las puertas siempre limpios.
  for (const [x1, y1, x2, y2] of clearRects(act)) {
    for (let r = 0; r < ASCII_ROWS; r++) {
      const cy = (r + 0.5) * ch
      if (cy < y1 || cy > y2) continue
      for (let c = 0; c < ASCII_COLS; c++) {
        const cx = (c + 0.5) * cw
        if (cx >= x1 && cx <= x2) grid[r][c] = { ch: ' ', tone: 'dim' }
      }
    }
  }

  // Código roto: pisa todo lo demás.
  for (const f of act.fragments) {
    ;[...f.text].forEach((t, i) => {
      const c = f.col + i
      if (c < ASCII_COLS && f.row < ASCII_ROWS) grid[f.row][c] = { ch: t, tone: f.hot ? 'hot' : 'mid' }
    })
  }
  return grid
}

const FILL: Record<Tone, string> = {
  dim: 'hsl(var(--tx3) / 0.55)',
  mid: 'hsl(var(--tx2))',
  ink: 'hsl(var(--tx))',
  hot: 'hsl(var(--accent))',
}

function AsciiField({ act, blink }: { act: ActMapDef; blink: boolean }) {
  const grid = useMemo(() => buildGrid(act, blink), [act, blink])
  const cw = (act.width * ART) / ASCII_COLS
  const chH = (act.height * ART) / ASCII_ROWS

  return (
    <g fontFamily="'Courier New', ui-monospace, Consolas, monospace" fontSize={chH * 0.95} fontWeight={700} shapeRendering="auto">
      {grid.map((row, r) => {
        // Una fila de cada ~5 se corre de lado un cuadro de vez en cuando.
        const glitchy = hash2(r, 0, 23) < 0.22
        const byTone: Partial<Record<Tone, { ch: string; x: number }[]>> = {}
        row.forEach((cell, c) => {
          if (cell.ch === ' ') return
          ;(byTone[cell.tone] ??= []).push({ ch: cell.ch, x: c * cw + cw / 2 })
        })
        return (
          <g
            key={r}
            className={glitchy ? 'ascii-glitch-row' : undefined}
            style={glitchy ? { animationDuration: `${(3 + hash2(r, 1, 29) * 4).toFixed(2)}s`, animationDelay: `${(hash2(r, 2, 31) * 3).toFixed(2)}s` } : undefined}
          >
            {(Object.keys(byTone) as Tone[]).map((tone) => {
              const cells = byTone[tone]!
              return (
                <text
                  key={tone}
                  className={tone === 'hot' ? 'ascii-hot' : undefined}
                  x={cells.map((c) => c.x.toFixed(2)).join(' ')}
                  y={(r + 0.78) * chH}
                  textAnchor="middle"
                  fill={FILL[tone]}
                >
                  {cells.map((c) => c.ch).join('')}
                </text>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}

export default memo(AsciiField)
