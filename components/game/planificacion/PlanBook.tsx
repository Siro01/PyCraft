'use client'

import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react'
import Win from '@/components/ui/Win'
import ZoomControl from '@/components/game/ZoomControl'
import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import { sfx } from '@/lib/game/architect/sound'
import { BOSSES, getBossById } from '@/lib/game/bosses'
import { PLAN_CLASES, PLAN_DURACION, type PlanClase, type PlanEjercicio, type PlanLang, type PlanTema } from '@/lib/game/planificacion'
import { getTextZoom, setTextZoom, TEXT_ZOOM_DEFAULT } from '@/lib/storage/local-store'

// El libro de Planificación del docente: página 0 es el índice, después una
// página por clase (1–28). Mismo lenguaje que la Escuelita de Rodolfo —
// franja de arriba con dónde estás, renglones de cuaderno a la izquierda,
// el trabajo a la derecha — pero sin Rodolfo: lo lee el docente.

export interface AtaqueInfo { title: string; tier: 'junior' | 'trainee' | 'senior' }

interface Props {
  initialPage: number
  ataques: Record<string, AtaqueInfo>
}

const LAST = PLAN_CLASES.length

const ACTOS = [
  { roman: 'Acto I', title: 'Python', type: 'python' },
  { roman: 'Acto II', title: 'SQLite', type: 'sql' },
  { roman: 'Acto III', title: 'Integración', type: 'mixed' },
  { roman: 'Acto IV', title: 'El Arquitecto', type: 'final' },
] as const

/** Las dos clases de cada jefe, en orden. */
const SEMANAS = BOSSES.map((boss) => ({ boss, clases: PLAN_CLASES.filter((c) => c.bossId === boss.id) }))

function setUrl(page: number) {
  const url = new URL(window.location.href)
  if (page === 0) url.searchParams.delete('clase')
  else url.searchParams.set('clase', String(page))
  window.history.replaceState(null, '', url)
}

export default function PlanBook({ initialPage, ataques }: Props) {
  const [page, setPage] = useState(initialPage)
  const [zoom, setZoom] = useState(TEXT_ZOOM_DEFAULT)

  useEffect(() => { setZoom(getTextZoom()) }, [])

  const go = useCallback((next: number) => {
    const p = Math.min(LAST, Math.max(0, next))
    if (p === page) return
    sfx.pageFlip()
    setPage(p)
    setUrl(p)
    window.scrollTo({ top: 0 })
  }, [page])

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
  const clase = page > 0 ? PLAN_CLASES[page - 1] : null

  return (
    <Win
      title="PLANIFICACION.EXE"
      active
      right={<span style={{ background: 'hsl(var(--bg))', padding: '1px 4px' }}><ZoomControl zoom={zoom} onChange={handleZoom} /></span>}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ zoom }}>
        {clase ? <ClasePage clase={clase} ataques={ataques} go={go} /> : <Indice go={go} />}
      </div>
    </Win>
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
            <button type="button" className="plan-tool plan-nav-index" onClick={() => go(0)}>Índice · {n} / {LAST}</button>
            <button type="button" className="repaso-ghost-btn" onClick={() => go(n + 1)} disabled={n === LAST} style={{ opacity: n === LAST ? 0.35 : 1 }}>
              Clase {Math.min(LAST, n + 1)} ›
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
function Exercise({ ej, lang, kind, className, head, seed }: {
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
    <article className={className}>
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
