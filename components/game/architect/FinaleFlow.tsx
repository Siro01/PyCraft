'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ArchitectCanvas from './ArchitectCanvas'
import ContinuePrompt from './ContinuePrompt'
import DialogueBox from './DialogueBox'
import { BOSSES } from '@/lib/game/bosses'
import { sfx, isMuted, setMuted } from '@/lib/game/architect/sound'
import { getViewer, submitFeedback, type FeedbackInput, type Viewer } from '@/lib/game/architect/feedback'
import type { RenderMode } from '@/lib/game/architect/render'

const ICE = '#BFE9FF'
const AMBER = '#F59E0B'

type Step = 'continue' | 'no' | 'morph' | 'intro' | 'ask' | 'saving' | 'thanks'

// ── Guion ─────────────────────────────────────────────────────────────────────

// Lo que dice el Arquitecto I cuando el alumno elige NO. Nunca obliga: siempre hay salida.
const NO_LINES = [
  '¿NO? ¿En serio? Ni siquiera me dejaste presentarme. Descortés, pero respeto tu decisión.',
  'Un NO. Interesante. En SQL un DELETE sin WHERE borra todo, pero yo acepto tu respuesta sin borrar nada.',
  'Me estoy desvanecemmm... perdón, me trabé. Me estoy desvaneciendo con muchísima dignidad.',
  'Vos salvaste el mundo, yo solo lo compilé. Igual, ¡gracias por jugar!',
  'Ok, ok. Si cambiás de idea, atrás mío hay algo que quizás te interese. Miau. ...Digo, ¡nada!',
  'NO es una respuesta válida para un input() sin validación. Ups. Bueno, va igual.',
]

const INTRO_LINES = [
  'miau.',
  'Perdón por el susto. Ese de recién era solo mi disfraz.',
  'Yo soy el Arquitecto. Escribí este mundo, línea por línea.',
  'Los 13 jefes eran mis ayudantes. Ninguno quería lastimarte: cada uno te enseñaba algo con sus preguntas.',
  'Y vos aprendiste de cada respuesta. De las que acertaste... y también de las que no.',
  'Llegaste hasta acá. Estoy muy orgulloso. Miau.',
  'Antes de que te vayas, ¿me ayudás con algo? Soy la primera versión de este juego y quiero mejorar.',
]

const RATING_LABELS = ['Mal', 'Regular', 'Normal', 'Bien', '¡Genial!']

interface Question {
  id: 'rating' | 'hardestBoss' | 'liked' | 'improve' | 'extra'
  text: string
  kind: 'rating' | 'boss' | 'text'
  placeholder?: string
}

const QUESTIONS: Question[] = [
  { id: 'rating', kind: 'rating', text: '¿Qué te pareció la experiencia?' },
  { id: 'hardestBoss', kind: 'boss', text: '¿Qué jefe se te hizo más difícil?' },
  { id: 'liked', kind: 'text', text: '¿Qué fue lo que más te gustó?', placeholder: 'Escribí lo que quieras…' },
  { id: 'improve', kind: 'text', text: '¿Qué cambiarías o mejorarías?', placeholder: 'Más ayuda, más jefes, otro color…' },
  { id: 'extra', kind: 'text', text: '¿Algo más? Un error que viste, una idea, un chiste…', placeholder: 'Lo que se te ocurra' },
]

// ── Estilos compartidos ───────────────────────────────────────────────────────

const jersey = 'var(--font-jersey), "Courier New", monospace'

function PixelButton({ children, onClick, accent = AMBER, filled = false, disabled = false }: {
  children: React.ReactNode; onClick: () => void; accent?: string; filled?: boolean; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => { sfx.confirm(); onClick() }}
      disabled={disabled}
      style={{
        fontFamily: jersey, fontSize: 24, letterSpacing: '0.04em',
        padding: '8px 22px', cursor: disabled ? 'default' : 'pointer',
        border: `3px solid ${accent}`,
        background: filled ? accent : 'transparent',
        color: filled ? '#000' : accent,
        boxShadow: `4px 4px 0 ${accent}44`,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%', background: '#04060a', color: '#fff', border: `3px solid ${AMBER}`,
  fontFamily: jersey, fontSize: 22, padding: '10px 12px', outline: 'none', borderRadius: 0,
}

// Ventana estilo "PROJECT.EXE" que enmarca al Arquitecto
function ArchitectWindow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 'min(100%, 340px)', border: '3px solid #d8d8d8', background: '#000' }}>
      <div
        className="flex items-center justify-between font-mono"
        style={{ background: '#d8d8d8', color: '#000', fontSize: 11, padding: '2px 8px', letterSpacing: '0.08em' }}
      >
        <span>ARQUITECTO.EXE</span>
        <span aria-hidden="true">_ □ ×</span>
      </div>
      {children}
    </div>
  )
}

// ── Flujo ─────────────────────────────────────────────────────────────────────

export default function FinaleFlow() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('continue')
  const [viewer, setViewer] = useState<Viewer>({ loggedIn: false })
  const [muted, setMutedState] = useState(false)

  const [morphT, setMorphT] = useState(0)
  const [integrity, setIntegrity] = useState(1)
  const [mode, setMode] = useState<RenderMode>('ascii')
  const [color, setColor] = useState(ICE)

  const [noLine, setNoLine] = useState(0)
  const [noReady, setNoReady] = useState(false)
  const [line, setLine] = useState(0)
  const [q, setQ] = useState(0)
  const [qReady, setQReady] = useState(false)
  const [draft, setDraft] = useState('')
  const [hover, setHover] = useState(0)
  const [answers, setAnswers] = useState<FeedbackInput>({ rating: null, hardestBoss: null, liked: '', improve: '', extra: '' })
  const [result, setResult] = useState<'db' | 'local' | 'error' | null>(null)
  const [thanksReady, setThanksReady] = useState(false)

  useEffect(() => {
    setMutedState(isMuted())
    getViewer().then(setViewer)
  }, [])

  const toggleMute = () => {
    setMuted(!muted)
    setMutedState(!muted)
    if (muted) sfx.confirm()
  }

  const exitHref = viewer.loggedIn ? '/dashboard' : '/login'

  // ── CONTINUE? ──────────────────────────────────────────────────────────────
  const onYes = () => {
    setIntegrity(0)
    setMorphT(0)
    setMode('ascii')
    setColor(ICE)
    setStep('morph')
  }

  const onNo = () => {
    setNoLine((prev) => {
      let next = Math.floor(Math.random() * NO_LINES.length)
      if (next === prev) next = (next + 1) % NO_LINES.length
      return next
    })
    setNoReady(false)
    setIntegrity(0.4)
    setMorphT(0)
    setMode('ascii')
    setColor(ICE)
    sfx.glitch()
    setStep('no')
  }

  const leave = () => router.push(viewer.loggedIn ? '/dashboard' : '/demo/victory')

  // ── Transición rostro → gato ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'morph') return
    const DUR = 2200
    let raf = 0
    let lastGlitch = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    // 1) el rostro se rearma desde el ruido
    timers.push(setTimeout(() => { setIntegrity(1); sfx.glitch() }, 80))
    // 2) los caracteres se reordenan hasta formar al gato
    timers.push(setTimeout(() => {
      const start = performance.now()
      const frame = (now: number) => {
        const k = Math.min(1, (now - start) / DUR)
        setMorphT(k * k * (3 - 2 * k))
        if (k < 1 && now - lastGlitch > 300) { sfx.glitch(); lastGlitch = now }
        if (k < 1) raf = requestAnimationFrame(frame)
      }
      raf = requestAnimationFrame(frame)
    }, 1000))
    // 3) el gato pasa a puntos y aparece
    timers.push(setTimeout(() => { setMode('dots'); setColor('#FFFFFF'); sfx.glitch() }, 1000 + DUR + 350))
    timers.push(setTimeout(() => { sfx.meow(); setLine(0); setStep('intro') }, 1000 + DUR + 900))

    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout) }
  }, [step])

  // ── Preguntas ──────────────────────────────────────────────────────────────
  const finish = async (final: FeedbackInput) => {
    setStep('saving')
    const r = await submitFeedback(final)
    setResult(r)
    sfx.jingle()
    setLine(0)
    setThanksReady(false)
    setStep('thanks')
  }

  const commit = (patch: Partial<FeedbackInput>) => {
    const next = { ...answers, ...patch }
    setAnswers(next)
    setDraft('')
    setHover(0)
    if (q < QUESTIONS.length - 1) {
      setQ(q + 1)
      setQReady(false)
    } else {
      void finish(next)
    }
  }

  const question = QUESTIONS[q]

  const thanksLines = [
    result === 'error'
      ? 'Uy, no pude guardar tus respuestas en mi base. Pero las dejé anotadas en esta compu.'
      : 'Listo. Guardé todo. Lo voy a leer con muchísima atención.',
    'Un secreto de Arquitecto: los errores nunca fueron fracasos. Fueron la forma en que aprendías.',
    'Mirá todo lo que dominaste:',
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  const showWindow = step !== 'continue'
  const catStage = step === 'intro' || step === 'ask' || step === 'saving' || step === 'thanks'

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-6"
      style={{ background: '#000', color: '#fff' }}
    >
      <div className="w-full flex justify-end" style={{ maxWidth: 680 }}>
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
          className="font-mono"
          style={{ background: 'none', border: '1px solid #333', color: '#888', fontSize: 11, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.1em' }}
        >
          SONIDO {muted ? 'OFF' : 'ON'}
        </button>
      </div>

      {step === 'continue' && <ContinuePrompt onYes={onYes} onNo={onNo} />}

      {showWindow && (
        <div className="flex flex-col items-center w-full mt-6" style={{ gap: 4 }}>
          <ArchitectWindow>
            <ArchitectCanvas
              mode={mode}
              morphT={morphT}
              integrity={integrity}
              color={color}
              glitchy={!catStage}
              label={catStage ? 'El Arquitecto, un gato' : 'El Arquitecto'}
            />
          </ArchitectWindow>

          {/* NO: dialogo ocurrente + salida siempre disponible */}
          {step === 'no' && (
            <>
              <DialogueBox key={noLine} text={NO_LINES[noLine]} accent={ICE} onTyped={() => setNoReady(true)} />
              <div className="flex gap-4 flex-wrap justify-center" style={{ marginTop: 18, visibility: noReady ? 'visible' : 'hidden' }}>
                <PixelButton accent={ICE} onClick={leave}>Irme</PixelButton>
                <PixelButton accent={ICE} filled onClick={onYes}>Bueno… YES</PixelButton>
              </div>
            </>
          )}

          {step === 'morph' && <div className="font-mono text-xs" style={{ color: '#555', marginTop: 16, letterSpacing: '0.2em' }}>REESCRIBIENDO…</div>}

          {step === 'intro' && (
            <DialogueBox
              key={line}
              text={INTRO_LINES[line]}
              voice="cat"
              accent={AMBER}
              advance
              onNext={() => {
                if (line < INTRO_LINES.length - 1) setLine(line + 1)
                else { setQ(0); setQReady(false); setStep('ask') }
              }}
            />
          )}

          {step === 'ask' && (
            <>
              <DialogueBox key={q} text={question.text} voice="cat" accent={AMBER} onTyped={() => setQReady(true)} />
              <div className="w-full" style={{ maxWidth: 680, marginTop: 18, visibility: qReady ? 'visible' : 'hidden' }}>
                {question.kind === 'rating' && (
                  <div className="flex flex-col items-center">
                    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`${n} de 5: ${RATING_LABELS[n - 1]}`}
                          onMouseEnter={() => { setHover(n); sfx.select() }}
                          onClick={() => { sfx.confirm(); commit({ rating: n }) }}
                          style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 52, lineHeight: 1, padding: '0 6px', color: n <= hover ? AMBER : '#444' }}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <div style={{ fontFamily: jersey, fontSize: 24, color: AMBER, minHeight: 30 }}>
                      {hover ? RATING_LABELS[hover - 1] : ''}
                    </div>
                  </div>
                )}

                {question.kind === 'boss' && (
                  <div className="flex flex-col gap-4 items-start">
                    <select
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      aria-label="Jefe más difícil"
                      style={fieldStyle}
                    >
                      <option value="">Elegí uno…</option>
                      {BOSSES.map((b) => (
                        <option key={b.id} value={b.id}>{b.title} · {b.name}</option>
                      ))}
                      <option value="ninguno">Ninguno, todos me salieron</option>
                    </select>
                    <div className="flex gap-3 flex-wrap">
                      <PixelButton filled disabled={!draft} onClick={() => commit({ hardestBoss: draft })}>Siguiente ▶</PixelButton>
                      <PixelButton onClick={() => commit({ hardestBoss: null })}>Saltar</PixelButton>
                    </div>
                  </div>
                )}

                {question.kind === 'text' && (
                  <div className="flex flex-col gap-4 items-start">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      maxLength={500}
                      rows={4}
                      placeholder={question.placeholder}
                      aria-label={question.text}
                      style={{ ...fieldStyle, resize: 'vertical' }}
                    />
                    <div className="flex gap-3 flex-wrap items-center">
                      <PixelButton filled disabled={!draft.trim()} onClick={() => commit({ [question.id]: draft } as Partial<FeedbackInput>)}>
                        Siguiente ▶
                      </PixelButton>
                      <PixelButton onClick={() => commit({})}>Saltar</PixelButton>
                      <span className="font-mono text-xs" style={{ color: '#666' }}>{draft.length}/500</span>
                    </div>
                  </div>
                )}

                <div className="font-mono text-[11px]" style={{ color: '#555', marginTop: 16, letterSpacing: '0.1em' }}>
                  PREGUNTA {q + 1} DE {QUESTIONS.length} · todas se pueden saltar
                </div>
              </div>
            </>
          )}

          {step === 'saving' && <DialogueBox text="Guardando tus respuestas…" voice="cat" accent={AMBER} />}

          {step === 'thanks' && (
            <>
              <DialogueBox
                key={line}
                text={thanksLines[line]}
                voice="cat"
                accent={AMBER}
                advance={line < thanksLines.length - 1}
                onNext={() => setLine((l) => Math.min(l + 1, thanksLines.length - 1))}
                onTyped={() => { if (line === thanksLines.length - 1) setThanksReady(true) }}
              />

              {line === thanksLines.length - 1 && (
                <div className="w-full" style={{ maxWidth: 680, marginTop: 18 }}>
                  <ul
                    className="grid gap-x-6 gap-y-1"
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', listStyle: 'none', padding: 0, margin: 0, fontFamily: jersey, fontSize: 20, color: '#ddd' }}
                  >
                    {BOSSES.map((b) => (
                      <li key={b.id}><span style={{ color: AMBER }}>✓</span> {b.topic}</li>
                    ))}
                  </ul>

                  <div className="flex gap-4 flex-wrap" style={{ marginTop: 26, visibility: thanksReady ? 'visible' : 'hidden' }}>
                    <PixelButton filled onClick={() => router.push(exitHref)}>
                      {viewer.loggedIn ? 'Volver al mapa' : 'Crear cuenta'}
                    </PixelButton>
                    <PixelButton onClick={() => { setStep('continue'); setIntegrity(1); setMorphT(0) }}>Ver de nuevo</PixelButton>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  )
}
