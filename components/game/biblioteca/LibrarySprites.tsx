'use client'

import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import PlaygroundTopicIcon from '@/components/game/playground/PlaygroundTopicIcon'
import { PixelGrid } from '@/components/game/items/ItemSprites'
import { PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'

// Sprites de la Biblioteca como filas de texto (roles de PixelGrid:
// k tinta · m gris medio · d gris claro · f papel · a acento · b acento suave · w fondo).

/** Muñeco de práctica: bolsa de paja con diana en el pecho, sobre un poste. */
export const DUMMY = [
  '.....kkkkkk.....',
  '....kffffffk....',
  '....kfkffkfk....',
  '....kffffffk....',
  '....kfkkkkfk....',
  '.....kffffk.....',
  '......kffk......',
  'kkkkkkkkkkkkkkkk',
  'kmmmkffffffkmmmk',
  'kkkkkffffffkkkkk',
  '....kfaaaafk....',
  '....kafwwfak....',
  '....kafwwfak....',
  '....kfaaaafk....',
  '....kffffffk....',
  '.....kkkkkk.....',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.....kkkkkk.....',
  '...kkmmmmmmkk...',
  '..kkkkkkkkkkkk..',
]

/** El mismo muñeco con ojos en cruz: así queda cuando el libro está dominado. */
export const DUMMY_KO = DUMMY.map((row, i) => (i === 2 ? '....kkfkkfkk....' : i === 3 ? '....kfkffkfk....' : row))

/** Sello de libro dominado: octógono de lacre con un check. */
export const SEAL = [
  '...kkkkkk...',
  '..kaaaaaak..',
  '.kaaaaaaaak.',
  'kaaaaaaaawak',
  'kaaaaaaawaak',
  'kaawaaawaaak',
  'kaaawawaaaak',
  'kaaaawaaaaak',
  'kaaaaaaaaaak',
  '.kaaaaaaaak.',
  '..kaaaaaak..',
  '...kkkkkk...',
]

/** Hueco de la vitrina donde va a ir un sello. */
export const SEAL_EMPTY = SEAL.map((row) => row.replace(/[aw]/g, '.'))

export const CANDLE = [
  '....a...',
  '...aba..',
  '...aba..',
  '....k...',
  '..kkkkk.',
  '..kfffk.',
  '..kfffk.',
  '..kfffk.',
  '..kfffk.',
  '..kfffk.',
  '.kkkkkkk',
  '.kmmmmmk',
  '.kkkkkkk',
]
export const CANDLE_B = CANDLE.map((row, i) => (i === 0 ? '...a....' : i === 1 ? '...ab...' : i === 2 ? '..aba...' : row))

export const POTION = [
  '...kkk..',
  '...kfk..',
  '...kfk..',
  '..kkkkk.',
  '.kfffffk',
  'kfaaaafk',
  'kaaabaak',
  'kaaaaaak',
  'kaabaaak',
  '.kaaaak.',
  '..kkkk..',
]

/** Libros acostados en la repisa de abajo. */
export const BOOK_PILE = [
  '..............',
  '.kkkkkkkkkkk..',
  '.kffffffffffk.',
  '.kkkkkkkkkkkk.',
  'kkkkkkkkkkkkk.',
  'kaaaaaaaaaaak.',
  'kkkkkkkkkkkkk.',
  '.kkkkkkkkkkkkk',
  '.kmmmmmmmmmmmk',
  '.kkkkkkkkkkkkk',
]

/** Bichito para el libro de errores. */
const BUG = [
  '..k.....k..',
  '...k...k...',
  '....kkk....',
  'k..kfffk..k',
  '.kkfkfkfkk.',
  '...kfffk...',
  'k.kkfkfkk.k',
  '.k.kfffk.k.',
  '....kkk....',
]

/** Glifo del lomo: el del jefe del tema, o uno propio para los libros sin jefe. */
export function BookGlyph({ glyph, size, color }: { glyph: string; size: number; color: string }) {
  if (glyph === 'print' || glyph === 'input') return <PlaygroundTopicIcon icon={glyph} size={size} color={color} />
  if (glyph === 'bug') {
    return (
      <span style={{ color, display: 'inline-flex' }}>
        <svg width={size} height={size} viewBox="0 0 11 11" shapeRendering="crispEdges" aria-hidden="true">
          {BUG.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y + 1} width={1} height={1} fill={c === 'k' ? 'currentColor' : 'transparent'} />)))}
        </svg>
      </span>
    )
  }
  return <BossTopicIcon bossId={glyph} size={size} color={color} />
}

export { PixelGrid }

// ── Íconos de botón (filas de texto, como el resto del catálogo de PixelBitmap:
// '#' es la tinta y se pinta con currentColor, así siguen al color del botón).
export const ICO_PLAY = ['#....', '##...', '###..', '####.', '###..', '##...', '#....']
export const ICO_UNDO = ['.#.....', '##.....', '#######', '##....#', '.#....#', '......#', '..####.']
export const ICO_STAR = ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '##...##']
export const ICO_SPARK = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...']
export const ICO_LEFT = ['...#', '..##', '.###', '####', '.###', '..##', '...#']
export const ICO_RIGHT = ICO_LEFT.map((r) => [...r].reverse().join(''))

/** Ícono pixel en línea con el texto de un botón. */
export function Ico({ rows, scale = 2 }: { rows: string[]; scale?: number }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', flexShrink: 0 }}>
      <PixelBitmap rows={rows} scale={scale} ink="currentColor" />
    </span>
  )
}

/** Sujetalibros: un bloque en L que frena la fila. */
export const BOOKEND = [
  'kkk.....',
  'kfk.....',
  'kfk.....',
  'kfk.....',
  'kfk.....',
  'kfk.....',
  'kfk.....',
  'kfk.....',
  'kfkkkkkk',
  'kffffffk',
  'kkkkkkkk',
]
