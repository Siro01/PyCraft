'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// CodeMirror (con Python y SQL) es lo más pesado de la batalla: se baja recién al
// montar el editor, así el resto de la pantalla del jefe aparece antes.
const CodeMirrorEditor = dynamic(() => import('./CodeMirrorEditor'), {
  ssr: false,
  loading: () => (
    <div
      style={{ minHeight: 190, padding: 14, background: 'hsl(var(--bg))', color: 'hsl(var(--tx3))', fontFamily: 'var(--font-vt323), monospace', fontSize: 20 }}
    >
      Cargando editor<span className="animate-caret" style={{ color: 'hsl(var(--accent))' }}>█</span>
    </div>
  ),
})
import { isPyodideLoaded, type SqlDetail } from '@/lib/game/executor'
import { getSeedTables, runSQL, type TableSnapshot } from '@/lib/game/executor/sql-runner'
import SqlTable from './sql/SqlTable'
import SqlResult from './sql/SqlResult'
import QueryBlocks from './sql/QueryBlocks'
import { IconGrid } from '@/components/ui/PixelIcons'
import { IconSnake, IconDatabase, IconCheck, IconX, IconSword } from '@/components/ui/PixelIcons'
import { LoadingBar } from '@/components/ui/LoadingBar'
import Win from '@/components/ui/Win'
import { sfx } from '@/lib/game/architect/sound'
import type { Boss, Challenge } from '@/types'

interface CodeEditorProps {
  boss: Boss
  challenge: Challenge
  onSubmit: (code: string) => void
  isLoading?: boolean
  lastResult?: {
    isCorrect: boolean
    output: string
    expected: string
    error: string | null
    sql?: SqlDetail
  } | null
  /** Pingüino Linux equipado. */
  penguin?: boolean
  /** Reemplazo de código desde afuera (Compu Hackeada) — cambia el nonce para aplicarlo. */
  codeReplace?: { code: string; nonce: number } | null
  /** Avisa cada cambio del código (lo usan el Pato Debug y la Compu). */
  onCodeChange?: (code: string) => void
  /** Banner encima del editor (ítems activos en este ataque: Zonda, Brócoli…). */
  banner?: React.ReactNode
}

export default function CodeEditor({
  boss,
  challenge,
  onSubmit,
  isLoading = false,
  lastResult,
  penguin = false,
  codeReplace,
  onCodeChange,
  banner,
}: CodeEditorProps) {
  const [code, setCode] = useState(challenge.initialCode)

  useEffect(() => { onCodeChange?.(code) }, [code, onCodeChange])

  useEffect(() => {
    if (codeReplace) setCode(codeReplace.code)
  }, [codeReplace])
  const [engineReady, setEngineReady] = useState(
    challenge.type === 'sql' ? true : isPyodideLoaded(),
  )

  // Poll until Pyodide finishes loading (only relevant for Python challenges)
  useEffect(() => {
    if (challenge.type !== 'python' || engineReady) return
    const id = setInterval(() => {
      if (isPyodideLoaded()) {
        setEngineReady(true)
        clearInterval(id)
      }
    }, 300)
    return () => clearInterval(id)
  }, [challenge.type, engineReady])

  // Reset code + engine state when challenge changes
  useEffect(() => {
    setCode(challenge.initialCode)
    setEngineReady(challenge.type === 'sql' ? true : isPyodideLoaded())
  }, [challenge.id, challenge.initialCode, challenge.type])

  // Tablas con las que arranca el desafío SQL: se muestran debajo de la consigna.
  // Se guardan junto al id del desafío: así nunca se muestran las tablas del desafío anterior.
  const [seed, setSeed] = useState<{ id: string; tables: TableSnapshot[] } | null>(null)
  useEffect(() => {
    let alive = true
    if (challenge.type === 'sql') getSeedTables(challenge.seedSQL).then((tables) => { if (alive) setSeed({ id: challenge.id, tables }) })
    return () => { alive = false }
  }, [challenge.id, challenge.type, challenge.seedSQL])
  const seedReady = seed?.id === challenge.id
  const seedTables = seedReady ? seed.tables : []

  // Pizarra de bloques (solo SQL junior): siempre arranca cerrada, para que la
  // pantalla muestre solo consigna → tabla → editor. En el primer desafío de cada
  // orden nueva ('open') el botón invita más fuerte.
  const [blocksOpen, setBlocksOpen] = useState(false)
  useEffect(() => { setBlocksOpen(false) }, [challenge.id])
  const showBlocks = challenge.type === 'sql' && !!challenge.blocks

  // El código con el que se atacó (el error SQL lo usa para detectar huecos ___).
  const [submitted, setSubmitted] = useState('')

  // Después de atacar, el resultado queda a la vista aunque esté debajo del borde.
  const resultRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (lastResult) resultRef.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [lastResult])

  const handleSubmit = () => {
    if (!isLoading && engineReady) {
      sfx.attack()
      setSubmitted(code)
      onSubmit(code)
    }
  }

  const isPython = challenge.type === 'python'
  const typeColor = `hsl(var(--${isPython ? 'python' : 'sql'}))`

  const vt = 'var(--font-vt323), monospace'
  const jersey = 'var(--font-jersey), monospace'

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Consigna del desafío */}
      <Win
        title="DESAFIO.TXT"
        bodyStyle={{ padding: 14 }}
        className="shrink-0"
      >
        <h3 style={{ fontFamily: jersey, fontSize: 24, lineHeight: 1.05, color: 'hsl(var(--tx))', margin: 0 }}>{challenge.title}</h3>
        <p className="mt-1.5" style={{ fontFamily: vt, fontSize: 21, lineHeight: 1.22, color: 'hsl(var(--tx2))', maxWidth: '78ch' }}>{withCodeChips(challenge.description)}</p>
        {seedTables.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-4 items-start">
            {seedTables.map((t) => (
              <SqlTable key={t.name} label={t.name} isTable columns={t.columns} rows={t.rows} maxHeight={168} />
            ))}
          </div>
        )}
      </Win>

      {banner}

      {showBlocks && blocksOpen && seedReady && (
        <QueryBlocks
          key={challenge.id}
          initialCode={challenge.initialCode}
          tables={seedTables}
          onTry={async (sql) => {
            const r = await runSQL(sql, challenge.seedSQL)
            return { sql: { columns: r.columns, rows: r.rows, changes: r.changes ?? [], schema: r.schema ?? [], fromVerify: false }, error: r.error }
          }}
          onClose={() => setBlocksOpen(false)}
        />
      )}

      {/* Editor */}
      <Win
        title={isPython ? 'SCRIPT.PY' : 'QUERY.SQL'}
        active
        className="flex-1 min-h-0"
        right={
          <>
            {showBlocks && !blocksOpen && (
              <button type="button" className={`blk-open${challenge.blocks === 'open' ? ' blk-open--invite' : ''}`} onClick={() => setBlocksOpen(true)}>
                <IconGrid size={12} color="currentColor" /> {challenge.blocks === 'open' ? '¿Te trabás? Armalo con bloques' : 'Armar con bloques'}
              </button>
            )}
            <span className="hidden sm:inline" style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.1em', color: 'hsl(var(--bg))' }}>Ctrl+Enter para atacar</span>
          </>
        }
        bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
      >
        <CodeMirrorEditor
          value={code}
          onChange={setCode}
          language={challenge.type}
          onCtrlEnter={handleSubmit}
          className="flex-1 overflow-hidden"
          accentColor={boss.color}
          penguin={penguin}
        />
      </Win>

      {/* Result panel */}
      {lastResult && (
        <div ref={resultRef} className="shrink-0" style={{ scrollMarginBottom: 72 }}>
        <Win
          title={lastResult.error ? 'ERROR.EXE' : lastResult.isCorrect ? 'CORRECTO.EXE' : 'INCORRECTO.EXE'}
          tone={lastResult.isCorrect && !lastResult.error ? 'safe' : 'danger'}
          active
          className="shrink-0"
          bodyStyle={{ padding: 12, fontFamily: vt, fontSize: 19 }}
        >
          {lastResult.sql && !isPython ? (
            <>
              <div className="flex items-center gap-1.5 mb-2.5" style={{ color: lastResult.isCorrect && !lastResult.error ? 'hsl(var(--accent))' : 'hsl(var(--danger))', fontFamily: jersey, fontSize: 19 }}>
                {lastResult.isCorrect && !lastResult.error
                  ? <><IconCheck size={11} color="hsl(var(--accent))" /> ¡Correcto! Daño aplicado.</>
                  : lastResult.error
                    ? <><IconX size={11} color="hsl(var(--danger))" /> SQL no pudo ejecutar tu orden</>
                    : <><IconX size={11} color="hsl(var(--danger))" /> Todavía no es lo que pide el jefe</>}
              </div>
              <SqlResult isCorrect={lastResult.isCorrect} error={lastResult.error} expected={lastResult.expected} sql={lastResult.sql} code={submitted} seedTables={seedTables} />
            </>
          ) : lastResult.error ? (
            <>
              <div className="flex items-center gap-1.5 mb-1.5" style={{ color: 'hsl(var(--danger))', fontFamily: jersey, fontSize: 18 }}>
                <IconX size={11} color="hsl(var(--danger))" /> Error de ejecución
              </div>
              <pre className="whitespace-pre-wrap break-all" style={{ color: 'hsl(var(--danger))', fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11, lineHeight: 1.5 }}>
                {lastResult.error}
              </pre>
            </>
          ) : lastResult.isCorrect ? (
            <>
              <div className="flex items-center gap-1.5 mb-1.5" style={{ color: 'hsl(var(--accent))', fontFamily: jersey, fontSize: 18 }}>
                <IconCheck size={11} color="hsl(var(--accent))" /> ¡Correcto! Daño aplicado.
              </div>
              <div style={{ color: 'hsl(var(--tx3))' }} className="mb-1">Salida:</div>
              <pre className="whitespace-pre-wrap break-all" style={{ color: 'hsl(var(--tx))', fontFamily: vt, fontSize: 20 }}>{lastResult.output || '(vacío)'}</pre>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-1.5" style={{ color: 'hsl(var(--danger))', fontFamily: jersey, fontSize: 18 }}>
                <IconX size={11} color="hsl(var(--danger))" /> La salida no coincide
              </div>
              <div style={{ color: 'hsl(var(--tx3))' }} className="mb-1">Tu salida:</div>
              <pre className="whitespace-pre-wrap break-all" style={{ color: 'hsl(var(--tx))', fontFamily: vt, fontSize: 20 }}>{lastResult.output || '(vacío)'}</pre>
              <div style={{ color: 'hsl(var(--tx3))' }} className="mt-2 mb-1">Esperada:</div>
              <pre className="whitespace-pre-wrap break-all" style={{ color: 'hsl(var(--tx2))', fontFamily: vt, fontSize: 20 }}>{lastResult.expected}</pre>
            </>
          )}
        </Win>
        </div>
      )}

      {/* Pyodide loading notice (Python challenges, first visit) */}
      {!engineReady && challenge.type === 'python' && (
        <Win title="MOTOR_PYTHON.EXE" className="shrink-0" bodyStyle={{ padding: 12 }}>
          <LoadingBar label="Cargando motor Python (Pyodide)..." size="sm" estimatedMs={10000} />
          <p className="mt-2" style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>La primera vez tarda ~10 s. Después queda listo.</p>
        </Win>
      )}

      {/* Attack button */}
      <button
        className="btn-primary w-full justify-center shrink-0 active:scale-95 transition-transform duration-75"
        style={{ fontSize: 20, padding: '10px 16px' }}
        onClick={handleSubmit}
        disabled={isLoading || !engineReady}
      >
        {isLoading ? (
          <LoadingBar label="Ejecutando" size="xs" tone="current" estimatedMs={1500} />
        ) : !engineReady ? (
          <LoadingBar label="Motor cargando" size="xs" tone="current" estimatedMs={10000} />
        ) : (
          <><IconSword size={14} color="hsl(var(--bg))" /> Atacar</>
        )}
      </button>
    </div>
  )
}

/** `código` dentro de una consigna → chip de código (en vez de mostrar los backticks). */
function withCodeChips(text: string): React.ReactNode {
  const parts = text.split('`')
  if (parts.length < 3) return text
  return parts.map((p, i) => (i % 2 === 1 ? <code key={i} className="code-chip">{p}</code> : p))
}
