'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SquareDot, StatusMark } from '@/components/ui/StatusMark'
import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import { ACT_MAPS } from '@/lib/game/act-maps'
import { REPASOS } from '@/lib/game/repasos'
import { aulaLabel, type AdminAula } from './aula-label'

interface Student { id: string; username: string; role: string; aula_id: string | null }
type BoolMap = Record<string, Record<string, boolean>>
type ProgressMap = Record<string, Record<string, { beat: number; done: boolean }>>

interface Props {
  aulas: AdminAula[]
  students: Student[]
  aulaRepasoMap: BoolMap
  alumnoRepasoMap: BoolMap
  repasoProgress: ProgressMap
}

const REPASO_ACTS = ACT_MAPS
  .map((act) => ({ act, repasos: REPASOS.filter((r) => act.bosses.some((b) => b.id === r.bossId)) }))
  .filter((g) => g.repasos.length > 0)

// Repasos con Rodolfo, desde el panel: se habilitan para toda el aula (el
// grupo entero se pone al día antes de un jefe) o solo para quien faltó. El
// alumno los encuentra en la Escuelita de Rodolfo, en el mapa del acto.
export default function RepasosPanel({ aulas, students, aulaRepasoMap: initialAula, alumnoRepasoMap: initialAlumno, repasoProgress }: Props) {
  const [aulaId, setAulaId] = useState(aulas[0]?.id ?? '')
  const [aulaMap, setAulaMap] = useState<BoolMap>(initialAula)
  const [alumnoMap, setAlumnoMap] = useState<BoolMap>(initialAlumno)
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState('')

  const roster = useMemo(
    () => students.filter((s) => s.role === 'student' && (aulaId ? s.aula_id === aulaId : !s.aula_id)),
    [students, aulaId],
  )

  const forAula = (bossId: string) => !!aulaId && !!aulaMap[aulaId]?.[bossId]
  const forStudent = (userId: string, bossId: string) => !!alumnoMap[userId]?.[bossId]
  const seesIt = (userId: string, bossId: string) => forAula(bossId) || forStudent(userId, bossId)

  const toggleAula = async (bossId: string) => {
    if (!aulaId) return
    const next = !forAula(bossId)
    const { error: e } = await createClient()
      .from('aula_repasos')
      .upsert({ aula_id: aulaId, boss_id: bossId, is_enabled: next }, { onConflict: 'aula_id,boss_id' })
    if (e) { setError(saveError(e.message)); return }
    setError('')
    setAulaMap((prev) => ({ ...prev, [aulaId]: { ...prev[aulaId], [bossId]: next } }))
  }

  const toggleStudent = async (userId: string, bossId: string) => {
    const next = !forStudent(userId, bossId)
    const { error: e } = await createClient()
      .from('alumno_repasos')
      .upsert({ user_id: userId, boss_id: bossId, is_enabled: next }, { onConflict: 'user_id,boss_id' })
    if (e) { setError(saveError(e.message)); return }
    setError('')
    setAlumnoMap((prev) => ({ ...prev, [userId]: { ...prev[userId], [bossId]: next } }))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="repaso-aula" className="label-mono">Aula</label>
          <select id="repaso-aula" className="input max-w-[360px]" value={aulaId} onChange={(e) => { setAulaId(e.target.value); setOpen(null) }}>
            {aulas.map((a) => <option key={a.id} value={a.id}>{aulaLabel(a)}</option>)}
            <option value="">Alumnos sin aula</option>
          </select>
          <span className="font-mono text-xs text-tx3">{roster.length} alumno{roster.length === 1 ? '' : 's'}</span>
        </div>
        <p className="text-sm text-tx2" style={{ maxWidth: '72ch' }}>
          Un repaso es una actividad corta y guiada por Rodolfo, con lo mínimo para encarar cada jefe.
          Habilitalo <strong className="text-tx">para toda el aula</strong> o <strong className="text-tx">solo para quien faltó</strong>:
          le aparece la Escuelita de Rodolfo en el mapa de ese acto.
        </p>
        {error && <span className="font-mono text-xs text-danger"><StatusMark ok={false} />{error}</span>}
      </div>

      {REPASO_ACTS.map(({ act, repasos }) => (
        <section key={act.key} className="flex flex-col gap-2">
          <h3 className="label-mono" style={{ color: 'hsl(var(--tx2))' }}>{act.roman} · {act.title}</h3>
          {repasos.map((r) => {
            const boss = act.bosses.find((b) => b.id === r.bossId)!
            const whole = forAula(r.bossId)
            const individual = roster.filter((s) => forStudent(s.id, r.bossId)).length
            const assigned = roster.filter((s) => seesIt(s.id, r.bossId))
            const done = assigned.filter((s) => repasoProgress[s.id]?.[r.bossId]?.done).length
            const expanded = open === r.bossId
            return (
              <div key={r.bossId} className="card">
                <div className="p-3 flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center justify-center shrink-0" style={{ width: 38, height: 38, border: '3px double hsl(var(--tx))', background: 'hsl(var(--bg))' }}>
                    <BossTopicIcon bossId={r.bossId} size={16} color="hsl(var(--tx))" />
                  </span>
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-mono text-xs text-tx3">Antes del jefe {boss.classNumber} · {boss.name}</div>
                    <div className="font-mono text-sm font-bold text-tx">{r.title}</div>
                    <div className="text-xs text-tx3">{r.topics.join(' · ')} · {r.beats.length} pasos</div>
                  </div>
                  {assigned.length > 0 && (
                    <span className="font-mono text-xs text-tx2 tabular" title="Alumnos que ya lo terminaron">
                      {done}/{assigned.length} terminaron
                    </span>
                  )}
                  {aulaId && (
                    <button
                      onClick={() => toggleAula(r.bossId)}
                      aria-pressed={whole}
                      className={`font-mono text-xs px-3 py-1.5 pixel-corners-sm border transition-all shrink-0 ${
                        whole ? 'border-python/50 text-python bg-python/10 hover:bg-python/20' : 'border-border text-tx3 hover:border-border2 hover:text-tx'
                      }`}
                    >
                      <SquareDot on={whole} />{whole ? 'Toda el aula' : 'Aula: no'}
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(expanded ? null : r.bossId)}
                    aria-expanded={expanded}
                    className="font-mono text-xs px-3 py-1.5 pixel-corners-sm border border-border text-tx2 hover:border-border2 hover:text-tx transition-all shrink-0"
                  >
                    {expanded ? 'Cerrar' : individual > 0 ? `Por alumno (${individual})` : 'Por alumno'}
                  </button>
                </div>

                {expanded && (
                  <div className="px-3 pb-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    {roster.length === 0 ? (
                      <p className="font-mono text-xs text-tx3 pt-3">No hay alumnos en esta aula.</p>
                    ) : (
                      <ul className="grid gap-1 pt-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
                        {roster.map((s) => {
                          const own = forStudent(s.id, r.bossId)
                          const p = repasoProgress[s.id]?.[r.bossId]
                          const status = p?.done ? 'Terminado' : p && p.beat > 0 ? `Paso ${p.beat + 1}/${r.beats.length}` : seesIt(s.id, r.bossId) ? 'Sin empezar' : ''
                          return (
                            <li key={s.id}>
                              <label className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-surface2" style={{ border: '1px solid hsl(var(--border))' }}>
                                <input
                                  type="checkbox"
                                  checked={whole || own}
                                  disabled={whole}
                                  onChange={() => toggleStudent(s.id, r.bossId)}
                                  style={{ accentColor: 'hsl(var(--accent))', width: 16, height: 16 }}
                                />
                                <span className="font-mono text-sm text-tx truncate flex-1">{s.username}</span>
                                <span className={`font-mono text-xs shrink-0 ${p?.done ? 'text-python' : 'text-tx3'}`}>
                                  {p?.done && <StatusMark ok scale={1} />}
                                  {whole && !p ? 'por aula' : status}
                                </span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      ))}

    </div>
  )
}

function saveError(msg: string): string {
  return /relation .* does not exist|schema cache/i.test(msg)
    ? 'Falta correr la migración 011_repasos.sql en Supabase.'
    : `No se pudo guardar: ${msg}`
}
