'use client'

import { useEffect, useRef, useState } from 'react'
import { StatusMark } from '@/components/ui/StatusMark'
import { PixelBitmap, ICON_CLOSE, ICON_MAXIMIZE, ICON_MINIMIZE } from '@/components/game/architect/desktop/PixelBitmap'

// probar.py: la terminal de la landing. Arranca escribiendo un programita de
// sqlite3 y después deja declarar una variable de Python.

const CODE_LINES = [
  { text: 'import sqlite3',         color: 'hsl(var(--accent))' },
  { text: '',                       color: '' },
  { text: 'conn = sqlite3.connect(":memory:")', color: 'hsl(var(--tx2))' },
  { text: 'cursor = conn.cursor()', color: 'hsl(var(--tx2))' },
  { text: '',                       color: '' },
  { text: 'cursor.execute("SELECT * FROM jefes")', color: 'hsl(var(--python))' },
  { text: '# → 14 jefes derrotados [OK]', color: 'hsl(var(--tx3))' },
]

// ── Mini validador de asignaciones de Python ────────────────────────────────
// No ejecuta código real (esto es la landing, no el motor Pyodide del juego):
// valida con reglas simples una línea "nombre = valor" y devuelve mensajes de
// error pensados para alguien que recién está aprendiendo, no un traceback real.
const PY_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
  'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
  'try', 'while', 'with', 'yield',
])

interface AttemptResult {
  input: string
  ok: boolean
  message: string
}

function checkAssignment(raw: string): AttemptResult {
  const input = raw.trim()

  if (!input) {
    return { input, ok: false, message: 'Escribí algo para probar. Ej: nombre = "Ada"' }
  }
  if (/^print\s*\(/.test(input)) {
    return { input, ok: false, message: 'Por ahora practiquemos declarar una variable. Probá: edad = 12' }
  }
  if (!input.includes('=') || input.includes('==')) {
    return { input, ok: false, message: 'Te falta el signo = para asignar un valor. Ej: edad = 12' }
  }

  const eqIdx = input.indexOf('=')
  const name = input.slice(0, eqIdx).trim()
  const value = input.slice(eqIdx + 1).trim()

  if (!name) return { input, ok: false, message: 'Falta el nombre de la variable antes del =' }
  if (!value) return { input, ok: false, message: `Falta el valor después del =. Ej: ${name} = "Ada"` }
  if (/\s/.test(name)) return { input, ok: false, message: 'El nombre de variable no puede tener espacios — usá guión bajo: mi_nombre' }
  if (/^\d/.test(name)) return { input, ok: false, message: `Una variable no puede empezar con un número: "${name}"` }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return { input, ok: false, message: `"${name}" no es un nombre válido — solo letras, números y _` }
  if (PY_KEYWORDS.has(name)) return { input, ok: false, message: `"${name}" es una palabra reservada de Python, elegí otro nombre` }

  if (/^(["']).*\1$/.test(value)) {
    return { input, ok: true, message: `${name} = ${value} → texto (str) creado ✓` }
  }
  if (/^["']/.test(value) || /["']$/.test(value)) {
    return { input, ok: false, message: 'Las comillas no cierran bien. Si es texto, escribilo así: "Ada"' }
  }
  if (/^-?\d+$/.test(value)) {
    return { input, ok: true, message: `${name} = ${value} → número entero (int) creado ✓` }
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return { input, ok: true, message: `${name} = ${value} → número decimal (float) creado ✓` }
  }
  if (value === 'True' || value === 'False') {
    return { input, ok: true, message: `${name} = ${value} → booleano (bool) creado ✓` }
  }
  return { input, ok: false, message: `Si "${value}" es texto, ponelo entre comillas: ${name} = "${value}"` }
}

/** `bare`: sin marco ni barra propia, para ir adentro de una ventana del escritorio. */
export function CodeTerminal({ visible, bare = false }: { visible: boolean; bare?: boolean }) {
  const [linesShown, setLinesShown] = useState(0)
  const [history, setHistory] = useState<AttemptResult[]>([])
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setLinesShown(CODE_LINES.length); return }
    let i = 0
    const iv = setInterval(() => {
      i++
      setLinesShown(i)
      if (i >= CODE_LINES.length) clearInterval(iv)
    }, 280)
    return () => clearInterval(iv)
  }, [visible])

  const bootDone = linesShown >= CODE_LINES.length

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history, bootDone])

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!draft.trim()) return
    setHistory((prev) => [...prev.slice(-4), checkAssignment(draft)])
    setDraft('')
  }

  return (
    <div
      className="font-mono text-xs leading-relaxed text-left"
      style={bare
        ? { background: 'hsl(var(--bg))', border: '2px solid hsl(var(--border2))', minHeight: 160 }
        : { background: 'hsl(var(--bg))', border: '2px solid hsl(var(--tx))', boxShadow: '6px 6px 0 hsl(var(--tx) / 0.2)', minHeight: 160 }}
    >
      {/* Barra de la ventana: título a la izquierda y los botones del sistema a la derecha, como toda AppWindow */}
      {!bare && (
        <div
          className="hatch flex items-center gap-3 px-3"
          style={{ height: 30, borderBottom: '2px solid hsl(var(--tx))' }}
        >
          <span
            style={{
              fontFamily: 'var(--font-jersey), monospace', fontSize: 15, letterSpacing: '0.06em', lineHeight: 1,
              background: 'hsl(var(--surface))', color: 'hsl(var(--tx))', padding: '2px 8px',
            }}
          >
            PYTHON_SQL.EXE
          </span>
          <span style={{ flex: 1 }} />
          <span className="flex gap-1" aria-hidden="true">
            {[ICON_MINIMIZE, ICON_MAXIMIZE, ICON_CLOSE].map((rows, i) => (
              <span key={i} className="flex items-center justify-center" style={{ width: 20, height: 20, background: 'hsl(var(--surface))', border: '1px solid hsl(var(--tx))' }}>
                <PixelBitmap rows={rows} scale={2} ink="hsl(var(--tx))" />
              </span>
            ))}
          </span>
        </div>
      )}

      <div className="p-5">
      <div ref={scrollRef} style={{ maxHeight: 210, overflowY: 'auto' }} className="no-scrollbar">
        {CODE_LINES.slice(0, linesShown).map((line, i) => (
          <div key={i} style={{ color: line.color || 'transparent', minHeight: '1.4em' }}>
            {line.text || ' '}
          </div>
        ))}
        {linesShown < CODE_LINES.length && linesShown > 0 && (
          <span className="opacity-60">█</span>
        )}

        {bootDone && (
          <>
            <div className="mt-3 mb-2" style={{ color: 'hsl(var(--tx3))' }}>
              Probá vos: declará tu primera variable
            </div>
            {history.map((h, i) => (
              <div key={i} className="mb-1.5">
                <div style={{ color: 'hsl(var(--tx2))' }}>&gt;&gt;&gt; {h.input}</div>
                <div style={{ color: h.ok ? 'hsl(var(--python))' : 'hsl(var(--danger))' }}>
                  <StatusMark ok={h.ok} scale={2} />{h.message.replace(/ ✓$/, '')}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {bootDone && (
        <div className="flex items-center gap-1.5 mt-1">
          <span style={{ color: 'hsl(var(--tx2))' }}>&gt;&gt;&gt;</span>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit(e)
            }}
            placeholder='nombre = "Ada"'
            aria-label="Terminal interactiva: declará tu primera variable de Python"
            spellCheck={false}
            autoComplete="off"
            autoFocus={bare}
            className="flex-1 bg-transparent outline-none font-mono text-xs"
            style={{ color: 'hsl(var(--tx))', caretColor: 'hsl(var(--accent))' }}
          />
        </div>
      )}
      </div>
    </div>
  )
}

export default function ProbarWindow() {
  return <CodeTerminal visible bare />
}
