'use client'

import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands'
import {
  indentOnInput,
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
} from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { tags as t } from '@lezer/highlight'

// ─── Theme — sigue los tokens del sitio; el acento es el color del jefe actual ──
// Fondo/gutter/texto salen de las CSS custom properties (se adaptan a los 3 temas
// del sitio), el caret/foco/selección/bracket-match toman el color del jefe.
function buildEditorTheme(accentColor: string) {
  return EditorView.theme(
    {
      '&': {
        fontSize: '13.5px',
        fontFamily: "'Courier New', Courier, monospace",
        background: 'hsl(var(--bg))',
        color: 'hsl(var(--tx))',
      },
      '.cm-content': {
        caretColor: accentColor,
        padding: '12px 0',
      },
      '.cm-scroller': {
        fontFamily: 'inherit',
        lineHeight: '1.75',
        overflow: 'auto',
      },
      // min-height so short files don't look empty
      '.cm-content, .cm-gutter': { minHeight: '200px' },
      '&.cm-focused': {
        outline: `1px solid ${accentColor}99`,
        boxShadow: `0 0 0 3px ${accentColor}1F`,
      },
      '&.cm-focused .cm-cursor': { borderLeftColor: accentColor },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        background: `${accentColor}38`,
      },
      // Gutter (line numbers)
      '.cm-gutters': {
        background: 'hsl(var(--surface2))',
        color: 'hsl(var(--tx3))',
        border: 'none',
        borderRight: '1px solid hsl(var(--border))',
      },
      '.cm-gutterElement': { padding: '0 10px 0 6px' },
      // Active line
      '.cm-activeLine': { background: `${accentColor}0F` },
      '.cm-activeLineGutter': {
        background: `${accentColor}18`,
        color: 'hsl(var(--tx2))',
      },
      // Bracket matching
      '.cm-matchingBracket': {
        background: `${accentColor}45`,
        outline: 'none',
      },
    },
    { dark: true },
  )
}

// ─── Syntax colours ───────────────────────────────────────────────────────────
// Todo por tokens del tema activo (BN / rojo / blanco): con colores fijos el
// texto quedaba casi invisible sobre el fondo blanco.
function buildHighlight(_accentColor: string) {
  return HighlightStyle.define([
    { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.operatorKeyword], color: 'hsl(var(--accent))', fontWeight: 'bold' },
    { tag: [t.string, t.special(t.string)], color: 'hsl(var(--python))' },
    { tag: t.number, color: 'hsl(var(--accent2))' },
    { tag: [t.bool, t.null], color: 'hsl(var(--accent))' },
    { tag: t.comment, color: 'hsl(var(--tx3))', fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.name), t.name], color: 'hsl(var(--tx))' },
    { tag: t.definition(t.variableName), color: 'hsl(var(--tx))' },
    { tag: [t.className, t.typeName], color: 'hsl(var(--tx2))' },
    { tag: [t.operator, t.punctuation], color: 'hsl(var(--tx2))' },
    { tag: t.variableName, color: 'hsl(var(--tx))' },
    { tag: t.propertyName, color: 'hsl(var(--tx))' },
  ])
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CodeMirrorEditorProps {
  value: string
  onChange: (val: string) => void
  language: 'python' | 'sql'
  onCtrlEnter?: () => void
  className?: string
  /** Boss identity color (hex, e.g. boss.color) — themes caret/focus/selection/brackets */
  accentColor: string
}

export default function CodeMirrorEditor({
  value,
  onChange,
  language,
  onCtrlEnter,
  className,
  accentColor,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Keep callbacks in refs so the editor extensions never go stale
  const onChangeRef = useRef(onChange)
  const onCtrlEnterRef = useRef(onCtrlEnter)
  useEffect(() => { onChangeRef.current = onChange })
  useEffect(() => { onCtrlEnterRef.current = onCtrlEnter })

  // Mount editor once — language extensions are fixed per boss fight
  useEffect(() => {
    if (!containerRef.current) return

    const langExt = language === 'python' ? python() : sql()

    const submitKey = keymap.of([
      {
        key: 'Ctrl-Enter',
        mac: 'Cmd-Enter',
        run: () => {
          onCtrlEnterRef.current?.()
          return true
        },
      },
    ])

    const onChange = EditorView.updateListener.of((update) => {
      if (update.docChanged) onChangeRef.current(update.state.doc.toString())
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        submitKey,
        keymap.of([indentWithTab, ...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),
        history(),
        langExt,
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        lineNumbers(),
        highlightActiveLine(),
        buildEditorTheme(accentColor),
        syntaxHighlighting(buildHighlight(accentColor)),
        onChange,
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, accentColor]) // Recreate when the language or the boss (= its color) changes

  // Sync value when challenge switches (CodeEditor resets code via state)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      className={className}
      // CodeMirror manages its own scroll; the wrapper just needs to fill available space
      style={{ overflow: 'hidden' }}
    />
  )
}
