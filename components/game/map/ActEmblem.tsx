'use client'

import { IconDatabase, IconLink, IconSnake } from '@/components/ui/PixelIcons'
import { PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'

// Un ícono por acto, para que el alumno reconozca dónde está sin leer:
// la serpiente (Python), el cilindro (SQLite), el eslabón (Python + SQL) y
// la capucha del Arquitecto con sus dos ojos encendidos (acento).

const HOOD = [
  '....####....',
  '..##hhhh##..',
  '.#hhhhhhhh#.',
  '.#hh####hh#.',
  '#hh#bbbb#hh#',
  '#h#babbab#h#',
  '#h#bbbbbb#h#',
  '#h#bbbbbb#h#',
  '#hh#bbbb#hh#',
  '#hhh####hhh#',
  '#hhhhhhhhhh#',
  '############',
]

export default function ActEmblem({ actKey, size = 18, color = 'currentColor' }: { actKey: string; size?: number; color?: string }) {
  if (actKey === 'python') return <IconSnake size={size} color={color} />
  if (actKey === 'sql') return <IconDatabase size={size} color={color} />
  if (actKey === 'mixed') return <IconLink size={size} color={color} />
  return <PixelBitmap rows={HOOD} scale={Math.max(1, Math.round(size / 12))} ink={color} />
}
