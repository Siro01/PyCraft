'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { aulaLabel, type AdminAula } from './aula-label'
import type { StudentStanding } from '@/app/api/admin/compensar/route'

// Pestaña "Compensar": darle diamantes y/o XP a un alumno con un motivo (por
// ejemplo, el progreso que se mezcló entre cuentas el 15/10). Se puede
// deshacer. Los avisos marcan a quién revisar primero: compras copiadas de
// otra cuenta y saldo negativo.

const DEFAULT_NOTE = 'Compensación por el error del 15/10 (progreso mezclado entre PCs)'

export default function CompensarPanel({ aulas }: { aulas: AdminAula[] }) {
  const [aulaId, setAulaId] = useState('')
  const [rows, setRows] = useState<StudentStanding[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/compensar${aulaId ? `?aula=${aulaId}` : ''}`, { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error ?? 'No se pudo cargar.'); return }
    setError(null)
    setRows(json.students as StudentStanding[])
  }, [aulaId])
  useEffect(() => { load() }, [load])

  const flagged = (s: StudentStanding) => s.copied > 0 || s.diamonds < 0
  const shown = useMemo(() => (rows ?? []).filter((s) => !onlyFlagged || flagged(s)), [rows, onlyFlagged])
  const nFlagged = (rows ?? []).filter(flagged).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input text-xs py-1" value={aulaId} onChange={(e) => setAulaId(e.target.value)} aria-label="Aula" style={{ width: 'auto' }}>
          <option value="">Todas las aulas</option>
          {aulas.map((a) => <option key={a.id} value={a.id}>{aulaLabel(a)}</option>)}
        </select>
        <button type="button" className="btn-ghost font-mono text-xs" onClick={load}>Actualizar</button>
        {nFlagged > 0 && (
          <label className="flex items-center gap-2 font-mono text-xs text-tx2 cursor-pointer">
            <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
            solo los {nFlagged} con aviso
          </label>
        )}
      </div>

      {error && <div className="card p-4 font-mono text-xs text-danger">{error}</div>}
      {rows && shown.length === 0 && !error && <div className="card p-6 text-center font-mono text-xs text-tx3">No hay alumnos{onlyFlagged ? ' con aviso' : ''}.</div>}

      {shown.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-tx3 text-left">
                <th className="p-2">Alumno</th><th className="p-2">Jefes</th><th className="p-2">Diamantes</th><th className="p-2">Nivel</th><th className="p-2">Aviso</th><th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <Row key={s.id} s={s} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} onChanged={load} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ s, open, onToggle, onChanged }: { s: StudentStanding; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const given = s.compensations.reduce((acc, c) => ({ d: acc.d + c.diamonds, x: acc.x + c.xp }), { d: 0, x: 0 })
  return (
    <>
      <tr className="border-t border-border">
        <td className="p-2 text-tx">{s.username}</td>
        <td className="p-2 text-tx2">{s.bosses}</td>
        <td className="p-2" style={{ color: s.diamonds < 0 ? 'hsl(var(--danger))' : undefined }}><Diamonds n={s.diamonds} size={11} /></td>
        <td className="p-2 text-tx2">{s.level} <span className="text-tx3">({s.xp} xp)</span></td>
        <td className="p-2">
          {s.copied > 0 && <span className="text-danger">{s.copied} compra{s.copied === 1 ? '' : 's'} copiada{s.copied === 1 ? '' : 's'}</span>}
          {s.copied > 0 && s.diamonds < 0 && <span className="text-tx3"> · </span>}
          {s.diamonds < 0 && <span className="text-danger">saldo negativo</span>}
          {(given.d > 0 || given.x > 0) && <span className="text-tx3">{s.copied > 0 || s.diamonds < 0 ? ' · ' : ''}ya compensado</span>}
        </td>
        <td className="p-2 text-right">
          <button type="button" className="btn-ghost font-mono text-xs" onClick={onToggle} aria-expanded={open}>{open ? 'Cerrar' : 'Compensar'}</button>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-border">
          <td colSpan={6} className="p-3" style={{ background: 'hsl(var(--surface2))' }}>
            <GrantForm s={s} onDone={onChanged} />
          </td>
        </tr>
      )}
    </>
  )
}

function GrantForm({ s, onDone }: { s: StudentStanding; onDone: () => void }) {
  // Si quedó en negativo, propone lo justo para volver a cero.
  const [diamonds, setDiamonds] = useState(String(s.diamonds < 0 ? -s.diamonds : 0))
  const [xp, setXp] = useState('0')
  const [note, setNote] = useState(DEFAULT_NOTE)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const call = async (method: 'POST' | 'DELETE', body: Record<string, unknown>) => {
    setBusy(true); setMsg(null)
    const res = await fetch('/api/admin/compensar', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg(json.error ?? 'No se pudo.'); return }
    onDone()
  }

  const d = Math.max(0, Math.trunc(Number(diamonds) || 0))
  const x = Math.max(0, Math.trunc(Number(xp) || 0))

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => { e.preventDefault(); void call('POST', { userId: s.id, diamonds: d, xp: x, note }) }}
      >
        <label className="flex flex-col gap-1">
          <span className="label-mono">Diamantes</span>
          <input className="input text-xs py-1" type="number" min={0} max={500} value={diamonds} onChange={(e) => setDiamonds(e.target.value)} style={{ width: 96 }} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="label-mono">XP</span>
          <input className="input text-xs py-1" type="number" min={0} max={1000} value={xp} onChange={(e) => setXp(e.target.value)} style={{ width: 96 }} />
        </label>
        <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
          <span className="label-mono">Motivo</span>
          <input className="input text-xs py-1" maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="submit" className="btn font-mono text-xs" disabled={busy || (!d && !x) || !note.trim()}>
          {busy ? '…' : `Dar${d ? ` ${d} diamantes` : ''}${d && x ? ' y' : ''}${x ? ` ${x} XP` : ''}`}
        </button>
      </form>
      <div className="font-mono text-xs text-tx3">
        Queda en {s.diamonds + d} diamantes · nivel con {s.xp + x} xp. Le llega la próxima vez que abra el juego.
      </div>
      {msg && <div className="font-mono text-xs text-danger">{msg}</div>}

      {s.compensations.length > 0 && (
        <ul className="flex flex-col gap-1 font-mono text-xs">
          {s.compensations.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3">
              <span className="text-tx3 whitespace-nowrap">{new Date(c.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              {c.diamonds > 0 && <Diamonds n={c.diamonds} sign size={10} />}
              {c.xp > 0 && <span className="text-tx">+{c.xp} xp</span>}
              <span className="text-tx2">{c.note}</span>
              <button
                type="button"
                className="font-mono text-xs px-2 py-0.5 border border-danger/40 text-danger hover:bg-danger/10"
                disabled={busy}
                onClick={() => { if (confirm('¿Deshacer esta compensación?')) void call('DELETE', { id: c.id }) }}
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
