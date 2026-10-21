'use client'

import { useMemo, useState, type ReactNode } from 'react'
import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import { CHALLENGES } from '@/lib/game/challenges'
import { TIER_META } from '@/lib/game/tiers'
import { computeStats, formatDuration, type AttackRow, type BattleRow } from '@/lib/admin/stats'
import { sfx } from '@/lib/game/architect/sound'
import { aulaLabel, type AdminAula } from '../aula-label'
import type { Boss, ChallengeTier } from '@/types'

// STATS.LOG: los números del aula activa en una sola línea y, debajo, una
// vista a la vez (por jefe, por alumno o lo que más cuesta). Renglones con
// barras segmentadas, nada de tarjetas.

interface Alumno { id: string; username: string; aula_id: string | null }

interface Props {
  bosses: Boss[]
  aulas: AdminAula[]
  /** Alumnos ya filtrados por el aula activa. */
  alumnos: Alumno[]
  todas: boolean
  battles: BattleRow[]
  attacks: AttackRow[]
}

const jersey = 'var(--font-jersey), monospace'
const CHALLENGE_TITLE = new Map(CHALLENGES.map((c) => [c.id, c.title]))
const MIN_ATTEMPTS_HARDEST = 3
const PAUSE_NOTE = 'Cuenta solo la actividad real: las pausas de más de 15 minutos no suman.'
type View = 'jefes' | 'alumnos' | 'cuesta'

function ago(ts: number | null): string {
  if (ts === null) return '—'
  const min = Math.floor((Date.now() - ts) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`
  return `hace ${Math.floor(min / 1440)} d`
}

function Meter({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <span className="flex items-center gap-2">
      <span className="sys-meter" style={{ flex: 1 }} aria-hidden><span style={{ width: `calc(${pct}% - 2px)` }} /></span>
      <span className="sys-num" style={{ minWidth: 44, textAlign: 'right' }}>{value}/{total}</span>
    </span>
  )
}

export default function StatsWindow({ bosses, aulas, alumnos, todas, battles, attacks }: Props) {
  const [view, setView] = useState<View>('jefes')
  const stats = useMemo(
    () => computeStats(alumnos.map((s) => s.id), bosses.map((b) => b.id), battles, attacks),
    [alumnos, bosses, battles, attacks],
  )
  const nameOf = new Map(alumnos.map((s) => [s.id, s]))
  const bossOf = new Map(bosses.map((b) => [b.id, b]))
  const aulaOf = (id: string | null) => { const a = aulas.find((x) => x.id === id); return a ? aulaLabel(a) : 'Sin aula' }

  const hardest = stats.challenges
    .filter((c) => c.attempts >= MIN_ATTEMPTS_HARDEST)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts)
    .slice(0, 5)
  const ranked = [...stats.students].sort((a, b) => b.defeated - a.defeated || b.attempts - a.attempts)

  const tabs: { id: View; label: string }[] = [
    { id: 'jefes', label: 'Por jefe' },
    { id: 'alumnos', label: 'Por alumno' },
    { id: 'cuesta', label: 'Lo que más cuesta' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <dl className="sys-stats">
        <Stat k="Alumnos" v={stats.totals.students} />
        <Stat k="Jefes derrotados" v={<>{stats.totals.defeats}<span className="sys-sub"> de {stats.totals.students * bosses.length}</span></>} />
        <Stat k="Precisión" v={<>{stats.totals.accuracy === null ? '—' : `${stats.totals.accuracy}%`}<span className="sys-sub"> en {stats.totals.attempts}</span></>} />
        <Stat k="Tiempo por jefe" v={formatDuration(stats.totals.avgTimeMs)} title={PAUSE_NOTE} />
      </dl>

      <div role="tablist" aria-label="Vista" className="sys-tabs">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={view === t.id} className="aula-seg" onClick={() => { sfx.tab(); setView(t.id) }}>
            {t.label}
          </button>
        ))}
      </div>

      {view === 'jefes' && (
        <div role="table" className="sys-table" aria-label="Por jefe">
          <Head cols={COLS_JEFES} labels={['Jefe', 'Lo derrotaron', 'Abrieron', 'Precisión', 'Tiempo']} titles={{ 4: PAUSE_NOTE }} />
          {bosses.map((b) => {
            const s = stats.bosses.find((x) => x.bossId === b.id)!
            return (
              <div key={b.id} role="row" className="sys-row sys-row--hover" style={{ gridTemplateColumns: COLS_JEFES }}>
                <span role="cell" className="flex items-center gap-2 min-w-0">
                  <span className="label-mono tabular" style={{ width: 18 }}>{String(b.classNumber).padStart(2, '0')}</span>
                  <BossTopicIcon bossId={b.id} size={14} color="hsl(var(--tx2))" />
                  <span className="truncate" style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1 }}>{b.name}</span>
                </span>
                <span role="cell"><Meter value={s.defeated} total={stats.totals.students} /></span>
                <span role="cell" className="sys-num">{s.opened}</span>
                <span role="cell" className="sys-num">{s.accuracy === null ? '—' : `${s.accuracy}%`}</span>
                <span role="cell" className="sys-num">{formatDuration(s.avgTimeMs)}</span>
              </div>
            )
          })}
        </div>
      )}

      {view === 'alumnos' && (
        <div role="table" className="sys-table" aria-label="Por alumno">
          <Head cols={COLS_ALUMNOS} labels={['Alumno', 'Jefes', 'Intentos', 'Precisión', 'Tiempo', 'Última vez']} titles={{ 4: PAUSE_NOTE }} />
          {ranked.map((s) => {
            const a = nameOf.get(s.id)
            return (
              <div key={s.id} role="row" className="sys-row sys-row--hover" style={{ gridTemplateColumns: COLS_ALUMNOS }}>
                <span role="cell" className="min-w-0">
                  <span className="block truncate" style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1 }}>{a?.username}</span>
                  {todas && <span className="block truncate sys-sub">{aulaOf(a?.aula_id ?? null)}</span>}
                </span>
                <span role="cell"><Meter value={s.defeated} total={bosses.length} /></span>
                <span role="cell" className="sys-num">{s.attempts}</span>
                <span role="cell" className="sys-num">{s.accuracy === null ? '—' : `${s.accuracy}%`}</span>
                <span role="cell" className="sys-num">{s.timeMs ? formatDuration(s.timeMs) : '—'}</span>
                <span role="cell" className="sys-num" style={{ color: 'hsl(var(--tx2))' }} suppressHydrationWarning>{ago(s.lastActivity)}</span>
              </div>
            )
          })}
          {ranked.length === 0 && <p className="sys-sub" style={{ padding: '12px 8px' }}>No hay alumnos acá todavía.</p>}
        </div>
      )}

      {view === 'cuesta' && (
        hardest.length === 0 ? (
          <p className="sys-sub" style={{ padding: '4px 0' }}>Todavía ningún ejercicio tiene {MIN_ATTEMPTS_HARDEST} intentos.</p>
        ) : (
          <div role="table" className="sys-table" aria-label="Lo que más cuesta">
            <Head cols={COLS_CUESTA} labels={['Ejercicio', 'Acierto', 'Intentos', 'Resolvieron']} />
            {hardest.map((c) => {
              const b = bossOf.get(c.bossId)
              const pct = Math.round((c.correct / c.attempts) * 100)
              return (
                <div key={c.id} role="row" className="sys-row sys-row--hover" style={{ gridTemplateColumns: COLS_CUESTA }}>
                  <span role="cell" className="min-w-0">
                    <span className="block truncate" style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1 }}>{CHALLENGE_TITLE.get(c.id)}</span>
                    <span className="block truncate sys-sub">{b?.name} · {TIER_META[c.tier as ChallengeTier]?.label ?? c.tier}</span>
                  </span>
                  <span role="cell" className="sys-num" style={{ color: 'hsl(var(--danger))', fontFamily: jersey, fontSize: 20 }}>{pct}%</span>
                  <span role="cell" className="sys-num">{c.attempts}</span>
                  <span role="cell" className="sys-num">{c.solvedBy}</span>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

const COLS_JEFES = 'minmax(180px, 1.4fr) minmax(130px, 1fr) 70px 80px 80px'
const COLS_ALUMNOS = 'minmax(140px, 1.2fr) minmax(130px, 1fr) 70px 80px 80px 96px'
const COLS_CUESTA = 'minmax(200px, 1fr) 70px 70px 90px'

function Head({ cols, labels, titles = {} }: { cols: string; labels: string[]; titles?: Record<number, string> }) {
  return (
    <div role="row" className="sys-row sys-row--head" style={{ gridTemplateColumns: cols }}>
      {labels.map((l, i) => <span key={l} role="columnheader" className="label-mono" title={titles[i]}>{l}</span>)}
    </div>
  )
}

function Stat({ k, v, title }: { k: string; v: ReactNode; title?: string }) {
  return (
    <div className="flex flex-col" title={title}>
      <dt className="label-mono">{k}</dt>
      <dd className="tabular" style={{ fontFamily: jersey, fontSize: 24, lineHeight: 1, color: 'hsl(var(--tx))' }}>{v}</dd>
    </div>
  )
}
