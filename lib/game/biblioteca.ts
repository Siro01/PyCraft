// La Biblioteca: un estante por acto con un libro por tema. Cada libro es un
// "grimorio": páginas de teoría paso a paso con un ejemplo que se puede
// editar y ejecutar de verdad (Pyodide / sql.js), y al final una mesa de
// hechizos — práctica con huecos, parecida a lo que pide el jefe del tema,
// que se "lanza" contra un muñeco de práctica.
//
// Los libros están siempre abiertos (decisión del docente): sirven para
// adelantarse, repasar o consultar una duda del patio de juegos.

import { CHALLENGES } from './challenges'

export type BookLang = 'python' | 'sql'

export interface BookPage {
  title: string
  /** Explicación corta, en criollo. `código` entre backticks se pinta como código. */
  text: string
  /** Ejemplo editable. */
  code: string
  lang: BookLang
  /** Líneas (desde 1) que importan en este paso. */
  highlight?: number[]
  /** Una consigna para experimentar con el ejemplo ("cambiá esto y mirá qué pasa"). */
  tryIt?: string
  /** Aviso al pie (el error típico de este paso). */
  warn?: string
  /** SQL: tabla de arranque solo para esta página (pisa la del libro). */
  seed?: string
  /** SQL: consulta que se corre después del ejemplo para ver cómo quedó la tabla. */
  peek?: string
}

export interface Spell {
  id: string
  /** Qué tiene que lograr el hechizo. */
  prompt: string
  /** Código con huecos `___`. */
  template: string
  /** Salida exacta que tiene que dar (SQL: filas con `|`, una por línea). */
  expected: string
  /** Lo que va en cada hueco (para "Mostrar respuesta"). */
  answers: string[]
  hint: string
  seed?: string
  peek?: string
}

export interface Book {
  id: string
  actKey: string
  /** Título completo (en la tapa y la placa). */
  title: string
  /** Lo que entra en el lomo. */
  spine: string
  lang: BookLang
  /** Glifo del lomo: id de jefe (BossTopicIcon) o 'print' / 'input' / 'bug'. */
  glyph: string
  /** Jefe que prepara este libro (sus misiones se muestran al final). */
  bossId?: string
  /** Tandas del patio de juegos que explica. */
  playground?: string[]
  /** Ejercicio puntual del patio → página del libro que lo explica. */
  playgroundPages?: Record<string, number>
  /** Rodolfo, de bibliotecario, presentando el libro. */
  intro: string
  /** SQL: tabla de arranque para todas las páginas y hechizos. */
  seed?: string
  /** Python: código invisible que corre antes de cada ejemplo (arma la base de datos). */
  prelude?: string
  /** Una línea que cuenta qué datos ya hay preparados (cuando hay seed o prelude). */
  setup?: string
  pages: BookPage[]
  spells: Spell[]
  /** "Para ganarle, acordate de…" */
  bossTips?: string[]
}

// ─── Datos de arranque ───────────────────────────────────────────────────────

const COFRE_SEED = `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, cantidad INTEGER);
INSERT INTO cofre VALUES (1, 'Espada', 'diamante', 1);
INSERT INTO cofre VALUES (2, 'Antorcha', 'madera', 16);
INSERT INTO cofre VALUES (3, 'Pico', 'diamante', 1);
INSERT INTO cofre VALUES (4, 'Manzana', 'comida', 8);`

const ITEMS_SEED = 'CREATE TABLE items (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER);'

const MOBS_SEED = `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, hp INTEGER);
INSERT INTO monstruos VALUES (1, 'Creeper', 'Creeper', 20);
INSERT INTO monstruos VALUES (2, 'Zombi', 'No-muerto', 20);
INSERT INTO monstruos VALUES (3, 'Esqueleto', 'No-muerto', 20);
INSERT INTO monstruos VALUES (4, 'Creeper cargado', 'Creeper', 40);
INSERT INTO monstruos VALUES (5, 'Araña', 'Bicho', 16);`

// Acto III/IV: el archivo inventario.db (vive en el disco virtual de Pyodide)
// se rearma en cada ejecución, así los ejemplos con funciones que abren y
// cierran la conexión funcionan igual que en la batalla y siempre arrancan
// con los mismos 4 ítems.
const INVENTARIO_PRELUDE = `import sqlite3 as _sq
_c = _sq.connect("inventario.db")
_c.execute("DROP TABLE IF EXISTS cofre")
_c.execute("CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, cantidad INTEGER)")
_c.executemany("INSERT INTO cofre (nombre, tipo, cantidad) VALUES (?, ?, ?)", [("Espada", "arma", 1), ("Arco", "arma", 1), ("Antorcha", "luz", 16), ("Pico", "herramienta", 1)])
_c.commit()
_c.close()
del _sq, _c`

const INVENTARIO_SETUP = 'Ya hay un archivo inventario.db con la tabla cofre: Espada, Arco, Antorcha y Pico.'

// ─── ACTO I · Python ─────────────────────────────────────────────────────────

const ACT_I: Book[] = [
  {
    id: 'variables',
    actKey: 'python',
    title: 'Variables y tipos de datos',
    spine: 'Variables',
    lang: 'python',
    glyph: 'creeper-formulario',
    bossId: 'creeper-formulario',
    playground: ['variables'],
    playgroundPages: { 'var-1': 1, 'var-2': 1, 'var-3': 1, 'var-4': 1 },
    intro: 'Este es el primer hechizo de todo programador: guardar cosas con un nombre para usarlas después.',
    pages: [
      {
        title: 'Una variable es una etiqueta',
        text: 'Escribís el nombre de la etiqueta, un signo `=` y lo que querés guardar. Después usás el nombre cada vez que lo necesites.',
        lang: 'python',
        code: 'nombre_item = "Espada"\nprint(nombre_item)',
        highlight: [1],
        tryIt: 'Cambiá "Espada" por tu ítem favorito y ejecutá.',
      },
      {
        title: 'Los cuatro tipos de datos',
        text: 'Texto (`str`) va entre comillas. Enteros (`int`) y decimales (`float`) van sin comillas, y el decimal lleva punto. `True` y `False` son del tipo `bool`.',
        lang: 'python',
        code: 'nombre = "Steve"\nvidas = 3\nvelocidad = 1.5\nvolando = False\nprint(type(nombre), type(vidas))\nprint(type(velocidad), type(volando))',
        highlight: [1, 2, 3, 4],
        tryIt: 'Poné vidas = "3" (con comillas) y fijate qué tipo aparece.',
      },
      {
        title: '"3" no es lo mismo que 3',
        text: 'Con números, `+` suma. Con textos, `+` los pega uno al lado del otro. Por eso las comillas cambian todo.',
        lang: 'python',
        code: 'print(3 + 2)\nprint("3" + "2")',
        tryIt: 'Probá print("3" + 2): Python no te deja mezclar texto con números.',
      },
      {
        title: 'Una variable puede cambiar',
        text: 'Tomás el valor viejo, le hacés una cuenta y lo volvés a guardar en la misma etiqueta. `+= 1` es el atajo de "sumale uno".',
        lang: 'python',
        code: 'cantidad = 3\ncantidad = cantidad + 1\nprint(cantidad)\ncantidad += 1\nprint(cantidad)',
        highlight: [2, 4],
      },
      {
        title: 'Nombres que valen',
        text: 'Sin espacios (usá `_`), sin arrancar con un número y sin tildes. Mayúsculas y minúsculas son distintas: `Vida` y `vida` son dos etiquetas diferentes.',
        lang: 'python',
        code: 'vida_maxima = 20\npeso_total = 2.5 * 3 + 10\nprint(vida_maxima, peso_total)',
        highlight: [1, 2],
        warn: '"vida maxima = 20" o "2vidas = 20" dan SyntaxError.',
      },
    ],
    spells: [
      {
        id: 'var-s1',
        prompt: 'Guardá el texto Diamante en la variable bloque.',
        template: 'bloque = ___\nprint(bloque)',
        expected: 'Diamante',
        answers: ['"Diamante"'],
        hint: 'El texto va entre comillas: "Diamante".',
      },
      {
        id: 'var-s2',
        prompt: 'Tenés 7 manzanas. Hacé que se impriman 10.',
        template: 'manzanas = 7\nmanzanas = manzanas + ___\nprint(manzanas)',
        expected: '10',
        answers: ['3'],
        hint: 'Si tenés 7, ¿cuántas te faltan para llegar a 10? Va sin comillas: es un número.',
      },
      {
        id: 'var-s3',
        prompt: 'Calculá el peso del cofre: 3 lingotes de 2.5 más una espada de 10. Tiene que dar 17.5.',
        template: 'peso_total = ___ * 2.5 + 10\nprint(peso_total)',
        expected: '17.5',
        answers: ['3'],
        hint: 'Son 3 lingotes: 3 * 2.5 da 7.5, y más 10 da 17.5.',
      },
    ],
    bossTips: [
      'Texto entre comillas, números sin comillas.',
      'El decimal se escribe con punto: 2.5, nunca 2,5.',
      'True y False van con mayúscula y sin comillas.',
      'Si no sabés qué guarda una variable, imprimila con print().',
    ],
  },
  {
    id: 'print',
    actKey: 'python',
    title: 'print() y f-strings',
    spine: 'print()',
    lang: 'python',
    glyph: 'print',
    playground: ['print'],
    playgroundPages: { 'print-1': 1, 'print-2': 2, 'print-3': 2, 'print-4': 1 },
    intro: 'print() es tu linterna: todo lo que tu programa sabe, lo ves en pantalla gracias a él.',
    pages: [
      {
        title: 'print() muestra en pantalla',
        text: 'Lo que pongas entre los paréntesis aparece en la consola. Texto entre comillas, números solos.',
        lang: 'python',
        code: 'print("¡Hola, mundo de bloques!")\nprint(42)',
        tryIt: 'Agregá una tercera línea con tu nombre.',
      },
      {
        title: 'Varias cosas, separadas por comas',
        text: 'Si le pasás varios datos separados por coma, print() los muestra en la misma línea y agrega un espacio entre cada uno.',
        lang: 'python',
        code: 'vida = 20\nprint("Vida:", vida)\nprint("Nivel", 3, "de", 10)',
        highlight: [2, 3],
      },
      {
        title: 'f-strings: variables adentro del texto',
        text: 'Una `f` antes de las comillas te deja meter variables entre llaves `{}`. Python reemplaza cada llave por su valor.',
        lang: 'python',
        code: 'nombre = "Steve"\ndiamantes = 3\nprint(f"{nombre} tiene {diamantes} diamantes")',
        highlight: [3],
        tryIt: 'Creá una variable pico = "de hierro" y sumala a la frase con otra {}.',
      },
      {
        title: 'Cuentas adentro de las llaves',
        text: 'Dentro de `{}` también podés hacer cuentas. Se calcula primero y después se escribe el resultado.',
        lang: 'python',
        code: 'madera = 4\nprint(f"El doble de {madera} es {madera * 2}")',
        highlight: [2],
      },
      {
        title: 'Sin la f, no hay magia',
        text: 'Si te olvidás la `f`, las llaves se imprimen tal cual, con el nombre de la variable adentro.',
        lang: 'python',
        code: 'nombre = "Alex"\nprint("Hola {nombre}")\nprint(f"Hola {nombre}")',
        highlight: [2, 3],
        warn: 'La f va pegada a las comillas: f"…", no f "…".',
      },
    ],
    spells: [
      {
        id: 'print-s1',
        prompt: 'Imprimí exactamente: Vida: 20',
        template: 'vida = 20\nprint("Vida:", ___)',
        expected: 'Vida: 20',
        answers: ['vida'],
        hint: 'Después de la coma va el nombre de la variable, sin comillas.',
      },
      {
        id: 'print-s2',
        prompt: 'Activá el f-string para que diga: Tengo un Pico',
        template: 'item = "Pico"\nprint(___"Tengo un {item}")',
        expected: 'Tengo un Pico',
        answers: ['f'],
        hint: 'Falta una sola letra pegada a las comillas.',
      },
      {
        id: 'print-s3',
        prompt: 'Mostrá el DOBLE de oro con una cuenta adentro de las llaves.',
        template: 'oro = 5\nprint(f"Oro: {___}")',
        expected: 'Oro: 10',
        answers: ['oro * 2'],
        hint: 'Adentro de {} podés escribir oro * 2.',
      },
    ],
  },
  {
    id: 'input',
    actKey: 'python',
    title: 'input() y conversión',
    spine: 'input()',
    lang: 'python',
    glyph: 'input',
    playground: ['input'],
    playgroundPages: { 'input-1': 1, 'input-2': 2, 'input-3': 1, 'input-4': 3 },
    intro: 'Con input() tu programa le hace preguntas al jugador. Ojo: siempre te contesta con texto.',
    pages: [
      {
        title: 'input() le pregunta al jugador',
        text: 'El programa se frena, muestra la pregunta y espera. Cuando ejecutes, se abre una ventanita del navegador para que escribas.',
        lang: 'python',
        code: 'nombre = input("¿Cómo te llamás? ")\nprint(f"¡Hola, {nombre}!")',
        highlight: [1],
      },
      {
        title: 'Siempre devuelve texto',
        text: 'Aunque escribas un número, input() te lo entrega como `str`. Por eso no podés hacer cuentas directo con lo que devuelve.',
        lang: 'python',
        code: 'edad = input("¿Cuántos años tenés? ")\nprint(type(edad))\nprint(edad + 1)',
        highlight: [2, 3],
        warn: 'La línea 3 da TypeError: texto + número no se puede sumar.',
      },
      {
        title: 'int() lo convierte en número',
        text: 'Envolvés el input() con `int()` y el texto "12" pasa a ser el número 12. Ahora sí se puede sumar.',
        lang: 'python',
        code: 'edad = int(input("¿Cuántos años tenés? "))\nprint(edad + 1)',
        highlight: [1],
        tryIt: 'Escribí "doce" con letras cuando te pregunte: int() no sabe leer palabras.',
      },
      {
        title: 'float() para decimales, str() para volver',
        text: '`float()` convierte en decimal. `str()` hace lo contrario: convierte un número en texto para pegarlo con `+`.',
        lang: 'python',
        code: 'peso = float("2.5")\nprint(peso * 2)\nflechas = 7\nprint("Tengo " + str(flechas) + " flechas")',
        highlight: [1, 4],
      },
    ],
    spells: [
      {
        id: 'input-s1',
        prompt: 'Convertí el texto "12" en número entero para que se imprima 13.',
        template: 'texto = "12"\nnumero = ___(texto)\nprint(numero + 1)',
        expected: '13',
        answers: ['int'],
        hint: 'La función que convierte a entero tiene 3 letras.',
      },
      {
        id: 'input-s2',
        prompt: 'Convertí "2.5" en decimal para que se imprima 5.0.',
        template: 'precio = ___("2.5")\nprint(precio * 2)',
        expected: '5.0',
        answers: ['float'],
        hint: 'Para números con coma decimal se usa float.',
      },
      {
        id: 'input-s3',
        prompt: 'Pegá el número al texto: Tengo 7 flechas',
        template: 'flechas = 7\nprint("Tengo " + ___(flechas) + " flechas")',
        expected: 'Tengo 7 flechas',
        answers: ['str'],
        hint: 'Para pegar con + todo tiene que ser texto: str(flechas).',
      },
    ],
  },
  {
    id: 'condicionales',
    actKey: 'python',
    title: 'Condicionales if / elif / else',
    spine: 'if / else',
    lang: 'python',
    glyph: 'guardian-puerta',
    bossId: 'guardian-puerta',
    playground: ['condicionales'],
    playgroundPages: { 'if-1': 2, 'if-2': 1, 'if-3': 3, 'if-4': 1 },
    intro: 'Con if tu programa toma decisiones, como el Guardián cuando decide si te deja pasar.',
    pages: [
      {
        title: 'if: si se cumple, hace algo',
        text: 'Python mira la condición. Si es verdadera, ejecuta las líneas con sangría (el espacio de la izquierda). Si no, las saltea.',
        lang: 'python',
        code: 'bloque = "diamante"\nif bloque == "diamante":\n    print("¡Pasá!")',
        highlight: [2, 3],
        tryIt: 'Cambiá "diamante" por "tierra" en la línea 1. ¿Qué se imprime?',
      },
      {
        title: 'else: todo lo demás',
        text: '`else` es el "si no". Se ejecuta cuando la condición del if es falsa. No lleva condición propia.',
        lang: 'python',
        code: 'bloque = "tierra"\nif bloque == "diamante":\n    print("¡Pasá!")\nelse:\n    print("Atrás.")',
        highlight: [4, 5],
      },
      {
        title: 'elif: más caminos',
        text: 'Se revisan de arriba hacia abajo y solo se ejecuta el PRIMERO que se cumple. Los demás se saltean.',
        lang: 'python',
        code: 'bloque = "hierro"\nif bloque == "diamante":\n    print("Excelente")\nelif bloque == "hierro":\n    print("Bueno")\nelse:\n    print("Regular")',
        highlight: [4, 5],
        tryIt: 'Probá con "oro" y con "diamante".',
      },
      {
        title: 'Comparar no es guardar',
        text: 'Un `=` guarda. `==` compara y da True o False. También existen `!=` (distinto), `>`, `<`, `>=` y `<=`.',
        lang: 'python',
        code: 'salud = 4\nprint(salud == 4)\nprint(salud != 4)\nprint(salud > 10)\nprint(salud <= 5)',
        highlight: [2, 3, 4, 5],
      },
      {
        title: 'and / or: dos condiciones juntas',
        text: 'Con `and` tienen que cumplirse las dos. Con `or` alcanza con una.',
        lang: 'python',
        code: 'tiene_llave = True\nnivel = 7\nif tiene_llave and nivel >= 5:\n    print("La puerta se abre")\nelse:\n    print("Todavía no")',
        highlight: [3],
        tryIt: 'Cambiá nivel a 3. Después cambiá and por or.',
      },
      {
        title: 'Los dos puntos y la sangría',
        text: 'Toda línea con if, elif o else termina en `:`. Lo que va adentro se corre 4 espacios a la derecha.',
        lang: 'python',
        code: 'salud = 4\nif salud <= 5\n    print("¡Peligro!")',
        highlight: [2],
        warn: 'Este ejemplo tiene un error a propósito: falta el ":" en la línea 2. Arreglalo y ejecutá.',
      },
    ],
    spells: [
      {
        id: 'if-s1',
        prompt: 'Que el Guardián te deje pasar: tiene que imprimir Puedes pasar.',
        template: 'espada = "diamante"\nif espada == ___:\n    print("Puedes pasar")\nelse:\n    print("No puedes pasar")',
        expected: 'Puedes pasar',
        answers: ['"diamante"'],
        hint: 'Compará con el mismo texto que tiene la espada, entre comillas.',
      },
      {
        id: 'if-s2',
        prompt: 'Con salud 4, tiene que avisar: ¡Peligro! Salud crítica',
        template: 'salud = 4\nif salud ___ 5:\n    print("¡Peligro! Salud crítica")\nelse:\n    print("Todo bien")',
        expected: '¡Peligro! Salud crítica',
        answers: ['<='],
        hint: '"Menor o igual" se escribe <=.',
      },
      {
        id: 'if-s3',
        prompt: 'Completá el elif para que el hierro diga Bueno.',
        template: 'bloque = "hierro"\nif bloque == "diamante":\n    print("Excelente")\n___ bloque == "hierro":\n    print("Bueno")\nelse:\n    print("Regular")',
        expected: 'Bueno',
        answers: ['elif'],
        hint: 'Es la palabra para "si no, si…": elif.',
      },
    ],
    bossTips: [
      'Para comparar se usan dos iguales: ==.',
      'if, elif y else terminan con dos puntos.',
      'Lo de adentro va con sangría (4 espacios).',
      'El Guardián compara textos exactos: "Diamante" no es "diamante".',
    ],
  },
  {
    id: 'bucles',
    actKey: 'python',
    title: 'Bucles for y while',
    spine: 'Bucles',
    lang: 'python',
    glyph: 'golem-infinito',
    bossId: 'golem-infinito',
    playground: ['bucles'],
    playgroundPages: { 'loop-1': 0, 'loop-2': 4, 'loop-3': 1, 'loop-4': 5 },
    intro: 'Los bucles son el hechizo de repetir. El Golem quiere exactamente las vueltas justas: ni una más.',
    pages: [
      {
        title: 'for: repetir una cantidad exacta',
        text: '`range(3)` genera 0, 1 y 2. El bloque con sangría se repite una vez por cada número.',
        lang: 'python',
        code: 'for golpe in range(3):\n    print("Golpe", golpe)',
        highlight: [1],
        tryIt: 'Cambiá el 3 por 5.',
      },
      {
        title: 'range(desde, hasta)',
        text: 'Con dos números elegís dónde arranca. El "hasta" nunca se incluye: `range(1, 6)` va del 1 al 5.',
        lang: 'python',
        code: 'for n in range(1, 6):\n    print(n)',
        highlight: [1],
      },
      {
        title: 'Contar para atrás',
        text: 'Un tercer número es el salto. Con `-1` cuenta hacia atrás, como una cuenta regresiva.',
        lang: 'python',
        code: 'for n in range(5, 0, -1):\n    print(n)\nprint("¡El árbol está listo para cosechar!")',
        highlight: [1],
        tryIt: 'Probá un salto de -2.',
      },
      {
        title: 'for también recorre listas',
        text: 'En cada vuelta, la variable toma el siguiente elemento de la lista.',
        lang: 'python',
        code: 'bloques = ["piedra", "tierra", "oro"]\nfor b in bloques:\n    print("Picaste", b)',
        highlight: [2, 3],
      },
      {
        title: 'while: repetir mientras se cumpla',
        text: 'Como el pico: se usa mientras la durabilidad sea mayor a 0. Cada vuelta tiene que cambiar algo, si no, nunca termina.',
        lang: 'python',
        code: 'durabilidad = 3\nwhile durabilidad > 0:\n    print("Picando...", durabilidad)\n    durabilidad -= 1\nprint("¡El pico se rompió!")',
        highlight: [2, 4],
      },
      {
        title: 'El bucle infinito',
        text: 'Si nada cambia la condición, el while da vueltas para siempre. Ejecutalo: el motor lo frena a los 3 segundos.',
        lang: 'python',
        code: 'durabilidad = 3\nwhile durabilidad > 0:\n    print("Picando...")',
        highlight: [2],
        warn: 'Falta la línea que baja la durabilidad. Agregá "    durabilidad -= 1" y probá de nuevo.',
      },
      {
        title: 'Juntar un total',
        text: 'Arrancás un total en 0 y en cada vuelta le sumás algo. Es el truco más usado con bucles.',
        lang: 'python',
        code: 'golpes = [3, 5, 2]\ntotal = 0\nfor g in golpes:\n    total += g\nprint("Daño total:", total)',
        highlight: [2, 4],
      },
    ],
    spells: [
      {
        id: 'loop-s1',
        prompt: 'Imprimí los números del 1 al 5, uno por línea.',
        template: 'for n in range(1, ___):\n    print(n)',
        expected: '1\n2\n3\n4\n5',
        answers: ['6'],
        hint: 'El "hasta" no se incluye: para llegar al 5 tenés que poner uno más.',
      },
      {
        id: 'loop-s2',
        prompt: 'El pico pierde 1 de durabilidad por golpe. Que se rompa después de 3 golpes.',
        template: 'durabilidad = 3\nwhile durabilidad > 0:\n    print("Golpe")\n    durabilidad -= ___\nprint("¡Se rompió!")',
        expected: 'Golpe\nGolpe\nGolpe\n¡Se rompió!',
        answers: ['1'],
        hint: 'Cada golpe resta 1.',
      },
      {
        id: 'loop-s3',
        prompt: 'Cuenta regresiva: 3, 2, 1 y ¡Listo!',
        template: 'for n in range(3, 0, ___):\n    print(n)\nprint("¡Listo!")',
        expected: '3\n2\n1\n¡Listo!',
        answers: ['-1'],
        hint: 'El salto para ir hacia atrás es negativo.',
      },
    ],
    bossTips: [
      'range(n) arranca en 0 y no incluye el n.',
      'En un while, algo adentro tiene que cambiar la condición.',
      'Contá las vueltas antes de ejecutar: el Golem quiere las justas.',
    ],
  },
  {
    id: 'listas',
    actKey: 'python',
    title: 'Listas y diccionarios',
    spine: 'Diccionarios',
    lang: 'python',
    glyph: 'mercader-abismo',
    bossId: 'mercader-abismo',
    intro: 'Las listas son la mochila y los diccionarios son las tarjetas de cada ítem. El Mercader del Abismo los usa todo el tiempo.',
    pages: [
      {
        title: 'Una lista guarda varias cosas',
        text: 'Va entre corchetes `[]`, separada por comas. Para leer un elemento usás su posición, que empieza en 0.',
        lang: 'python',
        code: 'mochila = ["Espada", "Pico", "Poción"]\nprint(mochila[0])\nprint(mochila[2])',
        highlight: [2, 3],
        tryIt: 'Probá mochila[3]: esa posición no existe.',
      },
      {
        title: 'append() agrega y len() cuenta',
        text: '`append` mete un elemento al final. `len` te dice cuántos hay.',
        lang: 'python',
        code: 'mochila = ["Espada"]\nmochila.append("Antorcha")\nmochila.append("Pan")\nprint(mochila)\nprint(len(mochila))',
        highlight: [2, 5],
      },
      {
        title: 'Un diccionario es una tarjeta',
        text: 'Cada dato tiene un nombre (la clave) y un valor. Para leer uno, escribís la clave entre corchetes y comillas.',
        lang: 'python',
        code: 'item = {"nombre": "Espada", "cantidad": 3, "material": "diamante"}\nprint(item["nombre"])\nprint(item["material"])',
        highlight: [2, 3],
      },
      {
        title: 'La tarjeta se puede modificar',
        text: 'Asignás un valor nuevo a una clave y la tarjeta se actualiza. Si la clave no existía, se agrega.',
        lang: 'python',
        code: 'item = {"nombre": "Espada", "cantidad": 3}\nitem["cantidad"] = 4\nitem["encantada"] = True\nprint(item)',
        highlight: [2, 3],
      },
      {
        title: 'Una lista de tarjetas es un cofre',
        text: '`cofre[1]` es la segunda tarjeta, y `["nombre"]` lee su campo. Se combinan uno atrás del otro.',
        lang: 'python',
        code: 'cofre = [\n    {"nombre": "Espada", "cantidad": 1},\n    {"nombre": "Antorcha", "cantidad": 16},\n]\nprint(cofre[1]["nombre"])',
        highlight: [5],
      },
      {
        title: 'Recorrer el cofre con for',
        text: 'El for pasa por cada tarjeta y adentro leés los campos que quieras.',
        lang: 'python',
        code: 'cofre = [\n    {"nombre": "Espada", "cantidad": 1},\n    {"nombre": "Antorcha", "cantidad": 16},\n]\nfor item in cofre:\n    print(item["nombre"], "x", item["cantidad"])',
        highlight: [5, 6],
      },
    ],
    spells: [
      {
        id: 'list-s1',
        prompt: 'Imprimí el PRIMER elemento de la mochila.',
        template: 'mochila = ["Espada", "Pico", "Poción"]\nprint(mochila[___])',
        expected: 'Espada',
        answers: ['0'],
        hint: 'Las posiciones empiezan a contarse desde 0.',
      },
      {
        id: 'list-s2',
        prompt: 'Leé el material de la tarjeta.',
        template: 'item = {"nombre": "Pico", "material": "diamante"}\nprint(item[___])',
        expected: 'diamante',
        answers: ['"material"'],
        hint: 'La clave va entre comillas: "material".',
      },
      {
        id: 'list-s3',
        prompt: 'Recorré el cofre e imprimí el nombre de cada ítem.',
        template: 'cofre = [{"nombre": "Espada"}, {"nombre": "Arco"}]\nfor ___ in cofre:\n    print(item["nombre"])',
        expected: 'Espada\nArco',
        answers: ['item'],
        hint: 'Adentro del for se usa la variable item: esa es la que va en el hueco.',
      },
    ],
    bossTips: [
      'Las posiciones de una lista empiezan en 0.',
      'Las claves de un diccionario van entre comillas.',
      'cofre[0]["nombre"]: primero la posición, después la clave.',
    ],
  },
  {
    id: 'funciones',
    actKey: 'python',
    title: 'Funciones con parámetros',
    spine: 'Funciones',
    lang: 'python',
    glyph: 'maestro-craftero',
    bossId: 'maestro-craftero',
    intro: 'Una función es una receta de crafteo: la escribís una vez y la usás todas las veces que quieras.',
    pages: [
      {
        title: 'def crea una receta',
        text: 'Escribís `def`, el nombre, paréntesis y dos puntos. Lo de adentro no se ejecuta hasta que la llamás por su nombre.',
        lang: 'python',
        code: 'def saludar():\n    print("¡Hola, aprendiz!")\n\nsaludar()\nsaludar()',
        highlight: [1, 4, 5],
        tryIt: 'Borrá las dos últimas líneas: la función existe pero no hace nada.',
      },
      {
        title: 'Los parámetros son los ingredientes',
        text: 'Lo que va entre paréntesis en el `def` son datos que la función recibe. Cada llamada le puede pasar algo distinto.',
        lang: 'python',
        code: 'def saludar(nombre):\n    print(f"Hola, {nombre}!")\n\nsaludar("Steve")\nsaludar("Alex")',
        highlight: [1, 4, 5],
      },
      {
        title: 'Varios parámetros',
        text: 'Se separan con comas, y al llamarla los datos van en el mismo orden.',
        lang: 'python',
        code: 'def agregar_item(lista_cofre, nuevo_item):\n    lista_cofre.append(nuevo_item)\n\ncofre = []\nagregar_item(cofre, "Espada")\nagregar_item(cofre, "Pico")\nprint(cofre)',
        highlight: [1, 5, 6],
      },
      {
        title: 'return devuelve un resultado',
        text: 'Con `return` la función te entrega un valor que podés guardar en una variable o imprimir.',
        lang: 'python',
        code: 'def doble(n):\n    return n * 2\n\nresultado = doble(4)\nprint(resultado)\nprint(doble(10))',
        highlight: [2, 4],
      },
      {
        title: 'return con decisiones',
        text: 'Adentro de una función podés usar if. Apenas se ejecuta un `return`, la función termina.',
        lang: 'python',
        code: 'def rango(puntos):\n    if puntos >= 10:\n        return "diamante"\n    return "hierro"\n\nprint(rango(15))\nprint(rango(3))',
        highlight: [2, 3, 4],
        tryIt: 'Agregá un elif para que con 5 o más devuelva "oro".',
      },
    ],
    spells: [
      {
        id: 'fn-s1',
        prompt: 'Llamá a la función para que imprima: Hola, Alex!',
        template: 'def saludar(nombre):\n    print(f"Hola, {nombre}!")\n\nsaludar(___)',
        expected: 'Hola, Alex!',
        answers: ['"Alex"'],
        hint: 'El nombre es texto: va entre comillas.',
      },
      {
        id: 'fn-s2',
        prompt: 'Completá el método que agrega al cofre. Al final tiene que haber 2 ítems.',
        template: 'def agregar_item(lista_cofre, nuevo_item):\n    lista_cofre.___(nuevo_item)\n\ncofre = []\nagregar_item(cofre, "Espada")\nagregar_item(cofre, "Pico")\nprint(len(cofre))',
        expected: '2',
        answers: ['append'],
        hint: 'Es el mismo método de las listas que agrega al final.',
      },
      {
        id: 'fn-s3',
        prompt: 'Que la función DEVUELVA el triple del número.',
        template: 'def triple(n):\n    ___ n * 3\n\nprint(triple(5))',
        expected: '15',
        answers: ['return'],
        hint: 'La palabra que entrega un resultado es return.',
      },
    ],
    bossTips: [
      'Definir con def no la ejecuta: hay que llamarla.',
      'Los datos se pasan en el mismo orden que los parámetros.',
      'print() muestra; return entrega el valor para usarlo después.',
    ],
  },
  {
    id: 'tablas-python',
    actKey: 'python',
    title: 'De listas a tablas',
    spine: 'A tablas',
    lang: 'python',
    glyph: 'archivista',
    bossId: 'archivista',
    intro: 'El Archivista ve tablas en todos lados. Si dibujás tu lista de diccionarios en papel, sale una planilla.',
    pages: [
      {
        title: 'Cada diccionario es una fila',
        text: 'Las claves son las columnas y cada tarjeta es una fila. Así se piensa una tabla de base de datos.',
        lang: 'python',
        code: 'cofre = [\n    {"id": 1, "nombre": "Espada", "material": "diamante"},\n    {"id": 2, "nombre": "Antorcha", "material": "madera"},\n]\nprint(cofre[0])',
        highlight: [2, 3],
      },
      {
        title: 'Imprimir como tabla',
        text: 'Con un for y un f-string armás cada renglón. El `|` separa las columnas, como en una planilla.',
        lang: 'python',
        code: 'cofre = [\n    {"id": 1, "nombre": "Espada", "material": "diamante"},\n    {"id": 2, "nombre": "Antorcha", "material": "madera"},\n]\nfor item in cofre:\n    print(f"{item[\'id\']} | {item[\'nombre\']} | {item[\'material\']}")',
        highlight: [6],
        tryIt: 'Agregá una tercera fila al cofre.',
      },
      {
        title: 'El id identifica cada fila',
        text: 'Dos ítems pueden llamarse igual, pero el id es único. Eso es una clave primaria.',
        lang: 'python',
        code: 'cofre = [\n    {"id": 1, "nombre": "Espada"},\n    {"id": 2, "nombre": "Espada"},\n]\nfor item in cofre:\n    print(item["id"], item["nombre"])',
        highlight: [2, 3],
      },
      {
        title: 'Buscar una fila por id',
        text: 'Recorrés con for y preguntás con if. En SQL esto va a ser una sola línea con WHERE.',
        lang: 'python',
        code: 'cofre = [\n    {"id": 1, "nombre": "Espada"},\n    {"id": 2, "nombre": "Antorcha"},\n]\nfor item in cofre:\n    if item["id"] == 2:\n        print("Encontré:", item["nombre"])',
        highlight: [6, 7],
      },
      {
        title: 'Python no cuida los ids repetidos',
        text: 'Podés agregar otra fila con un id que ya existe y Python no se queja. La base de datos del Acto II sí lo prohíbe.',
        lang: 'python',
        code: 'cofre = [{"id": 1, "nombre": "Espada"}]\ncofre.append({"id": 1, "nombre": "Pico"})\nfor item in cofre:\n    print(item["id"], item["nombre"])',
        highlight: [2],
        warn: 'Quedaron dos ítems con id 1: ya no se sabe cuál es cuál.',
      },
    ],
    spells: [
      {
        id: 'tab-s1',
        prompt: 'Imprimí el nombre del ítem.',
        template: 'item = {"id": 1, "nombre": "Espada"}\nprint(item[___])',
        expected: 'Espada',
        answers: ['"nombre"'],
        hint: 'La clave es "nombre", entre comillas.',
      },
      {
        id: 'tab-s2',
        prompt: 'Armá el renglón: 1 | Espada',
        template: 'item = {"id": 1, "nombre": "Espada"}\nprint(f"{item[\'id\']} | {item[\'___\']}")',
        expected: '1 | Espada',
        answers: ['nombre'],
        hint: 'Adentro del f-string la clave va con comillas simples, y ya están puestas: solo falta la palabra.',
      },
      {
        id: 'tab-s3',
        prompt: 'Buscá la fila con id 2 e imprimí su nombre.',
        template: 'cofre = [{"id": 1, "nombre": "Espada"}, {"id": 2, "nombre": "Antorcha"}]\nfor item in cofre:\n    if item["id"] == ___:\n        print(item["nombre"])',
        expected: 'Antorcha',
        answers: ['2'],
        hint: 'El id que buscás es un número, sin comillas.',
      },
    ],
    bossTips: [
      'Cada clave del diccionario es una columna.',
      'En un f-string, si usás comillas dobles afuera, adentro van simples: item[\'id\'].',
      'El id tiene que ser único en cada fila.',
    ],
  },
]

// ─── ACTO II · SQLite ────────────────────────────────────────────────────────

const ACT_II: Book[] = [
  {
    id: 'crear-tablas',
    actKey: 'sql',
    title: 'CREATE TABLE · INSERT INTO',
    spine: 'CREATE · INSERT',
    lang: 'sql',
    glyph: 'constructor-vacio',
    bossId: 'constructor-vacio',
    intro: 'Bienvenido a SQL. Antes de guardar cosas hay que construir la tabla: el Constructor del Vacío te va a pedir justo eso.',
    seed: ITEMS_SEED,
    setup: 'En las páginas 3 a 5 ya existe la tabla items (vacía).',
    pages: [
      {
        title: 'CREATE TABLE construye la planilla',
        text: 'Le ponés nombre a la tabla y describís cada columna con su tipo. Abajo ves las columnas que quedaron armadas.',
        lang: 'sql',
        seed: '',
        code: 'CREATE TABLE items (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT,\n  cantidad INTEGER\n);',
        highlight: [1, 2],
        peek: "SELECT name AS columna, type AS tipo FROM pragma_table_info('items')",
        tryIt: 'Agregá una columna material TEXT.',
      },
      {
        title: 'Los tipos de SQL',
        text: '`INTEGER` es entero, `TEXT` es texto y `REAL` es decimal. `PRIMARY KEY` marca la columna que no se puede repetir.',
        lang: 'sql',
        seed: '',
        code: 'CREATE TABLE pociones (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT,\n  duracion REAL\n);',
        highlight: [2, 3, 4],
        peek: "SELECT name AS columna, type AS tipo, pk AS clave FROM pragma_table_info('pociones')",
      },
      {
        title: 'INSERT INTO agrega una fila',
        text: '`VALUES` lleva los datos en el mismo orden que las columnas. El texto va entre comillas SIMPLES.',
        lang: 'sql',
        code: "INSERT INTO items VALUES (1, 'Espada', 3);\nINSERT INTO items VALUES (2, 'Pico', 1);",
        highlight: [1, 2],
        peek: 'SELECT * FROM items',
        tryIt: 'Agregá una tercera fila con id 3.',
      },
      {
        title: 'Nombrar las columnas',
        text: 'Si escribís qué columnas vas a llenar, el id se pone solo: SQL le da el siguiente número.',
        lang: 'sql',
        code: "INSERT INTO items (nombre, cantidad) VALUES ('Antorcha', 16);\nINSERT INTO items (nombre, cantidad) VALUES ('Pan', 4);",
        highlight: [1],
        peek: 'SELECT * FROM items',
      },
      {
        title: 'La base cuida el id por vos',
        text: 'Si intentás guardar otra fila con el mismo id, SQL la rechaza con un error. No tenés que programar esa regla.',
        lang: 'sql',
        code: "INSERT INTO items VALUES (1, 'Pico', 1);\nINSERT INTO items VALUES (1, 'Hacha', 1);",
        highlight: [2],
        peek: 'SELECT * FROM items',
        warn: 'El id 1 ya existe. Cambiá el segundo 1 por 2 y ejecutá de nuevo.',
      },
    ],
    spells: [
      {
        id: 'create-s1',
        prompt: 'Creá la tabla con el nombre items.',
        template: 'CREATE TABLE ___ (id INTEGER PRIMARY KEY, nombre TEXT);',
        expected: 'items',
        answers: ['items'],
        hint: 'El nombre de la tabla va justo después de CREATE TABLE.',
        seed: '',
        peek: "SELECT name FROM sqlite_master WHERE type = 'table'",
      },
      {
        id: 'create-s2',
        prompt: 'Insertá la Espada con id 1.',
        template: 'INSERT INTO items VALUES (1, ___, 3);',
        expected: '1|Espada|3',
        answers: ["'Espada'"],
        hint: 'En SQL el texto va entre comillas simples: \'Espada\'.',
        peek: 'SELECT * FROM items',
      },
      {
        id: 'create-s3',
        prompt: 'Insertá dos filas: la Espada y el Pico.',
        template: "INSERT INTO items VALUES (1, 'Espada', 1);\nINSERT INTO items VALUES (___, 'Pico', 1);",
        expected: '1|Espada|1\n2|Pico|1',
        answers: ['2'],
        hint: 'El id no se puede repetir.',
        peek: 'SELECT * FROM items',
      },
    ],
    bossTips: [
      'El texto en SQL va entre comillas simples.',
      'Los VALUES van en el mismo orden que las columnas.',
      'Cada orden termina con punto y coma.',
    ],
  },
  {
    id: 'consultas',
    actKey: 'sql',
    title: 'SELECT · WHERE · ORDER BY',
    spine: 'SELECT · WHERE',
    lang: 'sql',
    glyph: 'oraculo-oscuro',
    bossId: 'oraculo-oscuro',
    intro: 'El Oráculo solo responde a quien pregunta bien. SELECT es la forma de preguntarle cosas a una tabla.',
    seed: COFRE_SEED,
    setup: 'La tabla cofre ya tiene: Espada, Antorcha, Pico y Manzana.',
    pages: [
      {
        title: 'SELECT * trae todo',
        text: 'El asterisco significa "todas las columnas". `FROM` dice de qué tabla.',
        lang: 'sql',
        code: 'SELECT * FROM cofre;',
      },
      {
        title: 'Elegí las columnas',
        text: 'En vez de `*`, escribís los nombres de las columnas separados por comas.',
        lang: 'sql',
        code: 'SELECT nombre, cantidad FROM cofre;',
        tryIt: 'Pedí solo la columna material.',
      },
      {
        title: 'WHERE filtra las filas',
        text: 'Solo aparecen las filas que cumplen la condición. En Python harías un for con un if; acá es una línea.',
        lang: 'sql',
        code: "SELECT nombre FROM cofre\nWHERE material = 'diamante';",
        highlight: [2],
        tryIt: "Probá con material = 'madera'.",
      },
      {
        title: 'Comparar números y juntar condiciones',
        text: 'Con números usás `>`, `<`, `>=`, `<=`. Con `AND` tienen que cumplirse las dos condiciones; con `OR`, alcanza con una.',
        lang: 'sql',
        code: "SELECT nombre, cantidad FROM cofre\nWHERE cantidad > 5 AND material != 'comida';",
        highlight: [2],
      },
      {
        title: 'ORDER BY ordena',
        text: 'Sin nada ordena de menor a mayor (o de la A a la Z). `DESC` lo da vuelta.',
        lang: 'sql',
        code: 'SELECT nombre, cantidad FROM cofre\nORDER BY cantidad DESC;',
        highlight: [2],
      },
      {
        title: 'LIMIT se queda con los primeros',
        text: 'Combinado con ORDER BY te da el "top": acá, los 2 ítems de los que más hay.',
        lang: 'sql',
        code: 'SELECT nombre, cantidad FROM cofre\nORDER BY cantidad DESC\nLIMIT 2;',
        highlight: [3],
      },
    ],
    spells: [
      {
        id: 'select-s1',
        prompt: 'Traé la columna nombre de todos los ítems.',
        template: 'SELECT ___ FROM cofre;',
        expected: 'Espada\nAntorcha\nPico\nManzana',
        answers: ['nombre'],
        hint: 'Después de SELECT va el nombre de la columna.',
      },
      {
        id: 'select-s2',
        prompt: 'Traé solo el nombre del ítem con id 3.',
        template: 'SELECT nombre FROM cofre WHERE id = ___;',
        expected: 'Pico',
        answers: ['3'],
        hint: 'El id es un número, va sin comillas.',
      },
      {
        id: 'select-s3',
        prompt: 'Traé los ítems de diamante.',
        template: 'SELECT nombre FROM cofre WHERE material = ___;',
        expected: 'Espada\nPico',
        answers: ["'diamante'"],
        hint: "Es texto: va entre comillas simples, 'diamante'.",
      },
      {
        id: 'select-s4',
        prompt: 'Traé el ítem del que MÁS cantidad hay.',
        template: 'SELECT nombre FROM cofre ORDER BY cantidad ___ LIMIT 1;',
        expected: 'Antorcha',
        answers: ['DESC'],
        hint: 'Para ordenar de mayor a menor se usa DESC.',
      },
    ],
    bossTips: [
      'SELECT columnas FROM tabla WHERE condición.',
      "El texto en WHERE va con comillas simples: 'diamante'.",
      'Para comparar en SQL se usa un solo =.',
    ],
  },
  {
    id: 'resumenes',
    actKey: 'sql',
    title: 'COUNT · SUM · AVG · GROUP BY',
    spine: 'COUNT · SUM',
    lang: 'sql',
    glyph: 'contador-almas',
    bossId: 'contador-almas',
    intro: 'El Contador de Almas no quiere ver filas: quiere números. Estas funciones resumen una tabla entera en un resultado.',
    seed: MOBS_SEED,
    setup: 'La tabla monstruos tiene 5 filas: dos Creepers, dos No-muertos y una Araña.',
    pages: [
      {
        title: 'Así es la tabla',
        text: 'Mirala bien antes de contar: cada fila es un monstruo con su tipo y su vida (hp).',
        lang: 'sql',
        code: 'SELECT * FROM monstruos;',
      },
      {
        title: 'COUNT cuenta filas',
        text: '`COUNT(*)` responde "¿cuántas filas hay?". No le importa qué tienen adentro.',
        lang: 'sql',
        code: 'SELECT COUNT(*) FROM monstruos;',
        highlight: [1],
      },
      {
        title: 'SUM, AVG, MAX y MIN',
        text: '`SUM` suma una columna, `AVG` saca el promedio, `MAX` y `MIN` buscan el más grande y el más chico.',
        lang: 'sql',
        code: 'SELECT SUM(hp), AVG(hp), MAX(hp), MIN(hp)\nFROM monstruos;',
        highlight: [1],
      },
      {
        title: 'Contar solo algunas filas',
        text: 'Le agregás un WHERE: primero se filtra, después se cuenta.',
        lang: 'sql',
        code: "SELECT COUNT(*) FROM monstruos\nWHERE tipo = 'Creeper';",
        highlight: [2],
        tryIt: "Contá los 'No-muerto'.",
      },
      {
        title: 'GROUP BY: una cuenta por grupo',
        text: 'Junta las filas que tienen el mismo tipo y hace la cuenta para cada grupo. Una línea reemplaza un montón de if.',
        lang: 'sql',
        code: 'SELECT tipo, COUNT(*), SUM(hp)\nFROM monstruos\nGROUP BY tipo;',
        highlight: [3],
      },
    ],
    spells: [
      {
        id: 'count-s1',
        prompt: '¿Cuántos monstruos hay? Contá todas las filas.',
        template: 'SELECT ___ FROM monstruos;',
        expected: '5',
        answers: ['COUNT(*)'],
        hint: 'La función que cuenta filas es COUNT(*).',
      },
      {
        id: 'count-s2',
        prompt: 'Sumá la vida (hp) de todo el ejército.',
        template: 'SELECT SUM(___) FROM monstruos;',
        expected: '116',
        answers: ['hp'],
        hint: 'Adentro de SUM va el nombre de la columna.',
      },
      {
        id: 'count-s3',
        prompt: 'Contá solo los Creepers.',
        template: 'SELECT COUNT(*) FROM monstruos WHERE tipo = ___;',
        expected: '2',
        answers: ["'Creeper'"],
        hint: "El tipo es texto: 'Creeper', con comillas simples.",
      },
      {
        id: 'count-s4',
        prompt: 'Contá cuántos hay de cada tipo.',
        template: 'SELECT tipo, COUNT(*) FROM monstruos GROUP BY ___ ORDER BY tipo;',
        expected: 'Bicho|1\nCreeper|2\nNo-muerto|2',
        answers: ['tipo'],
        hint: 'Agrupás por la misma columna que querés ver: tipo.',
      },
    ],
    bossTips: [
      'COUNT(*) cuenta filas; SUM(columna) suma valores.',
      'El WHERE va antes del GROUP BY.',
      'Si usás GROUP BY tipo, pedí también la columna tipo en el SELECT.',
    ],
  },
  {
    id: 'modificar',
    actKey: 'sql',
    title: 'UPDATE · DELETE',
    spine: 'UPDATE · DELETE',
    lang: 'sql',
    glyph: 'falsificador',
    bossId: 'falsificador',
    intro: 'Cambiar y borrar datos es poderoso… y peligroso. El Falsificador espera que te olvides el WHERE.',
    seed: COFRE_SEED,
    setup: 'La tabla cofre ya tiene: Espada, Antorcha, Pico y Manzana. Cada ejecución arranca de cero.',
    pages: [
      {
        title: 'UPDATE cambia un dato',
        text: '`SET` dice qué cambiar y `WHERE` dice en qué fila. Abajo ves cómo quedó la tabla.',
        lang: 'sql',
        code: "UPDATE cofre SET material = 'oro'\nWHERE nombre = 'Espada';",
        highlight: [1, 2],
        peek: 'SELECT * FROM cofre',
        tryIt: 'Cambiá la cantidad del Pico a 5.',
      },
      {
        title: 'Cuentas con el valor viejo',
        text: 'Podés usar la misma columna para calcular el nuevo valor: acá gastamos una antorcha.',
        lang: 'sql',
        code: "UPDATE cofre SET cantidad = cantidad - 1\nWHERE nombre = 'Antorcha';",
        highlight: [1],
        peek: 'SELECT nombre, cantidad FROM cofre',
      },
      {
        title: 'Primero mirá con un SELECT',
        text: 'Corré un SELECT con el mismo WHERE para ver qué filas vas a tocar. Si son las que esperabas, seguís.',
        lang: 'sql',
        code: "SELECT * FROM cofre\nWHERE material = 'diamante';",
        highlight: [2],
      },
      {
        title: 'DELETE borra filas',
        text: 'Con el mismo WHERE que probaste antes, borrás solo esas filas.',
        lang: 'sql',
        code: "DELETE FROM cofre\nWHERE nombre = 'Manzana';",
        highlight: [2],
        peek: 'SELECT * FROM cofre',
      },
      {
        title: 'Sin WHERE se borra TODO',
        text: 'Es el error más común con datos reales. Antes de ejecutar un DELETE o un UPDATE, revisá que tenga su WHERE.',
        lang: 'sql',
        code: 'DELETE FROM cofre;',
        peek: 'SELECT COUNT(*) AS filas FROM cofre',
        warn: 'La tabla quedó vacía. Acá no pasa nada (cada ejecución arranca de cero), pero en una base real no hay vuelta atrás.',
      },
    ],
    spells: [
      {
        id: 'upd-s1',
        prompt: 'Cambiá el material de la Espada a oro.',
        template: "UPDATE cofre SET material = ___ WHERE nombre = 'Espada';",
        expected: 'oro',
        answers: ["'oro'"],
        hint: "Es texto: 'oro', con comillas simples.",
        peek: "SELECT material FROM cofre WHERE nombre = 'Espada'",
      },
      {
        id: 'upd-s2',
        prompt: 'Borrá la Manzana. Tienen que quedar 3 ítems.',
        template: 'DELETE FROM cofre WHERE nombre = ___;',
        expected: '3',
        answers: ["'Manzana'"],
        hint: "El nombre va entre comillas simples: 'Manzana'.",
        peek: 'SELECT COUNT(*) FROM cofre',
      },
      {
        id: 'upd-s3',
        prompt: 'Dejá el Pico con cantidad 10.',
        template: "UPDATE cofre SET cantidad = ___ WHERE nombre = 'Pico';",
        expected: '10',
        answers: ['10'],
        hint: 'La cantidad es un número, va sin comillas.',
        peek: "SELECT cantidad FROM cofre WHERE nombre = 'Pico'",
      },
    ],
    bossTips: [
      'UPDATE tabla SET columna = valor WHERE condición.',
      'Nunca un DELETE sin WHERE.',
      'Probá el WHERE con un SELECT antes de borrar.',
    ],
  },
]

// ─── ACTO III · Integración ──────────────────────────────────────────────────

const ACT_III: Book[] = [
  {
    id: 'sqlite3',
    actKey: 'mixed',
    title: 'Python + sqlite3',
    spine: 'sqlite3',
    lang: 'python',
    glyph: 'el-nexo',
    bossId: 'el-nexo',
    intro: 'Acá se juntan los dos mundos: Python le manda órdenes SQL a una base de datos. El Nexo custodia ese puente.',
    pages: [
      {
        title: 'connect abre la puerta',
        text: '`import sqlite3` trae la herramienta. `connect(":memory:")` crea una base que vive mientras corre el programa, ideal para practicar. El cursor es el mensajero.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\nprint("¡Conectado!")\nconn.close()',
        highlight: [3, 4],
      },
      {
        title: 'execute manda el SQL',
        text: 'El SQL va entre comillas adentro de `execute()`. `fetchall()` trae todas las filas como una lista.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE cofre (nombre TEXT, cantidad INTEGER)")\ncursor.execute("INSERT INTO cofre VALUES (\'Espada\', 1)")\ncursor.execute("INSERT INTO cofre VALUES (\'Antorcha\', 16)")\ncursor.execute("SELECT * FROM cofre")\nprint(cursor.fetchall())\nconn.close()',
        highlight: [5, 8, 9],
      },
      {
        title: 'Cada fila es una tupla',
        text: 'Una tupla es como una lista entre paréntesis. `fila[0]` es la primera columna, `fila[1]` la segunda.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE cofre (nombre TEXT, cantidad INTEGER)")\ncursor.execute("INSERT INTO cofre VALUES (\'Espada\', 1)")\ncursor.execute("INSERT INTO cofre VALUES (\'Antorcha\', 16)")\ncursor.execute("SELECT nombre, cantidad FROM cofre")\nfor fila in cursor.fetchall():\n    print(fila[0], "x", fila[1])\nconn.close()',
        highlight: [9, 10],
      },
      {
        title: 'Los ? llevan datos de Python',
        text: 'Cada `?` se reemplaza por un dato de la tupla, en orden. Una tupla de UN solo dato lleva coma al final: `("Pico",)`.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE cofre (nombre TEXT, cantidad INTEGER)")\nnombre = "Pico"\ncantidad = 1\ncursor.execute("INSERT INTO cofre VALUES (?, ?)", (nombre, cantidad))\ncursor.execute("SELECT * FROM cofre WHERE nombre = ?", ("Pico",))\nprint(cursor.fetchone())\nconn.close()',
        highlight: [8, 9],
        warn: 'Sin la coma, ("Pico") no es una tupla: es solo un texto entre paréntesis.',
      },
      {
        title: 'fetchone trae una sola fila',
        text: 'Para un resultado único, como un `COUNT(*)`, usás `fetchone()` y leés la posición 0.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE cofre (nombre TEXT)")\ncursor.executemany("INSERT INTO cofre VALUES (?)", [("Espada",), ("Pico",), ("Arco",)])\ncursor.execute("SELECT COUNT(*) FROM cofre")\nprint(cursor.fetchone()[0])\nconn.close()',
        highlight: [6, 8],
        tryIt: 'Agregá ("Pan",) a la lista y volvé a contar.',
      },
      {
        title: 'commit guarda, close cierra',
        text: 'Los INSERT, UPDATE y DELETE quedan grabados recién con `conn.commit()`. Al terminar, `conn.close()`.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE cofre (nombre TEXT)")\ncursor.execute("INSERT INTO cofre VALUES (\'Espada\')")\nconn.commit()\nprint("Cambios guardados")\nconn.close()',
        highlight: [7, 9],
      },
    ],
    spells: [
      {
        id: 'nexo-s1',
        prompt: 'Creá la tabla mobs para que el resto funcione.',
        template: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE ___ (nombre TEXT)")\ncursor.execute("INSERT INTO mobs VALUES (\'Zombi\')")\ncursor.execute("SELECT nombre FROM mobs")\nprint(cursor.fetchone()[0])',
        expected: 'Zombi',
        answers: ['mobs'],
        hint: 'Fijate cómo se llama la tabla en el INSERT de abajo.',
      },
      {
        id: 'nexo-s2',
        prompt: 'Pasale el dato al `?` como una tupla de un elemento.',
        template: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE mobs (nombre TEXT)")\ncursor.execute("INSERT INTO mobs VALUES (?)", ___)\ncursor.execute("SELECT COUNT(*) FROM mobs")\nprint(cursor.fetchone()[0])',
        expected: '1',
        answers: ['("Zombi",)'],
        hint: 'Una tupla de un solo dato lleva coma al final: ("Zombi",).',
      },
      {
        id: 'nexo-s3',
        prompt: 'La fila es (\'Zombi\', 20). Imprimí la vida.',
        template: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE mobs (nombre TEXT, hp INTEGER)")\ncursor.execute("INSERT INTO mobs VALUES (\'Zombi\', 20)")\ncursor.execute("SELECT nombre, hp FROM mobs")\nprint(cursor.fetchone()[___])',
        expected: '20',
        answers: ['1'],
        hint: 'La posición 0 es el nombre; la vida es la siguiente.',
      },
    ],
    bossTips: [
      'connect → cursor → execute → fetch → commit → close.',
      'Una tupla de un solo dato necesita la coma: ("Espada",).',
      'fetchone() devuelve una tupla: leé la posición que necesitás.',
    ],
  },
  {
    id: 'agregar-listar',
    actKey: 'mixed',
    title: 'Proyecto: agregar y listar',
    spine: 'Agregar y listar',
    lang: 'python',
    glyph: 'la-hydra',
    bossId: 'la-hydra',
    intro: 'A la Hydra le cortás una cabeza y vuelve. Tus datos tienen que hacer lo mismo: guardarse en un archivo y volver siempre.',
    prelude: INVENTARIO_PRELUDE,
    setup: INVENTARIO_SETUP,
    pages: [
      {
        title: 'Una función para agregar',
        text: 'Abre la conexión, hace el INSERT con `?`, guarda con commit y cierra. Así cada ítem nuevo queda en el archivo.',
        lang: 'python',
        code: 'import sqlite3\n\ndef agregar_item(nombre, cantidad):\n    conn = sqlite3.connect("inventario.db")\n    cursor = conn.cursor()\n    cursor.execute("INSERT INTO cofre (nombre, cantidad) VALUES (?, ?)", (nombre, cantidad))\n    conn.commit()\n    conn.close()\n\nagregar_item("Manzana", 8)\nprint("Manzana guardada")',
        highlight: [6, 7],
      },
      {
        title: 'Una función para listar',
        text: 'SELECT con `ORDER BY nombre` para que salga en orden alfabético, y un for para imprimir cada fila.',
        lang: 'python',
        code: 'import sqlite3\n\ndef listar_items():\n    conn = sqlite3.connect("inventario.db")\n    cursor = conn.cursor()\n    cursor.execute("SELECT nombre, cantidad FROM cofre ORDER BY nombre")\n    for fila in cursor.fetchall():\n        print(f"{fila[0]}: {fila[1]}")\n    conn.close()\n\nlistar_items()',
        highlight: [6, 7, 8],
        tryIt: 'Cambiá ORDER BY nombre por ORDER BY cantidad DESC.',
      },
      {
        title: 'Las dos juntas',
        text: 'Lo que agregás con una función, lo ve la otra, porque las dos leen el mismo archivo.',
        lang: 'python',
        code: 'import sqlite3\n\ndef agregar_item(nombre, cantidad):\n    conn = sqlite3.connect("inventario.db")\n    conn.execute("INSERT INTO cofre (nombre, cantidad) VALUES (?, ?)", (nombre, cantidad))\n    conn.commit()\n    conn.close()\n\ndef listar_items():\n    conn = sqlite3.connect("inventario.db")\n    for fila in conn.execute("SELECT nombre, cantidad FROM cofre ORDER BY nombre"):\n        print(fila[0], fila[1])\n    conn.close()\n\nagregar_item("Pan", 4)\nlistar_items()',
        highlight: [16, 17],
      },
      {
        title: 'Sin commit, no pasó',
        text: 'Si te olvidás el commit, el INSERT se pierde al cerrar la conexión. Comparalo con el ejemplo anterior.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nconn.execute("INSERT INTO cofre (nombre, cantidad) VALUES (\'Pan\', 4)")\nconn.close()\n\nconn = sqlite3.connect("inventario.db")\nprint(conn.execute("SELECT COUNT(*) FROM cofre").fetchone()[0])\nconn.close()',
        highlight: [4, 5],
        warn: 'Imprime 4: el Pan no se guardó. Agregá conn.commit() antes del close de la línea 5.',
      },
      {
        title: 'Contar por tipo',
        text: 'El mismo GROUP BY del Acto II, ahora desde Python.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\ncursor = conn.cursor()\ncursor.execute("SELECT tipo, COUNT(*) FROM cofre GROUP BY tipo ORDER BY tipo")\nfor tipo, cantidad in cursor.fetchall():\n    print(f"{tipo}: {cantidad}")\nconn.close()',
        highlight: [5],
      },
    ],
    spells: [
      {
        id: 'hydra-s1',
        prompt: 'Completá la tupla del INSERT. Al final tiene que haber 5 ítems.',
        template: 'import sqlite3\n\ndef agregar(nombre):\n    conn = sqlite3.connect("inventario.db")\n    conn.execute("INSERT INTO cofre (nombre) VALUES (?)", ___)\n    conn.commit()\n    conn.close()\n\nagregar("Manzana")\nconn = sqlite3.connect("inventario.db")\nprint(conn.execute("SELECT COUNT(*) FROM cofre").fetchone()[0])',
        expected: '5',
        answers: ['(nombre,)'],
        hint: 'Una tupla de un solo dato: (nombre,) con la coma.',
      },
      {
        id: 'hydra-s2',
        prompt: 'Listá los nombres en orden alfabético.',
        template: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nfor fila in conn.execute("SELECT nombre FROM cofre ORDER BY ___"):\n    print(fila[0])',
        expected: 'Antorcha\nArco\nEspada\nPico',
        answers: ['nombre'],
        hint: 'Ordená por la columna que querés ver: nombre.',
      },
      {
        id: 'hydra-s3',
        prompt: 'Contá cuántos ítems hay de cada tipo.',
        template: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nfor tipo, n in conn.execute("SELECT tipo, COUNT(*) FROM cofre GROUP BY ___ ORDER BY tipo"):\n    print(f"{tipo}: {n}")',
        expected: 'arma: 2\nherramienta: 1\nluz: 1',
        answers: ['tipo'],
        hint: 'Agrupás por la columna tipo.',
      },
    ],
    bossTips: [
      'Cada función abre, hace lo suyo y cierra la conexión.',
      'Después de un INSERT va conn.commit().',
      'ORDER BY nombre ordena de la A a la Z.',
    ],
  },
  {
    id: 'buscar-quitar',
    actKey: 'mixed',
    title: 'Proyecto: buscar, quitar, actualizar',
    spine: 'Buscar y quitar',
    lang: 'python',
    glyph: 'dragon-rojo',
    bossId: 'dragon-rojo',
    intro: 'El Dragón Rojo quiere un sistema que no borre nada por error. Primero buscás, después confirmás, recién ahí tocás.',
    prelude: INVENTARIO_PRELUDE,
    setup: INVENTARIO_SETUP,
    pages: [
      {
        title: 'buscar_item con fetchone',
        text: '`fetchone()` trae una fila, o `None` si no encontró ninguna. Así sabés si el ítem existe.',
        lang: 'python',
        code: 'import sqlite3\n\ndef buscar_item(nombre):\n    conn = sqlite3.connect("inventario.db")\n    cursor = conn.cursor()\n    cursor.execute("SELECT * FROM cofre WHERE nombre = ?", (nombre,))\n    fila = cursor.fetchone()\n    conn.close()\n    return fila\n\nprint(buscar_item("Espada"))\nprint(buscar_item("Trineo"))',
        highlight: [6, 7, 9],
      },
      {
        title: 'Preguntar si existe',
        text: 'Con `is None` revisás si la búsqueda vino vacía, y le avisás al jugador en vez de romper el programa.',
        lang: 'python',
        code: 'import sqlite3\n\ndef buscar_item(nombre):\n    conn = sqlite3.connect("inventario.db")\n    fila = conn.execute("SELECT nombre, cantidad FROM cofre WHERE nombre = ?", (nombre,)).fetchone()\n    conn.close()\n    return fila\n\nfila = buscar_item("Arco")\nif fila is None:\n    print("No existe")\nelse:\n    print(f"Hay {fila[1]} {fila[0]}")',
        highlight: [10, 11, 12, 13],
        tryIt: 'Buscá "Trineo".',
      },
      {
        title: 'Quitar con confirmación',
        text: 'Mostrás qué se va a borrar y preguntás con input(). Solo con una "s" se ejecuta el DELETE.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nrespuesta = input("¿Borrar el Arco? (s/n) ")\nif respuesta == "s":\n    conn.execute("DELETE FROM cofre WHERE nombre = ?", ("Arco",))\n    conn.commit()\n    print("Arco borrado")\nelse:\n    print("No se borró nada")\nprint(conn.execute("SELECT COUNT(*) FROM cofre").fetchone()[0], "ítems")\nconn.close()',
        highlight: [4, 5, 6, 7],
      },
      {
        title: 'Un UPDATE preciso',
        text: 'Un ítem, un campo, un WHERE. Los dos `?` se llenan en orden: primero la cantidad, después el nombre.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nconn.execute("UPDATE cofre SET cantidad = ? WHERE nombre = ?", (10, "Espada"))\nconn.commit()\nprint(conn.execute("SELECT nombre, cantidad FROM cofre WHERE nombre = \'Espada\'").fetchone())\nconn.close()',
        highlight: [4],
      },
    ],
    spells: [
      {
        id: 'dragon-s1',
        prompt: 'Buscá el Pico con la función.',
        template: 'import sqlite3\n\ndef buscar(nombre):\n    conn = sqlite3.connect("inventario.db")\n    fila = conn.execute("SELECT * FROM cofre WHERE nombre = ?", (nombre,)).fetchone()\n    conn.close()\n    return fila\n\nprint(buscar(___))',
        expected: "(4, 'Pico', 'herramienta', 1)",
        answers: ['"Pico"'],
        hint: 'El nombre es texto: "Pico", entre comillas.',
      },
      {
        id: 'dragon-s2',
        prompt: 'Borrá el Arco. Tienen que quedar 3 ítems.',
        template: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nconn.execute("DELETE FROM cofre WHERE nombre = ?", (___,))\nconn.commit()\nprint(conn.execute("SELECT COUNT(*) FROM cofre").fetchone()[0])',
        expected: '3',
        answers: ['"Arco"'],
        hint: 'Adentro de la tupla va el nombre entre comillas.',
      },
      {
        id: 'dragon-s3',
        prompt: 'Dejá la Espada con cantidad 10.',
        template: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nconn.execute("UPDATE cofre SET cantidad = ? WHERE nombre = ?", (___, "Espada"))\nconn.commit()\nprint(conn.execute("SELECT cantidad FROM cofre WHERE nombre = \'Espada\'").fetchone()[0])',
        expected: '10',
        answers: ['10'],
        hint: 'El primer ? es la cantidad nueva: un número.',
      },
    ],
    bossTips: [
      'Buscá antes de borrar: fetchone() devuelve None si no existe.',
      'El DELETE y el UPDATE siempre con WHERE.',
      'Los ? se llenan en el orden de la tupla.',
    ],
  },
]

// ─── ACTO IV · El Arquitecto ─────────────────────────────────────────────────

const ACT_IV: Book[] = [
  {
    id: 'todo-junto',
    actKey: 'final',
    title: 'El sistema completo',
    spine: 'Todo junto',
    lang: 'python',
    glyph: 'el-arquitecto',
    bossId: 'el-arquitecto',
    intro: 'Este es el último libro del estante. Todo lo que aprendiste, en un solo programa. El Arquitecto te está mirando.',
    prelude: INVENTARIO_PRELUDE,
    setup: INVENTARIO_SETUP,
    pages: [
      {
        title: 'Python guarda en memoria',
        text: 'Variables, listas y diccionarios sirven mientras el programa está abierto. Al cerrarlo, se pierden.',
        lang: 'python',
        code: 'mochila = [{"nombre": "Espada", "cantidad": 1}]\nmochila.append({"nombre": "Arco", "cantidad": 1})\nfor item in mochila:\n    print(item["nombre"])',
      },
      {
        title: 'SQL guarda en un archivo',
        text: 'Lo que guardás en la base sigue ahí aunque cierres el programa. Por eso el sistema final usa las dos cosas.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nfor fila in conn.execute("SELECT nombre, tipo FROM cofre"):\n    print(fila)\nconn.close()',
      },
      {
        title: 'executemany: muchas filas de una',
        text: 'Le pasás una lista de tuplas y hace un INSERT por cada una.',
        lang: 'python',
        code: 'import sqlite3\n\nnuevos = [("Pan", "comida", 4), ("Escudo", "arma", 1)]\nconn = sqlite3.connect("inventario.db")\nconn.executemany("INSERT INTO cofre (nombre, tipo, cantidad) VALUES (?, ?, ?)", nuevos)\nconn.commit()\nprint(conn.execute("SELECT COUNT(*) FROM cofre").fetchone()[0], "ítems")\nconn.close()',
        highlight: [3, 5],
      },
      {
        title: 'Una función que responde',
        text: 'Conecta, consulta, cierra y devuelve. Si no encuentra nada, devuelve 0 en vez de romperse.',
        lang: 'python',
        code: 'import sqlite3\n\ndef cantidad_de(nombre):\n    conn = sqlite3.connect("inventario.db")\n    fila = conn.execute("SELECT cantidad FROM cofre WHERE nombre = ?", (nombre,)).fetchone()\n    conn.close()\n    if fila is None:\n        return 0\n    return fila[0]\n\nprint(cantidad_de("Antorcha"))\nprint(cantidad_de("Dragón"))',
        highlight: [7, 8, 9],
      },
      {
        title: 'El reporte final',
        text: 'GROUP BY + un for + un f-string: el tipo de reporte que te va a pedir el Arquitecto.',
        lang: 'python',
        code: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nfor tipo, total in conn.execute("SELECT tipo, SUM(cantidad) FROM cofre GROUP BY tipo ORDER BY tipo"):\n    print(f"{tipo}: {total}")\nconn.close()',
        highlight: [4, 5],
      },
    ],
    spells: [
      {
        id: 'arq-s1',
        prompt: 'Insertá la lista nuevos de una sola vez. Tiene que haber 6 ítems.',
        template: 'import sqlite3\n\nnuevos = [("Pan", "comida", 4), ("Escudo", "arma", 1)]\nconn = sqlite3.connect("inventario.db")\nconn.executemany("INSERT INTO cofre (nombre, tipo, cantidad) VALUES (?, ?, ?)", ___)\nconn.commit()\nprint(conn.execute("SELECT COUNT(*) FROM cofre").fetchone()[0])',
        expected: '6',
        answers: ['nuevos'],
        hint: 'executemany recibe la lista entera: nuevos.',
      },
      {
        id: 'arq-s2',
        prompt: 'Borrá el Arco y confirmá cuántos quedan.',
        template: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nconn.execute("DELETE FROM cofre WHERE nombre = ___")\nconn.commit()\nprint(conn.execute("SELECT COUNT(*) FROM cofre").fetchone()[0])',
        expected: '3',
        answers: ["'Arco'"],
        hint: "Adentro del SQL, el texto va con comillas simples: 'Arco'.",
      },
      {
        id: 'arq-s3',
        prompt: 'Armá el reporte: cuántos ítems hay de cada tipo.',
        template: 'import sqlite3\n\nconn = sqlite3.connect("inventario.db")\nfor tipo, n in conn.execute("SELECT tipo, COUNT(*) FROM cofre GROUP BY ___ ORDER BY tipo"):\n    print(f"{tipo}: {n}")',
        expected: 'arma: 2\nherramienta: 1\nluz: 1',
        answers: ['tipo'],
        hint: 'Agrupás por tipo.',
      },
    ],
    bossTips: [
      'Repasá los 5 verbos: CREATE, INSERT, SELECT, UPDATE, DELETE.',
      'Toda modificación lleva commit().',
      'Leé el error: te dice la línea y qué no entendió.',
    ],
  },
  {
    id: 'errores',
    actKey: 'final',
    title: 'Cómo leer un error',
    spine: 'Leer errores',
    lang: 'python',
    glyph: 'bug',
    intro: 'El error no te borra nada: te dice dónde mirar. Este libro te enseña a leerlo como un mapa.',
    pages: [
      {
        title: 'El error tiene nombre y pista',
        text: 'Primero viene el TIPO de error y después una explicación. Ejecutá este ejemplo: el error es a propósito.',
        lang: 'python',
        code: 'vidas = 3\nprint(Vidas)',
        highlight: [2],
        warn: 'NameError: Python no conoce "Vidas" con mayúscula. Arreglalo.',
      },
      {
        title: 'SyntaxError: está mal escrito',
        text: 'Python ni siquiera pudo leer el código: falta o sobra un signo. El mensaje te dice en qué línea.',
        lang: 'python',
        code: 'print("Hola"\nprint("Chau")',
        highlight: [1],
        warn: 'Falta cerrar el paréntesis de la línea 1.',
      },
      {
        title: 'TypeError: cosas que no van juntas',
        text: 'Intentaste mezclar tipos que no se combinan, como texto con número.',
        lang: 'python',
        code: 'flechas = 7\nprint("Flechas: " + flechas)',
        highlight: [2],
        warn: 'Usá str(flechas) o un f-string.',
      },
      {
        title: 'IndexError y KeyError: no existe',
        text: 'Pediste una posición que la lista no tiene, o una clave que el diccionario no tiene.',
        lang: 'python',
        code: 'mochila = ["Espada", "Pico"]\nprint(mochila[2])',
        highlight: [2],
        warn: 'La lista tiene posiciones 0 y 1. Cambiá el 2 por 1.',
      },
      {
        title: 'Imprimí para investigar',
        text: 'Si el programa no hace lo que esperás pero no da error, imprimí las variables en el medio para ver qué valen.',
        lang: 'python',
        code: 'total = 0\nfor golpe in [3, 5, 2]:\n    total = golpe\n    print("total vale", total)\nprint("Daño:", total)',
        highlight: [3, 4],
        tryIt: 'El daño debería ser 10. Con lo que imprime, ¿te das cuenta qué falta en la línea 3?',
      },
    ],
    spells: [
      {
        id: 'err-s1',
        prompt: 'Arreglá el SyntaxError: cerrá lo que quedó abierto.',
        template: 'print("Hola"___',
        expected: 'Hola',
        answers: [')'],
        hint: 'Falta un solo signo al final.',
      },
      {
        id: 'err-s2',
        prompt: 'Python dice NameError. Escribí bien el nombre de la variable.',
        template: 'vida = 20\nprint(___)',
        expected: '20',
        answers: ['vida'],
        hint: 'Exactamente igual que en la línea 1, en minúscula.',
      },
      {
        id: 'err-s3',
        prompt: 'Arreglá el TypeError convirtiendo el número en texto.',
        template: 'flechas = 7\nprint("Flechas: " + ___(flechas))',
        expected: 'Flechas: 7',
        answers: ['str'],
        hint: 'str() convierte a texto.',
      },
    ],
  },
]

export const BOOKS: Book[] = [...ACT_I, ...ACT_II, ...ACT_III, ...ACT_IV]

export function getActBooks(actKey: string): Book[] {
  return BOOKS.filter((b) => b.actKey === actKey)
}

export function getBook(id: string): Book | undefined {
  return BOOKS.find((b) => b.id === id)
}

/** Libro y página que explican un ejercicio del patio de juegos. */
export function bookForPlayground(topicKey: string, exerciseId?: string): { book: Book; page: number } | null {
  const book = BOOKS.find((b) => b.playground?.includes(topicKey))
  if (!book) return null
  return { book, page: (exerciseId && book.playgroundPages?.[exerciseId]) || 0 }
}

/** Libro y página que explican un ejercicio puntual del patio (por su id). */
export function bookForExercise(exerciseId: string): { book: Book; page: number } | null {
  const book = BOOKS.find((b) => b.playgroundPages && exerciseId in b.playgroundPages)
  return book ? { book, page: book.playgroundPages![exerciseId] } : null
}

/** Las misiones de nivel junior del jefe: "esto te va a pedir". */
export function bossMissions(bossId: string): { title: string; description: string }[] {
  return CHALLENGES
    .filter((c) => c.bossId === bossId && c.tier === 'junior')
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((c) => ({ title: c.title, description: c.description }))
}

export function blankCount(template: string): number {
  return (template.match(/___/g) ?? []).length
}

export function fillSpell(template: string, values: string[]): string {
  let i = 0
  return template.replace(/___/g, () => values[i++] ?? '')
}
