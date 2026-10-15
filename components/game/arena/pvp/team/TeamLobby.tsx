'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ICON_CHECK, PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { BOSSES } from '@/lib/game/bosses'
import { sfx } from '@/lib/game/architect/sound'
import { ARENA_TOPIC_IDS } from '@/lib/game/arena/generators'
import { ARENA_MIX, ARENA_TOPICS, type ArenaStake } from '@/lib/game/arena/rules'
import { TEAMS, TEAM_NAME, type Slot, type Team } from '@/lib/game/arena/team'
import type { LobbyEvent, RoomSeatView, RoomView } from '@/lib/game/arena/types'
import { TeamBanner } from './TeamBits'
import { callSala, createRoomTransport, type RoomTransport } from './transport'

// Lobby del 2 vs 2: salas abiertas del aula, armar una, sentarse en un lugar
// y marcar "¡listo!". Cuando los 4 están listos, el servidor arranca el duelo.
// El docente no arma salas: se sienta donde falta alguien.

interface Me { id: string; username: string; isAdmin: boolean; isTest: boolean }

const topicName = (id: string) => (id === ARENA_MIX ? 'de todo un poco' : BOSSES.find((b) => b.id === id)?.topic ?? id)
const POLL_ROOM_MS = 4_000
const POLL_LIST_MS = 12_000

// ─── Estado y acciones ─────────────────────────────────────────────────────
export function useTeamRooms({ me, aulaId, active, supabase, preview, lobbySend }: {
  me: Me
  aulaId: string
  /** La pestaña 2 vs 2 está a la vista (si no, solo se mira si estoy en una sala). */
  active: boolean
  supabase: SupabaseClient | null
  preview?: { rooms: RoomView[]; mine: RoomView | null }
  lobbySend: (ev: LobbyEvent) => void
}) {
  const [rooms, setRooms] = useState<RoomView[]>(preview?.rooms ?? [])
  const [mine, setMine] = useState<RoomView | null>(preview?.mine ?? null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (preview) return
    try {
      const res = await fetch(`/api/arena/sala?aula=${encodeURIComponent(aulaId)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setNotice(json.error ?? 'No se pudieron cargar las salas.'); return }
      setRooms(json.rooms as RoomView[])
      setMine((prev) => (json.mine as RoomView | null) ?? (prev && prev.status !== 'lobby' && prev.status !== 'active' ? prev : null))
    } catch { setNotice('Sin conexión con el servidor.') }
  }, [aulaId, preview])
  useEffect(() => { void load() }, [load])

  const inRoom = mine?.status === 'lobby'
  useEffect(() => {
    if (preview || (!active && !inRoom)) return
    const id = setInterval(load, inRoom ? POLL_ROOM_MS : POLL_LIST_MS)
    return () => clearInterval(id)
  }, [active, inRoom, load, preview])

  // Canal de la sala (esperando o jugando): lo crea y lo cierra este efecto.
  const roomId = mine && (mine.status === 'lobby' || mine.status === 'active') ? mine.id : null
  const [transport, setTransport] = useState<RoomTransport | null>(null)
  useEffect(() => {
    if (!roomId || !supabase) return
    const t = createRoomTransport(supabase, roomId)
    setTransport(t)
    const off = t.listen((ev) => { if (ev.from !== me.id && (ev.type === 'progress' || ev.type === 'left')) void load() })
    return () => { off(); t.close(); setTransport(null) }
  }, [roomId, supabase, me.id, load])
  const transportRef = useRef(transport)
  transportRef.current = transport

  const act = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true); setNotice(null)
    try {
      const { room } = await callSala(body)
      setMine(room.status === 'cancelled' ? null : room)
      lobbySend({ type: 'rooms', from: me.id })
      transportRef.current?.send({ type: 'progress', from: me.id })
      void load()
      return room
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'No se pudo.'); sfx.denied()
      return null
    } finally { setBusy(false) }
  }, [lobbySend, me.id, load])

  return {
    rooms, mine, setMine, notice, setNotice, busy, load, transport,
    create: (topic: string, stake: ArenaStake) => act({ action: 'create', topic, stake }),
    seat: (roomId: string, team: Team, slot: Slot) => act({ action: 'seat', roomId, team, slot }),
    leave: () => (mine ? act({ action: 'leave', roomId: mine.id }) : Promise.resolve(null)),
    ready: (ready: boolean) => (mine ? act({ action: 'ready', roomId: mine.id, ready }) : Promise.resolve(null)),
    call: () => (mine ? act({ action: 'call', roomId: mine.id }) : Promise.resolve(null)),
    /** Revancha de una sala terminada: la arma o me suma a la que ya armó otro. */
    rematch: (roomId: string) => act({ action: 'rematch', roomId }),
  }
}

export type TeamRooms = ReturnType<typeof useTeamRooms>

/** La línea de El Errante para la pestaña 2 vs 2. */
export function teamLine(t: TeamRooms, me: Me): string {
  if (t.notice) return t.notice
  const m = t.mine
  if (m?.status === 'lobby') {
    const filled = m.seats.length
    if (filled < 4) return filled === 3 ? 'Falta uno para arrancar.' : `Faltan ${4 - filled} para arrancar.`
    const mine = m.seats.find((s) => s.userId === me.id)
    if (mine && !mine.ready) return 'Están los cuatro. ¿Listo?'
    const waiting = m.seats.filter((s) => !s.ready).map((s) => s.username)
    return waiting.length ? `Esperando a ${waiting.join(' y ')}.` : '¡A pelear!'
  }
  const open = t.rooms.filter((r) => r.status === 'lobby' && r.seats.length < 4)
  if (me.isAdmin) {
    const calling = open.filter((r) => r.needsTeacher)
    return calling.length ? `${calling.length === 1 ? 'Una sala te llama' : `${calling.length} salas te llaman`}: falta alguien.` : 'Si una sala te llama, sentate donde falta alguien.'
  }
  if (open.length === 0) return 'No hay salas abiertas. ¿Armás una?'
  return open.length === 1 ? 'Hay una sala esperando gente.' : `Hay ${open.length} salas esperando gente.`
}

// ─── Panel ─────────────────────────────────────────────────────────────────
export function TeamLobbyPanel({ t, me, myDefeated, myMaxStake }: { t: TeamRooms; me: Me; myDefeated: string[]; myMaxStake: ArenaStake }) {
  const [open, setOpen] = useState<string | null>(null)
  const [making, setMaking] = useState(false)
  const [topic, setTopic] = useState<string | null>(null)
  const [stake, setStake] = useState<ArenaStake>(0)

  const defeated = useMemo(() => new Set(myDefeated), [myDefeated])
  const myTopics = useMemo(() => ARENA_TOPICS.filter((b) => defeated.has(b.id) && ARENA_TOPIC_IDS.has(b.id)), [defeated])
  const canStake = (s: ArenaStake) => s === 0 || (!me.isTest && !me.isAdmin && s <= myMaxStake)
  /** ¿Por qué no me puedo sentar en esta sala? (null = puedo) */
  const lockOf = (r: RoomView): string | null => {
    if (me.isAdmin) return null
    if (r.topics.some((id) => !defeated.has(id))) return 'temas que no viste'
    if (r.stake > 0 && !canStake(r.stake as ArenaStake)) return 'no te alcanzan los diamantes'
    return null
  }

  if (t.mine?.status === 'lobby') {
    const m = t.mine
    const meSeat = m.seats.find((s) => s.userId === me.id)
    const full = m.seats.length === 4
    return (
      <div className="team-lobby">
        <div className="lobby-terms">
          <span>{topicName(m.bossId)}</span>
          <span>{m.stake > 0 ? <>cada uno <Diamonds n={m.stake} size={13} /></> : 'amistoso'}</span>
        </div>
        <RoomBoard room={m} meId={me.id} onSeat={(team, slot) => t.seat(m.id, team, slot)} busy={t.busy} />
        <div className="lobby-actions">
          {meSeat && (
            <button type="button" className={`arena-go lobby-go${meSeat.ready ? ' arena-go--ghost' : ''}`} disabled={t.busy || !full} aria-pressed={meSeat.ready} onClick={() => { sfx.confirm(); void t.ready(!meSeat.ready) }}>
              {meSeat.ready ? 'no estoy listo' : '¡listo! ▸'}
            </button>
          )}
          {!full && !m.needsTeacher && !me.isAdmin && (
            <button type="button" className="arena-go arena-go--ghost" disabled={t.busy} onClick={() => { sfx.notify(); void t.call() }}>llamar al docente</button>
          )}
          {!full && m.needsTeacher && <span className="lobby-hint">docente avisado</span>}
          <button type="button" className="arena-link" onClick={() => void t.leave()}>salir</button>
        </div>
      </div>
    )
  }

  const listed = t.rooms.filter((r) => r.status === 'lobby')
  const playing = t.rooms.filter((r) => r.status === 'active')
  return (
    <div className="team-lobby">
      <h2 className="lobby-title">{listed.length ? '¿A qué sala?' : 'Salas'}</h2>
      {listed.length === 0 && <div className="lobby-empty">Ninguna sala abierta</div>}
      <div className="lobby-list">
        {listed.map((r) => {
          const lock = lockOf(r)
          const isOpen = open === r.id
          return (
            <div key={r.id} className={`lobby-pick${isOpen ? ' lobby-pick--on' : ''}${r.needsTeacher && me.isAdmin ? ' lobby-pick--call' : ''}`}>
              <button type="button" className="lobby-row room-row" disabled={!!lock} aria-expanded={isOpen} onClick={() => { sfx.select(); setOpen(isOpen ? null : r.id) }}>
                <RoomMini room={r} />
                <span className="room-row-terms">
                  <span>{topicName(r.bossId)}</span>
                  <span>{r.stake > 0 ? <Diamonds n={r.stake} size={11} /> : 'amistoso'}</span>
                </span>
                <span className="lobby-row-cta">{lock ?? (isOpen ? 'cerrar' : 'entrar ▸')}</span>
              </button>
              {isOpen && !lock && (
                <div className="lobby-setup">
                  <RoomBoard room={r} meId={me.id} onSeat={(team, slot) => t.seat(r.id, team, slot)} busy={t.busy} />
                </div>
              )}
            </div>
          )
        })}
        {playing.map((r) => (
          <div key={r.id} className="lobby-row lobby-row--off room-row">
            <RoomMini room={r} />
            <span className="room-row-terms"><span>{topicName(r.bossId)}</span></span>
            <span className="lobby-row-cta">en duelo</span>
          </div>
        ))}
      </div>

      {!me.isAdmin && (
        <div className={`lobby-pick${making ? ' lobby-pick--on' : ''}`}>
          <button type="button" className="lobby-row" aria-expanded={making} onClick={() => { sfx.select(); setMaking(!making) }}>
            <span className="room-seat-plus room-seat-plus--sm" aria-hidden />
            <span className="lobby-name">armar sala</span>
            <span className="lobby-row-cta">{making ? 'cerrar' : '▸'}</span>
          </button>
          {making && (
            <div className="lobby-setup">
              <div className="lobby-step">
                <span className="lobby-step-q">¿de qué?</span>
                <div className="lobby-chips" role="group" aria-label="Tema">
                  {myTopics.length > 1 && (
                    <button type="button" className="lobby-chip" aria-pressed={topic === ARENA_MIX} onClick={() => { sfx.select(); setTopic(ARENA_MIX) }}>de todo un poco</button>
                  )}
                  {myTopics.map((b) => (
                    <button key={b.id} type="button" className="lobby-chip" aria-pressed={topic === b.id} onClick={() => { sfx.select(); setTopic(b.id) }}>{b.topic}</button>
                  ))}
                </div>
              </div>
              <div className="lobby-step">
                <span className="lobby-step-q">¿por diamantes?</span>
                <div className="lobby-chips" role="group" aria-label="Por diamantes o amistoso">
                  {([0, 5, 10] as ArenaStake[]).map((s) => (
                    <button key={s} type="button" className="lobby-chip" aria-pressed={stake === s} disabled={!canStake(s)} onClick={() => { sfx.select(); setStake(s) }}>
                      {s === 0 ? 'amistoso' : <Diamonds n={s} size={12} />}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className="arena-go lobby-go" disabled={!topic || t.busy} onClick={() => { if (topic) { sfx.confirm(); void t.create(topic, stake).then((r) => { if (r) setMaking(false) }) } }}>
                armar ▸
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Los dos equipos con sus cuatro lugares. Un lugar libre se toca para sentarse. */
function RoomBoard({ room, meId, onSeat, busy }: { room: RoomView; meId: string; onSeat: (team: Team, slot: Slot) => void; busy: boolean }) {
  return (
    <div className="room-board">
      {TEAMS.map((team, i) => (
        <div key={team} className="room-team-wrap">
          {i === 1 && <span className="duel-vs room-vs" aria-hidden>vs</span>}
          <div className={`room-team room-team--${team}`}>
            <div className="room-team-head"><TeamBanner team={team} size={3} /><span>{TEAM_NAME[team]}</span></div>
            {([1, 2] as Slot[]).map((slot) => {
              const s = room.seats.find((x) => x.team === team && x.slot === slot)
              return <Seat key={slot} seat={s} me={s?.userId === meId} onSit={() => { sfx.select(); onSeat(team, slot) }} busy={busy} />
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function Seat({ seat, me, onSit, busy }: { seat?: RoomSeatView; me: boolean; onSit: () => void; busy: boolean }) {
  if (!seat) {
    return (
      <button type="button" className="room-seat room-seat--free" onClick={onSit} disabled={busy} aria-label="Lugar libre: sentarme">
        <span className="room-seat-plus" aria-hidden />
      </button>
    )
  }
  return (
    <div className={`room-seat${me ? ' room-seat--me' : ''}${seat.ready ? ' room-seat--ready' : ''}`}>
      <span className="room-seat-name">{seat.username}</span>
      {seat.role === 'docente' && <span className="arena-label">docente</span>}
      {seat.ready && <span className="room-seat-check" aria-label="listo"><PixelBitmap rows={ICON_CHECK} scale={3} /></span>}
    </div>
  )
}

/** Resumen de una sala en la lista: los dos estandartes con sus lugares ocupados. */
function RoomMini({ room }: { room: RoomView }) {
  return (
    <span className="room-mini" aria-label={`${room.seats.length} de 4 lugares ocupados`}>
      {TEAMS.map((team) => (
        <span key={team} className="room-mini-team">
          <TeamBanner team={team} size={2} />
          {([1, 2] as Slot[]).map((slot) => (
            <span key={slot} className={`room-mini-dot${room.seats.some((s) => s.team === team && s.slot === slot) ? ' on' : ''}`} />
          ))}
        </span>
      ))}
    </span>
  )
}
