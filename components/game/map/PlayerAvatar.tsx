'use client'

import { memo, useMemo } from 'react'
import { PixelGrid } from '@/components/game/items/ItemSprites'
import { avatarRows, DEFAULT_AVATAR, type AvatarId, type Facing } from './avatars'

export type { Facing } from './avatars'

// Personaje del alumno en el mapa. La dirección se lee por dónde mira y al
// caminar alterna dos cuadros; los diseños viven en avatars.ts.
function PlayerAvatar({ facing, frame, size, variant = DEFAULT_AVATAR }: { facing: Facing; frame: 0 | 1; size: number; variant?: AvatarId }) {
  const rows = useMemo(() => avatarRows(variant, facing, frame), [variant, facing, frame])
  return (
    <div className="map-avatar" style={{ width: size, height: size }} aria-hidden="true">
      <PixelGrid rows={rows} size={size} />
    </div>
  )
}

export default memo(PlayerAvatar)
