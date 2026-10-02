// Sprites del personaje del mapa — 12×14, dibujados como filas de texto con
// los roles de PixelGrid: k tinta · a acento · b acento suave · f papel ·
// m gris medio · d gris oscuro · w fondo. Cada diseño define cabeza (8 filas)
// y cuerpo (4 filas) para abajo/arriba/derecha; la izquierda es el espejo de
// la derecha, y las piernas (2 filas) alternan 2 cuadros al caminar.

export type Facing = 'up' | 'down' | 'left' | 'right'
export type AvatarId = 'explorador' | 'minero' | 'bot'

type Side = 'down' | 'up' | 'right'
interface Design {
  name: string
  blurb: string
  head: Record<Side, string[]> & { downB?: string[]; rightB?: string[] }
  body: Record<Side, string[]>
}

const LEGS_FRONT: [string[], string[]] = [
  ['...kk..kk...', '..kkk..kkk..'],
  ['..kk....kk..', '..kk....kk..'],
]
const LEGS_SIDE: [string[], string[]] = [
  ['...kk.kk....', '..kkk.kkk...'],
  ['....kkk.....', '...kkkk.....'],
]

const DESIGNS: Record<AvatarId, Design> = {
  // A · El explorador: gorra con visera en acento y mochila de aventurero.
  explorador: {
    name: 'El explorador',
    blurb: 'Gorra con visera y mochila. Sale a recorrer cada acto.',
    head: {
      down: ['....kkkk....', '..kkaaaakk..', '.kaaaaaaaak.', '.kkkkkkkkkk.', '.kffffffffk.', '.kfkffffkfk.', '.kffffffffk.', '..kkffffkk..'],
      up: ['....kkkk....', '..kkaaaakk..', '.kaaaaaaaak.', '.kaaaaaaaak.', '.kaaaaaaaak.', '.kaaaaaaaak.', '.kkaaaaaakk.', '..kkkkkkkk..'],
      right: ['....kkkk....', '..kkaaaakk..', '.kaaaaaaaak.', '.kaaakkkkkkk', '.kaaffffffk.', '.kaaffffkfk.', '.kffffffffk.', '..kkffffkk..'],
    },
    body: {
      down: ['.kkmmmmmmkk.', 'kfkmakkamkfk', '.kkmmmmmmkk.', '..kkkkkkkk..'],
      up: ['.kkkaaaakkk.', 'kfkawwwwakfk', '.kkkaaaakkk.', '..kkkkkkkk..'],
      right: ['kkkkmmmmkk..', 'kaakmmmmkfk.', 'kkkkmmmmkk..', '..kkkkkkk...'],
    },
  },
  // B · El minero: cabeza de bloque y casco con linterna — guiño a Minecraft.
  minero: {
    name: 'El minero',
    blurb: 'Cabeza de bloque y casco con linterna. Pica código.',
    head: {
      down: ['...kkkkkk...', '..kddaaddk..', '..kddaaddk..', '..kkkkkkkk..', '..kfkffkfk..', '..kffffffk..', '..kffmmffk..', '..kkkkkkkk..'],
      up: ['...kkkkkk...', '..kddddddk..', '..kddddddk..', '..kkkkkkkk..', '..kmmmmmmk..', '..kmmmmmmk..', '..kmmmmmmk..', '..kkkkkkkk..'],
      right: ['...kkkkkk...', '..kddddddkk.', '..kddddddaak', '..kkkkkkkkk.', '..kffffkfk..', '..kffffffk..', '..kfffffmk..', '..kkkkkkkk..'],
    },
    body: {
      down: ['..kbbbbbbk..', '.kfkbbbbkfk.', '.kfkbbbbkfk.', '..kddddddk..'],
      up: ['..kbbbbbbk..', '.kfkbbbbkfk.', '.kfkbbbbkfk.', '..kddddddk..'],
      right: ['...kbbbbk...', '...kbbbfk...', '...kbbbfk...', '...kddddk...'],
    },
  },
  // C · El bot: robotito con pantalla de terminal; el ">_" titila al caminar.
  bot: {
    name: 'El bot',
    blurb: 'Robotito con pantalla de terminal. En la cara lleva un >_.',
    head: {
      down: ['.....aa.....', '.....kk.....', '..kkkkkkkk..', '.kwwwwwwwwk.', '.kwawwwwwwk.', '.kwwawwwwwk.', '.kwawwaaawk.', '.kkkkkkkkkk.'],
      downB: ['.....dd.....', '.....kk.....', '..kkkkkkkk..', '.kwwwwwwwwk.', '.kwawwwwwwk.', '.kwwawwwwwk.', '.kwawwwwwwk.', '.kkkkkkkkkk.'],
      up: ['.....aa.....', '.....kk.....', '..kkkkkkkk..', '.kmmmmmmmmk.', '.kmkmkmkmmk.', '.kmmmmmmmmk.', '.kmkmkmkmmk.', '.kkkkkkkkkk.'],
      right: ['....aa......', '....kk......', '..kkkkkkkk..', '..kmmmwwwwk.', '..kmmmwawwk.', '..kmmmwwawk.', '..kmmmwawaak', '..kkkkkkkkk.'],
      rightB: ['....dd......', '....kk......', '..kkkkkkkk..', '..kmmmwwwwk.', '..kmmmwawwk.', '..kmmmwwawk.', '..kmmmwawwk.', '..kkkkkkkkk.'],
    },
    body: {
      down: ['...kmmmmk...', '.kkkmaamkkk.', '.k.kmmmmk.k.', '...kkkkkk...'],
      up: ['...kmmmmk...', '.kkkmmmmkkk.', '.k.kmmmmk.k.', '...kkkkkk...'],
      right: ['...kmmmmk...', '...kmmmmkk..', '...kmmmmk.k.', '...kkkkkk...'],
    },
  },
}

export const AVATAR_IDS = Object.keys(DESIGNS) as AvatarId[]
export const DEFAULT_AVATAR: AvatarId = 'minero' // elegido por el docente (2026-10-02)
export const avatarInfo = (id: AvatarId) => ({ name: DESIGNS[id].name, blurb: DESIGNS[id].blurb })

const mirror = (rows: string[]) => rows.map((r) => [...r].reverse().join(''))

export function avatarRows(id: AvatarId, facing: Facing, frame: 0 | 1): string[] {
  const d = DESIGNS[id]
  const side: Side = facing === 'left' ? 'right' : facing
  let head = d.head[side]
  if (frame && side === 'down' && d.head.downB) head = d.head.downB
  if (frame && side === 'right' && d.head.rightB) head = d.head.rightB
  const legs = (side === 'right' ? LEGS_SIDE : LEGS_FRONT)[frame]
  const rows = [...head, ...d.body[side], ...legs]
  return facing === 'left' ? mirror(rows) : rows
}
