'use client'

import { useMemo, useState } from 'react'
import BossMap, { type BossProgressEntry } from '@/components/game/BossMap'
import { BOSSES } from '@/lib/game/bosses'
import type { AvatarId } from '@/components/game/map/avatars'
import AvatarShowcase from './AvatarShowcase'

const jersey = 'var(--font-jersey), monospace'

// Vista previa del mapa de actos sin cuenta ni guardado: se elige cuántos
// jefes derrotó el alumno y se ve el escritorio del dashboard como lo vería él
// (los jefes se habilitan hasta el siguiente al último derrotado).
export default function MapaLab() {
  const [defeated, setDefeated] = useState(2)
  const [avatar, setAvatar] = useState<AvatarId>('minero')

  const progress = useMemo(() => {
    const p: Record<string, BossProgressEntry> = {}
    BOSSES.forEach((b, i) => { if (i < defeated) p[b.id] = { hp: 0, defeated: true } })
    return p
  }, [defeated])
  const enabledIds = useMemo(() => new Set(BOSSES.slice(0, Math.min(BOSSES.length, defeated + 1)).map((b) => b.id)), [defeated])

  const btn = (on: boolean): React.CSSProperties => ({
    fontFamily: jersey, fontSize: 16, minWidth: 32, padding: '3px 8px', cursor: 'pointer',
    border: '2px solid hsl(var(--tx))', marginLeft: -2,
    background: on ? 'hsl(var(--tx))' : 'hsl(var(--surface))', color: on ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
  })

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 pt-6 flex flex-wrap items-center gap-3">
        <span className="label-mono">Jefes derrotados</span>
        <div className="flex flex-wrap" role="radiogroup" aria-label="Jefes derrotados" style={{ paddingLeft: 2 }}>
          {Array.from({ length: BOSSES.length + 1 }, (_, n) => (
            <button key={n} type="button" role="radio" aria-checked={defeated === n} onClick={() => setDefeated(n)} style={btn(defeated === n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 pt-4 flex flex-col gap-2">
        <span className="label-mono">Personaje del mapa</span>
        <AvatarShowcase value={avatar} onChange={setAvatar} />
      </div>
      <BossMap
        key={defeated}
        avatar={avatar}
        bosses={BOSSES}
        progress={progress}
        enabledIds={enabledIds}
        username="Vista previa"
        totalDefeated={defeated}
      />
    </>
  )
}
