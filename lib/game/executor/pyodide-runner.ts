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
  setStdin: (opts: { stdin: () => string | null }) => void
  setStdout: (opts: { batched: (msg: string) => void }) => void
}

// Todo lo que Python imprime llega acá — Pyodide llama a `batched` una vez
// por cada salto de línea real que se escribe a stdout, agrupando cualquier
// texto sin '\n' (como el prompt de input(), que se imprime con end='') con
// lo próximo que sí lo tenga. Por eso el eco de la respuesta de input() no
// se hace empujando texto desde acá (llegaría en cualquier momento, sin
// relación con cuándo Python realmente flushea) sino desde adentro de
// Python mismo — ver CAPTURE_WRAPPER más abajo.
let outputChunks: string[] = []

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

    instance.setStdout({ batched: (msg) => { outputChunks.push(msg) } })

    // input() pide el valor con el prompt nativo del navegador — es síncrono,
    // así que Python se queda esperando la respuesta como esperaría un alumno.
    // Ninguno de los desafíos de jefe usa input() (se corrigen por output
    // exacto), así que esto no les cambia nada; solo lo necesita el patio de
    // prácticas, donde el alumno escribe input() libremente.
    instance.setStdin({
      stdin: () => {
        // Si el navegador bloquea las ventanas nativas (algunos entornos
        // embebidos las deshabilitan), window.prompt() puede tirar en vez de
        // devolver null — sin este try, Pyodide lo convierte en un OSError
        // genérico e ilegible para un chico. Con el catch, input() devuelve
        // string vacío, como si el alumno hubiera apretado Enter sin escribir nada.
        //
        // Ojo: mientras esta función corre, el GIL de Python está liberado
        // (Python está bloqueado esperando la línea) — tocar cualquier
        // PyProxy acá (sys.stdout, etc.) tira NoGilError. Por eso el único
        // trabajo de este callback es devolver el valor; el eco se hace del
        // lado de Python, después, con el GIL ya recuperado.
        try {
          return window.prompt('Python pide un valor (input):') ?? ''
        } catch {
          return ''
        }
      },
    })

    pyodideInstance = instance
    return instance
  })()

  return loadingPromise
}

export interface PythonRunResult {
  output: string
  error: string | null
}

// input() del alumno no es el builtin: es este wrapper, que imprime el
// prompt y — clave — hace el eco de la respuesta con un print() normal
// DESPUÉS de leerla, cuando el GIL ya volvió a Python. Ese print(), al
// llevar un '\n' de verdad, cierra la línea "prompt + respuesta" en el
// batched() de arriba exactamente como se vería en una terminal real, y
// deja al próximo print() del alumno empezar en su propia línea.
const CAPTURE_WRAPPER = `
import sys

def _custom_input(prompt=''):
    print(prompt, end='', flush=True)
    line = sys.stdin.readline().rstrip('\\n')
    print(line)
    return line

_pyerr = None
try:
    exec(_user_code, {'__name__': '__main__', 'input': _custom_input})
except SyntaxError as _e:
    _pyerr = 'SyntaxError línea ' + str(_e.lineno) + ': ' + (_e.msg or str(_e))
except Exception as _e:
    _pyerr = type(_e).__name__ + ': ' + str(_e)
finally:
    sys.stdout.flush()
`

export async function runPython(code: string): Promise<PythonRunResult> {
  const py = await getPyodide()

  // Pass user code as a Python variable to avoid any escaping issues
  py.globals.set('_user_code', code)
  outputChunks = []

  try {
    await py.runPythonAsync(CAPTURE_WRAPPER)
    const err = py.globals.get('_pyerr')
    // None in Python becomes undefined/null in JS via Pyodide proxy
    if (err !== null && err !== undefined) {
      const errStr = String(err)
      if (errStr !== 'None') {
        return { output: '', error: errStr }
      }
    }
    return { output: outputChunks.join('\n').trim(), error: null }
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
