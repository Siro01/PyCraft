// Ejercicios de La Arena: plantillas con datos al azar.
//
// Cada plantilla está atada a un jefe (su tema) y, con una semilla, arma un
// ejercicio corto con el estilo de los desafíos junior de challenges.ts:
// completar los huecos `___`. La salida esperada se calcula ACÁ, en
// TypeScript (sin correr Python ni SQL), para que el servidor la pueda
// guardar sin mostrársela a nadie. `solution` es el código resuelto: no viaja
// al navegador en un duelo, solo lo usa /demo/arena para comprobar que cada
// plantilla da exactamente la salida esperada.
//
// Agregar una plantilla: sumarla a TEMPLATES con su bossId. Si un tema no
// tiene plantillas, no aparece en la arena.

import { ARENA_EXERCISES, ARENA_MIX } from './rules'
import type { Boss, ChallengeType } from '@/types'

export interface ArenaExercise {
  id: string
  bossId: string
  type: ChallengeType
  title: string
  description: string
  initialCode: string
  seedSQL?: string
  verifySQL?: string
  expectedOutput: string
  solution: string
}

/** Lo que ve el navegador durante un duelo: sin la salida esperada ni la solución. */
export type PublicArenaExercise = Omit<ArenaExercise, 'expectedOutput' | 'solution'>

export function toPublic(e: ArenaExercise): PublicArenaExercise {
  const { expectedOutput: _e, solution: _s, ...rest } = e
  return rest
}

type Rng = () => number

interface Template {
  id: string
  bossId: string
  type: ChallengeType
  build: (r: Rng) => Omit<ArenaExercise, 'id' | 'bossId' | 'type'>
}

// ─── Azar con semilla ──────────────────────────────────────────────────────
export function arenaRng(seed: number): Rng {
  let s = seed >>> 0 || 1
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const int = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1))
const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]
function shuffle<T>(r: Rng, xs: readonly T[]): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
const sample = <T,>(r: Rng, xs: readonly T[], n: number): T[] => shuffle(r, xs).slice(0, n)

const ITEMS = ['Espada', 'Pico', 'Hacha', 'Pala', 'Arco', 'Flecha', 'Escudo', 'Antorcha', 'Casco', 'Botas', 'Manzana', 'Pan', 'Lingote', 'Perla', 'Balde'] as const
const MATERIALS = ['madera', 'piedra', 'hierro', 'oro', 'diamante'] as const
const MOBS = ['Creeper', 'Zombie', 'Esqueleto', 'Slime', 'Enderman'] as const
const PLAYERS = ['Steve', 'Alex', 'Lucía', 'Tomi', 'Mica', 'Juana', 'Benja', 'Sofi'] as const
const ORDINAL = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto']

const lines = (...xs: (string | number)[]) => xs.join('\n')
/** Reemplaza cada `___` del código, en orden, por las respuestas. */
function fill(code: string, answers: string[]): string {
  let i = 0
  return code.replace(/___/g, () => answers[i++] ?? '___')
}
const q = (s: string) => `"${s}"`
const sq = (s: string) => `'${s}'`

// ─── Plantillas ────────────────────────────────────────────────────────────
const TEMPLATES: Template[] = [
  // ══ 1 · Creeper Formulario · variables y tipos ══════════════════════════
  {
    id: 'var-asignar', bossId: 'creeper-formulario', type: 'python',
    build: (r) => {
      const item = pick(r, ITEMS), n = int(r, 2, 64), mat = pick(r, MATERIALS)
      const code = lines(`nombre = "${item}"`, 'cantidad = ___', 'material = ___', '', 'print(nombre, "x", cantidad)', 'print(material)')
      return {
        title: 'La tarjeta del ítem',
        description: `Completá las variables: \`cantidad\` vale ${n} (número, sin comillas) y \`material\` es el texto "${mat}".`,
        initialCode: code, solution: fill(code, [String(n), q(mat)]),
        expectedOutput: lines(`${item} x ${n}`, mat),
      }
    },
  },
  {
    id: 'var-fstring', bossId: 'creeper-formulario', type: 'python',
    build: (r) => {
      const item = pick(r, ITEMS), n = int(r, 2, 30), seg = int(r, 10, 90)
      const code = lines(`objeto = "${item}"`, `cantidad = ${n}`, `segundos = ${seg}`, '', 'print(f"{___} x{___} - dura {___} segundos")')
      return {
        title: 'El cartel del cofre',
        description: 'Completá el f-string con las tres variables, en orden: el objeto, la cantidad y los segundos.',
        initialCode: code, solution: fill(code, ['objeto', 'cantidad', 'segundos']),
        expectedOutput: `${item} x${n} - dura ${seg} segundos`,
      }
    },
  },
  {
    id: 'var-cuenta', bossId: 'creeper-formulario', type: 'python',
    build: (r) => {
      const [a, b] = sample(r, ITEMS, 2)
      const c1 = int(r, 2, 9), w1 = int(r, 1, 5), c2 = int(r, 2, 9), w2 = int(r, 1, 5)
      const code = lines(`cant_1 = ${c1}   # ${a}`, `peso_1 = ${w1}`, `cant_2 = ${c2}   # ${b}`, `peso_2 = ${w2}`, '', 'peso_total = cant_1 * ___ + cant_2 * ___', 'print(peso_total)')
      return {
        title: 'Peso del cofre',
        description: `Cada ${a} pesa \`peso_1\` y cada ${b} pesa \`peso_2\`. Completá la cuenta del peso total con las variables.`,
        initialCode: code, solution: fill(code, ['peso_1', 'peso_2']),
        expectedOutput: String(c1 * w1 + c2 * w2),
      }
    },
  },

  // ══ 2 · Guardián de la Puerta · if / elif / else ════════════════════════
  {
    id: 'if-umbral', bossId: 'guardian-puerta', type: 'python',
    build: (r) => {
      const t1 = int(r, 3, 6), t2 = t1 + int(r, 4, 8), salud = int(r, 1, t2 + 6)
      const code = lines(`salud = ${salud}`, '', 'if salud <= ___:', '    print("¡Peligro!")', 'elif salud <= ___:', '    print("Cuidado")', 'else:', '    print("Estable")')
      return {
        title: 'Salud crítica',
        description: `Peligro si la salud es ${t1} o menos. Cuidado si es ${t2} o menos. Si no, Estable. Completá los dos números.`,
        initialCode: code, solution: fill(code, [String(t1), String(t2)]),
        expectedOutput: salud <= t1 ? '¡Peligro!' : salud <= t2 ? 'Cuidado' : 'Estable',
      }
    },
  },
  {
    id: 'if-igual', bossId: 'guardian-puerta', type: 'python',
    build: (r) => {
      const bueno = pick(r, ['hierro', 'oro', 'piedra'] as const)
      const bloque = pick(r, ['diamante', bueno, 'madera'] as const)
      const code = lines(`bloque = "${bloque}"`, '', 'if bloque == ___:', '    print("Excelente")', 'elif bloque == ___:', '    print("Bueno")', 'else:', '    print("Básico")')
      return {
        title: 'El mejor bloque',
        description: `El diamante es Excelente y el ${bueno} es Bueno. Completá los dos textos (con comillas).`,
        initialCode: code, solution: fill(code, [q('diamante'), q(bueno)]),
        expectedOutput: bloque === 'diamante' ? 'Excelente' : bloque === bueno ? 'Bueno' : 'Básico',
      }
    },
  },
  {
    id: 'if-and', bossId: 'guardian-puerta', type: 'python',
    build: (r) => {
      const llave = r() < 0.7, k = int(r, 3, 8), nivel = int(r, 1, 12)
      const code = lines(`tiene_llave = ${llave ? 'True' : 'False'}`, `nivel = ${nivel}`, '', `if tiene_llave ___ nivel >= ${k}:`, '    print("Pasás")', 'else:', '    print("No pasás")')
      return {
        title: 'La puerta doble',
        description: `La puerta solo se abre si tenés la llave Y además nivel ${k} o más. Completá la palabra que une las dos condiciones.`,
        initialCode: code, solution: fill(code, ['and']),
        expectedOutput: llave && nivel >= k ? 'Pasás' : 'No pasás',
      }
    },
  },

  // ══ 3 · Golem Infinito · for / while ════════════════════════════════════
  {
    id: 'for-range', bossId: 'golem-infinito', type: 'python',
    build: (r) => {
      const a = int(r, 1, 6), b = a + int(r, 3, 6)
      const code = lines('for i in range(___, ___):', '    print(i)')
      return {
        title: 'Contar bloques',
        description: `Completá el \`range()\` para que imprima los números del ${a} al ${b} (incluido el ${b}), uno por línea.`,
        initialCode: code, solution: fill(code, [String(a), String(b + 1)]),
        expectedOutput: Array.from({ length: b - a + 1 }, (_, i) => a + i).join('\n'),
      }
    },
  },
  {
    id: 'for-paso', bossId: 'golem-infinito', type: 'python',
    build: (r) => {
      const p = int(r, 2, 5), a = int(r, 0, 3), n = int(r, 4, 6), last = a + p * (n - 1)
      const code = lines('for bloque in range(___, ___, ___):', '    print(bloque)')
      return {
        title: 'Saltos de a varios',
        description: `Imprimí desde el ${a} hasta el ${last}, de ${p} en ${p}. Completá los tres números del \`range()\`.`,
        initialCode: code, solution: fill(code, [String(a), String(last + 1), String(p)]),
        expectedOutput: Array.from({ length: n }, (_, i) => a + p * i).join('\n'),
      }
    },
  },
  {
    id: 'while-baja', bossId: 'golem-infinito', type: 'python',
    build: (r) => {
      const k = int(r, 1, 3), steps = int(r, 3, 5), d = k * steps
      const code = lines(`durabilidad = ${d}`, '', 'while durabilidad > 0:', '    print("Picando...", durabilidad)', '    durabilidad = durabilidad - ___', '', 'print("¡El pico se rompió!")')
      return {
        title: 'El pico se rompe',
        description: `En cada golpe la durabilidad baja ${k}. Completá cuánto se resta en cada vuelta del \`while\`.`,
        initialCode: code, solution: fill(code, [String(k)]),
        expectedOutput: lines(...Array.from({ length: steps }, (_, i) => `Picando... ${d - k * i}`), '¡El pico se rompió!'),
      }
    },
  },
  {
    id: 'for-suma', bossId: 'golem-infinito', type: 'python',
    build: (r) => {
      const n = int(r, 4, 12)
      const code = lines('total = 0', 'for i in range(1, ___):', '    total = total + ___', '', 'print(total)')
      return {
        title: 'Sumar la torre',
        description: `Sumá todos los números del 1 al ${n} (incluido) dentro del \`for\`.`,
        initialCode: code, solution: fill(code, [String(n + 1), 'i']),
        expectedOutput: String((n * (n + 1)) / 2),
      }
    },
  },

  // ══ 4 · Mercader del Abismo · listas y diccionarios ═════════════════════
  {
    id: 'lista-indice', bossId: 'mercader-abismo', type: 'python',
    build: (r) => {
      const inv = sample(r, ITEMS, 4), k = int(r, 1, 4)
      const code = lines(`inventario = [${inv.map(q).join(', ')}]`, 'print(inventario[___])')
      return {
        title: 'El ítem de la fila',
        description: `Imprimí el ${ORDINAL[k - 1]} ítem de la lista. Ojo: las posiciones empiezan en 0.`,
        initialCode: code, solution: fill(code, [String(k - 1)]),
        expectedOutput: inv[k - 1],
      }
    },
  },
  {
    id: 'dict-clave', bossId: 'mercader-abismo', type: 'python',
    build: (r) => {
      const item = pick(r, ITEMS), n = int(r, 1, 20), mat = pick(r, MATERIALS)
      const code = lines(`item = {"nombre": "${item}", "cantidad": ${n}, "material": "${mat}"}`, '', 'print(item[___])', 'print(item[___])')
      return {
        title: 'La ficha del mercader',
        description: 'Imprimí primero el material y después la cantidad del ítem, usando sus claves (con comillas).',
        initialCode: code, solution: fill(code, [q('material'), q('cantidad')]),
        expectedOutput: lines(mat, n),
      }
    },
  },
  {
    id: 'lista-dicts-for', bossId: 'mercader-abismo', type: 'python',
    build: (r) => {
      const inv = sample(r, ITEMS, 3).map((nombre) => ({ nombre, cantidad: int(r, 1, 9) }))
      const code = lines('inventario = [', ...inv.map((i) => `    {"nombre": "${i.nombre}", "cantidad": ${i.cantidad}},`), ']', '', 'for item in ___:', '    print(item["nombre"], item[___])')
      return {
        title: 'Recorrer el inventario',
        description: 'Recorré la lista con el `for` e imprimí el nombre y la cantidad de cada ítem.',
        initialCode: code, solution: fill(code, ['inventario', q('cantidad')]),
        expectedOutput: inv.map((i) => `${i.nombre} ${i.cantidad}`).join('\n'),
      }
    },
  },
  {
    id: 'append-len', bossId: 'mercader-abismo', type: 'python',
    build: (r) => {
      const all = sample(r, ITEMS, 4), cofre = all.slice(0, int(r, 1, 3)), nuevo = all[3]
      const code = lines(`cofre = [${cofre.map(q).join(', ')}]`, `cofre.___("${nuevo}")`, '', 'print(len(cofre))', 'print(cofre[-1])')
      return {
        title: 'Guardar en el cofre',
        description: `Agregá "${nuevo}" al final de la lista con el método que corresponde.`,
        initialCode: code, solution: fill(code, ['append']),
        expectedOutput: lines(cofre.length + 1, nuevo),
      }
    },
  },

  // ══ 5 · Maestro Craftero · funciones ════════════════════════════════════
  {
    id: 'func-llamar', bossId: 'maestro-craftero', type: 'python',
    build: (r) => {
      const name = pick(r, PLAYERS)
      const code = lines('def saludar(nombre):', '    return "Hola, " + nombre + "!"', '', 'print(saludar(___))')
      return {
        title: 'Llamar a la función',
        description: `Llamá a \`saludar\` para que salude a ${name}.`,
        initialCode: code, solution: fill(code, [q(name)]),
        expectedOutput: `Hola, ${name}!`,
      }
    },
  },
  {
    id: 'func-return', bossId: 'maestro-craftero', type: 'python',
    build: (r) => {
      const p = int(r, 2, 15), c = int(r, 2, 9), p2 = int(r, 2, 15), c2 = int(r, 2, 9)
      const code = lines('def total(precio, cantidad):', '    return precio ___ cantidad', '', `print(total(${p}, ${c}))`, `print(total(${p2}, ${c2}))`)
      return {
        title: 'La cuenta del craftero',
        description: 'La función tiene que devolver el precio multiplicado por la cantidad. Completá el operador.',
        initialCode: code, solution: fill(code, ['*']),
        expectedOutput: lines(p * c, p2 * c2),
      }
    },
  },
  {
    id: 'func-if', bossId: 'maestro-craftero', type: 'python',
    build: (r) => {
      const t = int(r, 8, 20), a = int(r, 1, 30), b = int(r, 1, 30)
      const code = lines('def material(puntos):', '    if puntos >= ___:', '        return "diamante"', '    else:', '        return "hierro"', '', `print(material(${a}))`, `print(material(${b}))`)
      return {
        title: '¿Diamante o hierro?',
        description: `Con ${t} puntos o más el material es diamante; si no, hierro. Completá el número.`,
        initialCode: code, solution: fill(code, [String(t)]),
        expectedOutput: lines(a >= t ? 'diamante' : 'hierro', b >= t ? 'diamante' : 'hierro'),
      }
    },
  },

  // ══ 6 · El Archivista · de listas a tablas ══════════════════════════════
  {
    id: 'tabla-fila', bossId: 'archivista', type: 'python',
    build: (r) => {
      const id = int(r, 1, 9), item = pick(r, ITEMS), mat = pick(r, MATERIALS)
      const code = lines(`item = {"id": ${id}, "nombre": "${item}", "material": "${mat}"}`, '', `print(f"{item['id']} | {item[___]} | {item[___]}")`)
      return {
        title: 'Una fila de la tabla',
        description: 'Completá las claves para imprimir la fila con este orden: id, nombre, material.',
        initialCode: code, solution: fill(code, [sq('nombre'), sq('material')]),
        expectedOutput: `${id} | ${item} | ${mat}`,
      }
    },
  },
  {
    id: 'tabla-for', bossId: 'archivista', type: 'python',
    build: (r) => {
      const inv = sample(r, ITEMS, 3).map((nombre, i) => ({ id: i + 1, nombre }))
      const code = lines('inventario = [', ...inv.map((i) => `    {"id": ${i.id}, "nombre": "${i.nombre}"},`), ']', '', 'for item in inventario:', '    print(item["id"], "|", item[___])')
      return {
        title: 'La tabla completa',
        description: 'Completá la clave para que cada fila muestre el id y el nombre del ítem.',
        initialCode: code, solution: fill(code, [q('nombre')]),
        expectedOutput: inv.map((i) => `${i.id} | ${i.nombre}`).join('\n'),
      }
    },
  },
  {
    id: 'tabla-filtro', bossId: 'archivista', type: 'python',
    build: (r) => {
      const mats = sample(r, MATERIALS, 2)
      const inv = sample(r, ITEMS, 4).map((nombre, i) => ({ nombre, material: i === 0 ? mats[0] : pick(r, mats) }))
      const target = mats[0]
      const code = lines('inventario = [', ...inv.map((i) => `    {"nombre": "${i.nombre}", "material": "${i.material}"},`), ']', '', 'for item in inventario:', '    if item[___] == ___:', '        print(item["nombre"])')
      return {
        title: 'Solo los de un material',
        description: `Imprimí solo los nombres de los ítems de ${target}.`,
        initialCode: code, solution: fill(code, [q('material'), q(target)]),
        expectedOutput: inv.filter((i) => i.material === target).map((i) => i.nombre).join('\n'),
      }
    },
  },

  // ══ 7 · Constructor del Vacío · CREATE TABLE · INSERT INTO ══════════════
  {
    id: 'insert-uno', bossId: 'constructor-vacio', type: 'sql',
    build: (r) => {
      const id = int(r, 1, 9), item = pick(r, ITEMS), n = int(r, 1, 64)
      const code = lines('INSERT INTO items (id, nombre, cantidad)', 'VALUES (___, ___, ___);')
      return {
        title: 'Insertar un ítem',
        description: `Insertá en \`items\` el ítem con id ${id}, nombre '${item}' y cantidad ${n}. El texto va entre comillas simples.`,
        initialCode: code, solution: fill(code, [String(id), sq(item), String(n)]),
        seedSQL: 'CREATE TABLE items (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER);',
        verifySQL: 'SELECT id, nombre, cantidad FROM items',
        expectedOutput: `${id}|${item}|${n}`,
      }
    },
  },
  {
    id: 'insert-dos', bossId: 'constructor-vacio', type: 'sql',
    build: (r) => {
      const [a, b] = sample(r, ITEMS, 2)
      const code = lines('INSERT INTO items (id, nombre)', 'VALUES', '  (1, ___),', '  (2, ___);')
      return {
        title: 'Dos de una vez',
        description: `Insertá dos filas: (1, '${a}') y (2, '${b}').`,
        initialCode: code, solution: fill(code, [sq(a), sq(b)]),
        seedSQL: 'CREATE TABLE items (id INTEGER PRIMARY KEY, nombre TEXT);',
        verifySQL: 'SELECT id, nombre FROM items ORDER BY id',
        expectedOutput: lines(`1|${a}`, `2|${b}`),
      }
    },
  },
  {
    id: 'create-tabla', bossId: 'constructor-vacio', type: 'sql',
    build: (r) => {
      const t = pick(r, ['cofre', 'mochila', 'armario', 'baul'] as const), col = pick(r, ['nombre', 'material', 'tipo', 'color'] as const)
      const code = lines('CREATE TABLE ___ (', '  id INTEGER PRIMARY KEY,', '  ___ TEXT', ');')
      return {
        title: 'Crear la tabla',
        description: `Creá la tabla \`${t}\` con una columna de texto llamada \`${col}\`.`,
        initialCode: code, solution: fill(code, [t, col]),
        verifySQL: `SELECT name FROM pragma_table_info('${t}') ORDER BY cid`,
        expectedOutput: lines('id', col),
      }
    },
  },

  // ══ 8 · Oráculo Oscuro · SELECT · WHERE · ORDER BY ══════════════════════
  ...(['where-igual', 'where-mayor', 'order-by'] as const).map((id): Template => ({
    id, bossId: 'oraculo-oscuro', type: 'sql',
    build: (r) => {
      const prices = sample(r, Array.from({ length: 40 }, (_, i) => (i + 1) * 5), 5)
      const mats = sample(r, MATERIALS, 3)
      const rows = sample(r, ITEMS, 5).map((nombre, i) => ({ id: i + 1, nombre, material: i < 2 ? mats[0] : pick(r, mats), precio: prices[i] }))
      const seedSQL = lines('CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, precio INTEGER);',
        ...rows.map((x) => `INSERT INTO cofre VALUES (${x.id}, '${x.nombre}', '${x.material}', ${x.precio});`))
      if (id === 'where-igual') {
        const mat = mats[0]
        const code = lines('SELECT nombre', 'FROM cofre', 'WHERE material = ___;')
        return {
          title: 'Solo los de un material', description: `Traé el nombre de los ítems de ${mat}.`,
          initialCode: code, solution: fill(code, [sq(mat)]), seedSQL,
          expectedOutput: rows.filter((x) => x.material === mat).map((x) => x.nombre).join('\n'),
        }
      }
      if (id === 'where-mayor') {
        const sorted = [...prices].sort((a, b) => a - b), x = sorted[int(r, 1, 3)]
        const code = lines('SELECT nombre, precio', 'FROM cofre', `WHERE precio ___ ${x};`)
        return {
          title: 'Los caros', description: `Traé los ítems que cuestan más de ${x} (sin incluir el ${x}). Completá el operador.`,
          initialCode: code, solution: fill(code, ['>']), seedSQL,
          expectedOutput: rows.filter((y) => y.precio > x).map((y) => `${y.nombre}|${y.precio}`).join('\n'),
        }
      }
      const code = lines('SELECT nombre, precio', 'FROM cofre', 'ORDER BY ___ ___;')
      return {
        title: 'Del más caro al más barato', description: 'Ordená los ítems por precio, del más caro al más barato.',
        initialCode: code, solution: fill(code, ['precio', 'DESC']), seedSQL,
        expectedOutput: [...rows].sort((a, b) => b.precio - a.precio).map((y) => `${y.nombre}|${y.precio}`).join('\n'),
      }
    },
  })),

  // ══ 9 · Contador de Almas · COUNT · SUM · GROUP BY ══════════════════════
  ...(['count-where', 'sum-hp', 'group-by'] as const).map((id): Template => ({
    id, bossId: 'contador-almas', type: 'sql',
    build: (r) => {
      const tipos = sample(r, MOBS, 3)
      const rows = Array.from({ length: int(r, 5, 7) }, (_, i) => {
        const tipo = i < 2 ? tipos[0] : pick(r, tipos)
        return { id: i + 1, tipo, hp: int(r, 2, 8) * 5 }
      })
      const seedSQL = lines('CREATE TABLE monstruos (id INTEGER PRIMARY KEY, tipo TEXT, hp INTEGER);',
        ...rows.map((x) => `INSERT INTO monstruos VALUES (${x.id}, '${x.tipo}', ${x.hp});`))
      if (id === 'count-where') {
        const t = tipos[0]
        const code = lines('SELECT ___(*)', 'FROM monstruos', 'WHERE tipo = ___;')
        return {
          title: 'Contar una especie', description: `Contá cuántos monstruos de tipo ${t} hay.`,
          initialCode: code, solution: fill(code, ['COUNT', sq(t)]), seedSQL,
          expectedOutput: String(rows.filter((x) => x.tipo === t).length),
        }
      }
      if (id === 'sum-hp') {
        const code = lines('SELECT ___(hp)', 'FROM monstruos;')
        return {
          title: 'HP del ejército', description: 'Calculá la vida total sumando el `hp` de todos los monstruos.',
          initialCode: code, solution: fill(code, ['SUM']), seedSQL,
          expectedOutput: String(rows.reduce((s, x) => s + x.hp, 0)),
        }
      }
      const counts = new Map<string, number>()
      for (const x of rows) counts.set(x.tipo, (counts.get(x.tipo) ?? 0) + 1)
      const code = lines('SELECT tipo, COUNT(*)', 'FROM monstruos', 'GROUP BY ___', 'ORDER BY tipo;')
      return {
        title: 'Cuántos de cada tipo', description: 'Agrupá para contar cuántos monstruos hay de cada tipo.',
        initialCode: code, solution: fill(code, ['tipo']), seedSQL,
        expectedOutput: [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([t, n]) => `${t}|${n}`).join('\n'),
      }
    },
  })),

  // ══ 10 · El Falsificador · UPDATE · DELETE ══════════════════════════════
  ...(['update-mat', 'delete-uno', 'update-cant'] as const).map((id): Template => ({
    id, bossId: 'falsificador', type: 'sql',
    build: (r) => {
      const rows = sample(r, ITEMS, 4).map((nombre, i) => ({ id: i + 1, nombre, material: pick(r, MATERIALS), cantidad: int(r, 1, 30) }))
      const seedSQL = lines('CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, cantidad INTEGER);',
        ...rows.map((x) => `INSERT INTO cofre VALUES (${x.id}, '${x.nombre}', '${x.material}', ${x.cantidad});`))
      const target = pick(r, rows)
      if (id === 'update-mat') {
        const nuevo = pick(r, MATERIALS.filter((m) => m !== target.material))
        const code = lines('UPDATE cofre', 'SET material = ___', 'WHERE nombre = ___;')
        return {
          title: 'Cambiar el material', description: `Cambiá el material de '${target.nombre}' a '${nuevo}'. Solo ese ítem.`,
          initialCode: code, solution: fill(code, [sq(nuevo), sq(target.nombre)]), seedSQL,
          verifySQL: 'SELECT nombre, material FROM cofre ORDER BY id',
          expectedOutput: rows.map((x) => `${x.nombre}|${x.id === target.id ? nuevo : x.material}`).join('\n'),
        }
      }
      if (id === 'delete-uno') {
        const code = lines('DELETE FROM cofre', 'WHERE nombre = ___;')
        return {
          title: 'Borrar uno solo', description: `Borrá del cofre la fila de '${target.nombre}'. Un DELETE sin WHERE borra todo.`,
          initialCode: code, solution: fill(code, [sq(target.nombre)]), seedSQL,
          verifySQL: 'SELECT id, nombre FROM cofre ORDER BY id',
          expectedOutput: rows.filter((x) => x.id !== target.id).map((x) => `${x.id}|${x.nombre}`).join('\n'),
        }
      }
      const n = int(r, 31, 64)
      const code = lines('UPDATE cofre', 'SET cantidad = ___', 'WHERE id = ___;')
      return {
        title: 'Reponer stock', description: `El ítem con id ${target.id} ahora tiene ${n} unidades. Actualizá solo esa fila.`,
        initialCode: code, solution: fill(code, [String(n), String(target.id)]), seedSQL,
        verifySQL: 'SELECT nombre, cantidad FROM cofre ORDER BY id',
        expectedOutput: rows.map((x) => `${x.nombre}|${x.id === target.id ? n : x.cantidad}`).join('\n'),
      }
    },
  })),

  // ══ 11 · El Nexo · Python + sqlite3 ═════════════════════════════════════
  {
    id: 'nexo-count', bossId: 'el-nexo', type: 'python',
    build: (r) => {
      const inv = sample(r, ITEMS, int(r, 2, 5))
      const code = lines('import sqlite3', '', 'conn = sqlite3.connect(":memory:")', 'cursor = conn.cursor()', 'cursor.execute("CREATE TABLE items (nombre TEXT)")',
        `cursor.executemany("INSERT INTO items VALUES (?)", [${inv.map((x) => `("${x}",)`).join(', ')}])`, '', 'cursor.execute("SELECT ___(*) FROM items")', 'print(cursor.fetchone()[0])', 'conn.close()')
      return {
        title: 'Contar desde Python', description: 'Completá la función de SQL que cuenta las filas de la tabla.',
        initialCode: code, solution: fill(code, ['COUNT']),
        expectedOutput: String(inv.length),
      }
    },
  },
  {
    id: 'nexo-insert', bossId: 'el-nexo', type: 'python',
    build: (r) => {
      const [a, b] = sample(r, ITEMS, 2)
      const code = lines('import sqlite3', '', 'conn = sqlite3.connect(":memory:")', 'cursor = conn.cursor()', 'cursor.execute("CREATE TABLE items (nombre TEXT)")',
        `cursor.execute("INSERT INTO items VALUES (?)", ("${a}",))`, 'cursor.execute("INSERT INTO items VALUES (?)", ___)', '', 'cursor.execute("SELECT nombre FROM items")', 'for fila in cursor.fetchall():', '    print(fila[0])', 'conn.close()')
      return {
        title: 'El segundo ítem', description: `Insertá "${b}" igual que la línea de arriba: como una tupla de un solo elemento.`,
        initialCode: code, solution: fill(code, [`("${b}",)`]),
        expectedOutput: lines(a, b),
      }
    },
  },
  {
    id: 'nexo-fetch', bossId: 'el-nexo', type: 'python',
    build: (r) => {
      const item = pick(r, ITEMS), n = int(r, 2, 40)
      const code = lines('import sqlite3', '', 'conn = sqlite3.connect(":memory:")', 'cursor = conn.cursor()', 'cursor.execute("CREATE TABLE items (nombre TEXT, cantidad INTEGER)")',
        `cursor.execute("INSERT INTO items VALUES (?, ?)", ("${item}", ${n}))`, '', 'cursor.execute("SELECT nombre, cantidad FROM items")', 'fila = cursor.fetchone()', 'print(fila[___])', 'conn.close()')
      return {
        title: 'La columna justa', description: 'La fila es una tupla (nombre, cantidad). Imprimí solo la cantidad: ¿qué índice tiene?',
        initialCode: code, solution: fill(code, ['1']),
        expectedOutput: String(n),
      }
    },
  },

  // ══ 12 · La Hydra · agregar y listar ════════════════════════════════════
  {
    id: 'hydra-order', bossId: 'la-hydra', type: 'python',
    build: (r) => {
      const inv = sample(r, ITEMS, 4)
      const code = lines('import sqlite3', '', 'conn = sqlite3.connect(":memory:")', 'cursor = conn.cursor()', 'cursor.execute("CREATE TABLE inventario (nombre TEXT)")',
        `cursor.executemany("INSERT INTO inventario VALUES (?)", [${inv.map((x) => `("${x}",)`).join(', ')}])`, '', 'cursor.execute("SELECT nombre FROM inventario ORDER BY ___")', 'for fila in cursor.fetchall():', '    print(fila[0])', 'conn.close()')
      return {
        title: 'Listar en orden', description: 'Completá el `ORDER BY` para listar los nombres en orden alfabético.',
        initialCode: code, solution: fill(code, ['nombre']),
        expectedOutput: [...inv].sort((a, b) => (a < b ? -1 : 1)).join('\n'),
      }
    },
  },
  {
    id: 'hydra-funcion', bossId: 'la-hydra', type: 'python',
    build: (r) => {
      const inv = sample(r, ITEMS, int(r, 2, 4))
      const code = lines('import sqlite3', '', 'conn = sqlite3.connect(":memory:")', 'cursor = conn.cursor()', 'cursor.execute("CREATE TABLE inventario (nombre TEXT)")', '',
        'def agregar(nombre):', '    cursor.execute("INSERT INTO inventario VALUES (?)", ___)', '', ...inv.map((x) => `agregar("${x}")`), '',
        'cursor.execute("SELECT COUNT(*) FROM inventario")', 'print(cursor.fetchone()[0])', 'conn.close()')
      return {
        title: 'Cortar cabezas', description: 'Completá el INSERT de la función: el parámetro tiene que ir como tupla de un elemento.',
        initialCode: code, solution: fill(code, ['(nombre,)']),
        expectedOutput: String(inv.length),
      }
    },
  },

  // ══ 13 · Dragón Rojo · buscar, quitar, actualizar ═══════════════════════
  {
    id: 'dragon-buscar', bossId: 'dragon-rojo', type: 'python',
    build: (r) => {
      const inv = sample(r, ITEMS, 3), target = pick(r, inv)
      const code = lines('import sqlite3', '', 'conn = sqlite3.connect(":memory:")', 'cursor = conn.cursor()', 'cursor.execute("CREATE TABLE inventario (nombre TEXT)")',
        `cursor.executemany("INSERT INTO inventario VALUES (?)", [${inv.map((x) => `("${x}",)`).join(', ')}])`, '',
        'def buscar(nombre):', '    cursor.execute("SELECT nombre FROM inventario WHERE nombre = ?", (nombre,))', '    fila = cursor.fetchone()', '    if fila:', '        print("Encontrado:", fila[0])', '    else:', '        print("No encontrado")', '',
        'buscar(___)', 'buscar("Dragón")', 'conn.close()')
      return {
        title: 'Buscar en el tesoro', description: `Llamá a \`buscar\` con "${target}".`,
        initialCode: code, solution: fill(code, [q(target)]),
        expectedOutput: lines(`Encontrado: ${target}`, 'No encontrado'),
      }
    },
  },
  {
    id: 'dragon-update', bossId: 'dragon-rojo', type: 'python',
    build: (r) => {
      const rows = sample(r, ITEMS, 2).map((nombre) => ({ nombre, cantidad: int(r, 1, 9) }))
      const target = pick(r, rows), n = int(r, 10, 50)
      const code = lines('import sqlite3', '', 'conn = sqlite3.connect(":memory:")', 'cursor = conn.cursor()', 'cursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")',
        `cursor.executemany("INSERT INTO inventario VALUES (?, ?)", [${rows.map((x) => `("${x.nombre}", ${x.cantidad})`).join(', ')}])`, '',
        'cursor.execute("UPDATE inventario SET cantidad = ? WHERE nombre = ?", (___, ___))', '',
        'cursor.execute("SELECT nombre, cantidad FROM inventario")', 'for nombre, cantidad in cursor.fetchall():', '    print(nombre, cantidad)', 'conn.close()')
      return {
        title: 'Actualizar el botín', description: `Ahora hay ${n} de "${target.nombre}". Completá la tupla: primero la cantidad, después el nombre.`,
        initialCode: code, solution: fill(code, [String(n), q(target.nombre)]),
        expectedOutput: rows.map((x) => `${x.nombre} ${x === target ? n : x.cantidad}`).join('\n'),
      }
    },
  },
]

// ─── API ───────────────────────────────────────────────────────────────────
export const ARENA_TEMPLATES: readonly Template[] = TEMPLATES

export function templatesFor(bossId: string): Template[] {
  return TEMPLATES.filter((t) => t.bossId === bossId)
}

/** Temas con al menos una plantilla. */
export const ARENA_TOPIC_IDS = new Set(TEMPLATES.map((t) => t.bossId))

export function buildFromTemplate(t: Template, seed: number): ArenaExercise {
  const e = t.build(arenaRng(seed))
  return { id: `${t.id}#${seed}`, bossId: t.bossId, type: t.type, ...e }
}

/**
 * Los 3 ejercicios de un duelo. Con un tema: plantillas distintas de ese tema
 * (si hay menos de 3, se repite alguna con otros datos). Con 'mezcla': cada
 * ejercicio de un tema distinto de los que vieron los dos.
 */
export function buildDuel(topic: string, shared: Boss[], seed: number): ArenaExercise[] {
  const r = arenaRng(seed)
  const seeds = () => Math.floor(r() * 2 ** 31)
  let picks: Template[]
  if (topic === ARENA_MIX) {
    const topics = shuffle(r, shared.filter((b) => ARENA_TOPIC_IDS.has(b.id)))
    picks = Array.from({ length: ARENA_EXERCISES }, (_, i) => pick(r, templatesFor(topics[i % topics.length].id)))
  } else {
    const pool = shuffle(r, templatesFor(topic))
    picks = Array.from({ length: ARENA_EXERCISES }, (_, i) => pool[i % pool.length])
  }
  return picks.map((t) => buildFromTemplate(t, seeds()))
}
