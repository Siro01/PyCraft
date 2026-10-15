'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BattleConsole, { type BattleResult } from '@/components/game/arena/BattleConsole'
import PatoDebugWindow from '@/components/game/items/PatoDebugWindow'
import CompuHackeadaWindow from '@/components/game/items/CompuHackeadaWindow'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { executeChallenge, preloadPyodide, preloadSqlJs } from '@/lib/game/executor'
import { BOSSES } from '@/lib/game/bosses'
import { sfx } from '@/lib/game/architect/sound'
import { arenaChallenge } from '@/lib/game/arena/challenge'
import { ARENA_MIX } from '@/lib/game/arena/rules'
import {
  myTask, otherTeam, relayCandidate, relayState, SENAS, solvedBy, TEAM_EXERCISES, TEAM_NAME, type Team,
} from '@/lib/game/arena/team'
import type { DuelEvent, RoomSeatView, RoomView } from '@/lib/game/arena/types'
import type { Boss } from '@/types'
import { useArenaCombat } from '../useArenaCombat'
import { useSecondTick } from '../useSecondTick'
import { ColumnPips, Crosshair, TeamBanner } from './TeamBits'
import type { RoomTransport } from './transport'

// Duelo 2 vs 2. Izquierda: reloj y los dos equipos (cada jugador con su
// columna de 3). Derecha: tu ejercicio, el relevo cuando terminaste tu
// columna, o la espera. Tocás el nombre de un rival para apuntarle los ítems.

interface Props {
  initial: RoomView
  transport: RoomTransport
  meId: string
  sandbox?: boolean
  onExit?: () => void
  onFinished?: (r: RoomView) => void
  /** Volver a jugar con los mismos cuatro. */
  onRematch?: () => void
  /** Otro de los cuatro ya armó la revancha y te sentó en tu lugar. */
  rematchReady?: boolean
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function TeamDuel({ initial, transport, meId, sandbox = false, onExit, onFinished, onRematch, rematchReady = false }: Props) {
  const [room, setRoom] = useState<RoomView>(initial)
  const skew = useRef(0)
  const apply = useCallback((r: RoomView) => { skew.current = Date.parse(r.serverNow) - Date.now(); setRoom(r) }, [])
  useEffect(() => { apply(initial) }, [initial, apply])

  const now = useSecondTick()
  const serverNow = now + skew.current
  const startedAt = room.startedAt ? Date.parse(room.startedAt) : 0
  const endsAt = room.endsAt ? Date.parse(room.endsAt) : 0
  const finished = room.status === 'finished' || room.status === 'cancelled'
  const phase: 'countdown' | 'fight' | 'end' = finished ? 'end' : serverNow < startedAt ? 'countdown' : 'fight'
  const remaining = endsAt - serverNow
  const lastMinute = phase === 'fight' && remaining <= 60_000

  // ── Quién es quién
  const me = room.seats.find((s) => s.userId === meId) as RoomSeatView
  const myTeam: Team = me?.team ?? 'espada'
  const rivalTeam = otherTeam(myTeam)
  const mate = room.seats.find((s) => s.team === myTeam && s.userId !== meId) ?? null
  const rivals = room.seats.filter((s) => s.team === rivalTeam)
  const nameOf = useCallback((id: string) => room.seats.find((s) => s.userId === id)?.username ?? 'alguien', [room.seats])
  const isTeacher = me?.role === 'docente'

  // A quién van los ataques: por defecto, el rival de enfrente (mismo lugar).
  const [targetId, setTargetId] = useState<string | null>(null)
  const target = rivals.find((s) => s.userId === targetId && !s.gone) ?? rivals.find((s) => s.slot === me?.slot && !s.gone) ?? rivals.find((s) => !s.gone) ?? null

  // ── Motores (cargan durante la cuenta regresiva)
  useEffect(() => {
    if (!room.exercises.length) return
    if (room.exercises.some((e) => e.type === 'python')) preloadPyodide()
    if (room.exercises.some((e) => e.type === 'sql')) preloadSqlJs()
  }, [room.exercises])

  // ── Sincronía
  const refreshing = useRef(false)
  const refresh = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true
    try { apply(await transport.refresh()) } catch { /* se reintenta */ } finally { refreshing.current = false }
  }, [transport, apply])
  useEffect(() => {
    if (phase === 'end') return
    const id = setInterval(refresh, remaining <= 0 ? 2_000 : 5_000)
    return () => clearInterval(id)
  }, [phase, refresh, remaining <= 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const warned = useRef(false)
  useEffect(() => { if (lastMinute && !warned.current) { warned.current = true; sfx.warn() } }, [lastMinute])
  const reported = useRef(false)
  useEffect(() => {
    if (!finished || reported.current) return
    reported.current = true
    if (room.winnerTeam === myTeam) sfx.victory(); else if (room.winnerTeam) sfx.crash(); else sfx.close()
    onFinished?.(room)
  }, [finished, room, myTeam, onFinished])

  // ── Mi ejercicio
  const task = myTask(room.tasks, myTeam, meId)
  const exercise = task ? room.exercises[task.ex] : undefined
  const challenge = useMemo(() => (exercise ? arenaChallenge(exercise) : null), [exercise])
  const topicBoss: Boss = BOSSES.find((b) => b.id === exercise?.bossId) ?? BOSSES[0]
  const codeRef = useRef('')
  const [codeReplace, setCodeReplace] = useState<{ code: string; nonce: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastResult, setLastResult] = useState<BattleResult | null>(null)
  useEffect(() => { setLastResult(null); setCodeReplace(null) }, [challenge?.id])
  const relay = me ? relayState(room.tasks, room.seats, me) : 'none'

  // ── Ítems (mismos que el 1 vs 1, con rival elegido)
  const send = useCallback((ev: DuelEvent) => transport.send(ev), [transport])
  const replaceCode = useCallback((code: string) => setCodeReplace({ code, nonce: Date.now() }), [])
  const getCode = useCallback(() => codeRef.current, [])
  const combat = useArenaCombat({
    sandbox, send, meId, now, challenge, target: target ? { id: target.userId, username: target.username } : null, nameOf, getCode, replaceCode,
    disabled: isTeacher,
  })
  const { frozen, windy, hit, duck, setDuck, compuFix, setCompuFix, penguin, invLine, setInvLine, invEcho, consoleRef } = combat

  // ── Avisos de los otros tres
  const [typing, setTyping] = useState<Record<string, number>>({})
  const [bubbles, setBubbles] = useState<Record<string, { text: string; until: number }>>({})
  const onEvent = useCallback((ev: DuelEvent) => {
    if (ev.from === meId) return
    if (ev.type === 'progress' || ev.type === 'left') { void refresh(); return }
    if (ev.type === 'typing') { setTyping((t) => ({ ...t, [ev.from]: Date.now() + 4_000 })); return }
    if (ev.type === 'sena') {
      if (room.seats.find((s) => s.userId === ev.from)?.team !== myTeam) return
      setBubbles((b) => ({ ...b, [ev.from]: { text: ev.text, until: Date.now() + 3_500 } }))
      sfx.notify()
      return
    }
    combat.onItemEvent(ev)
  }, [meId, refresh, room.seats, myTeam, combat])
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  useEffect(() => transport.listen((ev) => onEventRef.current(ev)), [transport])

  const lastTyping = useRef(0)
  const onCodeChange = useCallback((c: string) => {
    const changed = codeRef.current !== '' && c !== codeRef.current
    codeRef.current = c
    if (!changed || Date.now() - lastTyping.current < 3_000) return
    lastTyping.current = Date.now()
    transport.send({ type: 'typing', from: meId })
  }, [transport, meId])

  // ── Acciones
  const [note, setNote] = useState<string | null>(null)
  const submit = useCallback(async (code: string, cheat = false) => {
    if (!challenge || !task || busy || frozen || phase !== 'fight') return
    setBusy(true)
    try {
      const src = cheat ? transport.cheat?.(task.ex) ?? code : code
      const res = await executeChallenge(challenge, src)
      if (res.error) { sfx.miss(); setLastResult({ isCorrect: false, output: '', expected: '', error: res.error, sql: res.sql }); return }
      const r = await transport.solve(task.idx, res.actualOutput)
      setLastResult({ isCorrect: r.correct, output: res.actualOutput, expected: '', error: null, sql: res.sql })
      apply(r.room)
      if (r.correct) { sfx.hit(); transport.send({ type: 'progress', from: meId }) } else sfx.miss()
    } catch {
      setLastResult({ isCorrect: false, output: '', expected: '', error: 'No se pudo hablar con el servidor. Probá de nuevo.' })
    } finally { setBusy(false) }
  }, [challenge, task, busy, frozen, phase, transport, apply, meId])

  const doRelay = useCallback(async () => {
    setNote(null)
    try {
      apply(await transport.relay())
      transport.send({ type: 'progress', from: meId })
      sfx.pageTurn()
    } catch (e) { setNote(e instanceof Error ? e.message : 'No se pudo.'); sfx.denied() }
  }, [transport, apply, meId])

  const lastSena = useRef(0)
  const sena = (text: string) => {
    if (Date.now() - lastSena.current < 2_000) return
    lastSena.current = Date.now()
    transport.send({ type: 'sena', from: meId, text })
    setBubbles((b) => ({ ...b, [meId]: { text, until: Date.now() + 3_000 } }))
    sfx.click()
  }

  const [confirmLeave, setConfirmLeave] = useState(false)
  const leave = useCallback(async () => {
    if (finished) { onExit?.(); return }
    if (!confirmLeave) { setConfirmLeave(true); sfx.warn(); return }
    setConfirmLeave(false)
    try { apply(await transport.leave()); transport.send({ type: 'left', from: meId }) } catch { /* reintenta con el refresh */ }
  }, [finished, confirmLeave, onExit, transport, apply, meId])

  if (!me) return <p className="arena-note">Cargando la sala…</p>

  const topicLabel = room.bossId === ARENA_MIX ? 'de todo un poco' : BOSSES.find((b) => b.id === room.bossId)?.topic ?? ''
  const candidate = relayCandidate(room.tasks, myTeam, me.slot)

  return (
    <div className="duel duel--team" data-phase={phase}>
      {hit && <div className="secret-hurt" aria-hidden />}
      {combat.tauntOn && <div className="duel-taunt" aria-hidden>67</div>}
      {duck === 'open' && challenge && <PatoDebugWindow boss={topicBoss} challenge={challenge} getCode={() => codeRef.current} onClose={() => setDuck('hidden')} />}
      {compuFix && <CompuHackeadaWindow fixes={compuFix.fixes} hasBlanks={compuFix.hasBlanks} onClose={() => setCompuFix(null)} />}

      <header className="arena-top">
        <button type="button" className="arena-link" onClick={leave}>
          {finished ? '← lobby' : confirmLeave ? '¿rendirte? tu compañero sigue solo · confirmá' : '← rendirse'}
        </button>
        {confirmLeave && <button type="button" className="arena-link" onClick={() => setConfirmLeave(false)}>no, sigo</button>}
        <span className="arena-tag">2 vs 2 · {topicLabel}</span>
        <span className="arena-top-spacer" />
        <span className="arena-tag">{room.stake > 0 ? <>cada uno <Diamonds n={room.stake} size={11} /></> : 'amistoso'}</span>
      </header>

      <div className="arena-grid">
        {/* ── Marcador ─────────────────────────────────────────── */}
        <section className="arena-boss" aria-label="Marcador">
          <div className={`duel-clock${lastMinute ? ' duel-clock--low' : ''}`} role="timer" aria-label="Tiempo restante">
            {phase === 'end' ? 'fin' : phase === 'countdown' ? fmt(endsAt - startedAt) : fmt(remaining)}
          </div>

          <TeamBlock
            team={myTeam} room={room} meId={meId} now={now} typing={phase === 'fight' ? typing : {}} bubbles={bubbles}
          />
          {phase === 'fight' && !isTeacher && mate && !mate.gone && (
            <div className="senas" role="group" aria-label={`Seña a ${mate.username}`}>
              {SENAS.map((s) => <button key={s} type="button" className="sena-btn" onClick={() => sena(s)}>{s}</button>)}
            </div>
          )}
          <div className="duel-vs">vs</div>
          <TeamBlock
            team={rivalTeam} room={room} meId={meId} now={now} typing={phase === 'fight' ? typing : {}} bubbles={{}}
            targetId={phase === 'fight' && !isTeacher ? target?.userId ?? null : null}
            onTarget={phase === 'fight' && !isTeacher ? (id) => { setTargetId(id); sfx.select() } : undefined}
          />

          {combat.statusTags.length > 0 && (
            <div className="arena-status" aria-label="Efectos activos">
              {combat.statusTags.map((t) => <span key={t}>{t}</span>)}
              {duck === 'hidden' && <button type="button" onClick={() => setDuck('open')}>pato</button>}
            </div>
          )}
        </section>

        {/* ── Trabajo ──────────────────────────────────────────── */}
        <section className="arena-work">
          {phase === 'countdown' && (
            <div className="duel-countdown">
              <div className="duel-countdown-n">{Math.max(1, Math.ceil((startedAt - serverNow) / 1000))}</div>
              <div className="team-vs-strip">
                <TeamBanner team={myTeam} size={4} /> <span>vs</span> <TeamBanner team={rivalTeam} size={4} />
              </div>
            </div>
          )}

          {phase === 'fight' && challenge && task && (
            <>
              <div className="arena-num">
                {task.ownerSlot === me.slot ? `ejercicio ${(task.idx % 3) + 1} de 3` : `relevo · el de ${mate?.username ?? 'tu compañero'}`}
              </div>
              <div ref={consoleRef} className={`duel-console${frozen ? ' duel-console--frozen' : ''}`}>
                <BattleConsole
                  boss={topicBoss}
                  challenge={challenge}
                  onSubmit={submit}
                  isLoading={busy}
                  lastResult={lastResult}
                  penguin={penguin}
                  codeReplace={codeReplace}
                  onCodeChange={onCodeChange}
                  taskHidden={windy}
                  goLabel="ejecutar"
                  wrongLabel="✗ Todavía no es lo que pide la consigna"
                />
                {frozen && <div className="duel-freeze" role="status"><span>congelado</span><strong>{combat.frozenLeft}</strong></div>}
              </div>
              {sandbox && <div className="arena-tools"><span>docente</span><button type="button" onClick={() => submit('', true)}>acierto</button></div>}
            </>
          )}

          {phase === 'fight' && !task && (
            <div className={`relay-panel${relay === 'ready' ? ' relay-panel--ready' : ''}`}>
              {mate && (
                <div className="relay-mate">
                  <span className="lobby-name">{mate.username}</span>
                  <ColumnPips team={myTeam} tasks={room.tasks.filter((t) => t.team === myTeam && t.ownerSlot === mate.slot)} ownerId={mate.userId} mateId={meId} />
                </div>
              )}
              {relay === 'ready' && candidate && (
                <button type="button" className="arena-go lobby-go relay-go" onClick={doRelay}>relevo ▸</button>
              )}
              {relay !== 'ready' && (
                <p className="lobby-hint">
                  {solvedBy(room.tasks, myTeam) >= TEAM_EXERCISES ? '¡equipo completo!' : relay === 'teacher' ? 'tu parte está hecha' : `${mate?.username ?? 'tu compañero'} está con el último`}
                </p>
              )}
              {note && <p className="lobby-hint">{note}</p>}
            </div>
          )}

          {phase === 'fight' && (
            <>
              <form className="arena-inv" onSubmit={(e) => { e.preventDefault(); combat.runInventory(phase === 'fight') }}>
                <label htmlFor="team-inv">&gt;&gt;&gt;</label>
                <input
                  id="team-inv"
                  value={invLine}
                  onChange={(e) => setInvLine(e.target.value)}
                  placeholder={isTeacher ? 'sin ítems' : target ? `print(daga) → ${target.username}` : 'print(item)'}
                  disabled={isTeacher}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Usar un ítem: print(nombre)"
                />
              </form>
              {invEcho && <div className={`arena-inv-echo${invEcho.ok ? '' : ' arena-inv-echo--bad'}`}>{invEcho.text}</div>}
            </>
          )}

          {phase === 'end' && <TeamEnd room={room} myTeam={myTeam} onExit={onExit} onRematch={onRematch} rematchReady={rematchReady} />}
        </section>
      </div>
    </div>
  )
}

// ─── Piezas ────────────────────────────────────────────────────────────────

function TeamBlock({ team, room, meId, now, typing, bubbles, targetId = null, onTarget }: {
  team: Team; room: RoomView; meId: string; now: number
  typing: Record<string, number>; bubbles: Record<string, { text: string; until: number }>
  targetId?: string | null; onTarget?: (id: string) => void
}) {
  const seats = room.seats.filter((s) => s.team === team).sort((a, b) => a.slot - b.slot)
  const total = solvedBy(room.tasks, team)
  const won = room.winnerTeam === team
  return (
    <div className={`team-block team-block--${team}${won ? ' team-block--won' : ''}`}>
      <div className="team-head">
        <TeamBanner team={team} size={3} />
        <span className="team-name">{TEAM_NAME[team]}</span>
        <span className="team-total" aria-label={`${total} de ${TEAM_EXERCISES}`}>{total}<small>/{TEAM_EXERCISES}</small></span>
      </div>
      {seats.map((s) => {
        const mate = seats.find((x) => x.userId !== s.userId)
        const column = room.tasks.filter((t) => t.team === team && t.ownerSlot === s.slot)
        const bubble = bubbles[s.userId] && bubbles[s.userId].until > now ? bubbles[s.userId].text : null
        const isTarget = targetId === s.userId
        const name = (
          <>
            {isTarget && <Crosshair />}
            <span className="tplayer-name">{s.username}</span>
            {s.userId === meId && <span className="arena-label">vos</span>}
            {s.role === 'docente' && <span className="arena-label">docente</span>}
          </>
        )
        return (
          <div key={s.userId} className={`tplayer${s.gone ? ' tplayer--gone' : ''}`}>
            {onTarget && !s.gone ? (
              <button type="button" className={`tplayer-who tplayer-who--btn${isTarget ? ' tplayer-who--on' : ''}`} aria-pressed={isTarget} onClick={() => onTarget(s.userId)} title={`Apuntarle los ítems a ${s.username}`}>
                {name}
              </button>
            ) : (
              <span className="tplayer-who">{name}</span>
            )}
            <ColumnPips team={team} tasks={column} ownerId={s.userId} mateId={mate?.userId ?? null} />
            {(typing[s.userId] ?? 0) > now && !bubble && <span className="arena-num duel-typing">…</span>}
            {bubble && <span className="sena-bubble" role="status">{bubble}</span>}
          </div>
        )
      })}
    </div>
  )
}

function TeamEnd({ room, myTeam, onExit, onRematch, rematchReady }: {
  room: RoomView; myTeam: Team; onExit?: () => void; onRematch?: () => void; rematchReady: boolean
}) {
  const won = room.winnerTeam === myTeam
  const draw = !room.winnerTeam
  const voided = room.endReason === 'voided'
  const mine = solvedBy(room.tasks, myTeam)
  const theirs = solvedBy(room.tasks, otherTeam(myTeam))
  // Solo cuando el marcador no alcanza para entender qué pasó.
  const why = room.endReason === 'forfeit' ? (won ? 'El otro equipo se rindió.' : 'Tu equipo se rindió.')
    : room.endReason === 'timeout' ? (mine === theirs ? `Se terminó el tiempo: llegaron primero ${won ? 'ustedes' : 'ellos'}.` : 'Se terminó el tiempo.')
    : room.endReason === 'voided' ? 'El docente anuló este duelo.'
    : null
  return (
    <div className="arena-end">
      <div className={`arena-end-title${!won && !draw ? ' arena-end-title--lost' : ''}`}>
        {voided ? 'ANULADO' : draw ? 'EMPATE' : won ? 'VICTORIA' : 'DERROTA'}
      </div>
      <div className="team-score">
        <TeamBanner team={myTeam} size={4} /><strong>{mine}</strong><span>·</span><strong>{theirs}</strong><TeamBanner team={otherTeam(myTeam)} size={4} />
      </div>
      {why && <p>{why}</p>}
      <div className="duel-prize">
        {room.result && room.result.diamonds !== 0
          ? <span className={room.result.diamonds > 0 ? 'arena-ok' : 'arena-bad'}><Diamonds n={room.result.diamonds} sign size={16} /></span>
          : <span className="arena-num">{room.stake > 0 && !draw && !voided ? 'sin diamantes para vos' : 'amistoso · nadie pierde nada'}</span>}
        {room.result && room.result.xp > 0 && <span className="arena-ok">+{room.result.xp} XP</span>}
      </div>
      <div className="arena-choices">
        {onRematch && room.endReason !== 'voided' && (
          <button type="button" className={`arena-go lobby-go${rematchReady ? ' rematch-ready' : ''}`} onClick={() => { sfx.confirm(); onRematch() }}>
            {rematchReady ? 'a la revancha ▸' : 'revancha ▸'}
          </button>
        )}
        {onExit && <button type="button" className={onRematch ? 'arena-go arena-go--ghost' : 'arena-go'} onClick={onExit}>volver al lobby</button>}
      </div>
    </div>
  )
}
