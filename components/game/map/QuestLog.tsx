'use client'

import { IconCheck, IconLock } from '@/components/ui/PixelIcons'
import { ACT_MAPS } from '@/lib/game/act-maps'
import BossTopicIcon from './BossTopicIcon'
import type { NodeState } from './MapNodeIcon'

interface Props {
  bossStates: Record<string, NodeState>
  activeActKey: string
  onSelectAct: (index: number) => void
}

// Lista de los 14 jefes agrupados por acto, con su estado — para que el
// progreso se lea de un vistazo sin tener que caminar hasta cada puerta.
// Clic en un acto que no es el activo lo abre. Sin chrome propio: vive
// dentro de la ventana BITÁCORA.LOG (AppWindow ya pone el marco y el título).
export default function QuestLog({ bossStates, activeActKey, onSelectAct }: Props) {
  return (
    <aside className="w-full flex flex-col" style={{ maxHeight: 420 }} aria-label="Bitácora de misión">
      <div className="overflow-y-auto flex-1 min-h-0">
        {ACT_MAPS.map((act) => (
          <div key={act.key}>
            <button
              type="button"
              onClick={() => onSelectAct(act.index)}
              className="w-full text-left px-2.5 py-1 flex items-center justify-between"
              style={{
                background: act.key === activeActKey ? 'hsl(var(--accent) / 0.14)' : 'hsl(var(--surface2))',
                borderTop: '1px solid hsl(var(--border))',
                borderBottom: '1px solid hsl(var(--border))',
                cursor: 'pointer',
              }}
            >
              <span className="label-mono" style={{ color: act.key === activeActKey ? 'hsl(var(--accent))' : 'hsl(var(--tx2))' }}>
                {act.roman} · {act.title.toUpperCase()}
              </span>
              <span className="tabular label-mono">{act.bosses.filter((b) => bossStates[b.id] === 'defeated').length}/{act.bosses.length}</span>
            </button>

            {act.bosses.map((boss) => {
              const state = bossStates[boss.id] ?? 'locked'
              return (
                <div key={boss.id} className="flex items-center gap-2 px-2.5 py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <span
                    className="shrink-0 flex items-center justify-center"
                    style={{ width: 18, height: 18, border: '2px solid hsl(var(--tx))', opacity: state === 'locked' ? 0.45 : 1 }}
                  >
                    <BossTopicIcon bossId={boss.id} size={10} color="hsl(var(--tx))" />
                  </span>
                  <span
                    className="flex-1 min-w-0 truncate"
                    style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 17, color: state === 'locked' ? 'hsl(var(--tx3))' : 'hsl(var(--tx2))' }}
                  >
                    {boss.name}
                  </span>
                  <span className="shrink-0">
                    {state === 'defeated' && <IconCheck size={11} color="hsl(var(--accent))" />}
                    {state === 'locked' && <IconLock size={10} color="hsl(var(--tx3))" />}
                    {state === 'current' && <span style={{ width: 6, height: 6, display: 'block', background: 'hsl(var(--accent))' }} />}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}
