'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { BOSSES } from '@/lib/game/bosses'
import { ARENA_MIX, ARENA_REASON_LABEL } from '@/lib/game/arena/rules'
import { sfx } from '@/lib/game/architect/sound'
import type { AdminAula } from '../aula-label'

// ARENA.EXE: los duelos del aula, en dos solapas (1 vs 1 y 2 vs 2). Arriba
// de todo, solo si pasa, el aviso de una sala 2 vs 2 que llama al docente.
// "Anular" devuelve los diamantes y el XP de ese duelo.

interface Match {
  id: string; aula_id: string | null; player_a: string; player_b: string; boss_id: string; stake: number; status: string
  progress_a: number; progress_b: number; winner_id: string | null; end_reason: string | null; created_at: string
}
interface Room { id: string; aula_id: string | null; boss_id: string; stake: number; status: string; needs_teacher: boolean; winner_team: string | null; end_reason: string | null; created_at: string }
interface Seat { room_id: string; user_id: string; team: string; slot: number; role: string }

interface Props {
  /** '' = todas las aulas. */
  aulaId: string
  aulas: AdminAula[]
  students: { id: string; username: string }[]
  ask: (o: { title: string; body: ReactNode; ok: string; danger?: boolean }) => Promise<boolean>
  say: (text: string, ok?: boolean | null) => void
}

const jersey = 'var(--font-jersey), monospace'
const topic = (id: string) => (id === ARENA_MIX ? 'mezcla' : BOSSES.find((b) => b.id === id)?.topic ?? id)
const STATUS: Record<string, string> = { pending: 'esperando', active: 'en juego', declined: 'rechazado', lobby: 'armando', cancelled: 'cancelado', expired: 'vencido' }
// Sin la tabla, la pista es la migración; si no, el mensaje real.
const dbError = (msg: string, mig: string) => (/does not exist|schema cache|relation/i.test(msg) ? `Falta correr la migración ${mig}.` : msg)
const when = (iso: string) => new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(', ', ' ')
const COLS = '86px minmax(180px, 1.6fr) minmax(90px, 0.8fr) minmax(130px, 1fr) 64px 84px'

export default function ArenaWindow({ aulaId, aulas, students, ask, say }: Props) {
  const [tab, setTab] = useState<'1v1' | '2v2'>('1v1')
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [rooms, setRooms] = useState<Room[] | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  const [err1, setErr1] = useState<string | null>(null)
  const [err2, setErr2] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const name = (id: string | null) => students.find((s) => s.id === id)?.username ?? '—'
  const aulaName = (id: string | null) => aulas.find((a) => a.id === id)?.nombre ?? '—'

  const load = useCallback(async () => {
    const supabase = createClient()
    let q1 = supabase.from('arena_matches')
      .select('id, aula_id, player_a, player_b, boss_id, stake, status, progress_a, progress_b, winner_id, end_reason, created_at')
      .order('created_at', { ascending: false }).limit(60)
    if (aulaId) q1 = q1.eq('aula_id', aulaId)
    let q2 = supabase.from('arena_rooms').select('id, aula_id, boss_id, stake, status, needs_teacher, winner_team, end_reason, created_at')
      .neq('status', 'cancelled').order('created_at', { ascending: false }).limit(40)
    if (aulaId) q2 = q2.eq('aula_id', aulaId)
    const [r1, r2] = await Promise.all([q1, q2])
    if (r1.error) setErr1(dbError(r1.error.message, '013_arena.sql'))
    else { setErr1(null); setMatches((r1.data ?? []) as Match[]) }
    if (r2.error) { setErr2(dbError(r2.error.message, '016_arena_2v2.sql')); return }
    setErr2(null)
    const list = (r2.data ?? []) as Room[]
    setRooms(list)
    if (list.length) {
      const { data: ps } = await supabase.from('arena_room_players').select('room_id, user_id, team, slot, role').in('room_id', list.map((r) => r.id)).is('left_at', null)
      setSeats((ps ?? []) as Seat[])
    }
  }, [aulaId])
  // Las salas 2 vs 2 pueden llamar al docente en cualquier momento: se mira cada 15 s.
  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t) }, [load])

  const team = (roomId: string, t: string) => seats.filter((x) => x.room_id === roomId && x.team === t).sort((a, b) => a.slot - b.slot)
    .map((x) => `${name(x.user_id)}${x.role === 'docente' ? ' (vos)' : ''}`).join(' + ') || '—'

  const voidOne = async (kind: '1v1' | '2v2', id: string, who: string) => {
    const ok = await ask({ title: 'ANULAR_DUELO.EXE', body: <>¿Anular el duelo de <b>{who}</b>? Se devuelven los diamantes y el XP a {kind === '1v1' ? 'los dos' : 'los cuatro'}.</>, ok: 'Anular', danger: true })
    if (!ok) return
    setBusy(id)
    const res = kind === '1v1'
      ? await fetch('/api/arena', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'void', matchId: id }) })
      : await fetch('/api/arena/sala', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'void', roomId: id }) })
    setBusy(null)
    if (!res.ok) say((await res.json().catch(() => ({}))).error ?? 'No se pudo anular', false)
    else say(`Duelo de ${who} anulado`)
    load()
  }

  const calling = (rooms ?? []).filter((r) => r.status === 'lobby' && r.needs_teacher)
  const shown1 = (matches ?? []).filter((r) => r.status !== 'cancelled' && r.status !== 'expired')
  const shown2 = rooms ?? []

  return (
    <div className="flex flex-col gap-3">
      {calling.map((r) => (
        <div key={r.id} className="arena-call win-pop" role="alert">
          <span style={{ fontFamily: jersey, fontSize: 18 }}>¡Te llaman!</span>
          <span className="sys-sub" style={{ color: 'inherit', flex: 1 }}>Falta alguien en una sala 2 vs 2 de {topic(r.boss_id)} · Espada: {team(r.id, 'espada')} · Escudo: {team(r.id, 'escudo')}</span>
          <a href={`/arena?aula=${r.aula_id ?? ''}&modo=2v2`} className="sys-tool sys-tool--solid" onClick={() => sfx.open()}>Sumarme</a>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Tipo de duelo" className="sys-tabs">
          {(['1v1', '2v2'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className="aula-seg" onClick={() => { sfx.tab(); setTab(t) }}>
              {t === '1v1' ? '1 vs 1' : '2 vs 2'} <span style={{ opacity: 0.7 }}>{t === '1v1' ? shown1.length : shown2.length}</span>
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button type="button" className="sys-tool" onClick={() => { sfx.click(); load() }}>Actualizar</button>
        <a href={aulaId ? `/arena?aula=${aulaId}` : '/arena'} className="sys-tool">Entrar a la arena</a>
      </div>

      {tab === '1v1' && (
        err1 ? <p className="sys-sub">{err1}</p>
        : shown1.length === 0 ? <p className="sys-sub" style={{ padding: '8px 0' }}>{matches ? 'Todavía no hubo duelos 1 vs 1 acá.' : 'Cargando…'}</p>
        : (
          <div role="table" aria-label="Duelos 1 vs 1" className="sys-table">
            <Head />
            {shown1.map((r) => {
              const done = r.status === 'finished'
              const voided = r.end_reason === 'voided'
              const who = `${name(r.player_a)} y ${name(r.player_b)}`
              return (
                <div key={r.id} role="row" className="sys-row sys-row--hover" style={{ gridTemplateColumns: COLS, opacity: voided ? 0.5 : 1 }}>
                  <span role="cell" className="sys-num" style={{ color: 'hsl(var(--tx2))' }}>{when(r.created_at)}</span>
                  <span role="cell" className="min-w-0">
                    <span className="block truncate" style={{ fontFamily: jersey, fontSize: 17, lineHeight: 1 }}>
                      {name(r.player_a)} <span className="sys-sub">{r.progress_a}</span> <span className="sys-sub">vs</span> {name(r.player_b)} <span className="sys-sub">{r.progress_b}</span>
                    </span>
                    {!aulaId && <span className="block sys-sub truncate">{aulaName(r.aula_id)}</span>}
                  </span>
                  <span role="cell" className="sys-sub truncate">{topic(r.boss_id)}</span>
                  <span role="cell" className="sys-sub" style={{ color: done && !voided && r.winner_id ? 'hsl(var(--tx))' : undefined }}>
                    {!done ? STATUS[r.status] ?? r.status
                      : voided ? 'anulado'
                      : r.winner_id ? <>ganó {name(r.winner_id)}{r.end_reason && ARENA_REASON_LABEL[r.end_reason] ? <><br />{ARENA_REASON_LABEL[r.end_reason]}</> : null}</>
                      : 'empate'}
                  </span>
                  <span role="cell" className="sys-num">{r.stake > 0 ? <Diamonds n={r.stake} size={11} /> : <span className="sys-sub">amistoso</span>}</span>
                  <span role="cell" style={{ textAlign: 'right' }}>
                    {done && !voided && <button type="button" className="alu-undo" disabled={busy === r.id} onClick={() => voidOne('1v1', r.id, who)}>{busy === r.id ? '…' : 'Anular'}</button>}
                  </span>
                </div>
              )
            })}
          </div>
        )
      )}

      {tab === '2v2' && (
        err2 ? <p className="sys-sub">{err2}</p>
        : shown2.length === 0 ? <p className="sys-sub" style={{ padding: '8px 0' }}>{rooms ? 'Todavía no hubo duelos 2 vs 2 acá.' : 'Cargando…'}</p>
        : (
          <div role="table" aria-label="Duelos 2 vs 2" className="sys-table">
            <Head />
            {shown2.map((r) => {
              const done = r.status === 'finished'
              const voided = r.end_reason === 'voided'
              return (
                <div key={r.id} role="row" className="sys-row sys-row--hover" style={{ gridTemplateColumns: COLS, opacity: voided ? 0.5 : 1 }}>
                  <span role="cell" className="sys-num" style={{ color: 'hsl(var(--tx2))' }}>{when(r.created_at)}</span>
                  <span role="cell" className="min-w-0">
                    <span className="block truncate" style={{ fontFamily: jersey, fontSize: 17, lineHeight: 1.1 }}>{team(r.id, 'espada')}</span>
                    <span className="block sys-sub truncate">vs {team(r.id, 'escudo')}{!aulaId ? ` · ${aulaName(r.aula_id)}` : ''}</span>
                  </span>
                  <span role="cell" className="sys-sub truncate">{topic(r.boss_id)}</span>
                  <span role="cell" className="sys-sub" style={{ color: done && !voided && r.winner_team ? 'hsl(var(--tx))' : undefined }}>
                    {!done ? STATUS[r.status] ?? r.status
                      : voided ? 'anulado'
                      : r.winner_team ? <>ganó {r.winner_team === 'espada' ? 'Espada' : 'Escudo'}<br />{r.end_reason === 'solved' ? 'completó los 6' : ARENA_REASON_LABEL[r.end_reason ?? ''] ?? ''}</>
                      : 'empate'}
                  </span>
                  <span role="cell" className="sys-num">{r.stake > 0 ? <Diamonds n={r.stake} size={11} /> : <span className="sys-sub">amistoso</span>}</span>
                  <span role="cell" style={{ textAlign: 'right' }}>
                    {done && !voided && <button type="button" className="alu-undo" disabled={busy === r.id} onClick={() => voidOne('2v2', r.id, `${team(r.id, 'espada')} y ${team(r.id, 'escudo')}`)}>{busy === r.id ? '…' : 'Anular'}</button>}
                  </span>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

function Head() {
  return (
    <div role="row" className="sys-row sys-row--head" style={{ gridTemplateColumns: COLS }}>
      {['Cuándo', 'Duelo', 'Tema', 'Resultado', 'Apuesta', ''].map((h, i) => <span key={i} role="columnheader" className="label-mono">{h}</span>)}
    </div>
  )
}
