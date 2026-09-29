'use client'

import { TILE_SIZE } from '@/lib/game/act-maps'

export type Facing = 'up' | 'down' | 'left' | 'right'

// Avatar de 8 bits: cuerpo simple con la dirección marcada por la posición de
// los "ojos" — nada de sprites externos, para no depender de assets nuevos.
export default function PlayerAvatar({ facing, stepping }: { facing: Facing; stepping: boolean }) {
  const eyeOffsets: Record<Facing, [number, number]> = {
    down: [0, 1],
    up: [0, -1],
    left: [-1, 0],
    right: [1, 0],
  }
  const [ex, ey] = eyeOffsets[facing]

  return (
    <div
      className={stepping ? 'map-avatar-step' : undefined}
      style={{
        width: TILE_SIZE - 10,
        height: TILE_SIZE - 10,
        background: 'hsl(var(--accent))',
        border: '2px solid hsl(var(--bg))',
        boxShadow: '0 0 0 2px hsl(var(--tx)), 2px 3px 0 hsl(var(--tx) / 0.4)',
        position: 'relative',
        imageRendering: 'pixelated',
      }}
      aria-hidden="true"
    >
      <span
        style={{
          position: 'absolute',
          width: 4, height: 4,
          left: `calc(50% - 2px + ${ex * 4}px)`,
          top: `calc(50% - 2px + ${ey * 4}px)`,
          background: 'var(--on-accent)',
        }}
      />
    </div>
  )
}
