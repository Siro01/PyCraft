'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { getSecretBoss } from '@/lib/game/secret/bosses'
import { aulaLabel, type AdminAula } from './aula-label'

// Pestaña "Raids" del panel docente: los duelos del Pistolero y las raids
// contra jefes secretos de cada aula — quiénes estuvieron, cuántos aciertos
// hizo cada uno, cómo terminó y qué botín (o castigo) se repartió.
// "Anular" devuelve todo lo de esa raid (por si hubo un corte de luz, una
// desconexión injusta o una pelea en el aula).

interface RaidRow {
  id: string
  aula_id: string | null
  kind: 'pistolero' | 'secreto'
  boss_id: string | null
  status: 'lobby' | 'active' | 'won' | 'lost' | 'cancelled'
  boss_hp: number
  boss_hp_max: number
  attacks: Record<string, number> | null
  created_at: string
}
interface MemberRow { raid_id: string; user_id: string; role: 'alumno' | 'docente'; state: 'alive' | 'down' | 'left'; solved: number }
interface LedgerRow { raid_id: string | null; user_id: string; delta: number; xp: number; reason: string }

interface Props {
  aulas: AdminAula[]
  students: { id: string; username: string }[]
}

const STATUS: Record<RaidRow['status'], string> = {
  lobby: 'armando equipo', active: 'en curso', won: 'ganó el equipo', lost: 'perdió el equipo', cancelled: 'cancelada',
}
const REASON: Record<string, string> = { pistolero: 'botín', 'raid-primera': 'primera victoria', 'raid-revancha': 'revancha', abandono: 'abandono' }

export default function RaidsPanel({ aulas, students }: Props) {
  const [aulaId, setAulaId] = useState('')
  const [kind, setKind] = useState<'' | 'pistolero' | 'secreto'>('')
  const [raids, setRaids] = useState<RaidRow[] | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [ledger, setLedger] = useState<LedgerRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [voiding, setVoiding] = useState<string | null>(null)
  const [hideEmpty, setHideEmpty] = useState(true)
  const name = useCallback((id: string) => students.find((s) => s.id === id)?.username ?? 'TEST', [students]) // el alumno TEST no viene en la lista

  const load = useCallback(async () => {
    const supabase = createClient()
    let q = supabase.from('raids').select('id, aula_id, kind, boss_id, status, boss_hp, boss_hp_max, attacks, created_at')
      .order('created_at', { ascending: false }).limit(60)
    if (aulaId) q = q.eq('aula_id', aulaId)
    if (kind) q = q.eq('kind', kind)
    const { data, error: e } = await q
    if (e) { setError(`${e.message} — ¿ejecutaste las migraciones 014 y 015?`); return }
    const list = (data ?? []) as RaidRow[]
    const ids = list.map((r) => r.id)
    const [m, l] = ids.length
      ? await Promise.all([
        supabase.from('raid_members').select('raid_id, user_id, role, state, solved').in('raid_id', ids),
        supabase.from('raid_ledger').select('raid_id, user_id, delta, xp, reason').in('raid_id', ids),
      ])
      : [{ data: [] }, { data: [] }]
    setError(null)
    setRaids(list)
    setMembers((m.data ?? []) as MemberRow[])
    setLedger((l.data ?? []) as LedgerRow[])
  }, [aulaId, kind])
  useEffect(() => { void load() }, [load])

  const voidRaid = async (r: RaidRow) => {
    const live = r.status === 'lobby' || r.status === 'active'
    if (!confirm(`¿Anular esta raid?${live ? ' Se corta ahora mismo.' : ''} Se devuelven los diamantes y el XP (también los castigos por abandono). Los stickers que ya recibieron se quedan.`)) return
    setVoiding(r.id)
    const res = await fetch('/api/raid/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'void', raidId: r.id }) })
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? 'No se pudo anular')
    setVoiding(null)
    void load()
  }

  const shown = useMemo(() => (raids ?? []).filter((r) => !hideEmpty || r.status !== 'cancelled' || r.attacks?.voided), [raids, hideEmpty])
  const aulaName = (id: string | null) => aulas.find((a) => a.id === id)?.nombre ?? '—'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input text-xs py-1" value={aulaId} onChange={(e) => setAulaId(e.target.value)} aria-label="Aula" style={{ width: 'auto' }}>
          <option value="">Todas las aulas</option>
          {aulas.map((a) => <option key={a.id} value={a.id}>{aulaLabel(a)}</option>)}
        </select>
        <select className="input text-xs py-1" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Tipo" style={{ width: 'auto' }}>
          <option value="">Pistolero y jefes secretos</option>
          <option value="pistolero">Solo el Pistolero</option>
          <option value="secreto">Solo jefes secretos</option>
        </select>
        <label className="flex items-center gap-1 font-mono text-xs text-tx2">
          <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} /> ocultar canceladas
        </label>
        <button type="button" className="btn-ghost font-mono text-xs" onClick={() => void load()}>Actualizar</button>
        <a href="/admin/pistolero" className="btn-ghost font-mono text-xs">Mesa del Pistolero →</a>
        <a href="/raid" className="btn-ghost font-mono text-xs">Ver raids (apoyo) →</a>
      </div>

      {error && <div className="card p-4 font-mono text-xs text-danger">{error}</div>}

      {raids && shown.length === 0 && !error && (
        <div className="card p-6 text-center font-mono text-xs text-tx3">Todavía no hubo raids{aulaId ? ' en esta aula' : ''}.</div>
      )}

      {shown.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-tx3 text-left">
                <th className="p-2">Cuándo</th><th className="p-2">Contra</th><th className="p-2">Aula</th>
                <th className="p-2">Equipo (aciertos)</th><th className="p-2">Resultado</th><th className="p-2">Movió</th><th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const team = members.filter((m) => m.raid_id === r.id && m.role === 'alumno')
                const teacher = members.some((m) => m.raid_id === r.id && m.role === 'docente') && r.kind === 'secreto'
                const moves = ledger.filter((l) => l.raid_id === r.id)
                const diamonds = moves.reduce((s, l) => s + l.delta, 0)
                const xp = moves.reduce((s, l) => s + l.xp, 0)
                const penalties = moves.filter((l) => l.reason === 'abandono')
                const voided = !!r.attacks?.voided
                const boss = r.kind === 'secreto' ? getSecretBoss(r.boss_id ?? '') : null
                return (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-2 text-tx3 whitespace-nowrap">{new Date(r.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-2 text-tx whitespace-nowrap">{r.kind === 'pistolero' ? 'El Pistolero' : boss?.name ?? r.boss_id}</td>
                    <td className="p-2 text-tx2">{aulaName(r.aula_id)}</td>
                    <td className="p-2 text-tx2">
                      {team.length === 0 ? <span className="text-tx3">nadie</span> : team.map((m, i) => (
                        <span key={m.user_id} className={m.state === 'left' ? 'text-tx3 line-through' : 'text-tx'}>
                          {i > 0 && ', '}{name(m.user_id)} ({m.solved}){m.state === 'down' ? ' caído' : ''}
                        </span>
                      ))}
                      {teacher && <span className="text-tx3"> + docente</span>}
                    </td>
                    <td className="p-2">
                      {voided ? <span className="text-tx3">anulada</span> : (
                        <span className={r.status === 'won' ? 'text-tx' : 'text-tx3'}>
                          {STATUS[r.status]}
                          {r.status === 'active' && r.boss_hp_max > 0 && <span className="text-tx3"> · {r.boss_hp}/{r.boss_hp_max}</span>}
                        </span>
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {moves.length === 0 ? <span className="text-tx3">—</span> : (
                        <span className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-2">{diamonds !== 0 && <Diamonds n={diamonds} size={11} sign />}{xp > 0 && <span className="text-tx2">+{xp} XP</span>}</span>
                          <span className="text-tx3">{[...new Set(moves.filter((l) => l.reason !== 'abandono').map((l) => REASON[l.reason] ?? l.reason))].join(' · ')}</span>
                          {penalties.length > 0 && <span className="text-danger">abandono: {penalties.map((p) => name(p.user_id)).join(', ')}</span>}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {!voided && r.status !== 'cancelled' && (
                        <button type="button" className="font-mono text-xs px-2 py-1 border border-danger/40 text-danger hover:bg-danger/10" disabled={voiding === r.id} onClick={() => voidRaid(r)}>
                          {voiding === r.id ? '…' : 'Anular'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
