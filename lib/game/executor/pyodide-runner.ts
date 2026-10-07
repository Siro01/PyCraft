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
  loadPackage: (names: string | string[]) => Promise<unknown>
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
//
// Freno para bucles infinitos: Pyodide corre en el hilo de la página, así que
// un `while` que nunca termina congelaba la pestaña sin forma de pararlo. Un
// sys.settrace mira el reloj en cada línea del código del alumno (solo de
// '<alumno>', no de la librería estándar) y corta con _Freno si pasa del
// límite. El tiempo esperando en input() no cuenta — el alumno puede tardar
// lo que quiera en contestar. _Freno hereda de BaseException para que un
// `except Exception:` del alumno no lo trague. También se corta si imprime
// demasiadas líneas (un print dentro de un bucle infinito llena la consola
// mucho antes de llegar al límite de tiempo).
const CAPTURE_WRAPPER = `
import sys, time, builtins

_LIMITE_SEG = 3.0
_LIMITE_LINEAS = 2000

class _Freno(BaseException):
    pass

_deadline = time.monotonic() + _LIMITE_SEG
_lineas = 0

def _tracer(frame, event, arg):
    if frame.f_code.co_filename != '<alumno>':
        return None
    return _tracer_local

def _tracer_local(frame, event, arg):
    if time.monotonic() > _deadline:
        raise _Freno('tiempo')
    return _tracer_local

def _custom_input(prompt=''):
    global _deadline
    _t0 = time.monotonic()
    print(prompt, end='', flush=True)
    line = sys.stdin.readline().rstrip('\\n')
    _deadline += time.monotonic() - _t0
    print(line)
    return line

def _custom_print(*args, **kwargs):
    global _lineas
    _lineas += 1
    if _lineas > _LIMITE_LINEAS:
        raise _Freno('lineas')
    builtins.print(*args, **kwargs)

_pyerr = None
try:
    _compiled = compile(_user_code, '<alumno>', 'exec')
    sys.settrace(_tracer)
    try:
        exec(_compiled, {'__name__': '__main__', 'input': _custom_input, 'print': _custom_print})
    finally:
        sys.settrace(None)
except _Freno as _e:
    if str(_e) == 'lineas':
        _pyerr = 'Tu programa imprimió más de ' + str(_LIMITE_LINEAS) + ' líneas y lo frenamos. ¿Hay un bucle que nunca termina? Fijate que la variable del while cambie en cada vuelta.'
    else:
        _pyerr = 'Tu programa tardó más de ' + str(int(_LIMITE_SEG)) + ' segundos y lo frenamos. ¿Hay un bucle que nunca termina? Fijate que la variable del while cambie en cada vuelta.'
except SyntaxError as _e:
    _pyerr = 'SyntaxError línea ' + str(_e.lineno) + ': ' + (_e.msg or str(_e))
except Exception as _e:
    _pyerr = type(_e).__name__ + ': ' + str(_e)
finally:
    sys.stdout.flush()
`

// sqlite3 no viene en la biblioteca estándar de Pyodide: es un paquete aparte
// que hay que cargar antes del primer `import sqlite3` (si no, tira
// ModuleNotFoundError). Se baja una sola vez, y solo si el código lo usa —
// los jefes del Acto III y los libros de la Biblioteca.
let sqlitePromise: Promise<unknown> | null = null

export async function runPython(code: string): Promise<PythonRunResult> {
  const py = await getPyodide()
  if (/\bsqlite3\b/.test(code)) {
    sqlitePromise ??= py.loadPackage('sqlite3').catch((e) => { sqlitePromise = null; throw e })
    try { await sqlitePromise } catch { return { output: '', error: 'No se pudo cargar sqlite3. Revisá la conexión a internet y probá de nuevo.' } }
  }

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
