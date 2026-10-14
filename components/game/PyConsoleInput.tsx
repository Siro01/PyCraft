'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ANSWER_END, ANSWER_START, type AskInput } from '@/lib/game/executor/pyodide-runner'
import { sfx } from '@/lib/game/architect/sound'

// input() dentro de la consola: en vez de la ventanita nativa del navegador,
// la pregunta aparece como una línea más de la salida, con un cursor donde el
// alumno escribe y aprieta Enter — como en una terminal de verdad. Lo usan el
// Patio de prácticas y los ejemplos de la Biblioteca.

export interface PendingInput {
  prompt: string
  /** Lo que el programa imprimió antes de preguntar (con marcas de respuestas). */
  soFar: string
}

/** Conecta runPython({ ask }) con la consola: mientras `pending` no sea null,
 *  la consola tiene que mostrar <ConsoleAsk>. */
export function usePythonInput() {
  const [pending, setPending] = useState<PendingInput | null>(null)
  const resolver = useRef<((v: string | null) => void) | null>(null)

  const ask: AskInput = useCallback((prompt, soFar) => new Promise((resolve) => {
    resolver.current = resolve
    setPending({ prompt, soFar })
  }), [])

  const settle = useCallback((value: string | null) => {
    const r = resolver.current
    resolver.current = null
    setPending(null)
    r?.(value)
  }, [])

  // Si se desmonta esperando, el programa se da por detenido.
  useEffect(() => () => { resolver.current?.(null) }, [])

  return { ask, pending, reply: (v: string) => settle(v), stop: () => settle(null) }
}

/** Una línea de salida: lo que contestó el alumno en un input() va resaltado. */
export function ConsoleLine({ text }: { text: string }) {
  if (!text.includes(ANSWER_START)) return <>{text || ' '}</>
  const parts: React.ReactNode[] = []
  let rest = text
  let k = 0
  while (rest.includes(ANSWER_START)) {
    const a = rest.indexOf(ANSWER_START)
    const b = rest.indexOf(ANSWER_END, a)
    parts.push(rest.slice(0, a))
    const answer = rest.slice(a + 1, b === -1 ? undefined : b)
    parts.push(<span key={k++} className="py-answer" title="Lo que escribiste">{answer || ' '}</span>)
    rest = b === -1 ? '' : rest.slice(b + 1)
  }
  parts.push(rest)
  return <>{parts}</>
}

/** Toda la salida, línea por línea. */
export function ConsoleOutput({ display, lineClassName }: { display: string; lineClassName?: string }) {
  if (!display) return null
  return <>{display.split('\n').map((l, i) => <div key={i} className={lineClassName}><ConsoleLine text={l} /></div>)}</>
}

/** La pregunta de input() con su cursor, al final de la consola. */
export function ConsoleAsk({ prompt, onReply, onStop }: { prompt: string; onReply: (v: string) => void; onStop: () => void }) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.scrollIntoView({ block: 'nearest' })
    sfx.select()
  }, [])

  const submit = () => {
    sfx.type('machine')
    onReply(value)
  }

  return (
    <div className="py-ask">
      <label className="py-ask-line">
        {prompt && <span className="py-ask-prompt">{prompt}</span>}
        <input
          ref={inputRef}
          className="py-ask-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); submit() }
            else if (e.key === 'Escape') { e.preventDefault(); onStop() }
          }}
          placeholder="escribí acá…"
          aria-label={prompt ? `Respuesta para: ${prompt}` : 'Respuesta para input()'}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      <div className="py-ask-hint">
        <span className="py-ask-tag">Python te pregunta</span>
        <span>escribí tu respuesta y apretá</span>
        <button type="button" className="py-ask-btn py-ask-btn--go" onClick={submit}>Enter ↵</button>
        <button type="button" className="py-ask-btn" onClick={onStop}>■ Detener</button>
      </div>
    </div>
  )
}
