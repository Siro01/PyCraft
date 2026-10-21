'use client'

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import ActEmblem from '@/components/game/map/ActEmblem'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { ACT_MAPS } from '@/lib/game/act-maps'
import { REPASOS } from '@/lib/game/repasos'
import { sfx } from '@/lib/game/architect/sound'
import { aulaLabel, type AdminAula } from '../aula-label'
import type { StudentStanding } from '@/app/api/admin/compensar/route'

// ALUMNOS.EXE: lista compacta a la izquierda y la ficha del alumno elegido a
// la derecha (en pantallas angostas, una a la vez). Todo lo que se hace con
// un alumno vive en su ficha: aula, clave, repasos individuales y compensar.

export interface Alumno { id: string; username: string; role: string; aula_id: string | null; created_at: string }
type BoolMap = Record<string, Record<string, boolean>>
type ProgressMap = Record<string, Record<string, { beat: number; done: boolean }>>

export interface NuevoAlumno { username: string; password: string; aulaId: string }

interface Props {
  alumnos: Alumno[]
  aulas: AdminAula[]
  /** "Todas las aulas": la lista muestra el aula de cada uno. */
  todas: boolean
  totalBosses: number
  score: (id: string) => { defeated: number; attacks: number }
  isActive: (id: string) => boolean
  standings: Record<string, StudentStanding> | null
  standingsError: string | null
  aulaRepasos: BoolMap
  alumnoRepasos: BoolMap
  repasoProgress: ProgressMap
  narrow: boolean
  onCreate: (n: NuevoAlumno) => Promise<boolean>
  onReassign: (a: Alumno, aulaId: string) => void
  onResetClave: (a: Alumno) => void
  onToggleRepaso: (a: Alumno, bossId: string) => void
  onGrant: (a: Alumno, diamonds: number, xp: number, note: string) => Promise<string | null>
  onUndo: (a: Alumno, compId: number) => Promise<string | null>
}

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const DEFAULT_NOTE = 'Compensación por el error del 15/10 (progreso mezclado entre PCs)'

/** El alumno tiene algo que el docente debería mirar (incidente del 15/10). */
export function needsAction(s: StudentStanding | undefined): boolean {
  return !!s && (s.diamonds < 0 || (s.copied > 0 && s.compensations.length === 0))
}

export default function AlumnosWindow(p: Props) {
  const [query, setQuery] = useState('')
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const [adding, setAdding] = useState(false)
  const [selId, setSelId] = useState<string | null>(null)

  const flaggedCount = p.alumnos.filter((a) => needsAction(p.standings?.[a.id])).length
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return p.alumnos.filter((a) => (!q || a.username.toLowerCase().includes(q)) && (!onlyFlagged || needsAction(p.standings?.[a.id])))
  }, [p.alumnos, p.standings, query, onlyFlagged])

  const sel = p.alumnos.find((a) => a.id === selId) ?? null
  // Si el alumno elegido sale de la lista (cambio de aula activa), se cierra la ficha.
  useEffect(() => { if (selId && !p.alumnos.some((a) => a.id === selId)) setSelId(null) }, [p.alumnos, selId])
  useEffect(() => { if (flaggedCount === 0) setOnlyFlagged(false) }, [flaggedCount])

  const showList = !p.narrow || !sel
  const showFicha = !!sel

  return (
    <div className="flex flex-col gap-3">
      {showList && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input alu-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="buscar alumno"
            aria-label="Buscar alumno"
          />
          {flaggedCount > 0 && (
            <button type="button" className="sys-tool" aria-pressed={onlyFlagged} onClick={() => { sfx.click(); setOnlyFlagged((v) => !v) }} title="Alumnos con compras copiadas o saldo negativo (15/10)">
              ! {flaggedCount} con aviso
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" className="sys-tool" aria-expanded={adding} onClick={() => { sfx.click(); setAdding((v) => !v) }}>
            {adding ? '× Cancelar' : '+ Nuevo alumno'}
          </button>
        </div>
      )}

      {showList && adding && <NewAlumnoForm aulas={p.aulas} onCreate={async (n) => { const ok = await p.onCreate(n); if (ok) setAdding(false); return ok }} />}

      <div className="alu-split" data-ficha={showFicha && !p.narrow ? '' : undefined}>
        {showList && (
          <div role="listbox" aria-label="Alumnos" className="alu-list">
            <div className="alu-row alu-row--head" aria-hidden>
              <span className="label-mono">Alumno</span>
              <span className="label-mono">Jefes</span>
              <span className="label-mono">Nivel</span>
            </div>
            {shown.map((a) => {
              const sc = p.score(a.id)
              const st = p.standings?.[a.id]
              const flag = needsAction(st)
              const picked = a.id === selId
              return (
                <button
                  key={a.id}
                  type="button"
                  role="option"
                  aria-selected={picked}
                  className="alu-row"
                  onClick={() => { sfx.click(); setSelId(picked && !p.narrow ? null : a.id) }}
                >
                  <span className="min-w-0 flex items-center gap-2">
                    <span aria-hidden className="alu-dot" data-on={p.isActive(a.id) || undefined} title={p.isActive(a.id) ? 'Activo ahora' : undefined} />
                    <span className="min-w-0">
                      <span className="block truncate" style={{ fontFamily: jersey, fontSize: 18, lineHeight: 1 }}>{a.username}</span>
                      {p.todas && <span className="block truncate alu-sub">{aulaShort(p.aulas, a.aula_id)}</span>}
                    </span>
                    {flag && <span className="alu-flag" title="Revisar: compras copiadas o saldo negativo">!</span>}
                  </span>
                  <span className="tabular" style={{ fontFamily: vt, fontSize: 18 }}>{sc.defeated}<span className="alu-sub">/{p.totalBosses}</span></span>
                  <span className="tabular" style={{ fontFamily: vt, fontSize: 18 }}>{st ? st.level : '—'}</span>
                </button>
              )
            })}
            {shown.length === 0 && (
              <div style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))', padding: '14px 8px' }}>
                {query ? `Nadie se llama "${query}".` : onlyFlagged ? 'Nadie con aviso.' : 'No hay alumnos acá todavía.'}
              </div>
            )}
          </div>
        )}

        {showFicha && sel && (
          <Ficha key={sel.id} {...p} a={sel} onBack={p.narrow ? () => setSelId(null) : undefined} onClose={() => setSelId(null)} />
        )}
      </div>
    </div>
  )
}

function aulaShort(aulas: AdminAula[], id: string | null) {
  const a = aulas.find((x) => x.id === id)
  return a ? aulaLabel(a) : 'Sin aula'
}

function NewAlumnoForm({ aulas, onCreate }: { aulas: AdminAula[]; onCreate: (n: NuevoAlumno) => Promise<boolean> }) {
  const [n, setN] = useState<NuevoAlumno>({ username: '', password: '', aulaId: '' })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (await onCreate(n)) setN({ username: '', password: '', aulaId: n.aulaId })
  }
  return (
    <form onSubmit={submit} className="aula-new win-pop">
      <label className="flex flex-col gap-1" style={{ flex: '1 1 160px' }}>
        <span className="label-mono">Usuario</span>
        <input className="input" value={n.username} onChange={(e) => setN({ ...n, username: e.target.value })} placeholder="nombre_alumno" required autoFocus autoComplete="off" />
      </label>
      <label className="flex flex-col gap-1" style={{ flex: '1 1 140px' }}>
        <span className="label-mono">Contraseña</span>
        <input className="input" value={n.password} onChange={(e) => setN({ ...n, password: e.target.value })} placeholder="clase123" required autoComplete="off" />
      </label>
      <label className="flex flex-col gap-1" style={{ flex: '1 1 180px' }}>
        <span className="label-mono">Aula</span>
        <select className="input" value={n.aulaId} onChange={(e) => setN({ ...n, aulaId: e.target.value })}>
          {aulas.map((a) => <option key={a.id} value={a.id}>{aulaLabel(a)}</option>)}
          <option value="">Sin aula</option>
        </select>
      </label>
      <button type="submit" className="sys-tool sys-tool--solid">Crear</button>
    </form>
  )
}

// ── Ficha ────────────────────────────────────────────────────────────────

function Ficha(p: Props & { a: Alumno; onBack?: () => void; onClose: () => void }) {
  const { a } = p
  const sc = p.score(a.id)
  const st = p.standings?.[a.id]
  const active = p.isActive(a.id)

  return (
    <section className="alu-ficha win-pop" aria-label={`Ficha de ${a.username}`}>
      <header className="flex items-start gap-3">
        {p.onBack && (
          <button type="button" className="sys-tool" onClick={() => { sfx.click(); p.onBack?.() }}>‹ Alumnos</button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate" style={{ fontFamily: jersey, fontSize: 30, lineHeight: 1, color: 'hsl(var(--tx))' }}>{a.username}</h2>
          <div className="alu-sub" style={{ marginTop: 4 }}>
            {active ? 'Jugando ahora · ' : ''}desde el {new Date(a.created_at).toLocaleDateString('es-AR')}
          </div>
        </div>
        {!p.onBack && (
          <button type="button" className="alu-x" aria-label="Cerrar ficha" onClick={() => { sfx.close(); p.onClose() }}>×</button>
        )}
      </header>

      <dl className="alu-stats">
        <Stat k="Jefes" v={<>{sc.defeated}<span className="alu-sub">/{p.totalBosses}</span></>} />
        <Stat k="Ataques" v={sc.attacks} />
        <Stat k="Nivel" v={st ? st.level : '—'} />
        <Stat k="Diamantes" v={st ? <span style={{ color: st.diamonds < 0 ? 'hsl(var(--danger))' : undefined }}><Diamonds n={st.diamonds} size={13} /></span> : '—'} />
      </dl>

      <Section title="Aula">
        <div className="flex flex-wrap items-center gap-2">
          <select className="input" style={{ maxWidth: 300 }} value={a.aula_id ?? ''} onChange={(e) => p.onReassign(a, e.target.value)} aria-label={`Aula de ${a.username}`}>
            {p.aulas.map((x) => <option key={x.id} value={x.id}>{aulaLabel(x)}</option>)}
            <option value="">Sin aula</option>
          </select>
          <span style={{ flex: 1 }} />
          <button type="button" className="sys-tool" onClick={() => p.onResetClave(a)}>Cambiar clave</button>
        </div>
      </Section>

      <Section title="Repasos">
        <RepasosAlumno {...p} />
      </Section>

      <Section title="Compensar">
        <Compensar {...p} st={st} />
      </Section>
    </section>
  )
}

function Stat({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="label-mono">{k}</dt>
      <dd className="tabular" style={{ fontFamily: jersey, fontSize: 24, lineHeight: 1, color: 'hsl(var(--tx))' }}>{v}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="alu-section">
      <h3 className="label-mono" style={{ color: 'hsl(var(--tx))', marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  )
}

// Repasos de este alumno: una puerta por repaso, agrupadas por acto. Llena =
// se lo habilitaste a él; gris = lo tiene por el aula (se cambia en
// repasos.exe); punteada = no lo ve. La esquinita con check = ya lo terminó.
const REPASO_ACTS = ACT_MAPS
  .map((act) => ({ act, repasos: REPASOS.filter((r) => act.bosses.some((b) => b.id === r.bossId)) }))
  .filter((g) => g.repasos.length > 0)

function RepasosAlumno(p: Props & { a: Alumno }) {
  const [hover, setHover] = useState<string | null>(null)
  const { a } = p
  const byAula = (bossId: string) => !!a.aula_id && !!p.aulaRepasos[a.aula_id]?.[bossId]
  const own = (bossId: string) => !!p.alumnoRepasos[a.id]?.[bossId]
  const status = (bossId: string, beats: number) => {
    const pr = p.repasoProgress[a.id]?.[bossId]
    if (pr?.done) return 'Terminado'
    if (pr && pr.beat > 0) return `Paso ${pr.beat + 1} de ${beats}`
    if (byAula(bossId)) return 'Habilitado para toda el aula'
    if (own(bossId)) return 'Habilitado solo para este alumno'
    return 'No lo ve'
  }
  const hov = REPASOS.find((r) => r.bossId === hover)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        {REPASO_ACTS.map(({ act, repasos }) => (
          <div key={act.key} className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`${act.roman} · ${act.title}`}>
            <span title={`${act.roman} · ${act.title}`} style={{ marginRight: 2 }}><ActEmblem actKey={act.key} size={14} color="hsl(var(--tx2))" /></span>
            {repasos.map((r) => {
              const aula = byAula(r.bossId)
              const mine = own(r.bossId)
              const done = !!p.repasoProgress[a.id]?.[r.bossId]?.done
              const state = aula ? 'aula' : mine ? 'on' : 'off'
              return (
                <button
                  key={r.bossId}
                  type="button"
                  className="alu-rep"
                  data-state={state}
                  aria-pressed={mine || aula}
                  disabled={aula}
                  aria-label={`${r.title}: ${status(r.bossId, r.beats.length)}`}
                  onPointerEnter={() => setHover(r.bossId)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(r.bossId)}
                  onBlur={() => setHover(null)}
                  onClick={() => { sfx.toggle(!mine); p.onToggleRepaso(a, r.bossId) }}
                >
                  <BossTopicIcon bossId={r.bossId} size={13} color={state === 'off' ? 'hsl(var(--tx3))' : 'hsl(var(--bg))'} />
                  {done && <span className="alu-rep-done" aria-hidden />}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ minHeight: 22, fontFamily: vt, fontSize: 18, lineHeight: 1.2, color: 'hsl(var(--tx2))' }}>
        {hov && <><span style={{ color: 'hsl(var(--tx))' }}>{hov.title}</span> · {status(hov.bossId, hov.beats.length)}</>}
      </div>
    </div>
  )
}

function Compensar(p: Props & { a: Alumno; st: StudentStanding | undefined }) {
  const { a, st } = p
  const [open, setOpen] = useState(needsAction(st))
  const [diamonds, setDiamonds] = useState(String(st && st.diamonds < 0 ? -st.diamonds : 0))
  const [xp, setXp] = useState('0')
  const [note, setNote] = useState(DEFAULT_NOTE)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (p.standingsError) return <p className="alu-sub" style={{ color: 'hsl(var(--danger))' }}>{p.standingsError}</p>
  if (!st) return <p className="alu-sub">{p.standings ? 'Sin datos de saldo para este alumno.' : 'Cargando saldo…'}</p>

  const d = Math.max(0, Math.trunc(Number(diamonds) || 0))
  const x = Math.max(0, Math.trunc(Number(xp) || 0))
  const avisos = [st.copied > 0 && `${st.copied} compra${st.copied === 1 ? '' : 's'} copiada${st.copied === 1 ? '' : 's'} de otra cuenta`, st.diamonds < 0 && 'saldo negativo'].filter(Boolean)

  const grant = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const err = await p.onGrant(a, d, x, note)
    setBusy(false)
    if (err) setMsg(err)
    else { setDiamonds('0'); setXp('0') }
  }

  return (
    <div className="flex flex-col gap-3">
      {avisos.length > 0 && (
        <div className="alu-aviso" role="note">! {avisos.join(' · ')}</div>
      )}

      {!open ? (
        <div>
          <button type="button" className="sys-tool" onClick={() => { sfx.click(); setOpen(true) }}>Dar diamantes o XP</button>
        </div>
      ) : (
        <form className="flex flex-wrap items-end gap-3" onSubmit={grant}>
          <label className="flex flex-col gap-1">
            <span className="label-mono">Diamantes</span>
            <input className="input aula-time" type="number" min={0} max={500} value={diamonds} onChange={(e) => setDiamonds(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label-mono">XP</span>
            <input className="input aula-time" type="number" min={0} max={1000} value={xp} onChange={(e) => setXp(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1" style={{ flex: '1 1 220px' }}>
            <span className="label-mono">Motivo</span>
            <input className="input" maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit" className="sys-tool sys-tool--solid" disabled={busy || (!d && !x) || !note.trim()}>
            {busy ? '…' : 'Dar'}
          </button>
          <div className="alu-sub" style={{ flexBasis: '100%' }}>
            Queda en {st.diamonds + d} diamantes y {st.xp + x} XP. Le llega la próxima vez que abra el juego.
          </div>
        </form>
      )}
      {msg && <div className="alu-sub" style={{ color: 'hsl(var(--danger))' }}>&gt; {msg}</div>}

      {st.compensations.length > 0 && (
        <ul className="flex flex-col">
          {st.compensations.map((c) => (
            <li key={c.id} className="alu-comp">
              <span className="alu-sub tabular" style={{ whiteSpace: 'nowrap' }}>
                {new Date(c.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(', ', ' ')}
              </span>
              <span style={{ fontFamily: jersey, fontSize: 17, whiteSpace: 'nowrap' }}>
                {c.diamonds > 0 && <Diamonds n={c.diamonds} sign size={12} />}
                {c.diamonds > 0 && c.xp > 0 && ' '}
                {c.xp > 0 && `+${c.xp} XP`}
              </span>
              <span className="alu-sub min-w-0 truncate" style={{ flex: 1 }} title={c.note ?? undefined}>{c.note}</span>
              <button
                type="button"
                className="alu-undo"
                disabled={busy}
                onClick={async () => {
                  setBusy(true); setMsg(null)
                  const err = await p.onUndo(a, c.id)
                  setBusy(false)
                  if (err) setMsg(err)
                }}
              >
                Deshacer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
