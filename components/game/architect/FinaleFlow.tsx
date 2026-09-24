'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ArchitectCanvas from './ArchitectCanvas'
import { useTypewriter } from './useTypewriter'
import DeskWindow from './desktop/DeskWindow'
import ContinueWindow from './desktop/ContinueWindow'
import PetCat from './desktop/PetCat'
import { buildTakeoverWindow, ErrorBody, type ErrWin } from './desktop/errors'
import { PixelBitmap, STICKER_BITMAPS, ICON_CHECK } from './desktop/PixelBitmap'
import { useAccentTriplet, keySound } from './desktop/hooks'
import { BOSSES } from '@/lib/game/bosses'
import { sfx, isMuted, setMuted } from '@/lib/game/architect/sound'
import { getViewer, submitFeedback, type FeedbackInput, type Viewer } from '@/lib/game/architect/feedback'
import { W as ART_W, H as ART_H } from '@/lib/game/architect/art'
import { RENDER_MODES, type RenderMode } from '@/lib/game/architect/render'

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

// ── Estilos compartidos (todo por tokens del tema activo) ─────────────────────

const jersey = 'var(--font-jersey), "Courier New", monospace'
const vt = 'var(--font-vt323), monospace'
const monoLabel: React.CSSProperties = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(var(--tx3))' }

function PixelButton({ children, onClick, filled = false, disabled = false }: {
  children: React.ReactNode; onClick: () => void; filled?: boolean; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => { sfx.confirm(); onClick() }}
      disabled={disabled}
      className={filled ? 'cta-btn cta-btn--primary' : 'cta-btn'}
      style={{ fontSize: 13, padding: '9px 18px', opacity: disabled ? 0.45 : 1 }}
    >
      {children}
    </button>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%', background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', border: '2px solid hsl(var(--tx))',
  fontFamily: vt, fontSize: 21, padding: '8px 10px', borderRadius: 0, caretColor: 'hsl(var(--accent))',
}

// El Arquitecto I habla dentro de su ventana (voz de máquina)
function ArchitectLine({ text, onTyped }: { text: string; onTyped?: () => void }) {
  const { shown, done, skip } = useTypewriter(text, 'machine')
  useEffect(() => { if (done) onTyped?.() }, [done, text]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      onClick={() => { if (!done) skip() }}
      style={{ position: 'relative', padding: '12px 14px', fontFamily: jersey, fontSize: 23, lineHeight: 1.22, color: 'hsl(var(--tx))', cursor: done ? 'default' : 'pointer', borderTop: '2px solid hsl(var(--tx))' }}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" style={{ visibility: 'hidden' }}>{text}</span>
      <span aria-hidden="true" style={{ position: 'absolute', top: 12, left: 14, right: 14 }}>
        {shown}
        {!done && <span className="animate-caret" style={{ color: 'hsl(var(--accent))' }}>█</span>}
      </span>
    </div>
  )
}

// ── Flujo ─────────────────────────────────────────────────────────────────────

export default function FinaleFlow() {
  const router = useRouter()
  const accentTriplet = useAccentTriplet('--accent')
  const txTriplet = useAccentTriplet('--tx')
  const bgTriplet = useAccentTriplet('--bg')

  const [step, setStep] = useState<Step>('continue')
  const [viewer, setViewer] = useState<Viewer>({ loggedIn: false })
  const [muted, setMutedState] = useState(false)

  const [morphT, setMorphT] = useState(0)
  const [integrity, setIntegrity] = useState(1)
  const [mode, setMode] = useState<RenderMode>('ascii')

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

  // Restos de la toma de control: ventanas que siguen abiertas al llegar
  const [leftovers, setLeftovers] = useState<ErrWin[]>([])
  const [topId, setTopId] = useState<number | null>(null)

  // Clic en el gato: vuelve a abrirse el Arquitecto original en ASCII / halftone / braille
  const [showCat, setShowCat] = useState(false)
  const [catMode, setCatMode] = useState<RenderMode>('dots')
  const [catPos, setCatPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setMutedState(isMuted())
    getViewer().then(setViewer)
  }, [])

  useEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const small = vw < 720
    const specs: { kind: 'critical' | 'alert' | 'unknown' | 'reboot'; text: string; at: (w: number) => { x: number; y: number } }[] = small
      ? [
          { kind: 'critical', text: 'SISTEMA COMPROMETIDO', at: () => ({ x: 12, y: 44 }) },
          { kind: 'reboot', text: 'REINICIO DENEGADO_', at: (w) => ({ x: Math.max(12, vw - w - 12), y: vh - 190 }) },
        ]
      : [
          { kind: 'critical', text: 'SISTEMA COMPROMETIDO', at: () => ({ x: 24, y: 60 }) },
          { kind: 'alert', text: 'EL ARQUITECTO SIGUE AQUÍ', at: (w) => ({ x: vw - w - 24, y: 84 }) },
          { kind: 'unknown', text: 'ERROR DESCONOCIDO', at: () => ({ x: 32, y: vh - 250 }) },
          { kind: 'reboot', text: 'REINICIO DENEGADO_', at: (w) => ({ x: vw - w - 32, y: vh - 210 }) },
        ]
    setLeftovers(specs.map(sp => {
      const probe = buildTakeoverWindow(sp.kind, sp.text, vw, vh)
      return { ...probe, ...sp.at(probe.w) }
    }))
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
    setLeftovers([])
    sfx.glitch()
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
    timers.push(setTimeout(() => { setMode('dots'); sfx.glitch() }, 1000 + DUR + 350))
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
  const catStage = step === 'intro' || step === 'ask' || step === 'saving' || step === 'thanks'
  const architectWindow = step === 'no' || step === 'morph'
  const restored = catStage
  const bgOpacity = step === 'continue' ? 0.34 : step === 'no' ? 0.22 : 0
  const bgIntegrity = step === 'continue' ? 1 : step === 'no' ? 0.4 : 0

  const petText: string | null =
    step === 'intro' ? INTRO_LINES[line]
    : step === 'ask' ? question.text
    : step === 'saving' ? 'Guardando tus respuestas…'
    : step === 'thanks' ? thanksLines[line]
    : null

  const canvasColor = mode === 'dots' ? `hsl(${txTriplet})` : `hsl(${accentTriplet})`

  return (
    <main
      className="desk"
      style={{
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        background: 'hsl(var(--bg))', color: 'hsl(var(--tx))',
        backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.2) 1px, transparent 1px)', backgroundSize: '14px 14px',
      }}
    >
      {/* El Arquitecto, a pantalla completa detrás de todo */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', top: 28, bottom: 34, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: bgOpacity, transition: 'opacity 0.8s', pointerEvents: 'none', zIndex: 0,
        }}
      >
        <div style={{ width: `min(100vw, calc((100vh - 62px) * ${ART_W / ART_H}))` }}>
          <ArchitectCanvas mode="ascii" integrity={bgIntegrity} color={`hsl(${accentTriplet})`} bg="transparent" glitchy label="" />
        </div>
      </div>

      {/* Menú superior */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 28, zIndex: 900, display: 'flex', alignItems: 'center', gap: 14, padding: '0 10px',
          background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))', whiteSpace: 'nowrap', overflow: 'hidden',
        }}
      >
        <span style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.08em' }}>PYCRAFT OS</span>
        <span style={{ flex: 1 }} />
        <span style={{ ...monoLabel, color: restored ? 'hsl(var(--accent))' : 'hsl(var(--danger))' }}>
          Sistema: {restored ? 'restaurado' : 'comprometido'}
        </span>
      </div>

      {/* Contenido */}
      <div
        style={{
          position: 'relative', zIndex: 30, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: step === 'continue' || architectWindow ? 'center' : 'flex-start',
          padding: `48px 14px ${catStage ? 230 : 60}px`, gap: 16,
        }}
      >
        {step === 'continue' && (
          <div style={{ width: 'min(100%, 480px)' }}>
            <DeskWindow title="CONTINUE.EXE" x={0} y={0} w={480} z={1} active flow onFocus={() => {}}>
              <ContinueWindow onYes={onYes} onNo={onNo} />
            </DeskWindow>
          </div>
        )}

        {architectWindow && (
          <div style={{ width: 'min(100%, 400px)' }}>
            <DeskWindow title="ARQUITECTO.EXE" x={0} y={0} w={400} z={1} active flow tone="danger" onFocus={() => {}}>
              <ArchitectCanvasBox mode={mode} morphT={morphT} integrity={integrity} color={canvasColor} bg={`hsl(${bgTriplet})`} glitchy />
              {step === 'no' && <ArchitectLine key={noLine} text={NO_LINES[noLine]} onTyped={() => setNoReady(true)} />}
              {step === 'no' && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', padding: '4px 14px 16px', visibility: noReady ? 'visible' : 'hidden' }}>
                  <PixelButton onClick={leave}>Irme</PixelButton>
                  <PixelButton filled onClick={onYes}>Bueno… YES</PixelButton>
                </div>
              )}
              {step === 'morph' && (
                <div className="animate-caret-line" style={{ ...monoLabel, textAlign: 'center', padding: '10px 0 14px', letterSpacing: '0.2em' }}>Reescribiendo…</div>
              )}
            </DeskWindow>
          </div>
        )}

        {step === 'ask' && (
          <div style={{ width: 'min(100%, 680px)', visibility: qReady ? 'visible' : 'hidden' }}>
            <DeskWindow title="ENCUESTA.EXE" x={0} y={0} w={680} z={1} active flow tone="safe" onFocus={() => {}}>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {question.kind === 'rating' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6 }} onMouseLeave={() => setHover(0)}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          aria-label={`${n} de 5: ${RATING_LABELS[n - 1]}`}
                          onMouseEnter={() => { setHover(n); sfx.select() }}
                          onFocus={() => setHover(n)}
                          onClick={() => { sfx.confirm(); commit({ rating: n }) }}
                          style={{ background: 'none', border: 0, cursor: 'pointer', padding: 6 }}
                        >
                          <PixelBitmap rows={STICKER_BITMAPS.estrella} scale={7} ink={n <= hover ? 'hsl(var(--accent))' : 'hsl(var(--border2))'} />
                        </button>
                      ))}
                    </div>
                    <div style={{ fontFamily: jersey, fontSize: 24, color: 'hsl(var(--accent))', minHeight: 30 }}>
                      {hover ? RATING_LABELS[hover - 1] : ''}
                    </div>
                  </div>
                )}

                {question.kind === 'boss' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
                    <select
                      value={draft}
                      onChange={(e) => { setDraft(e.target.value); sfx.select() }}
                      aria-label="Jefe más difícil"
                      style={fieldStyle}
                    >
                      <option value="">Elegí uno…</option>
                      {BOSSES.map((b) => (
                        <option key={b.id} value={b.id}>{b.title} · {b.name}</option>
                      ))}
                      <option value="ninguno">Ninguno, todos me salieron</option>
                    </select>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <PixelButton filled disabled={!draft} onClick={() => commit({ hardestBoss: draft })}>Siguiente</PixelButton>
                      <PixelButton onClick={() => commit({ hardestBoss: null })}>Saltar</PixelButton>
                    </div>
                  </div>
                )}

                {question.kind === 'text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={keySound}
                      maxLength={500}
                      rows={4}
                      placeholder={question.placeholder}
                      aria-label={question.text}
                      style={{ ...fieldStyle, resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <PixelButton filled disabled={!draft.trim()} onClick={() => commit({ [question.id]: draft } as Partial<FeedbackInput>)}>
                        Siguiente
                      </PixelButton>
                      <PixelButton onClick={() => commit({})}>Saltar</PixelButton>
                      <span style={monoLabel}>{draft.length}/500</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 3 }} aria-hidden="true">
                    {QUESTIONS.map((_, i) => (
                      <span key={i} style={{ width: 20, height: 10, border: '2px solid hsl(var(--border2))', background: i <= q ? 'hsl(var(--accent))' : 'transparent', borderColor: i <= q ? 'hsl(var(--accent))' : undefined }} />
                    ))}
                  </div>
                  <span style={monoLabel}>Pregunta {q + 1} de {QUESTIONS.length} · todas se pueden saltar</span>
                </div>
              </div>
            </DeskWindow>
          </div>
        )}

        {step === 'thanks' && line === thanksLines.length - 1 && (
          <div style={{ width: 'min(100%, 680px)' }}>
            <DeskWindow title="APRENDISTE.LOG" x={0} y={0} w={680} z={1} active flow tone="safe" onFocus={() => {}}>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '4px 24px', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', fontFamily: vt, fontSize: 21, color: 'hsl(var(--tx))' }}>
                  {BOSSES.map((b) => (
                    <li key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PixelBitmap rows={ICON_CHECK} scale={3} ink="hsl(var(--accent))" />
                      {b.topic}
                    </li>
                  ))}
                </ul>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', visibility: thanksReady ? 'visible' : 'hidden' }}>
                  <PixelButton filled onClick={() => router.push(exitHref)}>
                    {viewer.loggedIn ? 'Volver al mapa' : 'Crear cuenta'}
                  </PixelButton>
                  <PixelButton onClick={() => { setStep('continue'); setIntegrity(1); setMorphT(0); setMode('ascii') }}>Ver de nuevo</PixelButton>
                </div>
              </div>
            </DeskWindow>
          </div>
        )}
      </div>

      {/* Restos de la toma de control */}
      {step === 'continue' && leftovers.map((w) => (
        <DeskWindow
          key={w.id}
          title={w.title}
          x={w.x} y={w.y} w={w.w}
          z={20 + (topId === w.id ? 5 : 0)}
          active={topId === w.id}
          tone="danger"
          onFocus={() => setTopId(w.id)}
          onMove={(x, y) => setLeftovers(ls => ls.map(l => (l.id === w.id ? { ...l, x, y } : l)))}
          onClose={() => { setLeftovers(ls => ls.filter(l => l.id !== w.id)); sfx.select() }}
        >
          <ErrorBody
            win={w}
            onClose={() => setLeftovers(ls => ls.filter(l => l.id !== w.id))}
            onCloseAll={() => setLeftovers([])}
          />
        </DeskWindow>
      ))}

      {/* El gato: mascota del escritorio */}
      {catStage && (
        <PetCat
          text={petText}
          advance={step === 'intro' || (step === 'thanks' && line < thanksLines.length - 1)}
          onClick={() => { setShowCat(s => !s); sfx.meow() }}
          onNext={() => {
            if (step === 'intro') {
              if (line < INTRO_LINES.length - 1) setLine(line + 1)
              else { setQ(0); setQReady(false); setStep('ask') }
            } else if (step === 'thanks') {
              setLine((l) => Math.min(l + 1, thanksLines.length - 1))
            }
          }}
          onTyped={() => {
            if (step === 'ask') setQReady(true)
            if (step === 'thanks' && line === thanksLines.length - 1) setThanksReady(true)
          }}
        />
      )}

      {/* El Arquitecto original, a pedido: clic en el gato */}
      {catStage && showCat && (
        <DeskWindow
          title="ARQUITECTO.EXE"
          x={catPos?.x ?? Math.max(12, Math.round((typeof window === 'undefined' ? 800 : window.innerWidth) / 2 - 170))}
          y={catPos?.y ?? 48}
          w={340}
          z={650}
          active
          fixed
          onFocus={() => {}}
          onMove={(x, y) => setCatPos({ x, y })}
          onClose={() => setShowCat(false)}
        >
          <ArchitectCanvasBox
            mode={catMode}
            morphT={1}
            integrity={1}
            color={catMode === 'dots' ? `hsl(${txTriplet})` : `hsl(${accentTriplet})`}
            bg={`hsl(${bgTriplet})`}
            glitchy={false}
          />
          <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: '2px solid hsl(var(--tx))', justifyContent: 'center', flexWrap: 'wrap' }}>
            {RENDER_MODES.map(m => (
              <button
                key={m.id}
                type="button"
                aria-pressed={catMode === m.id}
                onClick={() => { setCatMode(m.id); sfx.select() }}
                style={{
                  fontFamily: jersey, fontSize: 16, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 12px', cursor: 'pointer',
                  background: catMode === m.id ? 'hsl(var(--tx))' : 'transparent',
                  color: catMode === m.id ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
                  border: '2px solid hsl(var(--tx))',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </DeskWindow>
      )}

      {/* Barra de tareas */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 34, zIndex: 900, display: 'flex', alignItems: 'center', gap: 12, padding: '0 10px',
          background: 'hsl(var(--surface))', borderTop: '2px solid hsl(var(--tx))',
        }}
      >
        <span style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx2))' }}>
          {step === 'continue' ? 'El Arquitecto controla el sistema' : step === 'morph' ? 'Reescribiendo al Arquitecto…' : step === 'no' ? 'El Arquitecto se desvanece' : 'Sistema restaurado'}
        </span>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={toggleMute} aria-pressed={!muted} style={{ ...monoLabel, cursor: 'pointer', background: 'none', border: 'none', color: 'hsl(var(--tx2))' }}>
          Sonido {muted ? 'off' : 'on'}
        </button>
      </div>
    </main>
  )
}

function ArchitectCanvasBox(props: { mode: RenderMode; morphT: number; integrity: number; color: string; bg: string; glitchy: boolean }) {
  return (
    <ArchitectCanvas
      mode={props.mode}
      morphT={props.morphT}
      integrity={props.integrity}
      color={props.color}
      bg={props.bg}
      glitchy={props.glitchy}
      label="El Arquitecto"
    />
  )
}
