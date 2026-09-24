'use client'

import Link from 'next/link'
import BossSprite from './BossSprite'
import HPBar from './HPBar'
import Win from '@/components/ui/Win'
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

const TYPE_LABEL: Record<string, string> = {
  python: 'Python',
  sql:    'SQL',
  mixed:  'Python + SQL',
  final:  'Final',
}

const vt = 'var(--font-vt323), monospace'

// Cada jefe es una ventana del escritorio: barra sólida = disponible para combatir,
// barra rayada = ya derrotado o todavía bloqueado.
export default function BossCard({ boss, hpCurrent, isEnabled = false, isDefeated = false, href, animated = false }: BossCardProps) {
  const hp = hpCurrent ?? boss.hpMax
  const playable = isEnabled && !isDefeated

  const content = (
    <Win
      title={boss.name}
      active={playable}
      right={
        <span
          style={{
            fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 2,
            color: playable ? 'hsl(var(--bg))' : 'hsl(var(--tx2))',
            background: playable ? 'transparent' : 'hsl(var(--surface))', padding: playable ? 0 : '1px 5px',
          }}
        >
          {isDefeated ? 'Derrotado' : !isEnabled ? 'Bloqueado' : TYPE_LABEL[boss.type]}
        </span>
      }
      className={`group transition-transform duration-100 ${
        playable ? 'hover:-translate-x-0.5 hover:-translate-y-0.5 cursor-pointer' : isDefeated ? 'opacity-70' : 'opacity-45 cursor-not-allowed grayscale'
      }`}
      bodyStyle={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div className="flex items-center gap-4">
        <BossSprite boss={boss} size="sm" defeated={isDefeated} animated={animated && !isDefeated} hpRatio={hp / boss.hpMax} />
        <div className="flex-1 min-w-0">
          <div className="label-mono mb-0.5">{boss.title} · {TYPE_LABEL[boss.type]}</div>
          <p style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.1, color: 'hsl(var(--tx2))' }} className="line-clamp-2">{boss.description}</p>
          <p className="label-mono mt-1.5 truncate" style={{ color: playable ? 'hsl(var(--accent))' : 'hsl(var(--tx3))' }}>
            {boss.topic}
          </p>
        </div>
      </div>

      <HPBar current={hp} max={boss.hpMax} size="sm" showNumbers={false} color={playable ? 'hsl(var(--accent))' : 'hsl(var(--border2))'} />

      <div className="flex items-center gap-1.5">
        <span className={`status-dot ${isDefeated ? 'defeated' : isEnabled ? 'active' : 'locked'}`} />
        <span style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx3))' }}>
          {isDefeated ? 'Completado' : isEnabled ? 'Disponible' : 'Clase ' + boss.classNumber}
        </span>
      </div>
    </Win>
  )

  if (playable) {
    return <Link href={href ?? `/battle/${boss.id}`} className="block">{content}</Link>
  }

  return content
}
