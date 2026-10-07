'use client'

/* DIRECTION CONTRACT — Biblioteca (seed 11aaba3a, forma "Grimorio de hechizos", 3/7 de la lista)
 * THESIS: la teoría es un estante de grimorios del acto, no una lista de lecciones: cada tema es un
 *   libro con lomo propio que se saca, se abre y se practica lanzando hechizos contra un muñeco.
 * OWN-WORLD: PyCraft OS 1-bit (tokens hsl(var(--…)) con la paleta del acto como en el mapa),
 *   borde de 2px, sombra dura, cero radio, steps(); Jersey nombra, VT323 habla, system-ui explica.
 * STORY: el alumno entra desde el edificio del mapa, elige el lomo del tema que no entendió,
 *   lee un paso por hoja, ejecuta y cambia el ejemplo, y domina el libro tirando sus hechizos.
 * FIRST VIEWPORT: título bitmap BIBLIOTECA + Rodolfo bibliotecario; el estante a todo el ancho
 *   (lomos de alturas distintas, vela, poción) con vitrina de sellos abajo; placa del libro elegido
 *   con "Abrir libro" como acción primaria.
 * FORM: estante → vuelo del lomo → tapa que se abre → doble página (teoría | código vivo).
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
 *   verdict, DESIGN.md, and every shipping raster carrying its provenance.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import AppWindow from '@/components/ui/AppWindow'
import ZoomControl from '@/components/game/ZoomControl'
import PixelTitle from '@/components/game/map/PixelTitle'
import { PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { sfx } from '@/lib/game/architect/sound'
import { ACT_MAPS, MAP_PALETTES, MAP_PALETTE_ON_ACCENT, type MapTheme } from '@/lib/game/act-maps'
import { getActBooks } from '@/lib/game/biblioteca'
import { getBibliotecaProgress, getTextZoom, setTextZoom, TEXT_ZOOM_DEFAULT, type BibliotecaProgress } from '@/lib/storage/local-store'
import Bookshelf, { bookStats } from './Bookshelf'
import BookSpread from './BookSpread'
import { BookGlyph, Ico, ICO_LEFT } from './LibrarySprites'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

/** CodeMirror arma sus transparencias concatenando alfa al hex: necesita el acento en hex. */
const ACCENT_HEX: Record<MapTheme, string> = { light: '#171717', dark: '#e6e6e6', red: '#DC143C' }

const ICON_BOOK = [
  '##########',
  '#a#oooooo#',
  '#a#o####o#',
  '#a#oooooo#',
  '#a#o###oo#',
  '#a#oooooo#',
  '##########',
]

interface Flight { idx: number; from: DOMRect; to: { x: number; y: number; w: number; h: number } }

interface Props {
  actKey: string
  initialBook?: string
  initialPage?: number
}

export default function BibliotecaApp({ actKey: initialAct, initialBook, initialPage }: Props) {
  const [actKey, setActKey] = useState(initialAct)
  const act = ACT_MAPS.find((a) => a.key === actKey) ?? ACT_MAPS[0]
  const books = useMemo(() => getActBooks(act.key), [act.key])
  const palette = { ...MAP_PALETTES[act.palette], '--on-accent': MAP_PALETTE_ON_ACCENT[act.palette] } as React.CSSProperties

  const [progress, setProgress] = useState<BibliotecaProgress>({})
  useEffect(() => { setProgress(getBibliotecaProgress()) }, [])

  const deepIdx = initialBook ? books.findIndex((b) => b.id === initialBook) : -1
  const [selected, setSelected] = useState(deepIdx >= 0 ? deepIdx : 0)
  const [open, setOpen] = useState<{ idx: number; sheet: number; revealing: boolean } | null>(
    deepIdx >= 0 ? { idx: deepIdx, sheet: initialPage ?? 0, revealing: true } : null,
  )
  const [pulled, setPulled] = useState<number | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [closing, setClosing] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [zoom, setZoom] = useState(TEXT_ZOOM_DEFAULT)
  const [actTurn, setActTurn] = useState(0)
  useEffect(() => { setZoom(getTextZoom()) }, [])
  const stageRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLDivElement>(null)
  const busy = useRef(false)

  // Pantalla completa debajo del header del sitio (mismo mecanismo que los patios).
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const measure = () => document.documentElement.style.setProperty('--dash-header-h', `${header.getBoundingClientRect().height}px`)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { sfx.pageFlip() }, [])

  // La URL acompaña lo que se ve (para volver con Atrás o compartir el link del libro).
  useEffect(() => {
    const q = new URLSearchParams({ acto: act.key })
    if (open) q.set('libro', books[open.idx].id)
    window.history.replaceState(null, '', `/biblioteca?${q.toString()}`)
  }, [act.key, books, open])

  const openBook = useCallback((i: number) => {
    if (busy.current || open) return
    busy.current = true
    const book = books[i]
    const sheet = progress[book.id]?.lastPage ?? 0
    setSelected(i)
    sfx.bookPull()
    setPulled(i)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stage = stageRef.current
    const spine = stage?.querySelector<HTMLElement>(`[data-book-index="${i}"]`)
    if (reduce || !stage || !spine) {
      sfx.bookOpen()
      setOpen({ idx: i, sheet, revealing: false })
      busy.current = false
      return
    }
    // El escenario puede tener `zoom` (botones A-/A+): las medidas de pantalla
    // se pasan a las unidades de adentro dividiendo por el zoom.
    const z = zoom || 1
    const sr = stage.getBoundingClientRect()
    const br = spine.getBoundingClientRect()
    const sw = sr.width / z
    const w = Math.min(250, sw * 0.42)
    const h = Math.min(330, w * 1.32)
    setTimeout(() => {
      setFlight({
        idx: i,
        from: new DOMRect((br.left - sr.left) / z, (br.top - sr.top) / z, br.width / z, br.height / z),
        to: { x: sw / 2, y: 30, w, h },
      })
    }, 140)
  }, [books, open, progress, zoom])

  // El vuelo: el lomo crece hasta ser la tapa (8 cuadros), la tapa se abre
  // girando sobre el lomo (9 cuadros) y debajo aparece la doble página.
  useLayoutEffect(() => {
    const el = coverRef.current
    if (!flight || !el) return
    const { from, to } = flight
    const fly = el.animate(
      [
        { left: `${from.x}px`, top: `${from.y}px`, width: `${from.width}px`, height: `${from.height}px` },
        { left: `${to.x}px`, top: `${to.y}px`, width: `${to.w}px`, height: `${to.h}px` },
      ],
      { duration: 380, easing: 'steps(8, end)', fill: 'forwards' },
    )
    let opening: Animation | null = null
    fly.onfinish = () => {
      sfx.bookOpen()
      const book = books[flight.idx]
      setOpen({ idx: flight.idx, sheet: progress[book.id]?.lastPage ?? 0, revealing: true })
      opening = el.animate(
        [{ transform: 'perspective(900px) rotateY(0deg)' }, { transform: 'perspective(900px) rotateY(-178deg)', opacity: 0.2 }],
        { duration: 440, easing: 'steps(9, end)', fill: 'forwards' },
      )
      opening.onfinish = () => { setFlight(null); busy.current = false }
    }
    return () => { fly.cancel(); opening?.cancel() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight])

  const closeBook = useCallback(() => {
    if (!open || closing) return
    sfx.bookClose()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const back = () => {
      setSelected(open.idx)
      setOpen(null)
      setClosing(false)
      setPulled(null)
      busy.current = false
    }
    if (reduce) { back(); return }
    setClosing(true)
    setTimeout(back, 230)
  }, [closing, open])

  const switchAct = (key: string) => {
    if (key === act.key || open) return
    sfx.pageTurn()
    setActKey(key)
    setSelected(0)
    setActTurn((n) => n + 1)
  }

  const handleZoom = (next: number) => { setZoom(next); setTextZoom(next) }

  const mastered = books.filter((b) => bookStats(b, progress[b.id]).mastered).length
  const librarianLine = mastered === books.length
    ? `¡Dominaste los ${books.length} libros de este estante! Volvé cuando quieras a repasar.`
    : mastered > 0
      ? `Llevás ${mastered} de ${books.length} libros dominados. Cada libro tiene teoría, ejemplos para tocar y hechizos al final.`
      : 'Cada libro es un tema del acto. Leé un paso por hoja, ejecutá el ejemplo, cambialo y al final lanzá sus hechizos.'
  const openedBook = open ? books[open.idx] : null
  const flyingBook = flight ? books[flight.idx] : null

  return (
    <div
      className="desk relative lib-desk"
      style={{
        ...palette,
        border: '2px solid hsl(var(--tx))',
        background: 'hsl(var(--bg))',
        backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.16) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        boxShadow: '6px 6px 0 hsl(var(--tx) / 0.18)',
        color: 'hsl(var(--tx))',
      }}
    >
      <div className="flex items-center gap-3 px-2.5" style={{ height: 28, background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))' }}>
        <span className="hidden sm:inline" style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.08em', color: 'hsl(var(--tx))' }}>PYCRAFT OS</span>
        <span style={{ flex: 1 }} />
        <ZoomControl zoom={zoom} onChange={handleZoom} />
        <Link href="/dashboard" className="label-mono" style={{ color: 'hsl(var(--tx2))', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Ico rows={ICO_LEFT} scale={1} /> Volver al mapa</Link>
      </div>

      <div className="p-3">
        <AppWindow
          title={openedBook ? `${openedBook.spine.toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÑ]+/g, '_').replace(/^_+|_+$/g, '')}.LIBRO` : 'BIBLIOTECA.EXE'}
          icon={<PixelBitmap rows={ICON_BOOK} scale={2} ink="hsl(var(--bg))" />}
          x={0} y={0} w={0}
          z={maximized ? 60 : 0}
          active
          mode={maximized ? 'maximized' : 'normal'}
          essential
          flow={!maximized}
          onFocus={() => {}}
          onToggleMaximize={() => { sfx.click(); setMaximized((m) => !m) }}
          bodyStyle={{ padding: maximized ? 12 : 16 }}
        >
          <div ref={stageRef} className="lib-stage" style={{ zoom }}>
            {!open && (
              <div key={actTurn} className={actTurn ? 'lib-act-turn' : undefined}>
                <header className="lib-head">
                  <div className="lib-head-title">
                    <PixelTitle text="BIBLIOTECA" scale={4} playKey={act.key} glitch={act.ascii} />
                    <span className="label-mono" style={{ color: 'hsl(var(--tx2))' }}>— {act.roman} · {act.title.toUpperCase()} —</span>
                  </div>
                  <div className="lib-librarian">
                    <p className="lib-librarian-bubble">
                      <span className="lib-note-name">Rodolfo, bibliotecario</span>
                      {librarianLine}
                    </p>
                    <img src="/rodolfo/rodolfo.gif" width={124} height={124} alt="" className="lib-librarian-pig" />
                  </div>
                </header>
                <nav className="lib-acts" aria-label="Estantes de cada acto">
                  {ACT_MAPS.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      className={`lib-act-tab${a.key === act.key ? ' is-active' : ''}`}
                      aria-current={a.key === act.key ? 'true' : undefined}
                      onClick={() => switchAct(a.key)}
                    >
                      {a.roman.replace('ACTO ', '')} · {a.title}
                    </button>
                  ))}
                </nav>
                <Bookshelf
                  books={books}
                  progress={progress}
                  selected={Math.min(selected, books.length - 1)}
                  onSelect={setSelected}
                  onOpen={openBook}
                  pulled={pulled}
                  actKey={act.key}
                />
              </div>
            )}

            {open && openedBook && (
              <div className={closing ? 'lib-book-closing' : undefined}>
                <BookSpread
                  key={openedBook.id}
                  book={openedBook}
                  progress={progress[openedBook.id]}
                  onProgress={setProgress}
                  initialSheet={open.sheet}
                  accentHex={ACCENT_HEX[act.palette]}
                  onClose={closeBook}
                  revealing={open.revealing}
                />
              </div>
            )}

            {flight && flyingBook && (
              <div ref={coverRef} className="lib-fly" aria-hidden="true" style={{ left: flight.from.x, top: flight.from.y, width: flight.from.width, height: flight.from.height, transformOrigin: 'left center' }}>
                <div className="lib-fly-cover">
                  <span className="lib-fly-glyph"><BookGlyph glyph={flyingBook.glyph} size={44} color="hsl(var(--tx))" /></span>
                  <span className="lib-fly-title" style={{ fontFamily: jersey }}>{flyingBook.title}</span>
                  <span className="label-mono" style={{ fontFamily: vt }}>{act.roman}</span>
                </div>
              </div>
            )}
          </div>
        </AppWindow>
      </div>
    </div>
  )
}
