'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Win from '@/components/ui/Win'
import { CodeBlock, MiniTable } from '@/components/game/LessonWindow'
import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import PixelTitle from '@/components/game/map/PixelTitle'
import { IconCheck, IconX } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'
import { blankCount, fillTemplate, type ChoiceBeat, type FillBeat, type Repaso, type TalkBeat } from '@/lib/game/repasos'
import { completeRepaso, getRepasoProgress, saveRepasoBeat } from '@/lib/storage/local-store'
import type { Boss } from '@/types'
import FillEditor from './FillEditor'
import PixelBurst from './PixelBurst'
import { friendlyError } from '@/lib/game/friendly-error'
import RodolfoTalk from './RodolfoTalk'

const vt = 'var(--font-vt323), monospace'
const jersey = 'var(--font-jersey), monospace'

// El elogio depende de cómo llegó: a la primera, probando de nuevo, o con la respuesta de Rodolfo.
const PRAISE_FIRST = ['¡Eso! Salió perfecto.', '¡Muy bien! Lo hiciste vos solo.', '¡Genial, salió a la primera!', '¡Excelente! Python te hizo caso.']
const PRAISE_RETRY = ['¡Ahí está! Probar de nuevo también es programar.', '¡Lo encontraste! Así se aprende.', '¡Bien ahí! Ese error ya no te agarra.']
const PRAISE_HELPED = ['¡Funciona! Ahora ya viste cómo va: la próxima sale sola.', '¡Listo! Mirá bien cómo quedó, que el jefe pregunta parecido.']
const pickOne = (list: string[]) => list[Math.floor(Math.random() * list.length)]

interface RunResult { ok: boolean; lines: string[]; table: { cols: string[]; rows: string[][] } | null; error: string | null }

function normalize(s: string) {
  return s.trim().replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n')
}

async function runBeat(beat: FillBeat, values: string[]): Promise<RunResult> {
  const code = fillTemplate(beat.template, values)
  if (beat.lang === 'python') {
    const { runPython } = await import('@/lib/game/executor/pyodide-runner')
    const { output, error } = await runPython(code)
    if (error) return { ok: false, lines: [], table: null, error }
    return { ok: normalize(output) === normalize(beat.expected), lines: output ? output.split('\n') : [], table: null, error: null }
  }
  const { runSQL } = await import('@/lib/game/executor/sql-runner')
  const { rows, columns, error } = await runSQL(code, beat.seed)
  if (error) return { ok: false, lines: [], table: null, error }
  const actual = rows.map((r) => r.join('|')).join('\n')
  return { ok: normalize(actual) === normalize(beat.expected), lines: [], table: { cols: columns, rows }, error: null }
}

interface Props {
  repaso: Repaso
  boss: Boss
  /** ¿El alumno ya puede pelear contra este jefe? Decide el botón final. */
  canFight: boolean
}

export default function RepasoActivity({ repaso, boss, canFight }: Props) {
  const total = repaso.beats.length
  const [loaded, setLoaded] = useState(false)
  const [idx, setIdx] = useState(0)
  const [reached, setReached] = useState(0)
  const [finished, setFinished] = useState(false)
  const [resumedFrom, setResumedFrom] = useState(0)

  // Estado del paso actual
  const [ran, setRan] = useState(false)
  const [values, setValues] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [engineSlow, setEngineSlow] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const [mood, setMood] = useState<'talk' | 'happy' | 'think'>('talk')
  const [reaction, setReaction] = useState<string[] | null>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  /** Cada acierto incrementa esto: re-monta el polvo de tiza. */
  const [burst, setBurst] = useState(0)
  /** Casillero que se acaba de completar — recibe el "sello". */
  const [stampAt, setStampAt] = useState<number | null>(null)
  const answerTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [helped, setHelped] = useState(false)
  // Los botones del final se arman medio segundo después: un doble clic en
  // "Terminar repaso" no tiene que caer en "Repasar de nuevo".
  const [doneReady, setDoneReady] = useState(false)
  useEffect(() => {
    if (!finished) { setDoneReady(false); return }
    const t = setTimeout(() => setDoneReady(true), 600)
    return () => clearTimeout(t)
  }, [finished])
  useEffect(() => () => { if (answerTimer.current) clearInterval(answerTimer.current) }, [])

  const beat = repaso.beats[idx]

  // Retomar donde quedó (si no lo había terminado) y precalentar el motor.
  useEffect(() => {
    const p = getRepasoProgress()[repaso.bossId]
    if (p && !p.done && p.beat > 0) {
      const at = Math.min(p.beat, total - 1)
      setIdx(at)
      setReached(at)
      setResumedFrom(at)
    } else if (p?.done) {
      setReached(total - 1)
    }
    setLoaded(true)
    const langs = new Set(repaso.beats.flatMap((b) => ('lang' in b && b.lang ? [b.lang] : [])))
    import('@/lib/game/executor').then(({ preloadPyodide, preloadSqlJs }) => {
      if (langs.has('python')) preloadPyodide()
      if (langs.has('sql')) preloadSqlJs()
    })
  }, [repaso, total])

  const resetBeat = useCallback((i: number) => {
    const b = repaso.beats[i]
    setRan(false)
    setValues(b.kind === 'fill' ? Array(blankCount(b.template)).fill('') : [])
    setResult(null)
    setAttempts(0)
    setPicked(null)
    setSolved(false)
    setMood('talk')
    setReaction(null)
    setHelped(false)
    if (answerTimer.current) { clearInterval(answerTimer.current); answerTimer.current = null }
  }, [repaso])

  useEffect(() => { resetBeat(idx) }, [idx, resetBeat])

  const needsRun = beat.kind === 'talk' && !!beat.code && (!!beat.output?.length || !!beat.table)
  const beatComplete = beat.kind === 'talk' ? (!needsRun || ran) : solved
  const canAdvance = beatComplete || idx < reached

  const goNext = useCallback(() => {
    if (!canAdvance) { sfx.denied(); return }
    if (idx === total - 1) {
      completeRepaso(repaso.bossId, total)
      setFinished(true)
      sfx.schoolBell()
      setTimeout(() => sfx.victory(), 450)
      return
    }
    const n = idx + 1
    sfx.repasoStamp()
    setStampAt(idx)
    setIdx(n)
    setReached((r) => Math.max(r, n))
    saveRepasoBeat(repaso.bossId, n)
  }, [canAdvance, idx, total, repaso.bossId])

  const goPrev = () => {
    if (idx === 0) return
    sfx.select()
    setIdx((i) => i - 1)
  }

  // ── talk: "Ejecutar" muestra la salida precalculada línea por línea
  const [shownOut, setShownOut] = useState(0)
  useEffect(() => { setShownOut(0) }, [idx])
  const runTalk = () => {
    if (beat.kind !== 'talk') return
    sfx.attack()
    setShownOut(0)
    setRunning(true)
    const out = beat.output ?? []
    out.forEach((_, i) => setTimeout(() => { setShownOut(i + 1); sfx.type('machine') }, 220 + i * 300))
    setTimeout(() => { setRunning(false); setRan(true); if (beat.table) sfx.confirm() }, 220 + out.length * 300)
  }

  // ── fill: ejecutar el código de verdad y comparar
  const runFill = async () => {
    if (beat.kind !== 'fill' || running || solved) return
    if (values.some((v) => !v.trim())) {
      sfx.denied()
      setMood('think')
      setReaction([values.length > 1 ? 'Te quedó algún hueco vacío. Completá todos y probá.' : 'Primero escribí algo en el hueco, después tocá Ejecutar.'])
      return
    }
    sfx.attack()
    setRunning(true)
    const slow = setTimeout(() => setEngineSlow(true), 900)
    try {
      const r = await runBeat(beat, values)
      setResult(r)
      if (r.ok) {
        setSolved(true)
        setMood('happy')
        setReaction([pickOne(helped ? PRAISE_HELPED : attempts > 0 ? PRAISE_RETRY : PRAISE_FIRST)])
        sfx.repasoOk()
        setBurst((b) => b + 1)
        setTimeout(() => nextRef.current?.focus(), 60)
      } else {
        const n = attempts + 1
        setAttempts(n)
        setMood('think')
        sfx.repasoHmm()
        const why = r.error ? friendlyError(r.error) : 'Se ejecutó, pero no salió lo que buscábamos.'
        setReaction(n >= 2 ? [why, `Pista: ${beat.hint}`, 'Si querés, tocá "Mostrar respuesta" y lo vemos juntos.'] : [why, `Pista: ${beat.hint}`])
      }
    } finally {
      clearTimeout(slow)
      setEngineSlow(false)
      setRunning(false)
    }
  }

  // Rodolfo escribe la respuesta con tiza, letra por letra, en cada hueco.
  const showAnswer = () => {
    if (beat.kind !== 'fill' || answerTimer.current) return
    const sol = beat.solution
    setHelped(true)
    setResult(null)
    setMood('talk')
    setReaction(['Mirá, te la escribo yo en el pizarrón...'])
    const next = sol.map(() => '')
    setValues([...next])
    let b = 0, c = 0
    answerTimer.current = setInterval(() => {
      if (b >= sol.length) {
        clearInterval(answerTimer.current!)
        answerTimer.current = null
        setReaction(['Así va. Ahora tocá Ejecutar para ver que funciona.'])
        return
      }
      c++
      next[b] = sol[b].slice(0, c)
      setValues([...next])
      sfx.chalk()
      if (c >= sol[b].length) { b++; c = 0 }
    }, 90)
  }

  // ── choice
  const pick = (opt: string) => {
    if (beat.kind !== 'choice' || picked) return
    setPicked(opt)
    setSolved(true)
    const ok = opt === beat.answer
    setMood(ok ? 'happy' : 'think')
    setReaction([ok ? `¡Correcto! ${beat.explain}` : `Casi. La respuesta es "${beat.answer}". ${beat.explain}`])
    if (ok) { sfx.repasoOk(); setBurst((b) => b + 1) } else sfx.repasoHmm()
    setTimeout(() => nextRef.current?.focus(), 60)
  }

  // Enter fuera de un hueco: siguiente paso (si se puede).
  useEffect(() => {
    if (finished) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'BUTTON' || t.tagName === 'A')) return
      if (e.key === 'Enter' && canAdvance) { e.preventDefault(); goNext() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canAdvance, finished, goNext])

  const sayLines = useMemo(() => {
    if (reaction) return reaction
    if (idx === resumedFrom && resumedFrom > 0 && !ran && !solved && !picked) {
      return [`¡Volviste! Seguimos desde el paso ${resumedFrom + 1}, donde habíamos quedado.`, ...beat.say]
    }
    return beat.say
  }, [reaction, idx, resumedFrom, ran, solved, picked, beat.say])

  if (!loaded) return null

  const title = `REPASO · ${repaso.file}`

  if (finished) {
    return (
      <Win title={title} active bodyStyle={{ padding: 0 }}>
        <div className="repaso-done">
          <span className="repaso-confetti-anchor"><PixelBurst kind="confetti" /></span>
          <div className="repaso-done-stage">
            <img src="/rodolfo/rodolfo.gif" width={104} height={104} alt="Rodolfo festejando" className="repaso-pig repaso-pig--happy repaso-done-pig" />
            <PixelTitle text="LISTO!" scale={6} playKey="repaso-done" />
            <p style={{ fontFamily: vt, fontSize: 24, lineHeight: 1.2, color: 'hsl(var(--tx))', maxWidth: '44ch', textAlign: 'center', margin: 0 }}>
              {repaso.outro}
            </p>
            <ul className="repaso-done-topics" aria-label="Lo que repasaste">
              {repaso.topics.map((t) => (
                <li key={t}><IconCheck size={14} color="hsl(var(--accent))" /> {t}</li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-center gap-3" style={{ marginTop: 6, pointerEvents: doneReady ? 'auto' : 'none' }}>
              {canFight ? (
                <Link href={`/battle/${boss.id}`} className="cta-btn cta-btn--primary" onClick={() => sfx.confirm()} style={{ fontSize: 14, padding: '11px 20px' }}>
                  Pelear contra {boss.name}
                </Link>
              ) : (
                <Link href="/dashboard" className="cta-btn cta-btn--primary" onClick={() => sfx.confirm()} style={{ fontSize: 14, padding: '11px 20px' }}>
                  Volver al mapa
                </Link>
              )}
              <Link href="/repaso" className="repaso-ghost-btn">Otros repasos</Link>
              <button type="button" className="repaso-ghost-btn" disabled={!doneReady} onClick={() => { if (!doneReady) return; setFinished(false); setIdx(0); sfx.select() }}>
                Repasar de nuevo
              </button>
            </div>
          </div>
        </div>
      </Win>
    )
  }

  return (
    <Win
      title={title}
      active
      right={<span className="label-mono" style={{ color: 'hsl(var(--bg))', marginRight: 6 }}>Paso {idx + 1} de {total}</span>}
      bodyStyle={{ padding: 0 }}
    >
      {/* Barra de pasos + a qué jefe prepara */}
      <div className="repaso-top">
        <ol className="repaso-steps" aria-label="Pasos del repaso">
          {repaso.beats.map((b, i) => {
            const state = i === idx ? 'now' : i < Math.max(reached, idx) ? 'done' : 'todo'
            return (
              <li key={i} className={`repaso-step repaso-step--${state}${state === 'done' && i === stampAt ? ' repaso-step--stamp' : ''}`} aria-current={i === idx ? 'step' : undefined}>
                <span className="sr-only">Paso {i + 1}{state === 'done' ? ', hecho' : ''}</span>
              </li>
            )
          })}
        </ol>
        <div className="repaso-target">
          <span className="repaso-target-icon"><BossTopicIcon bossId={boss.id} size={14} color="hsl(var(--tx))" /></span>
          <span style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx2))' }}>
            Antes de pelear contra <strong style={{ color: 'hsl(var(--tx))', fontWeight: 400 }}>{boss.name}</strong>
          </span>
        </div>
      </div>

      <div className="repaso-body">
        <RodolfoTalk lines={sayLines} mood={mood} />

        <div className="repaso-work">
          <div key={idx} className="repaso-wipe flex flex-col gap-4">
          {beat.kind === 'talk' && <TalkWork beat={beat} running={running} shownOut={shownOut} ran={ran} onRun={runTalk} />}

          {beat.kind === 'fill' && (
            <div className="flex flex-col gap-3">
              <span className="label-mono">Completá el código</span>
              <FillEditor
                template={beat.template}
                lang={beat.lang}
                values={values}
                onChange={(v) => { setValues(v); if (result && !result.ok) setResult(null) }}
                onSubmit={runFill}
                locked={solved}
                wrong={!!result && !result.ok}
              />
              <div className="flex flex-wrap items-center gap-3">
                <span className="relative inline-flex">
                {burst > 0 && solved && <span className="repaso-burst-anchor"><PixelBurst key={burst} kind="chalk" /></span>}
                <button
                  type="button"
                  onClick={runFill}
                  disabled={running || solved}
                  className="cta-btn cta-btn--primary"
                  style={{ fontSize: 13, padding: '9px 18px', cursor: running ? 'wait' : solved ? 'default' : 'pointer', opacity: solved ? 0.5 : 1 }}
                >
                  {running ? 'Ejecutando…' : 'Ejecutar'}
                </button>
                </span>
                {attempts >= 2 && !solved && (
                  <button type="button" onClick={showAnswer} className="repaso-ghost-btn">Mostrar respuesta</button>
                )}
                {engineSlow && (
                  <span style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>
                    Prendiendo {beat.lang === 'sql' ? 'SQL' : 'Python'}… la primera vez tarda un poquito.
                  </span>
                )}
              </div>
              {result && <FillResult result={result} expected={beat.expected} lang={beat.lang} />}
            </div>
          )}

          {beat.kind === 'choice' && <ChoiceWork beat={beat} picked={picked} onPick={pick} burst={burst} />}
          </div>

          <div className="repaso-nav">
            <button type="button" onClick={goPrev} disabled={idx === 0} className="repaso-ghost-btn" style={{ opacity: idx === 0 ? 0.35 : 1 }}>
              Anterior
            </button>
            {!canAdvance && (
              <span style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>
                {beat.kind === 'talk' ? 'Tocá Ejecutar para ver qué pasa' : beat.kind === 'fill' ? 'Completá y ejecutá para seguir' : 'Elegí una respuesta'}
              </span>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className={`repaso-next-btn${canAdvance ? ' repaso-next-btn--ready' : ''}`}
            >
              {idx === total - 1 ? 'Terminar repaso' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </Win>
  )
}

function TalkWork({ beat, running, shownOut, ran, onRun }: { beat: TalkBeat; running: boolean; shownOut: number; ran: boolean; onRun: () => void }) {
  const out = beat.output ?? []
  const hasResult = out.length > 0 || !!beat.table
  return (
    <div className="flex flex-col gap-3">
      {beat.code && (
        <>
          <span className="label-mono">Ejemplo</span>
          <CodeBlock code={beat.code} lang={beat.lang ?? 'python'} highlight={beat.highlight} />
        </>
      )}
      {!beat.code && beat.table && <MiniTable table={beat.table} caption="Tabla cofre" />}
      {beat.code && hasResult && (
        <>
          <div>
            <button
              type="button"
              onClick={onRun}
              disabled={running}
              className={`cta-btn cta-btn--primary${!ran && !running ? ' repaso-run-hint' : ''}`}
              style={{ fontSize: 13, padding: '9px 18px', cursor: running ? 'wait' : 'pointer' }}
            >
              {running ? 'Ejecutando…' : ran ? 'Ejecutar de nuevo' : 'Ejecutar'}
            </button>
          </div>
          <div className="repaso-output" aria-live="polite">
            <span className="label-mono">{beat.lang === 'sql' ? 'Resultado' : 'Salida'}</span>
            {!ran && !running && shownOut === 0 && (
              <span style={{ fontFamily: vt, fontSize: 19, color: 'hsl(var(--tx3))' }}>Tocá Ejecutar y mirá qué pasa.</span>
            )}
            {out.slice(0, shownOut).map((o, i) => (
              <div key={i} className="lesson-line" style={{ fontFamily: vt, fontSize: 22, color: 'hsl(var(--tx))', whiteSpace: 'pre-wrap' }}>
                <span style={{ color: 'hsl(var(--accent))' }}>&gt; </span>{o}
              </div>
            ))}
            {running && <span className="animate-caret" style={{ color: 'hsl(var(--accent))', fontFamily: vt, fontSize: 21 }}>█</span>}
            {ran && beat.table && (
              <div className="lesson-line">
                {beat.table.rows.length === 0
                  ? <MiniTable table={beat.table} caption="La tabla quedó creada (todavía vacía)" />
                  : <MiniTable table={beat.table} />}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function FillResult({ result, expected, lang }: { result: RunResult; expected: string; lang: 'python' | 'sql' }) {
  const ok = result.ok
  return (
    <div className={`repaso-output repaso-output--${ok ? 'ok' : 'bad'} lesson-line`} aria-live="polite">
      <span className="flex items-center gap-2" style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.04em', color: ok ? 'hsl(var(--accent))' : 'hsl(var(--danger))' }}>
        {ok ? <IconCheck size={14} color="hsl(var(--accent))" /> : <IconX size={14} color="hsl(var(--danger))" />}
        {ok ? '¡Funciona!' : result.error ? 'Hubo un error' : 'Todavía no'}
      </span>
      {result.error ? (
        <code style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx3))', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{result.error}</code>
      ) : lang === 'sql' && result.table ? (
        result.table.cols.length > 0
          ? <MiniTable table={{ cols: result.table.cols, rows: result.table.rows }} />
          : <span style={{ fontFamily: vt, fontSize: 19, color: 'hsl(var(--tx3))' }}>(no devolvió filas)</span>
      ) : (
        <div>
          {result.lines.length === 0 && <span style={{ fontFamily: vt, fontSize: 19, color: 'hsl(var(--tx3))' }}>(no imprimió nada)</span>}
          {result.lines.map((l, i) => (
            <div key={i} style={{ fontFamily: vt, fontSize: 22, color: 'hsl(var(--tx))', whiteSpace: 'pre-wrap' }}>
              <span style={{ color: 'hsl(var(--accent))' }}>&gt; </span>{l}
            </div>
          ))}
        </div>
      )}
      {!ok && !result.error && (
        <div style={{ borderTop: '1px dashed hsl(var(--border2))', paddingTop: 6 }}>
          <span className="label-mono">Tenía que salir</span>
          {expected.split('\n').map((l, i) => (
            <div key={i} style={{ fontFamily: vt, fontSize: 20, color: 'hsl(var(--tx2))', whiteSpace: 'pre-wrap' }}>{lang === 'sql' ? l.split('|').join('  ·  ') : l}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChoiceWork({ beat, picked, onPick, burst }: { beat: ChoiceBeat; picked: string | null; onPick: (o: string) => void; burst: number }) {
  return (
    <div className="flex flex-col gap-3">
      {beat.code && <CodeBlock code={beat.code} lang={beat.lang ?? 'python'} />}
      <span className="label-mono">Elegí una</span>
      <div className="repaso-choices" role="group" aria-label="Opciones">
        {beat.options.map((o, i) => {
          const isAnswer = o === beat.answer
          const state = !picked ? '' : isAnswer ? ' repaso-choice--ok' : o === picked ? ' repaso-choice--bad' : ' repaso-choice--off'
          return (
            <button key={o} type="button" onClick={() => onPick(o)} onMouseEnter={() => { if (!picked) sfx.hover() }} disabled={!!picked} className={`repaso-choice${state}`}>
              <span className="repaso-choice-key">
                {String.fromCharCode(65 + i)}
                {picked === o && isAnswer && burst > 0 && <span className="repaso-burst-anchor"><PixelBurst key={burst} kind="chalk" /></span>}
              </span>
              <span className="repaso-choice-text">{o}</span>
              {picked && isAnswer && <IconCheck size={16} color="hsl(var(--accent))" />}
              {picked && o === picked && !isAnswer && <IconX size={16} color="hsl(var(--danger))" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
