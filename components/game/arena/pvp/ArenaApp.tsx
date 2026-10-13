'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import DiamondIcon, { Diamonds } from '@/components/ui/DiamondIcon'
import { BOSSES } from '@/lib/game/bosses'
import { sfx } from '@/lib/game/architect/sound'
import { ARENA_TOPIC_IDS } from '@/lib/game/arena/generators'
import {
  ARENA_DAILY_LOSS_CAP, ARENA_DUEL_SECONDS, ARENA_EXERCISES, ARENA_INVITE_SECONDS, ARENA_MIX, ARENA_PAIR_DAILY_STAKED,
  ARENA_XP_LOSS, ARENA_XP_WIN, sharedTopics, type ArenaStake,
} from '@/lib/game/arena/rules'
import type { RosterEntry } from '@/lib/game/arena/server'
import type { ArenaStats, LobbyEvent, MatchView } from '@/lib/game/arena/types'
import { diamondsAvailable, setArenaStats } from '@/lib/storage/local-store'
import ArenaDuel from './ArenaDuel'
import ArenaHerald, { ErranteBadge } from './ArenaHerald'
import { callArena, createLiveTransport } from './live'
import type { DuelTransport } from './transport'

// El lobby de La Arena: los compañeros del aula que están conectados (Supabase
// Presence), el armado del reto y los retos que te llegan. Los avisos de reto
// solo llegan a quien está acá adentro: el resto del juego no abre ninguna
// conexión en tiempo real.

interface Me { id: string; username: string; isAdmin: boolean; isTest: boolean }
interface Presence { id: string; username: string; isAdmin: boolean; status: 'lobby' | 'duel' }

interface Props {
  me: Me
  aulaId: string
  aulaName: string
  /** Solo docente: para cambiar de aula. */
  aulas?: { id: string; nombre: string }[]
  roster: RosterEntry[]
  myDefeated: string[]
  myMaxStake: ArenaStake
}

interface ArenaState { stats: ArenaStats; live: MatchView | null; incoming: MatchView[]; history: MatchView[] }

const topicName = (id: string) => (id === ARENA_MIX ? 'Mezcla de temas' : BOSSES.find((b) => b.id === id)?.topic ?? id)

export default function ArenaApp({ me, aulaId, aulaName, aulas, roster, myDefeated, myMaxStake }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [state, setState] = useState<ArenaState | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [diamonds, setDiamonds] = useState(0)

  // ── El Errante presenta la arena: completa la primera vez, un saludo después.
  const introKey = `pysql:arena-intro:${me.id}`
  const [herald, setHerald] = useState<'full' | 'short' | null>(null)
  useEffect(() => {
    let seen = false
    try { seen = localStorage.getItem(introKey) === '1' } catch { /* modo privado */ }
    setHerald(seen ? 'short' : 'full')
  }, [introKey])
  const heraldDone = () => {
    try { localStorage.setItem(introKey, '1') } catch { /* modo privado */ }
    setHerald(null)
  }

  // ── Estado (servidor)
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/arena', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setNotice(json.error ?? 'No se pudo cargar la arena.'); return null }
      const s = json as ArenaState
      setArenaStats(s.stats)
      setDiamonds(diamondsAvailable(myDefeated.length))
      setState(s)
      return s
    } catch { setNotice('Sin conexión con el servidor.'); return null }
  }, [myDefeated.length])
  useEffect(() => { setDiamonds(diamondsAvailable(myDefeated.length)); load() }, [load, myDefeated.length])

  const live = state?.live ?? null
  const duel = live?.status === 'active' ? live : null
  const waiting = live?.status === 'pending' && live.iChallenged ? live : null
  const [finishedDuel, setFinishedDuel] = useState<MatchView | null>(null)
  const shownDuel = duel ?? finishedDuel

  // ── Lobby en tiempo real
  const [online, setOnline] = useState<Map<string, Presence>>(new Map())
  const chRef = useRef<RealtimeChannel | null>(null)
  const statusRef = useRef<'lobby' | 'duel'>('lobby')
  statusRef.current = shownDuel ? 'duel' : 'lobby'
  const onLobbyRef = useRef<(ev: LobbyEvent) => void>(() => {})

  useEffect(() => {
    const ch = supabase.channel(`arena-lobby-${aulaId}`, { config: { private: true, presence: { key: me.id }, broadcast: { self: false } } })
    chRef.current = ch
    ch.on('presence', { event: 'sync' }, () => {
      const map = new Map<string, Presence>()
      for (const [id, metas] of Object.entries(ch.presenceState<Presence>())) if (metas[0]) map.set(id, metas[0])
      setOnline(map)
    })
    ch.on('broadcast', { event: 'lobby' }, ({ payload }) => onLobbyRef.current(payload as LobbyEvent))
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') void ch.track({ id: me.id, username: me.username, isAdmin: me.isAdmin, status: statusRef.current })
    })
    return () => { chRef.current = null; void supabase.removeChannel(ch) }
  }, [supabase, aulaId, me.id, me.username, me.isAdmin])

  const presenceStatus = shownDuel ? 'duel' : 'lobby'
  useEffect(() => {
    void chRef.current?.track({ id: me.id, username: me.username, isAdmin: me.isAdmin, status: presenceStatus })
  }, [presenceStatus, me.id, me.username, me.isAdmin])

  const broadcast = useCallback((ev: LobbyEvent) => {
    void chRef.current?.send({ type: 'broadcast', event: 'lobby', payload: ev })
  }, [])

  onLobbyRef.current = (ev: LobbyEvent) => {
    if (ev.to !== me.id) return
    if (ev.type === 'invite') sfx.notify()
    if (ev.type === 'answer' && !ev.accepted) setNotice('Rechazó el reto.')
    void load()
  }

  // Mientras espero respuesta, por si el aviso no llega.
  useEffect(() => {
    if (!waiting) return
    const id = setInterval(load, 3_000)
    return () => clearInterval(id)
  }, [waiting, load])

  // ── Transporte del duelo (lo crea y lo cierra este efecto)
  const duelId = duel?.id ?? null
  const [transport, setTransport] = useState<DuelTransport | null>(null)
  useEffect(() => {
    if (!duelId) return
    const t = createLiveTransport(supabase, duelId)
    setTransport(t)
    return () => { t.close(); setTransport(null) }
  }, [supabase, duelId])
  // Al terminar, la pantalla final queda aunque el duelo ya no sea "live".
  const [endTransport, setEndTransport] = useState<DuelTransport | null>(null)
  useEffect(() => { if (transport) setEndTransport(transport) }, [transport])

  // ── Armar un reto
  const [rivalId, setRivalId] = useState<string | null>(null)
  const [topic, setTopic] = useState<string | null>(null)
  const [stake, setStake] = useState<ArenaStake>(0)

  const people: RosterEntry[] = useMemo(() => {
    const list = [...roster]
    // Quien está conectado pero no es del aula (el docente probando) también aparece.
    for (const p of online.values()) {
      if (p.id === me.id || list.some((r) => r.id === p.id)) continue
      list.push({ id: p.id, username: p.username, isAdmin: p.isAdmin, isTest: false, unlocked: true, defeated: p.isAdmin ? BOSSES.map((b) => b.id) : [], maxStake: 0 })
    }
    const rank = (r: RosterEntry) => (online.has(r.id) ? (online.get(r.id)!.status === 'lobby' ? 0 : 1) : 2)
    return list.sort((a, b) => rank(a) - rank(b) || a.username.localeCompare(b.username))
  }, [roster, online, me.id])

  const rival = people.find((p) => p.id === rivalId) ?? null
  const topics = useMemo(() => (rival ? sharedTopics(myDefeated, rival.defeated).filter((t) => ARENA_TOPIC_IDS.has(t.id)) : []), [rival, myDefeated])
  const friendlyOnly = !rival || me.isAdmin || me.isTest || rival.isAdmin || rival.isTest
  const stakeAllowed = (s: ArenaStake) => s === 0 || (!friendlyOnly && s <= myMaxStake && s <= (rival?.maxStake ?? 0))

  const pickRival = (id: string) => {
    sfx.select()
    setRivalId(id === rivalId ? null : id)
    setTopic(null); setStake(0); setNotice(null)
  }

  const challenge = async () => {
    if (!rival || !topic) return
    setBusy(true); setNotice(null)
    try {
      const { match } = await callArena({ action: 'challenge', opponentId: rival.id, topic, stake })
      broadcast({ type: 'invite', from: me.id, to: rival.id, matchId: match.id })
      sfx.confirm()
      await load()
    } catch (e) { setNotice(e instanceof Error ? e.message : 'No se pudo retar.'); sfx.denied() } finally { setBusy(false) }
  }

  const cancel = async () => {
    if (!waiting) return
    try {
      await callArena({ action: 'cancel', matchId: waiting.id })
      broadcast({ type: 'cancel', from: me.id, to: waiting.rival.id, matchId: waiting.id })
    } catch { /* ya venció */ }
    await load()
  }

  const answer = async (m: MatchView, accept: boolean) => {
    setBusy(true); setNotice(null)
    try {
      await callArena({ action: accept ? 'accept' : 'decline', matchId: m.id })
      broadcast({ type: 'answer', from: me.id, to: m.rival.id, matchId: m.id, accepted: accept })
      if (accept) sfx.confirm()
    } catch (e) { setNotice(e instanceof Error ? e.message : 'No se pudo responder.'); sfx.denied() } finally { setBusy(false) }
    await load()
  }

  // Reloj para los retos (vencen al minuto).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1_000); return () => clearInterval(id) }, [])
  const left = (m: MatchView) => Math.max(0, ARENA_INVITE_SECONDS - Math.floor((now - Date.parse(m.createdAt)) / 1000))
  const incoming = (state?.incoming ?? []).filter((m) => left(m) > 0)

  // ── Duelo en pantalla
  if (shownDuel && (transport ?? endTransport)) {
    return (
      <ArenaDuel
        key={shownDuel.id}
        initial={shownDuel}
        transport={(transport ?? endTransport)!}
        onFinished={(m) => { setFinishedDuel(m); void load() }}
        onExit={() => { setFinishedDuel(null); setEndTransport(null); void load() }}
        onRematch={() => {
          setFinishedDuel(null); setEndTransport(null)
          setRivalId(shownDuel.rival.id); setTopic(shownDuel.bossId); setStake(shownDuel.stake as ArenaStake)
          void load()
        }}
      />
    )
  }

  const stats = state?.stats ?? { net: 0, xp: 0 }

  return (
    <div className="lobby">
      {herald && (
        <ArenaHerald key={herald} full={herald === 'full'} onDone={heraldDone} onExplain={() => setHerald('full')} />
      )}
      <header className="arena-top">
        <a href="/dashboard" className="arena-link">← mapa</a>
        <span className="arena-tag">la arena · {aulaName}</span>
        {aulas && aulas.length > 1 && (
          <select
            className="input text-xs py-1"
            aria-label="Aula"
            value={aulaId}
            onChange={(e) => router.push(`/arena?aula=${e.target.value}`)}
            style={{ width: 'auto' }}
          >
            {aulas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        )}
        <span className="arena-top-spacer" />
        <span className="arena-tag" title="Tus diamantes">
          <Diamonds n={diamonds} size={11} />
        </span>
        <span className="arena-tag" title="XP ganado en la arena">{stats.xp} xp de arena</span>
      </header>

      <div className="arena-grid">
        {/* ── Reglas e historial ─────────────────────────────────── */}
        <section className="arena-boss" aria-label="Cómo se juega">
          <div className="arena-name">
            <span>LA ARENA</span>
            <small>duelos entre compañeros</small>
          </div>
          <ErranteBadge onClick={() => setHerald('full')} />
          <ul className="arena-note" style={{ margin: 0, paddingLeft: 10, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Los dos reciben los mismos {ARENA_EXERCISES} ejercicios. Gana el primero que los resuelve.</li>
            <li>Tienen {ARENA_DUEL_SECONDS / 60} minutos. Si se acaba el tiempo, gana quien resolvió más; si van empatados, quien llegó primero.</li>
            <li>Se pueden retar por 5 o 10 <DiamondIcon size={12} /> (lo que gana uno lo pierde el otro) o un amistoso, donde nadie pierde nada.</li>
            <li>Ganar da {ARENA_XP_WIN} XP y perder {ARENA_XP_LOSS}, solo el primer duelo con cada compañero en cada acto.</li>
            <li>Los ítems se pueden usar contra el rival, pero se gastan aunque pierdas.</li>
          </ul>
          <div className="arena-num">Tope: {ARENA_DAILY_LOSS_CAP} diamantes perdidos por día y {ARENA_PAIR_DAILY_STAKED} retos por diamantes por día contra el mismo compañero.</div>

          {(state?.history.length ?? 0) > 0 && (
            <>
              <div className="arena-label" style={{ marginTop: 14 }}>últimos duelos</div>
              <ul className="lobby-history" style={{ margin: 0, padding: 0 }}>
                {state!.history.map((m) => {
                  const won = m.winnerId === m.me.id
                  const draw = !m.winnerId
                  return (
                    <li key={m.id}>
                      <span style={{ color: draw ? 'hsl(var(--tx3))' : won ? 'hsl(var(--accent))' : 'hsl(var(--danger))' }}>
                        {m.endReason === 'voided' ? 'anulado' : draw ? 'empate' : won ? 'ganaste' : 'perdiste'}
                      </span>
                      <span>vs {m.rival.username}</span>
                      <span style={{ color: 'hsl(var(--tx3))' }}>{topicName(m.bossId)}</span>
                      {m.result && m.result.diamonds !== 0 && <Diamonds n={m.result.diamonds} sign size={10} />}
                      {m.result && m.result.xp > 0 && <span>+{m.result.xp} xp</span>}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>

        {/* ── Compañeros, retos ──────────────────────────────────── */}
        <section className="arena-work">
          {notice && <p className="arena-note" role="status">{notice}</p>}

          {incoming.map((m) => (
            <div key={m.id} className="lobby-panel lobby-invite" role="alertdialog" aria-label={`Reto de ${m.rival.username}`}>
              <h3>te retaron · vence en {left(m)} s</h3>
              <div className="lobby-name">{m.rival.username}</div>
              <p className="arena-note" style={{ margin: 0 }}>
                {topicName(m.bossId)} · {m.stake > 0 ? <>por <Diamonds n={m.stake} size={13} /> (si perdés, los perdés)</> : 'amistoso, nadie pierde nada'}
              </p>
              <div className="arena-choices" style={{ marginTop: 0 }}>
                <button type="button" className="arena-go" disabled={busy} onClick={() => answer(m, true)}>aceptar ▸</button>
                <button type="button" className="arena-go arena-go--ghost" disabled={busy} onClick={() => answer(m, false)}>ahora no</button>
              </div>
            </div>
          ))}

          {waiting && (
            <div className="lobby-panel" role="status">
              <h3>esperando respuesta · {left(waiting)} s</h3>
              <p className="arena-note" style={{ margin: 0 }}>
                Retaste a <strong>{waiting.rival.username}</strong> · {topicName(waiting.bossId)} · {waiting.stake > 0 ? <Diamonds n={waiting.stake} size={13} /> : 'amistoso'}
              </p>
              <div><button type="button" className="arena-go arena-go--ghost" onClick={cancel}>cancelar reto</button></div>
            </div>
          )}

          <div className="arena-label">compañeros · {[...online.keys()].filter((id) => id !== me.id).length} conectados</div>
          {people.length === 0 && <p className="arena-note">Todavía no hay nadie más en tu aula.</p>}
          <div className="lobby-list">
            {people.map((p) => {
              const pres = online.get(p.id)
              const inDuel = pres?.status === 'duel'
              const can = !!pres && !inDuel && p.unlocked && !waiting
              const meta = !p.unlocked ? 'todavía no abrió la arena'
                : !pres ? 'no está en la arena'
                : inDuel ? 'en un duelo'
                : p.isAdmin ? 'docente · solo amistoso'
                : p.maxStake === 0 ? 'conectado · solo amistoso'
                : 'conectado'
              const selected = rivalId === p.id
              return (
                <div key={p.id}>
                  <button
                    type="button"
                    className={`lobby-row${selected ? ' lobby-row--on' : ''}`}
                    disabled={!can}
                    aria-expanded={selected}
                    onClick={() => pickRival(p.id)}
                  >
                    <span className={`lobby-dot${pres ? (inDuel ? ' lobby-dot--busy' : ' lobby-dot--on') : ''}`} aria-hidden />
                    <span className="flex flex-col gap-1 min-w-0">
                      <span className="lobby-name">{p.username}</span>
                      <span className="lobby-meta">{meta}</span>
                    </span>
                    {can && <span className="arena-link" aria-hidden>{selected ? 'cerrar' : 'retar ▸'}</span>}
                  </button>

                  {selected && can && (
                    <div className="lobby-panel" style={{ borderTop: 0 }}>
                      <h3>tema</h3>
                      {topics.length === 0 ? (
                        <p className="arena-note" style={{ margin: 0 }}>Todavía no tienen temas en común.</p>
                      ) : (
                        <div className="lobby-chips" role="group" aria-label="Tema del duelo">
                          {topics.length > 1 && (
                            <button type="button" className="lobby-chip" aria-pressed={topic === ARENA_MIX} onClick={() => setTopic(ARENA_MIX)}>mezcla</button>
                          )}
                          {topics.map((t) => (
                            <button key={t.id} type="button" className="lobby-chip" aria-pressed={topic === t.id} onClick={() => setTopic(t.id)} title={t.name}>
                              {t.topic}
                            </button>
                          ))}
                        </div>
                      )}

                      <h3>¿por diamantes?</h3>
                      <div className="lobby-chips" role="group" aria-label="Reto por diamantes o amistoso">
                        {([0, 5, 10] as ArenaStake[]).map((s) => (
                          <button key={s} type="button" className="lobby-chip" aria-pressed={stake === s} disabled={!stakeAllowed(s)} onClick={() => setStake(s)}>
                            {s === 0 ? 'amistoso' : <Diamonds n={s} size={11} />}
                          </button>
                        ))}
                      </div>
                      {friendlyOnly
                        ? <span className="arena-num">Con el docente o la cuenta de prueba solo hay amistosos.</span>
                        : (myMaxStake === 0 || p.maxStake === 0) && (
                          <span className="arena-num">
                            {myMaxStake === 0 ? 'No te alcanzan los diamantes (o llegaste al tope de hoy): solo amistoso.' : `${p.username} no tiene diamantes para retarse hoy: solo amistoso.`}
                          </span>
                        )}

                      <div>
                        <button type="button" className="arena-go" disabled={!topic || busy} onClick={challenge}>
                          retar a {p.username} ▸
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
