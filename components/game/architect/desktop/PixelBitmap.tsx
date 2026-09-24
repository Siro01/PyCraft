'use client'

import type { CSSProperties } from 'react'

// Sprites pixel-art dibujados a mano como filas de texto — una celda = un píxel.
// '#' contorno · 'o' relleno · 'a' acento del tema · 'h' gris medio · 'b' fondo · 'd' peligro
// Todo sale de los tokens del tema activo, así se repinta solo con BN / blanco / rojo.

export type Bitmap = readonly string[]

const PALETTE: Record<string, string> = {
  '#': 'hsl(var(--tx))',
  o: 'hsl(var(--surface2))',
  a: 'hsl(var(--accent))',
  h: 'hsl(var(--tx2))',
  b: 'hsl(var(--bg))',
  d: 'hsl(var(--danger))',
}

export function PixelBitmap({
  rows, scale = 3, ink, style, title,
}: {
  rows: Bitmap
  scale?: number
  ink?: string
  style?: CSSProperties
  title?: string
}) {
  const w = rows[0].length
  const h = rows.length
  const pal = ink ? { ...PALETTE, '#': ink } : PALETTE
  const rects: { x: number; y: number; n: number; c: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === '.' || !pal[ch]) { x++; continue }
      let n = 1
      while (x + n < row.length && row[x + n] === ch) n++
      rects.push({ x, y, n, c: pal[ch] })
      x += n
    }
  })
  return (
    <svg
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block', imageRendering: 'pixelated', flexShrink: 0, ...style }}
    >
      {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.n} height={1} fill={r.c} />)}
    </svg>
  )
}

export const CHEST_CLOSED: Bitmap = [
  '................',
  '..############..',
  '.#oooooooooooo#.',
  '#oooooooooooooo#',
  '#ooooooaaoooooo#',
  '################',
  '#oooooooooooooo#',
  '#ooooooaaoooooo#',
  '#oooooaaaaooooo#',
  '#oooooooooooooo#',
  '#oooooooooooooo#',
  '################',
  '..hhhhhhhhhhhh..',
]

export const CHEST_OPEN: Bitmap = [
  '..############..',
  '.#hhhhhhhhhhhh#.',
  '.#hhhhhhhhhhhh#.',
  '.##############.',
  '#bbbbbbbbbbbbbb#',
  '#bbbbbbbbbbbbbb#',
  '################',
  '#ooooooaaoooooo#',
  '#oooooaaaaooooo#',
  '#oooooooooooooo#',
  '#oooooooooooooo#',
  '################',
  '..hhhhhhhhhhhh..',
]

export const ICON_FOLDER: Bitmap = [
  '.#####..........',
  '#ooooo##########',
  '#oooooooooooooo#',
  '#oooooooooooooo#',
  '#oooooooooooooo#',
  '#oooooooooooooo#',
  '#oooooooooooooo#',
  '#oooooooooooooo#',
  '#oooooooooooooo#',
  '#oooooooooooooo#',
  '################',
]

export const ICON_TERMINAL: Bitmap = [
  '################',
  '#oooooooooooooo#',
  '#oaoooooooooooo#',
  '#ooaooooooooooo#',
  '#oaoooooooooooo#',
  '#oooooooaaaaooo#',
  '#oooooooooooooo#',
  '################',
  '......####......',
  '....########....',
]

export const ICON_FILE: Bitmap = [
  '############',
  '#oooooooooo#',
  '#o########o#',
  '#oooooooooo#',
  '#o######ooo#',
  '#oooooooooo#',
  '#o########o#',
  '#oooooooooo#',
  '#o####ooooo#',
  '#oooooooooo#',
  '############',
]

export const ICON_WALL: Bitmap = [
  '############',
  '#.#.#.#.#.##',
  '##.#.#.#.#.#',
  '#.#.#.#.#.##',
  '##.#.#.#.#.#',
  '#.#.#.#.#.##',
  '##.#.#.#.#.#',
  '#.#.#.#.#.##',
  '##.#.#.#.#.#',
  '#.#.#.#.#.##',
  '############',
]

export const ICON_WARN: Bitmap = [
  '.....##.....',
  '....####....',
  '....#aa#....',
  '...##aa##...',
  '...##aa##...',
  '..###aa###..',
  '..########..',
  '.####aa####.',
  '.####aa####.',
  '############',
]

export const ICON_PIG: Bitmap = [
  '.##......##.',
  '.###....###.',
  '.##########.',
  '#oooooooooo#',
  '#o##oooo##o#',
  '#oooooooooo#',
  '#ooo####ooo#',
  '#ooo#aa#ooo#',
  '#ooo####ooo#',
  '.##########.',
]

export const ICON_CUBE: Bitmap = [
  '..####..',
  '.#hhhh#.',
  '#hhhhhh#',
  '########',
  '#oooooo#',
  '#oooooo#',
  '.######.',
]

export const ICON_CLOSE: Bitmap = [
  '#.....#',
  '.#...#.',
  '..#.#..',
  '...#...',
  '..#.#..',
  '.#...#.',
  '#.....#',
]

export const ICON_CHECK: Bitmap = [
  '......##',
  '.....##.',
  '##..##..',
  '.####...',
  '..##....',
]

// Grabados para decorar el cofre (8×8, un solo color)
export const STICKER_BITMAPS: Record<string, Bitmap> = {
  estrella: [
    '...##...',
    '...##...',
    '########',
    '.######.',
    '..####..',
    '.##..##.',
    '.#....#.',
    '........',
  ],
  corazon: [
    '.##..##.',
    '########',
    '########',
    '########',
    '.######.',
    '..####..',
    '...##...',
    '........',
  ],
  diamante: [
    '...##...',
    '..####..',
    '.######.',
    '########',
    '.######.',
    '..####..',
    '...##...',
    '........',
  ],
  calavera: [
    '.######.',
    '########',
    '##.##.##',
    '##.##.##',
    '########',
    '.##..##.',
    '.#.##.#.',
    '........',
  ],
  creeper: [
    '########',
    '#..##..#',
    '#..##..#',
    '###..###',
    '##.##.##',
    '##....##',
    '##....##',
    '########',
  ],
  rayo: [
    '....##..',
    '...##...',
    '..##....',
    '.######.',
    '...##...',
    '..##....',
    '.##.....',
    '........',
  ],
  fuego: [
    '...#....',
    '..##..#.',
    '..###.##',
    '.#######',
    '.#######',
    '.#######',
    '..#####.',
    '...###..',
  ],
  espada: [
    '......##',
    '.....##.',
    '....##..',
    '#..##...',
    '.####...',
    '..##....',
    '.#.##...',
    '#....#..',
  ],
}

export const STICKER_IDS = Object.keys(STICKER_BITMAPS)

export const ICON_ARROW_DOWN: Bitmap = [
  '#######',
  '.#####.',
  '..###..',
  '...#...',
]

export const ICON_ARROW_RIGHT: Bitmap = [
  '#...',
  '##..',
  '###.',
  '####',
  '###.',
  '##..',
  '#...',
]

// Gato mascota del escritorio — dos cuadros de caminata (14×12)
export const PET_A: Bitmap = [
  '..#........#..',
  '.###......###.',
  '.############.',
  '#oooooooooooo#',
  '#oo##oooo##oo#',
  '#oo##oooo##oo#',
  '#oooooaaooooo#',
  '#oo#oooooo#oo#',
  '.#oooo##oooo#.',
  '.############.',
  '.#o#......#o#.',
  '.###......###.',
]

export const PET_B: Bitmap = [
  '..#........#..',
  '.###......###.',
  '.############.',
  '#oooooooooooo#',
  '#oo##oooo##oo#',
  '#oo##oooo##oo#',
  '#oooooaaooooo#',
  '#oo#oooooo#oo#',
  '.#oooo##oooo#.',
  '.############.',
  '..#o#....#o#..',
  '..###....###..',
]

export const ICON_BIN: Bitmap = [
  '....####....',
  '############',
  '.##########.',
  '.#oo#oo#oo#.',
  '.#oo#oo#oo#.',
  '.#oo#oo#oo#.',
  '.#oo#oo#oo#.',
  '.#oo#oo#oo#.',
  '.##########.',
]

export const ICON_BIN_OPEN: Bitmap = [
  '......####..',
  '..##########',
  '.##########.',
  '.#oo#oo#oo#.',
  '.#oo#oo#oo#.',
  '.#oo#oo#oo#.',
  '.#oo#oo#oo#.',
  '.#oo#oo#oo#.',
  '.##########.',
]
