'use client'

import { useState, useEffect } from 'react'
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
import { isPyodideLoaded } from '@/lib/game/executor'
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
  } | null
}

export default function CodeEditor({
  boss,
  challenge,
  onSubmit,
  isLoading = false,
  lastResult,
}: CodeEditorProps) {
  const [code, setCode] = useState(challenge.initialCode)
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

  const handleSubmit = () => {
    if (!isLoading && engineReady) {
      sfx.attack()
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
        right={
          <span style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.12em', color: 'hsl(var(--tx2))' }}>
            {challenge.type.toUpperCase()} · {challenge.tier.toUpperCase()} · -{challenge.damage} HP
          </span>
        }
        bodyStyle={{ padding: 14 }}
        className="shrink-0"
      >
        <h3 style={{ fontFamily: jersey, fontSize: 24, lineHeight: 1.05, color: 'hsl(var(--tx))', margin: 0 }}>{challenge.title}</h3>
        <p className="mt-1.5" style={{ fontFamily: vt, fontSize: 21, lineHeight: 1.22, color: 'hsl(var(--tx2))', maxWidth: '78ch' }}>{challenge.description}</p>
      </Win>

      {/* Editor */}
      <Win
        title={isPython ? 'SCRIPT.PY' : 'QUERY.SQL'}
        active
        className="flex-1 min-h-0"
        right={<span className="hidden sm:inline" style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.1em', color: 'hsl(var(--bg))' }}>Ctrl+Enter para atacar</span>}
        bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
      >
        <CodeMirrorEditor
          value={code}
          onChange={setCode}
          language={challenge.type}
          onCtrlEnter={handleSubmit}
          className="flex-1 overflow-hidden"
          accentColor={boss.color}
        />
      </Win>

      {/* Result panel */}
      {lastResult && (
        <Win
          title={lastResult.error ? 'ERROR.EXE' : lastResult.isCorrect ? 'CORRECTO.EXE' : 'INCORRECTO.EXE'}
          tone={lastResult.isCorrect && !lastResult.error ? 'safe' : 'danger'}
          active
          className="shrink-0"
          bodyStyle={{ padding: 12, fontFamily: vt, fontSize: 19 }}
        >
          {lastResult.error ? (
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
