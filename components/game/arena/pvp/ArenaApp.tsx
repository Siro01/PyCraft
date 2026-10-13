'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { BOSSES } from '@/lib/game/bosses'
import { sfx } from '@/lib/game/architect/sound'
import { ARENA_TOPIC_IDS } from '@/lib/game/arena/generators'
import { ARENA_INVITE_SECONDS, ARENA_MIX, sharedTopics, type ArenaStake } from '@/lib/game/arena/rules'
import type { RosterEntry } from '@/lib/game/arena/server'
import type { ArenaStats, LobbyEvent, MatchView } from '@/lib/game/arena/types'
import { diamondsAvailable, setArenaStats } from '@/lib/storage/local-store'
import ArenaDuel from './ArenaDuel'
import ArenaHerald, { ErranteStage } from './ArenaHerald'
import { callArena, createLiveTransport } from './live'
import type { DuelTransport } from './transport'

// El lobby de La Arena: los compañeros del aula que están conectados (Supabase
// Presence), el armado del reto y los retos que te llegan. Los avisos de reto
// solo llegan a quien está acá adentro: el resto del juego no abre ninguna
// conexión en tiempo real.

interface Me { id: string; username: string; isAdmin: boolean; isTest: boolean }
export interface Presence { id: string; username: string; isAdmin: boolean; status: 'lobby' | 'duel' }

interface Props {
  me: Me
  aulaId: string
  aulaName: string
  /** Solo docente: para cambiar de aula. */
  aulas?: { id: string; nombre: string }[]
  roster: RosterEntry[]
  myDefeated: string[]
  myMaxStake: ArenaStake
  /** Solo /demo/arena: datos fijos, sin servidor ni tiempo real. */
  preview?: { online: Presence[]; state: ArenaState }
}

export interface ArenaState { stats: ArenaStats; live: MatchView | null; incoming: MatchView[]; history: MatchView[] }

const topicName = (id: string) => (id === ARENA_MIX ? 'Mezcla de temas' : BOSSES.find((b) => b.id === id)?.topic ?? id)

export default function ArenaApp({ me, aulaId, aulaName, aulas, roster, myDefeated, myMaxStake, preview }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => (preview ? null : createClient()), [preview])
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
    if (preview) { setState(preview.state); return preview.state }
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
  }, [myDefeated.length, preview])
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
    if (!supabase) { setOnline(new Map((preview?.online ?? []).map((p) => [p.id, p]))); return }
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
    if (!duelId || !supabase) return
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

  // Quién se puede retar ahora, quién está ocupado y quién no está.
  const ready = people.filter((p) => p.unlocked && online.get(p.id)?.status === 'lobby')
  const busyNow = people.filter((p) => online.get(p.id)?.status === 'duel')
  const away = people.filter((p) => !ready.includes(p) && !busyNow.includes(p))

  // La única línea de ayuda de la pantalla: la dice El Errante y cambia con lo que pasa.
  const line = notice
    ?? (incoming[0] ? `¡${incoming[0].rival.username} te desafía! ¿Aceptás?`
      : waiting ? `Le llevé tu reto a ${waiting.rival.username}. Tiene un minuto para contestar.`
      : rival ? `¿Contra ${rival.username}? Elegí el tema y si va por diamantes.`
      : !state ? 'Shh...'
      : ready.length === 0 ? 'Todavía no hay nadie listo. Cuando un compañero entre a la arena, aparece acá.'
      : ready.length === 1 ? 'Hay alguien esperando rival. ¿Te animás?'
      : `Hay ${ready.length} compañeros esperando rival. Elegí a quién retar.`)

  const limitHint = rival && friendlyOnly ? 'Con el docente o la cuenta de prueba, solo amistoso.'
    : rival && myMaxStake === 0 ? 'Hoy no te alcanzan los diamantes: solo amistoso.'
    : rival && rival.maxStake === 0 ? `${rival.username} no tiene diamantes hoy: solo amistoso.`
    : null

  return (
    <div className="lobby">
      {herald && (
        <ArenaHerald key={herald} full={herald === 'full'} onDone={heraldDone} onExplain={() => setHerald('full')} />
      )}

      <header className="arena-top">
        <a href="/dashboard" className="arena-link">← mapa</a>
        <h1 className="arena-tag" style={{ margin: 0, fontWeight: 400 }}>la arena · {aulaName}</h1>
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
        <span className="lobby-purse" title="Tus diamantes"><Diamonds n={diamonds} size={13} /></span>
        <span className="arena-tag" title="Experiencia ganada en la arena">{stats.xp} xp</span>
      </header>

      <div className="lobby-grid">
        <ErranteStage line={line} onExplain={() => setHerald('full')} />

        <section className="lobby-side" aria-label="Retar a un compañero">
          {incoming.map((m) => (
            <div key={m.id} className="lobby-panel lobby-invite" role="alertdialog" aria-label={`Reto de ${m.rival.username}`}>
              <div className="lobby-invite-who">
                <span className="lobby-name lobby-name--xl">{m.rival.username}</span>
                <span className="lobby-timer">{left(m)}s</span>
              </div>
              <div className="lobby-terms">
                <span>{topicName(m.bossId)}</span>
                <span>{m.stake > 0 ? <>por <Diamonds n={m.stake} size={13} /></> : 'amistoso'}</span>
              </div>
              <div className="lobby-actions">
                <button type="button" className="arena-go lobby-go" disabled={busy} onClick={() => answer(m, true)}>aceptar ▸</button>
                <button type="button" className="arena-go arena-go--ghost" disabled={busy} onClick={() => answer(m, false)}>ahora no</button>
              </div>
            </div>
          ))}

          {waiting && (
            <div className="lobby-panel" role="status">
              <div className="lobby-invite-who">
                <span className="lobby-name lobby-name--xl">{waiting.rival.username}</span>
                <span className="lobby-timer">{left(waiting)}s</span>
              </div>
              <div className="lobby-terms">
                <span>{topicName(waiting.bossId)}</span>
                <span>{waiting.stake > 0 ? <>por <Diamonds n={waiting.stake} size={13} /></> : 'amistoso'}</span>
              </div>
              <div className="lobby-actions">
                <button type="button" className="arena-go arena-go--ghost" onClick={cancel}>cancelar reto</button>
              </div>
            </div>
          )}

          {!incoming.length && !waiting && (
            <>
              <h2 className="lobby-title">¿Contra quién?</h2>

              {ready.length === 0 && busyNow.length === 0 && (
                <div className="lobby-empty">Nadie conectado todavía</div>
              )}

              <div className="lobby-list">
                {ready.map((p) => {
                  const selected = rivalId === p.id
                  return (
                    <div key={p.id} className={selected ? 'lobby-pick lobby-pick--on' : 'lobby-pick'}>
                      <button type="button" className="lobby-row" aria-expanded={selected} onClick={() => pickRival(p.id)}>
                        <span className="lobby-dot lobby-dot--on" aria-hidden />
                        <span className="lobby-name">{p.username}</span>
                        <span className="lobby-row-cta" aria-hidden>{selected ? 'cerrar' : 'retar ▸'}</span>
                      </button>

                      {selected && (
                        <div className="lobby-setup">
                          {topics.length === 0 ? (
                            <p className="lobby-hint">Todavía no tienen temas en común.</p>
                          ) : (
                            <>
                              <div className="lobby-step">
                                <span className="lobby-step-q">¿de qué?</span>
                                <div className="lobby-chips" role="group" aria-label="Tema del duelo">
                                  {topics.length > 1 && (
                                    <button type="button" className="lobby-chip" aria-pressed={topic === ARENA_MIX} onClick={() => { sfx.select(); setTopic(ARENA_MIX) }}>de todo un poco</button>
                                  )}
                                  {topics.map((t) => (
                                    <button key={t.id} type="button" className="lobby-chip" aria-pressed={topic === t.id} onClick={() => { sfx.select(); setTopic(t.id) }}>
                                      {t.topic}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="lobby-step">
                                <span className="lobby-step-q">¿por diamantes?</span>
                                <div className="lobby-chips" role="group" aria-label="Por diamantes o amistoso">
                                  {([0, 5, 10] as ArenaStake[]).map((s) => (
                                    <button key={s} type="button" className="lobby-chip" aria-pressed={stake === s} disabled={!stakeAllowed(s)} onClick={() => { sfx.select(); setStake(s) }}>
                                      {s === 0 ? 'amistoso' : <Diamonds n={s} size={12} />}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {limitHint && <p className="lobby-hint">{limitHint}</p>}
                              <button type="button" className="arena-go lobby-go" disabled={!topic || busy} onClick={challenge}>
                                retar a {p.username} ▸
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {busyNow.map((p) => (
                  <div key={p.id} className="lobby-row lobby-row--off">
                    <span className="lobby-dot lobby-dot--busy" aria-hidden />
                    <span className="lobby-name">{p.username}</span>
                    <span className="lobby-row-cta">en duelo</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {away.length > 0 && (
            <details className="lobby-more">
              <summary>{away.length === 1 ? '1 compañero no está' : `${away.length} compañeros no están`} en la arena</summary>
              <ul>
                {away.map((p) => <li key={p.id}>{p.username}{!p.unlocked && <span> · todavía no venció al Golem</span>}</li>)}
              </ul>
            </details>
          )}

          {(state?.history.length ?? 0) > 0 && (
            <details className="lobby-more">
              <summary>tus últimos duelos</summary>
              <ul>
                {state!.history.slice(0, 5).map((m) => {
                  const won = m.winnerId === m.me.id
                  const draw = !m.winnerId
                  return (
                    <li key={m.id}>
                      {m.endReason === 'voided' ? 'anulado' : draw ? 'empate' : won ? 'ganaste' : 'perdiste'} vs {m.rival.username}
                      {m.result && m.result.diamonds !== 0 && <> · <Diamonds n={m.result.diamonds} sign size={10} /></>}
                      {m.result && m.result.xp > 0 && <> · +{m.result.xp} xp</>}
                    </li>
                  )
                })}
              </ul>
            </details>
          )}
        </section>
      </div>
    </div>
  )
}
