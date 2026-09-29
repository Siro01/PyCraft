'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Link from 'next/link'
import AppWindow from '@/components/ui/AppWindow'
import { LoadingBar } from '@/components/ui/LoadingBar'
import CodeMirrorEditor from '@/components/game/CodeMirrorEditor'
import { PixelBitmap, ICON_TERMINAL } from '@/components/game/architect/desktop/PixelBitmap'
import { sfx } from '@/lib/game/architect/sound'
import {
  getPracticeCode, getPracticeIntroHidden, getPracticeSplit, getTextZoom, PRACTICE_SPLIT_DEFAULT,
  PRACTICE_SPLIT_MAX, PRACTICE_SPLIT_MIN, savePracticeCode, setPracticeIntroHidden, setPracticeSplit,
  setTextZoom, TEXT_ZOOM_DEFAULT,
} from '@/lib/storage/local-store'
import ZoomControl from '@/components/game/ZoomControl'

const jersey = 'var(--font-jersey), monospace'
const ACCENT = '#DC143C'

const STARTER_CODE = `# ¡Este es tu patio de prácticas! Escribí lo que quieras y apretá ▶ Ejecutar.
# Probá declarar variables, usar print(), pedir un input()...

nombre_item = "Espada de diamante"
cantidad = 3

print("Ítem:", nombre_item)
print("Cantidad:", cantidad)
`

type RunState = { kind: 'idle' } | { kind: 'ok'; output: string } | { kind: 'error'; message: string }

export default function PracticeApp() {
  const [code, setCode] = useState(STARTER_CODE)
  const [loaded, setLoaded] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const [running, setRunning] = useState(false)
  const [run, setRun] = useState<RunState>({ kind: 'idle' })
  const [maximized, setMaximized] = useState(false)
  // Arranca en 1 (igual que el servidor, sin localStorage) y recién después
  // de montar lee el zoom guardado — mismo motivo que el resto del estado
  // que viene de localStorage en esta pantalla.
  const [zoom, setZoom] = useState(TEXT_ZOOM_DEFAULT)
  // Ocultar el párrafo de ayuda para ganar espacio, y la fracción de ancho
  // que le toca al editor contra la consola (el resto es de la consola) —
  // ambos son gustos del alumno, se guardan en localStorage.
  const [introHidden, setIntroHidden] = useState(false)
  const [split, setSplit] = useState(PRACTICE_SPLIT_DEFAULT)
  const splitRef = useRef(split)
  splitRef.current = split
  const paneRowRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // El sitio tiene su propio <header> arriba de esta página — se mide acá
  // para que "pantalla completa" llene lo que queda debajo sin taparlo
  // (mismo mecanismo que MAPA_DE_JEFES.EXE en el dashboard).
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const measure = () => document.documentElement.style.setProperty('--dash-header-h', `${header.getBoundingClientRect().height}px`)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  // Código guardado del alumno — se lee recién al montar (localStorage no
  // existe en el servidor) para no desincronizar el HTML del servidor con
  // el del cliente.
  useEffect(() => {
    const saved = getPracticeCode()
    if (saved) setCode(saved)
    setZoom(getTextZoom())
    setIntroHidden(getPracticeIntroHidden())
    setSplit(getPracticeSplit())
    setLoaded(true)
  }, [])

  const handleZoom = (next: number) => {
    setZoom(next)
    setTextZoom(next)
  }

  const toggleIntro = () => {
    sfx.click()
    setIntroHidden((hidden) => {
      const next = !hidden
      setPracticeIntroHidden(next)
      return next
    })
  }

  // Arrastre del divisor entre editor y consola — el alumno arma su propio
  // espacio de trabajo. Se mide el ancho de la fila de paneles una sola vez
  // al empezar a arrastrar y se recalcula la fracción con cada movimiento.
  const handleDividerPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const row = paneRowRef.current
    if (!row) return
    const rect = row.getBoundingClientRect()
    sfx.click()
    const onMove = (ev: PointerEvent) => {
      const ratio = (ev.clientX - rect.left) / rect.width
      setSplit(Math.min(PRACTICE_SPLIT_MAX, Math.max(PRACTICE_SPLIT_MIN, ratio)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setPracticeSplit(splitRef.current)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const resetSplit = () => {
    sfx.click()
    setSplit(PRACTICE_SPLIT_DEFAULT)
    setPracticeSplit(PRACTICE_SPLIT_DEFAULT)
  }

  // Motor de Python (Pyodide): se precarga apenas se abre la página y se
  // sondea igual que en CodeEditor.tsx — es una descarga de varios MB la
  // primera vez, así que el botón de ejecutar queda deshabilitado hasta que
  // esté listo.
  useEffect(() => {
    let cancelled = false
    import('@/lib/game/executor/pyodide-runner').then(({ preloadPyodide, isPyodideLoaded }) => {
      preloadPyodide()
      const id = setInterval(() => {
        if (cancelled) return
        if (isPyodideLoaded()) { setEngineReady(true); clearInterval(id) }
      }, 300)
      if (isPyodideLoaded()) setEngineReady(true)
      return () => clearInterval(id)
    })
    return () => { cancelled = true }
  }, [])

  const handleChange = (val: string) => {
    setCode(val)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => savePracticeCode(val), 400)
  }

  const handleRun = async () => {
    if (running || !engineReady) return
    sfx.click()
    setRunning(true)
    const { runPython } = await import('@/lib/game/executor/pyodide-runner')
    const result = await runPython(code)
    setRunning(false)
    if (result.error) {
      sfx.miss()
      setRun({ kind: 'error', message: result.error })
    } else {
      sfx.confirm()
      setRun({ kind: 'ok', output: result.output || '(no imprimió nada)' })
    }
  }

  const handleReset = () => {
    if (!confirm('¿Volver el código al ejemplo inicial? Se pierde lo que escribiste.')) return
    sfx.trash()
    setCode(STARTER_CODE)
    savePracticeCode(STARTER_CODE)
    setRun({ kind: 'idle' })
  }

  if (!loaded) return null

  return (
    <div className="desk relative" style={{ border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))', backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.18) 1px, transparent 1px)', backgroundSize: '14px 14px', boxShadow: '6px 6px 0 hsl(var(--tx) / 0.18)' }}>
      <div className="flex items-center gap-3 px-2.5" style={{ height: 28, background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))' }}>
        <span style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.08em', color: 'hsl(var(--tx))' }}>PYCRAFT OS</span>
        <span style={{ flex: 1 }} />
        <ZoomControl zoom={zoom} onChange={handleZoom} />
        <Link href="/dashboard" className="label-mono" style={{ color: 'hsl(var(--tx2))' }}>← Volver al mapa</Link>
      </div>

      <div className="p-3">
        <AppWindow
          title="PATIO_DE_PRACTICAS.EXE"
          icon={<PixelBitmap rows={ICON_TERMINAL} scale={2} ink="hsl(var(--bg))" />}
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
          <div className="flex flex-col" style={{ ...(maximized ? { height: '100%' } : {}), zoom }}>
            <div className="flex items-start gap-2 mb-3" style={{ flexShrink: 0 }}>
              {!introHidden && (
                <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, color: 'hsl(var(--tx2))', flex: 1 }}>
                  Escribí el Python que quieras y probalo — sin jefe, sin desafío, solo para practicar. Si tu código usa <code className="font-mono">input()</code>, el navegador te va a pedir el valor con su propia ventanita.
                </p>
              )}
              <button
                type="button"
                onClick={toggleIntro}
                className="label-mono shrink-0"
                title={introHidden ? 'Mostrar ayuda' : 'Ocultar ayuda'}
                style={{
                  height: 22, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 4,
                  border: '2px solid hsl(var(--tx))', background: 'transparent', color: 'hsl(var(--tx2))', cursor: 'pointer',
                  marginLeft: introHidden ? 0 : undefined,
                }}
              >
                {introHidden ? '▾ Ayuda' : '▴ Ocultar'}
              </button>
            </div>

            <div ref={paneRowRef} className="flex flex-col lg:grid gap-3" style={{ ...(maximized ? { flex: 1, minHeight: 0 } : {}), gridTemplateColumns: `minmax(0, ${split}fr) 14px minmax(0, ${1 - split}fr)` }}>
              <div className="min-w-0 flex flex-col">
                <div className="label-mono mb-1" style={{ height: 18, display: 'flex', alignItems: 'center', color: 'hsl(var(--tx3))', flexShrink: 0 }}>Editor</div>
                <div style={{ border: '2px solid hsl(var(--tx))', ...(maximized ? { flex: 1, minHeight: 0 } : {}) }}>
                  <CodeMirrorEditor value={code} onChange={handleChange} language="python" accentColor={ACCENT} onCtrlEnter={handleRun} fillHeight={maximized} />
                </div>
                <div className="flex items-center gap-2 mt-3" style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={handleRun}
                    disabled={!engineReady || running}
                    className="cta-btn cta-btn--primary"
                    style={{ opacity: !engineReady || running ? 0.6 : 1 }}
                  >
                    {!engineReady ? <LoadingBar label="Cargando motor Python..." size="xs" tone="current" estimatedMs={10000} />
                      : running ? <LoadingBar label="Ejecutando..." size="xs" tone="current" estimatedMs={1200} />
                      : '▶ Ejecutar (Ctrl+Enter)'}
                  </button>
                  <button type="button" onClick={handleReset} className="cta-btn">
                    ↺ Reiniciar
                  </button>
                </div>
              </div>

              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Redistribuir editor y consola"
                title="Arrastrá para redistribuir · doble clic para restablecer"
                onPointerDown={handleDividerPointerDown}
                onDoubleClick={resetSplit}
                className="hidden lg:flex"
                style={{ position: 'relative', alignItems: 'stretch', justifyContent: 'center', cursor: 'col-resize', touchAction: 'none' }}
              >
                <div style={{ width: 2, alignSelf: 'stretch', margin: '0 auto', background: 'hsl(var(--border2))' }} />
                <div className="flex flex-col gap-1" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                  <span style={{ width: 4, height: 4, background: 'hsl(var(--tx3))' }} />
                  <span style={{ width: 4, height: 4, background: 'hsl(var(--tx3))' }} />
                  <span style={{ width: 4, height: 4, background: 'hsl(var(--tx3))' }} />
                </div>
              </div>

              <div className="min-w-0 flex flex-col">
                <div className="label-mono mb-1" style={{ height: 18, display: 'flex', alignItems: 'center', color: 'hsl(var(--tx3))', flexShrink: 0 }}>Consola</div>
                <div
                  className="font-mono overflow-y-auto"
                  style={{
                    minHeight: 160, background: 'hsl(var(--bg))', color: run.kind === 'error' ? 'hsl(var(--danger))' : 'hsl(var(--tx))',
                    border: '2px solid hsl(var(--border2))', padding: '10px 12px', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    ...(maximized ? { flex: 1 } : { maxHeight: 320 }),
                  }}
                >
                  {run.kind === 'idle' && <span style={{ color: 'hsl(var(--tx3))' }}>Todavía no ejecutaste nada.</span>}
                  {run.kind === 'ok' && run.output}
                  {run.kind === 'error' && run.message}
                </div>
              </div>
            </div>
          </div>
        </AppWindow>
      </div>
    </div>
  )
}
