'use client'

import { sfx } from '@/lib/game/architect/sound'
import { TEXT_ZOOM_MAX, TEXT_ZOOM_MIN, TEXT_ZOOM_STEP } from '@/lib/storage/local-store'

interface Props {
  zoom: number
  onChange: (next: number) => void
}

// Controles A- / A+ — cambian el `zoom` del contenido de la ventana (letra,
// íconos y botones juntos), no solo un font-size. El mismo componente lo usan
// el patio de juegos y el de prácticas.
export default function ZoomControl({ zoom, onChange }: Props) {
  const step = (dir: 1 | -1) => {
    const next = Math.min(TEXT_ZOOM_MAX, Math.max(TEXT_ZOOM_MIN, Math.round((zoom + dir * TEXT_ZOOM_STEP) * 100) / 100))
    if (next === zoom) return
    sfx.click()
    onChange(next)
  }

  return (
    <div className="flex items-center" role="group" aria-label="Tamaño de letra">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={zoom <= TEXT_ZOOM_MIN}
        aria-label="Achicar letra"
        title="Achicar letra"
        className="label-mono"
        style={{
          width: 26, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid hsl(var(--tx))', borderRight: 'none', background: 'transparent', color: 'hsl(var(--tx2))',
          cursor: zoom <= TEXT_ZOOM_MIN ? 'default' : 'pointer', opacity: zoom <= TEXT_ZOOM_MIN ? 0.4 : 1,
        }}
      >
        A-
      </button>
      <span
        className="tabular label-mono"
        style={{ width: 40, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid hsl(var(--tx))', borderRight: 'none', color: 'hsl(var(--tx3))' }}
      >
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={zoom >= TEXT_ZOOM_MAX}
        aria-label="Agrandar letra"
        title="Agrandar letra"
        className="label-mono"
        style={{
          width: 26, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid hsl(var(--tx))', background: 'transparent', color: 'hsl(var(--tx2))',
          cursor: zoom >= TEXT_ZOOM_MAX ? 'default' : 'pointer', opacity: zoom >= TEXT_ZOOM_MAX ? 0.4 : 1,
        }}
      >
        A+
      </button>
    </div>
  )
}
