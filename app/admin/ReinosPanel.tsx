'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusMark } from '@/components/ui/StatusMark'
import SqlTable from '@/components/game/sql/SqlTable'
import type { TableSnapshot } from '@/lib/game/executor/sql-runner'
import { activeEntries, type JournalEntry } from '@/lib/game/reino-store'
import { aulaLabel, type AdminAula } from './aula-label'

interface Student { id: string; username: string; role: string; aula_id: string | null }

interface Props {
  aulas: AdminAula[]
  students: Student[]
}

interface Loaded {
  entries: JournalEntry[]
  tables: TableSnapshot[]
}

const SOURCE_LABEL: Record<JournalEntry['source'], string> = { libre: 'escribió', botin: 'trofeo', reinicio: 'reinició' }

function when(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Mi Reino desde el panel: el docente ve las tablas que armó cada alumno y,
// orden por orden, lo que escribió (también lo de antes de un reinicio).
export default function ReinosPanel({ aulas, students }: Props) {
  const [aulaId, setAulaId] = useState(aulas[0]?.id ?? '')
  const [open, setOpen] = useState<string | null>(null)
  const [data, setData] = useState<Record<string, Loaded>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  const roster = useMemo(
    () => students.filter((s) => s.role === 'student' && (aulaId ? s.aula_id === aulaId : !s.aula_id)),
    [students, aulaId],
  )

  const toggle = async (userId: string) => {
    if (open === userId) { setOpen(null); return }
    setOpen(userId)
    setShowAll(false)
    if (data[userId]) return
    setLoading(userId)
    const { data: rows, error: e } = await createClient()
      .from('sql_journal')
      .select('statement, source, created_at')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .limit(5000)
    setLoading(null)
    if (e) {
      setError(/sql_journal/.test(e.message) && /exist|schema cache/i.test(e.message)
        ? 'Falta correr la migración 012_sql_journal.sql en Supabase.'
        : 'No se pudo traer el reino. Probá de nuevo.')
      return
    }
    setError('')
    const entries = (rows ?? []) as JournalEntry[]
    const { openReino, reinoTables } = await import('@/lib/game/reino-engine')
    const db = await openReino(activeEntries(entries))
    const tables = reinoTables(db)
    db.close()
    setData((prev) => ({ ...prev, [userId]: { entries, tables } }))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="reino-aula" className="label-mono">Aula</label>
          <select id="reino-aula" className="input max-w-[360px]" value={aulaId} onChange={(e) => { setAulaId(e.target.value); setOpen(null) }}>
            {aulas.map((a) => <option key={a.id} value={a.id}>{aulaLabel(a)}</option>)}
            <option value="">Alumnos sin aula</option>
          </select>
          <span className="font-mono text-xs text-tx3">{roster.length} alumno{roster.length === 1 ? '' : 's'}</span>
        </div>
        <p className="text-sm text-tx2" style={{ maxWidth: '72ch' }}>
          Mi Reino es la base de datos propia de cada alumno (se abre en el mapa del Acto II después del Constructor del Vacío).
          Acá ves <strong className="text-tx">sus tablas</strong> y <strong className="text-tx">cada orden que guardó</strong>, en el orden en que las escribió.
        </p>
        {error && <span className="font-mono text-xs text-danger"><StatusMark ok={false} />{error}</span>}
      </div>

      <div className="flex flex-col gap-2">
        {roster.map((s) => {
          const d = data[s.id]
          const expanded = open === s.id
          const own = d ? d.entries.filter((e) => e.source === 'libre').length : null
          const list = d ? [...d.entries].reverse() : []
          const visible = showAll ? list : list.slice(0, 30)
          return (
            <div key={s.id} className="card">
              <div className="p-3 flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm font-bold text-tx flex-1 min-w-[160px]">{s.username}</span>
                {d && (
                  <span className="font-mono text-xs text-tx2 tabular">
                    {d.tables.length} tabla{d.tables.length === 1 ? '' : 's'} · {own} orden{own === 1 ? '' : 'es'} escritas
                  </span>
                )}
                <button
                  onClick={() => toggle(s.id)}
                  aria-expanded={expanded}
                  className="font-mono text-xs px-3 py-1.5 pixel-corners-sm border border-border text-tx2 hover:border-border2 hover:text-tx transition-all shrink-0"
                >
                  {loading === s.id ? 'Cargando…' : expanded ? 'Cerrar' : 'Ver reino'}
                </button>
              </div>

              {expanded && d && (
                <div className="px-3 pb-4 flex flex-col gap-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  {d.entries.length === 0 ? (
                    <p className="text-sm text-tx3 pt-3">Todavía no entró a su reino.</p>
                  ) : (
                    <>
                      <div className="pt-3 flex flex-wrap gap-4 items-start">
                        {d.tables.length === 0
                          ? <p className="text-sm text-tx3">Su reino está vacío ahora mismo.</p>
                          : d.tables.map((t) => <SqlTable key={t.name} label={t.name} isTable columns={t.columns} rows={t.rows} maxHeight={180} />)}
                      </div>
                      <div className="flex flex-col gap-1">
                        <h4 className="label-mono" style={{ color: 'hsl(var(--tx2))' }}>Órdenes guardadas (la más nueva arriba)</h4>
                        <ol className="flex flex-col" style={{ border: '1px solid hsl(var(--border))' }}>
                          {visible.map((e, i) => (
                            <li key={i} className="flex gap-3 items-baseline px-3 py-1.5" style={{ borderTop: i ? '1px solid hsl(var(--border))' : undefined, opacity: e.source === 'botin' ? 0.6 : 1 }}>
                              <span className="font-mono text-xs text-tx3 shrink-0 tabular" style={{ width: 92 }}>{when(e.created_at)}</span>
                              <span className="font-mono text-xs text-tx3 shrink-0" style={{ width: 60 }}>{SOURCE_LABEL[e.source]}</span>
                              <code className="font-mono text-xs text-tx whitespace-pre-wrap break-all">{e.source === 'reinicio' ? '— reinició su reino —' : e.statement}</code>
                            </li>
                          ))}
                        </ol>
                        {list.length > visible.length && (
                          <button onClick={() => setShowAll(true)} className="self-start font-mono text-xs text-tx2 hover:text-tx mt-1">
                            Ver las {list.length} órdenes
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
