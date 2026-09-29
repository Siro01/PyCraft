'use client'

import { IconCheck, IconLock } from '@/components/ui/PixelIcons'
import { TILE_SIZE } from '@/lib/game/act-maps'
import BossTopicIcon from './BossTopicIcon'
import type { Boss } from '@/types'

export type NodeState = 'defeated' | 'current' | 'available' | 'locked'

interface BossNodeProps {
  boss: Boss
  state: NodeState
  focused: boolean
}

// Puerta de jefe — cuadrado con marco duro de 2px, sin relleno de color:
// el estado se lee por inversión de tinta (regla del sistema), nunca por un
// color nuevo. El glifo del tema queda adentro; el estado es una insignia
// chica en la esquina, igual que en los mapas de referencia.
export function BossNode({ boss, state, focused }: BossNodeProps) {
  const size = TILE_SIZE
  const filled = state === 'defeated' || state === 'current'

  return (
    <div
      className={state === 'current' ? 'chest-bob' : undefined}
      style={{
        width: size - 10,
        height: size - 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: filled ? 'hsl(var(--tx))' : 'hsl(var(--surface))',
        border: `2px solid ${focused ? 'hsl(var(--accent))' : 'hsl(var(--tx))'}`,
        boxShadow: state === 'current'
          ? '0 0 0 2px hsl(var(--bg)), 0 0 0 4px hsl(var(--accent))'
          : focused ? '0 0 0 2px hsl(var(--bg)), 0 0 0 4px hsl(var(--accent))' : undefined,
        opacity: state === 'locked' ? 0.55 : 1,
      }}
      aria-hidden="true"
    >
      <BossTopicIcon bossId={boss.id} size={14} color={filled ? 'hsl(var(--bg))' : state === 'locked' ? 'hsl(var(--tx3))' : 'hsl(var(--tx))'} />

      {state === 'defeated' && (
        <span className="absolute" style={{ top: -6, right: -6, width: 12, height: 12, background: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconCheck size={7} color="hsl(var(--tx))" />
        </span>
      )}
      {state === 'locked' && (
        <span className="absolute" style={{ top: -6, right: -6, width: 12, height: 12, background: 'hsl(var(--surface))', border: '2px solid hsl(var(--border2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconLock size={7} color="hsl(var(--tx3))" />
        </span>
      )}
    </div>
  )
}

interface PlaygroundNodeProps {
  reachable: boolean
  focused: boolean
}

// Ícono del patio de juegos: mismo marco cuadrado, glifo de swing en vez de
// un ícono de jefe. Bloqueado hasta que el alumno llega a ese acto.
export function PlaygroundNode({ reachable, focused }: PlaygroundNodeProps) {
  const size = TILE_SIZE
  return (
    <div
      style={{
        width: size - 10,
        height: size - 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(var(--surface))',
        border: `2px solid ${focused ? 'hsl(var(--accent))' : 'hsl(var(--tx))'}`,
        boxShadow: focused ? '0 0 0 2px hsl(var(--bg)), 0 0 0 4px hsl(var(--accent))' : undefined,
        opacity: reachable ? 1 : 0.5,
      }}
      aria-hidden="true"
    >
      {reachable ? (
        <svg width={14} height={14} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
          <g fill="hsl(var(--tx))">
            <rect x="1" y="0" width="2" height="12" />
            <rect x="13" y="0" width="2" height="12" />
            <rect x="0" y="0" width="16" height="2" />
            <rect x="6" y="5" width="2" height="7" />
            <rect x="8" y="5" width="2" height="7" />
            <rect x="3" y="12" width="10" height="2" />
            <rect x="2" y="14" width="2" height="2" />
            <rect x="12" y="14" width="2" height="2" />
          </g>
        </svg>
      ) : (
        <IconLock size={12} color="hsl(var(--tx3))" />
      )}
    </div>
  )
}
