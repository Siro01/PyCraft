'use client'

import { ICON_TEAM_SHIELD, ICON_TEAM_SWORD, PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { TEAM_COLUMN, TEAM_NAME, type Team } from '@/lib/game/arena/team'
import type { RoomTaskView } from '@/lib/game/arena/types'

// Piezas chicas del 2 vs 2: estandarte de equipo, columna de cuadraditos y mira.
// Los equipos se distinguen sin color (tema 1-bit): Espada = relleno liso,
// Escudo = relleno tramado. En el tema rojo, Espada lleva el acento.

export function TeamBanner({ team, size = 3 }: { team: Team; size?: number }) {
  return <PixelBitmap rows={team === 'espada' ? ICON_TEAM_SWORD : ICON_TEAM_SHIELD} scale={size} title={`Equipo ${TEAM_NAME[team]}`} />
}

/**
 * La columna de 3 de un jugador: lleno = resuelto · borde que late = lo está
 * resolviendo · rayado = lo tomó su compañero (relevo).
 */
export function ColumnPips({ team, tasks, ownerId, mateId }: { team: Team; tasks: RoomTaskView[]; ownerId: string; mateId: string | null }) {
  return (
    <span className="tpips" aria-hidden>
      {tasks.map((t) => {
        const relayed = !!mateId && (t.claimedBy === mateId || t.solvedBy === mateId)
        const working = !t.solvedBy && t.claimedBy === ownerId
        const cls = ['tpip', `tpip--${team}`, t.solvedBy ? 'on' : '', working ? 'tpip--now' : '', relayed ? 'tpip--relay' : ''].filter(Boolean).join(' ')
        return <span key={t.idx} className={cls} />
      })}
      {tasks.length < TEAM_COLUMN && Array.from({ length: TEAM_COLUMN - tasks.length }, (_, i) => <span key={`x${i}`} className={`tpip tpip--${team}`} />)}
    </span>
  )
}

/** Mira pixel: marca al rival que va a recibir los ataques. */
export function Crosshair({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden className="crosshair">
      <rect x="3" y="0" width="1" height="2" fill="currentColor" />
      <rect x="3" y="5" width="1" height="2" fill="currentColor" />
      <rect x="0" y="3" width="2" height="1" fill="currentColor" />
      <rect x="5" y="3" width="2" height="1" fill="currentColor" />
      <rect x="3" y="3" width="1" height="1" fill="currentColor" />
    </svg>
  )
}
