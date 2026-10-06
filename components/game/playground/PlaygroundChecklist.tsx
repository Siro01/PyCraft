'use client'

import { ShopGlyph } from '@/components/game/shop/ShopIcons'
import { PLAYGROUND_DIAMONDS_COMPLETE, PLAYGROUND_DIAMONDS_PERFECT, topicReward } from '@/lib/game/playground-rewards'
import type { PlaygroundAct, PlaygroundTopic } from '@/lib/game/playground'
import type { PlaygroundState } from '@/lib/storage/local-store'
import PlaygroundTopicIcon from './PlaygroundTopicIcon'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

interface Props {
  act: PlaygroundAct
  state: PlaygroundState
  onPlay: (topic: PlaygroundTopic) => void
  /** Tanda recién tildada (vuelve de un resultado): su casilla entra animada. */
  justChecked?: string | null
}

// CHECKLIST.TXT — la lista de tandas del acto, cada una con su casilla:
// vacía (sin jugar), ✓ (terminada: +3💎) o ★ (perfecta: +2💎 más). Es a la
// vez la lista de tareas del alumno y el menú para jugarlas.
export default function PlaygroundChecklist({ act, state, onPlay, justChecked }: Props) {
  const rewards = act.topics.map((t) => topicReward(t, state))
  const done = rewards.filter((r) => r.complete).length
  const perfect = rewards.filter((r) => r.perfect).length

  return (
    <div style={{ border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface))' }}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2" style={{ borderBottom: '2px solid hsl(var(--tx))' }}>
        <span style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.04em', color: 'hsl(var(--tx))' }}>Checklist · {act.title}</span>
        <span className="label-mono tabular" style={{ color: 'hsl(var(--tx2))' }}>{done}/{act.topics.length} terminadas</span>
        <span className="label-mono tabular" style={{ color: 'hsl(var(--tx2))' }}>{perfect}/{act.topics.length} perfectas</span>
        {/* progreso del acto en segmentos, uno por tanda */}
        <span className="flex gap-1 ml-auto" aria-hidden>
          {rewards.map((r, i) => (
            <span key={i} style={{ width: 14, height: 8, border: '2px solid hsl(var(--tx))', background: r.perfect ? 'hsl(var(--accent))' : r.complete ? 'hsl(var(--tx2))' : 'transparent' }} />
          ))}
        </span>
      </div>

      <ul>
        {act.topics.map((topic, i) => {
          const r = rewards[i]
          const best = state.bestScore[topic.key]
          return (
            <li key={topic.key} style={{ borderBottom: i < act.topics.length - 1 ? '1px solid hsl(var(--border2))' : 'none' }}>
              <button
                type="button"
                onClick={() => onPlay(topic)}
                className="checklist-row"
                aria-label={`${topic.title}: ${r.perfect ? 'perfecta' : r.complete ? 'terminada' : 'sin jugar'}. Jugar tanda.`}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}
              >
                <CheckBox complete={r.complete} perfect={r.perfect} animate={justChecked === topic.key} />
                <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, border: '2px solid hsl(var(--border2))' }}>
                  <PlaygroundTopicIcon icon={topic.icon} size={14} color="hsl(var(--tx))" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block" style={{ fontFamily: jersey, fontSize: 17, color: 'hsl(var(--tx))', lineHeight: 1.1 }}>{topic.title}</span>
                  <span className="block truncate" style={{ fontFamily: vt, fontSize: 16, color: 'hsl(var(--tx3))' }}>
                    {best !== undefined ? `Mejor: ${best}/${topic.exercises.length}` : `${topic.exercises.length} ejercicios`} · {topic.blurb}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0" aria-hidden>
                  <RewardChip amount={PLAYGROUND_DIAMONDS_COMPLETE} on={r.complete} title="Por terminarla" />
                  <RewardChip amount={PLAYGROUND_DIAMONDS_PERFECT} on={r.perfect} star title="Por sacarla perfecta" />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function CheckBox({ complete, perfect, animate }: { complete: boolean; perfect: boolean; animate: boolean }) {
  return (
    <span
      className={animate ? 'checklist-tick' : undefined}
      style={{
        width: 22, height: 22, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid hsl(var(--tx))',
        background: perfect ? 'hsl(var(--accent))' : complete ? 'hsl(var(--tx))' : 'transparent',
      }}
    >
      {(complete || perfect) && (
        <svg width={14} height={14} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
          {perfect
            // estrella pixel
            ? <g fill="hsl(var(--bg))"><rect x={3} y={0} width={1} height={7} /><rect x={0} y={3} width={7} height={1} /><rect x={2} y={2} width={3} height={3} /></g>
            // tilde pixel
            : <g fill="hsl(var(--bg))"><rect x={0} y={3} width={1} height={1} /><rect x={1} y={4} width={1} height={1} /><rect x={2} y={5} width={1} height={1} /><rect x={3} y={4} width={1} height={1} /><rect x={4} y={3} width={1} height={1} /><rect x={5} y={2} width={1} height={1} /><rect x={6} y={1} width={1} height={1} /></g>}
        </svg>
      )}
    </span>
  )
}

function RewardChip({ amount, on, star, title }: { amount: number; on: boolean; star?: boolean; title: string }) {
  return (
    <span
      title={title}
      className="flex items-center gap-1 tabular"
      style={{
        fontFamily: jersey, fontSize: 14, padding: '1px 6px',
        border: `2px solid ${on ? 'hsl(var(--accent))' : 'hsl(var(--border2))'}`,
        color: on ? 'hsl(var(--accent))' : 'hsl(var(--tx3))',
        opacity: on ? 1 : 0.7,
      }}
    >
      {star && '★'}+{amount}
      <ShopGlyph glyph="crystal" size={9} color={on ? 'hsl(var(--accent))' : 'hsl(var(--tx3))'} />
    </span>
  )
}
