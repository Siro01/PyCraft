'use client'

import { forwardRef, useEffect, useRef, useState } from 'react'
import { PixelBitmap, ICON_ARROW_DOWN } from '@/components/game/architect/desktop/PixelBitmap'
import { getBossById } from '@/lib/game/bosses'
import { getPlaygroundAct } from '@/lib/game/playground'
import { sfx } from '@/lib/game/architect/sound'
import { EMPTY_BOOK_PROGRESS, type BibliotecaProgress, type BookProgress } from '@/lib/storage/local-store'
import type { Book } from '@/lib/game/biblioteca'
import { BOOK_PILE, BOOKEND, BookGlyph, CANDLE, CANDLE_B, PixelGrid, POTION, SEAL, SEAL_EMPTY } from './LibrarySprites'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

// Alto del lomo: lo que pide el título (vertical) más una variación fija por
// posición — no al azar: el estante se ve igual cada vez que el alumno vuelve.
const JITTER = [10, 0, 22, 6, 16, 2, 26, 12, 4]
// Ancho: lo grueso del libro, según cuántas páginas tiene (en estantes de pocos libros, tomos más gordos).
const spineWidth = (pages: number, wide: boolean) => Math.min(112, 34 + pages * 8 + (wide ? 22 : 0))
const spineHeight = (title: string, i: number) => Math.min(262, Math.max(158, 112 + title.length * 9.5) + JITTER[i % JITTER.length])
const VARIANTS = ['ink', 'paper', 'hatch', 'accent'] as const

export function bookStats(book: Book, p: BookProgress = EMPTY_BOOK_PROGRESS) {
  return {
    read: p.read.filter((i) => i < book.pages.length).length,
    spells: p.spells.filter((id) => book.spells.some((s) => s.id === id)).length,
    mastered: !!p.masteredAt,
    started: p.read.length > 0 || p.spells.length > 0,
  }
}

interface Props {
  books: Book[]
  progress: BibliotecaProgress
  selected: number
  onSelect: (i: number) => void
  onOpen: (i: number) => void
  /** Lomo que salió del estante (mientras se abre el libro): se ve el hueco. */
  pulled: number | null
  actKey: string
}

export default function Bookshelf({ books, progress, selected, onSelect, onOpen, pulled, actKey }: Props) {
  const spineRefs = useRef<(HTMLButtonElement | null)[]>([])
  const caseRef = useRef<HTMLDivElement>(null)
  // Cuántos lomos entran por repisa: si no entran todos, el estante suma
  // repisas (nunca scroll de costado: en el celu el chico no sabe que hay más).
  const [perRow, setPerRow] = useState(books.length)
  useEffect(() => {
    const el = caseRef.current
    if (!el) return
    const measure = () => {
      const narrow = el.clientWidth < 520
      const free = el.clientWidth - 28 - (narrow ? 0 : 120) // laterales + vela/sujetalibros/poción (en el celu se esconden)
      setPerRow(Math.max(2, Math.min(books.length, Math.floor(free / (narrow ? 62 : 92)))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [books.length])
  const rowCount = Math.ceil(books.length / perRow)
  const per = Math.ceil(books.length / rowCount)
  const rows = Array.from({ length: rowCount }, (_, r) => books.map((b, i) => ({ b, i })).slice(r * per, r * per + per))

  // ←/→ recorren el estante, Enter abre. Solo con el foco adentro del estante
  // o en el cuerpo de la página (no mientras se escribe en otro lado).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const n = (selected + (e.key === 'ArrowRight' ? 1 : -1) + books.length) % books.length
        onSelect(n)
        spineRefs.current[n]?.focus({ preventScroll: false })
      } else if (e.key === 'Enter' && t?.tagName !== 'BUTTON' && t?.tagName !== 'A') {
        // Sobre un botón (un lomo) el Enter ya dispara su clic: no abrir dos veces.
        e.preventDefault()
        onOpen(selected)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [books.length, onOpen, onSelect, selected])

  const book = books[selected]
  const p = progress[book.id]
  const st = bookStats(book, p)
  const boss = book.bossId ? getBossById(book.bossId) : undefined
  const topics = (book.playground ?? [])
    .map((k) => getPlaygroundAct(actKey)?.topics.find((t) => t.key === k)?.title)
    .filter(Boolean) as string[]

  return (
    <div>
      <div className="lib-case" ref={caseRef}>
        <div className="lib-cornice" aria-hidden="true" />

        {/* Repisas de los libros (una o más, según el ancho) */}
        <div role="listbox" aria-label="Libros del estante" aria-orientation="horizontal">
          {rows.map((row, r) => (
            <div key={r}>
              <div className="lib-row lib-row--books">
                {r === 0 && (
                  <span className="lib-prop lib-candle" aria-hidden="true">
                    <PixelGrid rows={CANDLE} size={40} className="lib-candle-a" />
                    <PixelGrid rows={CANDLE_B} size={40} className="lib-candle-b" />
                  </span>
                )}
                {row.map(({ b, i }) => (
                  <Spine
                    key={b.id}
                    ref={(el) => { spineRefs.current[i] = el }}
                    book={b}
                    index={i}
                    wide={books.length <= 4}
                    stats={bookStats(b, progress[b.id])}
                    selected={i === selected}
                    pulled={pulled === i}
                    onFocus={() => { if (i !== selected) onSelect(i) }}
                    onClick={() => { if (i === selected) onOpen(i); else { onSelect(i); sfx.itemFocus() } }}
                    onDoubleClick={() => onOpen(i)}
                  />
                ))}
                <span className="lib-prop lib-prop--end" aria-hidden="true">
                  {r === rows.length - 1 ? <PixelGrid rows={POTION} size={36} /> : <PixelGrid rows={BOOKEND} size={32} />}
                </span>
              </div>
              <div className="lib-board" aria-hidden="true" />
            </div>
          ))}
        </div>

        {/* Vitrina: un hueco por libro, el sello aparece al dominarlo */}
        <div className="lib-row lib-row--trophies">
          <span className="label-mono lib-trophy-label">Sellos</span>
          <div className="lib-trophies" role="list" aria-label="Sellos de libros dominados">
            {books.map((b, i) => {
              const done = !!progress[b.id]?.masteredAt
              return (
                <span key={b.id} role="listitem" className={`lib-trophy${done ? ' lib-trophy--done' : ''}${i === selected ? ' lib-trophy--sel' : ''}`} title={done ? `${b.title}: dominado` : `${b.title}: sin sello`}>
                  <PixelGrid rows={done ? SEAL : SEAL_EMPTY} size={24} />
                  <span className="sr-only">{b.title}: {done ? 'dominado' : 'sin sello'}</span>
                </span>
              )
            })}
          </div>
          <span className="lib-prop lib-prop--pile" aria-hidden="true">
            <PixelGrid rows={BOOK_PILE} size={46} />
          </span>
        </div>
        <div className="lib-board lib-board--base" aria-hidden="true" />
      </div>

      {/* Placa del libro elegido */}
      <div className="lib-plate" aria-live="polite">
        <div className="lib-plate-cover" aria-hidden="true">
          <BookGlyph glyph={book.glyph} size={30} color="hsl(var(--tx))" />
        </div>
        <div className="lib-plate-body">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontFamily: jersey, fontSize: 26, lineHeight: 1, color: 'hsl(var(--tx))', textWrap: 'balance' }}>{book.title.replace(/ · /g, ' · ')}</span>
            {st.mastered && <span className="lib-chip lib-chip--accent">Dominado</span>}
          </div>
          <p style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.15, color: 'hsl(var(--tx2))', margin: '6px 0 0' }}>
            {boss ? `Te prepara para el jefe ${boss.classNumber}: ${boss.name}.` : 'Tema extra del acto, sin jefe propio.'}
            {topics.length > 0 && ` Explica la tanda del patio "${topics.join('", "')}".`}
          </p>
          <div className="lib-meters">
            <Meter label="Páginas probadas" value={st.read} max={book.pages.length} />
            <Meter label="Hechizos" value={st.spells} max={book.spells.length} />
          </div>
        </div>
        <div className="lib-plate-actions">
          <button type="button" className="cta-btn cta-btn--primary" onClick={() => onOpen(selected)}>
            {p && p.lastPage > 0 && !st.mastered ? 'Seguir leyendo' : 'Abrir libro'}
          </button>
          <span className="lib-keyhint">Flechas para elegir, Enter para abrir</span>
        </div>
      </div>
    </div>
  )
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="lib-meter">
      <span className="label-mono" style={{ color: 'hsl(var(--tx2))' }}>{label} {value}/{max}</span>
      <span className="lib-meter-track" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => <span key={i} className={i < value ? 'on' : ''} />)}
      </span>
    </div>
  )
}

interface SpineProps {
  book: Book
  index: number
  wide: boolean
  stats: ReturnType<typeof bookStats>
  selected: boolean
  pulled: boolean
  onFocus: () => void
  onClick: () => void
  onDoubleClick: () => void
}

const Spine = forwardRef<HTMLButtonElement, SpineProps>(function Spine({ book, index, wide, stats, selected, pulled, onFocus, onClick, onDoubleClick }, ref) {
  const variant = VARIANTS[index % VARIANTS.length]
  const ink = variant === 'ink' ? 'hsl(var(--bg))' : variant === 'accent' ? 'var(--on-accent)' : 'hsl(var(--tx))'
  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      aria-label={`${book.title}${stats.mastered ? ', dominado' : stats.started ? ', empezado' : ''}`}
      data-book-index={index}
      className={`lib-spine lib-spine--${variant}${selected ? ' is-selected' : ''}${pulled ? ' is-pulled' : ''}`}
      style={{ height: spineHeight(book.spine, index), ['--spine-w' as string]: `${spineWidth(book.pages.length, wide)}px`, color: ink }}
      onFocus={onFocus}
      onMouseEnter={() => sfx.hover()}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {selected && !pulled && (
        <span className="lib-spine-arrow map-next-arrow" aria-hidden="true">
          <PixelBitmap rows={ICON_ARROW_DOWN} scale={3} ink="hsl(var(--accent))" />
        </span>
      )}
      {stats.started && !stats.mastered && <span className="lib-bookmark" aria-hidden="true" />}
      <span className="lib-spine-band" aria-hidden="true" />
      <span className="lib-spine-glyph" aria-hidden="true"><BookGlyph glyph={book.glyph} size={20} color={ink} /></span>
      <span className="lib-spine-title">{book.spine}</span>
      <span className="lib-spine-band" aria-hidden="true" />
      <span className="lib-spine-vol" aria-hidden="true">{index + 1}</span>
      {stats.mastered && (
        <span className="lib-spine-seal" aria-hidden="true"><PixelGrid rows={SEAL} size={24} /></span>
      )}
    </button>
  )
})
