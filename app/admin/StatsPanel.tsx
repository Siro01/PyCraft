'use client'

import { useMemo, useState } from 'react'
import { CHALLENGES } from '@/lib/game/challenges'
import { computeStats, formatDuration, type AttackRow, type BattleRow } from '@/lib/admin/stats'
import type { Boss } from '@/types'

interface Aula { id: string; nombre: string; turno: string }
interface Student { id: string; username: string; role: string; aula_id: string | null }

interface StatsPanelProps {
  bosses: Boss[]
  aulas: Aula[]
  students: Student[]
  battles: BattleRow[]
  attacks: AttackRow[]
}

const CHALLENGE_TITLE = new Map(CHALLENGES.map((c) => [c.id, c.title]))
const MIN_ATTEMPTS_HARDEST = 3

function ago(ts: number | null): string {
  if (ts === null) return '—'
  const min = Math.floor((Date.now() - ts) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`
  return `hace ${Math.floor(min / 1440)} d`
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="label-mono mb-1">{label}</div>
      <div className="font-mono text-2xl font-bold text-tx tabular">{value}</div>
      {sub && <div className="text-xs text-tx3 mt-0.5">{sub}</div>}
    </div>
  )
}

function Bar({ value, total }: { value: number; total: number }) {
  const width = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-surface2 border border-border">
        <div className="h-full bg-python" style={{ width: `${width}%` }} />
      </div>
      <span className="font-mono text-xs text-tx2 tabular w-12 text-right">{value}/{total}</span>
    </div>
  )
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface2">
              {head.map((h) => <th key={h} className="px-4 py-2.5 text-left label-mono whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}

export default function StatsPanel({ bosses, aulas, students, battles, attacks }: StatsPanelProps) {
  const [aulaId, setAulaId] = useState('')

  const scoped = useMemo(
    () => students.filter((s) => s.role === 'student' && (!aulaId || s.aula_id === aulaId)),
    [students, aulaId],
  )
  const stats = useMemo(
    () => computeStats(scoped.map((s) => s.id), bosses.map((b) => b.id), battles, attacks),
    [scoped, bosses, battles, attacks],
  )

  const nameOf = new Map(scoped.map((s) => [s.id, s.username]))
  const aulaOf = new Map(aulas.map((a) => [a.id, a.nombre]))
  const studentAula = new Map(scoped.map((s) => [s.id, s.aula_id ? aulaOf.get(s.aula_id) ?? '—' : 'Sin aula']))
  const bossName = new Map(bosses.map((b) => [b.id, b.name]))

  const hardest = stats.challenges
    .filter((c) => c.attempts >= MIN_ATTEMPTS_HARDEST)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts)
    .slice(0, 5)

  const rankedStudents = [...stats.students].sort((a, b) => b.defeated - a.defeated || b.attempts - a.attempts)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="label-mono">Aula</span>
        <select className="input max-w-[280px]" value={aulaId} onChange={(e) => setAulaId(e.target.value)}>
          <option value="">Todas las aulas</option>
          {aulas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Alumnos" value={String(stats.totals.students)} />
        <Kpi
          label="Jefes derrotados"
          value={String(stats.totals.defeats)}
          sub={stats.totals.students ? `de ${stats.totals.students * bosses.length} posibles` : undefined}
        />
        <Kpi
          label="Precisión"
          value={stats.totals.accuracy === null ? '—' : `${stats.totals.accuracy}%`}
          sub={`${stats.totals.attempts} intentos`}
        />
        <Kpi label="Tiempo por jefe" value={formatDuration(stats.totals.avgTimeMs)} sub="promedio de los derrotados" />
      </div>

      <section className="flex flex-col gap-2">
        <div className="label-mono">Por jefe</div>
        <Table head={['Jefe', 'Lo abrieron', 'Lo derrotaron', 'Precisión', 'Tiempo promedio']}>
          {bosses.map((b, i) => {
            const s = stats.bosses.find((x) => x.bossId === b.id)!
            return (
              <tr key={b.id} className={`border-b border-border text-sm ${i % 2 === 0 ? '' : 'bg-surface2/40'}`}>
                <td className="px-4 py-2.5">
                  <span className="font-mono text-xs text-tx3 mr-2">{String(b.classNumber).padStart(2, '0')}</span>
                  <span className="font-mono text-tx">{b.name}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-tx2 tabular">{s.opened}</td>
                <td className="px-4 py-2.5"><Bar value={s.defeated} total={stats.totals.students} /></td>
                <td className="px-4 py-2.5 font-mono text-tx2 tabular">{s.accuracy === null ? '—' : `${s.accuracy}%`}</td>
                <td className="px-4 py-2.5 font-mono text-tx2 tabular">{formatDuration(s.avgTimeMs)}</td>
              </tr>
            )
          })}
        </Table>
        <p className="text-xs text-tx3">
          El tiempo cuenta solo la actividad real: las pausas de más de 15 minutos no suman.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="label-mono">Por alumno</div>
        <Table head={['Alumno', 'Aula', 'Jefes derrotados', 'Intentos', 'Precisión', 'Tiempo activo', 'Última actividad']}>
          {rankedStudents.map((s, i) => (
            <tr key={s.id} className={`border-b border-border text-sm ${i % 2 === 0 ? '' : 'bg-surface2/40'}`}>
              <td className="px-4 py-2.5 font-mono text-tx">{nameOf.get(s.id)}</td>
              <td className="px-4 py-2.5 text-xs text-tx3">{studentAula.get(s.id)}</td>
              <td className="px-4 py-2.5"><Bar value={s.defeated} total={bosses.length} /></td>
              <td className="px-4 py-2.5 font-mono text-tx2 tabular">{s.attempts}</td>
              <td className="px-4 py-2.5 font-mono text-tx2 tabular">{s.accuracy === null ? '—' : `${s.accuracy}%`}</td>
              <td className="px-4 py-2.5 font-mono text-tx2 tabular">{s.timeMs ? formatDuration(s.timeMs) : '—'}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-tx3" suppressHydrationWarning>{ago(s.lastActivity)}</td>
            </tr>
          ))}
          {rankedStudents.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center font-mono text-xs text-tx3">No hay alumnos para mostrar.</td>
            </tr>
          )}
        </Table>
      </section>

      <section className="flex flex-col gap-2">
        <div className="label-mono">Ejercicios que más cuestan</div>
        {hardest.length === 0 ? (
          <div className="card p-6 text-center font-mono text-xs text-tx3">
            Todavía no hay al menos {MIN_ATTEMPTS_HARDEST} intentos en ningún ejercicio.
          </div>
        ) : (
          <Table head={['Ejercicio', 'Jefe', 'Nivel', 'Intentos', 'Acierto', 'Lo resolvieron']}>
            {hardest.map((c, i) => (
              <tr key={c.id} className={`border-b border-border text-sm ${i % 2 === 0 ? '' : 'bg-surface2/40'}`}>
                <td className="px-4 py-2.5 font-mono text-tx">{CHALLENGE_TITLE.get(c.id)}</td>
                <td className="px-4 py-2.5 text-xs text-tx3">{bossName.get(c.bossId)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-tx2">{c.tier}</td>
                <td className="px-4 py-2.5 font-mono text-tx2 tabular">{c.attempts}</td>
                <td className="px-4 py-2.5 font-mono text-danger tabular">{Math.round((c.correct / c.attempts) * 100)}%</td>
                <td className="px-4 py-2.5 font-mono text-tx2 tabular">{c.solvedBy}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  )
}
