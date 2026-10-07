'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import FillEditor from '@/components/game/repaso/FillEditor'
import PixelBurst from '@/components/game/repaso/PixelBurst'
import PixelTitle from '@/components/game/map/PixelTitle'
import { IconCheck } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'
import { blankCount, fillSpell, type Book } from '@/lib/game/biblioteca'
import { normalizeOutput, runBookCode, type BookRun } from '@/lib/game/biblioteca-run'
import { friendlyError } from '@/lib/game/friendly-error'
import { castBookSpell, type BibliotecaProgress, type BookProgress } from '@/lib/storage/local-store'
import { RichText, PageTurn } from './BookSpread'
import { DUMMY, DUMMY_KO, Ico, ICO_RIGHT, ICO_SPARK, PixelGrid, SEAL } from './LibrarySprites'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

const CHEERS = ['¡ZAS!', '¡PAF!', '¡PUM!', '¡CRAC!']
const PRAISE_FIRST = ['¡Hechizo perfecto, a la primera!', '¡Le diste de lleno!', '¡Eso! Python te hizo caso.']
const PRAISE_RETRY = ['¡Ahí está! Probar de nuevo también es programar.', '¡Lo encontraste!', '¡Bien ahí! Ese error ya no te agarra.']
const pick = (l: string[]) => l[Math.floor(Math.random() * l.length)]

interface Props {
  book: Book
  progress: BookProgress
  onProgress: (all: BibliotecaProgress) => void
  turnClass: (side: 'left' | 'right') => string
  turnKey: number
  onPrev: () => void
  onNext?: () => void
  onClose: () => void
}

// Mesa de hechizos: cada hechizo es código con huecos que se ejecuta de
// verdad. Si sale lo que tiene que salir, el hechizo vuela a la página de al
// lado y le pega al muñeco de práctica; con todos, el muñeco cae y el libro
// queda dominado (sello en el lomo y en la vitrina del estante).
export default function SpellTable({ book, progress, onProgress, turnClass, turnKey, onPrev, onNext, onClose }: Props) {
  const total = book.spells.length
  const alreadyMastered = !!progress.masteredAt
  // Si el libro ya estaba dominado, el muñeco se rearma: esta visita es práctica libre.
  const [round, setRound] = useState<string[]>([])
  const solvedIds = alreadyMastered ? round : progress.spells
  const firstOpen = book.spells.findIndex((s) => !solvedIds.includes(s.id))
  const [idx, setIdx] = useState(firstOpen < 0 ? 0 : firstOpen)
  const spell = book.spells[idx]
  const [values, setValues] = useState<string[]>(() => Array(blankCount(spell.template)).fill(''))
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<BookRun | null>(null)
  const [ok, setOk] = useState<boolean | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [helped, setHelped] = useState(false)
  const [praise, setPraise] = useState('')
  const [hit, setHit] = useState(0)
  const [bolt, setBolt] = useState(0)
  const [burst, setBurst] = useState(0)
  const [mastered, setMastered] = useState(false)
  const [fizzle, setFizzle] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }

  const hp = total - solvedIds.length
  const solvedHere = ok === true
  const ko = mastered || (!alreadyMastered && hp === 0) || (alreadyMastered && round.length === total)

  const choose = (i: number) => {
    if (i === idx) return
    sfx.select()
    setIdx(i)
    setValues(Array(blankCount(book.spells[i].template)).fill(''))
    setResult(null)
    setOk(null)
    setAttempts(0)
    setHelped(false)
  }

  const nextOpen = useMemo(() => {
    for (let k = 1; k <= total; k++) {
      const j = (idx + k) % total
      if (!solvedIds.includes(book.spells[j].id)) return j
    }
    return -1
  }, [book.spells, idx, solvedIds, total])

  const cast = async () => {
    if (running || ok) return
    if (values.some((v) => !v.trim())) {
      sfx.denied()
      setResult(null)
      setOk(false)
      setPraise(values.length > 1 ? 'Te quedó algún hueco vacío.' : 'Primero escribí algo en el hueco.')
      return
    }
    sfx.spellCast()
    setRunning(true)
    try {
      const r = await runBookCode(book.lang, fillSpell(spell.template, values), {
        seed: spell.seed ?? book.seed, peek: spell.peek, prelude: book.prelude,
      })
      setResult(r)
      const good = !r.error && normalizeOutput(r.flat) === normalizeOutput(spell.expected)
      setOk(good)
      if (!good) {
        setAttempts((a) => a + 1)
        setFizzle((f) => f + 1)
        setPraise('')
        sfx.spellFizzle()
        return
      }
      setPraise(pick(helped ? ['¡Funciona! Mirá bien cómo quedó: la próxima sale sola.'] : attempts > 0 ? PRAISE_RETRY : PRAISE_FIRST))
      setBolt((b) => b + 1)
      setBurst((b) => b + 1)
      later(() => { sfx.dummyHit(); setHit((h) => h + 1) }, 320)
      if (alreadyMastered) {
        setRound((r0) => (r0.includes(spell.id) ? r0 : [...r0, spell.id]))
      } else {
        const { all, justMastered } = castBookSpell(book.id, spell.id, total)
        later(() => onProgress(all), 340)
        if (justMastered) {
          later(() => { setMastered(true); sfx.bookMastered() }, 900)
        }
      }
    } finally {
      setRunning(false)
    }
  }

  const showAnswer = () => {
    sfx.chalk()
    setHelped(true)
    setValues(spell.answers.slice())
    setOk(null)
    setResult(null)
  }

  return (
    <>
      {/* Izquierda: el muñeco, su vida y las runas */}
      <section key={`sl-${turnKey}`} className={`lib-page lib-page--left lib-dummy-page${turnClass('left')}`} aria-label="Muñeco de práctica">
        <div className="lib-arena">
          <div key={hit} className={`lib-dummy${hit ? ' lib-dummy--hit' : ''}${ko ? ' lib-dummy--ko' : ''}`}>
            <PixelGrid rows={ko ? DUMMY_KO : DUMMY} size={200} title="Muñeco de práctica" />
            {hit > 0 && <span key={`dmg-${hit}`} className="lib-dmg" aria-hidden="true">{CHEERS[hit % CHEERS.length]}</span>}
          </div>
          {bolt > 0 && <span key={`bolt-${bolt}`} className="lib-bolt" aria-hidden="true" />}
        </div>
        <div className="lib-hp" role="meter" aria-label="Vida del muñeco" aria-valuemin={0} aria-valuemax={total} aria-valuenow={hp}>
          <span className="label-mono">Vida del muñeco</span>
          <span className="lib-hp-track">
            {Array.from({ length: total }, (_, i) => <span key={i} className={i < hp ? 'on' : ''} />)}
          </span>
        </div>
        {alreadyMastered && <p className="lib-keyhint" style={{ textAlign: 'center', margin: '-6px 0 12px' }}>Ya dominás este libro: el muñeco se rearmó para que practiques.</p>}
        <ol className="lib-runes" aria-label="Hechizos de este libro">
          {book.spells.map((s, i) => {
            const done = solvedIds.includes(s.id)
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`lib-rune${done ? ' is-done' : ''}${i === idx ? ' is-current' : ''}`}
                  onClick={() => choose(i)}
                  aria-current={i === idx ? 'step' : undefined}
                >
                  <span className="lib-rune-mark" aria-hidden="true">{done ? <IconCheck size={12} color="currentColor" /> : i + 1}</span>
                  <span className="lib-rune-text"><RichText text={s.prompt} /></span>
                </button>
              </li>
            )
          })}
        </ol>
        <PageTurn side="left" onClick={onPrev} label="Teoría" />
        <span className="lib-folio">Hechizo {idx + 1} / {total}</span>
      </section>

      <div className="lib-gutter" aria-hidden="true" />

      {/* Derecha: el hechizo de turno, o el final */}
      <section key={`sr-${turnKey}`} className={`lib-page lib-page--right${turnClass('right')}`} aria-label="Hechizo">
        {mastered ? (
          <div className="lib-mastered">
            <span className="repaso-confetti-anchor"><PixelBurst kind="confetti" /></span>
            <div className="lib-mastered-seal"><PixelGrid rows={SEAL} size={84} title="Sello de libro dominado" /></div>
            <PixelTitle text="DOMINADO!" scale={4} />
            <p style={{ fontFamily: vt, fontSize: 21, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: '10px 0 0', textAlign: 'center' }}>
              Lanzaste los {total} hechizos de «{book.title}». El sello ya está en el lomo del libro y en tu vitrina.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {onNext && <button type="button" className="cta-btn cta-btn--primary" onClick={onNext}>Ver qué pide el jefe <Ico rows={ICO_RIGHT} /></button>}
              <button type="button" className={`cta-btn${onNext ? '' : ' cta-btn--primary'}`} onClick={onClose}>Volver al estante</button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="lib-page-title"><RichText text={spell.prompt} /></h2>
            <div className="lib-spell-editor">
              <FillEditor
                template={spell.template}
                lang={book.lang}
                values={values}
                onChange={(v) => { setValues(v); if (ok === false) { setOk(null); setResult(null) } }}
                onSubmit={cast}
                locked={!!solvedHere}
                wrong={ok === false && !!result}
              />
            </div>
            {book.setup && <p className="lib-setup"><span className="lib-setup-tag">Datos</span> {book.setup}</p>}
            <div className="lib-run-row">
              {solvedHere ? (
                nextOpen >= 0
                  ? <button type="button" className="cta-btn cta-btn--primary" onClick={() => choose(nextOpen)}>Siguiente hechizo <Ico rows={ICO_RIGHT} /></button>
                  : <button type="button" className="cta-btn cta-btn--primary" onClick={onNext ?? onClose}>{onNext ? <>Ver qué pide el jefe <Ico rows={ICO_RIGHT} /></> : 'Volver al estante'}</button>
              ) : (
                <button key={fizzle} type="button" className={`cta-btn cta-btn--primary lib-cast${fizzle ? ' lib-cast--fizzle' : ''}`} onClick={cast} disabled={running}>
                  <Ico rows={ICO_SPARK} />{running ? 'Cargando el hechizo…' : 'Lanzar hechizo'}
                  {burst > 0 && ok && <span className="repaso-burst-anchor"><PixelBurst key={burst} kind="chalk" /></span>}
                </button>
              )}
              {!solvedHere && attempts >= 2 && !helped && (
                <button type="button" className="lib-ghost-btn" onClick={showAnswer}>Mostrar respuesta</button>
              )}
            </div>

            {ok === true && praise && <p className="lib-praise" role="status">{praise}</p>}
            {ok === false && !result && praise && <p className="lib-hint" role="status">{praise}</p>}
            {ok === false && result && (
              <div className="lib-fail" role="status">
                <p className="lib-fail-head">El hechizo rebotó.</p>
                {result.error
                  ? <p className="lib-fail-why">{friendlyError(result.error)} <span className="lib-err-raw-inline">({result.error})</span></p>
                  : (
                    <div className="lib-compare">
                      <div><span className="label-mono">Tenía que salir</span><pre>{spell.expected}</pre></div>
                      <div><span className="label-mono">Salió</span><pre>{result.flat || '(nada)'}</pre></div>
                    </div>
                  )}
                {attempts >= 1 && <p className="lib-hint"><span className="lib-try-tag">Pista</span> <RichText text={spell.hint} /></p>}
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
