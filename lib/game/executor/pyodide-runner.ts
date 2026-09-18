'use client'

// Pyodide singleton — loaded once per browser session from CDN, ~10 MB
let pyodideInstance: PyodideInstance | null = null
let loadingPromise: Promise<PyodideInstance> | null = null

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>
  globals: {
    get: (key: string) => unknown
    set: (key: string, value: unknown) => void
  }
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInstance>
  }
}

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      // Script tag already inserted — Pyodide may not be ready yet, so wait for it
      const check = () => {
        if (window.loadPyodide) resolve()
        else setTimeout(check, 50)
      }
      check()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`No se pudo cargar Pyodide desde ${src}`))
    document.head.appendChild(s)
  })
}

async function getPyodide(): Promise<PyodideInstance> {
  if (pyodideInstance) return pyodideInstance
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    await loadScript(`${PYODIDE_CDN}pyodide.js`)
    const instance = await window.loadPyodide!({ indexURL: PYODIDE_CDN })
    pyodideInstance = instance
    return instance
  })()

  return loadingPromise
}

export interface PythonRunResult {
  output: string
  error: string | null
}

const CAPTURE_WRAPPER = `
import sys, io as _io
_buf = _io.StringIO()
_old_stdout = sys.stdout
sys.stdout = _buf
_pyerr = None
try:
    exec(_user_code, {'__name__': '__main__'})
except SyntaxError as _e:
    _pyerr = 'SyntaxError línea ' + str(_e.lineno) + ': ' + (_e.msg or str(_e))
except Exception as _e:
    _pyerr = type(_e).__name__ + ': ' + str(_e)
finally:
    sys.stdout = _old_stdout
_pyout = _buf.getvalue()
`

export async function runPython(code: string): Promise<PythonRunResult> {
  const py = await getPyodide()

  // Pass user code as a Python variable to avoid any escaping issues
  py.globals.set('_user_code', code)

  try {
    await py.runPythonAsync(CAPTURE_WRAPPER)
    const output = String(py.globals.get('_pyout') ?? '')
    const err = py.globals.get('_pyerr')
    // None in Python becomes undefined/null in JS via Pyodide proxy
    if (err !== null && err !== undefined) {
      const errStr = String(err)
      if (errStr !== 'None') {
        return { output: '', error: errStr }
      }
    }
    return { output: output.trim(), error: null }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { output: '', error: msg }
  }
}

export function preloadPyodide(): void {
  if (typeof window !== 'undefined') {
    getPyodide().catch(() => {})
  }
}

export function isPyodideLoaded(): boolean {
  return pyodideInstance !== null
}
