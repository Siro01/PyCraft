// Repasos con Rodolfo — actividades de nivelación para el alumno que faltó.
//
// Uno por jefe, pensado como "lo mínimo que tenés que saber antes de pelear":
// ejemplos MUY cortos que Rodolfo explica de a uno, y prácticas de completar
// huecos que se corrigen ejecutando el código de verdad (Pyodide / sql.js),
// igual que en una batalla. El docente los habilita por aula o por alumno
// desde el panel (tabla aula_repasos / alumno_repasos) y aparecen en la
// Escuelita de Rodolfo, un lugar nuevo del mapa de cada acto.
//
// Tipos de paso:
//   · talk   — Rodolfo explica; si hay `output`/`table` el alumno toca
//              "Ejecutar" para ver qué pasa (salida precalculada: instantánea).
//   · fill   — código con huecos `___`; se reemplazan, se ejecuta y se compara
//              la salida con `expected` (Python: stdout; SQL: filas "a|b").
//   · choice — pregunta rápida de opción múltiple.

import type { LessonTable } from './lessons'

export type RepasoLang = 'python' | 'sql'

interface BeatBase {
  /** Lo que dice Rodolfo. Cada string es un globo; se leen de a uno. */
  say: string[]
}

export interface TalkBeat extends BeatBase {
  kind: 'talk'
  code?: string
  lang?: RepasoLang
  highlight?: number[]
  output?: string[]
  table?: LessonTable
}

export interface FillBeat extends BeatBase {
  kind: 'fill'
  lang: RepasoLang
  /** Código con uno o más huecos `___`. */
  template: string
  /** Salida esperada (Python: lo que imprime; SQL: filas con columnas separadas por |). */
  expected: string
  /** Solo SQL: se corre antes del código del alumno (tabla de ejemplo). */
  seed?: string
  /** Pista que da Rodolfo después del primer error. */
  hint: string
  /** Lo que va en cada hueco, en orden — "Mostrar respuesta" lo completa. */
  solution: string[]
}

export interface ChoiceBeat extends BeatBase {
  kind: 'choice'
  code?: string
  lang?: RepasoLang
  options: string[]
  answer: string
  /** Lo que dice Rodolfo después de responder, acierte o no. */
  explain: string
}

export type RepasoBeat = TalkBeat | FillBeat | ChoiceBeat

export interface Repaso {
  bossId: string
  /** Nombre del "cuaderno" (título de la ventana). */
  file: string
  title: string
  /** Temas que cubre, para la tarjeta de la Escuelita y el panel docente. */
  topics: string[]
  beats: RepasoBeat[]
  /** Lo último que dice Rodolfo al terminar. */
  outro: string
}

export const BLANK = '___'

const COFRE_SEED = `CREATE TABLE cofre (nombre TEXT, cantidad INTEGER, material TEXT);
INSERT INTO cofre VALUES ('Espada', 1, 'diamante');
INSERT INTO cofre VALUES ('Antorcha', 16, 'madera');
INSERT INTO cofre VALUES ('Pico', 1, 'diamante');
INSERT INTO cofre VALUES ('Manzana', 8, 'comida');`

const COFRE: LessonTable = {
  cols: ['nombre', 'cantidad', 'material'],
  rows: [['Espada', 1, 'diamante'], ['Antorcha', 16, 'madera'], ['Pico', 1, 'diamante'], ['Manzana', 8, 'comida']],
}

const PY_DB = `import sqlite3
conn = sqlite3.connect(":memory:")
cursor = conn.cursor()`

export const REPASOS: Repaso[] = [
  // ── 01 · Creeper Formulario — variables, suma y f-strings ─────────────────
  {
    bossId: 'creeper-formulario',
    file: 'repaso_variables.py',
    title: 'Variables, sumas y f-strings',
    topics: ['Variables', 'Sumar variables', 'f-strings'],
    beats: [
      {
        kind: 'talk',
        say: [
          '¡Hola! Soy Rodolfo. Me contaron que te perdiste la primera clase... ¡no pasa nada! La repasamos juntos, despacito.',
          'Una variable es como una cajita con un nombre escrito. Adentro guardás algo, y después lo usás llamándola por su nombre.',
        ],
        lang: 'python',
        code: 'bloques = 5\nprint(bloques)',
        highlight: [1],
        output: ['5'],
      },
      {
        kind: 'talk',
        say: [
          'Mirá: a la izquierda va el nombre, en el medio un =, y a la derecha lo que guardás.',
          'Si guardás texto, va entre comillas. Si es un número, sin comillas.',
        ],
        lang: 'python',
        code: 'jugador = "Alex"\nvidas = 3\nprint(jugador)\nprint(vidas)',
        highlight: [1, 2],
        output: ['Alex', '3'],
      },
      {
        kind: 'fill',
        say: ['¡Te toca! Guardá la palabra Steve en la variable jugador. Escribila en el hueco (las comillas ya están puestas).'],
        lang: 'python',
        template: 'jugador = "___"\nprint(jugador)',
        expected: 'Steve',
        hint: 'Escribí solamente Steve, con S mayúscula. Las comillas ya están.',
        solution: ['Steve'],
      },
      {
        kind: 'talk',
        say: [
          'Con números podés hacer cuentas. El + suma lo que tienen adentro dos variables.',
          'Fijate que total guarda el resultado de la suma, y después lo imprimimos.',
        ],
        lang: 'python',
        code: 'manzanas = 3\npanes = 2\ntotal = manzanas + panes\nprint(total)',
        highlight: [3],
        output: ['5'],
      },
      {
        kind: 'fill',
        say: ['Ahora vos: tenés 4 diamantes y 6 esmeraldas. Poné el signo que falta para que total sea 10.'],
        lang: 'python',
        template: 'diamantes = 4\nesmeraldas = 6\ntotal = diamantes ___ esmeraldas\nprint(total)',
        expected: '10',
        hint: 'Queremos juntar las dos cantidades. ¿Qué signo usás para sumar?',
        solution: ['+'],
      },
      {
        kind: 'talk',
        say: [
          'Último truco: el f-string. Ponés una f pegada antes de las comillas, y adentro del texto escribís la variable entre llaves { }.',
          'Python cambia {nombre} por lo que tiene guardado. ¡Así armás frases con tus variables!',
        ],
        lang: 'python',
        code: 'nombre = "Alex"\nprint(f"Hola {nombre}")',
        highlight: [2],
        output: ['Hola Alex'],
      },
      {
        kind: 'fill',
        say: ['Completá las llaves con el nombre de cada variable para que diga: Steve tiene 3 vidas.'],
        lang: 'python',
        template: 'nombre = "Steve"\nvidas = 3\nprint(f"{___} tiene {___} vidas")',
        expected: 'Steve tiene 3 vidas',
        hint: 'Adentro de las llaves va el NOMBRE de la variable, no lo que guarda: primero nombre, después vidas.',
        solution: ['nombre', 'vidas'],
      },
      {
        kind: 'choice',
        say: ['Pregunta bonus: ¿qué imprime este código?'],
        lang: 'python',
        code: 'x = 2\ny = 3\nprint(f"Total: {x + y}")',
        options: ['Total: 5', 'Total: x + y', 'Total: 23'],
        answer: 'Total: 5',
        explain: 'Adentro de las llaves Python hace la cuenta: 2 + 3 = 5. ¡Las llaves también pueden tener sumas!',
      },
    ],
    outro: '¡Listo! Ya sabés guardar cosas en variables, sumarlas y meterlas en un texto. El Creeper Formulario no te va a asustar.',
  },

  // ── 02 · Guardián de la Puerta — if / else ────────────────────────────────
  {
    bossId: 'guardian-puerta',
    file: 'repaso_condicionales.py',
    title: 'Preguntas con if y else',
    topics: ['if', 'else', 'Comparar'],
    beats: [
      {
        kind: 'talk',
        say: [
          '¡Hola de nuevo! Hoy repasamos el if. Un if es una pregunta: SI pasa algo, Python hace lo que está adentro.',
          'Lo de adentro va corrido para la derecha (4 espacios). Así Python sabe qué es parte del if.',
        ],
        lang: 'python',
        code: 'vida = 10\nif vida > 5:\n    print("Estás bien")',
        highlight: [2, 3],
        output: ['Estás bien'],
      },
      {
        kind: 'choice',
        say: ['Para preguntar si dos cosas son IGUALES no se usa un solo =. ¿Cuál es?'],
        options: ['==', '=', '=>'],
        answer: '==',
        explain: 'Un = guarda algo en una variable. Dos == preguntan "¿son iguales?". ¡Es el error más común, ojo!',
      },
      {
        kind: 'fill',
        say: ['El guardián deja pasar solo si la llave es de oro. Completá lo que tiene que valer la llave para pasar.'],
        lang: 'python',
        template: 'llave = "oro"\nif llave == "___":\n    print("Pasá")',
        expected: 'Pasá',
        hint: 'La variable llave guarda "oro". Si preguntás por la misma palabra, el if se cumple.',
        solution: ['oro'],
      },
      {
        kind: 'talk',
        say: [
          'Con else le decís a Python qué hacer cuando la pregunta da que NO.',
          'Acá edad vale 9, entonces 9 >= 10 es falso... y se va por el else.',
        ],
        lang: 'python',
        code: 'edad = 9\nif edad >= 10:\n    print("Grande")\nelse:\n    print("Chico")',
        highlight: [4, 5],
        output: ['Chico'],
      },
      {
        kind: 'fill',
        say: ['Tenés 2 diamantes y necesitás 5. Poné el signo de comparación para que el if pregunte "¿tengo MENOS que 5?".'],
        lang: 'python',
        template: 'diamantes = 2\nif diamantes ___ 5:\n    print("Te faltan diamantes")\nelse:\n    print("Tenés suficientes")',
        expected: 'Te faltan diamantes',
        hint: 'El signo "menor que" es como una flechita que apunta para la izquierda: <',
        solution: ['<'],
      },
    ],
    outro: '¡Genial! Ya sabés hacerle preguntas a Python con if y else. El Guardián de la Puerta te está esperando.',
  },

  // ── 03 · Golem Infinito — for / while ─────────────────────────────────────
  {
    bossId: 'golem-infinito',
    file: 'repaso_bucles.py',
    title: 'Repetir con for y while',
    topics: ['for', 'range', 'while'],
    beats: [
      {
        kind: 'talk',
        say: [
          'Hoy toca repetir cosas sin escribirlas mil veces. Para eso está el for.',
          'range(3) quiere decir "3 veces". Todo lo que está corrido adentro se repite.',
        ],
        lang: 'python',
        code: 'for i in range(3):\n    print("¡Golpe!")',
        highlight: [1],
        output: ['¡Golpe!', '¡Golpe!', '¡Golpe!'],
      },
      {
        kind: 'fill',
        say: ['Hacé que imprima Bloque cuatro veces.'],
        lang: 'python',
        template: 'for i in range(___):\n    print("Bloque")',
        expected: 'Bloque\nBloque\nBloque\nBloque',
        hint: 'El número adentro de range() dice cuántas veces se repite.',
        solution: ['4'],
      },
      {
        kind: 'talk',
        say: [
          'La variable i va cambiando en cada vuelta. range(1, 4) cuenta 1, 2, 3...',
          '¡Ojo! El último número NO entra: frena justo antes del 4.',
        ],
        lang: 'python',
        code: 'for i in range(1, 4):\n    print(i)',
        highlight: [1],
        output: ['1', '2', '3'],
      },
      {
        kind: 'fill',
        say: ['Hacé que cuente del 1 al 5. Acordate: el último número no entra.'],
        lang: 'python',
        template: 'for numero in range(1, ___):\n    print(numero)',
        expected: '1\n2\n3\n4\n5',
        hint: 'Si querés llegar hasta el 5, el range tiene que frenar en el número siguiente.',
        solution: ['6'],
      },
      {
        kind: 'talk',
        say: [
          'El while repite MIENTRAS algo sea verdad. Acá: mientras la vida sea mayor que 0.',
          'Adentro le restamos 1 a la vida en cada vuelta, así en algún momento llega a 0 y frena.',
        ],
        lang: 'python',
        code: 'vida = 3\nwhile vida > 0:\n    print(vida)\n    vida = vida - 1',
        highlight: [2, 4],
        output: ['3', '2', '1'],
      },
      {
        kind: 'choice',
        say: ['¿Qué pasaría si borramos la línea vida = vida - 1?'],
        options: ['Se repite para siempre', 'Se repite 3 veces', 'No se repite nunca'],
        answer: 'Se repite para siempre',
        explain: 'Si la vida nunca baja, vida > 0 siempre es verdad... ¡y el while no termina nunca! Por eso el Golem se llama Infinito.',
      },
    ],
    outro: '¡Así se hace! for para repetir una cantidad de veces, while para repetir mientras algo pase. ¡A por el Golem!',
  },

  // ── 04 · Mercader del Abismo — listas y diccionarios ──────────────────────
  {
    bossId: 'mercader-abismo',
    file: 'repaso_listas.py',
    title: 'Listas y diccionarios',
    topics: ['Listas', 'Diccionarios', 'Recorrer una lista'],
    beats: [
      {
        kind: 'talk',
        say: [
          'Una lista guarda muchas cosas en orden, entre corchetes [ ].',
          'Para sacar una, ponés su posición. ¡Pero Python empieza a contar desde 0!',
        ],
        lang: 'python',
        code: 'items = ["pico", "espada", "pan"]\nprint(items[0])',
        highlight: [2],
        output: ['pico'],
      },
      {
        kind: 'fill',
        say: ['Hacé que imprima espada. ¿En qué posición está si contamos desde 0?'],
        lang: 'python',
        template: 'items = ["pico", "espada", "pan"]\nprint(items[___])',
        expected: 'espada',
        hint: 'pico está en la posición 0. espada está justo después.',
        solution: ['1'],
      },
      {
        kind: 'talk',
        say: [
          'Un diccionario guarda datos con etiquetas, entre llaves { }. Cada dato tiene su nombre: "nombre", "precio"...',
          'Para sacar uno, ponés la etiqueta entre corchetes y comillas.',
        ],
        lang: 'python',
        code: 'item = {"nombre": "Espada", "precio": 10}\nprint(item["precio"])',
        highlight: [2],
        output: ['10'],
      },
      {
        kind: 'fill',
        say: ['Hacé que imprima el nombre de la poción. Escribí la etiqueta que falta.'],
        lang: 'python',
        template: 'item = {"nombre": "Poción", "precio": 5}\nprint(item["___"])',
        expected: 'Poción',
        hint: 'Mirá las etiquetas del diccionario: una se llama "nombre".',
        solution: ['nombre'],
      },
      {
        kind: 'talk',
        say: [
          'La tienda del Mercader es una LISTA de DICCIONARIOS: cada ítem es un diccionario.',
          'Con un for recorrés la lista, y en cada vuelta item es uno de los diccionarios.',
        ],
        lang: 'python',
        code: 'tienda = [\n    {"nombre": "Pan", "precio": 2},\n    {"nombre": "Pico", "precio": 8},\n]\nfor item in tienda:\n    print(item["nombre"])',
        highlight: [5, 6],
        output: ['Pan', 'Pico'],
      },
      {
        kind: 'fill',
        say: ['Ahora hacé que el for imprima el PRECIO de cada ítem.'],
        lang: 'python',
        template: 'tienda = [\n    {"nombre": "Pan", "precio": 2},\n    {"nombre": "Pico", "precio": 8},\n]\nfor item in tienda:\n    print(item["___"])',
        expected: '2\n8',
        hint: 'Es la otra etiqueta que tiene cada diccionario.',
        solution: ['precio'],
      },
    ],
    outro: '¡Excelente! Listas para guardar muchas cosas, diccionarios para ponerles etiquetas. El Mercader va a tener que esforzarse.',
  },

  // ── 05 · Maestro Craftero — funciones ─────────────────────────────────────
  {
    bossId: 'maestro-craftero',
    file: 'repaso_funciones.py',
    title: 'Funciones con parámetros',
    topics: ['def', 'Parámetros', 'return'],
    beats: [
      {
        kind: 'talk',
        say: [
          'Una función es una receta con nombre. Con def la escribís una vez...',
          '...y después la usás cuantas veces quieras escribiendo su nombre con paréntesis.',
        ],
        lang: 'python',
        code: 'def saludar():\n    print("¡Hola, craftero!")\n\nsaludar()',
        highlight: [1, 4],
        output: ['¡Hola, craftero!'],
      },
      {
        kind: 'fill',
        say: ['La función saltar ya está escrita, pero nadie la llama. Escribí su nombre para usarla.'],
        lang: 'python',
        template: 'def saltar():\n    print("¡Salto!")\n\n___()',
        expected: '¡Salto!',
        hint: 'Para usar una función escribís su nombre exacto. Los paréntesis ya están.',
        solution: ['saltar'],
      },
      {
        kind: 'talk',
        say: [
          'Un parámetro es una cajita que la función recibe cuando la llamás.',
          'Acá nombre recibe "Alex", y la función lo usa adentro.',
        ],
        lang: 'python',
        code: 'def saludar(nombre):\n    print(f"Hola {nombre}")\n\nsaludar("Alex")',
        highlight: [1, 4],
        output: ['Hola Alex'],
      },
      {
        kind: 'fill',
        say: ['Hacé que la función salude a Steve.'],
        lang: 'python',
        template: 'def saludar(nombre):\n    print(f"Hola {nombre}")\n\nsaludar("___")',
        expected: 'Hola Steve',
        hint: 'Lo que pongas entre las comillas es lo que recibe nombre. Escribí Steve.',
        solution: ['Steve'],
      },
      {
        kind: 'talk',
        say: [
          'return hace que la función te DEVUELVA un resultado, para usarlo afuera.',
          'sumar(2, 3) devuelve 5, y el print lo muestra.',
        ],
        lang: 'python',
        code: 'def sumar(a, b):\n    return a + b\n\nprint(sumar(2, 3))',
        highlight: [2],
        output: ['5'],
      },
      {
        kind: 'fill',
        say: ['La función doble tiene que devolver el número multiplicado por 2. Poné el signo de multiplicar.'],
        lang: 'python',
        template: 'def doble(n):\n    return n ___ 2\n\nprint(doble(4))',
        expected: '8',
        hint: 'En Python, multiplicar se escribe con un asterisco: *',
        solution: ['*'],
      },
    ],
    outro: '¡Ya sos un craftero de funciones! def para crearlas, parámetros para pasarles datos y return para recibir el resultado.',
  },

  // ── 06 · El Archivista — de listas a tablas ───────────────────────────────
  {
    bossId: 'archivista',
    file: 'repaso_tablas.py',
    title: 'De listas a tablas',
    topics: ['Filas y columnas', 'len()', 'append()'],
    beats: [
      {
        kind: 'talk',
        say: [
          'Una tabla tiene filas (los renglones) y columnas (los datos de cada renglón). Como esta del cofre.',
          'En Python, una tabla se arma con una lista de diccionarios: cada diccionario es UNA FILA.',
        ],
        table: COFRE,
      },
      {
        kind: 'choice',
        say: ['Si la tabla es una lista de diccionarios... ¿qué es cada diccionario?'],
        options: ['Una fila', 'Una columna', 'La tabla entera'],
        answer: 'Una fila',
        explain: 'Cada diccionario es un renglón, y sus etiquetas ("nombre", "cantidad") son las columnas.',
      },
      {
        kind: 'talk',
        say: [
          'Con un for recorrés las filas, y en cada una sacás las columnas que quieras.',
          'Si en el print separás con coma, Python pone un espacio entre las cosas.',
        ],
        lang: 'python',
        code: 'cofre = [\n    {"nombre": "Pico", "cantidad": 1},\n    {"nombre": "Pan", "cantidad": 8},\n]\nfor fila in cofre:\n    print(fila["nombre"], fila["cantidad"])',
        highlight: [5, 6],
        output: ['Pico 1', 'Pan 8'],
      },
      {
        kind: 'fill',
        say: ['len() cuenta cuántas cosas tiene una lista: o sea, cuántas filas tiene la tabla. Escribilo.'],
        lang: 'python',
        template: 'cofre = [\n    {"nombre": "Pico", "cantidad": 1},\n    {"nombre": "Pan", "cantidad": 8},\n]\nprint(___(cofre))',
        expected: '2',
        hint: 'Son tres letras, la palabra corta de "length" (largo).',
        solution: ['len'],
      },
      {
        kind: 'fill',
        say: ['append() agrega una fila nueva al final. Sumá una Antorcha y mirá cómo cuenta 3 filas.'],
        lang: 'python',
        template: 'cofre = [\n    {"nombre": "Pico", "cantidad": 1},\n    {"nombre": "Pan", "cantidad": 8},\n]\ncofre.append({"nombre": "___", "cantidad": 3})\nprint(len(cofre))\nprint(cofre[2]["nombre"])',
        expected: '3\nAntorcha',
        hint: 'Escribí Antorcha (con A mayúscula) entre las comillas.',
        solution: ['Antorcha'],
      },
    ],
    outro: '¡Muy bien! Ya ves cómo una lista de diccionarios es una tabla. El Archivista guarda todo así.',
  },

  // ── 07 · Constructor del Vacío — CREATE TABLE · INSERT INTO ───────────────
  {
    bossId: 'constructor-vacio',
    file: 'repaso_create.sql',
    title: 'Crear una tabla y llenarla',
    topics: ['CREATE TABLE', 'TEXT e INTEGER', 'INSERT INTO'],
    beats: [
      {
        kind: 'talk',
        say: [
          '¡Bienvenido al Acto de SQL! SQL es el idioma para hablar con una base de datos: un archivo lleno de tablas.',
          'CREATE TABLE arma una tabla nueva. Adentro de los paréntesis decís qué columnas tiene y qué tipo de dato guarda cada una.',
        ],
        lang: 'sql',
        code: 'CREATE TABLE cofre (\n  nombre TEXT,\n  cantidad INTEGER\n);',
        highlight: [1],
        table: { cols: ['nombre', 'cantidad'], rows: [] },
      },
      {
        kind: 'choice',
        say: ['TEXT es para palabras. ¿Qué tipo usás para guardar un número entero, como 16 antorchas?'],
        options: ['INTEGER', 'TEXT', 'NUMERO'],
        answer: 'INTEGER',
        explain: 'INTEGER quiere decir "número entero" en inglés. TEXT es para todo lo que es texto.',
      },
      {
        kind: 'talk',
        say: [
          'La tabla nueva está vacía. INSERT INTO le agrega una fila.',
          'Primero las columnas, después VALUES con los datos en el mismo orden. El texto va entre comillas simples.',
        ],
        lang: 'sql',
        code: "INSERT INTO cofre (nombre, cantidad)\nVALUES ('Pico', 1);",
        highlight: [2],
        table: { cols: ['nombre', 'cantidad'], rows: [['Pico', 1]] },
      },
      {
        kind: 'fill',
        say: ['Guardá 5 panes en el cofre: escribí Pan en el hueco. La última línea (SELECT) solo muestra la tabla, ya la vas a conocer.'],
        lang: 'sql',
        template: "CREATE TABLE cofre (nombre TEXT, cantidad INTEGER);\nINSERT INTO cofre (nombre, cantidad)\nVALUES ('___', 5);\nSELECT * FROM cofre;",
        expected: 'Pan|5',
        hint: 'Escribí Pan, con P mayúscula. Las comillas simples ya están.',
        solution: ['Pan'],
      },
      {
        kind: 'fill',
        say: ['Ahora falta la palabra que agrega filas. Completala para guardar 16 antorchas.'],
        lang: 'sql',
        template: "CREATE TABLE cofre (nombre TEXT, cantidad INTEGER);\n___ INTO cofre (nombre, cantidad)\nVALUES ('Antorcha', 16);\nSELECT * FROM cofre;",
        expected: 'Antorcha|16',
        hint: 'Es INSERT, que en inglés quiere decir "meter adentro".',
        solution: ['INSERT'],
      },
    ],
    outro: '¡Primera tabla construida! CREATE TABLE para armarla e INSERT INTO para llenarla. El Constructor del Vacío no te gana.',
  },

  // ── 08 · Oráculo Oscuro — SELECT · WHERE · ORDER BY ───────────────────────
  {
    bossId: 'oraculo-oscuro',
    file: 'repaso_select.sql',
    title: 'Buscar datos con SELECT',
    topics: ['SELECT', 'WHERE', 'ORDER BY'],
    beats: [
      {
        kind: 'talk',
        say: [
          'SELECT es para PREGUNTARLE cosas a una tabla. El * quiere decir "todas las columnas".',
          'Vamos a usar este cofre que ya tiene 4 cosas adentro.',
        ],
        lang: 'sql',
        code: 'SELECT * FROM cofre;',
        table: COFRE,
      },
      {
        kind: 'fill',
        say: ['En vez de *, podés pedir una sola columna. Pedí solamente la columna cantidad.'],
        lang: 'sql',
        seed: COFRE_SEED,
        template: 'SELECT ___ FROM cofre;',
        expected: '1\n16\n1\n8',
        hint: 'Escribí el nombre de la columna tal cual está en la tabla: cantidad.',
        solution: ['cantidad'],
      },
      {
        kind: 'talk',
        say: [
          'WHERE es un filtro: trae solo las filas que cumplen la condición.',
          'Acá pedimos solo las cosas de diamante.',
        ],
        lang: 'sql',
        code: "SELECT * FROM cofre\nWHERE material = 'diamante';",
        highlight: [2],
        table: { cols: COFRE.cols, rows: [['Espada', 1, 'diamante'], ['Pico', 1, 'diamante']] },
      },
      {
        kind: 'fill',
        say: ['Traé el nombre de las cosas que tienen MÁS de 5 unidades (son la Antorcha y la Manzana).'],
        lang: 'sql',
        seed: COFRE_SEED,
        template: 'SELECT nombre FROM cofre\nWHERE cantidad > ___;',
        expected: 'Antorcha\nManzana',
        hint: 'Poné el número 5: "cantidad mayor que 5".',
        solution: ['5'],
      },
      {
        kind: 'talk',
        say: [
          'ORDER BY ordena el resultado. Con DESC va de mayor a menor.',
        ],
        lang: 'sql',
        code: 'SELECT nombre, cantidad FROM cofre\nORDER BY cantidad DESC;',
        highlight: [2],
        table: { cols: ['nombre', 'cantidad'], rows: [['Antorcha', 16], ['Manzana', 8], ['Espada', 1], ['Pico', 1]] },
      },
      {
        kind: 'choice',
        say: ['Si sacamos el DESC y dejamos ORDER BY cantidad solo... ¿cómo queda?'],
        options: ['De menor a mayor', 'De mayor a menor', 'Desordenado'],
        answer: 'De menor a mayor',
        explain: 'Sin DESC, ORDER BY ordena de menor a mayor (eso se llama ASC). DESC lo da vuelta.',
      },
    ],
    outro: '¡Ya sabés preguntarle a una tabla! SELECT para elegir columnas, WHERE para filtrar y ORDER BY para ordenar. El Oráculo no tiene secretos para vos.',
  },

  // ── 09 · Contador de Almas — COUNT · SUM · AVG · GROUP BY ─────────────────
  {
    bossId: 'contador-almas',
    file: 'repaso_contar.sql',
    title: 'Contar y sumar',
    topics: ['COUNT', 'SUM y AVG', 'GROUP BY'],
    beats: [
      {
        kind: 'talk',
        say: [
          'A veces no querés ver las filas, sino CONTARLAS. COUNT(*) te dice cuántas filas hay.',
          'Usamos el mismo cofre de 4 cosas.',
        ],
        lang: 'sql',
        code: 'SELECT COUNT(*) FROM cofre;',
        table: { cols: ['COUNT(*)'], rows: [[4]] },
      },
      {
        kind: 'fill',
        say: ['SUM suma todos los números de una columna. ¿Cuántas cosas hay en total en el cofre? Completá la función.'],
        lang: 'sql',
        seed: COFRE_SEED,
        template: 'SELECT ___(cantidad) FROM cofre;',
        expected: '26',
        hint: 'Sumar en inglés es "sum". Escribilo en mayúsculas: SUM.',
        solution: ['SUM'],
      },
      {
        kind: 'choice',
        say: ['Rápido: ¿cuál de estas CUENTA cuántas filas hay?'],
        options: ['COUNT', 'SUM', 'AVG'],
        answer: 'COUNT',
        explain: 'COUNT cuenta filas, SUM suma números y AVG saca el promedio.',
      },
      {
        kind: 'talk',
        say: [
          'GROUP BY junta las filas que tienen el mismo valor y hace la cuenta para cada grupo.',
          'Acá contamos cuántas cosas hay de cada material.',
        ],
        lang: 'sql',
        code: 'SELECT material, COUNT(*) FROM cofre\nGROUP BY material\nORDER BY material;',
        highlight: [2],
        table: { cols: ['material', 'COUNT(*)'], rows: [['comida', 1], ['diamante', 2], ['madera', 1]] },
      },
      {
        kind: 'fill',
        say: ['Ahora SUMÁ la cantidad de cada material, en vez de contar filas.'],
        lang: 'sql',
        seed: COFRE_SEED,
        template: 'SELECT material, ___(cantidad) FROM cofre\nGROUP BY material\nORDER BY material;',
        expected: 'comida|8\ndiamante|2\nmadera|16',
        hint: 'Es la misma función que usaste para el total: SUM.',
        solution: ['SUM'],
      },
    ],
    outro: '¡Sos un contador profesional! COUNT, SUM y GROUP BY. El Contador de Almas va a quedar sin números.',
  },

  // ── 10 · El Falsificador — UPDATE · DELETE ────────────────────────────────
  {
    bossId: 'falsificador',
    file: 'repaso_update.sql',
    title: 'Cambiar y borrar datos',
    topics: ['UPDATE', 'DELETE', 'Cuidado con WHERE'],
    beats: [
      {
        kind: 'talk',
        say: [
          'UPDATE cambia datos que ya están en la tabla. SET dice qué cambiar, y WHERE dice EN QUÉ FILA.',
          'Acá le ponemos 20 a las antorchas.',
        ],
        lang: 'sql',
        code: "UPDATE cofre SET cantidad = 20\nWHERE nombre = 'Antorcha';",
        highlight: [2],
        table: { cols: COFRE.cols, rows: [['Espada', 1, 'diamante'], ['Antorcha', 20, 'madera'], ['Pico', 1, 'diamante'], ['Manzana', 8, 'comida']] },
      },
      {
        kind: 'fill',
        say: ['Ahora cambiá la cantidad de manzanas a 10.'],
        lang: 'sql',
        seed: COFRE_SEED,
        template: "UPDATE cofre SET cantidad = ___\nWHERE nombre = 'Manzana';\nSELECT nombre, cantidad FROM cofre WHERE nombre = 'Manzana';",
        expected: 'Manzana|10',
        hint: 'Después del = va el número nuevo: 10.',
        solution: ['10'],
      },
      {
        kind: 'talk',
        say: [
          'DELETE borra filas. También necesita WHERE para saber cuál.',
          'Acá borramos el pico: la tabla queda con 3 filas.',
        ],
        lang: 'sql',
        code: "DELETE FROM cofre\nWHERE nombre = 'Pico';",
        highlight: [1, 2],
        table: { cols: COFRE.cols, rows: [['Espada', 1, 'diamante'], ['Antorcha', 16, 'madera'], ['Manzana', 8, 'comida']] },
      },
      {
        kind: 'fill',
        say: ['Borrá la Espada del cofre. Después contamos cuántas filas quedaron.'],
        lang: 'sql',
        seed: COFRE_SEED,
        template: "DELETE FROM cofre\nWHERE nombre = '___';\nSELECT COUNT(*) FROM cofre;",
        expected: '3',
        hint: 'Escribí Espada, con E mayúscula, igual que en la tabla.',
        solution: ['Espada'],
      },
      {
        kind: 'choice',
        say: ['Pregunta importante: ¿qué pasa si escribís DELETE FROM cofre; SIN el WHERE?'],
        options: ['Se borran TODAS las filas', 'Se borra solo la primera', 'No pasa nada'],
        answer: 'Se borran TODAS las filas',
        explain: '¡Sin WHERE, SQL no sabe cuál borrar y borra todo! Por eso el Falsificador siempre intenta que te olvides del WHERE.',
      },
    ],
    outro: '¡Bien ahí! UPDATE para cambiar, DELETE para borrar, y SIEMPRE con WHERE. El Falsificador no te va a engañar.',
  },

  // ── 11 · El Nexo — Python + sqlite3 ───────────────────────────────────────
  {
    bossId: 'el-nexo',
    file: 'repaso_sqlite3.py',
    title: 'Python habla con SQL',
    topics: ['import sqlite3', 'cursor.execute()', 'fetchone()'],
    beats: [
      {
        kind: 'talk',
        say: [
          '¡Llegamos a la frontera! Python puede hablar con una base de datos usando sqlite3.',
          'Son 3 pasos: conectar (connect), pedir un cursor, y con cursor.execute() mandar órdenes SQL.',
        ],
        lang: 'python',
        code: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT)")\ncursor.execute("INSERT INTO items VALUES ('Espada')")\ncursor.execute("SELECT nombre FROM items")\nprint(cursor.fetchone()[0])`,
        highlight: [5, 6, 7],
        output: ['Espada'],
      },
      {
        kind: 'choice',
        say: ['¿Qué hace cursor.execute(...)?'],
        options: ['Manda una orden SQL a la base', 'Imprime en pantalla', 'Cierra la base de datos'],
        answer: 'Manda una orden SQL a la base',
        explain: 'execute quiere decir "ejecutar": le pasás un texto con SQL adentro y la base lo hace.',
      },
      {
        kind: 'fill',
        say: ['Falta la palabra que manda el SELECT a la base. Completala.'],
        lang: 'python',
        template: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT)")\ncursor.execute("INSERT INTO items VALUES ('Espada')")\ncursor.___("SELECT nombre FROM items")\nprint(cursor.fetchone()[0])`,
        expected: 'Espada',
        hint: 'Es la misma palabra que aparece en las otras líneas: execute.',
        solution: ['execute'],
      },
      {
        kind: 'fill',
        say: ['Ahora guardá un Pico en vez de una Espada.'],
        lang: 'python',
        template: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT)")\ncursor.execute("INSERT INTO items VALUES ('___')")\ncursor.execute("SELECT nombre FROM items")\nprint(cursor.fetchone()[0])`,
        expected: 'Pico',
        hint: 'Escribí Pico entre las comillas simples.',
        solution: ['Pico'],
      },
      {
        kind: 'talk',
        say: [
          'Dos cosas más que vas a ver en la batalla: conn.commit() GUARDA los cambios, y conn.close() cierra la conexión.',
          'Sin commit, es como escribir en un cuaderno y no guardarlo.',
        ],
        lang: 'python',
        code: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT)")\nconn.commit()\nconn.close()\nprint("Guardado")`,
        highlight: [5, 6],
        output: ['Guardado'],
      },
    ],
    outro: '¡Puente cruzado! Python y SQL ya son amigos: connect, cursor, execute y commit. El Nexo te espera.',
  },

  // ── 12 · La Hydra — agregar y listar ──────────────────────────────────────
  {
    bossId: 'la-hydra',
    file: 'repaso_agregar.py',
    title: 'Agregar y listar',
    topics: ['Funciones + SQL', 'El signo ?', 'fetchall()'],
    beats: [
      {
        kind: 'talk',
        say: [
          'Ahora juntamos funciones y SQL: una función agregar() que mete cosas en la tabla.',
          'El ? es un lugar vacío que se llena con el valor que pasás después. Y fetchall() trae TODAS las filas.',
        ],
        lang: 'python',
        code: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT)")\n\ndef agregar(nombre):\n    cursor.execute("INSERT INTO items VALUES (?)", (nombre,))\n\nagregar("Pan")\nagregar("Pico")\n\ncursor.execute("SELECT nombre FROM items")\nfor fila in cursor.fetchall():\n    print(fila[0])`,
        highlight: [6, 7, 13],
        output: ['Pan', 'Pico'],
      },
      {
        kind: 'choice',
        say: ['¿Por qué escribimos (nombre,) con una coma al final?'],
        options: ['Para que sea una tupla de un solo valor', 'Porque Python pide coma siempre', 'Para separar dos nombres'],
        answer: 'Para que sea una tupla de un solo valor',
        explain: 'sqlite3 necesita los valores en una tupla. Una tupla de un solo valor lleva coma: (nombre,). ¡Sin la coma no funciona!',
      },
      {
        kind: 'fill',
        say: ['Usá la función para agregar una Antorcha, así la lista muestra 3 cosas.'],
        lang: 'python',
        template: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT)")\n\ndef agregar(nombre):\n    cursor.execute("INSERT INTO items VALUES (?)", (nombre,))\n\nagregar("Pan")\nagregar("Pico")\nagregar("___")\n\ncursor.execute("SELECT nombre FROM items")\nfor fila in cursor.fetchall():\n    print(fila[0])`,
        expected: 'Pan\nPico\nAntorcha',
        hint: 'Escribí Antorcha entre las comillas.',
        solution: ['Antorcha'],
      },
      {
        kind: 'fill',
        say: ['Falta el método que trae TODAS las filas para recorrerlas con el for.'],
        lang: 'python',
        template: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT)")\ncursor.execute("INSERT INTO items VALUES (?)", ("Pan",))\ncursor.execute("INSERT INTO items VALUES (?)", ("Pico",))\n\ncursor.execute("SELECT nombre FROM items")\nfor fila in cursor.___():\n    print(fila[0])`,
        expected: 'Pan\nPico',
        hint: 'fetch = traer, all = todo. Todo junto: fetchall.',
        solution: ['fetchall'],
      },
    ],
    outro: '¡Una cabeza menos! Ya sabés agregar con una función y listar con fetchall(). La Hydra está temblando.',
  },

  // ── 13 · Dragón Rojo — buscar, quitar, actualizar ─────────────────────────
  {
    bossId: 'dragon-rojo',
    file: 'repaso_buscar.py',
    title: 'Buscar, cambiar y quitar',
    topics: ['WHERE con ?', 'UPDATE desde Python', 'DELETE desde Python'],
    beats: [
      {
        kind: 'talk',
        say: [
          'Para buscar UNA cosa usamos WHERE con un ?, y le pasamos el nombre en la tupla.',
          'fetchone() trae una sola fila, y [0] saca su primer dato.',
        ],
        lang: 'python',
        code: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT, cantidad INTEGER)")\ncursor.execute("INSERT INTO items VALUES ('Pan', 3)")\ncursor.execute("INSERT INTO items VALUES ('Pico', 1)")\n\ncursor.execute("SELECT cantidad FROM items WHERE nombre = ?", ("Pan",))\nprint(cursor.fetchone()[0])`,
        highlight: [8, 9],
        output: ['3'],
      },
      {
        kind: 'fill',
        say: ['Buscá cuántos picos hay.'],
        lang: 'python',
        template: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT, cantidad INTEGER)")\ncursor.execute("INSERT INTO items VALUES ('Pan', 3)")\ncursor.execute("INSERT INTO items VALUES ('Pico', 1)")\n\ncursor.execute("SELECT cantidad FROM items WHERE nombre = ?", ("___",))\nprint(cursor.fetchone()[0])`,
        expected: '1',
        hint: 'Escribí Pico entre las comillas.',
        solution: ['Pico'],
      },
      {
        kind: 'talk',
        say: [
          'Con dos ? pasás dos valores, EN ORDEN: el primero va al primer ?, el segundo al segundo.',
          'Acá ponemos 10 panes.',
        ],
        lang: 'python',
        code: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT, cantidad INTEGER)")\ncursor.execute("INSERT INTO items VALUES ('Pan', 3)")\n\ncursor.execute("UPDATE items SET cantidad = ? WHERE nombre = ?", (10, "Pan"))\ncursor.execute("SELECT cantidad FROM items")\nprint(cursor.fetchone()[0])`,
        highlight: [7],
        output: ['10'],
      },
      {
        kind: 'fill',
        say: ['Quitá el pico de la tabla. Falta la palabra SQL que borra.'],
        lang: 'python',
        template: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT, cantidad INTEGER)")\ncursor.execute("INSERT INTO items VALUES ('Pan', 3)")\ncursor.execute("INSERT INTO items VALUES ('Pico', 1)")\n\ncursor.execute("___ FROM items WHERE nombre = ?", ("Pico",))\ncursor.execute("SELECT COUNT(*) FROM items")\nprint(cursor.fetchone()[0])`,
        expected: '1',
        hint: 'Es la misma palabra que en SQL: DELETE.',
        solution: ['DELETE'],
      },
    ],
    outro: '¡Fuego apagado! Buscar, cambiar y quitar desde Python. El Dragón Rojo no sabe lo que le espera.',
  },

  // ── 14 · El Arquitecto — todo junto ───────────────────────────────────────
  {
    bossId: 'el-arquitecto',
    file: 'repaso_final.py',
    title: 'Todo junto',
    topics: ['Variables y f-strings', 'for', 'sqlite3'],
    beats: [
      {
        kind: 'talk',
        say: [
          'Último repaso antes del gran final. El Arquitecto usa TODO lo que aprendiste, así que lo repasamos en un solo programa.',
          'Mirá: una lista, un for que guarda cada cosa en la tabla, un COUNT y un f-string para mostrar el total.',
        ],
        lang: 'python',
        code: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT)")\n\nfor nombre in ["Pan", "Pico", "Antorcha"]:\n    cursor.execute("INSERT INTO items VALUES (?)", (nombre,))\n\ncursor.execute("SELECT COUNT(*) FROM items")\ntotal = cursor.fetchone()[0]\nprint(f"Tenés {total} items")`,
        highlight: [6, 7, 11],
        output: ['Tenés 3 items'],
      },
      {
        kind: 'fill',
        say: ['Completá el f-string para que muestre la variable total.'],
        lang: 'python',
        template: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT)")\n\nfor nombre in ["Pan", "Pico", "Antorcha"]:\n    cursor.execute("INSERT INTO items VALUES (?)", (nombre,))\n\ncursor.execute("SELECT COUNT(*) FROM items")\ntotal = cursor.fetchone()[0]\nprint(f"Tenés {___} items")`,
        expected: 'Tenés 3 items',
        hint: 'Adentro de las llaves va el nombre de la variable que guardó el COUNT: total.',
        solution: ['total'],
      },
      {
        kind: 'fill',
        say: ['Agregá una cuarta cosa a la lista, una Espada, y mirá cómo cambia el total.'],
        lang: 'python',
        template: `${PY_DB}\ncursor.execute("CREATE TABLE items (nombre TEXT)")\n\nfor nombre in ["Pan", "Pico", "Antorcha", "___"]:\n    cursor.execute("INSERT INTO items VALUES (?)", (nombre,))\n\ncursor.execute("SELECT COUNT(*) FROM items")\ntotal = cursor.fetchone()[0]\nprint(f"Tenés {total} items")`,
        expected: 'Tenés 4 items',
        hint: 'Escribí Espada entre las comillas: cualquier nombre suma uno más.',
        solution: ['Espada'],
      },
      {
        kind: 'choice',
        say: ['Y para cerrar: si después de cambiar la tabla te olvidás de conn.commit()... ¿qué pasa?'],
        options: ['Los cambios no se guardan', 'Se borra Python', 'Se guardan igual'],
        answer: 'Los cambios no se guardan',
        explain: 'commit es el botón de "guardar". Sin él, los cambios se pierden al cerrar. ¡El Arquitecto lo sabe!',
      },
    ],
    outro: 'Ya está. Repasaste todo el taller. Respirá hondo: estás listo para enfrentar al Arquitecto.',
  },
]

const BY_BOSS = new Map(REPASOS.map((r) => [r.bossId, r]))

export function getRepaso(bossId: string): Repaso | undefined {
  return BY_BOSS.get(bossId)
}

export const REPASO_BOSS_IDS = REPASOS.map((r) => r.bossId)

/** Reemplaza los huecos ___ del template, en orden, con lo que escribió el alumno. */
export function fillTemplate(template: string, values: string[]): string {
  let i = 0
  return template.replace(/___/g, () => values[i++] ?? '')
}

export function blankCount(template: string): number {
  return (template.match(/___/g) ?? []).length
}
