'use client'

import { useEffect, useState } from 'react'
import { PixelGrid } from '@/components/game/items/ItemSprites'
import { AVATAR_IDS, avatarInfo, avatarRows, type AvatarId, type Facing } from '@/components/game/map/avatars'
import { sfx } from '@/lib/game/architect/sound'
import { MAP_PALETTES, type MapTheme } from '@/lib/game/act-maps'

const pal = (t: MapTheme) => MAP_PALETTES[t] as React.CSSProperties

const ORDER: Facing[] = ['down', 'right', 'up', 'left']
const LETTER = ['A', 'B', 'C']

// Los 3 personajes propuestos, caminando en el lugar y girando por las 4
// direcciones; elegir uno lo pone en el mapa de abajo.
export default function AvatarShowcase({ value, onChange }: { value: AvatarId; onChange: (id: AvatarId) => void }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 220)
    return () => clearInterval(t)
  }, [])
  const frame = (tick % 2) as 0 | 1
  const facing = ORDER[Math.floor(tick / 8) % 4]

  return (
    <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Personaje del mapa">
      {AVATAR_IDS.map((id, i) => {
        const on = id === value
        const info = avatarInfo(id)
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => { sfx.confirm(); onChange(id) }}
            className="flex items-center gap-3 text-left"
            style={{
              padding: '10px 14px 10px 10px', cursor: 'pointer', minWidth: 250, flex: '1 1 250px',
              background: on ? 'hsl(var(--tx))' : 'hsl(var(--surface))', color: on ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
              border: '2px solid hsl(var(--tx))', boxShadow: on ? '4px 4px 0 hsl(var(--tx) / 0.25)' : '3px 3px 0 hsl(var(--tx) / 0.1)',
            }}
          >
            <span style={{ ...pal('light'), background: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))', padding: 4, display: 'flex', gap: 2 }}>
              <PixelGrid rows={avatarRows(id, facing, frame)} size={72} />
            </span>
            <span className="flex flex-col gap-1">
              <span style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 22, lineHeight: 1 }}>{LETTER[i]} · {info.name}</span>
              <span style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 18, lineHeight: 1.1, opacity: 0.85 }}>{info.blurb}</span>
              <span className="flex gap-1 mt-1" aria-hidden="true">
                {(['light', 'dark', 'red'] as MapTheme[]).map((t) => (
                  <span key={t} title={`Paleta ${t}`} style={{ ...pal(t), border: '1px solid currentColor', padding: 1, background: 'hsl(var(--bg))' }}>
                    <PixelGrid rows={avatarRows(id, facing, frame)} size={30} />
                  </span>
                ))}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
