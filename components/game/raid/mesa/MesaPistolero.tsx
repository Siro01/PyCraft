'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PistoleroStage, { type StageCue } from '@/components/game/raid/PistoleroStage'
import { ATTACKS, PISTOLERO_LINES, pickLine, type AttackId } from '@/lib/game/raid/pistolero'
import { SHOP_CATALOG } from '@/lib/game/shop'
import WesternText from '@/components/game/raid/WesternText'
import { setForceMute } from '@/lib/game/architect/sound'

// La Mesa arranca SIN sonido: el docente suele proyectar con el audio de su PC
// y los alumnos no tienen que darse cuenta de que el Pistolero es él.
const MESA_SOUND_KEY = 'pysql:mesa-sound'
import type { RaidEvent } from '@/lib/game/raid/live'
import type { BoardState, BoardTask, CatalogEntry } from '@/lib/game/raid/types'
import type { ChallengeTier } from '@/types'
import { demoBackend, liveBackend, type MesaBackend } from './backend'

// La Mesa del Pistolero: la pantalla del docente durante el evento, pensada
// para decidir rápido aunque lleguen varios envíos juntos.
// Arriba: aula, vidas y los botones del duelo, siempre a la vista.
// Centro: la cola de envíos. Cada uno muestra solo lo necesario para decidir:
// el código, la salida y, si no coincide, la esperada con las líneas
// distintas marcadas. Atajos: A = acierto, R = falla, ↑↓ = moverse.
// «Aprobar los que coinciden» resuelve de una los envíos obvios.
// Costado: el Pistolero chico, ataques, frase en vivo y el aula en una lista.
// Estilos: .mesa-* en globals.css (paleta oscura fija, como la arena secreta).

interface Props {
  aulas: { id: string; nombre: string }[]
  initialAulaId: string
  /** 'demo' = ensayo con alumnos de mentira (no toca la base). */
  mode: 'live' | 'demo'
}

const TIER_SHORT: Record<ChallengeTier, string> = { junior: 'JR', trainee: 'TR', senior: 'SR' }
const QUICK_LINES = ['¿Eso es todo lo que tienen?', '¡Rápido, que se pone el sol!', 'Buen tiro, compañero.', 'Quedan pocos minutos, forasteros.']

export default function MesaPistolero({ aulas, initialAulaId, mode }: Props) {
  const [aulaId, setAulaId] = useState(initialAulaId)
  const [board, setBoard] = useState<BoardState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [focus, setFocus] = useState(0)
  const [target, setTarget] = useState('')
  const [phrase, setPhrase] = useState('')
  const [cue, setCue] = useState<StageCue | null>(null)
  const [hurt, setHurt] = useState(0)
  const [line, setLine] = useState<string | null>(null)
  const [typing, setTyping] = useState<Record<string, number>>({})
  const [, setNow] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(false)

  // Silencio de la Mesa: solo en esta pantalla y en esta PC (no toca a los alumnos)
  useEffect(() => {
    let on = false
    try { on = localStorage.getItem(MESA_SOUND_KEY) === 'on' } catch { /* modo privado */ }
    setSoundOn(on)
  }, [])
  useEffect(() => {
    setForceMute(!soundOn)
    try { localStorage.setItem(MESA_SOUND_KEY, soundOn ? 'on' : 'off') } catch { /* modo privado */ }
  }, [soundOn])
  useEffect(() => () => setForceMute(false), [])

  const backendRef = useRef<MesaBackend | null>(null)
  const lineTimer = useRef<ReturnType<typeof setTimeout>>()

  // Backend por aula (el ensayo vive en memoria)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (mode === 'demo') { backendRef.current = demoBackend(aulaId); return }
      const { createClient } = await import('@/lib/supabase/client')
      if (!cancelled) backendRef.current = liveBackend(createClient(), aulaId)
    })().then(() => { if (!cancelled) void refresh() })
    return () => { cancelled = true }
  }, [aulaId, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    const b = backendRef.current
    if (!b) return
    try {
      setBoard(await b.load())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la Mesa')
    }
  }, [])

  const say = useCallback((text: string, broadcast = true) => {
    setLine(text)
    clearTimeout(lineTimer.current)
    lineTimer.current = setTimeout(() => setLine(null), 6000)
    if (broadcast) backendRef.current?.send({ type: 'line', text })
  }, [])

  // Avisos en tiempo real → volver a leer (agrupados)
  const raidId = board?.raid?.id ?? null
  const live = board?.raid && (board.raid.status === 'lobby' || board.raid.status === 'active')
  useEffect(() => {
    const b = backendRef.current
    if (!b) return
    let pending: ReturnType<typeof setTimeout> | null = null
    const stop = b.watch(live ? raidId : null, (ev: RaidEvent) => {
      if (ev.type === 'typing') { setTyping((m) => ({ ...m, [ev.userId]: Date.now() })); return }
      if (ev.type === 'item') {
        setNotice(`${ev.username} usó ${SHOP_CATALOG.find((i) => i.printName === ev.itemId)?.name ?? ev.itemId}`)
        setTimeout(() => setNotice(null), 6000)
      }
      if (pending) return
      pending = setTimeout(() => { pending = null; void refresh() }, 250)
    })
    return () => { stop(); if (pending) clearTimeout(pending) }
  }, [raidId, live, refresh, board === null]) // eslint-disable-line react-hooks/exhaustive-deps

  // Por si se pierde un aviso: releer cada 4 s mientras hay duelo (solo en vivo)
  useEffect(() => {
    if (!live || mode === 'demo') return
    const id = setInterval(() => void refresh(), 4000)
    return () => clearInterval(id)
  }, [live, mode, refresh])

  // «escribiendo…» se apaga solo
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // El Pistolero cae: retirada para todos
  const prevStatus = useRef<string | null>(null)
  useEffect(() => {
    const st = board?.raid?.status ?? null
    if (prevStatus.current === 'active' && (st === 'won' || st === 'lost')) {
      backendRef.current?.send({ type: 'end', result: st })
      say((st === 'won' ? PISTOLERO_LINES.defeat : PISTOLERO_LINES.victory).join(' '), false)
      if (st === 'lost') setCue({ n: Date.now(), poses: ['giro', 'saludo'] })
    }
    prevStatus.current = st
  }, [board?.raid?.status, say])

  const act = useCallback(async (body: Record<string, unknown>) => {
    const b = backendRef.current
    if (!b) return null
    setBusy(true)
    try {
      const res = await b.act({ aulaId, ...body })
      setBoard(res)
      setError(null)
      return res
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal')
      return null
    } finally {
      setBusy(false)
    }
  }, [aulaId])

  // ─── Datos derivados ───────────────────────────────────────────────────────
  const raid = board?.raid ?? null
  const tasks = useMemo(() => board?.tasks ?? [], [board])
  const catalog = useMemo(() => board?.catalog ?? [], [board])
  const queue = useMemo(() => (board?.raid?.status !== 'active' ? [] : tasks.filter((t) => t.status === 'enviado')).sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? '')), [tasks, board?.raid?.status])
  const focused = queue[Math.min(focus, queue.length - 1)] ?? null
  const nameOf = useCallback((id: string) => board?.roster.find((r) => r.id === id)?.username ?? raid?.members.find((m) => m.id === id)?.username ?? '¿?', [board, raid])
  const alumnos = raid?.members.filter((m) => m.role === 'alumno' && m.state !== 'left') ?? []
  const rows = useMemo(() => {
    const joined = new Set(alumnos.map((m) => m.id))
    const list = (board?.roster ?? []).map((r) => ({ ...r, joined: joined.has(r.id) }))
    return list.sort((a, b) => Number(b.joined) - Number(a.joined) || a.username.localeCompare(b.username))
  }, [board, alumnos])

  // ─── Acciones ──────────────────────────────────────────────────────────────
  const summon = async () => {
    const res = await act({ action: 'summon' })
    if (res?.raid) {
      backendRef.current?.send({ type: 'summon', raidId: res.raid.id }, true)
      setCue({ n: Date.now(), poses: ['desenfundar', 'giro'] })
      say(pickLine(PISTOLERO_LINES.intro), false)
    }
  }

  const judge = useCallback(async (t: BoardTask, ok: boolean) => {
    if (busy) return
    const res = await act({ action: 'judge', taskId: t.id, ok })
    if (!res) return
    backendRef.current?.send({ type: 'judged', userId: t.userId, ok })
    backendRef.current?.send({ type: 'state' })
    if (ok) setHurt((h) => h + 1)
  }, [act, busy])

  const fire = async (id: AttackId) => {
    const a = ATTACKS.find((x) => x.id === id)!
    const res = await act({ action: 'attack', raidId: raid?.id, attackId: id, targetId: a.targeted ? target || null : null })
    if (!res?.attack) return
    const text = pickLine(a.lines)
    backendRef.current?.send({ type: 'attack', attackId: id, targetId: res.attack.targetId, line: text })
    backendRef.current?.send({ type: 'state' })
    setCue({ n: Date.now(), poses: a.poses, fx: a.fx })
    say(res.attack.targetId ? `${text} (→ ${nameOf(res.attack.targetId)})` : text, false)
  }

  const assign = async (userId: string, exerciseId: string) => {
    if (!raid || !exerciseId) return
    await act({ action: 'assign', raidId: raid.id, userId, exerciseId })
    backendRef.current?.send({ type: 'state' })
  }

  // Atajos: A = acierto · R = falla · ↑/↓ (o K/J) = moverse por la cola
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'm') { e.preventDefault(); setSoundOn((v) => !v); return }
      if ((k === 'a' || k === 'r') && focused) { e.preventDefault(); void judge(focused, k === 'a') }
      if (k === 'arrowdown' || k === 'j') { e.preventDefault(); setFocus((f) => Math.min(f + 1, Math.max(0, queue.length - 1))) }
      if (k === 'arrowup' || k === 'k') { e.preventDefault(); setFocus((f) => Math.max(0, f - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focused, judge, queue.length])

  // Aprobar de una todos los envíos cuya salida coincide (los obvios)
  const matching = queue.filter((t) => t.autoOk)
  const approveMatching = async () => {
    if (busy || !matching.length) return
    if (!confirm(`¿Aprobar los ${matching.length} envíos cuya salida coincide con la esperada?`)) return
    for (const t of matching) {
      const res = await act({ action: 'judge', taskId: t.id, ok: true })
      if (!res) break
      backendRef.current?.send({ type: 'judged', userId: t.userId, ok: true })
      setHurt((h) => h + 1)
      if (res.raid?.status !== 'active') break
    }
    backendRef.current?.send({ type: 'state' })
  }

  // ─── Pantalla ──────────────────────────────────────────────────────────────
  const status = raid?.status
  const pct = (a: number | null, b: number | null) => (a !== null && b ? Math.round((a / b) * 100) : 0)
  const typingNow = rows.filter((r) => r.joined && Date.now() - (typing[r.id] ?? 0) < 4000).length

  return (
    <div className="mesa">
      <header className="mesa-top">
        <div className="mesa-title"><WesternText text="Mesa del Pistolero" px={2} />{mode === 'demo' && <span className="mesa-tag">ENSAYO</span>}</div>
        <select className="mesa-select" value={aulaId} onChange={(e) => { setBoard(null); setAulaId(e.target.value) }} aria-label="Aula">
          {aulas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <button type="button" className={`mesa-btn mesa-sound ${soundOn ? 'is-on' : ''}`} onClick={() => setSoundOn((v) => !v)}
          aria-pressed={soundOn} title="Solo en tu pantalla. Atajo: M">
          {soundOn ? '♪ sonido prendido' : '× sin sonido'}
        </button>
        <label className="mesa-arm" title={board?.armed ? 'Los alumnos de esta aula escuchan el aviso sorpresa' : 'Nadie escucha el aviso (sin costo)'}>
          <input type="checkbox" checked={!!board?.armed} disabled={busy || !board}
            onChange={(e) => void act({ action: 'arm', armed: e.target.checked })} />
          armada
        </label>

        {raid && (status === 'active' || status === 'lobby') && (
          <div className="mesa-top-bars">
            {status === 'active' && <Bar label="PISTOLERO" value={raid.bossHp} max={raid.bossHpMax} pct={pct(raid.bossHp, raid.bossHpMax)} tone="brasa" />}
            {status === 'active' && <Bar label="EQUIPO" value={raid.teamHp ?? 0} max={raid.teamHpMax ?? 0} pct={pct(raid.teamHp, raid.teamHpMax)} tone="hueso" />}
            {status === 'lobby' && <span className="mesa-status mesa-status-lobby">esperando · {alumnos.length} {alumnos.length === 1 ? 'alumno entró' : 'alumnos entraron'}</span>}
          </div>
        )}
        {status === 'won' && <span className="mesa-status mesa-status-won">el aula ganó</span>}
        {status === 'lost' && <span className="mesa-status">ganó el Pistolero</span>}

        <div className="mesa-top-actions">
          {!live && <button type="button" className="mesa-btn mesa-btn-main" disabled={busy || !board} onClick={summon}>¡DESENFUNDAR!</button>}
          {status === 'lobby' && (
            <>
              <button type="button" className="mesa-btn mesa-btn-main" disabled={busy || alumnos.length === 0}
                onClick={async () => { await act({ action: 'start', raidId: raid!.id }); backendRef.current?.send({ type: 'state' }) }}>
                EMPEZAR
              </button>
              <button type="button" className="mesa-btn" disabled={busy} onClick={() => act({ action: 'cancel', raidId: raid!.id })}>cancelar</button>
            </>
          )}
          {status === 'active' && (
            <>
              <button type="button" className="mesa-btn mesa-btn-warn" disabled={busy}
                onClick={() => { if (confirm('¿Se acabó el tiempo? Gana el Pistolero y nadie pierde nada.')) void act({ action: 'end', raidId: raid!.id }) }}>
                SE ACABÓ EL TIEMPO
              </button>
              <button type="button" className="mesa-btn mesa-btn-quiet" disabled={busy}
                onClick={() => { if (confirm('¿Cancelar el duelo? No se reparte nada.')) void act({ action: 'cancel', raidId: raid!.id }) }}>cancelar</button>
            </>
          )}
        </div>
      </header>

      {error && <p className="mesa-error" role="alert">{error}</p>}
      {notice && <p className="mesa-notice" role="status">{notice}</p>}

      <div className="mesa-grid">
        {/* ── Centro: la cola ── */}
        <section className="mesa-main" aria-label="Envíos por corregir">
          <div className="mesa-queue-head">
            <h2>POR CORREGIR <b>{queue.length}</b></h2>
            {matching.length >= 2 && (
              <button type="button" className="mesa-btn mesa-btn-ok" disabled={busy} onClick={approveMatching}>✔ aprobar los {matching.length} que coinciden</button>
            )}
            <span className="mesa-keys">A acierto · R falla · ↑↓ moverse · M sonido</span>
          </div>

          {queue.length === 0 && (
            <div className="mesa-calm">
              {status === 'active'
                ? <>Nadie espera corrección.{typingNow > 0 && <> <b>{typingNow}</b> {typingNow === 1 ? 'alumno está escribiendo' : 'alumnos están escribiendo'}…</>}</>
                : status === 'lobby' ? 'Cuando empieces el duelo, los envíos llegan acá.'
                : 'Apretá ¡DESENFUNDAR! para que le aparezca el aviso a toda el aula.'}
            </div>
          )}

          <ol className="mesa-queue">
            {queue.map((t, i) => (
              <Submission key={t.id} t={t} name={nameOf(t.userId)} focused={focused?.id === t.id} busy={busy}
                onFocus={() => setFocus(i)} onJudge={(ok) => void judge(t, ok)} />
            ))}
          </ol>
        </section>

        {/* ── Costado: escena, ataques, frase y aula ── */}
        <aside className="mesa-side">
          <PistoleroStage cue={cue} hurtSignal={hurt} line={line} retired={status === 'won'} className="mesa-stage"
            integrity={status === 'active' && raid?.bossHpMax ? Math.max(0.15, raid.bossHp / raid.bossHpMax) : 1} />

          {status === 'active' && (
            <div className="mesa-box">
              <div className="mesa-box-title">
                ATAQUES
                <select className="mesa-select mesa-target" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Blanco de los ataques a un alumno">
                  <option value="">blanco: al azar</option>
                  {alumnos.map((m) => <option key={m.id} value={m.id}>blanco: {m.username}</option>)}
                </select>
              </div>
              <div className="mesa-attacks">
                {ATTACKS.map((a) => {
                  const used = raid?.attacks[a.id] ?? 0
                  const left = a.maxUses ? a.maxUses - used : null
                  return (
                    <button key={a.id} type="button" className="mesa-attack" disabled={busy || left === 0} onClick={() => fire(a.id)} title={`${a.hint}${a.targeted ? ' · a un alumno' : ''}`}>
                      {a.name}{left !== null && <small> {left}/{a.maxUses}</small>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {live && (
            <form className="mesa-say" onSubmit={(e) => { e.preventDefault(); if (phrase.trim()) { say(phrase.trim()); setPhrase('') } }}>
              <input className="mesa-input" value={phrase} maxLength={140} onChange={(e) => setPhrase(e.target.value)} placeholder="Frase en vivo (la ven todos)" aria-label="Frase en vivo" />
              <button type="submit" className="mesa-btn" disabled={!phrase.trim()}>decir</button>
            </form>
          )}
          {live && (
            <div className="mesa-quick">
              {QUICK_LINES.map((q) => <button key={q} type="button" className="mesa-chip" onClick={() => say(q)}>{q}</button>)}
            </div>
          )}

          <div className="mesa-box">
            <div className="mesa-box-title">AULA <span className="mesa-keys">{alumnos.length} en el duelo de {rows.length}</span></div>
            <ul className="mesa-roster">
              {rows.map((r) => (
                <StudentRow key={r.id} name={r.username} joined={r.joined} defeated={r.defeated}
                  solved={raid?.members.find((m) => m.id === r.id)?.solved ?? 0}
                  typing={Date.now() - (typing[r.id] ?? 0) < 4000}
                  tasks={tasks.filter((t) => t.userId === r.id)} catalog={catalog}
                  canAssign={!!live} onAssign={(ex) => assign(r.id, ex)} />
              ))}
              {rows.length === 0 && <li className="mesa-empty">Esta aula no tiene alumnos.</li>}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Bar({ label, value, max, pct, tone }: { label: string; value: number; max: number; pct: number; tone: 'brasa' | 'hueso' }) {
  return (
    <div className={`mesa-bar mesa-bar-${tone}`}>
      <span>{label}</span>
      <div className="mesa-bar-track"><div style={{ width: `${pct}%` }} /></div>
      <b>{value}/{max}</b>
    </div>
  )
}

/** Un envío: lo justo para decidir. Si la salida no coincide, se ve la esperada con las líneas distintas marcadas. */
function Submission({ t, name, focused, busy, onFocus, onJudge }: {
  t: BoardTask; name: string; focused: boolean; busy: boolean; onFocus: () => void; onJudge: (ok: boolean) => void
}) {
  const out = (t.output ?? '').trimEnd().split('\n')
  const exp = t.expected.trimEnd().split('\n')
  return (
    <li className={`mesa-sub ${focused ? 'is-focus' : ''} ${t.autoOk ? 'is-match' : 'is-diff'}`} onClick={onFocus}>
      <div className="mesa-sub-head">
        <b>{name}</b>
        <span className="mesa-ex">{t.title} · {TIER_SHORT[t.tier]} · {t.type === 'sql' ? 'SQL' : 'Python'}</span>
        <span className={`mesa-auto ${t.autoOk ? 'is-ok' : 'is-bad'}`}>{t.autoOk ? '✔ coincide' : '✘ no coincide'}</span>
        <span className="mesa-judge">
          <button type="button" className="mesa-btn mesa-btn-ok" disabled={busy} onClick={(e) => { e.stopPropagation(); onJudge(true) }} aria-label={`Acierto de ${name}`}>✔</button>
          <button type="button" className="mesa-btn mesa-btn-bad" disabled={busy} onClick={(e) => { e.stopPropagation(); onJudge(false) }} aria-label={`Falla de ${name}`}>✘</button>
        </span>
      </div>
      <div className={`mesa-code-row ${t.autoOk ? '' : 'has-3'}`}>
        <figure><figcaption>código</figcaption><pre>{t.code || '(vacío)'}</pre></figure>
        <figure>
          <figcaption>salida</figcaption>
          <pre>{t.output ? out.map((l, i) => <span key={i} className={!t.autoOk && l.trimEnd() !== (exp[i] ?? '').trimEnd() ? 'mesa-diff' : undefined}>{l}{'\n'}</span>) : '(no imprimió nada)'}</pre>
        </figure>
        {!t.autoOk && <figure><figcaption>esperada</figcaption><pre>{t.expected}</pre></figure>}
      </div>
    </li>
  )
}

/** Una línea del aula: estado, aciertos y el menú para cambiarle el ejercicio. */
function StudentRow({ name, joined, defeated, solved, typing, tasks, catalog, canAssign, onAssign }: {
  name: string; joined: boolean; defeated: string[]; solved: number; typing: boolean; tasks: BoardTask[]; catalog: CatalogEntry[]
  canAssign: boolean; onAssign: (exerciseId: string) => void
}) {
  const open = tasks.find((t) => t.status === 'asignado' || t.status === 'enviado')
  const queued = tasks.find((t) => t.status === 'en_cola')
  const misses = tasks.filter((t) => t.status === 'incorrecto').length
  const state = !joined ? 'no entró' : open?.status === 'enviado' ? 'esperando' : typing ? 'escribiendo…' : open ? 'pensando' : '—'
  const seen = new Set(defeated)
  return (
    <li className={`mesa-row ${joined ? '' : 'is-out'} ${open?.status === 'enviado' ? 'is-waiting' : ''}`}>
      <div className="mesa-row-line">
        <b>{name}</b>
        <span className="mesa-row-state">{state}</span>
        <span className="mesa-score">✔{solved}{misses ? ` ✘${misses}` : ''}</span>
      </div>
      {(open || queued) && (
        <div className="mesa-row-ex">
          {open && <>{open.title} <small>{TIER_SHORT[open.tier]}</small></>}
          {queued && <em> · después: {queued.title}</em>}
        </div>
      )}
      {canAssign && (
        <select className="mesa-select mesa-assign" value="" onChange={(e) => onAssign(e.target.value)} aria-label={`Darle un ejercicio a ${name}`}>
          <option value="">{open ? 'cambiar ejercicio…' : 'dejarle uno en cola…'}</option>
          {(['junior', 'trainee', 'senior'] as ChallengeTier[]).map((tier) => (
            <optgroup key={tier} label={tier.toUpperCase()}>
              {catalog.filter((c) => c.tier === tier).map((c) => (
                <option key={c.id} value={c.id}>{c.title} · {c.type === 'sql' ? 'SQL' : 'Py'}{seen.has(c.needs) ? '' : ' · ⚠ no vio el tema'}</option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
    </li>
  )
}
