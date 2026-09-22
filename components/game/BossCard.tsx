'use client'

import Link from 'next/link'
import BossSprite from './BossSprite'
import HPBar from './HPBar'
import type { Boss } from '@/types'

interface BossCardProps {
  boss: Boss
  hpCurrent?: number
  isEnabled?: boolean
  isDefeated?: boolean
  /** Override the default /battle/[id] link (e.g. "/demo/[id]") */
  href?: string
  /** Idle-bob the sprite — used to call out the current/next boss on the map */
  animated?: boolean
}

const TYPE_BADGE: Record<string, string> = {
  python: 'badge-python',
  sql:    'badge-sql',
  mixed:  'badge-mixed',
  final:  'badge-final',
}

const TYPE_LABEL: Record<string, string> = {
  python: 'Python',
  sql:    'SQL',
  mixed:  'Python + SQL',
  final:  'Final',
}

export default function BossCard({ boss, hpCurrent, isEnabled = false, isDefeated = false, href, animated = false }: BossCardProps) {
  const hp = hpCurrent ?? boss.hpMax

  const content = (
    <div
      className={`card group flex flex-col gap-3 p-4 transition-all duration-150 ${
        isEnabled && !isDefeated
          ? 'hover:border-border2 hover:shadow-lg cursor-pointer'
          : isDefeated
          ? 'opacity-60'
          : 'opacity-40 cursor-not-allowed grayscale'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="label-mono mb-0.5">{boss.title}</div>
          <h3 className="font-mono text-sm font-bold leading-snug text-tx">{boss.name}</h3>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`badge ${TYPE_BADGE[boss.type]}`}>{TYPE_LABEL[boss.type]}</span>
          {isDefeated && <span className="badge badge-python text-[10px]">Derrotado</span>}
          {!isEnabled && !isDefeated && <span className="badge badge-sql text-[10px] opacity-60">Bloqueado</span>}
        </div>
      </div>

      {/* Sprite + info */}
      <div className="flex items-center gap-4">
        <BossSprite boss={boss} size="sm" defeated={isDefeated} animated={animated && !isDefeated} hpRatio={hp / boss.hpMax} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-tx3 leading-relaxed line-clamp-2">{boss.description}</p>
          <p className="label-mono mt-2 truncate" style={{ color: boss.color }}>
            {boss.topic}
          </p>
        </div>
      </div>

      {/* HP */}
      <HPBar current={hp} max={boss.hpMax} size="sm" showNumbers={false} color={boss.color} />

      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        <span className={`status-dot ${isDefeated ? 'defeated' : isEnabled ? 'active' : 'locked'}`} />
        <span className="text-xs text-tx3">
          {isDefeated ? 'Completado' : isEnabled ? 'Disponible' : 'Clase ' + boss.classNumber}
        </span>
      </div>
    </div>
  )

  if (isEnabled && !isDefeated) {
    return <Link href={href ?? `/battle/${boss.id}`}>{content}</Link>
  }

  return content
}
