'use client'

import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react'
import Win from '@/components/ui/Win'
import ZoomControl from '@/components/game/ZoomControl'
import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import { sfx } from '@/lib/game/architect/sound'
import { BOSSES, getBossById } from '@/lib/game/bosses'
import { getPlanClase, PLAN_CLASES, PLAN_DURACION, PLAN_INTENSIVO, type PlanClase, type PlanEjercicio, type PlanIntensivo, type PlanLang, type PlanTema } from '@/lib/game/planificacion'
import { getTextZoom, setTextZoom, TEXT_ZOOM_DEFAULT } from '@/lib/storage/local-store'

// El libro de Planificación del docente: página 0 es el índice, después una
// página por clase. Mismo lenguaje que la Escuelita de Rodolfo — franja de
// arriba con dónde estás, renglones de cuaderno a la izquierda, el trabajo a
// la derecha — pero sin Rodolfo: lo lee el docente.
//
// Dos ritmos: "2 clases por jefe" (28 clases, Junior y Trainee) e
// "1 jefe por clase" (14 clases, solo Junior: 4 ejercicios y a pelear). El
// ritmo elegido se recuerda en este navegador y viaja en la URL.

export interface AtaqueInfo { title: string; tier: 'junior' | 'trainee' | 'senior' }

export type Ritmo = 'normal' | 'intensivo'

interface Props {
  initialPage: number
  /** Ritmo pedido por la URL; sin él, el último que usó el docente. */
  initialRitmo?: Ritmo
  ataques: Record<string, AtaqueInfo>
}

const RITMO_KEY = 'pysql:plan-ritmo'
const lastPage = (r: Ritmo) => (r === 'intensivo' ? PLAN_INTENSIVO.length : PLAN_CLASES.length)

const ACTOS = [
  { roman: 'Acto I', title: 'Python', type: 'python' },
  { roman: 'Acto II', title: 'SQLite', type: 'sql' },
  { roman: 'Acto III', title: 'Integración', type: 'mixed' },
  { roman: 'Acto IV', title: 'El Arquitecto', type: 'final' },
] as const

/** Las dos clases de cada jefe, en orden. */
const SEMANAS = BOSSES.map((boss) => ({ boss, clases: PLAN_CLASES.filter((c) => c.bossId === boss.id) }))

function setUrl(ritmo: Ritmo, page: number) {
  const url = new URL(window.location.href)
  url.searchParams.delete('clase')
  url.searchParams.delete('jefe')
  if (ritmo === 'intensivo') url.searchParams.set('ritmo', 'intensivo')
  else url.searchParams.delete('ritmo')
  if (page > 0) url.searchParams.set(ritmo === 'intensivo' ? 'jefe' : 'clase', String(page))
  window.history.replaceState(null, '', url)
}

/** La misma parte del libro en el otro ritmo: clase → su jefe, jefe → su primera clase. */
function equivalentPage(from: Ritmo, page: number): number {
  if (page === 0) return 0
  if (from === 'normal') return getBossById(PLAN_CLASES[page - 1].bossId)?.classNumber ?? 0
  return PLAN_CLASES.find((c) => c.bossId === PLAN_INTENSIVO[page - 1].bossId)?.numero ?? 0
}

export default function PlanBook({ initialPage, initialRitmo, ataques }: Props) {
  const [ritmo, setRitmo] = useState<Ritmo>(initialRitmo ?? 'normal')
  const [page, setPage] = useState(initialPage)
  const [zoom, setZoom] = useState(TEXT_ZOOM_DEFAULT)
  const last = lastPage(ritmo)

  useEffect(() => {
    setZoom(getTextZoom())
    // Sin ritmo en la URL, vuelve el que el docente dejó elegido.
    if (initialRitmo) return
    let saved: string | null = null
    try { saved = localStorage.getItem(RITMO_KEY) } catch { /* sin almacenamiento */ }
    if (saved === 'intensivo' && initialPage === 0) {
      setRitmo('intensivo')
      setUrl('intensivo', 0)
    }
  }, [initialRitmo, initialPage])

  const go = useCallback((next: number) => {
    const p = Math.min(last, Math.max(0, next))
    if (p === page) return
    sfx.pageFlip()
    setPage(p)
    setUrl(ritmo, p)
    window.scrollTo({ top: 0 })
  }, [page, last, ritmo])

  const changeRitmo = (next: Ritmo) => {
    if (next === ritmo) return
    sfx.click()
    const p = equivalentPage(ritmo, page)
    setRitmo(next)
    setPage(p)
    setUrl(next, p)
    try { localStorage.setItem(RITMO_KEY, next) } catch { /* sin almacenamiento */ }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') go(page + 1)
      else if (e.key === 'ArrowLeft') go(page - 1)
      else if (e.key === 'Home') go(0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, page])

  const handleZoom = (z: number) => { setZoom(z); setTextZoom(z) }

  let content: ReactNode
  if (ritmo === 'intensivo') {
    const plan = page > 0 ? PLAN_INTENSIVO[page - 1] : null
    content = plan ? <JefePage plan={plan} n={page} ataques={ataques} go={go} /> : <IndiceIntensivo go={go} />
  } else {
    const clase = page > 0 ? PLAN_CLASES[page - 1] : null
    content = clase ? <ClasePage clase={clase} ataques={ataques} go={go} /> : <Indice go={go} />
  }

  return (
    <Win
      title="PLANIFICACION.EXE"
      active
      right={
        <span className="plan-bar">
          <RitmoSwitch ritmo={ritmo} onChange={changeRitmo} />
          <span className="plan-zoom"><ZoomControl zoom={zoom} onChange={handleZoom} /></span>
        </span>
      }
      bodyStyle={{ padding: 0 }}
    >
      <div key={ritmo} style={{ zoom }}>{content}</div>
    </Win>
  )
}

/** Selector de ritmo: siempre a mano en la barra de la ventana. */
function RitmoSwitch({ ritmo, onChange }: { ritmo: Ritmo; onChange: (r: Ritmo) => void }) {
  return (
    <span className="plan-ritmo" role="group" aria-label="Ritmo del taller">
      <button type="button" aria-pressed={ritmo === 'normal'} aria-label="2 clases por jefe" onClick={() => onChange('normal')}>
        <span className="plan-ritmo-long">2 clases por jefe</span><span className="plan-ritmo-short" aria-hidden>2 por jefe</span>
      </button>
      <button type="button" aria-pressed={ritmo === 'intensivo'} aria-label="1 jefe por clase" onClick={() => onChange('intensivo')}>
        <span className="plan-ritmo-long">1 jefe por clase</span><span className="plan-ritmo-short" aria-hidden>1 por clase</span>
      </button>
    </span>
  )
}

// ─── Índice ──────────────────────────────────────────────────────────────────

function Indice({ go }: { go: (p: number) => void }) {
  return (
    <>
      <div className="plan-top">
        <div className="plan-where">
          <h1 className="plan-where-title">Planificación</h1>
          <span className="plan-where-meta">14 semanas · 28 clases · Junior y Trainee</span>
        </div>
        <div className="plan-legend">
          <span><b>Día 1</b> {PLAN_DURACION[1]} de práctica</span>
          <span><b>Día 2</b> {PLAN_DURACION[2]} de práctica y después el jefe</span>
        </div>
      </div>

      <div className="plan-index repaso-wipe">
        {ACTOS.map((acto) => (
          <section key={acto.type} aria-label={`${acto.roman} · ${acto.title}`}>
            <h2 className="plan-index-act"><span>{acto.roman}</span> {acto.title}</h2>
            <ol className="plan-index-rows">
              {SEMANAS.filter((s) => s.boss.type === acto.type).map(({ boss, clases }) => (
                <li key={boss.id} className="plan-index-row">
                  <div className="plan-index-week">Semana {clases[0]?.semana}</div>
                  <div className="plan-index-boss">
                    <span className="plan-icon"><BossTopicIcon bossId={boss.id} size={14} color="hsl(var(--tx))" /></span>
                    <span>
                      <span className="plan-index-boss-name">{boss.name}</span>
                      <span className="plan-index-boss-topic">{boss.topic}</span>
                    </span>
                  </div>
                  {clases.map((c) => (
                    <button key={c.numero} type="button" className="plan-index-day" onClick={() => go(c.numero)} onMouseEnter={() => sfx.hover()}>
                      <span className="plan-index-day-head">
                        <span>Día {c.dia} · {PLAN_DURACION[c.dia]}</span>
                        <span className="tabular">pág. {c.numero}</span>
                      </span>
                      <span className="plan-index-day-temas">
                        {c.temas.map((t) => <span key={t.titulo}>{t.titulo}</span>)}
                        {c.dia === 2 && <span className="plan-index-day-fight">→ jefe</span>}
                      </span>
                    </button>
                  ))}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  )
}

// ─── Página de una clase ─────────────────────────────────────────────────────

function ClasePage({ clase, ataques, go }: { clase: PlanClase; ataques: Record<string, AtaqueInfo>; go: (p: number) => void }) {
  const boss = getBossById(clase.bossId)!
  const n = clase.numero

  return (
    <>
      <div className="plan-top">
        <div className="plan-where">
          <h1 className="plan-where-title">Clase {n}</h1>
          <span className="plan-where-meta">
            Semana {clase.semana} · Día {clase.dia} · {PLAN_DURACION[clase.dia]} {clase.dia === 1 ? 'de práctica' : 'de práctica y después el jefe'}
          </span>
        </div>
        <div className="plan-boss">
          <span>Aplica a</span>
          <span className="plan-icon"><BossTopicIcon bossId={boss.id} size={14} color="hsl(var(--tx))" /></span>
          <strong>{boss.name}</strong>
          <span>· Jefe {boss.classNumber}</span>
        </div>
      </div>

      <div className="plan-body">
        <Rail current={n} go={go} />

        <div key={n} className="plan-page repaso-wipe">
          {clase.temas.map((tema) => <TemaBlock key={tema.titulo} tema={tema} lang={clase.lang} ataques={ataques} />)}

          {clase.extra && (
            <Exercise
              ej={clase.extra}
              lang={clase.lang}
              kind="desafio"
              className="plan-note"
              head={<><span className="plan-note-label">Extra</span><span className="plan-v-sub">para el que termina antes</span></>}
            />
          )}

          {clase.dia === 2 && (
            <div className="plan-fight">
              <span className="plan-icon plan-icon--inv"><BossTopicIcon bossId={boss.id} size={14} color="hsl(var(--tx))" /></span>
              Después, a pelear contra {boss.name}
            </div>
          )}

          <nav className="plan-nav" aria-label="Páginas">
            <button type="button" className="repaso-ghost-btn" onClick={() => go(n - 1)}>
              ‹ {n === 1 ? 'Índice' : `Clase ${n - 1}`}
            </button>
            <button type="button" className="plan-tool plan-nav-index" onClick={() => go(0)}>Índice · {n} / {PLAN_CLASES.length}</button>
            <button type="button" className="repaso-ghost-btn" onClick={() => go(n + 1)} disabled={n === PLAN_CLASES.length} style={{ opacity: n === PLAN_CLASES.length ? 0.35 : 1 }}>
              Clase {Math.min(PLAN_CLASES.length, n + 1)} ›
            </button>
          </nav>
        </div>
      </div>
    </>
  )
}

/** Índice compacto: una fila por semana, un casillero por día. */
function Rail({ current, go }: { current: number; go: (p: number) => void }) {
  return (
    <nav className="plan-rail" aria-label="Índice">
      <div className="plan-rail-inner">
        <button type="button" className="plan-tool plan-rail-home" onClick={() => go(0)}>‹ Índice</button>
        {ACTOS.map((acto) => (
          <div key={acto.type} className="plan-rail-act">
            <span className="plan-rail-act-name">{acto.roman}</span>
            {SEMANAS.filter((s) => s.boss.type === acto.type).map(({ boss, clases }) => (
              <div key={boss.id} className="plan-rail-week">
                <span className="plan-rail-name" title={boss.name}>{boss.name}</span>
                <span className="plan-rail-days">
                  {clases.map((c) => (
                    <button
                      key={c.numero}
                      type="button"
                      className="plan-day"
                      aria-current={c.numero === current ? 'page' : undefined}
                      aria-label={`Clase ${c.numero}: ${boss.name}, día ${c.dia}`}
                      title={`Clase ${c.numero} · Día ${c.dia}`}
                      onClick={() => go(c.numero)}
                    >
                      {c.dia}
                    </button>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </nav>
  )
}

// ─── Ritmo intensivo: un jefe por clase ──────────────────────────────────────

/** Un paso del recorrido de la clase intensiva, en orden. */
type Paso =
  | { kind: 'mostrar'; ej: PlanEjercicio }
  | { kind: 'ejercicio'; ej: PlanEjercicio; n: number; refuerzo: boolean }

function pasosDe(plan: PlanIntensivo) {
  const bloques: { tema: PlanTema; pasos: Paso[] }[] = []
  let n = 0
  for (const ref of plan.temas) {
    const tema = getPlanClase(ref.clase)!.temas[ref.tema]
    const pasos: Paso[] = [
      { kind: 'mostrar', ej: tema.ejemplo },
      { kind: 'ejercicio', ej: tema.guiado, n: ++n, refuerzo: false },
    ]
    if (ref.refuerzo) pasos.push({ kind: 'ejercicio', ej: ref.refuerzo, n: ++n, refuerzo: true })
    bloques.push({ tema, pasos })
  }
  return { bloques, total: n }
}

const langDe = (bossId: string): PlanLang => PLAN_CLASES.find((c) => c.bossId === bossId)?.lang ?? 'python'

/** Los jefes del ritmo intensivo de un acto, con su número de página. */
const jefesDelActo = (type: string) =>
  PLAN_INTENSIVO.map((plan, i) => ({ plan, n: i + 1, boss: getBossById(plan.bossId)! })).filter(({ boss }) => boss.type === type)

function IndiceIntensivo({ go }: { go: (p: number) => void }) {
  return (
    <>
      <div className="plan-top">
        <div className="plan-where">
          <h1 className="plan-where-title">Planificación</h1>
          <span className="plan-where-meta">1 jefe por clase · 14 clases · solo Junior</span>
        </div>
        <div className="plan-legend">
          <span><b>Cada clase</b> mostrás el ejemplo, el aula hace 4 ejercicios y después pelea</span>
        </div>
      </div>

      <div className="plan-index repaso-wipe">
        {ACTOS.map((acto) => (
          <section key={acto.type} aria-label={`${acto.roman} · ${acto.title}`}>
            <h2 className="plan-index-act"><span>{acto.roman}</span> {acto.title}</h2>
            <ol className="plan-index-rows">
              {jefesDelActo(acto.type).map(({ plan, n, boss }) => (
                <li key={plan.bossId}>
                  <button type="button" className="plan-index-jefe" onClick={() => go(n)} onMouseEnter={() => sfx.hover()}>
                    <span className="plan-index-week">Jefe {n}</span>
                    <span className="plan-index-boss">
                      <span className="plan-icon"><BossTopicIcon bossId={boss.id} size={14} color="hsl(var(--tx))" /></span>
                      <span>
                        <span className="plan-index-boss-name">{boss.name}</span>
                        <span className="plan-index-boss-topic">{boss.topic}</span>
                      </span>
                    </span>
                    <span className="plan-index-day-temas">
                      {plan.temas.map((r) => <span key={`${r.clase}-${r.tema}`}>{getPlanClase(r.clase)!.temas[r.tema].titulo}</span>)}
                    </span>
                    <span className="plan-index-count">
                      <span>{pasosDe(plan).total} ejercicios</span>
                      <span className="plan-index-day-fight">→ jefe</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  )
}

function JefePage({ plan, n, ataques, go }: { plan: PlanIntensivo; n: number; ataques: Record<string, AtaqueInfo>; go: (p: number) => void }) {
  const boss = getBossById(plan.bossId)!
  const lang = langDe(plan.bossId)
  const { bloques, total } = pasosDe(plan)
  const last = PLAN_INTENSIVO.length
  const prev = n > 1 ? getBossById(PLAN_INTENSIVO[n - 2].bossId) : undefined
  const next = n < last ? getBossById(PLAN_INTENSIVO[n].bossId) : undefined
  const pasos = bloques.flatMap((b) => b.pasos)

  const jump = (id: string) => {
    sfx.click()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  let i = 0
  return (
    <>
      <div className="plan-top">
        <div className="plan-where">
          <h1 className="plan-where-title">Jefe {n} · {boss.name}</h1>
          <span className="plan-where-meta">1 clase · {total} ejercicios en Junior y después el jefe</span>
        </div>
        <div className="plan-boss">
          <span className="plan-icon"><BossTopicIcon bossId={boss.id} size={14} color="hsl(var(--tx))" /></span>
          <span>{boss.topic}</span>
        </div>
      </div>

      <div className="plan-body">
        <RailIntensivo current={n} go={go} />

        <div key={n} className="plan-page repaso-wipe">
          <ol className="plan-track" aria-label="Recorrido de la clase">
            {pasos.map((p, k) => (
              <li key={k}>
                <button type="button" className={`plan-track-step plan-track-step--${p.kind}`} onClick={() => jump(`paso-${k}`)}>
                  {p.kind === 'mostrar' ? 'Mostrá' : `Ejercicio ${p.n}`}
                </button>
              </li>
            ))}
            <li><button type="button" className="plan-track-step plan-track-step--jefe" onClick={() => jump('paso-jefe')}>Jefe</button></li>
          </ol>

          {bloques.map(({ tema, pasos: delTema }) => {
            const junior = tema.ataques.filter((id) => ataques[id]?.tier === 'junior')
            const tabla = tema.ejemplo.tabla
            return (
              <section key={tema.titulo} className="plan-tema" aria-label={tema.titulo}>
                <header className="plan-tema-head">
                  <h2>{tema.titulo}</h2>
                  <p className="plan-prepara">
                    Prepara {junior.map((id, k) => (
                      <Fragment key={id}>{k > 0 && ' · '}<span className="plan-ataque">{ataques[id]?.title ?? id}</span></Fragment>
                    ))}
                  </p>
                </header>
                {tabla && <SeedTable sql={tabla} />}
                <div className="plan-versions">
                  {delTema.map((p) => {
                    const id = `paso-${i++}`
                    return p.kind === 'mostrar' ? (
                      <Exercise
                        key={id} id={id} ej={p.ej} lang={lang} kind="ejemplo"
                        className="plan-v plan-v--1"
                        head={<><span className="plan-v-label">Mostrá</span><span className="plan-v-sub">el docente en el proyector</span></>}
                      />
                    ) : (
                      <Exercise
                        key={id} id={id} ej={p.ej} lang={lang} kind="guiado"
                        className="plan-v plan-v--2"
                        seed={p.ej.tabla !== tabla ? p.ej.tabla : undefined}
                        head={<><span className="plan-v-num" aria-hidden>{p.n}</span><span className="plan-v-label">Ejercicio {p.n}</span><span className="plan-v-sub">{p.refuerzo ? 'otra vez, con otros datos' : 'con huecos, como en el jefe'}</span></>}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })}

          <div id="paso-jefe" className="plan-fight">
            <span className="plan-icon plan-icon--inv"><BossTopicIcon bossId={boss.id} size={14} color="hsl(var(--tx))" /></span>
            Ahora, a pelear contra {boss.name} en Junior
          </div>

          <nav className="plan-nav" aria-label="Páginas">
            <button type="button" className="repaso-ghost-btn" onClick={() => go(n - 1)}>
              ‹ {prev ? prev.name : 'Índice'}
            </button>
            <button type="button" className="plan-tool plan-nav-index" onClick={() => go(0)}>Índice · {n} / {last}</button>
            <button type="button" className="repaso-ghost-btn" onClick={() => go(n + 1)} disabled={!next} style={{ opacity: next ? 1 : 0.35 }}>
              {next ? next.name : 'Fin'} ›
            </button>
          </nav>
        </div>
      </div>
    </>
  )
}

/** Índice compacto del ritmo intensivo: un casillero por jefe. */
function RailIntensivo({ current, go }: { current: number; go: (p: number) => void }) {
  return (
    <nav className="plan-rail" aria-label="Índice">
      <div className="plan-rail-inner">
        <button type="button" className="plan-tool plan-rail-home" onClick={() => go(0)}>‹ Índice</button>
        {ACTOS.map((acto) => (
          <div key={acto.type} className="plan-rail-act">
            <span className="plan-rail-act-name">{acto.roman}</span>
            {jefesDelActo(acto.type).map(({ n, boss }) => (
              <div key={boss.id} className="plan-rail-week">
                <span className="plan-rail-name" title={boss.name}>{boss.name}</span>
                <span className="plan-rail-days">
                  <button
                    type="button"
                    className="plan-day"
                    aria-current={n === current ? 'page' : undefined}
                    aria-label={`Jefe ${n}: ${boss.name}`}
                    onClick={() => go(n)}
                  >
                    {n}
                  </button>
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </nav>
  )
}

// ─── Un tema: 1 Ejemplo · 2 Guiado · 3 Desafío ───────────────────────────────

const VERSIONES = [
  { key: 'ejemplo', n: 1, label: 'Ejemplo', sub: 'lo muestra el docente' },
  { key: 'guiado', n: 2, label: 'Guiado', sub: 'con huecos, como Junior' },
  { key: 'desafio', n: 3, label: 'Desafío', sub: 'sin guía, como Trainee' },
] as const

function TemaBlock({ tema, lang, ataques }: { tema: PlanTema; lang: PlanLang; ataques: Record<string, AtaqueInfo> }) {
  const tabla = tema.ejemplo.tabla
  return (
    <section className="plan-tema" aria-label={tema.titulo}>
      <header className="plan-tema-head">
        <h2>{tema.titulo}</h2>
        <p className="plan-prepara">
          Prepara {tema.ataques.map((id, i) => (
            <Fragment key={id}>{i > 0 && ' · '}<span className="plan-ataque">{ataques[id]?.title ?? id}</span><span className="plan-tier">{ataques[id]?.tier === 'trainee' ? 'T' : 'J'}</span></Fragment>
          ))}
        </p>
      </header>

      {tabla && <SeedTable sql={tabla} />}

      <div className="plan-versions">
        {VERSIONES.map((v) => (
          <Exercise
            key={v.key}
            ej={tema[v.key]}
            lang={lang}
            kind={v.key}
            className={`plan-v plan-v--${v.n}`}
            seed={tema[v.key].tabla !== tabla ? tema[v.key].tabla : undefined}
            head={<><span className="plan-v-num" aria-hidden>{v.n}</span><span className="plan-v-label">{v.label}</span><span className="plan-v-sub">{v.sub}</span></>}
          />
        ))}
      </div>

      <Exercise ej={tema.gracioso} lang={lang} kind="ejemplo" className="plan-note" head={<span className="plan-note-label">Variante graciosa</span>} />

      {tema.arena && (
        <p className="plan-arena">
          <span className="label-mono">En la arena</span>
          {tema.arena.map((a) => <span key={a} className="plan-chip">{a}</span>)}
        </p>
      )}
    </section>
  )
}

/** Un ejercicio: cabecera con sus herramientas (solución, copiar) y el cuerpo. */
function Exercise({ id, ej, lang, kind, className, head, seed }: {
  /** Ancla para saltar desde el recorrido. */
  id?: string
  ej: PlanEjercicio
  lang: PlanLang
  kind: 'ejemplo' | 'guiado' | 'desafio'
  className: string
  head: ReactNode
  /** Tabla propia de este ejercicio, si no es la del tema. */
  seed?: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const hasSolution = !!(ej.respuestas?.length || ej.solucion)
  const code = open && kind === 'desafio' && ej.solucion ? ej.solucion : ej.codigo

  const copy = async () => {
    const text = lang === 'sql' && ej.tabla ? `${ej.tabla}

${ej.codigo}` : ej.codigo
    try {
      await navigator.clipboard.writeText(text)
      sfx.click()
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch { /* sin permiso de portapapeles: no pasa nada */ }
  }

  return (
    <article id={id} className={className}>
      <div className="plan-v-head">
        {head}
        <span style={{ flex: 1 }} />
        <span className="plan-tools">
          {hasSolution && (
            <button type="button" className="plan-tool" aria-pressed={open} onClick={() => { sfx.click(); setOpen((o) => !o) }}>
              {open ? 'Ocultar solución' : 'Ver solución'}
            </button>
          )}
          <button type="button" className="plan-tool" onClick={copy} title={lang === 'sql' && ej.tabla ? 'Copia la tabla y el código' : 'Copia el código'}>
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </span>
      </div>
      <div className="plan-v-body">
        {seed && <SeedTable sql={seed} />}
        <p className="plan-pide"><Rich text={ej.pide} /></p>
        <CodeBlock code={code} answers={open && kind === 'guiado' ? ej.respuestas : undefined} />
        <div className="plan-sale">
          <span className="label-mono plan-sale-label">Sale</span>
          <Output text={ej.sale} lang={lang} />
        </div>
      </div>
    </article>
  )
}

function CodeBlock({ code, answers }: { code: string; answers?: string[] }) {
  let blank = 0
  const lines = code.split('\n')
  return (
    <pre className="plan-code" aria-label="Código">
      {lines.map((line, i) => (
        <span key={i} className="plan-line">
          <span className="plan-ln" aria-hidden>{i + 1}</span>
          <span className="plan-lc">
            {line.split('___').map((part, j) => {
              if (j === 0) return <Fragment key={j}>{part || (line ? '' : ' ')}</Fragment>
              const a = answers?.[blank++]
              return (
                <Fragment key={j}>
                  {a ? <span className="plan-blank plan-blank--ok">{a}</span> : <span className="plan-blank" aria-label="hueco" />}
                  {part}
                </Fragment>
              )
            })}
          </span>
        </span>
      ))}
    </pre>
  )
}

function Output({ text, lang }: { text: string; lang: PlanLang }) {
  if (lang === 'sql') {
    const rows = text.split('\n').map((r) => r.split('|'))
    return (
      <div className="plan-out">
        <table className="plan-out-table"><tbody>
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}
        </tbody></table>
      </div>
    )
  }
  return <div className="plan-out plan-out--py">{text}</div>
}

/** La tabla con la que arranca un ejercicio SQL, leída del CREATE + INSERT. */
function SeedTable({ sql }: { sql: string }) {
  const create = sql.match(/CREATE TABLE (\w+)\s*\(([^;]*)\);/i)
  if (!create) return null
  const name = create[1]
  const columns = create[2].split(',').map((c) => c.trim().split(/\s+/)[0])
  const rows = [...sql.matchAll(/VALUES\s*\((.*)\);/gi)].map((m) =>
    (m[1].match(/'[^']*'|[^,]+/g) ?? []).map((v) => v.trim().replace(/^'|'$/g, '')),
  )
  return (
    <figure className="plan-seed">
      <figcaption className="label-mono">Tabla {name}{rows.length === 0 ? ' · vacía' : ''}</figcaption>
      <table className="plan-seed-table">
        <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
      </table>
    </figure>
  )
}

/** `código` → chip; **algo** → énfasis. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, i) =>
        i % 2 ? <code key={i} className="plan-inline">{part}</code> : (
          <Fragment key={i}>{part.split('**').map((p, k) => (k % 2 ? <strong key={k}>{p}</strong> : <Fragment key={k}>{p}</Fragment>))}</Fragment>
        ),
      )}
    </>
  )
}
