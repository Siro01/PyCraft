// ─── La guía de AreaTrabajo: 4 capítulos, 10 pasos ──────────────────────────
// Qué pide cada paso, sus pistas, su plantilla con huecos y cuándo está hecho.
// Puro (sin React): lo usa AreaTrabajoApp y lo prueban los tests.
//
// Hay dos clases de pasos:
// · De estado (1, 2, 3, 6): se recalculan siempre. Si el alumno rompe algo que
//   estaba bien, el paso vuelve a "a medias" y Rodolfo avisa con calma.
// · De evento (4, 5, y los que vienen de la plataforma): quedan marcados una vez
//   que el alumno hizo la consulta, aunque después cambie el mazo.

import { COLORES, REGLAS, leerColor, validarMazo, type Problema } from './reglas'
import { revisarColumnas, type TablaCartas } from './mazo'

export type PasoId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
export type EstadoPaso = 'hecho' | 'medio' | 'pendiente'

export interface Paso {
  id: PasoId
  titulo: string
  consigna: string
  /** Qué hacer. */
  pista1: string
  /** Un ejemplo con OTROS datos. */
  pista2: string
  desafio?: string
  plantilla?: { lang: 'sql' | 'python'; codigo: string }
  /** El paso todavía no está programado (llega en otra entrega). */
  proximamente?: string
}

export interface Capitulo {
  id: 'crear' | 'balancear' | 'programar' | 'pelear'
  titulo: string
  pasos: PasoId[]
}

export const CAPITULOS: Capitulo[] = [
  { id: 'crear', titulo: 'CREAR', pasos: [1, 2, 3] },
  { id: 'balancear', titulo: 'BALANCEAR', pasos: [4, 5, 6] },
  { id: 'programar', titulo: 'PROGRAMAR', pasos: [7, 8] },
  { id: 'pelear', titulo: 'PELEAR', pasos: [9, 10] },
]

export const marcador = (id: PasoId, lang: 'sql' | 'python') => (lang === 'sql' ? `-- PASO ${id} --` : `# --- PASO ${id} ---`)

export const PASOS: Record<PasoId, Paso> = {
  1: {
    id: 1,
    titulo: 'Tu tema',
    consigna: 'Ponele nombre a tu mazo. El alias es cómo vas a aparecer en la muestra.',
    pista1: 'Escribí el título en el primer casillero de este paso. El lema y el alias son opcionales.',
    pista2: 'Por ejemplo: "Robots de Chatarra", con el lema "Hechos con lo que sobró".',
  },
  2: {
    id: 2,
    titulo: 'Tu tabla',
    consigna: 'Creá la tabla cartas con las 6 columnas del juego y una columna inventada por vos.',
    pista1: 'Completá el hueco del final con el nombre de tu columna y su tipo: INTEGER si es un número, TEXT si es una palabra.',
    pista2: 'Una tabla de mascotas podría terminar en: ..., color TEXT, edad INTEGER);',
    plantilla: {
      lang: 'sql',
      codigo: `CREATE TABLE cartas (
  id INTEGER PRIMARY KEY,
  nombre TEXT,
  tipo TEXT,
  poder INTEGER,
  rareza TEXT,
  color TEXT,
  ___ ___
);`,
    },
  },
  3: {
    id: 3,
    titulo: 'La mesa: 6 cartas',
    consigna: 'Cargá tus 6 cartas con INSERT. Usá por lo menos 2 colores distintos.',
    pista1: `rareza: 'comun', 'rara', 'epica' o 'legendaria'. color: 'liso', 'rayas', 'damero' u 'ondas'. Poder de 1 a 10.`,
    pista2: `INSERT INTO cartas
  (nombre, tipo, poder, rareza, color, edad)
VALUES
  ('Gato Ninja', 'mascota', 4, 'comun', 'rayas', 3),
  ('Perro Mago', 'mascota', 6, 'rara', 'ondas', 5);`,
    desafio: 'Que haya los 4 colores en tu mazo.',
    plantilla: {
      lang: 'sql',
      codigo: `INSERT INTO cartas
  (nombre, tipo, poder, rareza, color, ___)
VALUES
  ('___', '___', ___, '___', '___', ___),
  ('___', '___', ___, '___', '___', ___);`,
    },
  },
  4: {
    id: 4,
    titulo: 'Leé las reglas',
    consigna: 'Las reglas del juego también son una tabla. Miralas con un SELECT.',
    pista1: 'La tabla se llama reglas. Completá el hueco con su nombre.',
    pista2: 'Para ver todo de una tabla: SELECT * FROM trofeos;',
    desafio: "SELECT valor FROM economia WHERE clave = 'presupuesto';",
    plantilla: { lang: 'sql', codigo: 'SELECT *\nFROM ___;' },
  },
  5: {
    id: 5,
    titulo: 'Cazá las cartas rotas',
    consigna: 'Buscá con WHERE las cartas que se pasan de su tope, y sumá el poder de todo el mazo con SUM.',
    pista1: 'El tope de una común es 5. Poné ese número en el hueco y fijate qué cartas aparecen.',
    pista2: "Para las raras sería: SELECT nombre, poder FROM cartas WHERE rareza = 'rara' AND poder > 7;",
    desafio: 'Una sola consulta que encuentre las rotas de todas las rarezas a la vez (con OR).',
    plantilla: {
      lang: 'sql',
      codigo: `SELECT nombre, poder
FROM cartas
WHERE rareza = 'comun'
  AND poder > ___;

SELECT SUM(poder)
FROM cartas;`,
    },
  },
  6: {
    id: 6,
    titulo: 'Arreglá y elegí tu orden',
    consigna: `Arreglá las cartas rotas hasta que el mazo sume ${REGLAS.presupuesto} o menos. Después guardá tu orden de batalla.`,
    pista1: 'Una carta rota se arregla bajándole el poder o subiéndole la rareza. El orden de batalla es un SELECT * FROM cartas ORDER BY …',
    pista2: `UPDATE cartas
SET poder = 3
WHERE nombre = 'Gato Ninja';`,
    desafio: 'Ordená por color para encadenar ventajas.',
    plantilla: {
      lang: 'sql',
      codigo: `UPDATE cartas
SET poder = ___
WHERE nombre = '___';

SELECT *
FROM cartas
ORDER BY ___ DESC;`,
    },
  },
  7: {
    id: 7,
    titulo: 'Tu carta en Python',
    consigna: 'Escribí la función carta(fila), que devuelve cómo se ve tu carta en texto. La plataforma la prueba sola con una carta tuya.',
    pista1: "Completá los huecos: el nombre de la tabla en el SELECT, y las columnas nombre y poder adentro de fila['...'].",
    pista2: "Con una tabla de mascotas sería: | {fila['nombre']} y | Edad: {fila['edad']}",
    desafio: 'Una barra de poder: "█" * fila["poder"]',
    plantilla: {
      lang: 'python',
      codigo: `import sqlite3

con = sqlite3.connect("reino.db")
filas = con.execute("SELECT * FROM ___").fetchall()

def carta(fila):
    texto = f"""
+------------------------+
| {fila['___']}
| Tipo: {fila['tipo']}   Color: {fila['color']}
| Poder: {fila['___']}
| Rareza: {fila['rareza']}
+------------------------+"""
    return texto

for fila in filas:
    print(carta(fila))`,
    },
  },
  8: {
    id: 8,
    titulo: 'Tu revisor de reglas',
    consigna: 'Escribí revisar(fila), que devuelve True si la carta cumple las reglas y False si está rota. La plataforma la prueba con 4 cartas: 2 bien y 2 rotas.',
    pista1: 'La tabla reglas tiene la columna poder_max. Una carta cumple si su poder es 1 o más Y no pasa del tope: el hueco del if es and. El último hueco es False.',
    pista2: 'Con números sueltos: if 3 >= 1 and 3 <= 5: da True. if 8 >= 1 and 8 <= 5: da False.',
    desafio: 'Que revisar también controle que el color sea liso, rayas, damero u ondas.',
    plantilla: {
      lang: 'python',
      codigo: `topes = {}
for regla in con.execute("SELECT * FROM reglas").fetchall():
    topes[regla["rareza"]] = regla["___"]

def revisar(fila):
    tope = topes[fila["rareza"]]
    if fila["poder"] >= 1 ___ fila["poder"] <= tope:
        return True
    else:
        return ___

for fila in filas:
    if revisar(fila):
        print("OK  ", fila["nombre"])
    else:
        print("ROTA", fila["nombre"])`,
    },
  },
  9: {
    id: 9,
    titulo: 'Probá en la arena',
    consigna: 'Jugá una partida entera contra la CPU con el botón ⚔ PROBAR de abajo. Ganar o perder da lo mismo.',
    pista1: 'En cada ronda elegís una carta de tu mano. La CPU ya eligió: arriba muestra el color de la carta que va a jugar.',
    pista2: 'Liso le gana a rayas, rayas a damero, damero a ondas y ondas a liso: el que tiene ventaja suma +4.',
    desafio: 'Ganarle al Jefe de práctica.',
  },
  10: {
    id: 10,
    titulo: 'Publicá',
    consigna: 'Publicá tu mazo para la muestra: así lo pueden jugar los visitantes.',
    pista1: 'El botón PUBLICAR se habilita cuando los pasos 1 a 9 están hechos y el mazo cumple las reglas.',
    pista2: 'Si después cambiás algo, lo podés volver a publicar las veces que quieras.',
    desafio: 'Tu propia estrategia: la función elegir(mi_mano, mano_rival).',
  },
}

// ─── Arreglo guiado: de una regla rota a la consulta que la arregla ──────────

const txt = (s: string) => s.replace(/'/g, "''")

/** `WHERE` de la carta rota; si la carta no tiene nombre, queda el hueco. */
const dondeCarta = (nombre: string) => (/^La carta \d+$/.test(nombre) ? "WHERE nombre = '___'" : `WHERE nombre = '${txt(nombre)}'`)

/**
 * La consulta (en el formato de las clases) que arregla un problema, con la
 * carta ya puesta y solo el valor nuevo como hueco. El alumno completa y ejecuta:
 * el arreglo lo sigue escribiendo él. `columnas` son las de su tabla (para el INSERT).
 */
export function arregloSql(p: Problema, columnas: string[] = []): string | null {
  switch (p.tipo) {
    case 'poderAlto':
      return `-- ${p.rareza}: de ${REGLAS.poderMin} a ${REGLAS.rarezas[p.rareza].poderMax}\nUPDATE cartas\nSET poder = ___\n${dondeCarta(p.carta)};`
    case 'poderBajo':
      return `-- el mínimo es ${REGLAS.poderMin}\nUPDATE cartas\nSET poder = ___\n${dondeCarta(p.carta)};`
    case 'poderInvalido':
      return `-- un número entero, sin comillas\nUPDATE cartas\nSET poder = ___\n${dondeCarta(p.carta)};`
    case 'rarezaDesconocida':
      return `-- ${RAREZAS_TXT}\nUPDATE cartas\nSET rareza = '___'\n${dondeCarta(p.carta)};`
    case 'colorDesconocido':
      return `-- ${COLORES.join(', ')}\nUPDATE cartas\nSET color = '___'\n${dondeCarta(p.carta)};`
    case 'rarezaDeMas':
      return `-- cambiale la rareza a alguna ${p.rareza}\nUPDATE cartas\nSET rareza = '___'\nWHERE nombre = '___';`
    case 'presupuesto':
      return `-- bajá ${p.total - REGLAS.presupuesto} de poder en total\nUPDATE cartas\nSET poder = ___\nWHERE nombre = '___';`
    case 'cantidad': {
      if (p.cartas > REGLAS.cartasPorMazo) return "DELETE FROM cartas\nWHERE nombre = '___';"
      const cols = columnas.filter((c) => c.toLowerCase() !== 'id')
      if (!cols.length) return null
      const fila = `  (${cols.map((c) => (c.toLowerCase() === 'poder' ? '___' : "'___'")).join(', ')})`
      const filas = Array.from({ length: REGLAS.cartasPorMazo - p.cartas }, () => fila).join(',\n')
      return `INSERT INTO cartas\n  (${cols.join(', ')})\nVALUES\n${filas};`
    }
  }
}

const RAREZAS_TXT = 'comun, rara, epica o legendaria'

// ─── Eventos: consultas que marcan pasos ─────────────────────────────────────

/** Marcas que quedan guardadas en el proyecto (area_proyectos.pasos). */
/** 'jefe' = le ganó al Jefe de práctica (el ⭐ del paso 9). */
export type Marcas = Partial<Record<'reglas' | 'where' | 'sum' | '7' | '8' | '9' | '10' | 'jefe' | 'elegir', true>>

const sinComentarios = (s: string) => s.replace(/--[^\n]*/g, ' ').trim()

/** Mira una orden que salió bien y devuelve las marcas nuevas que gana. */
export function marcasDe(stmt: string): Marcas {
  const s = sinComentarios(stmt)
  if (!/^SELECT\b/i.test(s)) return {}
  const out: Marcas = {}
  if (/\bFROM\s+["`[]?reglas\b/i.test(s) || /\bFROM\s+["`[]?economia\b/i.test(s)) out.reglas = true
  if (/\bFROM\s+["`[]?cartas\b/i.test(s)) {
    if (/\bWHERE\b/i.test(s)) out.where = true
    if (/\bSUM\s*\(/i.test(s)) out.sum = true
  }
  return out
}

/** ¿Es una consulta que sirve como orden de batalla? (SELECT de cartas con ORDER BY) */
export function esOrdenBatalla(stmt: string): boolean {
  const s = sinComentarios(stmt)
  return /^SELECT\b/i.test(s) && /\bFROM\s+["`[]?cartas\b/i.test(s) && /\bORDER\s+BY\b/i.test(s)
}

// ─── Estado de cada paso ─────────────────────────────────────────────────────

export interface EstadoGuia {
  titulo: string
  tabla: TablaCartas | null
  marcas: Marcas
  /** El orden de batalla guardado corre sin errores y trae los ids. */
  ordenOk: boolean
}

export function estadoPaso(id: PasoId, e: EstadoGuia): EstadoPaso {
  switch (id) {
    case 1:
      return e.titulo.trim() ? 'hecho' : 'pendiente'
    case 2: {
      if (!e.tabla) return 'pendiente'
      const { faltan, inventadas } = revisarColumnas(e.tabla.columnas)
      return faltan.length === 0 && inventadas.length >= 1 ? 'hecho' : 'medio'
    }
    case 3: {
      if (!e.tabla || e.tabla.filas.length === 0) return 'pendiente'
      const colores = new Set(e.tabla.filas.map((f) => leerColor(f.color)).filter(Boolean))
      return e.tabla.filas.length === REGLAS.cartasPorMazo && colores.size >= 2 ? 'hecho' : 'medio'
    }
    case 4:
      return e.marcas.reglas ? 'hecho' : 'pendiente'
    case 5:
      return e.marcas.where && e.marcas.sum ? 'hecho' : e.marcas.where || e.marcas.sum ? 'medio' : 'pendiente'
    case 6: {
      const valido = !!e.tabla && validarMazo(e.tabla.filas).ok
      return valido && e.ordenOk ? 'hecho' : valido || e.ordenOk ? 'medio' : 'pendiente'
    }
    default:
      return e.marcas[String(id) as '7'] ? 'hecho' : 'pendiente'
  }
}

export function estadosGuia(e: EstadoGuia): Record<PasoId, EstadoPaso> {
  const out = {} as Record<PasoId, EstadoPaso>
  for (const c of CAPITULOS) for (const id of c.pasos) out[id] = estadoPaso(id, e)
  return out
}

/** El primer paso que falta (para abrir la guía ahí). */
export function pasoActual(estados: Record<PasoId, EstadoPaso>): PasoId {
  for (const c of CAPITULOS) for (const id of c.pasos) if (estados[id] !== 'hecho' && !PASOS[id].proximamente) return id
  return 6
}

/** Lo que le falta al paso, en palabras de Rodolfo (para el aviso al romperse o la ayuda). */
export function queFalta(id: PasoId, e: EstadoGuia): string | null {
  switch (id) {
    case 1: return e.titulo.trim() ? null : 'Ponele un título a tu mazo.'
    case 2: {
      if (!e.tabla) return 'Todavía no existe la tabla cartas.'
      const { faltan, inventadas } = revisarColumnas(e.tabla.columnas)
      if (faltan.length) return `A tu tabla le falta${faltan.length > 1 ? 'n' : ''} ${faltan.join(', ')}.`
      return inventadas.length ? null : 'Falta tu columna inventada.'
    }
    case 3: {
      const n = e.tabla?.filas.length ?? 0
      if (n > REGLAS.cartasPorMazo) return `Tu mazo tiene ${n} cartas: sacá ${n - REGLAS.cartasPorMazo} con DELETE.`
      if (n < REGLAS.cartasPorMazo) return `Tenés ${n} carta${n === 1 ? '' : 's'}: te falta${REGLAS.cartasPorMazo - n === 1 ? '' : 'n'} ${REGLAS.cartasPorMazo - n}.`
      const colores = new Set(e.tabla!.filas.map((f) => leerColor(f.color)).filter(Boolean))
      return colores.size >= 2 ? null : `Usá por lo menos 2 colores (${COLORES.join(', ')}).`
    }
    case 5:
      if (!e.marcas.where) return 'Falta un SELECT con WHERE sobre tus cartas.'
      return e.marcas.sum ? null : 'Falta sumar el poder con SUM(poder).'
    case 6: {
      const v = e.tabla ? validarMazo(e.tabla.filas) : null
      if (!v?.ok) return v?.problemas[0]?.mensaje ?? 'Tu mazo todavía no cumple las reglas.'
      return e.ordenOk ? null : 'Falta guardar tu orden de batalla (un SELECT * FROM cartas ORDER BY …).'
    }
    case 7: return e.marcas['7'] ? null : 'Completá la plantilla y ejecutala: la plataforma prueba tu carta() con una carta tuya.'
    case 8: return e.marcas['8'] ? null : 'Completá la plantilla y ejecutala: la plataforma prueba tu revisar() con 4 cartas.'
    case 9: return e.marcas['9'] ? null : 'Jugá una partida entera en la arena de prueba (botón ⚔ abajo).'
    case 10: return e.marcas['10'] ? null : 'Cuando tengas los pasos 1 a 9, apretá PUBLICAR (abajo).'
    default: return null
  }
}
