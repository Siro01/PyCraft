'use client'

import { useMemo, useState } from 'react'
import { SquareDot } from '@/components/ui/StatusMark'
import BossSprite from '@/components/game/BossSprite'
import { CHALLENGES } from '@/lib/game/challenges'
import { DEFAULT_TIER_ENABLED, TIER_META, TIER_ORDER } from '@/lib/game/tiers'
import { computeStats, type AttackRow, type BattleRow } from '@/lib/admin/stats'
import type { Boss, Challenge, ChallengeTier } from '@/types'

interface Aula { id: string; nombre: string; turno: string }
interface Student { id: string; role: string; aula_id: string | null }

interface ChallengesBrowserProps {
  bosses: Boss[]
  aulas: Aula[]
  students: Student[]
  aulaTierMap: Record<string, Record<string, boolean>>
  battles: BattleRow[]
  attacks: AttackRow[]
}

const TYPE_BADGE: Record<string, string> = { python: 'badge-python', sql: 'badge-sql', mixed: 'badge-mixed', final: 'badge-final' }

// Las descripciones marcan código con `backticks`.
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, i) =>
        i % 2 === 1
          ? <code key={i} className="font-mono text-xs px-1 py-0.5 bg-surface2 text-tx">{part}</code>
          : <span key={i}>{part}</span>,
      )}
    </>
  )
}

function Block({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <div className="label-mono mb-1">{label}</div>
      <pre className="font-mono text-xs text-tx bg-surface2 border border-border p-3 overflow-x-auto whitespace-pre-wrap">{children}</pre>
    </div>
  )
}

export default function ChallengesBrowser({ bosses, aulas, students, aulaTierMap, battles, attacks }: ChallengesBrowserProps) {
  const [aulaId, setAulaId] = useState(aulas[0]?.id ?? '')
  const [openBoss, setOpenBoss] = useState<string | null>(null)

  const stats = useMemo(() => {
    const ids = students.filter((s) => s.role === 'student' && (!aulaId || s.aula_id === aulaId)).map((s) => s.id)
    return computeStats(ids, bosses.map((b) => b.id), battles, attacks)
  }, [aulaId, students, bosses, battles, attacks])

  const challengeStat = new Map(stats.challenges.map((c) => [c.id, c]))
  const tierOn = (tier: ChallengeTier) =>
    aulaId ? aulaTierMap[aulaId]?.[tier] ?? DEFAULT_TIER_ENABLED[tier] : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="label-mono">Aula</span>
        <select className="input max-w-[280px]" value={aulaId} onChange={(e) => setAulaId(e.target.value)}>
          <option value="">Todas las aulas</option>
          {aulas.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        <div className="flex gap-1.5">
          {TIER_ORDER.map((t) => {
            const on = tierOn(t)
            return (
              <span
                key={t}
                className="font-mono text-[10px] px-2 py-1 pixel-corners-sm border"
                style={{
                  borderColor: on ? `hsl(var(${TIER_META[t].colorVar}))` : 'hsl(var(--border2))',
                  color: on ? `hsl(var(${TIER_META[t].colorVar}))` : 'hsl(var(--tx3))',
                  opacity: on === false ? 0.6 : 1,
                }}
                title={on === null ? 'Elegí un aula para ver qué dificultades tiene habilitadas' : undefined}
              >
                <SquareDot on={on !== false} />{TIER_META[t].label}
              </span>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-tx3">
        Para ganar, la salida del código tiene que coincidir exactamente con la <b>salida esperada</b>. Las dificultades se habilitan por aula en la pestaña Aulas.
      </p>

      <div className="flex flex-col gap-2">
        {bosses.map((boss) => {
          const isOpen = openBoss === boss.id
          const bossChallenges = CHALLENGES.filter((c) => c.bossId === boss.id)
          return (
            <div key={boss.id} className="card overflow-hidden">
              <button
                onClick={() => setOpenBoss(isOpen ? null : boss.id)}
                className="w-full p-3 flex items-center gap-4 text-left hover:bg-surface2/40 transition-colors"
                aria-expanded={isOpen}
              >
                <BossSprite boss={boss} size="sm" defeated={false} />
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-tx3">{boss.title}</div>
                  <div className="font-mono text-sm font-bold text-tx truncate">{boss.name}</div>
                  <div className="text-xs text-tx3 truncate">{boss.topic}</div>
                </div>
                <span className={`badge ${TYPE_BADGE[boss.type]}`}>{boss.type}</span>
                <span className="font-mono text-xs text-tx3 tabular shrink-0">
                  {bossChallenges.length} ejercicios · {boss.hpMax} HP
                </span>
                <span className="font-mono text-tx3 shrink-0">{isOpen ? '−' : '+'}</span>
              </button>

              {isOpen && (
                <div className="border-t border-border p-4 flex flex-col gap-6">
                  {TIER_ORDER.map((tier) => {
                    const list = bossChallenges.filter((c) => c.tier === tier).sort((a, b) => a.orderIndex - b.orderIndex)
                    if (list.length === 0) return null
                    const totalDamage = list.reduce((s, c) => s + c.damage, 0)
                    return (
                      <section key={tier} className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs font-bold" style={{ color: `hsl(var(${TIER_META[tier].colorVar}))` }}>
                            {TIER_META[tier].label}
                          </span>
                          <span className="text-xs text-tx3">{TIER_META[tier].desc}</span>
                          <span className={`font-mono text-xs tabular ml-auto ${totalDamage >= boss.hpMax ? 'text-python' : 'text-danger'}`}>
                            Daño total {totalDamage} / {boss.hpMax} HP
                          </span>
                        </div>
                        {list.map((c) => <ChallengeCard key={c.id} challenge={c} stat={challengeStat.get(c.id)} />)}
                      </section>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChallengeCard({ challenge: c, stat }: { challenge: Challenge; stat?: { attempts: number; correct: number; solvedBy: number } }) {
  const [showCode, setShowCode] = useState(false)
  const accuracy = stat && stat.attempts ? Math.round((stat.correct / stat.attempts) * 100) : null

  return (
    <div className="border border-border bg-surface p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-bold text-tx">{c.title}</span>
        <span className={`badge ${TYPE_BADGE[c.type]}`}>{c.type}</span>
        <span className="font-mono text-xs text-tx3 tabular ml-auto">-{c.damage} HP al jefe</span>
      </div>

      <p className="text-sm text-tx2"><Inline text={c.description} /></p>

      <Block label="Salida esperada (lo que resuelve el ejercicio)">{c.expectedOutput}</Block>

      <div>
        <button onClick={() => setShowCode((v) => !v)} className="font-mono text-xs text-accent hover:underline">
          {showCode ? 'Ocultar código inicial' : 'Ver código inicial'}
        </button>
        {showCode && <div className="mt-2"><Block label="Código inicial que ve el alumno">{c.initialCode}</Block></div>}
      </div>

      {c.tip && (
        <p className="text-xs text-tx3"><span className="label-mono mr-1">Pista</span><Inline text={c.tip} /></p>
      )}

      <div className="font-mono text-xs text-tx3 tabular border-t border-border pt-2">
        {stat && stat.attempts > 0
          ? `${stat.attempts} intentos · ${accuracy}% de acierto · ${stat.solvedBy} alumno${stat.solvedBy === 1 ? '' : 's'} lo resolvieron`
          : 'Sin intentos todavía'}
      </div>
    </div>
  )
}
