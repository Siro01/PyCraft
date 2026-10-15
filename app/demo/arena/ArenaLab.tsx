'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BOSSES } from '@/lib/game/bosses'
import { executeChallenge, preloadPyodide, preloadSqlJs } from '@/lib/game/executor'
import { ARENA_TEMPLATES, buildFromTemplate, type ArenaExercise } from '@/lib/game/arena/generators'
import { arenaChallenge } from '@/lib/game/arena/challenge'
import ArenaDuel from '@/components/game/arena/pvp/ArenaDuel'
import ArenaHerald from '@/components/game/arena/pvp/ArenaHerald'
import ArenaApp, { type ArenaState, type Presence } from '@/components/game/arena/pvp/ArenaApp'
import type { RosterEntry } from '@/lib/game/arena/server'
import type { MatchView, RoomView } from '@/lib/game/arena/types'
import TeamDuel from '@/components/game/arena/pvp/team/TeamDuel'
import { createSandboxRoom, SANDBOX_ME } from '@/components/game/arena/pvp/team/sandbox'

// Laboratorio de La Arena (solo docente):
// 1) Plantillas: cada una con varias semillas, corriendo su solución en el
//    motor real (Pyodide / sql.js) para comprobar que da la salida esperada.
// 2) Duelo de prueba: la pantalla del duelo contra un rival simulado, sin
//    servidor ni diamantes.
// 3) Presentación / saludo de El Errante al entrar a la arena.

type Check = { ok: boolean; got: string; error: string | null }
const SEEDS_PER_TEMPLATE = 6

export default function ArenaLab() {
  const [tab, setTab] = useState<'plantillas' | 'duelo' | 'equipos' | 'lobby'>('plantillas')
  const [withInvite, setWithInvite] = useState(false)
  // Memo: los datos tienen que ser estables, si no el lobby recarga en cada render.
  const lobby = useMemo(() => demoLobby(withInvite), [withInvite])
  const [herald, setHerald] = useState<'full' | 'short' | null>(null)
  const [baseSeed, setBaseSeed] = useState(1)
  const [checks, setChecks] = useState<Record<string, Check>>({})
  const [running, setRunning] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo(() => ARENA_TEMPLATES.map((t) => ({
    t,
    boss: BOSSES.find((b) => b.id === t.bossId)!,
    samples: Array.from({ length: SEEDS_PER_TEMPLATE }, (_, i) => buildFromTemplate(t, baseSeed * 1000 + i)),
  })), [baseSeed])

  const runAll = useCallback(async () => {
    setRunning(true)
    preloadPyodide(); preloadSqlJs()
    const next: Record<string, Check> = {}
    for (const { samples } of rows) {
      for (const e of samples) {
        const res = await executeChallenge(arenaChallenge(e, e.expectedOutput), e.solution)
        next[e.id] = { ok: res.isCorrect, got: res.actualOutput, error: res.error }
        setChecks({ ...next })
      }
    }
    setRunning(false)
  }, [rows])

  const total = rows.reduce((n, r) => n + r.samples.length, 0)
  const done = Object.keys(checks).length
  const failed = Object.values(checks).filter((c) => !c.ok).length

  return (
    <div className="min-h-screen desk-theme">
      <main className="mx-auto w-full px-4 py-6" style={{ maxWidth: 1180 }}>
        <header className="arena-top">
          <a href="/dashboard" className="arena-link">← mapa</a>
          <span className="arena-tag">demo · la arena</span>
          <span className="arena-top-spacer" />
          <button type="button" className={`arena-link${tab === 'plantillas' ? ' arena-link--on' : ''}`} onClick={() => setTab('plantillas')}>plantillas</button>
          <button type="button" className={`arena-link${tab === 'duelo' ? ' arena-link--on' : ''}`} onClick={() => setTab('duelo')}>duelo de prueba</button>
          <button type="button" className={`arena-link${tab === 'equipos' ? ' arena-link--on' : ''}`} onClick={() => setTab('equipos')}>2 vs 2</button>
          <button type="button" className={`arena-link${tab === 'lobby' ? ' arena-link--on' : ''}`} onClick={() => setTab('lobby')}>lobby</button>
          <button type="button" className="arena-link" onClick={() => setHerald('full')}>presentación</button>
          <button type="button" className="arena-link" onClick={() => setHerald('short')}>saludo</button>
        </header>
        {herald && <ArenaHerald key={herald} full={herald === 'full'} onDone={() => setHerald(null)} onExplain={() => setHerald('full')} />}

        {tab === 'duelo' && <ArenaDuel sandbox />}

        {tab === 'equipos' && <SandboxTeamDuel />}

        {tab === 'lobby' && (
          <>
            <div className="arena-tools" style={{ marginBottom: 16 }}>
              <span>lobby con datos de ejemplo</span>
              <button type="button" onClick={() => setWithInvite((v) => !v)}>{withInvite ? 'sin reto recibido' : 'con reto recibido'}</button>
            </div>
            <ArenaApp key={String(withInvite)} {...lobby} />
          </>
        )}

        {tab === 'plantillas' && (
          <>
            <div className="arena-tools" style={{ marginBottom: 16 }}>
              <span>{ARENA_TEMPLATES.length} plantillas · {SEEDS_PER_TEMPLATE} semillas c/u</span>
              <button type="button" onClick={() => { setBaseSeed((s) => s + 1); setChecks({}) }}>otras semillas</button>
              <button type="button" onClick={runAll} disabled={running}>{running ? `corriendo ${done}/${total}…` : 'correr todas las soluciones'}</button>
              {done > 0 && <span style={{ color: failed ? 'hsl(var(--danger))' : 'hsl(var(--accent))' }}>{done - failed}/{done} ok</span>}
            </div>

            <div className="flex flex-col gap-2">
              {rows.map(({ t, boss, samples }) => {
                const res = samples.map((e) => checks[e.id])
                const bad = res.filter((c) => c && !c.ok).length
                return (
                  <div key={t.id} className="arena-console">
                    <button
                      type="button"
                      className="arena-console-bar w-full"
                      style={{ cursor: 'pointer', background: 'none', border: 0, textAlign: 'left' }}
                      onClick={() => setOpen(open === t.id ? null : t.id)}
                      aria-expanded={open === t.id}
                    >
                      <span style={{ color: boss.color }}>{boss.title}</span>
                      <span>{t.id}</span>
                      <span style={{ color: 'hsl(var(--tx3))' }}>{t.type}</span>
                      <span className="arena-top-spacer" />
                      {res.map((c, i) => (
                        <span key={i} aria-label={c ? (c.ok ? 'ok' : 'falla') : 'sin correr'} style={{ width: 10, height: 10, border: '1px solid hsl(var(--border2))', background: !c ? 'transparent' : c.ok ? 'hsl(var(--accent))' : 'hsl(var(--danger))' }} />
                      ))}
                      {bad > 0 && <span style={{ color: 'hsl(var(--danger))' }}>{bad} mal</span>}
                    </button>
                    {open === t.id && <Samples samples={samples} checks={checks} />}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Samples({ samples, checks }: { samples: ArenaExercise[]; checks: Record<string, Check> }) {
  return (
    <div className="flex flex-col">
      {samples.map((e) => {
        const c = checks[e.id]
        return (
          <div key={e.id} className="arena-result" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <div>
              <h4>{e.title} · {e.id}</h4>
              <p style={{ margin: 0, fontSize: 19, lineHeight: 1.2, color: 'hsl(var(--tx2))' }}>{e.description}</p>
              {e.seedSQL && <><h4>tablas</h4><pre className="arena-out arena-out--dim">{e.seedSQL}</pre></>}
            </div>
            <div>
              <h4>código inicial</h4>
              <pre className="arena-out">{e.initialCode}</pre>
              <h4>solución</h4>
              <pre className="arena-out arena-out--dim">{e.solution}</pre>
            </div>
            <div>
              <h4>esperada</h4>
              <pre className="arena-out">{e.expectedOutput}</pre>
              {c && !c.ok && (
                <>
                  <h4>salió</h4>
                  <pre className="arena-out arena-out--err">{c.error ?? c.got}</pre>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Lobby de ejemplo (sin servidor) ───────────────────────────────────────
const FIRST = (n: number) => BOSSES.slice(0, n).map((b) => b.id)
const entry = (id: string, username: string, defeated: number, maxStake: 0 | 5 | 10): RosterEntry =>
  ({ id, username, isAdmin: false, isTest: false, unlocked: defeated >= 3, defeated: FIRST(defeated), maxStake })

function demoLobby(withInvite: boolean) {
  const roster = [entry('romi', 'romi', 5, 10), entry('tomi', 'tomi', 4, 5), entry('mica', 'mica', 6, 10), entry('juana', 'juana', 2, 0), entry('benja', 'benja', 3, 0)]
  const online: Presence[] = [
    { id: 'romi', username: 'romi', isAdmin: false, status: 'lobby' },
    { id: 'benja', username: 'benja', isAdmin: false, status: 'lobby' },
    { id: 'tomi', username: 'tomi', isAdmin: false, status: 'duel' },
  ]
  const invite: MatchView = {
    id: 'demo-invite', status: 'pending', stake: 5, bossId: 'golem-infinito', actKey: 'python', iChallenged: false,
    me: { id: 'yo', username: 'vos', progress: 0 }, rival: { id: 'romi', username: 'romi', progress: 0 }, exercises: [],
    createdAt: new Date().toISOString(), startedAt: null, endsAt: null, serverNow: new Date().toISOString(), winnerId: null, endReason: null,
  }
  const state: ArenaState = { stats: { net: 10, xp: 15 }, live: null, incoming: withInvite ? [invite] : [], history: [] }
  return {
    me: { id: 'yo', username: 'vos', isAdmin: false, isTest: false },
    aulaId: 'demo', aulaName: 'aula de ejemplo', roster, myDefeated: FIRST(4), myMaxStake: 10 as const,
    preview: { online, state, team: { rooms: demoRooms(), mine: null } },
  }
}

// ─── 2 vs 2 de práctica (3 bots) ───────────────────────────────────────────
function SandboxTeamDuel() {
  const [round, setRound] = useState(0)
  const [demo, setDemo] = useState<ReturnType<typeof createSandboxRoom> | null>(null)
  // El que crea el transporte lo cierra (en un efecto: StrictMode lo monta dos veces).
  useEffect(() => {
    const d = createSandboxRoom()
    setDemo(d)
    return () => d.transport.close()
  }, [round])
  if (!demo) return null
  return <TeamDuel key={round} sandbox initial={demo.initial} transport={demo.transport} meId={SANDBOX_ME} onExit={() => setRound((r) => r + 1)} onRematch={() => setRound((r) => r + 1)} />
}

/** Salas de ejemplo para el lobby 2 vs 2. */
function demoRooms(): RoomView[] {
  const base = {
    actKey: 'python', needsTeacher: false, exercises: [], tasks: [], createdAt: new Date().toISOString(), startedAt: null, endsAt: null,
    serverNow: new Date().toISOString(), winnerTeam: null, endReason: null,
  }
  const seat = (team: 'espada' | 'escudo', slot: 1 | 2, userId: string, ready = false) =>
    ({ team, slot, userId, username: userId, role: 'alumno' as const, ready, relays: 0, gone: false })
  return [
    { ...base, id: 'sala-1', status: 'lobby', leaderId: 'romi', bossId: 'golem-infinito', stake: 5, topics: ['golem-infinito'],
      seats: [seat('espada', 1, 'romi', true), seat('escudo', 1, 'tomi'), seat('escudo', 2, 'benja')] },
    { ...base, id: 'sala-2', status: 'lobby', leaderId: 'mica', bossId: 'oraculo-oscuro', stake: 0, topics: ['oraculo-oscuro'],
      seats: [seat('espada', 1, 'mica')] },
    { ...base, id: 'sala-3', status: 'active', leaderId: 'juana', bossId: 'mezcla', stake: 10, topics: ['creeper-formulario'],
      seats: [seat('espada', 1, 'juana'), seat('espada', 2, 'sofi'), seat('escudo', 1, 'lucas'), seat('escudo', 2, 'cata')] },
  ]
}
