'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BattleConsole, { type BattleResult } from '@/components/game/arena/BattleConsole'
import PatoDebugWindow from '@/components/game/items/PatoDebugWindow'
import CompuHackeadaWindow from '@/components/game/items/CompuHackeadaWindow'
import DiamondIcon, { Diamonds } from '@/components/ui/DiamondIcon'
import { executeChallenge, preloadPyodide, preloadSqlJs } from '@/lib/game/executor'
import { BOSSES } from '@/lib/game/bosses'
import { sfx } from '@/lib/game/architect/sound'
import { arenaChallenge } from '@/lib/game/arena/challenge'
import { ARENA_ATTACKS_PER_DUEL } from '@/lib/game/arena/items'
import { ARENA_EXERCISES, ARENA_MIX, ARENA_REASON_LABEL } from '@/lib/game/arena/rules'
import type { DuelEvent, MatchView } from '@/lib/game/arena/types'
import type { Boss } from '@/types'
import { createSandboxDuel } from './sandbox'
import type { DuelTransport } from './transport'
import { useArenaCombat } from './useArenaCombat'
import { useSecondTick } from './useSecondTick'

// Pantalla de un duelo de la arena. Misma distribución que la arena de los
// jefes: a la izquierda el marcador (reloj, los dos jugadores y su avance), a
// la derecha la consigna y la consola. No hay salida esperada: el navegador
// corre el código y le manda lo que imprimió al servidor, que decide.

interface Props {
  /** Demo: rival simulado, sin servidor. */
  sandbox?: boolean
  initial?: MatchView
  transport?: DuelTransport
  onExit?: () => void
  onRematch?: () => void
  /** Se llama una vez cuando el duelo termina (para refrescar diamantes y XP). */
  onFinished?: (m: MatchView) => void
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function ArenaDuel(props: Props) {
  if (props.sandbox) return <SandboxDuel onExit={props.onExit} />
  return <DuelView {...props} />
}

/** Demo: arma su propio duelo contra el rival simulado y lo rearma con "revancha". */
function SandboxDuel({ onExit }: { onExit?: () => void }) {
  const [round, setRound] = useState(0)
  const [demo, setDemo] = useState<ReturnType<typeof createSandboxDuel> | null>(null)
  // El que crea el transporte lo cierra (en un efecto: StrictMode lo monta dos veces).
  useEffect(() => {
    const d = createSandboxDuel()
    setDemo(d)
    return () => d.transport.close()
  }, [round])
  if (!demo) return null
  return <DuelView key={round} sandbox initial={demo.initial} transport={demo.transport} onExit={onExit} onRematch={() => setRound((r) => r + 1)} />
}

/** El transporte lo crea y lo cierra quien monta el duelo (el lobby o la demo). */
function DuelView({ sandbox = false, initial, transport: given, onExit, onRematch, onFinished }: Props) {
  const transport = given ?? null
  const start = initial ?? null

  const [match, setMatch] = useState<MatchView | null>(start)
  const skew = useRef(0)
  const apply = useCallback((m: MatchView) => {
    skew.current = Date.parse(m.serverNow) - Date.now()
    setMatch(m)
  }, [])
  useEffect(() => { if (start) apply(start) }, [start, apply])

  const now = useSecondTick()
  const serverNow = now + skew.current

  const startedAt = match?.startedAt ? Date.parse(match.startedAt) : 0
  const endsAt = match?.endsAt ? Date.parse(match.endsAt) : 0
  const finished = match?.status === 'finished'
  const phase: 'loading' | 'countdown' | 'fight' | 'end' =
    !match ? 'loading' : finished ? 'end' : serverNow < startedAt ? 'countdown' : 'fight'
  const remaining = endsAt - serverNow
  const lastMinute = phase === 'fight' && remaining <= 60_000

  // ── Motores: que Python ya esté cargando durante la cuenta regresiva
  useEffect(() => {
    if (!match?.exercises.length) return
    if (match.exercises.some((e) => e.type === 'python')) preloadPyodide()
    if (match.exercises.some((e) => e.type === 'sql')) preloadSqlJs()
  }, [match?.exercises])

  // ── Sincronía: cada 6 s (por si se pierde un aviso) y al terminarse el tiempo
  const refreshing = useRef(false)
  const refresh = useCallback(async () => {
    if (!transport || refreshing.current) return
    refreshing.current = true
    try { apply(await transport.refresh()) } catch { /* sin red: se reintenta en el próximo ciclo */ } finally { refreshing.current = false }
  }, [transport, apply])
  useEffect(() => {
    if (phase !== 'fight' && phase !== 'countdown') return
    const id = setInterval(refresh, remaining <= 0 ? 2_000 : 6_000)
    return () => clearInterval(id)
  }, [phase, refresh, remaining <= 0]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase === 'fight' && remaining <= 0) refresh() }, [phase, remaining <= 0]) // eslint-disable-line react-hooks/exhaustive-deps

  const warned = useRef(false)
  useEffect(() => { if (lastMinute && !warned.current) { warned.current = true; sfx.warn() } }, [lastMinute])

  const reported = useRef(false)
  useEffect(() => {
    if (!finished || !match || reported.current) return
    reported.current = true
    const won = match.winnerId === match.me.id
    if (won) sfx.victory(); else if (match.winnerId) sfx.crash(); else sfx.close()
    onFinished?.(match)
  }, [finished, match, onFinished])

  // ── Ejercicio actual
  const idx = Math.min(match?.me.progress ?? 0, ARENA_EXERCISES - 1)
  const exercise = match?.exercises[idx]
  const challenge = useMemo(() => (exercise ? arenaChallenge(exercise) : null), [exercise])
  const topicBoss: Boss = BOSSES.find((b) => b.id === exercise?.bossId) ?? BOSSES[0]
  const codeRef = useRef('')
  const [codeReplace, setCodeReplace] = useState<{ code: string; nonce: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastResult, setLastResult] = useState<BattleResult | null>(null)
  useEffect(() => { setLastResult(null); setCodeReplace(null) }, [challenge?.id])

  const meId = match?.me.id ?? ''
  const rivalId = match?.rival.id ?? ''
  const rivalName = match?.rival.username ?? 'rival'
  const [rivalTypingUntil, setRivalTypingUntil] = useState(0)

  // ── Ítems (compartido con el 2 vs 2)
  const send = useCallback((ev: DuelEvent) => transport?.send(ev), [transport])
  const nameOf = useCallback((id: string) => (id === rivalId ? rivalName : 'rival'), [rivalId, rivalName])
  const replaceCode = useCallback((code: string) => setCodeReplace({ code, nonce: Date.now() }), [])
  const getCode = useCallback(() => codeRef.current, [])
  const combat = useArenaCombat({
    sandbox, send, meId, now, challenge, target: rivalId ? { id: rivalId, username: rivalName } : null, nameOf, getCode, replaceCode,
  })
  const { frozen, windy, hit, duck, setDuck, compuFix, setCompuFix, items, penguin, invLine, setInvLine, invEcho, consoleRef } = combat

  // ── Mensajes del rival
  const onEvent = useCallback((ev: DuelEvent) => {
    if (ev.from === meId) return
    if (ev.type === 'progress' || ev.type === 'left') { refresh(); if (ev.type === 'progress') sfx.notify(); return }
    if (ev.type === 'typing') { setRivalTypingUntil(Date.now() + 4_000); return }
    combat.onItemEvent(ev)
  }, [meId, refresh, combat])

  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  useEffect(() => transport?.listen((ev) => onEventRef.current(ev)), [transport])

  // "Escribiendo…": como mucho un aviso cada 3 s.
  const lastTyping = useRef(0)
  const onCodeChange = useCallback((c: string) => {
    const changed = codeRef.current !== '' && c !== codeRef.current
    codeRef.current = c
    if (!changed || !transport || Date.now() - lastTyping.current < 3_000) return
    lastTyping.current = Date.now()
    transport.send({ type: 'typing', from: meId })
  }, [transport, meId])

  // ── Ejecutar
  const submit = useCallback(async (code: string, cheat = false) => {
    if (!transport || !challenge || busy || frozen || phase !== 'fight') return
    setBusy(true)
    try {
      const src = cheat ? transport.cheat?.(idx) ?? code : code
      const res = await executeChallenge(challenge, src)
      if (res.error) {
        sfx.miss()
        setLastResult({ isCorrect: false, output: '', expected: '', error: res.error, sql: res.sql })
        return
      }
      const r = await transport.submit(idx, res.actualOutput)
      setLastResult({ isCorrect: r.correct, output: res.actualOutput, expected: '', error: null, sql: res.sql })
      apply(r.match)
      if (r.correct) {
        sfx.hit()
        transport.send({ type: 'progress', from: meId })
      } else sfx.miss()
    } catch {
      setLastResult({ isCorrect: false, output: '', expected: '', error: 'No se pudo hablar con el servidor. Probá de nuevo.' })
    } finally {
      setBusy(false)
    }
  }, [transport, challenge, busy, frozen, phase, idx, apply, meId])

  // ── Rendirse
  const [confirmLeave, setConfirmLeave] = useState(false)
  const leave = useCallback(async () => {
    if (!transport || !match) return
    if (finished) { onExit?.(); return }
    if (!confirmLeave) { setConfirmLeave(true); sfx.warn(); return }
    setConfirmLeave(false)
    try {
      apply(await transport.leave())
      transport.send({ type: 'left', from: meId })
    } catch { /* se reintenta con el próximo refresh */ }
  }, [transport, match, finished, confirmLeave, apply, meId, onExit])

  if (!match || !transport) return <p className="arena-note">Cargando el duelo…</p>

  const topicLabel = match.bossId === ARENA_MIX ? 'Mezcla de temas' : BOSSES.find((b) => b.id === match.bossId)?.topic ?? ''
  const rivalTyping = now < rivalTypingUntil
  const statusTags = combat.statusTags

  return (
    <div className="duel" data-phase={phase}>
      {hit && <div className="secret-hurt" aria-hidden />}
      {combat.tauntOn && <div className="duel-taunt" aria-hidden>67</div>}
      {duck === 'open' && challenge && (
        <PatoDebugWindow boss={topicBoss} challenge={challenge} getCode={() => codeRef.current} onClose={() => setDuck('hidden')} />
      )}
      {compuFix && <CompuHackeadaWindow fixes={compuFix.fixes} hasBlanks={compuFix.hasBlanks} onClose={() => setCompuFix(null)} />}

      <header className="arena-top">
        <button type="button" className="arena-link" onClick={leave}>
          {finished ? '← lobby' : confirmLeave ? '¿rendirte? cuenta como derrota · confirmá' : '← rendirse'}
        </button>
        {confirmLeave && <button type="button" className="arena-link" onClick={() => setConfirmLeave(false)}>no, sigo</button>}
        <span className="arena-tag">la arena · {topicLabel}</span>
        <span className="arena-top-spacer" />
        <span className="arena-tag">
          {match.stake > 0 ? <>en juego <Diamonds n={match.stake} size={11} /></> : 'amistoso'}
        </span>
      </header>

      <div className="arena-grid">
        {/* ── Marcador ─────────────────────────────────────────── */}
        <section className="arena-boss" aria-label="Marcador del duelo">
          <div className={`duel-clock${lastMinute ? ' duel-clock--low' : ''}`} role="timer" aria-label="Tiempo restante">
            {phase === 'end' ? 'fin' : phase === 'countdown' ? fmt(endsAt - startedAt) : fmt(remaining)}
          </div>
          {lastMinute && <div className="arena-num">¡último minuto!</div>}

          <Player label="vos" name={match.me.username} progress={match.me.progress} hurt={hit} />
          <div className="duel-vs">vs</div>
          <Player label="rival" name={rivalName} progress={match.rival.progress} typing={rivalTyping && phase === 'fight'} />

          {statusTags.length > 0 && (
            <div className="arena-status" aria-label="Efectos activos">
              {statusTags.map((t) => <span key={t}>{t}</span>)}
              {duck === 'hidden' && <button type="button" onClick={() => setDuck('open')}>pato</button>}
            </div>
          )}
          {phase === 'fight' && (
            <div className="arena-num">ataques: {combat.attacksLeft} de {ARENA_ATTACKS_PER_DUEL} · print(item) abajo</div>
          )}
        </section>

        {/* ── Consigna + consola ───────────────────────────────── */}
        <section className="arena-work">
          {phase === 'countdown' && (
            <div className="duel-countdown">
              <div className="duel-countdown-n">{Math.max(1, Math.ceil((startedAt - serverNow) / 1000))}</div>
              <p className="arena-note">
                Los dos tienen los mismos {ARENA_EXERCISES} ejercicios. Gana quien los resuelve primero.
                Los ítems que uses se gastan aunque pierdas.
              </p>
            </div>
          )}

          {phase === 'fight' && challenge && (
            <>
              <div className="arena-num">ejercicio {idx + 1} de {ARENA_EXERCISES}</div>
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
                {frozen && (
                  <div className="duel-freeze" role="status">
                    <span>congelado</span>
                    <strong>{combat.frozenLeft}</strong>
                  </div>
                )}
              </div>

              {sandbox && (
                <div className="arena-tools">
                  <span>docente</span>
                  <button type="button" onClick={() => submit('', true)}>acierto</button>
                </div>
              )}

              <form className="arena-inv" onSubmit={(e) => { e.preventDefault(); combat.runInventory(phase === 'fight') }}>
                <label htmlFor="duel-inv">&gt;&gt;&gt;</label>
                <input
                  id="duel-inv"
                  value={invLine}
                  onChange={(e) => setInvLine(e.target.value)}
                  placeholder={items.length ? `print(${items[0].printName})` : 'print(item)'}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Usar un ítem: print(nombre)"
                />
              </form>
              {invEcho && <div className={`arena-inv-echo${invEcho.ok ? '' : ' arena-inv-echo--bad'}`}>{invEcho.text}</div>}
            </>
          )}

          {phase === 'end' && (
            <End
              match={match}
              onExit={onExit}
              onRematch={onRematch}
            />
          )}
        </section>
      </div>
    </div>
  )
}

// ─── Piezas ────────────────────────────────────────────────────────────────

function Player({ label, name, progress, typing = false, hurt = false }: { label: string; name: string; progress: number; typing?: boolean; hurt?: boolean }) {
  return (
    <div className={`duel-player${hurt ? ' arena-player--hurt' : ''}`}>
      <div className="duel-player-head">
        <span className="arena-label">{label}</span>
        <span className="duel-player-name">{name}</span>
        {typing && <span className="arena-num duel-typing">escribiendo…</span>}
      </div>
      <div className="duel-pips" role="meter" aria-label={`${name}: ${progress} de ${ARENA_EXERCISES}`} aria-valuemin={0} aria-valuemax={ARENA_EXERCISES} aria-valuenow={progress}>
        {Array.from({ length: ARENA_EXERCISES }, (_, i) => <span key={i} className={i < progress ? 'on' : undefined} />)}
        <span className="arena-num">{progress}/{ARENA_EXERCISES}</span>
      </div>
    </div>
  )
}

function End({ match, onExit, onRematch }: { match: MatchView; onExit?: () => void; onRematch?: () => void }) {
  const won = match.winnerId === match.me.id
  const draw = !match.winnerId
  const r = match.result
  const reason = match.endReason ? ARENA_REASON_LABEL[match.endReason] ?? match.endReason : ''
  return (
    <div className="arena-end">
      <div className={`arena-end-title${!won && !draw ? ' arena-end-title--lost' : ''}`}>
        {draw ? 'EMPATE' : won ? 'VICTORIA' : 'DERROTA'}
      </div>
      <p>
        {match.endReason === 'voided' ? 'El docente anuló este duelo.'
          : draw ? 'Se terminó el tiempo y nadie resolvió ninguno.'
          : match.endReason === 'solved' ? (won ? `¡Ganaste! Resolviste los ${ARENA_EXERCISES} primero.` : `Ganó ${match.rival.username}: resolvió los ${ARENA_EXERCISES} primero.`)
          : match.endReason === 'timeout' ? `Se terminó el tiempo. ${won ? 'Ganaste' : `Ganó ${match.rival.username}`} por ${match.me.progress === match.rival.progress ? 'llegar primero' : 'resolver más'} (${Math.max(match.me.progress, match.rival.progress)} de ${ARENA_EXERCISES}).`
          : match.endReason === 'forfeit' ? (won ? `${match.rival.username} se rindió.` : 'Te rendiste.')
          : reason}
      </p>
      <p>
        <strong>{match.me.progress}</strong> de {ARENA_EXERCISES} vos · <strong>{match.rival.progress}</strong> de {ARENA_EXERCISES} {match.rival.username}
      </p>
      <div className="duel-prize">
        {match.stake > 0 && !draw && match.endReason !== 'voided'
          ? <span className={won ? 'arena-ok' : 'arena-bad'}><Diamonds n={won ? match.stake : -match.stake} sign size={16} /></span>
          : <span className="arena-num"><DiamondIcon size={11} /> amistoso · nadie pierde nada</span>}
        {r && r.xp > 0 && <span className="arena-ok">+{r.xp} XP</span>}
        {r && r.xp === 0 && !draw && match.endReason !== 'voided' && (
          <span className="arena-num">sin XP: ya jugaste con {match.rival.username} en este acto, o no resolviste ninguno</span>
        )}
      </div>
      <div className="arena-choices">
        {onRematch && <button type="button" className="arena-go" onClick={onRematch}>revancha ▸</button>}
        {onExit && <button type="button" className="arena-go arena-go--ghost" onClick={onExit}>volver al lobby</button>}
      </div>
    </div>
  )
}
