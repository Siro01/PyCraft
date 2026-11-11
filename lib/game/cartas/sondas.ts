// ─── Sondas: la plataforma prueba las funciones del alumno ──────────────────
// Código Python que corre DESPUÉS del programa del alumno, en su mismo espacio
// de nombres (ver `sonda` en pyodide-runner). Llama a carta() y revisar() con
// filas reales y de prueba, y deja el resultado en JSON. El árbitro es la
// plataforma: el código del alumno nunca se juzga a sí mismo.

import { REGLAS } from './reglas'
import { MAZOS_CPU } from './cpu'

/** Las 4 cartas de prueba de revisar(): 2 cumplen y 2 están rotas. */
export const FILAS_PRUEBA_REVISAR = [
  { nombre: 'Prueba Común', rareza: 'comun', poder: 3, esperado: true },
  { nombre: 'Prueba Rara', rareza: 'rara', poder: REGLAS.rarezas.rara.poderMax, esperado: true },
  { nombre: 'Prueba Común Rota', rareza: 'comun', poder: REGLAS.rarezas.comun.poderMax + 3, esperado: false },
  { nombre: 'Prueba Épica sin poder', rareza: 'epica', poder: 0, esperado: false },
] as const

/** Un valor JS como literal de Python (JSON con True/False/None). */
export function aPython(v: unknown): string {
  if (v === null || v === undefined) return 'None'
  if (typeof v === 'boolean') return v ? 'True' : 'False'
  if (typeof v === 'number' || typeof v === 'string') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(aPython).join(', ')}]`
  return `{${Object.entries(v as Record<string, unknown>).map(([k, x]) => `${JSON.stringify(k)}: ${aPython(x)}`).join(', ')}}`
}

export const SONDA_PROGRAMAR = `
import json, sqlite3
_res = {}
_salida = []
_print_alumno = globals().get('print')
def _guardar_print(*a, **k):
    _salida.append(' '.join(str(x) for x in a))
globals()['print'] = _guardar_print

def _probar(nombre, fn):
    try:
        _reiniciar_reloj()
        _res[nombre] = fn()
    except _Freno:
        _res[nombre] = {'ok': False, 'motivo': 'tiempo'}
    except Exception as e:
        _res[nombre] = {'ok': False, 'motivo': 'error', 'detalle': type(e).__name__ + ': ' + str(e)}

def _fila_real():
    try:
        return sqlite3.connect('reino.db').execute('SELECT * FROM cartas').fetchone()
    except Exception:
        return None

def _probar_carta():
    f = globals().get('carta')
    if not callable(f):
        return {'ok': False, 'motivo': 'falta'}
    fila = _fila_real()
    if fila is None:
        return {'ok': False, 'motivo': 'sin_cartas'}
    del _salida[:]
    r = f(fila)
    texto = r if isinstance(r, str) else '\\n'.join(_salida)
    return {'ok': str(fila['nombre']) in texto, 'motivo': None if str(fila['nombre']) in texto else 'sin_nombre', 'nombre': str(fila['nombre'])}

_PRUEBAS = ${aPython(FILAS_PRUEBA_REVISAR.map((f, i) => ({ id: 900 + i, nombre: f.nombre, tipo: 'prueba', poder: f.poder, rareza: f.rareza, color: 'liso', esperado: f.esperado })))}

def _probar_revisar():
    f = globals().get('revisar')
    if not callable(f):
        return {'ok': False, 'motivo': 'falta'}
    aciertos = 0
    fallas = []
    for p in _PRUEBAS:
        esperado = p['esperado']
        fila = sqlite3.Fila({k: v for k, v in p.items() if k != 'esperado'}) if hasattr(sqlite3, 'Fila') else {k: v for k, v in p.items() if k != 'esperado'}
        r = f(fila)
        if not isinstance(r, bool):
            return {'ok': False, 'motivo': 'no_bool', 'devolvio': type(r).__name__}
        if r == esperado:
            aciertos += 1
        else:
            fallas.append(p['nombre'])
    return {'ok': aciertos == len(_PRUEBAS), 'aciertos': aciertos, 'total': len(_PRUEBAS), 'fallas': fallas}

_RIVAL = ${aPython(MAZOS_CPU.find((m) => m.id === 'jefe')!.cartas.map((c) => ({ id: 800 + c.id, nombre: c.nombre, tipo: c.tipo, poder: c.poder, rareza: c.rareza, color: c.color })))}

def _probar_elegir():
    f = globals().get('elegir')
    if not callable(f):
        return {'ok': False, 'motivo': 'falta'}
    try:
        mias = sqlite3.connect('reino.db').execute('SELECT * FROM cartas').fetchall()
    except Exception:
        mias = []
    if not mias:
        return {'ok': False, 'motivo': 'sin_cartas'}
    rival = [sqlite3.Fila(c) if hasattr(sqlite3, 'Fila') else dict(c) for c in _RIVAL]
    # Tres momentos de una partida: mano llena, a la mitad y con una sola carta.
    for mano, otra in ((mias, rival), (mias[:3], rival[:3]), (mias[:1], rival[:2])):
        r = f(list(mano), list(otra))
        ids = [c['id'] for c in mano]
        try:
            ok = r is not None and r['id'] in ids
        except Exception:
            ok = False
        if not ok:
            return {'ok': False, 'motivo': 'no_en_mano', 'devolvio': type(r).__name__}
    return {'ok': True}

try:
    _probar('carta', _probar_carta)
    _probar('revisar', _probar_revisar)
    _probar('elegir', _probar_elegir)
finally:
    globals()['print'] = _print_alumno

_pycraft_result = json.dumps(_res)
`

export interface ResultadoFuncion {
  ok: boolean
  motivo?: 'falta' | 'sin_cartas' | 'sin_nombre' | 'tiempo' | 'error' | 'no_bool' | 'no_en_mano' | null
  detalle?: string
  nombre?: string
  aciertos?: number
  total?: number
  fallas?: string[]
  devolvio?: string
}

export interface ResultadoProgramar {
  carta?: ResultadoFuncion
  revisar?: ResultadoFuncion
  elegir?: ResultadoFuncion
  error?: string
}

/** Lo que dice Rodolfo sobre cada función, en palabras de chico. null si anda. */
export function explicarCarta(r: ResultadoFuncion | undefined): string | null {
  if (!r || r.ok) return null
  switch (r.motivo) {
    case 'falta': return 'Todavía no hay una función carta. Escribila con def carta(fila):'
    case 'sin_cartas': return 'Tu tabla cartas está vacía: cargá cartas con SQL primero.'
    case 'sin_nombre': return `carta(fila) tiene que devolver un texto que tenga el nombre de la carta (${r.nombre ?? 'el nombre'}). ¿Pusiste fila['nombre'] y el return?`
    case 'tiempo': return 'carta() tardó demasiado y la frenamos. ¿Hay un bucle que nunca termina?'
    default: return `carta() dio un error: ${r.detalle ?? 'revisala'}.`
  }
}

export function explicarRevisar(r: ResultadoFuncion | undefined): string | null {
  if (!r || r.ok) return null
  switch (r.motivo) {
    case 'falta': return 'Todavía no hay una función revisar. Escribila con def revisar(fila):'
    case 'no_bool': return `revisar(fila) tiene que devolver True o False con return, y devolvió ${r.devolvio === 'NoneType' ? 'nada (None)' : `un ${r.devolvio}`}.`
    case 'tiempo': return 'revisar() tardó demasiado y la frenamos. ¿Hay un bucle que nunca termina?'
    case 'error': return `revisar() dio un error: ${r.detalle ?? 'revisala'}.`
    default: {
      const n = r.aciertos ?? 0
      return `Probé revisar() con ${r.total ?? 4} cartas y acertó ${n}. Se equivocó con: ${(r.fallas ?? []).join(', ')}. Acordate: el poder va de 1 hasta el tope de su rareza.`
    }
  }
}

// ─── Al publicar: el texto de carta(fila) de cada carta ─────────────────────
// La presentación de la muestra lo muestra en "Así lo programé". Si carta()
// no existe o falla, esa carta queda sin texto (no frena la publicación).
export const SONDA_TEXTOS = `
import json, sqlite3
_textos = {}
_salida = []
_print_alumno = globals().get('print')
def _guardar_print(*a, **k):
    _salida.append(' '.join(str(x) for x in a))
globals()['print'] = _guardar_print
try:
    _f = globals().get('carta')
    if callable(_f):
        for _fila in sqlite3.connect('reino.db').execute('SELECT * FROM cartas').fetchall():
            try:
                _reiniciar_reloj()
                del _salida[:]
                _r = _f(_fila)
                _t = _r if isinstance(_r, str) else '\\n'.join(_salida)
                _textos[str(_fila['id'])] = _t[:600]
            except _Freno:
                pass
            except Exception:
                pass
finally:
    globals()['print'] = _print_alumno
_pycraft_result = json.dumps(_textos)
`

export function explicarElegir(r: ResultadoFuncion | undefined): string | null {
  if (!r || r.ok) return null
  switch (r.motivo) {
    case 'falta': return 'Todavía no hay una función elegir. Escribila con def elegir(mi_mano, mano_rival):'
    case 'no_en_mano': return `elegir() tiene que devolver UNA carta de mi_mano (con return), y devolvió ${r.devolvio === 'NoneType' ? 'nada (None)' : `un ${r.devolvio}`}.`
    case 'tiempo': return 'elegir() tardó demasiado y la frenamos. ¿Hay un bucle que nunca termina?'
    case 'sin_cartas': return 'Para probar elegir() hacen falta cartas en tu tabla.'
    default: return `elegir() dio un error: ${r.detalle ?? 'revisala'}.`
  }
}

/** La plantilla del desafío ⭐ (paso 10): la estrategia propia. */
export const PLANTILLA_ELEGIR = `# --- DESAFÍO · Tu estrategia ---
# mi_mano y mano_rival son listas de cartas (diccionarios) que todavía no se jugaron.
# Tenés que devolver UNA carta de mi_mano.
def elegir(mi_mano, mano_rival):
    mejor = mi_mano[0]
    for c in mi_mano:
        if c["poder"] ___ mejor["poder"]:
            mejor = c
    return ___
`
