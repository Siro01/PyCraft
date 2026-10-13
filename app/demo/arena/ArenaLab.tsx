'use client'

import { useCallback, useMemo, useState } from 'react'
import { BOSSES } from '@/lib/game/bosses'
import { executeChallenge, preloadPyodide, preloadSqlJs } from '@/lib/game/executor'
import { ARENA_TEMPLATES, buildFromTemplate, type ArenaExercise } from '@/lib/game/arena/generators'
import { arenaChallenge } from '@/lib/game/arena/challenge'
import ArenaDuel from '@/components/game/arena/pvp/ArenaDuel'
import ArenaHerald from '@/components/game/arena/pvp/ArenaHerald'

// Laboratorio de La Arena (solo docente):
// 1) Plantillas: cada una con varias semillas, corriendo su solución en el
//    motor real (Pyodide / sql.js) para comprobar que da la salida esperada.
// 2) Duelo de prueba: la pantalla del duelo contra un rival simulado, sin
//    servidor ni diamantes.
// 3) Presentación / saludo de El Errante al entrar a la arena.

type Check = { ok: boolean; got: string; error: string | null }
const SEEDS_PER_TEMPLATE = 6

export default function ArenaLab() {
  const [tab, setTab] = useState<'plantillas' | 'duelo'>('plantillas')
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
          <button type="button" className="arena-link" onClick={() => setHerald('full')}>presentación</button>
          <button type="button" className="arena-link" onClick={() => setHerald('short')}>saludo</button>
        </header>
        {herald && <ArenaHerald key={herald} full={herald === 'full'} onDone={() => setHerald(null)} onExplain={() => setHerald('full')} />}

        {tab === 'duelo' && <ArenaDuel sandbox />}

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
