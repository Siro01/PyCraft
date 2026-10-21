'use client'

import { useMemo, useState } from 'react'
import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import { CHALLENGES } from '@/lib/game/challenges'
import { DEFAULT_TIER_ENABLED, TIER_META, TIER_ORDER } from '@/lib/game/tiers'
import { computeStats, type AttackRow, type BattleRow } from '@/lib/admin/stats'
import { sfx } from '@/lib/game/architect/sound'
import type { Boss, Challenge, ChallengeTier } from '@/types'

// EJERCICIOS.EXE: los jefes a la izquierda; a la derecha, los ejercicios del
// jefe elegido por dificultad, como renglones. La consigna, la salida
// esperada, el código inicial y la pista quedan detrás de un clic.

interface Alumno { id: string }

interface Props {
  bosses: Boss[]
  /** Alumnos ya filtrados por el aula activa (para el % de acierto). */
  alumnos: Alumno[]
  /** Aula concreta (para saber qué dificultades tiene); null con "Todas" o "Sin aula". */
  aulaId: string | null
  aulaTierMap: Record<string, Record<string, boolean>>
  battles: BattleRow[]
  attacks: AttackRow[]
  narrow: boolean
}

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

// Las consignas marcan código con `backticks`.
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, i) =>
        i % 2 === 1
          ? <code key={i} style={{ fontFamily: vt, fontSize: '1.05em', padding: '0 4px', background: 'hsl(var(--surface2))', color: 'hsl(var(--tx))' }}>{part}</code>
          : <span key={i}>{part}</span>,
      )}
    </>
  )
}

export default function EjerciciosWindow({ bosses, alumnos, aulaId, aulaTierMap, battles, attacks, narrow }: Props) {
  const [bossId, setBossId] = useState<string | null>(narrow ? null : bosses[0]?.id ?? null)
  const [tier, setTier] = useState<ChallengeTier>('junior')
  const [openId, setOpenId] = useState<string | null>(null)

  const stats = useMemo(
    () => computeStats(alumnos.map((s) => s.id), bosses.map((b) => b.id), battles, attacks),
    [alumnos, bosses, battles, attacks],
  )
  const statOf = new Map(stats.challenges.map((c) => [c.id, c]))
  const tierOn = (t: ChallengeTier) => (aulaId ? aulaTierMap[aulaId]?.[t] ?? DEFAULT_TIER_ENABLED[t] : null)

  const boss = bosses.find((b) => b.id === bossId) ?? null
  const ofBoss = boss ? CHALLENGES.filter((c) => c.bossId === boss.id) : []
  const list = ofBoss.filter((c) => c.tier === tier).sort((a, b) => a.orderIndex - b.orderIndex)
  const dmg = list.reduce((s, c) => s + c.damage, 0)

  const pickBoss = (id: string) => {
    sfx.click()
    setBossId(id)
    setOpenId(null)
    // Si el jefe no tiene ejercicios en la dificultad elegida, se pasa a la primera que tenga.
    const tiers = TIER_ORDER.filter((t) => CHALLENGES.some((c) => c.bossId === id && c.tier === t))
    if (!tiers.includes(tier) && tiers[0]) setTier(tiers[0])
  }

  return (
    <div className="sys-split" data-ficha={!narrow ? '' : undefined} style={!narrow ? { gridTemplateColumns: 'minmax(220px, 0.7fr) minmax(380px, 1.3fr)' } : undefined}>
      {(!narrow || !boss) && (
        <div role="listbox" aria-label="Jefes">
          {bosses.map((b) => {
            const n = CHALLENGES.filter((c) => c.bossId === b.id).length
            return (
              <button
                key={b.id}
                type="button"
                role="option"
                aria-selected={b.id === bossId}
                className="sys-row"
                style={{ gridTemplateColumns: '22px 18px minmax(0, 1fr) auto' }}
                onClick={() => pickBoss(b.id)}
              >
                <span className="label-mono tabular" style={{ color: 'inherit', opacity: 0.7 }}>{String(b.classNumber).padStart(2, '0')}</span>
                <BossTopicIcon bossId={b.id} size={14} color="currentColor" />
                <span className="truncate" style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1 }}>{b.name}</span>
                <span className="sys-sub">{n}</span>
              </button>
            )
          })}
        </div>
      )}

      {boss && (
        <section className="sys-pane" aria-label={`Ejercicios de ${boss.name}`}>
          <header className="flex items-start gap-3">
            {narrow && <button type="button" className="sys-tool" onClick={() => { sfx.click(); setBossId(null) }}>‹ Jefes</button>}
            <div className="min-w-0 flex-1">
              <div className="label-mono">{boss.title} · {boss.hpMax} HP</div>
              <h2 style={{ fontFamily: jersey, fontSize: 26, lineHeight: 1, color: 'hsl(var(--tx))' }}>{boss.name}</h2>
              <div className="sys-sub">{boss.topic}</div>
            </div>
          </header>

          <div className="flex flex-wrap items-center gap-3">
            <div role="tablist" aria-label="Dificultad" className="sys-tabs">
              {TIER_ORDER.map((t) => {
                const n = ofBoss.filter((c) => c.tier === t).length
                const on = tierOn(t)
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tier === t}
                    disabled={n === 0}
                    className="aula-seg"
                    style={{ opacity: n === 0 ? 0.35 : 1, textDecoration: on === false ? 'line-through' : undefined }}
                    title={`${TIER_META[t].desc}${on === false ? ' — deshabilitada en esta aula' : ''}`}
                    onClick={() => { sfx.tab(); setTier(t); setOpenId(null) }}
                  >
                    {TIER_META[t].label} <span style={{ opacity: 0.7 }}>{n}</span>
                  </button>
                )
              })}
            </div>
            <span style={{ flex: 1 }} />
            <span className="sys-num" title="Si la suma no alcanza la vida del jefe, no se lo puede derrotar en esta dificultad" style={{ color: dmg >= boss.hpMax ? 'hsl(var(--tx2))' : 'hsl(var(--danger))' }}>
              daño {dmg}/{boss.hpMax} HP
            </span>
          </div>

          <div className="flex flex-col">
            {list.map((c, i) => (
              <Ejercicio key={c.id} n={i + 1} c={c} stat={statOf.get(c.id)} open={openId === c.id} onToggle={() => { sfx.click(); setOpenId(openId === c.id ? null : c.id) }} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Ejercicio({ n, c, stat, open, onToggle }: { n: number; c: Challenge; stat?: { attempts: number; correct: number; solvedBy: number }; open: boolean; onToggle: () => void }) {
  const [code, setCode] = useState(false)
  const acc = stat && stat.attempts ? Math.round((stat.correct / stat.attempts) * 100) : null
  return (
    <div>
      <button
        type="button"
        className="sys-row"
        aria-expanded={open}
        style={{ gridTemplateColumns: '20px minmax(0, 1fr) 64px 56px' }}
        onClick={onToggle}
      >
        <span className="label-mono tabular" style={{ color: 'inherit', opacity: 0.7 }}>{n}</span>
        <span className="truncate" style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1 }}>{c.title}</span>
        <span className="sys-num" title="Daño al jefe">−{c.damage}</span>
        <span className="sys-num" title={stat?.attempts ? `${stat.attempts} intentos · ${stat.solvedBy} lo resolvieron` : 'Sin intentos todavía'}>{acc === null ? '—' : `${acc}%`}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 win-pop" style={{ padding: '12px 8px 16px', borderBottom: '2px solid hsl(var(--tx))' }}>
          <p style={{ fontFamily: vt, fontSize: 19, lineHeight: 1.25, color: 'hsl(var(--tx))' }}><Inline text={c.description} /></p>
          <div>
            <div className="label-mono" style={{ marginBottom: 4 }}>Salida esperada</div>
            <pre className="sys-code">{c.expectedOutput}</pre>
          </div>
          <div>
            <button type="button" className="sys-tool" aria-expanded={code} onClick={() => setCode((v) => !v)}>{code ? 'Ocultar código inicial' : 'Código inicial'}</button>
            {code && <pre className="sys-code" style={{ marginTop: 8 }}>{c.initialCode}</pre>}
          </div>
          {c.tip && <p className="sys-sub"><span className="label-mono" style={{ marginRight: 6 }}>Pista</span><Inline text={c.tip} /></p>}
          {stat && stat.attempts > 0 && (
            <p className="sys-sub">{stat.attempts} intentos · {stat.solvedBy} alumno{stat.solvedBy === 1 ? '' : 's'} lo resolvieron</p>
          )}
        </div>
      )}
    </div>
  )
}
