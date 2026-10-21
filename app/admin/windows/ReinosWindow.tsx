'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import SqlTable from '@/components/game/sql/SqlTable'
import type { TableSnapshot } from '@/lib/game/executor/sql-runner'
import { activeEntries, type JournalEntry } from '@/lib/game/reino-store'
import { sfx } from '@/lib/game/architect/sound'
import { aulaLabel, type AdminAula } from '../aula-label'

// REINOS.DB: Mi Reino de cada alumno. Lista a la izquierda; a la derecha,
// sus tablas como están ahora y, debajo, cada orden que guardó, como una
// consola de solo lectura (la más nueva arriba).

interface Alumno { id: string; username: string; aula_id: string | null }
interface Loaded { entries: JournalEntry[]; tables: TableSnapshot[] }

interface Props {
  /** Alumnos ya filtrados por el aula activa. */
  alumnos: Alumno[]
  aulas: AdminAula[]
  todas: boolean
  narrow: boolean
}

const jersey = 'var(--font-jersey), monospace'
const SOURCE_LABEL: Record<JournalEntry['source'], string> = { libre: 'escribió', botin: 'trofeo', reinicio: 'reinició' }
const PAGE = 30

function when(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(', ', ' ')
}

export default function ReinosWindow({ alumnos, aulas, todas, narrow }: Props) {
  const [selId, setSelId] = useState<string | null>(null)
  const [data, setData] = useState<Record<string, Loaded>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  const aulaOf = (id: string | null) => { const a = aulas.find((x) => x.id === id); return a ? aulaLabel(a) : 'Sin aula' }

  const pick = async (userId: string) => {
    sfx.click()
    setSelId(userId)
    setShowAll(false)
    setError('')
    if (data[userId]) return
    setLoading(userId)
    const { data: rows, error: e } = await createClient()
      .from('sql_journal')
      .select('statement, source, created_at')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .limit(5000)
    if (e) {
      setLoading(null)
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
    setLoading(null)
  }

  const sel = alumnos.find((a) => a.id === selId) ?? null
  const d = sel ? data[sel.id] : undefined
  const list = d ? [...d.entries].reverse() : []
  const visible = showAll ? list : list.slice(0, PAGE)

  return (
    <div className="sys-split" data-ficha={!narrow && sel ? '' : undefined} style={!narrow && sel ? { gridTemplateColumns: 'minmax(200px, 0.6fr) minmax(420px, 1.4fr)' } : undefined}>
      {(!narrow || !sel) && (
        <div role="listbox" aria-label="Alumnos">
          <div className="sys-row sys-row--head" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }} aria-hidden>
            <span className="label-mono">Alumno</span>
            <span className="label-mono">Reino</span>
          </div>
          {alumnos.map((a) => {
            const got = data[a.id]
            const own = got ? got.entries.filter((e) => e.source === 'libre').length : null
            return (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={a.id === selId}
                className="sys-row"
                style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}
                onClick={() => pick(a.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate" style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1 }}>{a.username}</span>
                  {todas && <span className="block truncate sys-sub">{aulaOf(a.aula_id)}</span>}
                </span>
                <span className="sys-sub tabular">
                  {loading === a.id ? 'abriendo…' : got ? `${got.tables.length} tabla${got.tables.length === 1 ? '' : 's'} · ${own}` : ''}
                </span>
              </button>
            )
          })}
          {alumnos.length === 0 && <p className="sys-sub" style={{ padding: '12px 8px' }}>No hay alumnos acá todavía.</p>}
        </div>
      )}

      {sel && (
        <section className="sys-pane" aria-label={`Reino de ${sel.username}`}>
          <header className="flex items-start gap-3">
            {narrow && <button type="button" className="sys-tool" onClick={() => { sfx.click(); setSelId(null) }}>‹ Alumnos</button>}
            <div className="min-w-0 flex-1">
              <div className="label-mono">Mi Reino</div>
              <h2 className="truncate" style={{ fontFamily: jersey, fontSize: 26, lineHeight: 1, color: 'hsl(var(--tx))' }}>{sel.username}</h2>
            </div>
            {!narrow && <button type="button" className="alu-x" aria-label="Cerrar reino" onClick={() => { sfx.close(); setSelId(null) }}>×</button>}
          </header>

          {error && <p className="sys-sub" style={{ color: 'hsl(var(--danger))' }}>&gt; {error}</p>}
          {!d && !error && <p className="sys-sub">Abriendo el reino…</p>}
          {d && d.entries.length === 0 && <p className="sys-sub">Todavía no entró a su reino.</p>}

          {d && d.entries.length > 0 && (
            <>
              <div>
                <h3 className="label-mono" style={{ color: 'hsl(var(--tx))', marginBottom: 8 }}>Tablas</h3>
                <div className="flex flex-wrap gap-4 items-start">
                  {d.tables.length === 0
                    ? <p className="sys-sub">Su reino está vacío ahora mismo.</p>
                    : d.tables.map((t) => <SqlTable key={t.name} label={t.name} isTable columns={t.columns} rows={t.rows} maxHeight={180} />)}
                </div>
              </div>
              <div>
                <h3 className="label-mono" style={{ color: 'hsl(var(--tx))', marginBottom: 8 }}>Órdenes · {list.length}</h3>
                <ol className="sys-console">
                  {visible.map((e, i) => (
                    <li key={i} style={{ opacity: e.source === 'botin' ? 0.6 : 1 }}>
                      <span className="tabular" style={{ color: 'hsl(var(--tx3))' }}>{when(e.created_at)}</span>
                      <span style={{ color: 'hsl(var(--tx2))' }}>{SOURCE_LABEL[e.source]}</span>
                      <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e.source === 'reinicio' ? '— reinició su reino —' : e.statement}</code>
                    </li>
                  ))}
                </ol>
                {list.length > visible.length && (
                  <button type="button" className="sys-tool" style={{ marginTop: 8 }} onClick={() => setShowAll(true)}>Ver las {list.length}</button>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  )
}
