'use client'

import { useState, useEffect } from 'react'
import CodeMirrorEditor from './CodeMirrorEditor'
import { isPyodideLoaded } from '@/lib/game/executor'
import { IconSnake, IconDatabase, IconCheck, IconX, IconSword } from '@/components/ui/PixelIcons'
import { LoadingBar } from '@/components/ui/LoadingBar'
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

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Challenge header */}
      <div className="card p-4 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`badge ${isPython ? 'badge-python' : 'badge-sql'} mb-2`}>
              {challenge.type.toUpperCase()} · {challenge.tier.toUpperCase()}
            </span>
            <h3 className="font-mono text-sm font-bold text-tx">{challenge.title}</h3>
          </div>
          <div className="font-mono text-xs shrink-0" style={{ color: typeColor }}>
            -{challenge.damage} HP
          </div>
        </div>
        <p className="mt-2 text-sm text-tx2 leading-relaxed">{challenge.description}</p>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Tab bar */}
        <div
          className="flex items-center gap-2 px-3 py-2 bg-surface2 border border-border text-xs font-mono text-tx3 shrink-0"
          style={{ borderBottom: 'none' }}
        >
          <span className="inline-flex items-center gap-1.5" style={{ color: typeColor }}>
            {isPython ? <IconSnake size={12} color={typeColor} /> : <IconDatabase size={12} color={typeColor} />}
            {isPython ? 'script.py' : 'query.sql'}
          </span>
          <span className="ml-auto opacity-50">Ctrl+Enter para atacar</span>
        </div>

        {/* CodeMirror */}
        <CodeMirrorEditor
          value={code}
          onChange={setCode}
          language={challenge.type}
          onCtrlEnter={handleSubmit}
          className="flex-1 border border-border overflow-hidden"
          accentColor={boss.color}
        />
      </div>

      {/* Result panel */}
      {lastResult && (
        <div
          className={`card p-3 font-mono text-xs shrink-0 ${
            lastResult.error
              ? 'border-danger/40 bg-danger/5'
              : lastResult.isCorrect
              ? 'border-python/40 bg-python/5'
              : 'border-danger/40 bg-danger/5'
          }`}
        >
          {lastResult.error ? (
            <>
              <div className="flex items-center gap-1.5 font-bold mb-1.5 text-danger">
                <IconX size={11} color="hsl(var(--danger))" /> Error de ejecución
              </div>
              <pre className="text-danger/80 whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                {lastResult.error}
              </pre>
            </>
          ) : lastResult.isCorrect ? (
            <>
              <div className="flex items-center gap-1.5 font-bold mb-1.5 text-python">
                <IconCheck size={11} color="hsl(var(--python))" /> ¡Correcto! Daño aplicado.
              </div>
              <div className="text-tx3 mb-1">Output:</div>
              <pre className="text-tx whitespace-pre-wrap break-all">{lastResult.output || '(vacío)'}</pre>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 font-bold mb-1.5 text-danger">
                <IconX size={11} color="hsl(var(--danger))" /> Output incorrecto
              </div>
              <div className="text-tx3 mb-1">Tu output:</div>
              <pre className="text-tx whitespace-pre-wrap break-all">{lastResult.output || '(vacío)'}</pre>
              <div className="text-tx3 mt-2 mb-1">Esperado:</div>
              <pre className="text-tx2 whitespace-pre-wrap break-all">{lastResult.expected}</pre>
            </>
          )}
        </div>
      )}

      {/* Pyodide loading notice (Python challenges, first visit) */}
      {!engineReady && challenge.type === 'python' && (
        <div className="card p-3 shrink-0 border-accent/30 bg-accent/5">
          <LoadingBar label="Cargando motor Python (Pyodide)..." size="sm" estimatedMs={10000} />
          <p className="mt-2 font-mono text-[11px] text-tx3">La primera vez tarda ~10 s. Después queda listo.</p>
        </div>
      )}

      {/* Attack button */}
      <button
        className="btn-primary w-full justify-center font-mono shrink-0 active:scale-95 transition-transform duration-75"
        onClick={handleSubmit}
        disabled={isLoading || !engineReady}
      >
        {isLoading ? (
          <LoadingBar label="Ejecutando" size="xs" tone="current" estimatedMs={1500} />
        ) : !engineReady ? (
          <LoadingBar label="Motor cargando" size="xs" tone="current" estimatedMs={10000} />
        ) : (
          <><IconSword size={13} color="white" /> Atacar</>
        )}
      </button>
    </div>
  )
}
