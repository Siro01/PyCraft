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
    </div>
  )
}
