'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import CodeMirrorEditor from '@/components/game/CodeMirrorEditor'
import { MiniTable } from '@/components/game/LessonWindow'
import BossTopicIcon from '@/components/game/map/BossTopicIcon'
import { LoadingBar } from '@/components/ui/LoadingBar'
import { IconCheck } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'
import { getBossById } from '@/lib/game/bosses'
import { bossMissions, type Book, type BookPage } from '@/lib/game/biblioteca'
import { normalizeOutput, runBookCode, type BookRun } from '@/lib/game/biblioteca-run'
import { friendlyError } from '@/lib/game/friendly-error'
import { markBookPage, setBookLastPage, EMPTY_BOOK_PROGRESS, type BibliotecaProgress, type BookProgress } from '@/lib/storage/local-store'
import { BookGlyph, Ico, ICO_LEFT, ICO_PLAY, ICO_RIGHT, ICO_STAR, ICO_UNDO } from './LibrarySprites'
import SpellTable from './SpellTable'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

/** `código` entre backticks → chip de código. */
export function RichText({ text }: { text: string }) {
  const parts = text.split('`')
  return (
    <>
      {parts.map((part, i) => (i % 2 ? <code key={i} className="lib-code">{part}</code> : <Fragment key={i}>{part}</Fragment>))}
    </>
  )
}

interface Props {
  book: Book
  progress: BookProgress | undefined
  onProgress: (all: BibliotecaProgress) => void
  initialSheet: number
  /** Color del acento del acto en hex — CodeMirror lo necesita así para sus transparencias. */
  accentHex: string
  onClose: () => void
  /** Recién abierto desde el estante: las páginas entran con el barrido. */
  revealing: boolean
}

export default function BookSpread({ book, progress, onProgress, initialSheet, accentHex, onClose, revealing }: Props) {
  const p = progress ?? EMPTY_BOOK_PROGRESS
  const P = book.pages.length
  const SPELLS = P
  const BOSS = book.bossId ? P + 1 : -1
  const total = P + 1 + (book.bossId ? 1 : 0)
  const [sheet, setSheet] = useState(Math.min(Math.max(0, initialSheet), total - 1))
  const [turn, setTurn] = useState<{ dir: 'next' | 'prev'; n: number } | null>(null)

  // Precalentar el motor apenas se abre el libro.
  useEffect(() => {
    import('@/lib/game/executor').then(({ preloadPyodide, preloadSqlJs }) => {
      if (book.lang === 'python') preloadPyodide()
      else preloadSqlJs()
    })
  }, [book.lang])

  const goTo = useCallback((n: number) => {
    if (n < 0 || n >= total || n === sheet) return
    sfx.pageFlip()
    setTurn((t) => ({ dir: n > sheet ? 'next' : 'prev', n: (t?.n ?? 0) + 1 }))
    setSheet(n)
    onProgress(setBookLastPage(book.id, n))
  }, [book.id, onProgress, sheet, total])

  // ←/→ y RePág/AvPág pasan de hoja (no mientras se escribe en el editor); Esc cierra.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.closest('.cm-editor'))) return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(sheet + 1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(sheet - 1) }
      else if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goTo, onClose, sheet])

  const turnClass = (side: 'left' | 'right') =>
    !turn ? '' : turn.dir === 'next' && side === 'right' ? ' lib-turn-next' : turn.dir === 'prev' && side === 'left' ? ' lib-turn-prev' : ' lib-turn-fade'

  const page = sheet < P ? book.pages[sheet] : null
  const boss = book.bossId ? getBossById(book.bossId) : undefined

  return (
    <div className={`lib-book${revealing ? ' lib-book--reveal' : ''}`}>
      {/* Lomo superior: volver, título y las cintas de cada hoja */}
      <div className="lib-book-top">
        <button type="button" className="lib-ghost-btn" onClick={onClose} aria-label="Cerrar el libro y volver al estante"><Ico rows={ICO_LEFT} /> Estante</button>
        <span className="lib-book-title">
          <BookGlyph glyph={book.glyph} size={18} color="hsl(var(--tx))" />
          <span>{book.title}</span>
        </span>
        <nav className="lib-ribbons" aria-label="Hojas del libro">
          {book.pages.map((pg, i) => {
            const read = p.read.includes(i)
            const tink = p.tinkered.includes(i)
            return (
              <button
                key={i}
                type="button"
                className={`lib-ribbon${i === sheet ? ' is-current' : ''}${read ? ' is-read' : ''}`}
                aria-label={`Página ${i + 1}: ${pg.title}${read ? ', probada' : ''}${tink ? ', con experimento' : ''}`}
                aria-current={i === sheet ? 'page' : undefined}
                onClick={() => goTo(i)}
              >
                {i + 1}
                {tink && <span className="lib-ribbon-star" aria-hidden="true" />}
              </button>
            )
          })}
          <button
            type="button"
            className={`lib-ribbon lib-ribbon--wide${sheet === SPELLS ? ' is-current' : ''}${p.masteredAt ? ' is-read' : ''}`}
            aria-current={sheet === SPELLS ? 'page' : undefined}
            onClick={() => goTo(SPELLS)}
          >
            Hechizos {p.spells.length}/{book.spells.length}
          </button>
          {boss && (
            <button
              type="button"
              className={`lib-ribbon lib-ribbon--wide${sheet === BOSS ? ' is-current' : ''}`}
              aria-current={sheet === BOSS ? 'page' : undefined}
              aria-label={`Misiones de ${boss.name}`}
              onClick={() => goTo(BOSS)}
            >
              <BossTopicIcon bossId={boss.id} size={12} color="currentColor" /> Jefe
            </button>
          )}
        </nav>
      </div>

      <div className="lib-spread">
        {page && (
          <>
            <section key={`l-${sheet}-${turn?.n ?? 0}`} className={`lib-page lib-page--left${turnClass('left')}`} aria-label={`Página ${sheet + 1} de ${P}`}>
              {sheet === 0 && <LibrarianNote text={book.intro} />}
              <h2 className="lib-page-title">{page.title}</h2>
              <p className="lib-page-text"><RichText text={page.text} /></p>
              {page.highlight && page.highlight.length > 0 && (
                <p className="lib-keylines">
                  Mirá {page.highlight.length === 1 ? 'la línea' : 'las líneas'} {joinList(page.highlight.map(String))} del ejemplo: {page.highlight.length === 1 ? 'está marcada' : 'están marcadas'} con una raya al costado.
                </p>
              )}
              {page.tryIt && (
                <div className="lib-try">
                  <span className="lib-try-tag">Probá</span>
                  <span><RichText text={page.tryIt} /></span>
                </div>
              )}
              {page.warn && (
                <div className="lib-warn" role="note">
                  <span className="lib-warn-tag">Ojo</span>
                  <span><RichText text={page.warn} /></span>
                </div>
              )}
              <PageTurn side="left" disabled={sheet === 0} onClick={() => goTo(sheet - 1)} />
              <span className="lib-folio">{sheet + 1} / {P}</span>
            </section>
            <div className="lib-gutter" aria-hidden="true" />
            <section key={`r-${sheet}-${turn?.n ?? 0}`} className={`lib-page lib-page--right${turnClass('right')}`} aria-label="Ejemplo para probar">
              <LiveExample
                key={`${book.id}-${sheet}`}
                book={book}
                page={page}
                accentHex={accentHex}
                stamped={p.read.includes(sheet)}
                tinkered={p.tinkered.includes(sheet)}
                onRan={(tinkered) => onProgress(markBookPage(book.id, sheet, tinkered))}
              />
              <PageTurn side="right" label={sheet === P - 1 ? 'A los hechizos' : 'Siguiente'} onClick={() => goTo(sheet + 1)} />
            </section>
          </>
        )}

        {sheet === SPELLS && (
          <SpellTable
            key={`spells-${book.id}`}
            book={book}
            progress={p}
            onProgress={onProgress}
            turnClass={turnClass}
            turnKey={turn?.n ?? 0}
            onPrev={() => goTo(sheet - 1)}
            onNext={boss ? () => goTo(BOSS) : undefined}
            onClose={onClose}
          />
        )}

        {sheet === BOSS && boss && (
          <>
            <section key={`bl-${turn?.n ?? 0}`} className={`lib-page lib-page--left${turnClass('left')}`} aria-label={`Misiones de ${boss.name}`}>
              <div className="lib-boss-card">
                <span className="lib-boss-glyph" aria-hidden="true"><BossTopicIcon bossId={boss.id} size={30} color="hsl(var(--tx))" /></span>
                <div>
                  <div className="label-mono" style={{ color: 'hsl(var(--tx3))' }}>{boss.title}</div>
                  <div style={{ fontFamily: jersey, fontSize: 26, lineHeight: 1, color: 'hsl(var(--tx))' }}>{boss.name}</div>
                  <p style={{ fontFamily: vt, fontSize: 19, color: 'hsl(var(--tx2))', margin: '4px 0 0' }}>{boss.description}</p>
                </div>
              </div>
              <h2 className="lib-page-title" style={{ marginTop: 18 }}>Esto te va a pedir</h2>
              <ol className="lib-missions">
                {bossMissions(boss.id).map((m, i) => (
                  <li key={i}>
                    <span className="lib-mission-n" aria-hidden="true">{i + 1}</span>
                    <div>
                      <div style={{ fontFamily: jersey, fontSize: 19, color: 'hsl(var(--tx))' }}>{m.title}</div>
                      <p className="lib-page-text" style={{ fontSize: 15, margin: '2px 0 0' }}><RichText text={m.description} /></p>
                    </div>
                  </li>
                ))}
              </ol>
              <PageTurn side="left" onClick={() => goTo(sheet - 1)} />
            </section>
            <div className="lib-gutter" aria-hidden="true" />
            <section key={`br-${turn?.n ?? 0}`} className={`lib-page lib-page--right${turnClass('right')}`} aria-label="Para ganarle">
              <h2 className="lib-page-title">Para ganarle, acordate</h2>
              <ul className="lib-tips">
                {(book.bossTips ?? []).map((t, i) => (
                  <li key={i}><span className="lib-tip-box" aria-hidden="true"><IconCheck size={12} color="hsl(var(--tx))" /></span><RichText text={t} /></li>
                ))}
              </ul>
              <p style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx2))', marginTop: 16 }}>
                {p.masteredAt
                  ? 'Ya dominás este libro. Cuando tu docente habilite al jefe, andá a pelear: estás listo.'
                  : 'Antes de pelear, lanzá los hechizos del libro: son parecidos a lo que te va a pedir.'}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link href="/dashboard" className="cta-btn cta-btn--primary" onClick={() => sfx.confirm()}>Ir al mapa</Link>
                {!p.masteredAt && (
                  <button type="button" className="cta-btn" onClick={() => goTo(SPELLS)}>A los hechizos</button>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function joinList(items: string[]) {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

export function PageTurn({ side, onClick, disabled, label }: { side: 'left' | 'right'; onClick: () => void; disabled?: boolean; label?: string }) {
  if (disabled) return <span className="lib-turn-spacer" aria-hidden="true" />
  return (
    <button type="button" className={`lib-turn lib-turn--${side}`} onClick={onClick}>
      {side === 'left' ? <><Ico rows={ICO_LEFT} /> {label ?? 'Anterior'}</> : <>{label ?? 'Siguiente'} <Ico rows={ICO_RIGHT} /></>}
      <span className="lib-dogear" aria-hidden="true" />
    </button>
  )
}

function LibrarianNote({ text }: { text: string }) {
  return (
    <div className="lib-note">
      <img src="/rodolfo/rodolfo.gif" width={44} height={44} alt="" className="lib-note-pig" />
      <p><span className="lib-note-name">Rodolfo:</span> {text}</p>
    </div>
  )
}

// ─── Ejemplo editable ────────────────────────────────────────────────────────

interface LiveProps {
  book: Book
  page: BookPage
  accentHex: string
  stamped: boolean
  tinkered: boolean
  onRan: (tinkered: boolean) => void
}

function LiveExample({ book, page, accentHex, stamped, tinkered, onRan }: LiveProps) {
  const [code, setCode] = useState(page.code)
  const [running, setRunning] = useState(false)
  const [slow, setSlow] = useState(false)
  const [result, setResult] = useState<BookRun | null>(null)
  const [fresh, setFresh] = useState<'read' | 'tinker' | null>(null)
  const runId = useRef(0)
  const changed = normalizeOutput(code) !== normalizeOutput(page.code)
  const file = book.lang === 'sql' ? 'consulta.sql' : 'ejemplo.py'
  const seed = page.seed ?? book.seed

  const run = useCallback(async () => {
    if (running) return
    const id = ++runId.current
    sfx.attack()
    setRunning(true)
    const t = setTimeout(() => setSlow(true), 700)
    try {
      const r = await runBookCode(book.lang, code, { seed, peek: page.peek, prelude: book.prelude })
      if (id !== runId.current) return
      setResult(r)
      if (r.error) {
        sfx.miss()
      } else {
        sfx.confirm()
        const tink = changed
        if (!stamped || (tink && !tinkered)) {
          setFresh(tink && !tinkered ? 'tinker' : 'read')
          setTimeout(() => sfx.repasoStamp(), 160)
        }
        onRan(tink)
      }
    } finally {
      clearTimeout(t)
      setSlow(false)
      setRunning(false)
    }
  }, [book.lang, book.prelude, changed, code, onRan, page.peek, running, seed, stamped, tinkered])

  const reset = () => { sfx.click(); setCode(page.code); setResult(null) }

  return (
    <div className="lib-live">
      {book.setup && (
        <p className="lib-setup"><span className="lib-setup-tag">Datos</span> {book.setup}</p>
      )}
      <div className="lib-editor-win">
        <div className="lib-editor-bar">
          <span>{file.toUpperCase()}</span>
          {changed && <span className="lib-edited">editado</span>}
        </div>
        <CodeMirrorEditor
          value={code}
          onChange={setCode}
          language={book.lang}
          accentColor={accentHex}
          onCtrlEnter={run}
          markLines={page.highlight}
          activeLine={false}
          className="lib-cm"
        />
      </div>
      <div className="lib-run-row">
        <button type="button" className="cta-btn cta-btn--primary" onClick={run} disabled={running}>
          <Ico rows={ICO_PLAY} />{running ? 'Ejecutando…' : 'Ejecutar'}
        </button>
        {changed && <button type="button" className="lib-ghost-btn" onClick={reset}><Ico rows={ICO_UNDO} /> Volver al original</button>}
        <span className="label-mono" style={{ color: 'hsl(var(--tx3))', marginLeft: 'auto' }}>Ctrl+Enter</span>
      </div>
      {running && slow && (
        <div className="mt-2">
          <LoadingBar size="xs" estimatedMs={6000} label="Despertando el motor" />
          <p className="label-mono" style={{ color: 'hsl(var(--tx3))', marginTop: 4 }}>Despertando el motor (la primera vez tarda un poco)…</p>
        </div>
      )}
      <Console result={result} lang={book.lang} />
      <div className="lib-stamps" aria-live="polite">
        {(stamped || fresh) && <span className={`lib-stamp${fresh === 'read' ? ' lib-stamp--new' : ''}`}>Probado</span>}
        {(tinkered || fresh === 'tinker') && <span className={`lib-stamp lib-stamp--accent${fresh === 'tinker' ? ' lib-stamp--new' : ''}`}><Ico rows={ICO_STAR} /> Experimentaste</span>}
        {!stamped && !fresh && <span className="lib-keyhint">Ejecutalo para sellar la página. Si lo cambiás y lo ejecutás, ganás la estrella.</span>}
      </div>
    </div>
  )
}

export function Console({ result, lang }: { result: BookRun | null; lang: Book['lang'] }) {
  return (
    <div className={`lib-console${result?.error ? ' lib-console--error' : ''}`} aria-live="polite">
      <div className="lib-console-bar">Consola</div>
      <div className="lib-console-body">
        {!result && <span style={{ color: 'hsl(var(--tx3))' }}>{lang === 'sql' ? 'Acá aparece la tabla que devuelve la consulta.' : 'Acá aparece lo que imprime el programa.'}</span>}
        {result?.error && (
          <>
            <div className="lib-err-raw">{result.error}</div>
            <div className="lib-err-kid"><span className="lib-warn-tag">Rodolfo traduce</span> {friendlyError(result.error)}</div>
          </>
        )}
        {result && !result.error && result.table && (
          <MiniTable table={{ cols: result.table.cols, rows: result.table.rows }} />
        )}
        {result && !result.error && !result.table && (
          result.lines.length > 0
            ? result.lines.map((l, i) => <div key={i} className="lib-out-line">{l || ' '}</div>)
            : <span style={{ color: 'hsl(var(--tx3))' }}>{lang === 'sql' ? 'Listo. Esta orden no devuelve filas.' : 'Se ejecutó sin imprimir nada.'}</span>
        )}
      </div>
    </div>
  )
}
