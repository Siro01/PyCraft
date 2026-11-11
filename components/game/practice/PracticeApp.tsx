'use client'

import ProgramShell from '@/components/ui/ProgramShell'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import AppWindow from '@/components/ui/AppWindow'
import { LoadingBar } from '@/components/ui/LoadingBar'
import CodeMirrorEditor from '@/components/game/CodeMirrorEditor'
import { PixelBitmap, ICON_TERMINAL } from '@/components/game/architect/desktop/PixelBitmap'
import { sfx } from '@/lib/game/architect/sound'
import {
  getPracticeCode, getPracticeSplit, getTextZoom, PRACTICE_SPLIT_DEFAULT,
  PRACTICE_SPLIT_MAX, PRACTICE_SPLIT_MIN, savePracticeCode, setPracticeSplit,
  setTextZoom, TEXT_ZOOM_DEFAULT, getProjectorLight, setProjectorLight,
  getPracticeSqlCode, savePracticeSqlCode, getPracticeLang, setPracticeLang, type PracticeLang,
} from '@/lib/storage/local-store'
import type { TableDiff } from '@/lib/game/executor/sql-runner'
import { friendlySqlError } from '@/lib/game/friendly-error'
import SqlTable from '@/components/game/sql/SqlTable'
import ZoomControl from '@/components/game/ZoomControl'
import ProjectorToggle, { PROJECTOR_PALETTE } from '@/components/game/ProjectorToggle'
import { useIsAdmin } from '@/lib/hooks/useIsAdmin'
import StickerLayer from '@/components/game/stickers/StickerLayer'
import { ConsoleAsk, ConsoleOutput, usePythonInput } from '@/components/game/PyConsoleInput'
import { useSysConfirm } from '@/components/ui/SysDialog'

const ACCENT = '#DC143C'

const STARTER_CODE = `# ¡Este es tu patio de prácticas! Escribí lo que quieras y apretá ▶ Ejecutar.
# Probá declarar variables, usar print(), pedir un input()...

nombre_item = "Espada de diamante"
cantidad = 3

print("Ítem:", nombre_item)
print("Cantidad:", cantidad)
`

const STARTER_SQL = `-- ¡Patio de SQL! Escribí tus órdenes y apretá ▶ Ejecutar.
-- Cada vez que ejecutás arranca una base de datos vacía: primero creá la tabla.

CREATE TABLE cofre (
  id INTEGER PRIMARY KEY,
  nombre TEXT,
  cantidad INTEGER
);

INSERT INTO cofre VALUES (1, 'Espada', 1);
INSERT INTO cofre VALUES (2, 'Antorcha', 16);
INSERT INTO cofre VALUES (3, 'Manzana', 8);

SELECT nombre, cantidad FROM cofre;
`

type RunState =
  | { kind: 'idle' }
  | { kind: 'ok'; output: string }
  | { kind: 'error'; message: string; output?: string; failed?: boolean }
  | { kind: 'sql'; columns: string[]; rows: string[][]; changes: TableDiff[] }
  | { kind: 'sqlError'; message: string; suggestion?: string; raw: string }

export default function PracticeApp() {
  const [code, setCode] = useState(STARTER_CODE)
  // Python o SQL: cada lenguaje tiene su propia libreta guardada.
  const [lang, setLang] = useState<PracticeLang>('python')
  const [sqlCode, setSqlCode] = useState(STARTER_SQL)
  const [sqlReady, setSqlReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [engineReady, setEngineReady] = useState(false)
  const [running, setRunning] = useState(false)
  const [run, setRun] = useState<RunState>({ kind: 'idle' })
  const [maximized, setMaximized] = useState(false)
  // Arranca en 1 (igual que el servidor, sin localStorage) y recién después
  // de montar lee el zoom guardado — mismo motivo que el resto del estado
  // que viene de localStorage en esta pantalla.
  const [zoom, setZoom] = useState(TEXT_ZOOM_DEFAULT)
  // Fracción de ancho que le toca al editor contra la consola (el resto es
  // de la consola) — gusto del alumno, se guarda en localStorage.
  const [split, setSplit] = useState(PRACTICE_SPLIT_DEFAULT)
  // Modo proyector: paleta clara para mostrar el patio en clase. Solo el
  // docente ve el botón; se recuerda en su PC.
  const isAdmin = useIsAdmin()
  const [projector, setProjector] = useState(false)
  const splitRef = useRef(split)
  splitRef.current = split
  const paneRowRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const consoleRef = useRef<HTMLDivElement>(null)
  const { ask, pending, reply, stop } = usePythonInput()

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
    const savedSql = getPracticeSqlCode()
    if (savedSql) setSqlCode(savedSql)
    setLang(getPracticeLang())
    setZoom(getTextZoom())
    setSplit(getPracticeSplit())
    setProjector(getProjectorLight())
    setLoaded(true)
  }, [])

  const handleZoom = (next: number) => {
    setZoom(next)
    setTextZoom(next)
  }

  const handleProjector = (next: boolean) => {
    setProjector(next)
    setProjectorLight(next)
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
  // sondea igual que en la batalla (CombatArena) — es una descarga de varios MB la
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

  // Motor de SQL (sql.js, el mismo de las batallas): es chico, se precarga igual.
  useEffect(() => {
    let cancelled = false
    import('@/lib/game/executor/sql-runner').then(({ getSqlJs }) =>
      getSqlJs().then(() => { if (!cancelled) setSqlReady(true) }).catch(() => {}),
    )
    return () => { cancelled = true }
  }, [])

  // Mi Reino como reino.db para Python (solo lectura). Se arma al abrir el
  // patio y cada vez que se vuelve a esta pestaña (el alumno pudo haber
  // cambiado su reino en otra), así ejecutar no espera a la red.
  const reinoRef = useRef<Promise<Uint8Array | null> | null>(null)
  useEffect(() => {
    const cargar = () => {
      // Si falla la carga (sin red), se sigue usando la copia anterior.
      const anterior = reinoRef.current ?? Promise.resolve(null)
      reinoRef.current = import('@/lib/game/cartas/puente')
        .then((m) => m.cargarReinoParaPython())
        .catch(() => anterior)
    }
    cargar()
    const onVisible = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const isSql = lang === 'sql'
  const ready = isSql ? sqlReady : engineReady

  const switchLang = (next: PracticeLang) => {
    if (next === lang || running) return
    sfx.click()
    setLang(next)
    setPracticeLang(next)
    setRun({ kind: 'idle' })
  }

  const handleChange = (val: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (isSql) {
      setSqlCode(val)
      saveTimer.current = setTimeout(() => savePracticeSqlCode(val), 400)
    } else {
      setCode(val)
      saveTimer.current = setTimeout(() => savePracticeCode(val), 400)
    }
  }

  const handleRunSql = async () => {
    if (running || !sqlReady) return
    sfx.click()
    setRunning(true)
    setRun({ kind: 'idle' })
    const { runSQL } = await import('@/lib/game/executor/sql-runner')
    const result = await runSQL(sqlCode)
    setRunning(false)
    if (result.error) {
      sfx.miss()
      const help = friendlySqlError(result.error, sqlCode, result.schema)
      setRun({ kind: 'sqlError', message: help.message, suggestion: help.suggestion, raw: result.error })
    } else {
      sfx.confirm()
      setRun({ kind: 'sql', columns: result.columns, rows: result.rows, changes: result.changes ?? [] })
    }
  }

  const handleRun = async () => {
    if (isSql) return handleRunSql()
    if (running || !engineReady) return
    sfx.click()
    setRunning(true)
    setRun({ kind: 'idle' })
    const { runPython, STOPPED_ERROR } = await import('@/lib/game/executor/pyodide-runner')
    const reino = /reino\.db/.test(code) ? await (reinoRef.current ?? Promise.resolve(null)) : null
    const result = await runPython(code, { ask, reino })
    setRunning(false)
    if (result.error === STOPPED_ERROR) {
      // Lo frenó el alumno: no es un error suyo, se deja lo que alcanzó a imprimir.
      setRun({ kind: 'error', message: '■ Programa detenido.', output: result.display })
    } else if (result.error) {
      sfx.miss()
      setRun({ kind: 'error', message: result.error, output: result.display, failed: true })
    } else {
      sfx.confirm()
      setRun({ kind: 'ok', output: result.display || '(no imprimió nada)' })
    }
  }

  const [askConfirm, confirmNode] = useSysConfirm()
  const handleReset = async () => {
    const ok = await askConfirm({ title: 'REINICIAR.EXE', body: <>¿Volver el código {isSql ? 'SQL ' : ''}al ejemplo inicial? Se borra lo que escribiste.</>, ok: 'Reiniciar', danger: true })
    if (!ok) return
    sfx.trash()
    if (isSql) {
      setSqlCode(STARTER_SQL)
      savePracticeSqlCode(STARTER_SQL)
    } else {
      setCode(STARTER_CODE)
      savePracticeCode(STARTER_CODE)
    }
    setRun({ kind: 'idle' })
  }

  if (!loaded) return null

  return (
    <ProgramShell
      layers={<StickerLayer surface="practice" />}
      style={isAdmin && projector ? PROJECTOR_PALETTE : undefined}
      bar={
        <div className="flex items-center gap-2">
          {isAdmin && <ProjectorToggle on={projector} onChange={handleProjector} />}
          <ZoomControl zoom={zoom} onChange={handleZoom} />
        </div>
      }
    >
      {confirmNode}
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
            <div className="flex items-center mb-3" style={{ flexShrink: 0 }}>
              <div role="group" aria-label="Lenguaje" className="flex shrink-0" style={{ border: '2px solid hsl(var(--tx))' }}>
                {(['python', 'sql'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => switchLang(l)}
                    aria-pressed={lang === l}
                    disabled={running}
                    className="label-mono"
                    title={l === 'python' ? 'Escribir Python' : 'Escribir SQL'}
                    style={{
                      height: 18, padding: '0 8px', display: 'flex', alignItems: 'center', border: 'none', cursor: 'pointer',
                      background: lang === l ? 'hsl(var(--tx))' : 'transparent',
                      color: lang === l ? 'hsl(var(--bg))' : 'hsl(var(--tx2))',
                    }}
                  >
                    {l === 'python' ? 'Python' : 'SQL'}
                  </button>
                ))}
              </div>
            </div>

            <div ref={paneRowRef} className="flex flex-col lg:grid gap-3" style={{ ...(maximized ? { flex: 1, minHeight: 0 } : {}), gridTemplateColumns: `minmax(0, ${split}fr) 14px minmax(0, ${1 - split}fr)` }}>
              <div className="min-w-0 flex flex-col">
                <div className="label-mono mb-1" style={{ height: 18, display: 'flex', alignItems: 'center', color: 'hsl(var(--tx3))', flexShrink: 0 }}>Editor</div>
                <div style={{ border: '2px solid hsl(var(--tx))', ...(maximized ? { flex: 1, minHeight: 0 } : {}) }}>
                  <CodeMirrorEditor key={lang} value={isSql ? sqlCode : code} onChange={handleChange} language={lang} accentColor={ACCENT} onCtrlEnter={handleRun} fillHeight={maximized} />
                </div>
                <div className="flex items-center gap-2 mt-3" style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={pending ? () => { sfx.click(); stop() } : handleRun}
                    disabled={!ready || (running && !pending)}
                    className={`cta-btn${pending ? '' : ' cta-btn--primary'}`}
                    style={{ opacity: !ready || (running && !pending) ? 0.6 : 1 }}
                  >
                    {!ready ? <LoadingBar label={isSql ? 'Cargando motor SQL...' : 'Cargando motor Python...'} size="xs" tone="current" estimatedMs={isSql ? 2000 : 10000} />
                      : pending ? '■ Detener (Esc)'
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
                  ref={consoleRef}
                  className="font-mono overflow-y-auto"
                  onClick={() => { if (pending && !window.getSelection()?.toString()) consoleRef.current?.querySelector('input')?.focus() }}
                  style={{
                    minHeight: 160, background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', ['--py-ink' as string]: ACCENT,
                    border: `2px solid ${pending ? ACCENT : 'hsl(var(--border2))'}`, padding: '10px 12px', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    ...(maximized ? { flex: 1 } : { maxHeight: 320 }),
                  }}
                >
                  {pending ? (
                    <>
                      <ConsoleOutput display={pending.soFar} />
                      <ConsoleAsk key={pending.soFar} prompt={pending.prompt} onReply={reply} onStop={stop} />
                    </>
                  ) : (
                    <>
                      {run.kind === 'idle' && <span style={{ color: 'hsl(var(--tx3))' }}>{running ? 'Ejecutando…' : 'Todavía no ejecutaste nada.'}</span>}
                      {run.kind === 'ok' && <ConsoleOutput display={run.output} />}
                      {run.kind === 'sql' && (
                        <div className="flex flex-col gap-3" style={{ whiteSpace: 'normal' }}>
                          {run.changes.map((c) => (
                            <SqlTable key={c.name} label={c.name} isTable created={c.created} columns={c.columns} rows={c.rows} />
                          ))}
                          {run.columns.length > 0 && <SqlTable label="resultado" columns={run.columns} rows={run.rows} />}
                          {run.changes.length === 0 && run.columns.length === 0 && (
                            <span style={{ color: 'hsl(var(--tx3))' }}>Listo. La consulta no devolvió ninguna fila.</span>
                          )}
                        </div>
                      )}
                      {run.kind === 'sqlError' && (
                        <div className="flex flex-col gap-1" style={{ whiteSpace: 'normal' }}>
                          <div style={{ color: 'hsl(var(--danger))' }}>{run.message}</div>
                          {run.suggestion && (
                            <div style={{ color: 'hsl(var(--tx2))' }}>¿Quisiste decir <code className="code-chip">{run.suggestion}</code>?</div>
                          )}
                          <details>
                            <summary className="label-mono" style={{ cursor: 'pointer', color: 'hsl(var(--tx3))', width: 'fit-content' }}>Ver el mensaje de la compu</summary>
                            <pre className="whitespace-pre-wrap break-all mt-1" style={{ color: 'hsl(var(--tx2))', fontSize: 12 }}>{run.raw}</pre>
                          </details>
                        </div>
                      )}
                      {run.kind === 'error' && (
                        <>
                          {run.output && <ConsoleOutput display={run.output} />}
                          <div style={{ color: run.failed ? 'hsl(var(--danger))' : 'hsl(var(--tx3))', ...(run.output ? { marginTop: 4 } : {}) }}>{run.message}</div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AppWindow>
    </ProgramShell>
  )
}
