'use client'

import { formatPythonError } from '../python-errors'

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
// por cada salto de línea real que se escribe a stdout.
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

    // input() del alumno nunca llega acá: el wrapper lo reemplaza (ver
    // CAPTURE_WRAPPER). Esto solo atiende a quien lea sys.stdin a mano, que
    // recibe "fin de archivo" en vez de la ventanita nativa del navegador.
    instance.setStdin({ stdin: () => null })

    pyodideInstance = instance
    return instance
  })()

  return loadingPromise
}

export interface PythonRunResult {
  /** Lo que imprimió, en texto plano (con lo que contestó en cada input()).
   *  Si hubo error, es lo que alcanzó a imprimir antes de fallar. */
  output: string
  /** Lo mismo, pero con cada respuesta de input() entre ANSWER_START y
   *  ANSWER_END — para que la consola pinte distinto lo que tecleó el alumno. */
  display: string
  error: string | null
}

export const ANSWER_START = '\u0002'
export const ANSWER_END = '\u0003'

/** Contesta un input(): recibe el texto de la pregunta y lo que se imprimió
 *  hasta ahí (con marcas). Devuelve lo que escribió el alumno, o null si
 *  apretó Detener. */
export type AskInput = (prompt: string, displaySoFar: string) => Promise<string | null>

// Cómo funciona input() sin la ventanita nativa del navegador:
//
// Pyodide corre en el hilo de la página, así que Python no puede quedarse
// "esperando" a que el alumno escriba en un campo de la consola (el campo ni
// se podría dibujar). En vez de eso, el programa se corre de nuevo cada vez
// que hace falta una respuesta: input() contesta con las respuestas que ya
// juntamos y, cuando se le acaban, frena todo con _PideInput. Ahí la consola
// muestra la pregunta con un cursor, el alumno escribe, y se vuelve a correr
// desde el principio con una respuesta más. Como cada vuelta repite
// exactamente lo mismo hasta ese punto, para el alumno es un programa que se
// pausa y sigue:
//   - random arranca con la misma semilla en todas las vueltas de una ejecución;
//   - los archivos (inventario.db, etc.) vuelven a como estaban al apretar
//     Ejecutar antes de cada vuelta, para que un INSERT antes del input() no
//     se haga dos veces.
//
// Freno para bucles infinitos: un sys.settrace mira el reloj en cada línea del
// código del alumno (solo de '<alumno>', no de la librería estándar) y corta
// con _Freno si pasa del límite. _Freno hereda de BaseException para que un
// `except Exception:` del alumno no lo trague. También se corta si imprime
// demasiadas líneas (un print dentro de un bucle infinito llena la consola
// mucho antes de llegar al límite de tiempo).
const CAPTURE_WRAPPER = `
import sys, time, builtins, os, random

_LIMITE_SEG = 3.0
_LIMITE_LINEAS = 2000

class _Freno(BaseException):
    pass

class _PideInput(BaseException):
    pass

# Archivos como estaban al apretar Ejecutar — ver el comentario de arriba.
if not _replay:
    _fs_snap = {}
    for _n in os.listdir('.'):
        if os.path.isfile(_n):
            with open(_n, 'rb') as _f:
                _fs_snap[_n] = _f.read()
else:
    for _n in os.listdir('.'):
        if os.path.isfile(_n) and _n not in _fs_snap:
            os.remove(_n)
    for _n, _b in _fs_snap.items():
        with open(_n, 'wb') as _f:
            _f.write(_b)

random.seed(_seed)
_respuestas = list(_answers)
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
    if not _respuestas:
        raise _PideInput(str(prompt))
    line = _respuestas.pop(0)
    builtins.print(str(prompt) + '\\u0002' + line + '\\u0003')
    return line

def _custom_print(*args, **kwargs):
    global _lineas
    _lineas += 1
    if _lineas > _LIMITE_LINEAS:
        raise _Freno('lineas')
    builtins.print(*args, **kwargs)

_pyerr = None
_err = None
_pending = None
try:
    _compiled = compile(_user_code, '<alumno>', 'exec')
    sys.settrace(_tracer)
    try:
        exec(_compiled, {'__name__': '__main__', 'input': _custom_input, 'print': _custom_print})
    finally:
        sys.settrace(None)
except _PideInput as _e:
    _pending = str(_e)
except _Freno as _e:
    if str(_e) == 'lineas':
        _pyerr = 'Tu programa imprimió más de ' + str(_LIMITE_LINEAS) + ' líneas y lo frenamos. ¿Hay un bucle que nunca termina? Fijate que la variable del while cambie en cada vuelta.'
    else:
        _pyerr = 'Tu programa tardó más de ' + str(int(_LIMITE_SEG)) + ' segundos y lo frenamos. ¿Hay un bucle que nunca termina? Fijate que la variable del while cambie en cada vuelta.'
except SyntaxError as _e:
    # Incluye IndentationError y TabError (son subclases): se informa el nombre real.
    _err = (type(_e).__name__, _e.msg or str(_e), _e.lineno)
except Exception as _e:
    # El mensaje sale de traceback (no de str()) para que traiga las
    # sugerencias de Python 3.12 ("Did you mean: 'print'?"), y la línea es la
    # última del código del alumno en la pila (no la de la librería estándar).
    import traceback
    _te = traceback.TracebackException.from_exception(_e)
    _txt = ''.join(_te.format_exception_only()).strip().split('\\n')[0]
    _nombre = type(_e).__module__ + '.' + type(_e).__name__ if type(_e).__module__ == 'sqlite3' else type(_e).__name__
    _cab = _txt.split(': ', 1)
    _msg = _cab[1] if len(_cab) == 2 and ' ' not in _cab[0] else str(_e)
    _linea = None
    for _fr, _ln in traceback.walk_tb(_e.__traceback__):
        if _fr.f_code.co_filename == '<alumno>':
            _linea = _ln
    _err = (_nombre, _msg, _linea)
finally:
    sys.stdout.flush()
`

/** Sin `ask`, input() no tiene quién le conteste (batallas, repasos, hechizos). */
export const NO_INPUT_ERROR = 'InputNoDisponible: acá input() no puede preguntarte nada, los datos ya vienen en el desafío. Usá un valor fijo (input() lo podés probar en el Patio de prácticas).'
export const STOPPED_ERROR = 'Detuviste el programa mientras esperaba una respuesta de input().'

/** Más respuestas que esto es casi seguro un bucle con input() que no termina. */
const MAX_ANSWERS = 200

/** Si el programa falló después de imprimir muchísimo (un bucle infinito con
 *  print), alcanza con mostrar el final, que es lo que está junto al error. */
const ERROR_TAIL = 200

function lastLines(s: string, n: number): string {
  const lines = s.split('\n')
  if (lines.length <= n) return s
  return [`… (${lines.length - n} líneas más arriba)`, ...lines.slice(-n)].join('\n')
}

export function stripAnswerMarks(s: string): string {
  return s.split(ANSWER_START).join('').split(ANSWER_END).join('')
}

// sqlite3 no viene en la biblioteca estándar de Pyodide: es un paquete aparte
// que hay que cargar antes del primer `import sqlite3` (si no, tira
// ModuleNotFoundError). Se baja una sola vez, y solo si el código lo usa —
// los jefes del Acto III y los libros de la Biblioteca.
let sqlitePromise: Promise<unknown> | null = null

export async function runPython(code: string, opts: { ask?: AskInput } = {}): Promise<PythonRunResult> {
  const py = await getPyodide()
  if (/\bsqlite3\b/.test(code)) {
    sqlitePromise ??= py.loadPackage('sqlite3').catch((e) => { sqlitePromise = null; throw e })
    try { await sqlitePromise } catch { return { output: '', display: '', error: 'No se pudo cargar sqlite3. Revisá la conexión a internet y probá de nuevo.' } }
  }

  // Pass user code as a Python variable to avoid any escaping issues
  py.globals.set('_user_code', code)
  py.globals.set('_seed', Math.floor(Math.random() * 2 ** 31))
  const answers: string[] = []

  for (;;) {
    py.globals.set('_answers', answers)
    py.globals.set('_replay', answers.length > 0)
    outputChunks = []
    try {
      await py.runPythonAsync(CAPTURE_WRAPPER)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { output: '', display: '', error: msg }
    }
    const display = outputChunks.join('\n').trim()
    // Con error igual se devuelve lo que alcanzó a imprimir antes, como en una
    // terminal: el alumno ve hasta dónde llegó su programa.
    const err = pyStr(py.globals.get('_pyerr')) ?? readError(py.globals.get('_err'))
    if (err !== null) {
      const shown = lastLines(display, ERROR_TAIL)
      return { output: stripAnswerMarks(shown), display: shown, error: err }
    }

    const pending = pyStr(py.globals.get('_pending'))
    if (pending === null) return { output: stripAnswerMarks(display), display, error: null }

    if (!opts.ask) return { output: stripAnswerMarks(display), display, error: NO_INPUT_ERROR }
    if (answers.length >= MAX_ANSWERS) {
      return { output: stripAnswerMarks(lastLines(display, ERROR_TAIL)), display: lastLines(display, ERROR_TAIL), error: `Tu programa pidió más de ${MAX_ANSWERS} respuestas y lo frenamos. ¿Hay un bucle con input() que nunca termina?` }
    }
    const answer = await opts.ask(pending, display)
    if (answer === null) return { output: stripAnswerMarks(display), display, error: STOPPED_ERROR }
    answers.push(answer)
  }
}

// _err es una tupla (nombre, mensaje en inglés, línea) — acá se traduce.
function readError(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const proxy = v as { toJs?: () => unknown; destroy?: () => void }
  if (typeof proxy.toJs !== 'function') return null
  const [name, msg, line] = proxy.toJs() as [string, string, number | null | undefined]
  proxy.destroy?.()
  return formatPythonError(String(name), String(msg ?? ''), typeof line === 'number' ? line : null)
}

// None de Python llega como undefined/null (o como el texto 'None' según el proxy).
function pyStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v)
  return s === 'None' ? null : s
}

export function preloadPyodide(): void {
  if (typeof window !== 'undefined') {
    getPyodide().catch(() => {})
  }
}

export function isPyodideLoaded(): boolean {
  return pyodideInstance !== null
}
