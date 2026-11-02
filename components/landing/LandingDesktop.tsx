'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import AppWindow from '@/components/ui/AppWindow'
import { useDesktopWindows, useNarrowDesk } from '@/components/ui/desk/useDesktopWindows'
import {
  PixelBitmap, type Bitmap, ICON_FILE, ICON_FOLDER, ICON_CUBE, ICON_SWORDS, CHEST_CLOSED, ICON_TERMINAL,
  ICON_BIN, ICON_BIN_OPEN, ICON_SHORTCUT, ICON_ARROW_RIGHT, STICKER_BITMAPS,
} from '@/components/game/architect/desktop/PixelBitmap'
import { sfx } from '@/lib/game/architect/sound'
import { SITE } from '@/lib/site-config'
import MascotGuide from '@/components/game/MascotGuide'
import CrashTransition from './CrashTransition'
import Wallpaper from './Wallpaper'
import StartMenu from './StartMenu'

// La landing ES el escritorio de PyCraft OS: el título es el fondo de
// pantalla, cada sección es un archivo que se abre en una ventana, el header
// es la barra de menú y el footer es la barra de tareas con su menú INICIO.
// Bajo 720px es la versión de bolsillo: íconos en grilla, una ventana a la
// vez a pantalla completa y un dock con ENTRAR siempre a mano.

type WinId = 'leeme' | 'jefes' | 'como' | 'dificultad' | 'mercader' | 'probar' | 'acerca' | 'papelera'

interface Program {
  id: WinId
  file: string
  title: string
  /** Ancla de la URL: `/#jefes` abre la ventana al cargar (las anclas de la landing vieja siguen andando). */
  hash?: string
  bmp: Bitmap
  w: number
  hint: string
}

const PROGRAMS: Program[] = [
  { id: 'leeme', file: 'LEEME.txt', title: 'LEEME.TXT', hash: 'leeme', bmp: ICON_FILE, w: 470, hint: 'qué es PyCraft BossRush' },
  { id: 'jefes', file: 'jefes', title: 'JEFES', hash: 'jefes', bmp: ICON_FOLDER, w: 680, hint: 'los 14 jefes del taller' },
  { id: 'como', file: 'como_se_juega.exe', title: 'COMO_SE_JUEGA.EXE', hash: 'como-funciona', bmp: ICON_CUBE, w: 480, hint: 'las tres fases del taller' },
  { id: 'dificultad', file: 'dificultad.cfg', title: 'DIFICULTAD.CFG', hash: 'dificultad', bmp: ICON_SWORDS, w: 450, hint: 'los tres niveles de combate' },
  { id: 'mercader', file: 'mercader.exe', title: 'MERCADER.EXE', hash: 'mercader', bmp: CHEST_CLOSED, w: 450, hint: 'amuletos y estrategia' },
  { id: 'probar', file: 'probar.py', title: 'PROBAR.PY', hash: 'probar', bmp: ICON_TERMINAL, w: 480, hint: 'escribí tu primera variable' },
  { id: 'acerca', file: 'acerca_de.txt', title: 'ACERCA_DE.TXT', hash: 'acerca-de', bmp: ICON_FILE, w: 500, hint: 'qué es, tus datos y aviso legal' },
  { id: 'papelera', file: 'Papelera', title: 'PAPELERA.EXE', bmp: ICON_BIN, w: 420, hint: '' },
]
const IDS = PROGRAMS.map((p) => p.id)
const BY_ID = Object.fromEntries(PROGRAMS.map((p) => [p.id, p])) as Record<WinId, Program>
const GRID: WinId[] = ['leeme', 'jefes', 'como', 'dificultad', 'mercader', 'probar']

// Accesos directos: íconos que llevan a otra página.
const SHORTCUTS = {
  demo: { file: 'probar_un_jefe', href: '/demo', bmp: STICKER_BITMAPS.creeper, hint: 'probá el primer jefe sin cuenta' },
  privacidad: { file: 'privacidad.txt', href: '/privacidad', bmp: ICON_FILE, hint: 'política de privacidad' },
}

// Rodolfo cambia de tip según la ventana enfocada: una línea, nunca una explicación.
const TIPS: Record<WinId | 'escritorio', string> = {
  escritorio: '¡Hola! Soy Rodolfo. Tocá un archivo del escritorio para abrirlo.',
  leeme: 'Leé hasta el final: abajo está el botón para ver los jefes.',
  jefes: 'Tocá un jefe para ver qué tema enseña.',
  como: 'Primero Python, después SQLite y al final los dos juntos.',
  dificultad: 'Si recién empezás, JUNIOR es el tuyo.',
  mercader: 'Tocá cada casillero para ver qué hace.',
  probar: 'Escribí algo como edad = 12 y apretá Enter.',
  acerca: 'Acá está qué datos se guardan y lo legal.',
  papelera: '¡Acá no se borra nada! Todo el escritorio es parte del taller.',
}

const Loading = () => <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: 'hsl(var(--tx2))', margin: 0 }}>Cargando…</p>
const LeemeWindow = dynamic(() => import('./windows/Leeme'), { loading: Loading })
const JefesWindow = dynamic(() => import('./windows/Jefes'), { loading: Loading })
const ComoSeJuegaWindow = dynamic(() => import('./windows/ComoSeJuega'), { loading: Loading })
const DificultadWindow = dynamic(() => import('./windows/Dificultad'), { loading: Loading })
const MercaderWindow = dynamic(() => import('./windows/Mercader'), { loading: Loading })
const ProbarWindow = dynamic(() => import('./windows/Probar'), { loading: Loading })
const AcercaDeWindow = dynamic(() => import('./windows/AcercaDe'), { loading: Loading })
const PapeleraWindow = dynamic(() => import('./windows/Papelera'), { loading: Loading })

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const THEMES = ['dark', 'red', 'light'] as const
type Theme = (typeof THEMES)[number]
const THEME_LABEL: Record<Theme, string> = { dark: 'BN', light: 'WH', red: 'RD' }

const idFromHash = (hash: string) => PROGRAMS.find((p) => p.hash && `#${p.hash}` === hash)?.id ?? null

// Nombres largos cortan después de "_" y antes de la extensión, como en un explorador de archivos.
function FileName({ name }: { name: string }) {
  const parts = name.split(/(?<=_)|(?=\.)/)
  return <span className="desk-lbl">{parts.map((part, i) => <span key={i}>{i > 0 && <wbr />}{part}</span>)}</span>
}

function Glyph({ bmp, shortcut = false }: { bmp: Bitmap; shortcut?: boolean }) {
  const scale = Math.max(2, Math.floor(48 / Math.max(bmp[0].length, bmp.length)))
  return (
    <span className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
      <PixelBitmap rows={bmp} scale={scale} />
      {shortcut && <span className="absolute" style={{ left: -2, bottom: -2 }}><PixelBitmap rows={ICON_SHORTCUT} scale={2} /></span>}
    </span>
  )
}

export default function LandingDesktop() {
  const desk = useDesktopWindows(IDS, null, [])
  // Celular acostado (poco alto) también usa la versión de bolsillo: el escritorio flotante no entra.
  const thin = useNarrowDesk()
  const short = useShortScreen()
  const narrow = thin || short
  const areaRef = useRef<HTMLElement>(null)
  const [area, setArea] = useState({ w: 0, h: 0 })
  const [start, setStart] = useState<'top' | 'bottom' | null>(null)
  const [crashing, setCrashing] = useState(false)
  const [binShake, setBinShake] = useState(false)
  const [binHot, setBinHot] = useState(false)
  const [ghost, setGhost] = useState<{ x: number; y: number; bmp: Bitmap } | null>(null)
  const binRef = useRef<HTMLDivElement>(null)
  const dragMoved = useRef(false)
  // Dónde estaba cada ventana al empezar a arrastrarla: si la sueltan en la papelera, vuelve ahí.
  const safePos = useRef<Partial<Record<WinId, { x: number; y: number }>>>({})
  const [theme, setTheme] = useState<Theme>('dark')
  const clock = useClock()

  // En mobile cada ventana suma una entrada al historial: el "atrás" del celular la cierra.
  const pushed = useRef(false)
  const narrowRef = useRef(narrow)
  narrowRef.current = narrow
  const startRef = useRef(start)
  startRef.current = start

  useEffect(() => {
    const cur = document.documentElement.dataset.theme
    if (cur === 'dark' || cur === 'red' || cur === 'light') setTheme(cur)
  }, [])

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const measure = () => setArea({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [narrow])

  const cycleTheme = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('theme', next) } catch { /* sin storage */ }
    sfx.theme()
  }

  const setHash = (hash: string | null, push = false) => {
    const url = hash ? `#${hash}` : window.location.pathname + window.location.search
    if (push) window.history.pushState(window.history.state, '', url)
    else window.history.replaceState(window.history.state, '', url)
  }

  const winsRef = useRef(desk.wins)
  winsRef.current = desk.wins
  const { open: openW, close: closeW, move: moveW } = desk

  // Teclado: al abrir una ventana el foco entra en ella; al cerrarla vuelve a su ícono.
  const focusNext = useRef<WinId | null>(null)
  useEffect(() => {
    const id = focusNext.current
    if (!id || desk.active !== id) return
    focusNext.current = null
    const el = document.querySelector<HTMLElement>(`[role="dialog"][aria-label="${BY_ID[id].title}"]`)
    if (!el) return
    el.tabIndex = -1
    el.focus({ preventScroll: true })
  })

  const launch = useCallback((id: WinId, fromHistory = false) => {
    const w = winsRef.current[id]
    if (w.mode === 'closed' || w.mode === 'minimized') sfx.open()
    if (narrowRef.current) {
      IDS.forEach((o) => { if (o !== id && winsRef.current[o].mode !== 'closed') closeW(o) })
    } else if (w.mode === 'closed') {
      // Cascada a la derecha del escritorio, así el título queda a la vista mientras entra.
      const el = areaRef.current
      const aw = el?.clientWidth ?? 1200
      const n = IDS.filter((o) => winsRef.current[o].mode === 'normal').length % 5
      const width = Math.min(BY_ID[id].w, aw - 16)
      const x = Math.max(8, Math.min(aw - width - 120 - n * 28, aw - width - 8))
      moveW(id, x, 20 + n * 26)
    }
    openW(id)
    const hash = BY_ID[id].hash
    if (fromHistory) return
    focusNext.current = id
    if (narrowRef.current) { setHash(hash ?? null, !pushed.current); pushed.current = true }
    else if (hash) setHash(hash)
  }, [openW, closeW, moveW])

  const closeWin = useCallback((id: WinId) => {
    closeW(id)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-win="${id}"]`)?.focus({ preventScroll: true }))
    if (narrowRef.current && pushed.current) { pushed.current = false; window.history.back(); return }
    const hash = BY_ID[id].hash
    if (hash && window.location.hash === `#${hash}`) setHash(null)
  }, [closeW])

  // Al cargar, `/#jefes` abre su ventana. Atrás/adelante del navegador sigue al hash.
  const booted = useRef(false)
  useEffect(() => {
    if (booted.current || area.w === 0) return
    booted.current = true
    const id = idFromHash(window.location.hash)
    if (id) launch(id, true)
  }, [area.w, launch])

  useEffect(() => {
    const onPop = () => {
      const id = idFromHash(window.location.hash)
      if (narrowRef.current) {
        pushed.current = false
        IDS.forEach((o) => { if (o !== id && winsRef.current[o].mode !== 'closed') closeW(o) })
      }
      if (id) launch(id, true)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [closeW, launch])

  // Esc cierra la ventana enfocada (salvo que se esté escribiendo o esté abierto el menú INICIO).
  const activeRef = useRef(desk.active)
  activeRef.current = desk.active
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || startRef.current || !activeRef.current) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return
      sfx.close()
      closeWin(activeRef.current as WinId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeWin])

  const enter = () => {
    setStart(null)
    setCrashing(true)
  }

  const trash = () => {
    setBinShake(true)
    setTimeout(() => setBinShake(false), 420)
    sfx.trash()
    setTimeout(() => sfx.error(), 180)
    launch('papelera')
  }

  const overBin = (cx: number, cy: number) => {
    const r = binRef.current?.getBoundingClientRect()
    if (!r) return false
    const pad = 14
    return cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad
  }

  // Arrastrar un ícono hasta la papelera (solo escritorio: en mobile el dedo scrollea).
  const iconDrag = (bmp: Bitmap) => (e: React.PointerEvent<HTMLElement>) => {
    dragMoved.current = false
    if (narrow || (e.pointerType === 'mouse' && e.button !== 0)) return
    const sx = e.clientX
    const sy = e.clientY
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      if (!dragMoved.current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return
      if (!dragMoved.current) { dragMoved.current = true; sfx.pick() }
      setGhost({ x: ev.clientX, y: ev.clientY, bmp })
      setBinHot(overBin(ev.clientX, ev.clientY))
    }
    const up = (ev: PointerEvent) => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      target.removeEventListener('pointercancel', up)
      if (dragMoved.current) { if (overBin(ev.clientX, ev.clientY)) trash(); else sfx.drop() }
      setGhost(null)
      setBinHot(false)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
    target.addEventListener('pointercancel', up)
  }

  const closeStart = useCallback(() => setStart(null), [])
  const toggleStart = (where: 'top' | 'bottom') => { sfx.click(); setStart((s) => (s === where ? null : where)) }

  // Flechas entre íconos, como en un escritorio de verdad.
  const onIconsKey = (e: KeyboardEvent<HTMLElement>) => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']
    if (!keys.includes(e.key)) return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('.desk-icon'))
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    e.preventDefault()
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1
    items[(i + step + items.length) % items.length]?.focus()
  }

  const programIcon = (id: WinId) => {
    const p = BY_ID[id]
    const open = desk.wins[id].mode !== 'closed'
    if (id === 'papelera') {
      return (
        <button key={id} type="button" data-win={id} className={`desk-icon desk-trash${binHot ? ' desk-trash--over' : ''}${binShake ? ' desk-shake' : ''}`} onClick={trash} title="Papelera de reciclaje">
          <Glyph bmp={open || binHot ? ICON_BIN_OPEN : ICON_BIN} />
          <FileName name={p.file} />
        </button>
      )
    }
    return (
      <button
        key={id}
        type="button"
        data-win={id}
        className={`desk-icon${open ? ' desk-icon--open' : ''}`}
        onPointerDown={iconDrag(p.bmp)}
        onClick={() => { if (!dragMoved.current) launch(id) }}
        style={{ touchAction: narrow ? undefined : 'none' }}
        aria-label={`Abrir ${p.file}: ${p.hint}`}
        title={`Abrir ${p.file}`}
      >
        <Glyph bmp={p.bmp} />
        <FileName name={p.file} />
      </button>
    )
  }

  const shortcutIcon = (key: keyof typeof SHORTCUTS) => {
    const s = SHORTCUTS[key]
    return (
      <a key={key} href={s.href} className="desk-icon" onPointerDown={iconDrag(s.bmp)} onClick={(e) => { if (dragMoved.current) e.preventDefault(); else sfx.open() }} draggable={false} aria-label={`${s.file}: ${s.hint}`} title={`Ir a ${s.href}`} style={{ textDecoration: 'none', touchAction: narrow ? undefined : 'none' }}>
        <Glyph bmp={s.bmp} shortcut />
        <FileName name={s.file} />
      </a>
    )
  }

  const body = (id: WinId): ReactNode => {
    switch (id) {
      case 'leeme': return <LeemeWindow onNext={() => launch('jefes')} />
      case 'jefes': return <JefesWindow />
      case 'como': return <ComoSeJuegaWindow />
      case 'dificultad': return <DificultadWindow />
      case 'mercader': return <MercaderWindow />
      case 'probar': return <ProbarWindow />
      case 'acerca': return <AcercaDeWindow />
      case 'papelera': return <PapeleraWindow onOk={() => closeWin('papelera')} />
    }
  }

  const windowFor = (id: WinId) => {
    const p = BY_ID[id]
    const w = desk.wins[id]
    if (w.mode === 'closed') return null
    const maximized = w.mode === 'maximized'
    const bodyStyle: CSSProperties | undefined = maximized
      ? { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
      // En mobile la ventana ocupa el alto del escritorio y scrollea adentro (así queda a la vista la línea de estado de jefes).
      : { display: 'flex', flexDirection: 'column', maxHeight: narrow ? Math.max(200, area.h - 48) : Math.max(160, area.h - w.y - 44) }
    return (
      <AppWindow
        key={id}
        title={p.title}
        x={w.x}
        y={w.y}
        w={Math.min(p.w, Math.max(280, area.w - 16))}
        z={w.z + 10}
        active={desk.active === id}
        mode={w.mode}
        flow={narrow}
        // Al apretar la ventana se anota dónde estaba, por si la sueltan en la papelera.
        onFocus={() => { safePos.current[id] = { x: w.x, y: w.y }; desk.focus(id) }}
        onMove={narrow ? undefined : (x, y, cx, cy) => {
          desk.move(id, x, y)
          setBinHot(id !== 'papelera' && overBin(cx, cy))
        }}
        onDragEnd={narrow ? undefined : (cx, cy) => {
          setBinHot(false)
          if (id === 'papelera' || !overBin(cx, cy)) return
          const back = safePos.current[id]
          if (back) desk.move(id, back.x, back.y)
          trash()
        }}
        onClose={() => closeWin(id)}
        onMinimize={narrow ? undefined : () => { sfx.minimize(); desk.minimize(id) }}
        onToggleMaximize={narrow ? undefined : () => desk.toggleMaximize(id)}
        bodyStyle={bodyStyle}
      >
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>{body(id)}</div>
      </AppWindow>
    )
  }

  const tasks = IDS.filter((id) => desk.wins[id].mode !== 'closed')
  const barH = narrow ? 40 : 34
  const dots: CSSProperties = {
    background: 'hsl(var(--bg))',
    backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.15) 1px, transparent 1px)',
    backgroundSize: '14px 14px',
  }

  return (
    <>
      <div
        className={`desk landing-os${crashing ? ' landing-crashing' : ''}`}
        style={{
          position: 'relative', display: 'flex', flexDirection: 'column', height: '100dvh', minHeight: narrow ? 320 : 560,
          overflow: 'hidden', color: 'hsl(var(--tx))', ...dots,
          ['--dash-header-h' as string]: `${barH}px`,
          ['--dash-footer-h' as string]: '40px',
          ['--mascot-bottom' as string]: narrow ? 'calc(78px + env(safe-area-inset-bottom))' : '52px',
        }}
      >
        {/* ── Barra de menú (el header) ── */}
        <header
          className="flex items-center gap-3"
          style={{ height: barH, flexShrink: 0, padding: '0 8px 0 6px', background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))', position: 'relative', zIndex: 900 }}
        >
          <button
            type="button"
            data-start-toggle
            onClick={() => toggleStart('top')}
            aria-haspopup="menu"
            aria-expanded={start === 'top'}
            className={`os-menu-btn${start === 'top' ? ' os-menu-btn--on' : ''}`}
          >
            <PixelBitmap rows={CHEST_CLOSED} scale={narrow ? 2 : 1.5} ink="currentColor" />
            <span style={{ fontFamily: jersey, fontSize: narrow ? 20 : 18, letterSpacing: '0.08em', lineHeight: 1 }}>PYCRAFT OS</span>
          </button>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={cycleTheme}
            data-sfx="none"
            className="os-menu-btn"
            aria-label={`Cambiar tema (ahora ${THEME_LABEL[theme]})`}
            title="Cambiar tema"
            style={{ fontFamily: jersey, fontSize: 16, letterSpacing: '0.08em' }}
          >
            {THEME_LABEL[theme]}
          </button>
          <span className="tabular" aria-label="Hora" style={{ fontFamily: jersey, fontSize: 16, color: 'hsl(var(--tx2))', minWidth: 40, textAlign: 'right' }}>{clock}</span>
          {!narrow && (
            <a href="/login" onClick={(e) => { e.preventDefault(); enter() }} className="os-enter">
              <PixelBitmap rows={ICON_ARROW_RIGHT} scale={2} ink="currentColor" />
              Entrar
            </a>
          )}
        </header>

        {/* ── Escritorio ── */}
        <main ref={areaRef} className="relative" style={{ flex: 1, minHeight: 0 }}>
          {narrow ? (
            <>
              <div className="absolute inset-0 overflow-y-auto" style={{ padding: '28px 12px 20px', display: 'flex', flexDirection: 'column', gap: 28 }}>
                <Wallpaper narrow onEnter={enter} />
                <nav aria-label="Archivos de PyCraft OS" onKeyDown={onIconsKey} className="grid justify-items-center" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', rowGap: 10 }}>
                  {GRID.map(programIcon)}
                  {shortcutIcon('demo')}
                  {shortcutIcon('privacidad')}
                  {programIcon('acerca')}
                  {programIcon('papelera')}
                </nav>
              </div>
              {desk.active && (
                <div className="absolute inset-0 overflow-y-auto" style={{ ...dots, padding: 8, zIndex: 20 }}>
                  {windowFor(desk.active as WinId)}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="absolute inset-0 flex items-center justify-center" style={{ padding: '24px 130px 24px 230px' }}>
                <Wallpaper narrow={false} onEnter={enter} />
              </div>
              <nav aria-label="Archivos de PyCraft OS" onKeyDown={onIconsKey} className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 5 }}>
                <div className="absolute grid content-start gap-x-1 gap-y-2" style={{ left: 8, top: 12, gridTemplateColumns: 'repeat(2, 96px)', pointerEvents: 'auto' }}>
                  {GRID.map(programIcon)}
                </div>
                <div className="absolute flex flex-col gap-2" style={{ left: 8, bottom: 10, pointerEvents: 'auto' }}>
                  {shortcutIcon('privacidad')}
                  {programIcon('acerca')}
                </div>
                <div className="absolute" style={{ right: 8, top: 12, pointerEvents: 'auto' }}>{shortcutIcon('demo')}</div>
                {/* Corrida a la izquierda: en el borde derecho asoma Rodolfo. */}
                <div ref={binRef} className="absolute" style={{ right: 64, bottom: 10, pointerEvents: 'auto' }}>{programIcon('papelera')}</div>
              </nav>
              {IDS.map(windowFor)}
            </>
          )}
        </main>

        {/* ── Barra de tareas (el footer) / dock en mobile ── */}
        {narrow ? (
          <footer
            className="flex items-center gap-2"
            style={{ flexShrink: 0, padding: '10px 10px calc(10px + env(safe-area-inset-bottom))', background: 'hsl(var(--surface))', borderTop: '2px solid hsl(var(--tx))', position: 'relative', zIndex: 900 }}
          >
            <button type="button" data-start-toggle onClick={() => toggleStart('bottom')} aria-haspopup="menu" aria-expanded={start === 'bottom'} className={`os-start${start === 'bottom' ? ' os-start--on' : ''}`} style={{ height: 46 }}>
              <PixelBitmap rows={ICON_ARROW_RIGHT} scale={2} ink="currentColor" />
              Inicio
            </button>
            <a href="/login" onClick={(e) => { e.preventDefault(); enter() }} className="cta-btn cta-btn--primary" style={{ flex: 1, justifyContent: 'center', height: 46, padding: '0 14px', boxShadow: '3px 3px 0 hsl(var(--tx) / 0.3)' }}>
              Entrar al taller
            </a>
          </footer>
        ) : (
          <footer
            className="flex items-center gap-1.5"
            style={{ height: 40, flexShrink: 0, padding: '0 8px 0 6px', background: 'hsl(var(--surface))', borderTop: '2px solid hsl(var(--tx))', position: 'relative', zIndex: 900 }}
          >
            <button type="button" data-start-toggle onClick={() => toggleStart('bottom')} aria-haspopup="menu" aria-expanded={start === 'bottom'} className={`os-start${start === 'bottom' ? ' os-start--on' : ''}`}>
              <PixelBitmap rows={ICON_ARROW_RIGHT} scale={2} ink="currentColor" />
              Inicio
            </button>
            <span aria-hidden style={{ width: 2, alignSelf: 'stretch', margin: '6px 4px', background: 'hsl(var(--border2))' }} />
            <div role="toolbar" aria-label="Ventanas abiertas" className="flex items-center gap-1.5" style={{ minWidth: 0, overflow: 'hidden' }}>
              {tasks.map((id) => {
                const w = desk.wins[id]
                const on = desk.active === id
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      if (on) { sfx.minimize(); desk.minimize(id) }
                      else { if (w.mode === 'minimized') sfx.open(); desk.open(id) }
                    }}
                    title={on ? `Minimizar ${BY_ID[id].title}` : `Mostrar ${BY_ID[id].title}`}
                    className="os-task"
                    style={{
                      borderColor: w.mode === 'minimized' ? 'hsl(var(--border2))' : 'hsl(var(--tx))',
                      background: on ? 'hsl(var(--tx))' : 'hsl(var(--bg))',
                      color: on ? 'hsl(var(--bg))' : w.mode === 'minimized' ? 'hsl(var(--tx2))' : 'hsl(var(--tx))',
                    }}
                  >
                    {BY_ID[id].title}
                  </button>
                )
              })}
            </div>
            <span style={{ flex: 1 }} />
            <span className="hidden lg:flex items-center gap-2" style={{ fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx2))', whiteSpace: 'nowrap' }}>
              © {new Date().getFullYear()} {SITE.author}
              <span aria-hidden style={{ color: 'hsl(var(--tx3))' }}>·</span>
              <button type="button" onClick={() => launch('acerca')} className="os-tray-link">No oficial de Minecraft</button>
            </span>
          </footer>
        )}

        {start && (
          <StartMenu
            anchor={start === 'top'
              ? { top: barH + 4, left: 6 }
              : narrow ? { bottom: 'calc(74px + env(safe-area-inset-bottom))', left: 8 } : { bottom: 44, left: 6 }}
            onClose={closeStart}
            onEnter={enter}
            onAbout={() => launch('acerca')}
          />
        )}

        {/* Rodolfo también saluda en la landing — mismo componente que en las batallas */}
        {/* En mobile se esconde con una ventana abierta: taparía su contenido. */}
        {!(narrow && desk.active) && <MascotGuide tip={TIPS[(desk.active as WinId | null) ?? 'escritorio']} />}
      </div>
      {/* Fuera del contenedor con filtro: un filter rompe el position:fixed de sus hijos */}
      {crashing && <CrashTransition href="/login" />}
      {/* Ícono fantasma mientras se arrastra */}
      {ghost && (
        <div aria-hidden="true" style={{ position: 'fixed', left: ghost.x - 24, top: ghost.y - 24, zIndex: 1000, pointerEvents: 'none', opacity: 0.85 }}>
          <Glyph bmp={ghost.bmp} />
        </div>
      )}
    </>
  )
}

function useShortScreen() {
  const [short, setShort] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-height: 499px)')
    const on = () => setShort(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return short
}

function useClock() {
  const [now, setNow] = useState('')
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }))
    tick()
    const t = setInterval(tick, 15_000)
    return () => clearInterval(t)
  }, [])
  return now
}
