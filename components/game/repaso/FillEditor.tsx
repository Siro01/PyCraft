'use client'

import { Fragment, useEffect, useRef } from 'react'
import { tokenize } from '@/components/game/LessonWindow'
import type { RepasoLang } from '@/lib/game/repasos'
import { sfx } from '@/lib/game/architect/sound'

const vt = 'var(--font-vt323), monospace'

interface Props {
  template: string
  lang: RepasoLang
  values: string[]
  onChange: (values: string[]) => void
  /** Enter adentro de un hueco = ejecutar. */
  onSubmit: () => void
  locked: boolean
  /** Huecos marcados como incorrectos tras ejecutar (se pintan en peligro). */
  wrong?: boolean
}

// El código del paso con los huecos `___` convertidos en casilleros para
// escribir. Mismo lienzo que el bloque de código de los Apuntes (VT323,
// número de línea, colores de sintaxis), así el alumno ve "código de verdad"
// y no un formulario. Tab salta al hueco siguiente; Enter ejecuta.
export default function FillEditor({ template, lang, values, onChange, onSubmit, locked, wrong }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const lines = template.split('\n')

  useEffect(() => {
    if (!locked) refs.current.find((el) => el && !el.value)?.focus()
  }, [template, locked])

  let blank = 0
  return (
    <div className="repaso-editor" aria-label="Código para completar">
      {lines.map((ln, i) => {
        const parts = ln.split('___')
        return (
          <div key={i} className="repaso-editor-line">
            <span className="repaso-editor-num" aria-hidden="true">{i + 1}</span>
            <code style={{ whiteSpace: 'pre', fontFamily: vt }}>
              {parts.map((part, j) => {
                const tokens = part === '' ? [] : tokenize(part, lang)
                const n = j < parts.length - 1 ? blank++ : -1
                return (
                  <Fragment key={j}>
                    {tokens.map((tk, k) => (
                      <span key={k} style={tk.c ? { color: tk.c, fontWeight: tk.c === 'hsl(var(--accent))' ? 700 : undefined } : undefined}>{tk.t}</span>
                    ))}
                    {n >= 0 && (
                      <input
                        ref={(el) => { refs.current[n] = el }}
                        className={`repaso-blank${wrong ? ' repaso-blank--wrong' : ''}${locked ? ' repaso-blank--ok' : ''}`}
                        value={values[n] ?? ''}
                        disabled={locked}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        aria-label={`Hueco ${n + 1}`}
                        size={Math.max(3, (values[n] ?? '').length + 1)}
                        onChange={(e) => {
                          sfx.chalk()
                          const next = [...values]
                          next[n] = e.target.value
                          onChange(next)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); onSubmit() }
                        }}
                      />
                    )}
                  </Fragment>
                )
              })}
              {ln === '' && ' '}
            </code>
          </div>
        )
      })}
    </div>
  )
}
