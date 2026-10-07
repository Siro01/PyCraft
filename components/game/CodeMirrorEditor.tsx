'use client'

import { useEffect, useRef } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, Decoration, type DecorationSet } from '@codemirror/view'
import { EditorState, Compartment, StateField, RangeSetBuilder } from '@codemirror/state'
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
import { penguinAutocomplete } from '@/lib/game/items/penguin-completions'

// ─── Theme — sigue los tokens del sitio; el acento es el color del jefe actual ──
// Fondo/gutter/texto salen de las CSS custom properties (se adaptan a los 3 temas
// del sitio), el caret/foco/selección/bracket-match toman el color del jefe.
function buildEditorTheme(accentColor: string, fillHeight: boolean) {
  return EditorView.theme(
    {
      '&': {
        fontSize: '13.5px',
        fontFamily: "'Courier New', Courier, monospace",
        background: 'hsl(var(--bg))',
        color: 'hsl(var(--tx))',
        // Por defecto el editor crece con el contenido (como siempre, en las
        // batallas). Con fillHeight ocupa el 100% del contenedor — lo usa el
        // patio de prácticas en pantalla completa, donde si no quedaba un
        // editor chico de 3 líneas perdido en medio de una ventana enorme.
        ...(fillHeight ? { height: '100%' } : {}),
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
      '.cm-content, .cm-gutter': { minHeight: fillHeight ? '100%' : '200px' },
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
      '.cm-marked-line': { background: `${accentColor}1F`, borderLeft: `4px solid ${accentColor}`, paddingLeft: '2px' },
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

// Líneas marcadas (la Biblioteca resalta las líneas que importan en cada paso).
// Viajan con el texto: si el alumno agrega una línea arriba, la marca baja con ella.
const markedLine = Decoration.line({ class: 'cm-marked-line' })
function markLinesField(lines: number[]) {
  return StateField.define<DecorationSet>({
    create(state) {
      const b = new RangeSetBuilder<Decoration>()
      for (const n of [...lines].sort((x, y) => x - y)) {
        if (n >= 1 && n <= state.doc.lines) { const l = state.doc.line(n); b.add(l.from, l.from, markedLine) }
      }
      return b.finish()
    },
    update(deco, tr) { return deco.map(tr.changes) },
    provide: (f) => EditorView.decorations.from(f),
  })
}

interface CodeMirrorEditorProps {
  value: string
  onChange: (val: string) => void
  language: 'python' | 'sql'
  onCtrlEnter?: () => void
  className?: string
  /** Boss identity color (hex, e.g. boss.color) — themes caret/focus/selection/brackets */
  accentColor: string
  /** Ocupa el 100% del contenedor en vez de crecer solo con el contenido — para pantalla completa. */
  fillHeight?: boolean
  /** Pingüino Linux equipado: sugerencias de autocompletado con su ícono. */
  penguin?: boolean
  /** Resaltar la línea del cursor (apagado en la Biblioteca, para no competir con las líneas marcadas). */
  activeLine?: boolean
  /** Líneas (desde 1) que arrancan resaltadas. Se leen al montar: para cambiarlas, remontá con otro `key`. */
  markLines?: number[]
}

export default function CodeMirrorEditor({
  value,
  onChange,
  language,
  onCtrlEnter,
  className,
  accentColor,
  fillHeight = false,
  penguin = false,
  markLines,
  activeLine = true,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // El pingüino se prende/apaga en caliente (se equipa en medio de la batalla) sin recrear el editor.
  const penguinSlot = useRef(new Compartment())
  const penguinRef = useRef(penguin)
  penguinRef.current = penguin

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
        ...(activeLine ? [highlightActiveLine()] : []),
        buildEditorTheme(accentColor, fillHeight),
        syntaxHighlighting(buildHighlight(accentColor)),
        penguinSlot.current.of(penguinRef.current ? penguinAutocomplete(language) : []),
        ...(markLines?.length ? [markLinesField(markLines)] : []),
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
  }, [language, accentColor, fillHeight]) // Recreate when the language, el jefe (= su color) o fillHeight cambian

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: penguinSlot.current.reconfigure(penguin ? penguinAutocomplete(language) : []),
    })
  }, [penguin, language])

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
      style={{ overflow: 'hidden', ...(fillHeight ? { height: '100%' } : {}) }}
    />
  )
}
