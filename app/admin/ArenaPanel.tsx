'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { BOSSES } from '@/lib/game/bosses'
import { ARENA_MIX, ARENA_REASON_LABEL } from '@/lib/game/arena/rules'
import { aulaLabel, type AdminAula } from './aula-label'

// Pestaña "Arena" del panel docente: los duelos recientes de cada aula, quién
// ganó y cuántos diamantes se movieron. "Anular" devuelve los diamantes y el
// XP de ese duelo (por si hubo una pelea en el aula o un duelo arreglado).

interface Row {
  id: string
  aula_id: string | null
  player_a: string
  player_b: string
  boss_id: string
  stake: number
  status: string
  progress_a: number
  progress_b: number
  winner_id: string | null
  end_reason: string | null
  created_at: string
}

interface Props {
  aulas: AdminAula[]
  students: { id: string; username: string }[]
}

const topic = (id: string) => (id === ARENA_MIX ? 'mezcla' : BOSSES.find((b) => b.id === id)?.topic ?? id)
const STATUS: Record<string, string> = { pending: 'esperando', active: 'en juego', declined: 'rechazado', cancelled: 'cancelado', expired: 'vencido' }

export default function ArenaPanel({ aulas, students }: Props) {
  const [aulaId, setAulaId] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [voiding, setVoiding] = useState<string | null>(null)
  const name = (id: string | null) => students.find((s) => s.id === id)?.username ?? '—'

  const load = useCallback(async () => {
    let q = createClient().from('arena_matches')
      .select('id, aula_id, player_a, player_b, boss_id, stake, status, progress_a, progress_b, winner_id, end_reason, created_at')
      .order('created_at', { ascending: false }).limit(60)
    if (aulaId) q = q.eq('aula_id', aulaId)
    const { data, error: e } = await q
    if (e) { setError(`${e.message} — ¿ejecutaste la migración 013_arena.sql?`); return }
    setError(null)
    setRows((data ?? []) as Row[])
  }, [aulaId])
  useEffect(() => { load() }, [load])

  const voidMatch = async (id: string) => {
    if (!confirm('¿Anular este duelo? Se devuelven los diamantes y el XP a los dos.')) return
    setVoiding(id)
    await fetch('/api/arena', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'void', matchId: id }) })
    setVoiding(null)
    load()
  }

  const shown = (rows ?? []).filter((r) => r.status !== 'cancelled' && r.status !== 'expired')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input text-xs py-1" value={aulaId} onChange={(e) => setAulaId(e.target.value)} aria-label="Aula" style={{ width: 'auto' }}>
          <option value="">Todas las aulas</option>
          {aulas.map((a) => <option key={a.id} value={a.id}>{aulaLabel(a)}</option>)}
        </select>
        <button type="button" className="btn-ghost font-mono text-xs" onClick={load}>Actualizar</button>
        <a href={aulaId ? `/arena?aula=${aulaId}` : '/arena'} className="btn-ghost font-mono text-xs">Entrar a la arena →</a>
        <span className="font-mono text-xs text-tx3">Se abre o se cierra por aula en la pestaña Aulas.</span>
      </div>

      {error && <div className="card p-4 font-mono text-xs text-danger">{error}</div>}

      {rows && shown.length === 0 && !error && (
        <div className="card p-6 text-center font-mono text-xs text-tx3">Todavía no hubo duelos{aulaId ? ' en esta aula' : ''}.</div>
      )}

      {shown.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-tx3 text-left">
                <th className="p-2">Cuándo</th><th className="p-2">Duelo</th><th className="p-2">Tema</th>
                <th className="p-2">Resultado</th><th className="p-2">Por diamantes</th><th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const done = r.status === 'finished'
                const voided = r.end_reason === 'voided'
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2 text-tx3 whitespace-nowrap">{new Date(r.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-2 text-tx">{name(r.player_a)} <span className="text-tx3">({r.progress_a})</span> vs {name(r.player_b)} <span className="text-tx3">({r.progress_b})</span></td>
                    <td className="p-2 text-tx2">{topic(r.boss_id)}</td>
                    <td className="p-2">
                      {!done ? <span className="text-tx3">{STATUS[r.status] ?? r.status}</span>
                        : voided ? <span className="text-tx3">anulado</span>
                        : r.winner_id ? <span className="text-tx">ganó {name(r.winner_id)} <span className="text-tx3">· {ARENA_REASON_LABEL[r.end_reason ?? ''] ?? ''}</span></span>
                        : <span className="text-tx3">empate</span>}
                    </td>
                    <td className="p-2">{r.stake > 0 ? <Diamonds n={r.stake} size={11} /> : <span className="text-tx3">amistoso</span>}</td>
                    <td className="p-2 text-right">
                      {done && !voided && (
                        <button type="button" className="font-mono text-xs px-2 py-1 border border-danger/40 text-danger hover:bg-danger/10" disabled={voiding === r.id} onClick={() => voidMatch(r.id)}>
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

      <RoomsSection aulaId={aulaId} name={name} />
    </div>
  )
}

// ─── 2 vs 2 ────────────────────────────────────────────────────────────────
interface RoomRow { id: string; aula_id: string | null; boss_id: string; stake: number; status: string; needs_teacher: boolean; winner_team: string | null; end_reason: string | null; created_at: string }
interface SeatRow { room_id: string; user_id: string; team: string; slot: number; role: string }

/** Salas que llaman al docente (con "sumarme") y los últimos duelos 2 vs 2, para anular. */
function RoomsSection({ aulaId, name }: { aulaId: string; name: (id: string | null) => string }) {
  const [rooms, setRooms] = useState<RoomRow[] | null>(null)
  const [seats, setSeats] = useState<SeatRow[]>([])
  const [missing, setMissing] = useState(false)
  const [voiding, setVoiding] = useState<string | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    let q = supabase.from('arena_rooms').select('id, aula_id, boss_id, stake, status, needs_teacher, winner_team, end_reason, created_at')
      .neq('status', 'cancelled').order('created_at', { ascending: false }).limit(40)
    if (aulaId) q = q.eq('aula_id', aulaId)
    const { data, error } = await q
    if (error) { setMissing(true); return }
    const list = (data ?? []) as RoomRow[]
    setRooms(list)
    if (list.length) {
      const { data: ps } = await supabase.from('arena_room_players').select('room_id, user_id, team, slot, role').in('room_id', list.map((r) => r.id)).is('left_at', null)
      setSeats((ps ?? []) as SeatRow[])
    }
  }, [aulaId])
  useEffect(() => { load(); const id = setInterval(load, 15_000); return () => clearInterval(id) }, [load])

  const voidRoom = async (id: string) => {
    if (!confirm('¿Anular este duelo 2 vs 2? Se devuelven los diamantes y el XP a los cuatro.')) return
    setVoiding(id)
    await fetch('/api/arena/sala', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'void', roomId: id }) })
    setVoiding(null)
    load()
  }

  if (missing) return <div className="card p-4 font-mono text-xs text-tx3">2 vs 2: falta correr la migración 016_arena_2v2.sql.</div>
  if (!rooms) return null
  const team = (roomId: string, t: string) => seats.filter((x) => x.room_id === roomId && x.team === t).sort((a, b) => a.slot - b.slot)
    .map((x) => `${name(x.user_id)}${x.role === 'docente' ? ' (docente)' : ''}`).join(' + ') || '—'
  const calling = rooms.filter((r) => r.status === 'lobby' && r.needs_teacher)

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-mono text-sm font-bold text-tx">2 vs 2</h3>
      {calling.map((r) => (
        <div key={r.id} className="card p-3 flex flex-wrap items-center gap-3" style={{ borderColor: 'hsl(var(--accent))' }}>
          <span className="font-mono text-xs text-tx">Te llaman: falta alguien en una sala de {topic(r.boss_id)}</span>
          <span className="font-mono text-xs text-tx3">Espada: {team(r.id, 'espada')} · Escudo: {team(r.id, 'escudo')}</span>
          <a href={`/arena?aula=${r.aula_id ?? ''}&modo=2v2`} className="btn-ghost font-mono text-xs">Sumarme →</a>
        </div>
      ))}
      {rooms.length === 0 && <div className="card p-4 text-center font-mono text-xs text-tx3">Todavía no hubo duelos 2 vs 2{aulaId ? ' en esta aula' : ''}.</div>}
      {rooms.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-tx3 text-left">
                <th className="p-2">Cuándo</th><th className="p-2">Espada</th><th className="p-2">Escudo</th><th className="p-2">Tema</th>
                <th className="p-2">Resultado</th><th className="p-2">Por diamantes</th><th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => {
                const done = r.status === 'finished'
                const voided = r.end_reason === 'voided'
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2 text-tx3 whitespace-nowrap">{new Date(r.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-2 text-tx">{team(r.id, 'espada')}</td>
                    <td className="p-2 text-tx">{team(r.id, 'escudo')}</td>
                    <td className="p-2 text-tx2">{topic(r.boss_id)}</td>
                    <td className="p-2">
                      {r.status === 'lobby' ? <span className="text-tx3">armando</span>
                        : r.status === 'active' ? <span className="text-tx3">en juego</span>
                        : voided ? <span className="text-tx3">anulado</span>
                        : r.winner_team ? <span className="text-tx">ganó {r.winner_team === 'espada' ? 'Espada' : 'Escudo'} <span className="text-tx3">· {r.end_reason === 'solved' ? 'completó los 6' : ARENA_REASON_LABEL[r.end_reason ?? ''] ?? ''}</span></span>
                        : <span className="text-tx3">empate</span>}
                    </td>
                    <td className="p-2">{r.stake > 0 ? <Diamonds n={r.stake} size={11} /> : <span className="text-tx3">amistoso</span>}</td>
                    <td className="p-2 text-right">
                      {done && !voided && (
                        <button type="button" className="font-mono text-xs px-2 py-1 border border-danger/40 text-danger hover:bg-danger/10" disabled={voiding === r.id} onClick={() => voidRoom(r.id)}>
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
