'use client'

import BossTopicIcon from './BossTopicIcon'
import type { Boss } from '@/types'
import type { NodeState } from './MapNodeIcon'

const STATE_LABEL: Record<NodeState, string> = {
  defeated: 'Derrotado',
  current: 'Siguiente jefe',
  available: 'Disponible',
  locked: 'Bloqueado',
}

interface Props {
  boss: Boss
  state: NodeState
  /** Si no hay lugar arriba (filas cercanas al borde superior del mapa), se abre hacia abajo. */
  below?: boolean
}

// Placa que se abre al pararse (o pasar el mouse) sobre la puerta de un jefe:
// nombre, tema de la clase y estado. Reemplaza la etiqueta fija de antes por
// un detalle que aparece solo al interactuar, como pidió el docente.
export default function NodeDetailPopover({ boss, state, below = false }: Props) {
  const card = (
    <div style={{ background: 'hsl(var(--surface))', border: '2px solid hsl(var(--tx))', boxShadow: '3px 3px 0 hsl(var(--tx) / 0.25)' }}>
      <div className="flex items-center gap-1.5 px-2" style={{ background: 'hsl(var(--tx))', minHeight: 20 }}>
        <BossTopicIcon bossId={boss.id} size={11} color="hsl(var(--bg))" />
        <span style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 12, letterSpacing: '0.05em', color: 'hsl(var(--bg))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {boss.title} · {boss.name}
        </span>
      </div>
      <div className="px-2 py-1.5" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 16, lineHeight: 1.15, color: 'hsl(var(--tx2))' }}>
        {boss.topic}
      </div>
      <div className="px-2 pb-1.5 label-mono" style={{ color: state === 'locked' ? 'hsl(var(--tx3))' : 'hsl(var(--accent))' }}>
        {STATE_LABEL[state]}
      </div>
    </div>
  )

  const arrow = (
    <div
      className="mx-auto"
      style={
        below
          ? { width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '5px solid hsl(var(--tx))' }
          : { width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid hsl(var(--tx))' }
      }
    />
  )

  return (
    <div
      className="map-detail-in absolute left-1/2 pointer-events-none"
      style={below
        ? { top: '100%', transform: 'translateX(-50%)', marginTop: 10, width: 168, zIndex: 5 }
        : { bottom: '100%', transform: 'translateX(-50%)', marginBottom: 10, width: 168, zIndex: 5 }
      }
    >
      {below ? <>{arrow}{card}</> : <>{card}{arrow}</>}
    </div>
  )
}
