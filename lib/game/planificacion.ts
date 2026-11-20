// Planificación del docente — el libro de clases (`/planificacion`).
//
// Dos encuentros por semana con el aula: el Día 1 (1 h 40 min) es todo
// práctica; el Día 2 (1 h) se practica el último tema y después se pelea
// contra el jefe. Un jefe por semana: 14 semanas, 28 clases.
//
// Cada tema prepara ataques concretos del jefe (ids de challenges.ts, junior
// y trainee), así el jefe nunca pide algo que no se practicó. Por tema hay
// tres versiones: 1 Ejemplo (el docente lo muestra completo), 2 Guiado (con
// huecos `___`, como un ataque JUNIOR) y 3 Desafío (sin guía, como un ataque
// TRAINEE). Más una variante graciosa y, si existe, la plantilla de La Arena
// que usa el mismo tema.
//
// Todo se escribe en el Patio de prácticas. Las salidas están verificadas
// corriendo cada código con Python 3 y sqlite3 (178 ejercicios, oct 2026).

export type PlanLang = 'python' | 'sql'

export interface PlanEjercicio {
  /** Lo que se le pide al alumno (backticks → código). */
  pide: string
  /** Código que se muestra / se copia al patio. Guiado: con huecos `___`. */
  codigo: string
  /** Salida exacta. SQL: filas con columnas separadas por `|`. */
  sale: string
  /** Guiado: lo que va en cada hueco, en orden. */
  respuestas?: string[]
  /** Desafío / extra: el código resuelto. */
  solucion?: string
  /** Solo SQL: la tabla con la que arranca (se carga antes del código). */
  tabla?: string
}

export interface PlanTema {
  titulo: string
  /** Ataques del jefe que prepara (ids de challenges.ts). */
  ataques: string[]
  ejemplo: PlanEjercicio
  guiado: PlanEjercicio
  desafio: PlanEjercicio
  gracioso: PlanEjercicio
  /** Títulos de las plantillas de La Arena con este tema (lib/game/arena/generators.ts). */
  arena?: string[]
}

export interface PlanClase {
  /** 1 a 28 — también es la página del libro. */
  numero: number
  semana: number
  dia: 1 | 2
  bossId: string
  lang: PlanLang
  temas: PlanTema[]
  /** Para el que termina antes. */
  extra?: PlanEjercicio
}

export const PLAN_DURACION: Record<1 | 2, string> = { 1: '1 h 40 min', 2: '1 h' }

export const BLANK = '___'

/** El código del guiado con cada hueco reemplazado por su respuesta. */
export function fillBlanks(codigo: string, respuestas: string[] = []): string {
  let i = 0
  return codigo.replace(/___/g, () => respuestas[i++] ?? BLANK)
}

// ─── Ayudas para escribir el contenido ────────────────────────────────────────

/** Envuelve el cuerpo con la conexión de sqlite3 de siempre (Acto III y IV). */
const db = (body: string) =>
  `import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\n${body}\nconn.close()`

const COFRE_VACIO = `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER, material TEXT);`
const ITEMS_VACIA = `CREATE TABLE items (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER);`

const COFRE_ORACULO = `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER, material TEXT);
INSERT INTO cofre VALUES (1, 'Espada', 1, 'diamante');
INSERT INTO cofre VALUES (2, 'Antorcha', 16, 'madera');
INSERT INTO cofre VALUES (3, 'Pico', 2, 'diamante');
INSERT INTO cofre VALUES (4, 'Manzana', 8, 'comida');
INSERT INTO cofre VALUES (5, 'Flecha', 64, 'madera');`

const MONSTRUOS = `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, hp INTEGER);
INSERT INTO monstruos VALUES (1, 'Creeper A', 'Creeper', 20);
INSERT INTO monstruos VALUES (2, 'Zombie A', 'Zombie', 22);
INSERT INTO monstruos VALUES (3, 'Creeper B', 'Creeper', 20);
INSERT INTO monstruos VALUES (4, 'Araña A', 'Araña', 16);
INSERT INTO monstruos VALUES (5, 'Zombie B', 'Zombie', 24);
INSERT INTO monstruos VALUES (6, 'Esqueleto A', 'Esqueleto', 27);`

const COFRE_FALSO = `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, cantidad INTEGER);
INSERT INTO cofre VALUES (1, 'Espada', 'hierro', 1);
INSERT INTO cofre VALUES (2, 'Pico', 'hierro', 1);
INSERT INTO cofre VALUES (3, 'Flecha', 'madera', 64);
INSERT INTO cofre VALUES (4, 'Tronco', 'madera', 32);
INSERT INTO cofre VALUES (5, 'Poción', 'vidrio', 3);`

const HERRAMIENTAS = `CREATE TABLE herramientas (id INTEGER PRIMARY KEY, nombre TEXT, durabilidad INTEGER);
INSERT INTO herramientas VALUES (1, 'Espada', 15);
INSERT INTO herramientas VALUES (2, 'Pico', 80);
INSERT INTO herramientas VALUES (3, 'Hacha', 30);
INSERT INTO herramientas VALUES (4, 'Arco', 95);
INSERT INTO herramientas VALUES (5, 'Pala', 45);`

// ─── El libro ────────────────────────────────────────────────────────────────

export const PLAN_CLASES: PlanClase[] = [

  // ══ Semana 1 · Creeper Formulario · Variables y tipos ══════════════════════
  {
    numero: 1, semana: 1, dia: 1, bossId: 'creeper-formulario', lang: 'python',
    temas: [
      {
        titulo: 'Variables: texto y números',
        ataques: ['c01-j1', 'c01-t1'],
        arena: ['La tarjeta del ítem'],
        ejemplo: {
          pide: 'Una variable es una etiqueta con un valor adentro. El texto va entre comillas; los números, sin comillas.',
          codigo: 'nombre = "Antorcha"\ncantidad = 16\n\nprint(nombre)\nprint(cantidad)',
          sale: 'Antorcha\n16',
        },
        guiado: {
          pide: 'Completá `cantidad = 2` (número) y `material = "hierro"` (texto).',
          codigo: 'nombre_item = "Pico de hierro"\ncantidad = ___\nmaterial = ___\n\nprint(nombre_item)\nprint(cantidad)\nprint(material)',
          respuestas: ['2', '"hierro"'],
          sale: 'Pico de hierro\n2\nhierro',
        },
        desafio: {
          pide: 'Creá tres variables: `nombre_item` con "Arco", `cantidad` con 1 y `material` con "madera". Imprimí cada una con `print()`.',
          codigo: '# Tus tres variables acá\n',
          solucion: 'nombre_item = "Arco"\ncantidad = 1\nmaterial = "madera"\n\nprint(nombre_item)\nprint(cantidad)\nprint(material)',
          sale: 'Arco\n1\nmadera',
        },
        gracioso: {
          pide: 'La ficha de la gallina más sospechosa del server.',
          codigo: 'nombre = "Gallina sospechosa"\nhuevos = 3\nestado = "mirándote fijo"\n\nprint(nombre)\nprint(huevos)\nprint(estado)',
          sale: 'Gallina sospechosa\n3\nmirándote fijo',
        },
      },
      {
        titulo: 'f-strings: armar un cartel',
        ataques: ['c01-j2', 'c01-t2'],
        arena: ['El cartel del cofre'],
        ejemplo: {
          pide: 'Con `f"..."` metés variables adentro del texto escribiendo `{variable}`.',
          codigo: 'nombre = "Pan"\ncantidad = 4\n\nprint(f"{nombre} x{cantidad}")',
          sale: 'Pan x4',
        },
        guiado: {
          pide: 'Completá los tres huecos del f-string con las variables.',
          codigo: 'nombre_pocion = "Poción de fuerza"\ncantidad_pocion = 3\nduracion_segundos = 90\n\nprint(f"{___} x{___} - dura {___} segundos")',
          respuestas: ['nombre_pocion', 'cantidad_pocion', 'duracion_segundos'],
          sale: 'Poción de fuerza x3 - dura 90 segundos',
        },
        desafio: {
          pide: 'Con un f-string, imprimí `Escudo aguanta 336 golpes` usando las dos variables.',
          codigo: 'nombre = "Escudo"\nusos = 336\n\n# Tu print con f-string',
          solucion: 'nombre = "Escudo"\nusos = 336\n\nprint(f"{nombre} aguanta {usos} golpes")',
          sale: 'Escudo aguanta 336 golpes',
        },
        gracioso: {
          pide: 'El Creeper solo quería cariño.',
          codigo: 'mob = "Creeper"\nabrazos = 0\n\nprint(f"{mob} quiere un abrazo. Abrazos recibidos: {abrazos}")',
          sale: 'Creeper quiere un abrazo. Abrazos recibidos: 0',
        },
      },
    ],
    extra: {
      pide: 'Creá `jugador` y `nivel` e imprimí `Steve está en el nivel 7` con un f-string.',
      codigo: '# Tus variables y el print',
      solucion: 'jugador = "Steve"\nnivel = 7\n\nprint(f"{jugador} está en el nivel {nivel}")',
      sale: 'Steve está en el nivel 7',
    },
  },
  {
    numero: 2, semana: 1, dia: 2, bossId: 'creeper-formulario', lang: 'python',
    temas: [
      {
        titulo: 'Cuentas con variables',
        ataques: ['c01-j3', 'c01-t3'],
        arena: ['Peso del cofre'],
        ejemplo: {
          pide: '`*` multiplica y `+` suma. Un número con punto (0.5) es decimal.',
          codigo: 'manzanas = 3\npeso_manzana = 0.5\n\nprint(manzanas * peso_manzana)',
          sale: '1.5',
        },
        guiado: {
          pide: 'Cada cantidad se multiplica por su peso. Completá con las variables de peso.',
          codigo: 'item1_cantidad = 4\nitem1_peso = 0.5\nitem2_cantidad = 2\nitem2_peso = 1.5\n\npeso_total = (item1_cantidad * ___) + (item2_cantidad * ___)\nprint(peso_total)',
          respuestas: ['item1_peso', 'item2_peso'],
          sale: '5.0',
        },
        desafio: {
          pide: 'Calculá el peso total de los tres ítems en una sola línea. Tiene que dar `9.0`.',
          codigo: 'item1_cantidad = 2\nitem1_peso_unitario = 1.5\nitem2_cantidad = 4\nitem2_peso_unitario = 0.25\nitem3_cantidad = 10\nitem3_peso_unitario = 0.5\n\npeso_total = ___\nprint(peso_total)',
          solucion: 'item1_cantidad = 2\nitem1_peso_unitario = 1.5\nitem2_cantidad = 4\nitem2_peso_unitario = 0.25\nitem3_cantidad = 10\nitem3_peso_unitario = 0.5\n\npeso_total = (item1_cantidad * item1_peso_unitario) + (item2_cantidad * item2_peso_unitario) + (item3_cantidad * item3_peso_unitario)\nprint(peso_total)',
          sale: '9.0',
        },
        gracioso: {
          pide: 'Steve y su problema con las galletitas.',
          codigo: 'galletitas = 64\nmordiscos_por_galletita = 3\n\nprint(f"Steve dio {galletitas * mordiscos_por_galletita} mordiscos")',
          sale: 'Steve dio 192 mordiscos',
        },
      },
    ],
  },

  // ══ Semana 2 · Guardián de la Puerta · if / elif / else ════════════════════
  {
    numero: 3, semana: 2, dia: 1, bossId: 'guardian-puerta', lang: 'python',
    temas: [
      {
        titulo: 'if / elif / else con ==',
        ataques: ['c02-j1', 'c02-j3', 'c02-t1'],
        arena: ['El mejor bloque'],
        ejemplo: {
          pide: '`==` pregunta si dos cosas son iguales. Si es verdad entra al `if`; si no, al `else`.',
          codigo: 'llave = "oro"\n\nif llave == "oro":\n    print("La puerta se abre")\nelse:\n    print("La puerta sigue cerrada")',
          sale: 'La puerta se abre',
        },
        guiado: {
          pide: 'Completá con qué comparamos para que imprima `Podés picar diamante`.',
          codigo: 'pico = "hierro"\n\nif pico == ___:\n    print("Podés picar diamante")\nelse:\n    print("Necesitás un pico mejor")',
          respuestas: ['"hierro"'],
          sale: 'Podés picar diamante',
        },
        desafio: {
          pide: 'Escribí un `if/elif/else`: diamante → `Excelente hallazgo.`, oro → `Buen hallazgo.`, cualquier otro → `Sigue buscando.`',
          codigo: 'bloque = "oro"\n\n# Tu if / elif / else acá',
          solucion: 'bloque = "oro"\n\nif bloque == "diamante":\n    print("Excelente hallazgo.")\nelif bloque == "oro":\n    print("Buen hallazgo.")\nelse:\n    print("Sigue buscando.")',
          sale: 'Buen hallazgo.',
        },
        gracioso: {
          pide: 'Rodolfo custodia la puerta. La contraseña es obvia.',
          codigo: 'contraseña = "cerdito"\n\nif contraseña == "cerdito":\n    print("Rodolfo te deja pasar")\nelse:\n    print("Rodolfo hace oink de desconfianza")',
          sale: 'Rodolfo te deja pasar',
        },
      },
      {
        titulo: 'Comparar números: <, <=, >',
        ataques: ['c02-j2', 'c02-t2'],
        arena: ['Salud crítica'],
        ejemplo: {
          pide: 'Python prueba de arriba para abajo y entra en el primero que da verdadero.',
          codigo: 'salud = 15\n\nif salud <= 5:\n    print("¡Peligro!")\nelif salud <= 10:\n    print("Cuidado")\nelse:\n    print("Todo bien")',
          sale: 'Todo bien',
        },
        guiado: {
          pide: 'Con `hambre = 3` tiene que imprimir `¡Comé algo ya!`. ¿Qué número va en el hueco?',
          codigo: 'hambre = 3\n\nif hambre <= ___:\n    print("¡Comé algo ya!")\nelif hambre <= 10:\n    print("Un snack no vendría mal")\nelse:\n    print("Panza llena")',
          respuestas: ['5'],
          sale: '¡Comé algo ya!',
        },
        desafio: {
          pide: 'Escribí el `if/elif/else` entero: 0 o menos → `La espada se rompió.`, menos de 10 → `¡Ojo! Se va a romper pronto.`, si no → `La espada está impecable.`',
          codigo: 'durabilidad = 7\n\n# Tu if / elif / else',
          solucion: 'durabilidad = 7\n\nif durabilidad <= 0:\n    print("La espada se rompió.")\nelif durabilidad < 10:\n    print("¡Ojo! Se va a romper pronto.")\nelse:\n    print("La espada está impecable.")',
          sale: '¡Ojo! Se va a romper pronto.',
        },
        gracioso: {
          pide: 'Una noche con demasiados zombies.',
          codigo: 'zombies = 47\n\nif zombies > 40:\n    print("Esto ya no es una noche, es un recital")\nelse:\n    print("Noche tranquila")',
          sale: 'Esto ya no es una noche, es un recital',
        },
      },
    ],
    extra: {
      pide: 'Con `nivel = 12`: 10 o más → `Experto`, 5 o más → `Aprendiz`, si no → `Novato`.',
      codigo: 'nivel = 12\n\n# Tu if / elif / else',
      solucion: 'nivel = 12\n\nif nivel >= 10:\n    print("Experto")\nelif nivel >= 5:\n    print("Aprendiz")\nelse:\n    print("Novato")',
      sale: 'Experto',
    },
  },
  {
    numero: 4, semana: 2, dia: 2, bossId: 'guardian-puerta', lang: 'python',
    temas: [
      {
        titulo: 'Dos condiciones a la vez: and',
        ataques: ['c02-t3'],
        arena: ['La puerta doble'],
        ejemplo: {
          pide: '`and` necesita que las dos condiciones sean verdaderas.',
          codigo: 'tiene_espada = True\ntiene_escudo = True\n\nif tiene_espada and tiene_escudo:\n    print("Listo para pelear")\nelse:\n    print("Mejor volvé a casa")',
          sale: 'Listo para pelear',
        },
        guiado: {
          pide: 'Completá la palabra que une las dos condiciones.',
          codigo: 'nivel = 8\ntiene_mapa = True\n\nif nivel > 5 ___ tiene_mapa:\n    print("Podés entrar a la mina")\nelse:\n    print("Todavía no")',
          respuestas: ['and'],
          sale: 'Podés entrar a la mina',
        },
        desafio: {
          pide: 'Imprimí `Acceso concedido` solo si el nivel es mayor a 5 **y** tiene la llave. Si no, `Acceso denegado`.',
          codigo: 'nivel = 4\ntiene_llave = True\n\n# Usá "and" para combinar condiciones',
          solucion: 'nivel = 4\ntiene_llave = True\n\nif nivel > 5 and tiene_llave:\n    print("Acceso concedido")\nelse:\n    print("Acceso denegado")',
          sale: 'Acceso denegado',
        },
        gracioso: {
          pide: 'Sin cama no hay descanso.',
          codigo: 'es_de_noche = True\nhay_cama = False\n\nif es_de_noche and hay_cama:\n    print("A dormir")\nelse:\n    print("Toca quedarse despierto con los creepers")',
          sale: 'Toca quedarse despierto con los creepers',
        },
      },
    ],
  },

  // ══ Semana 3 · Golem Infinito · for y while ════════════════════════════════
  {
    numero: 5, semana: 3, dia: 1, bossId: 'golem-infinito', lang: 'python',
    temas: [
      {
        titulo: 'for con range()',
        ataques: ['c03-j1', 'c03-t1'],
        arena: ['Contar bloques', 'Saltos de a varios'],
        ejemplo: {
          pide: '`range(1, 4)` cuenta 1, 2, 3: el último número no entra.',
          codigo: 'for i in range(1, 4):\n    print(i)',
          sale: '1\n2\n3',
        },
        guiado: {
          pide: 'Que imprima del 3 al 7, uno por línea.',
          codigo: 'for i in range(___, ___):\n    print(i)',
          respuestas: ['3', '8'],
          sale: '3\n4\n5\n6\n7',
        },
        desafio: {
          pide: 'Imprimí los pares del 2 al 10 con un `for` y `range()` con paso (el tercer número).',
          codigo: '# Tu for acá',
          solucion: 'for i in range(2, 11, 2):\n    print(i)',
          sale: '2\n4\n6\n8\n10',
        },
        gracioso: {
          pide: 'Contar ovejas para dormir.',
          codigo: 'for i in range(1, 4):\n    print(f"Oveja número {i}... zzz")',
          sale: 'Oveja número 1... zzz\nOveja número 2... zzz\nOveja número 3... zzz',
        },
      },
      {
        titulo: 'Cuenta regresiva y while',
        ataques: ['c03-j2', 'c03-j3', 'c03-t2'],
        arena: ['El pico se rompe'],
        ejemplo: {
          pide: '`while` repite mientras la condición sea verdadera. Si nunca baja, no termina nunca.',
          codigo: 'vidas = 3\n\nwhile vidas > 0:\n    print("Vidas:", vidas)\n    vidas = vidas - 1\n\nprint("Game over")',
          sale: 'Vidas: 3\nVidas: 2\nVidas: 1\nGame over',
        },
        guiado: {
          pide: 'Contá de 4 a 1 hacia atrás. El `-1` hace que el `range` baje.',
          codigo: 'for minutos in range(___, ___, -1):\n    print(minutos)\n\nprint("¡La torta está lista!")',
          respuestas: ['4', '0'],
          sale: '4\n3\n2\n1\n¡La torta está lista!',
        },
        desafio: {
          pide: 'Con `while` (sin `range`), imprimí del 6 al 1.',
          codigo: 'contador = 6\n\n# Mientras contador sea mayor a 0, imprimí y restá 1',
          solucion: 'contador = 6\n\nwhile contador > 0:\n    print(contador)\n    contador = contador - 1',
          sale: '6\n5\n4\n3\n2\n1',
        },
        gracioso: {
          pide: 'El viaje largo.',
          codigo: 'paciencia = 3\n\nwhile paciencia > 0:\n    print("¿Ya llegamos?")\n    paciencia = paciencia - 1\n\nprint("Rodolfo: SÍ, llegamos.")',
          sale: '¿Ya llegamos?\n¿Ya llegamos?\n¿Ya llegamos?\nRodolfo: SÍ, llegamos.',
        },
      },
    ],
    extra: {
      pide: 'Con `while`, una durabilidad de 10 baja de a 3 por golpe. Imprimí cada valor mientras sea mayor a 0.',
      codigo: 'durabilidad = 10\n\n# Tu while',
      solucion: 'durabilidad = 10\n\nwhile durabilidad > 0:\n    print(durabilidad)\n    durabilidad = durabilidad - 3',
      sale: '10\n7\n4\n1',
    },
  },
  {
    numero: 6, semana: 3, dia: 2, bossId: 'golem-infinito', lang: 'python',
    temas: [
      {
        titulo: 'Acumular con for',
        ataques: ['c03-t3'],
        arena: ['Sumar la torre'],
        ejemplo: {
          pide: '`total` arranca en 0 y en cada vuelta le sumamos el número.',
          codigo: 'total = 0\n\nfor i in range(1, 4):\n    total = total + i\n\nprint(total)',
          sale: '6',
        },
        guiado: {
          pide: 'Sumá del 1 al 10. ¿Qué le sumamos al total en cada vuelta?',
          codigo: 'total = 0\n\nfor i in range(1, 11):\n    total = total + ___\n\nprint(total)',
          respuestas: ['i'],
          sale: '55',
        },
        desafio: {
          pide: 'Sumá todos los números del 1 al 50 con un `for`. Imprimí solo el total.',
          codigo: 'total = 0\n\n# Tu for acá',
          solucion: 'total = 0\n\nfor i in range(1, 51):\n    total = total + i\n\nprint(total)',
          sale: '1275',
        },
        gracioso: {
          pide: 'La dieta de Rodolfo: 2 galletitas por día.',
          codigo: 'galletitas = 0\n\nfor dia in range(1, 8):\n    galletitas = galletitas + 2\n\nprint(f"En una semana Rodolfo se comió {galletitas} galletitas")',
          sale: 'En una semana Rodolfo se comió 14 galletitas',
        },
      },
    ],
  },

  // ══ Semana 4 · Mercader del Abismo · listas y diccionarios ═════════════════
  {
    numero: 7, semana: 4, dia: 1, bossId: 'mercader-abismo', lang: 'python',
    temas: [
      {
        titulo: 'Listas: índice, len() y append()',
        ataques: ['c04-j1', 'c04-t1'],
        arena: ['El ítem de la fila', 'Guardar en el cofre'],
        ejemplo: {
          pide: 'El primer elemento es el `[0]`. `len()` cuenta y `append()` agrega al final.',
          codigo: 'mochila = ["Pan", "Antorcha", "Cuerda"]\n\nprint(mochila[0])\nprint(len(mochila))\nmochila.append("Brújula")\nprint(len(mochila))',
          sale: 'Pan\n3\n4',
        },
        guiado: {
          pide: 'Completá la lista con "Arco" y "Flecha".',
          codigo: 'inventario = ["Espada", ___, ___]\n\nprint(inventario[0])\nprint(len(inventario))',
          respuestas: ['"Arco"', '"Flecha"'],
          sale: 'Espada\n3',
        },
        desafio: {
          pide: 'Creá la lista `cofre` con "Pico", "Hacha" y "Pala". Agregale "Balde" con `append()` e imprimí cuántos ítems hay con `len()`.',
          codigo: '# Tu lista, el append y el len',
          solucion: 'cofre = ["Pico", "Hacha", "Pala"]\ncofre.append("Balde")\nprint(len(cofre))',
          sale: '4',
        },
        gracioso: {
          pide: 'Las excusas de siempre.',
          codigo: 'excusas = ["se me cortó el wifi", "fue el creeper", "lag"]\n\nprint(f"Perdí porque {excusas[1]}")',
          sale: 'Perdí porque fue el creeper',
        },
      },
      {
        titulo: 'Diccionarios: clave y valor',
        ataques: ['c04-j2', 'c04-t2'],
        arena: ['La ficha del mercader'],
        ejemplo: {
          pide: 'Un diccionario guarda valores con nombre. Se lee con `item["clave"]`.',
          codigo: 'item = {"nombre": "Escudo", "cantidad": 1}\n\nprint(item["nombre"])\nprint(item["cantidad"])',
          sale: 'Escudo\n1',
        },
        guiado: {
          pide: 'Completá las tres claves para imprimir nombre, cantidad y material.',
          codigo: 'item = {"nombre": "Arco", "cantidad": 2, "material": "madera"}\n\nprint(item[___])\nprint(item[___])\nprint(item[___])',
          respuestas: ['"nombre"', '"cantidad"', '"material"'],
          sale: 'Arco\n2\nmadera',
        },
        desafio: {
          pide: 'Armá el diccionario `pocion` con nombre "Poción de salto", cantidad 4 y material "vidrio". Imprimí las tres, una por línea.',
          codigo: '# Tu diccionario y los tres print',
          solucion: 'pocion = {"nombre": "Poción de salto", "cantidad": 4, "material": "vidrio"}\n\nprint(pocion["nombre"])\nprint(pocion["cantidad"])\nprint(pocion["material"])',
          sale: 'Poción de salto\n4\nvidrio',
        },
        gracioso: {
          pide: 'La ficha oficial de Rodolfo.',
          codigo: 'mascota = {"nombre": "Rodolfo", "especie": "cerdito", "superpoder": "encontrar trufas"}\n\nprint(f"{mascota[\'nombre\']} es un {mascota[\'especie\']} y su superpoder es {mascota[\'superpoder\']}")',
          sale: 'Rodolfo es un cerdito y su superpoder es encontrar trufas',
        },
      },
    ],
    extra: {
      pide: 'Sumale 5 a la cantidad de flechas del diccionario e imprimí la cantidad nueva.',
      codigo: 'item = {"nombre": "Flecha", "cantidad": 10}\n\n# Cambiá la cantidad',
      solucion: 'item = {"nombre": "Flecha", "cantidad": 10}\n\nitem["cantidad"] = item["cantidad"] + 5\nprint(item["cantidad"])',
      sale: '15',
    },
  },
  {
    numero: 8, semana: 4, dia: 2, bossId: 'mercader-abismo', lang: 'python',
    temas: [
      {
        titulo: 'Recorrer una lista de diccionarios',
        ataques: ['c04-j3', 'c04-t3'],
        arena: ['Recorrer el inventario'],
        ejemplo: {
          pide: 'El `for` agarra un diccionario por vuelta; de cada uno leemos una clave.',
          codigo: 'inventario = [\n    {"nombre": "Pan", "cantidad": 3},\n    {"nombre": "Cuerda", "cantidad": 1},\n]\n\nfor item in inventario:\n    print(item["nombre"])',
          sale: 'Pan\nCuerda',
        },
        guiado: {
          pide: 'Imprimí solo los que tienen más de 1.',
          codigo: 'inventario = [\n    {"nombre": "Flecha", "cantidad": 32},\n    {"nombre": "Arco", "cantidad": 1},\n    {"nombre": "Pan", "cantidad": 6},\n]\n\nfor item in inventario:\n    if item["cantidad"] > ___:\n        print(item["nombre"])',
          respuestas: ['1'],
          sale: 'Flecha\nPan',
        },
        desafio: {
          pide: 'Recorré la lista e imprimí el `nombre` de los ítems con `cantidad` mayor a 10, en el orden en que aparecen.',
          codigo: 'inventario = [\n    {"nombre": "Tierra", "cantidad": 64},\n    {"nombre": "Diamante", "cantidad": 2},\n    {"nombre": "Carbón", "cantidad": 20},\n    {"nombre": "Esmeralda", "cantidad": 1},\n]\n\n# Recorré con for y filtrá con if',
          solucion: 'inventario = [\n    {"nombre": "Tierra", "cantidad": 64},\n    {"nombre": "Diamante", "cantidad": 2},\n    {"nombre": "Carbón", "cantidad": 20},\n    {"nombre": "Esmeralda", "cantidad": 1},\n]\n\nfor item in inventario:\n    if item["cantidad"] > 10:\n        print(item["nombre"])',
          sale: 'Tierra\nCarbón',
        },
        gracioso: {
          pide: 'La conversación de los aldeanos.',
          codigo: 'vecinos = [\n    {"nombre": "Aldeano 1", "ruido": "hmm"},\n    {"nombre": "Aldeano 2", "ruido": "hmmm"},\n    {"nombre": "Aldeano 3", "ruido": "HMMMM"},\n]\n\nfor v in vecinos:\n    print(f"{v[\'nombre\']} dice {v[\'ruido\']}")',
          sale: 'Aldeano 1 dice hmm\nAldeano 2 dice hmmm\nAldeano 3 dice HMMMM',
        },
      },
    ],
  },

  // ══ Semana 5 · Maestro Craftero · funciones ════════════════════════════════
  {
    numero: 9, semana: 5, dia: 1, bossId: 'maestro-craftero', lang: 'python',
    temas: [
      {
        titulo: 'def, return y llamar',
        ataques: ['c05-j1', 'c05-t1'],
        arena: ['Llamar a la función', 'La cuenta del craftero'],
        ejemplo: {
          pide: '`def` crea la receta; `return` devuelve el resultado; la llamamos con paréntesis.',
          codigo: 'def doble(n):\n    return n * 2\n\nprint(doble(4))\nprint(doble(10))',
          sale: '8\n20',
        },
        guiado: {
          pide: 'Llamá a la función con "Alex" para que imprima `Hola, Alex!`.',
          codigo: 'def saludar(nombre):\n    return "Hola, " + nombre + "!"\n\nprint(saludar(___))',
          respuestas: ['"Alex"'],
          sale: 'Hola, Alex!',
        },
        desafio: {
          pide: 'Definí `despedir(nombre)` que retorne `"Chau, " + nombre + "!"`. Imprimí `despedir("Steve")`.',
          codigo: '# Definí la función y llamala',
          solucion: 'def despedir(nombre):\n    return "Chau, " + nombre + "!"\n\nprint(despedir("Steve"))',
          sale: 'Chau, Steve!',
        },
        gracioso: {
          pide: 'La función eco, para gritar en una cueva.',
          codigo: 'def eco(palabra):\n    return palabra + "... " + palabra + "... " + palabra\n\nprint(eco("hola"))',
          sale: 'hola... hola... hola',
        },
      },
      {
        titulo: 'Funciones con varios parámetros',
        ataques: ['c05-j2'],
        arena: ['La cuenta del craftero'],
        ejemplo: {
          pide: 'Los parámetros se separan con coma y se pasan en el mismo orden.',
          codigo: 'def precio_total(precio, cantidad):\n    return precio * cantidad\n\nprint(precio_total(3, 5))',
          sale: '15',
        },
        guiado: {
          pide: 'Completá el método que agrega el ítem a la lista. Al final el cofre tiene 3.',
          codigo: 'cofre = []\n\ndef agregar_item(lista_cofre, nuevo_item):\n    lista_cofre.___(nuevo_item)\n\nagregar_item(cofre, "Manzana")\nagregar_item(cofre, "Carbón")\nagregar_item(cofre, "Hueso")\n\nprint(len(cofre))',
          respuestas: ['append'],
          sale: '3',
        },
        desafio: {
          pide: 'Escribí `calcular_dano(fuerza, multiplicador)` que retorne `fuerza * multiplicador`. Imprimí `calcular_dano(12, 3)`.',
          codigo: '# Tu función y el print',
          solucion: 'def calcular_dano(fuerza, multiplicador):\n    return fuerza * multiplicador\n\nprint(calcular_dano(12, 3))',
          sale: '36',
        },
        gracioso: {
          pide: 'Cuánto duerme Rodolfo (en minutos).',
          codigo: 'def tiempo_de_siesta(horas):\n    return horas * 60\n\nprint(f"Rodolfo durmió {tiempo_de_siesta(3)} minutos")',
          sale: 'Rodolfo durmió 180 minutos',
        },
      },
    ],
    extra: {
      pide: 'Escribí `area(ancho, alto)` para el piso de una casa e imprimí `area(5, 4)`.',
      codigo: '# Tu función area',
      solucion: 'def area(ancho, alto):\n    return ancho * alto\n\nprint(area(5, 4))',
      sale: '20',
    },
  },
  {
    numero: 10, semana: 5, dia: 2, bossId: 'maestro-craftero', lang: 'python',
    temas: [
      {
        titulo: 'Decidir adentro de la función: if, and y el if corto',
        ataques: ['c05-j3', 'c05-t2', 'c05-t3'],
        arena: ['¿Diamante o hierro?'],
        ejemplo: {
          pide: 'Una función puede tener un `if`. Y el mismo `if` entra en una línea: `valor_si if condición else valor_no`.',
          codigo: 'def mejor_material(puntos):\n    if puntos >= 10:\n        return "diamante"\n    else:\n        return "hierro"\n\nprint(mejor_material(15))\nprint(mejor_material(3))\n\nmaterial = "oro"\nbonus = 2 if material == "oro" else 1\nprint(bonus)',
          sale: 'diamante\nhierro\n2',
        },
        guiado: {
          pide: 'Si el material es "diamante" el multiplicador es 2; si no, 1.',
          codigo: 'def calcular_dano(fuerza, material):\n    multiplicador = ___ if material == "diamante" else ___\n    return fuerza * multiplicador\n\nprint(calcular_dano(10, "diamante"))\nprint(calcular_dano(10, "piedra"))',
          respuestas: ['2', '1'],
          sale: '20\n10',
        },
        desafio: {
          pide: 'Completá `craftear`: si el material es "hierro" **y** hay 2 o más, retorna `Escudo de hierro`; si no, `No alcanza el material`.',
          codigo: 'def craftear(material, cantidad):\n    # Tu if con and acá\n\nprint(craftear("hierro", 2))\nprint(craftear("madera", 5))',
          solucion: 'def craftear(material, cantidad):\n    if material == "hierro" and cantidad >= 2:\n        return "Escudo de hierro"\n    else:\n        return "No alcanza el material"\n\nprint(craftear("hierro", 2))\nprint(craftear("madera", 5))',
          sale: 'Escudo de hierro\nNo alcanza el material',
        },
        gracioso: {
          pide: 'El humor de Rodolfo depende de las trufas.',
          codigo: 'def humor_de_rodolfo(trufas):\n    return "feliz" if trufas > 0 else "dramático"\n\nprint(humor_de_rodolfo(3))\nprint(humor_de_rodolfo(0))',
          sale: 'feliz\ndramático',
        },
      },
    ],
  },

  // ══ Semana 6 · El Archivista · de listas a tablas ══════════════════════════
  {
    numero: 11, semana: 6, dia: 1, bossId: 'archivista', lang: 'python',
    temas: [
      {
        titulo: 'Un diccionario es una fila',
        ataques: ['c06-j1', 'c06-j2', 'c06-t1'],
        arena: ['Una fila de la tabla'],
        ejemplo: {
          pide: 'Adentro de un f-string, la clave va con comillas simples: `item[\'nombre\']`.',
          codigo: 'item = {"id": 1, "nombre": "Espada", "material": "hierro"}\n\nprint(f"{item[\'id\']} | {item[\'nombre\']} | {item[\'material\']}")',
          sale: '1 | Espada | hierro',
        },
        guiado: {
          pide: 'Completá las dos claves que faltan.',
          codigo: 'item = {"id": 7, "nombre": "Casco", "material": "oro"}\n\nprint(f"{item[\'id\']} | {item[___]} | {item[___]}")',
          respuestas: ["'nombre'", "'material'"],
          sale: '7 | Casco | oro',
        },
        desafio: {
          pide: 'Imprimí la ficha con el formato `id | nombre | cantidad`.',
          codigo: 'item = {"id": 3, "nombre": "Antorcha", "cantidad": 16}\n\n# Tu print con f-string',
          solucion: 'item = {"id": 3, "nombre": "Antorcha", "cantidad": 16}\n\nprint(f"{item[\'id\']} | {item[\'nombre\']} | {item[\'cantidad\']}")',
          sale: '3 | Antorcha | 16',
        },
        gracioso: {
          pide: 'La fila más misteriosa del archivo.',
          codigo: 'fila = {"id": 99, "nombre": "Calcetín perdido", "material": "lana misteriosa"}\n\nprint(f"{fila[\'id\']} | {fila[\'nombre\']} | {fila[\'material\']}")',
          sale: '99 | Calcetín perdido | lana misteriosa',
        },
      },
      {
        titulo: 'La tabla entera: for y enumerate()',
        ataques: ['c06-j3', 'c06-t1', 'c06-t2'],
        arena: ['La tabla completa', 'Solo los de un material'],
        ejemplo: {
          pide: '`enumerate()` te da el número de vuelta (desde 0) y el elemento.',
          codigo: 'items = ["Pan", "Leche", "Torta"]\n\nfor i, item in enumerate(items):\n    print(f"{i}: {item}")',
          sale: '0: Pan\n1: Leche\n2: Torta',
        },
        guiado: {
          pide: 'Imprimí cada fila de la tabla como `id | nombre | material`.',
          codigo: 'inventario = [\n    {"id": 1, "nombre": "Espada", "material": "diamante"},\n    {"id": 2, "nombre": "Pico", "material": "hierro"},\n    {"id": 3, "nombre": "Arco", "material": "madera"},\n]\n\nfor item in inventario:\n    print(f"{item[\'id\']} | {item[___]} | {item[___]}")',
          respuestas: ["'nombre'", "'material'"],
          sale: '1 | Espada | diamante\n2 | Pico | hierro\n3 | Arco | madera',
        },
        desafio: {
          pide: 'Con `enumerate()`, imprimí cada mob con su índice: `0: Creeper`, `1: Zombie`...',
          codigo: 'mobs = ["Creeper", "Zombie", "Araña"]\n\n# Tu for con enumerate',
          solucion: 'mobs = ["Creeper", "Zombie", "Araña"]\n\nfor i, mob in enumerate(mobs):\n    print(f"{i}: {mob}")',
          sale: '0: Creeper\n1: Zombie\n2: Araña',
        },
        gracioso: {
          pide: 'La lista de tareas de un día normal.',
          codigo: 'tareas = ["picar piedra", "esquivar creeper", "llorar por el diamante perdido"]\n\nfor i, tarea in enumerate(tareas):\n    print(f"{i}: {tarea}")',
          sale: '0: picar piedra\n1: esquivar creeper\n2: llorar por el diamante perdido',
        },
      },
    ],
    extra: {
      pide: 'Imprimí solo el nombre de los ítems de "hierro".',
      codigo: 'inventario = [\n    {"nombre": "Espada", "material": "hierro"},\n    {"nombre": "Arco", "material": "madera"},\n    {"nombre": "Casco", "material": "hierro"},\n]\n\n# Tu for con if',
      solucion: 'inventario = [\n    {"nombre": "Espada", "material": "hierro"},\n    {"nombre": "Arco", "material": "madera"},\n    {"nombre": "Casco", "material": "hierro"},\n]\n\nfor item in inventario:\n    if item["material"] == "hierro":\n        print(item["nombre"])',
      sale: 'Espada\nCasco',
    },
  },
  {
    numero: 12, semana: 6, dia: 2, bossId: 'archivista', lang: 'python',
    temas: [
      {
        titulo: 'Ordenar con sorted() y lambda',
        ataques: ['c06-t3'],
        ejemplo: {
          pide: '`key=lambda x: x["cantidad"]` le dice a `sorted()` por qué clave ordenar (de menor a mayor). Es el ORDER BY de Python.',
          codigo: 'inventario = [\n    {"nombre": "Pico", "cantidad": 2},\n    {"nombre": "Hacha", "cantidad": 1},\n]\n\nordenado = sorted(inventario, key=lambda x: x["cantidad"])\nfor item in ordenado:\n    print(item["nombre"])',
          sale: 'Hacha\nPico',
        },
        guiado: {
          pide: 'Ordená por cantidad, de menor a mayor.',
          codigo: 'inventario = [\n    {"nombre": "Pan", "cantidad": 8},\n    {"nombre": "Torta", "cantidad": 1},\n    {"nombre": "Galleta", "cantidad": 4},\n]\n\nordenado = sorted(inventario, key=lambda x: x[___])\nfor item in ordenado:\n    print(f"{item[\'nombre\']}: {item[\'cantidad\']}")',
          respuestas: ['"cantidad"'],
          sale: 'Torta: 1\nGalleta: 4\nPan: 8',
        },
        desafio: {
          pide: 'Ordená los mobs por `hp` de menor a mayor e imprimí `nombre: hp`.',
          codigo: 'mobs = [\n    {"nombre": "Zombie", "hp": 20},\n    {"nombre": "Araña", "hp": 16},\n    {"nombre": "Enderman", "hp": 40},\n]\n\n# sorted con lambda y un for',
          solucion: 'mobs = [\n    {"nombre": "Zombie", "hp": 20},\n    {"nombre": "Araña", "hp": 16},\n    {"nombre": "Enderman", "hp": 40},\n]\n\nordenado = sorted(mobs, key=lambda x: x["hp"])\nfor mob in ordenado:\n    print(f"{mob[\'nombre\']}: {mob[\'hp\']}")',
          sale: 'Araña: 16\nZombie: 20\nEnderman: 40',
        },
        gracioso: {
          pide: 'Los amigos del server, en orden alfabético.',
          codigo: 'amigos = [\n    {"nombre": "Zombie Pablo"},\n    {"nombre": "Aldeano Hmm"},\n    {"nombre": "Murciélago Kevin"},\n]\n\nfor a in sorted(amigos, key=lambda x: x["nombre"]):\n    print(a["nombre"])',
          sale: 'Aldeano Hmm\nMurciélago Kevin\nZombie Pablo',
        },
      },
    ],
  },

  // ══ Semana 7 · Constructor del Vacío · CREATE TABLE · INSERT ═══════════════
  {
    numero: 13, semana: 7, dia: 1, bossId: 'constructor-vacio', lang: 'sql',
    temas: [
      {
        titulo: 'CREATE TABLE y los tipos',
        ataques: ['c07-j1', 'c07-t1'],
        arena: ['Crear la tabla'],
        ejemplo: {
          pide: '`TEXT` para palabras, `INTEGER` para números enteros. La última línea es para mirar cómo quedó.',
          codigo: "CREATE TABLE mascotas (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT\n);\nINSERT INTO mascotas VALUES (1, 'Rodolfo');\nSELECT * FROM mascotas;",
          sale: '1|Rodolfo',
        },
        guiado: {
          pide: 'La tabla se llama `herramientas`; `nombre` es texto y `cantidad` un número entero.',
          codigo: "CREATE TABLE ___ (\n  id INTEGER PRIMARY KEY,\n  nombre ___,\n  cantidad ___\n);\nINSERT INTO herramientas VALUES (1, 'Pala', 2);\nSELECT * FROM herramientas;",
          respuestas: ['herramientas', 'TEXT', 'INTEGER'],
          sale: '1|Pala|2',
        },
        desafio: {
          pide: 'Escribí el `CREATE TABLE` de `cofre` con `id INTEGER PRIMARY KEY`, `nombre TEXT`, `cantidad INTEGER` y `material TEXT`.',
          codigo: "-- Tu CREATE TABLE acá\n\nINSERT INTO cofre VALUES (1, 'Espada', 1, 'diamante');\nSELECT * FROM cofre;",
          solucion: "CREATE TABLE cofre (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT,\n  cantidad INTEGER,\n  material TEXT\n);\n\nINSERT INTO cofre VALUES (1, 'Espada', 1, 'diamante');\nSELECT * FROM cofre;",
          sale: '1|Espada|1|diamante',
        },
        gracioso: {
          pide: 'Una tabla para guardar excusas.',
          codigo: "CREATE TABLE excusas (\n  id INTEGER PRIMARY KEY,\n  texto TEXT\n);\nINSERT INTO excusas VALUES (1, 'El perro se comió mi pico');\nSELECT texto FROM excusas;",
          sale: 'El perro se comió mi pico',
        },
      },
      {
        titulo: 'INSERT INTO: una fila',
        ataques: ['c07-j2', 'c07-t2'],
        arena: ['Insertar un ítem'],
        ejemplo: {
          pide: 'Primero las columnas, después los valores en el mismo orden. El texto va entre comillas simples.',
          tabla: ITEMS_VACIA,
          codigo: "INSERT INTO items (id, nombre, cantidad)\nVALUES (1, 'Antorcha', 16);\nSELECT * FROM items;",
          sale: '1|Antorcha|16',
        },
        guiado: {
          pide: "Insertá id 1, nombre 'Cama' y cantidad 1.",
          tabla: ITEMS_VACIA,
          codigo: 'INSERT INTO items (id, nombre, cantidad)\nVALUES (___, ___, ___);\nSELECT * FROM items;',
          respuestas: ['1', "'Cama'", '1'],
          sale: '1|Cama|1',
        },
        desafio: {
          pide: "Escribí el `INSERT` completo: id 2, nombre 'Pan', cantidad 12.",
          tabla: ITEMS_VACIA,
          codigo: '-- Tu INSERT acá\n\nSELECT * FROM items;',
          solucion: "INSERT INTO items (id, nombre, cantidad)\nVALUES (2, 'Pan', 12);\n\nSELECT * FROM items;",
          sale: '2|Pan|12',
        },
        gracioso: {
          pide: 'El ítem más raro del cofre.',
          tabla: ITEMS_VACIA,
          codigo: "INSERT INTO items (id, nombre, cantidad)\nVALUES (1, 'Pollo que no para de mirar', 1);\nSELECT nombre FROM items;",
          sale: 'Pollo que no para de mirar',
        },
      },
    ],
    extra: {
      pide: 'Creá la tabla `amigos` (id, nombre, mob_favorito) e insertá tu propia fila.',
      codigo: '-- Tu tabla y tu fila\n',
      solucion: "CREATE TABLE amigos (id INTEGER PRIMARY KEY, nombre TEXT, mob_favorito TEXT);\nINSERT INTO amigos VALUES (1, 'Sofi', 'Ajolote');\nSELECT * FROM amigos;",
      sale: '1|Sofi|Ajolote',
    },
  },
  {
    numero: 14, semana: 7, dia: 2, bossId: 'constructor-vacio', lang: 'sql',
    temas: [
      {
        titulo: 'Varias filas de una vez',
        ataques: ['c07-j3', 'c07-t3'],
        arena: ['Dos de una vez'],
        ejemplo: {
          pide: 'Un solo `VALUES` con varias filas separadas por coma.',
          tabla: ITEMS_VACIA,
          codigo: "INSERT INTO items (id, nombre, cantidad)\nVALUES\n  (1, 'Pico', 1),\n  (2, 'Pala', 1);\nSELECT * FROM items;",
          sale: '1|Pico|1\n2|Pala|1',
        },
        guiado: {
          pide: "Completá con 'Arco' y 'Flecha'.",
          tabla: ITEMS_VACIA,
          codigo: 'INSERT INTO items (id, nombre, cantidad)\nVALUES\n  (1, ___, 1),\n  (2, ___, 64);\nSELECT * FROM items;',
          respuestas: ["'Arco'", "'Flecha'"],
          sale: '1|Arco|1\n2|Flecha|64',
        },
        desafio: {
          pide: "Con un solo `INSERT`, cargá en `cofre`: (1, 'Casco', 1, 'oro'), (2, 'Botas', 1, 'cuero') y (3, 'Tierra', 64, 'tierra').",
          tabla: COFRE_VACIO,
          codigo: '-- Tu INSERT con tres filas\n\nSELECT * FROM cofre;',
          solucion: "INSERT INTO cofre (id, nombre, cantidad, material)\nVALUES\n  (1, 'Casco', 1, 'oro'),\n  (2, 'Botas', 1, 'cuero'),\n  (3, 'Tierra', 64, 'tierra');\n\nSELECT * FROM cofre;",
          sale: '1|Casco|1|oro\n2|Botas|1|cuero\n3|Tierra|64|tierra',
        },
        gracioso: {
          pide: 'Rodolfo solo cosecha papas.',
          tabla: ITEMS_VACIA,
          codigo: "INSERT INTO items (id, nombre, cantidad)\nVALUES\n  (1, 'Papa', 1),\n  (2, 'Papa', 1),\n  (3, 'Papa', 1);\nSELECT nombre FROM items;",
          sale: 'Papa\nPapa\nPapa',
        },
      },
    ],
  },

  // ══ Semana 8 · Oráculo Oscuro · SELECT · WHERE · ORDER BY ═════════════════
  {
    numero: 15, semana: 8, dia: 1, bossId: 'oraculo-oscuro', lang: 'sql',
    temas: [
      {
        titulo: 'SELECT: elegir columnas',
        ataques: ['c08-j1'],
        ejemplo: {
          pide: '`SELECT` dice qué columnas querés ver; `FROM`, de qué tabla.',
          tabla: COFRE_ORACULO,
          codigo: 'SELECT nombre\nFROM cofre;',
          sale: 'Espada\nAntorcha\nPico\nManzana\nFlecha',
        },
        guiado: {
          pide: 'Traé `nombre` y `cantidad`.',
          tabla: COFRE_ORACULO,
          codigo: 'SELECT ___, ___\nFROM cofre;',
          respuestas: ['nombre', 'cantidad'],
          sale: 'Espada|1\nAntorcha|16\nPico|2\nManzana|8\nFlecha|64',
        },
        desafio: {
          pide: 'Traé `material` y `nombre`, en ese orden.',
          tabla: COFRE_ORACULO,
          codigo: '-- Tu SELECT',
          solucion: 'SELECT material, nombre\nFROM cofre;',
          sale: 'diamante|Espada\nmadera|Antorcha\ndiamante|Pico\ncomida|Manzana\nmadera|Flecha',
        },
        gracioso: {
          pide: 'El Oráculo opina de cada ítem.',
          tabla: COFRE_ORACULO,
          codigo: "SELECT nombre, 'es genial'\nFROM cofre;",
          sale: 'Espada|es genial\nAntorcha|es genial\nPico|es genial\nManzana|es genial\nFlecha|es genial',
        },
      },
      {
        titulo: 'WHERE: filtrar filas',
        ataques: ['c08-j2', 'c08-j3', 'c08-t1'],
        arena: ['Solo los de un material', 'Los caros'],
        ejemplo: {
          pide: '`WHERE` deja pasar solo las filas que cumplen la condición.',
          tabla: COFRE_ORACULO,
          codigo: "SELECT nombre\nFROM cofre\nWHERE material = 'madera';",
          sale: 'Antorcha\nFlecha',
        },
        guiado: {
          pide: "Traé `nombre` y `cantidad` de los de 'diamante'. ¿Qué columna comparamos?",
          tabla: COFRE_ORACULO,
          codigo: "SELECT nombre, cantidad\nFROM cofre\nWHERE ___ = 'diamante';",
          respuestas: ['material'],
          sale: 'Espada|1\nPico|2',
        },
        desafio: {
          pide: 'Traé el `nombre` de los ítems con `cantidad` mayor a 10.',
          tabla: COFRE_ORACULO,
          codigo: '-- Tu SELECT con WHERE',
          solucion: 'SELECT nombre\nFROM cofre\nWHERE cantidad > 10;',
          sale: 'Antorcha\nFlecha',
        },
        gracioso: {
          pide: '¿Qué se puede comer Rodolfo?',
          tabla: COFRE_ORACULO,
          codigo: "SELECT nombre\nFROM cofre\nWHERE material = 'comida';",
          sale: 'Manzana',
        },
      },
    ],
    extra: {
      pide: 'Traé solo el nombre del ítem con `id` 3.',
      tabla: COFRE_ORACULO,
      codigo: '-- Tu SELECT',
      solucion: 'SELECT nombre\nFROM cofre\nWHERE id = 3;',
      sale: 'Pico',
    },
  },
  {
    numero: 16, semana: 8, dia: 2, bossId: 'oraculo-oscuro', lang: 'sql',
    temas: [
      {
        titulo: 'ORDER BY: ordenar',
        ataques: ['c08-t2', 'c08-t3'],
        arena: ['Del más caro al más barato'],
        ejemplo: {
          pide: '`ORDER BY` ordena de menor a mayor. Con `DESC`, al revés.',
          tabla: COFRE_ORACULO,
          codigo: 'SELECT nombre, cantidad\nFROM cofre\nORDER BY cantidad;',
          sale: 'Espada|1\nPico|2\nManzana|8\nAntorcha|16\nFlecha|64',
        },
        guiado: {
          pide: 'Del que más hay al que menos.',
          tabla: COFRE_ORACULO,
          codigo: 'SELECT nombre, cantidad\nFROM cofre\nORDER BY ___ ___;',
          respuestas: ['cantidad', 'DESC'],
          sale: 'Flecha|64\nAntorcha|16\nManzana|8\nPico|2\nEspada|1',
        },
        desafio: {
          pide: 'Traé `nombre` y `material` de los ítems con `cantidad` mayor a 1, ordenados por `nombre` (A → Z).',
          tabla: COFRE_ORACULO,
          codigo: '-- WHERE y ORDER BY juntos',
          solucion: 'SELECT nombre, material\nFROM cofre\nWHERE cantidad > 1\nORDER BY nombre;',
          sale: 'Antorcha|madera\nFlecha|madera\nManzana|comida\nPico|diamante',
        },
        gracioso: {
          pide: 'El cofre como lo ordenaría un creeper confundido.',
          tabla: COFRE_ORACULO,
          codigo: 'SELECT nombre\nFROM cofre\nORDER BY nombre DESC;',
          sale: 'Pico\nManzana\nFlecha\nEspada\nAntorcha',
        },
      },
    ],
  },

  // ══ Semana 9 · Contador de Almas · COUNT · SUM · AVG · GROUP BY ═══════════
  {
    numero: 17, semana: 9, dia: 1, bossId: 'contador-almas', lang: 'sql',
    temas: [
      {
        titulo: 'COUNT(*): contar filas',
        ataques: ['c09-j1', 'c09-j3', 'c09-t1'],
        arena: ['Contar una especie'],
        ejemplo: {
          pide: '`COUNT(*)` cuenta cuántas filas hay. Devuelve un solo número.',
          tabla: MONSTRUOS,
          codigo: 'SELECT COUNT(*)\nFROM monstruos;',
          sale: '6',
        },
        guiado: {
          pide: "Contá solo los de tipo 'Creeper'.",
          tabla: MONSTRUOS,
          codigo: 'SELECT ___(*)\nFROM monstruos\nWHERE tipo = ___;',
          respuestas: ['COUNT', "'Creeper'"],
          sale: '2',
        },
        desafio: {
          pide: 'Contá cuántos monstruos tienen `hp` mayor a 20.',
          tabla: MONSTRUOS,
          codigo: '-- Tu COUNT con WHERE',
          solucion: 'SELECT COUNT(*)\nFROM monstruos\nWHERE hp > 20;',
          sale: '3',
        },
        gracioso: {
          pide: '¿Cuántos dragones hay? Uff.',
          tabla: MONSTRUOS,
          codigo: "SELECT COUNT(*)\nFROM monstruos\nWHERE tipo = 'Dragón';",
          sale: '0',
        },
      },
      {
        titulo: 'SUM() y AVG(): sumar y promediar',
        ataques: ['c09-j2', 'c09-t2'],
        arena: ['HP del ejército'],
        ejemplo: {
          pide: '`SUM(columna)` suma todos los valores de esa columna.',
          tabla: MONSTRUOS,
          codigo: 'SELECT SUM(hp)\nFROM monstruos;',
          sale: '129',
        },
        guiado: {
          pide: 'Sumá la vida de los zombies.',
          tabla: MONSTRUOS,
          codigo: "SELECT ___(hp)\nFROM monstruos\nWHERE tipo = 'Zombie';",
          respuestas: ['SUM'],
          sale: '46',
        },
        desafio: {
          pide: 'Calculá el promedio de `hp` de todo el ejército con `AVG()`.',
          tabla: MONSTRUOS,
          codigo: '-- Tu SELECT con AVG',
          solucion: 'SELECT AVG(hp)\nFROM monstruos;',
          sale: '21.5',
        },
        gracioso: {
          pide: 'La vida de la única araña (está sola, no le digas).',
          tabla: MONSTRUOS,
          codigo: "SELECT SUM(hp)\nFROM monstruos\nWHERE tipo = 'Araña';",
          sale: '16',
        },
      },
    ],
    extra: {
      pide: "Contá cuántos NO son 'Creeper' (distinto se escribe `!=`).",
      tabla: MONSTRUOS,
      codigo: '-- Tu COUNT',
      solucion: "SELECT COUNT(*)\nFROM monstruos\nWHERE tipo != 'Creeper';",
      sale: '4',
    },
  },
  {
    numero: 18, semana: 9, dia: 2, bossId: 'contador-almas', lang: 'sql',
    temas: [
      {
        titulo: 'GROUP BY: un resultado por grupo',
        ataques: ['c09-t3'],
        arena: ['Cuántos de cada tipo'],
        ejemplo: {
          pide: '`GROUP BY tipo` junta las filas del mismo tipo y cuenta cada grupo por separado.',
          tabla: MONSTRUOS,
          codigo: 'SELECT tipo, COUNT(*)\nFROM monstruos\nGROUP BY tipo\nORDER BY tipo;',
          sale: 'Araña|1\nCreeper|2\nEsqueleto|1\nZombie|2',
        },
        guiado: {
          pide: 'Sumá la vida de cada tipo. ¿Por qué columna agrupamos?',
          tabla: MONSTRUOS,
          codigo: 'SELECT tipo, SUM(hp)\nFROM monstruos\nGROUP BY ___\nORDER BY tipo;',
          respuestas: ['tipo'],
          sale: 'Araña|16\nCreeper|40\nEsqueleto|27\nZombie|46',
        },
        desafio: {
          pide: 'En el cofre: contá cuántos ítems hay de cada `material`, ordenado por material.',
          tabla: COFRE_ORACULO,
          codigo: '-- Tu GROUP BY',
          solucion: 'SELECT material, COUNT(*)\nFROM cofre\nGROUP BY material\nORDER BY material;',
          sale: 'comida|1\ndiamante|2\nmadera|2',
        },
        gracioso: {
          pide: 'El ranking de quién vino más a la fiesta.',
          tabla: MONSTRUOS,
          codigo: 'SELECT tipo, COUNT(*)\nFROM monstruos\nGROUP BY tipo\nORDER BY COUNT(*) DESC, tipo;',
          sale: 'Creeper|2\nZombie|2\nAraña|1\nEsqueleto|1',
        },
      },
    ],
  },

  // ══ Semana 10 · El Falsificador · UPDATE · DELETE ══════════════════════════
  {
    numero: 19, semana: 10, dia: 1, bossId: 'falsificador', lang: 'sql',
    temas: [
      {
        titulo: 'UPDATE ... SET ... WHERE',
        ataques: ['c10-j1', 'c10-j3', 'c10-t1'],
        arena: ['Cambiar el material', 'Reponer stock'],
        ejemplo: {
          pide: '`SET` dice qué cambia; `WHERE`, en qué fila. Sin `WHERE` cambia todas.',
          tabla: COFRE_FALSO,
          codigo: "UPDATE cofre\nSET material = 'oro'\nWHERE nombre = 'Pico';\nSELECT nombre, material FROM cofre;",
          sale: 'Espada|hierro\nPico|oro\nFlecha|madera\nTronco|madera\nPoción|vidrio',
        },
        guiado: {
          pide: "Que la 'Poción' quede con cantidad 10.",
          tabla: COFRE_FALSO,
          codigo: 'UPDATE cofre\nSET cantidad = ___\nWHERE nombre = ___;\nSELECT nombre, cantidad FROM cofre;',
          respuestas: ['10', "'Poción'"],
          sale: 'Espada|1\nPico|1\nFlecha|64\nTronco|32\nPoción|10',
        },
        desafio: {
          pide: "Cambiá el material de la 'Espada' a 'diamante'. Escribí el `UPDATE` entero.",
          tabla: COFRE_FALSO,
          codigo: '-- Tu UPDATE acá\n\nSELECT nombre, material FROM cofre;',
          solucion: "UPDATE cofre\nSET material = 'diamante'\nWHERE nombre = 'Espada';\n\nSELECT nombre, material FROM cofre;",
          sale: 'Espada|diamante\nPico|hierro\nFlecha|madera\nTronco|madera\nPoción|vidrio',
        },
        gracioso: {
          pide: 'El Falsificador estuvo acá.',
          tabla: COFRE_FALSO,
          codigo: "UPDATE cofre\nSET nombre = 'Espada de cartón'\nWHERE id = 1;\nSELECT nombre\nFROM cofre\nWHERE id = 1;",
          sale: 'Espada de cartón',
        },
      },
      {
        titulo: 'DELETE con WHERE',
        ataques: ['c10-j2', 'c10-t2'],
        arena: ['Borrar uno solo'],
        ejemplo: {
          pide: '`DELETE` borra las filas que cumplen el `WHERE`.',
          tabla: COFRE_FALSO,
          codigo: "DELETE FROM cofre\nWHERE nombre = 'Tronco';\nSELECT nombre FROM cofre;",
          sale: 'Espada\nPico\nFlecha\nPoción',
        },
        guiado: {
          pide: "Borrá todo lo que sea de 'madera'.",
          tabla: COFRE_FALSO,
          codigo: 'DELETE FROM cofre\nWHERE ___ = ___;\nSELECT nombre, material FROM cofre;',
          respuestas: ['material', "'madera'"],
          sale: 'Espada|hierro\nPico|hierro\nPoción|vidrio',
        },
        desafio: {
          pide: 'Borrá la fila con `id` 5 y mostrá los nombres que quedan.',
          tabla: COFRE_FALSO,
          codigo: '-- Tu DELETE y tu SELECT',
          solucion: 'DELETE FROM cofre\nWHERE id = 5;\nSELECT nombre FROM cofre;',
          sale: 'Espada\nPico\nFlecha\nTronco',
        },
        gracioso: {
          pide: 'Lo que pasa si te olvidás el WHERE: el cofre queda vacío. ¡Nunca en el jefe!',
          tabla: COFRE_FALSO,
          codigo: 'DELETE FROM cofre;\nSELECT COUNT(*) FROM cofre;',
          sale: '0',
        },
      },
    ],
    extra: {
      pide: "Sumale 10 a las flechas con `cantidad = cantidad + 10` y mostrá cuántas quedaron.",
      tabla: COFRE_FALSO,
      codigo: '-- Tu UPDATE y tu SELECT',
      solucion: "UPDATE cofre\nSET cantidad = cantidad + 10\nWHERE nombre = 'Flecha';\nSELECT cantidad\nFROM cofre\nWHERE nombre = 'Flecha';",
      sale: '74',
    },
  },
  {
    numero: 20, semana: 10, dia: 2, bossId: 'falsificador', lang: 'sql',
    temas: [
      {
        titulo: 'UPDATE a muchas filas con <',
        ataques: ['c10-t3'],
        ejemplo: {
          pide: 'El `WHERE` puede comparar números: cambia todas las filas que cumplen.',
          tabla: HERRAMIENTAS,
          codigo: 'UPDATE herramientas\nSET durabilidad = 100\nWHERE durabilidad < 20;\nSELECT nombre, durabilidad FROM herramientas;',
          sale: 'Espada|100\nPico|80\nHacha|30\nArco|95\nPala|45',
        },
        guiado: {
          pide: 'Repará (100) todas las que tienen menos de 50.',
          tabla: HERRAMIENTAS,
          codigo: 'UPDATE herramientas\nSET durabilidad = 100\nWHERE ___ < ___;\nSELECT nombre, durabilidad FROM herramientas;',
          respuestas: ['durabilidad', '50'],
          sale: 'Espada|100\nPico|80\nHacha|100\nArco|95\nPala|100',
        },
        desafio: {
          pide: 'Las que tienen más de 90 se gastaron: dejalas en 60. El resto no se toca.',
          tabla: HERRAMIENTAS,
          codigo: '-- Tu UPDATE\n\nSELECT nombre, durabilidad FROM herramientas;',
          solucion: 'UPDATE herramientas\nSET durabilidad = 60\nWHERE durabilidad > 90;\n\nSELECT nombre, durabilidad FROM herramientas;',
          sale: 'Espada|15\nPico|80\nHacha|30\nArco|60\nPala|45',
        },
        gracioso: {
          pide: 'Reparación de emergencia (`||` pega textos).',
          tabla: HERRAMIENTAS,
          codigo: "UPDATE herramientas\nSET nombre = nombre || ' (con cinta)'\nWHERE durabilidad < 50;\nSELECT nombre FROM herramientas;",
          sale: 'Espada (con cinta)\nPico\nHacha (con cinta)\nArco\nPala (con cinta)',
        },
      },
    ],
  },

  // ══ Semana 11 · El Nexo · la máquina sql() ═══════════════════════════════
  // sql("...") ya viene precargada en el Patio (modo Python) y devuelve una
  // lista de diccionarios. cargar_ejemplo("mobs") / ("cofre") llena una tabla
  // de ejemplo. Ver MAQUINA_SQL en lib/game/executor/pyodide-runner.ts.
  {
    numero: 21, semana: 11, dia: 1, bossId: 'el-nexo', lang: 'python',
    temas: [
      {
        titulo: "La máquina sql(): crear, guardar y leer",
        ataques: ["c11-j1"],
        ejemplo: {
          pide: "`sql()` es la máquina del Nexo: ya viene hecha en el Patio. Le pasás la orden SQL entre `\"\"\"`, escrita como siempre, y te devuelve una lista de diccionarios (¡como en el Archivista!). Los textos de adentro del SQL van con comillas simples: `'Zombie'`.",
          codigo: "sql(\"\"\"\n    CREATE TABLE mobs (\n        nombre TEXT,\n        vida INTEGER\n    )\n\"\"\")\n\nsql(\"\"\"\n    INSERT INTO mobs (nombre, vida)\n    VALUES\n        ('Zombie', 4),\n        ('Creeper', 6)\n\"\"\")\n\nprint(sql(\"\"\"\n    SELECT *\n    FROM mobs\n\"\"\"))",
          sale: "[{'nombre': 'Zombie', 'vida': 4}, {'nombre': 'Creeper', 'vida': 6}]",
        },
        guiado: {
          pide: "Invocá un `'Creeper'` con `6` de vida y leé la tabla `mobs`.",
          codigo: "sql(\"\"\"\n    CREATE TABLE mobs (\n        nombre TEXT,\n        vida INTEGER\n    )\n\"\"\")\n\nsql(\"\"\"\n    INSERT INTO mobs (nombre, vida)\n    VALUES\n        ('Zombie', 4),\n        ('___', ___)\n\"\"\")\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM ___\n\"\"\")\nfor mob in mobs:\n    print(mob[\"nombre\"], mob[\"vida\"])",
          respuestas: ["Creeper", "6", "mobs"],
          sale: "Zombie 4\nCreeper 6",
        },
        desafio: {
          pide: "Creá la tabla `cofre (nombre TEXT, cantidad INTEGER)`, guardá `'Diamante'` 5 y `'Hierro'` 3 en un solo `INSERT` y mostralos con un `for`.",
          codigo: "# Tu CREATE TABLE, tu INSERT y el for\n",
          solucion: "sql(\"\"\"\n    CREATE TABLE cofre (\n        nombre TEXT,\n        cantidad INTEGER\n    )\n\"\"\")\n\nsql(\"\"\"\n    INSERT INTO cofre (nombre, cantidad)\n    VALUES\n        ('Diamante', 5),\n        ('Hierro', 3)\n\"\"\")\n\ncofre = sql(\"\"\"\n    SELECT *\n    FROM cofre\n\"\"\")\nfor item in cofre:\n    print(item[\"nombre\"], item[\"cantidad\"])",
          sale: "Diamante 5\nHierro 3",
        },
        gracioso: {
          pide: "El diario de siestas de Rodolfo.",
          codigo: "sql(\"\"\"\n    CREATE TABLE siestas (\n        lugar TEXT,\n        minutos INTEGER\n    )\n\"\"\")\n\nsql(\"\"\"\n    INSERT INTO siestas (lugar, minutos)\n    VALUES\n        ('el barro', 90),\n        ('un cofre', 45),\n        ('la cabeza de un creeper', 1)\n\"\"\")\n\nsiestas = sql(\"\"\"\n    SELECT *\n    FROM siestas\n\"\"\")\nfor siesta in siestas:\n    print(\"Rodolfo durmió\", siesta[\"minutos\"], \"min en\", siesta[\"lugar\"])",
          sale: "Rodolfo durmió 90 min en el barro\nRodolfo durmió 45 min en un cofre\nRodolfo durmió 1 min en la cabeza de un creeper",
        },
      },
      {
        titulo: "Barras de poder: ORDER BY y for",
        ataques: ["c11-j2"],
        arena: ['El segundo ítem', 'Contar desde Python'],
        ejemplo: {
          pide: "`cargar_ejemplo(\"cofre\")` llena la tabla `cofre` de ejemplo. Cada `item` es un diccionario: `item[\"cantidad\"]` es un número y `\"█\" * número` dibuja la barra.",
          codigo: "cargar_ejemplo(\"cofre\")\n\ncofre = sql(\"\"\"\n    SELECT *\n    FROM cofre\n    ORDER BY cantidad DESC\n\"\"\")\nfor item in cofre:\n    print(item[\"nombre\"], \"█\" * item[\"cantidad\"])",
          sale: "Oro ███████\nDiamante █████\nHierro ███",
        },
        guiado: {
          pide: "Barras de vida: ¿qué clave tiene el nombre y cuál el número?",
          codigo: "cargar_ejemplo(\"mobs\")\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    ORDER BY vida DESC\n\"\"\")\nfor mob in mobs:\n    print(mob[\"___\"], \"♥\" * mob[\"___\"])",
          respuestas: ["nombre", "vida"],
          sale: "Creeper ♥♥♥♥♥♥\nZombie ♥♥♥♥\nEsqueleto ♥♥♥",
        },
        desafio: {
          pide: "Creá `pociones (nombre TEXT, cantidad INTEGER)` con `'Fuerza'` 2, `'Salto'` 5 y `'Velocidad'` 3, y mostralas de menor a mayor con una barra de `*`.",
          codigo: "# Tu tabla, tu INSERT, el SELECT con ORDER BY y el for\n",
          solucion: "sql(\"\"\"\n    CREATE TABLE pociones (\n        nombre TEXT,\n        cantidad INTEGER\n    )\n\"\"\")\n\nsql(\"\"\"\n    INSERT INTO pociones (nombre, cantidad)\n    VALUES\n        ('Fuerza', 2),\n        ('Salto', 5),\n        ('Velocidad', 3)\n\"\"\")\n\npociones = sql(\"\"\"\n    SELECT *\n    FROM pociones\n    ORDER BY cantidad\n\"\"\")\nfor pocion in pociones:\n    print(pocion[\"nombre\"], \"*\" * pocion[\"cantidad\"])",
          sale: "Fuerza **\nVelocidad ***\nSalto *****",
        },
        gracioso: {
          pide: "El medidor de miedo de Rodolfo.",
          codigo: "cargar_ejemplo(\"mobs\")\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    ORDER BY vida DESC\n\"\"\")\nfor mob in mobs:\n    print(mob[\"nombre\"], \"AY\" * mob[\"vida\"])",
          sale: "Creeper AYAYAYAYAYAY\nZombie AYAYAYAY\nEsqueleto AYAYAY",
        },
      },
    ],
  },
  {
    numero: 22, semana: 11, dia: 2, bossId: 'el-nexo', lang: 'python',
    temas: [
      {
        titulo: "El radar: WHERE y len()",
        ataques: ["c11-j3"],
        arena: ['La columna justa'],
        ejemplo: {
          pide: "`WHERE` filtra en el SQL y `len()` cuenta cuántas cosas trajo la lista.",
          codigo: "cargar_ejemplo(\"cofre\")\n\nmuchos = sql(\"\"\"\n    SELECT *\n    FROM cofre\n    WHERE cantidad > 4\n\"\"\")\nprint(\"Tenés\", len(muchos), \"ítems con más de 4\")\nfor item in muchos:\n    print(\"★\", item[\"nombre\"])",
          sale: "Tenés 2 ítems con más de 4\n★ Diamante\n★ Oro",
        },
        guiado: {
          pide: "Los peligrosos: los mobs con más de 3 de vida. ¿Cómo se llama tu lista?",
          codigo: "cargar_ejemplo(\"mobs\")\n\npeligrosos = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    WHERE vida ___ 3\n\"\"\")\nprint(\"Hay\", len(___), \"mobs peligrosos\")\nfor mob in peligrosos:\n    print(\"!\", mob[\"nombre\"])",
          respuestas: [">", "peligrosos"],
          sale: "Hay 2 mobs peligrosos\n! Zombie\n! Creeper",
        },
        desafio: {
          pide: "Invocá en la PC de tu compañero: se cambian de PC y el compañero invoca 3 mobs. Completá el `INSERT` con las variables. Si invoca Zombie 4, Creeper 6 y Bruja 2, al final se ve:",
          codigo: "sql(\"\"\"\n    CREATE TABLE mobs (\n        nombre TEXT,\n        vida INTEGER\n    )\n\"\"\")\n\nfor vuelta in range(3):\n    nombre = input(\"¿Qué mob invocás? \")\n    vida = int(input(\"¿Cuánta vida tiene? \"))\n    sql(f\"\"\"\n        INSERT INTO mobs (nombre, vida)\n        VALUES\n            ('{___}', {___})\n    \"\"\")\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    ORDER BY vida DESC\n\"\"\")\nfor mob in mobs:\n    print(mob[\"nombre\"], \"♥\" * mob[\"vida\"])",
          solucion: "sql(\"\"\"\n    CREATE TABLE mobs (\n        nombre TEXT,\n        vida INTEGER\n    )\n\"\"\")\n\nfor vuelta in range(3):\n    nombre = input(\"¿Qué mob invocás? \")\n    vida = int(input(\"¿Cuánta vida tiene? \"))\n    sql(f\"\"\"\n        INSERT INTO mobs (nombre, vida)\n        VALUES\n            ('{nombre}', {vida})\n    \"\"\")\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    ORDER BY vida DESC\n\"\"\")\nfor mob in mobs:\n    print(mob[\"nombre\"], \"♥\" * mob[\"vida\"])",
          sale: "Creeper ♥♥♥♥♥♥\nZombie ♥♥♥♥\nBruja ♥♥",
        },
        gracioso: {
          pide: "El radar de tesoros apestosos de Rodolfo.",
          codigo: "sql(\"\"\"\n    CREATE TABLE barro (\n        cosa TEXT,\n        olor INTEGER\n    )\n\"\"\")\n\nsql(\"\"\"\n    INSERT INTO barro (cosa, olor)\n    VALUES\n        ('Zapato perdido', 9),\n        ('Manzana', 2),\n        ('Pescado de ayer', 10)\n\"\"\")\n\napestosos = sql(\"\"\"\n    SELECT *\n    FROM barro\n    WHERE olor > 8\n\"\"\")\nprint(\"Rodolfo encontró\", len(apestosos), \"tesoros apestosos\")\nfor cosa in apestosos:\n    print(\"~\", cosa[\"cosa\"])",
          sale: "Rodolfo encontró 2 tesoros apestosos\n~ Zapato perdido\n~ Pescado de ayer",
        },
      },
    ],
  },

  // ══ Semana 12 · La Hydra · agregar() y listar() con la máquina sql() ═══════
  {
    numero: 23, semana: 12, dia: 1, bossId: 'la-hydra', lang: 'python',
    temas: [
      {
        titulo: "agregar(): una función que guarda",
        ataques: ["c12-j1"],
        arena: ["Cortar cabezas"],
        ejemplo: {
          pide: "Una función que guarda: la llamás y hace el `INSERT`. Con `f\"\"\"` las variables entran al SQL entre llaves; el texto además lleva comillas simples: `'{nombre}'`. ¡Cada cabeza de la Hydra es una carta de tu mazo!",
          codigo: "sql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\n\ndef agregar(nombre, poder):\n    sql(f\"\"\"\n        INSERT INTO cartas (nombre, poder)\n        VALUES\n            ('{nombre}', {poder})\n    \"\"\")\n    print(\"Nueva carta:\", nombre)\n\nagregar(\"Dragón de papel\", 3)\nagregar(\"Gato ninja\", 8)",
          sale: "Nueva carta: Dragón de papel\nNueva carta: Gato ninja",
        },
        guiado: {
          pide: "Completá `guardar` con las dos variables.",
          codigo: "sql(\"\"\"\n    CREATE TABLE mochila (\n        nombre TEXT,\n        cantidad INTEGER\n    )\n\"\"\")\n\ndef guardar(nombre, cantidad):\n    sql(f\"\"\"\n        INSERT INTO mochila (nombre, cantidad)\n        VALUES\n            ('{___}', {___})\n    \"\"\")\n\nguardar(\"Manzana\", 3)\nguardar(\"Antorcha\", 16)\n\nmochila = sql(\"\"\"\n    SELECT *\n    FROM mochila\n\"\"\")\nprint(\"En la mochila hay\", len(mochila), \"cosas\")",
          respuestas: ["nombre", "cantidad"],
          sale: "En la mochila hay 2 cosas",
        },
        desafio: {
          pide: "Escribí `agregar_mob(nombre, vida)` que guarde en `mobs`. Usala para invocar un Zombie (4), un Creeper (6) y una Bruja (2), y mostralos con un `for`.",
          codigo: "sql(\"\"\"\n    CREATE TABLE mobs (\n        nombre TEXT,\n        vida INTEGER\n    )\n\"\"\")\n\n# Tu función agregar_mob, las 3 llamadas y el for\n",
          solucion: "sql(\"\"\"\n    CREATE TABLE mobs (\n        nombre TEXT,\n        vida INTEGER\n    )\n\"\"\")\n\ndef agregar_mob(nombre, vida):\n    sql(f\"\"\"\n        INSERT INTO mobs (nombre, vida)\n        VALUES\n            ('{nombre}', {vida})\n    \"\"\")\n\nagregar_mob(\"Zombie\", 4)\nagregar_mob(\"Creeper\", 6)\nagregar_mob(\"Bruja\", 2)\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n\"\"\")\nfor mob in mobs:\n    print(mob[\"nombre\"], mob[\"vida\"])",
          sale: "Zombie 4\nCreeper 6\nBruja 2",
        },
        gracioso: {
          pide: "Cortás una cabeza... y crecen dos.",
          codigo: "sql(\"\"\"\n    CREATE TABLE cabezas (\n        nombre TEXT\n    )\n\"\"\")\n\ndef cortar(nombre):\n    sql(f\"\"\"\n        INSERT INTO cabezas (nombre)\n        VALUES\n            ('{nombre} bis'),\n            ('{nombre} ter')\n    \"\"\")\n\ncortar(\"Cabeza 1\")\n\ncabezas = sql(\"\"\"\n    SELECT *\n    FROM cabezas\n\"\"\")\nprint(\"Cortaste 1 y ahora hay\", len(cabezas), \"cabezas. Esto no está funcionando.\")",
          sale: "Cortaste 1 y ahora hay 2 cabezas. Esto no está funcionando.",
        },
      },
      {
        titulo: "listar(): todo en orden",
        ataques: ["c12-j2"],
        arena: ["Listar en orden"],
        ejemplo: {
          pide: "`listar()` junta el `SELECT` y el `for` en una función: la llamás cada vez que querés ver todo. `ORDER BY nombre` ordena de la A a la Z.",
          codigo: "cargar_ejemplo(\"mobs\")\n\ndef listar():\n    mobs = sql(\"\"\"\n        SELECT *\n        FROM mobs\n        ORDER BY nombre\n    \"\"\")\n    for mob in mobs:\n        print(\"-\", mob[\"nombre\"])\n\nlistar()",
          sale: "- Creeper\n- Esqueleto\n- Zombie",
        },
        guiado: {
          pide: "Ordená el cofre de mayor a menor y dibujá la barra con la cantidad.",
          codigo: "cargar_ejemplo(\"cofre\")\n\ndef listar():\n    cofre = sql(\"\"\"\n        SELECT *\n        FROM cofre\n        ORDER BY cantidad ___\n    \"\"\")\n    for item in cofre:\n        print(item[\"nombre\"], \"#\" * item[\"___\"])\n\nlistar()",
          respuestas: ["DESC", "cantidad"],
          sale: "Oro #######\nDiamante #####\nHierro ###",
        },
        desafio: {
          pide: "Escribí `agregar(nombre, cantidad)` y `listar()` (por nombre, de la A a la Z) para el `cofre`. Agregá una `'Esmeralda'` con 4 y listá.",
          codigo: "cargar_ejemplo(\"cofre\")\n\n# Tus funciones agregar y listar, y las dos llamadas\n",
          solucion: "cargar_ejemplo(\"cofre\")\n\ndef agregar(nombre, cantidad):\n    sql(f\"\"\"\n        INSERT INTO cofre (nombre, cantidad)\n        VALUES\n            ('{nombre}', {cantidad})\n    \"\"\")\n\ndef listar():\n    cofre = sql(\"\"\"\n        SELECT *\n        FROM cofre\n        ORDER BY nombre\n    \"\"\")\n    for item in cofre:\n        print(item[\"nombre\"], item[\"cantidad\"])\n\nagregar(\"Esmeralda\", 4)\nlistar()",
          sale: "Diamante 5\nEsmeralda 4\nHierro 3\nOro 7",
        },
        gracioso: {
          pide: "El ranking de ronquidos de Rodolfo.",
          codigo: "sql(\"\"\"\n    CREATE TABLE siestas (\n        lugar TEXT,\n        ronquidos INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO siestas (lugar, ronquidos)\n    VALUES\n        ('el barro', 9),\n        ('un cofre', 3),\n        ('la cabeza de un creeper', 1)\n\"\"\")\n\ndef listar():\n    siestas = sql(\"\"\"\n        SELECT *\n        FROM siestas\n        ORDER BY ronquidos DESC\n    \"\"\")\n    for siesta in siestas:\n        print(siesta[\"lugar\"], \"z\" * siesta[\"ronquidos\"])\n\nlistar()",
          sale: "el barro zzzzzzzzz\nun cofre zzz\nla cabeza de un creeper z",
        },
      },
    ],
  },
  {
    numero: 24, semana: 12, dia: 2, bossId: 'la-hydra', lang: 'python',
    temas: [
      {
        titulo: "SQL trae, Python suma",
        ataques: ["c12-j3"],
        ejemplo: {
          pide: "SQL trae las filas y Python hace la cuenta: un acumulador que arranca en 0 y suma en cada vuelta del `for`.",
          codigo: "cargar_ejemplo(\"cofre\")\n\ncofre = sql(\"\"\"\n    SELECT *\n    FROM cofre\n\"\"\")\ntotal = 0\nfor item in cofre:\n    total = total + item[\"cantidad\"]\nprint(\"En el cofre hay\", total, \"cosas\")",
          sale: "En el cofre hay 15 cosas",
        },
        guiado: {
          pide: "Sumá la vida de todo el ejército de mobs.",
          codigo: "cargar_ejemplo(\"mobs\")\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n\"\"\")\ntotal = 0\nfor mob in mobs:\n    total = total + mob[\"___\"]\nprint(\"Vida de todo el ejército:\", ___)",
          respuestas: ["vida", "total"],
          sale: "Vida de todo el ejército: 13",
        },
        desafio: {
          pide: "Traé solo los mobs con más de 3 de vida (con `WHERE`), sumá su vida y decí cuántos son.",
          codigo: "cargar_ejemplo(\"mobs\")\n\n# Tu SELECT con WHERE, el acumulador y el print\n",
          solucion: "cargar_ejemplo(\"mobs\")\n\nfuertes = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    WHERE vida > 3\n\"\"\")\ntotal = 0\nfor mob in fuertes:\n    total = total + mob[\"vida\"]\nprint(\"Son\", len(fuertes), \"y suman\", total, \"de vida\")",
          sale: "Son 2 y suman 10 de vida",
        },
        gracioso: {
          pide: "¿Cuántas manzanas se comió Rodolfo?",
          codigo: "sql(\"\"\"\n    CREATE TABLE comidas (\n        dia TEXT,\n        manzanas INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO comidas (dia, manzanas)\n    VALUES\n        ('lunes', 3),\n        ('martes', 5),\n        ('miércoles', 12)\n\"\"\")\n\ncomidas = sql(\"\"\"\n    SELECT *\n    FROM comidas\n\"\"\")\ntotal = 0\nfor comida in comidas:\n    total = total + comida[\"manzanas\"]\nprint(\"Rodolfo se comió\", total, \"manzanas. Dice que fue el creeper.\")",
          sale: "Rodolfo se comió 20 manzanas. Dice que fue el creeper.",
        },
      },
    ],
  },

  // ══ Semana 13 · Dragón Rojo · buscar, actualizar y borrar con sql() ══════
  {
    numero: 25, semana: 13, dia: 1, bossId: 'dragon-rojo', lang: 'python',
    temas: [
      {
        titulo: "buscar(): WHERE con una variable",
        ataques: ["c13-j1"],
        arena: ["Buscar en el tesoro"],
        ejemplo: {
          pide: "La variable entra al `WHERE` con f-string. Si no encuentra nada, `sql()` devuelve una lista vacía y `len()` da 0: así sabés si está o no.",
          codigo: "cargar_ejemplo(\"cofre\")\n\ndef buscar(nombre):\n    encontrados = sql(f\"\"\"\n        SELECT *\n        FROM cofre\n        WHERE nombre = '{nombre}'\n    \"\"\")\n    if len(encontrados) > 0:\n        item = encontrados[0]\n        print(\"Hay\", item[\"cantidad\"], \"de\", nombre)\n    else:\n        print(\"No hay\", nombre)\n\nbuscar(\"Oro\")\nbuscar(\"Esmeralda\")",
          sale: "Hay 7 de Oro\nNo hay Esmeralda",
        },
        guiado: {
          pide: "El radar de mobs: completá la columna del `WHERE` y la comparación.",
          codigo: "cargar_ejemplo(\"mobs\")\n\ndef buscar(nombre):\n    encontrados = sql(f\"\"\"\n        SELECT *\n        FROM mobs\n        WHERE ___ = '{nombre}'\n    \"\"\")\n    if len(encontrados) ___ 0:\n        print(\"¡Cuidado! Hay un\", nombre)\n    else:\n        print(\"No hay ningún\", nombre)\n\nbuscar(\"Creeper\")\nbuscar(\"Dragón\")",
          respuestas: ["nombre", ">"],
          sale: "¡Cuidado! Hay un Creeper\nNo hay ningún Dragón",
        },
        desafio: {
          pide: "Preguntá con `input()` qué ítem buscar en el `cofre` y decí cuántos hay, o que no hay. (Si escribís Oro, dice `Hay 7 de Oro`.)",
          codigo: "cargar_ejemplo(\"cofre\")\n\n# Tu input, tu buscar y el if\n",
          solucion: "cargar_ejemplo(\"cofre\")\n\ndef buscar(nombre):\n    encontrados = sql(f\"\"\"\n        SELECT *\n        FROM cofre\n        WHERE nombre = '{nombre}'\n    \"\"\")\n    if len(encontrados) > 0:\n        print(\"Hay\", encontrados[0][\"cantidad\"], \"de\", nombre)\n    else:\n        print(\"No hay\", nombre)\n\nque = input(\"¿Qué buscás? \")\nbuscar(que)",
          sale: "Hay 7 de Oro",
        },
        gracioso: {
          pide: "El olfato de Rodolfo.",
          codigo: "cargar_ejemplo(\"cofre\")\n\ndef buscar(nombre):\n    encontrados = sql(f\"\"\"\n        SELECT *\n        FROM cofre\n        WHERE nombre = '{nombre}'\n    \"\"\")\n    if len(encontrados) > 0:\n        print(nombre, \"encontrado. Rodolfo lo olfateó.\")\n    else:\n        print(nombre, \"no está. Rodolfo se lo comió.\")\n\nbuscar(\"Diamante\")\nbuscar(\"Pastel\")",
          sale: "Diamante encontrado. Rodolfo lo olfateó.\nPastel no está. Rodolfo se lo comió.",
        },
      },
      {
        titulo: "UPDATE: cambiar lo que ya está",
        ataques: ["c13-j3"],
        arena: ["Actualizar el botín"],
        ejemplo: {
          pide: "`UPDATE` cambia un valor que ya está. `vida - 2` le resta 2 a lo que tenía. ¡Sin `WHERE` cambia a todos!",
          codigo: "cargar_ejemplo(\"mobs\")\n\nsql(\"\"\"\n    UPDATE mobs\n    SET vida = vida - 2\n    WHERE nombre = 'Creeper'\n\"\"\")\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n\"\"\")\nfor mob in mobs:\n    print(mob[\"nombre\"], mob[\"vida\"])",
          sale: "Zombie 4\nCreeper 4\nEsqueleto 3",
        },
        guiado: {
          pide: "Sumale 10 al `'Oro'` del cofre.",
          codigo: "cargar_ejemplo(\"cofre\")\n\nsql(\"\"\"\n    UPDATE cofre\n    SET cantidad = cantidad ___ 10\n    WHERE nombre = ___\n\"\"\")\n\noro = sql(\"\"\"\n    SELECT *\n    FROM cofre\n    WHERE nombre = 'Oro'\n\"\"\")\nprint(\"Ahora hay\", oro[0][\"cantidad\"], \"de oro\")",
          respuestas: ["+", "'Oro'"],
          sale: "Ahora hay 17 de oro",
        },
        desafio: {
          pide: "Escribí `curar(nombre, puntos)` que le sume vida a un mob. Curá al Esqueleto con 5 y mostrá todos de mayor a menor vida.",
          codigo: "cargar_ejemplo(\"mobs\")\n\n# Tu función curar, la llamada y el listado\n",
          solucion: "cargar_ejemplo(\"mobs\")\n\ndef curar(nombre, puntos):\n    sql(f\"\"\"\n        UPDATE mobs\n        SET vida = vida + {puntos}\n        WHERE nombre = '{nombre}'\n    \"\"\")\n\ncurar(\"Esqueleto\", 5)\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    ORDER BY vida DESC\n\"\"\")\nfor mob in mobs:\n    print(mob[\"nombre\"], mob[\"vida\"])",
          sale: "Esqueleto 8\nCreeper 6\nZombie 4",
        },
        gracioso: {
          pide: "Rodolfo se olvidó el `WHERE`.",
          codigo: "sql(\"\"\"\n    CREATE TABLE rodolfo (\n        cosa TEXT,\n        valor INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO rodolfo (cosa, valor)\n    VALUES\n        ('peso', 20),\n        ('siestas', 3)\n\"\"\")\n\nsql(\"\"\"\n    UPDATE rodolfo\n    SET valor = valor * 2\n\"\"\")\n\ndatos = sql(\"\"\"\n    SELECT *\n    FROM rodolfo\n\"\"\")\nfor dato in datos:\n    print(dato[\"cosa\"], dato[\"valor\"])\nprint(\"Rodolfo se olvidó el WHERE y duplicó todo.\")",
          sale: "peso 40\nsiestas 6\nRodolfo se olvidó el WHERE y duplicó todo.",
        },
      },
    ],
  },
  {
    numero: 26, semana: 13, dia: 2, bossId: 'dragon-rojo', lang: 'python',
    temas: [
      {
        titulo: "DELETE: llevarse algo y ver lo que queda",
        ataques: ["c13-j2"],
        ejemplo: {
          pide: "`DELETE` borra las filas que cumplen el `WHERE`. Después, un `SELECT` muestra lo que quedó.",
          codigo: "cargar_ejemplo(\"mobs\")\n\nsql(\"\"\"\n    DELETE FROM mobs\n    WHERE nombre = 'Zombie'\n\"\"\")\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n\"\"\")\nprint(\"Quedan\", len(mobs), \"mobs\")\nfor mob in mobs:\n    print(\"-\", mob[\"nombre\"])",
          sale: "Quedan 2 mobs\n- Creeper\n- Esqueleto",
        },
        guiado: {
          pide: "Sacá el `'Hierro'` del cofre y contá lo que queda.",
          codigo: "cargar_ejemplo(\"cofre\")\n\nsql(\"\"\"\n    DELETE FROM ___\n    WHERE nombre = ___\n\"\"\")\n\ncofre = sql(\"\"\"\n    SELECT *\n    FROM cofre\n\"\"\")\nprint(\"Quedan\", len(___), \"cosas en el cofre\")",
          respuestas: ["cofre", "'Hierro'", "cofre"],
          sale: "Quedan 2 cosas en el cofre",
        },
        desafio: {
          pide: "Escribí `quitar(nombre)` que pregunte con `input()` si estás seguro antes de borrar. Quitá al Creeper (contestando `si`) y decí cuántos mobs quedan.",
          codigo: "cargar_ejemplo(\"mobs\")\n\n# Tu función quitar con la pregunta, la llamada y el conteo\n",
          solucion: "cargar_ejemplo(\"mobs\")\n\ndef quitar(nombre):\n    respuesta = input(\"¿Seguro que querés borrar a \" + nombre + \"? (si/no) \")\n    if respuesta == \"si\":\n        sql(f\"\"\"\n            DELETE FROM mobs\n            WHERE nombre = '{nombre}'\n        \"\"\")\n        print(nombre, \"borrado\")\n    else:\n        print(\"No se borró nada\")\n\nquitar(\"Creeper\")\n\nmobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n\"\"\")\nprint(\"Quedan\", len(mobs), \"mobs\")",
          sale: "Creeper borrado\nQuedan 2 mobs",
        },
        gracioso: {
          pide: "Borrar algo que no existe: SQL no se queja.",
          codigo: "cargar_ejemplo(\"cofre\")\n\nsql(\"\"\"\n    DELETE FROM cofre\n    WHERE nombre = 'Pastel'\n\"\"\")\n\ncofre = sql(\"\"\"\n    SELECT *\n    FROM cofre\n\"\"\")\nprint(\"Quedan\", len(cofre), \"cosas. Rodolfo sigue buscando el pastel.\")",
          sale: "Quedan 3 cosas. Rodolfo sigue buscando el pastel.",
        },
      },
    ],
  },

  // ══ Semana 14 · El Arquitecto · el examen: un eco por cada parte del viaje ═
  {
    numero: 27, semana: 14, dia: 1, bossId: 'el-arquitecto', lang: 'python',
    temas: [
      {
        titulo: "Eco del Acto I: for, if y un contador",
        ataques: ["c14-j1"],
        ejemplo: {
          pide: "El Arquitecto repasa todo el viaje, un ataque por parte. Primero el Acto I: una lista, un `for`, un `if` y un contador que arranca en 0.",
          codigo: "mochila = [\"Espada\", \"Manzana\", \"Antorcha\", \"Manzana\"]\n\nmanzanas = 0\nfor cosa in mochila:\n    if cosa == \"Manzana\":\n        manzanas = manzanas + 1\n\nprint(\"Tenés\", manzanas, \"manzanas\")",
          sale: "Tenés 2 manzanas",
        },
        guiado: {
          pide: "Contá los creepers. Si hay 3 o más, ¡corré!",
          codigo: "mobs = [\"Zombie\", \"Creeper\", \"Esqueleto\", \"Creeper\", \"Creeper\"]\n\ncreepers = 0\nfor mob in mobs:\n    if mob ___ \"Creeper\":\n        creepers = creepers ___ 1\n\nprint(\"Hay\", creepers, \"creepers\")\nif creepers >= 3:\n    print(\"¡Corré!\")",
          respuestas: ["==", "+"],
          sale: "Hay 3 creepers\n¡Corré!",
        },
        desafio: {
          pide: "Contá cuántos 6 salieron en `dados` y, si salió al menos uno, imprimí `¡Ganaste!`.",
          codigo: "dados = [3, 6, 1, 6, 2]\n\n# Tu contador, el for, el if y los print\n",
          solucion: "dados = [3, 6, 1, 6, 2]\n\nseis = 0\nfor dado in dados:\n    if dado == 6:\n        seis = seis + 1\n\nprint(\"Salieron\", seis, \"seis\")\nif seis >= 1:\n    print(\"¡Ganaste!\")",
          sale: "Salieron 2 seis\n¡Ganaste!",
        },
        gracioso: {
          pide: "El diario de Rodolfo.",
          codigo: "dia = [\"siesta\", \"juego\", \"siesta\", \"siesta\"]\n\nsiestas = 0\njuegos = 0\nfor cosa in dia:\n    if cosa == \"siesta\":\n        siestas = siestas + 1\n    else:\n        juegos = juegos + 1\n\nprint(\"Rodolfo durmió\", siestas, \"siestas y jugó\", juegos, \"vez.\")",
          sale: "Rodolfo durmió 3 siestas y jugó 1 vez.",
        },
      },
      {
        titulo: "Eco del Acto II: el SQL de siempre adentro de sql()",
        ataques: ["c14-j2"],
        ejemplo: {
          pide: "Todo el SQL del Acto II (`WHERE`, `ORDER BY`) se escribe igual adentro de `sql()`. Python solo recorre lo que vuelve.",
          codigo: "cargar_ejemplo(\"mobs\")\n\nfuertes = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    WHERE vida > 3\n    ORDER BY vida DESC\n\"\"\")\nfor mob in fuertes:\n    print(mob[\"nombre\"], mob[\"vida\"])",
          sale: "Creeper 6\nZombie 4",
        },
        guiado: {
          pide: "Escribí la condición entera del `WHERE`: los ítems con menos de 7. Y ordená de mayor a menor.",
          codigo: "cargar_ejemplo(\"cofre\")\n\npocos = sql(\"\"\"\n    SELECT *\n    FROM cofre\n    WHERE ___\n    ORDER BY cantidad ___\n\"\"\")\nfor item in pocos:\n    print(item[\"nombre\"], item[\"cantidad\"])",
          respuestas: ["cantidad < 7", "DESC"],
          sale: "Diamante 5\nHierro 3",
        },
        desafio: {
          pide: "Creá `monstruos (nombre, hp)` con Creeper 20, Zombie 22, Araña 16 y Esqueleto 27. Mostrá los de 20 o más, del más fuerte al más débil.",
          codigo: "# Tu CREATE TABLE, tu INSERT, el SELECT y el for\n",
          solucion: "sql(\"\"\"\n    CREATE TABLE monstruos (\n        nombre TEXT,\n        hp INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO monstruos (nombre, hp)\n    VALUES\n        ('Creeper', 20),\n        ('Zombie', 22),\n        ('Araña', 16),\n        ('Esqueleto', 27)\n\"\"\")\n\nfuertes = sql(\"\"\"\n    SELECT *\n    FROM monstruos\n    WHERE hp >= 20\n    ORDER BY hp DESC\n\"\"\")\nfor monstruo in fuertes:\n    print(monstruo[\"nombre\"], monstruo[\"hp\"])",
          sale: "Esqueleto 27\nZombie 22\nCreeper 20",
        },
        gracioso: {
          pide: "El Oráculo busca a Rodolfo.",
          codigo: "cargar_ejemplo(\"mobs\")\n\nrodolfos = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    WHERE nombre = 'Rodolfo'\n\"\"\")\nprint(\"El Oráculo encontró\", len(rodolfos), \"Rodolfos. Se escondió en el barro.\")",
          sale: "El Oráculo encontró 0 Rodolfos. Se escondió en el barro.",
        },
      },
    ],
  },
  {
    numero: 28, semana: 14, dia: 2, bossId: 'el-arquitecto', lang: 'python',
    temas: [
      {
        titulo: "La fábrica y el taller de cartas",
        ataques: ["c14-j3", "c14-j4"],
        ejemplo: {
          pide: "Fabricar con `agregar()`, arreglar con `UPDATE` la carta que pasa el tope y listar. Es lo mismo que hacen con su mazo en Mi Reino.",
          codigo: "sql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\n\ndef agregar(nombre, poder):\n    sql(f\"\"\"\n        INSERT INTO cartas (nombre, poder)\n        VALUES\n            ('{nombre}', {poder})\n    \"\"\")\n\nagregar(\"Gato ninja\", 8)\nagregar(\"Dragón de papel\", 3)\n\nsql(\"\"\"\n    UPDATE cartas\n    SET poder = 6\n    WHERE poder > 6\n\"\"\")\n\ncartas = sql(\"\"\"\n    SELECT *\n    FROM cartas\n    ORDER BY poder DESC\n\"\"\")\nfor carta in cartas:\n    print(carta[\"nombre\"], carta[\"poder\"])",
          sale: "Gato ninja 6\nDragón de papel 3",
        },
        guiado: {
          pide: "Completá `agregar` y borrá la `'Carta fantasma'`.",
          codigo: "sql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\n\ndef agregar(nombre, poder):\n    sql(f\"\"\"\n        INSERT INTO cartas (nombre, poder)\n        VALUES\n            ('{___}', {___})\n    \"\"\")\n\nagregar(\"Robot tostadora\", 5)\nagregar(\"Carta fantasma\", 0)\nagregar(\"Pulpo DJ\", 4)\n\nsql(\"\"\"\n    DELETE FROM cartas\n    WHERE nombre = ___\n\"\"\")\n\ncartas = sql(\"\"\"\n    SELECT *\n    FROM cartas\n\"\"\")\nprint(\"Quedan\", len(cartas), \"cartas\")",
          respuestas: ["nombre", "poder", "'Carta fantasma'"],
          sale: "Quedan 2 cartas",
        },
        desafio: {
          pide: "Escribí `arreglar(tope)` que baje a `tope` toda carta que lo pase. Probala con tope 5 y listá por nombre.",
          codigo: "sql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cartas (nombre, poder)\n    VALUES\n        ('Gato ninja', 8),\n        ('Robot tostadora', 5),\n        ('Pulpo DJ', 4),\n        ('Dragón de papel', 3)\n\"\"\")\n\n# Tu función arreglar, la llamada y el listado\n",
          solucion: "sql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cartas (nombre, poder)\n    VALUES\n        ('Gato ninja', 8),\n        ('Robot tostadora', 5),\n        ('Pulpo DJ', 4),\n        ('Dragón de papel', 3)\n\"\"\")\n\ndef arreglar(tope):\n    sql(f\"\"\"\n        UPDATE cartas\n        SET poder = {tope}\n        WHERE poder > {tope}\n    \"\"\")\n\narreglar(5)\n\ncartas = sql(\"\"\"\n    SELECT *\n    FROM cartas\n    ORDER BY nombre\n\"\"\")\nfor carta in cartas:\n    print(carta[\"nombre\"], carta[\"poder\"])",
          sale: "Dragón de papel 3\nGato ninja 5\nPulpo DJ 4\nRobot tostadora 5",
        },
        gracioso: {
          pide: "El Arquitecto borra sin `WHERE`.",
          codigo: "sql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cartas (nombre, poder)\n    VALUES\n        ('Gato ninja', 6),\n        ('Pulpo DJ', 4)\n\"\"\")\n\nsql(\"\"\"\n    DELETE FROM cartas\n\"\"\")\n\ncartas = sql(\"\"\"\n    SELECT *\n    FROM cartas\n\"\"\")\nprint(\"Quedan\", len(cartas), \"cartas. Por eso siempre va un WHERE.\")",
          sale: "Quedan 0 cartas. Por eso siempre va un WHERE.",
        },
      },
      {
        titulo: "Tu carta contra la mía",
        ataques: ["c14-j5"],
        ejemplo: {
          pide: "Una función que devuelve cómo se ve una carta, como el paso 7 del proyecto. Con `ORDER BY poder DESC`, `mazo[0]` es la más fuerte.",
          codigo: "sql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cartas (nombre, poder)\n    VALUES\n        ('Gato ninja', 6),\n        ('Dragón de papel', 3)\n\"\"\")\n\ndef carta(fila):\n    barra = \"#\" * fila[\"poder\"]\n    return \"| \" + fila[\"nombre\"] + \" \" + barra\n\nmazo = sql(\"\"\"\n    SELECT *\n    FROM cartas\n    ORDER BY poder DESC\n\"\"\")\nfor fila in mazo:\n    print(carta(fila))\nprint(\"La más fuerte:\", mazo[0][\"nombre\"])",
          sale: "| Gato ninja ######\n| Dragón de papel ###\nLa más fuerte: Gato ninja",
        },
        guiado: {
          pide: "Dibujá el mob más fuerte. ¿Le gana al Arquitecto (poder 5)?",
          codigo: "cargar_ejemplo(\"mobs\")\n\ndef carta(fila):\n    barra = \"#\" * fila[\"___\"]\n    return \"| \" + fila[\"nombre\"] + \" \" + barra\n\nmazo = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    ORDER BY vida DESC\n\"\"\")\nmejor = mazo[0]\n\nprint(carta(mejor))\nif mejor[\"vida\"] ___ 5:\n    print(\"¡Le gana al Arquitecto!\")",
          respuestas: ["vida", ">"],
          sale: "| Creeper ######\n¡Le gana al Arquitecto!",
        },
        desafio: {
          pide: "Batalla: compará la carta más fuerte de `mio` con la más fuerte de `rival` e imprimí quién gana.",
          codigo: "sql(\"\"\"\n    CREATE TABLE mio (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO mio (nombre, poder)\n    VALUES\n        ('Gato ninja', 6),\n        ('Pulpo DJ', 4)\n\"\"\")\nsql(\"\"\"\n    CREATE TABLE rival (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO rival (nombre, poder)\n    VALUES\n        ('Robot gris', 5),\n        ('Caja', 2)\n\"\"\")\n\n# Traé la más fuerte de cada mazo y decí quién gana\n",
          solucion: "sql(\"\"\"\n    CREATE TABLE mio (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO mio (nombre, poder)\n    VALUES\n        ('Gato ninja', 6),\n        ('Pulpo DJ', 4)\n\"\"\")\nsql(\"\"\"\n    CREATE TABLE rival (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO rival (nombre, poder)\n    VALUES\n        ('Robot gris', 5),\n        ('Caja', 2)\n\"\"\")\n\nmios = sql(\"\"\"\n    SELECT *\n    FROM mio\n    ORDER BY poder DESC\n\"\"\")\nrivales = sql(\"\"\"\n    SELECT *\n    FROM rival\n    ORDER BY poder DESC\n\"\"\")\n\nif mios[0][\"poder\"] > rivales[0][\"poder\"]:\n    print(\"Gana\", mios[0][\"nombre\"])\nelse:\n    print(\"Gana\", rivales[0][\"nombre\"])",
          sale: "Gana Gato ninja",
        },
        gracioso: {
          pide: "La carta de Rodolfo.",
          codigo: "def carta(fila):\n    barra = \"#\" * fila[\"poder\"]\n    return \"| \" + fila[\"nombre\"] + \" \" + barra\n\nrodolfo = {\"nombre\": \"Rodolfo\", \"poder\": 1}\nprint(carta(rodolfo))\nprint(\"Poder 1, pero mucho estilo.\")",
          sale: "| Rodolfo #\nPoder 1, pero mucho estilo.",
        },
      },
    ],
  },
]

export function getPlanClase(numero: number): PlanClase | undefined {
  return PLAN_CLASES.find((c) => c.numero === numero)
}

// ─── Ritmo intensivo: un jefe por clase, solo Junior ─────────────────────────
//
// Para cuando falta tiempo (taller de un mes): una clase por jefe. Entran solo
// los temas que preparan ataques JUNIOR del jefe — los temas que solo sirven
// para Trainee (and, acumular, sorted, ORDER BY, GROUP BY…) quedan afuera.
// Por tema: el docente muestra el ejemplo y el aula hace el guiado; cada jefe
// suma refuerzos con la misma forma de un ataque junior y otros datos, para
// llegar a 4 ejercicios antes de pelear.

export interface PlanIntensivoTema {
  /** Referencia al tema del libro de 28 clases. */
  clase: number
  tema: number
  /** Otro guiado igual a un ataque junior, con otros datos. */
  refuerzo?: PlanEjercicio
}

export interface PlanIntensivo {
  bossId: string
  temas: PlanIntensivoTema[]
}

export const PLAN_INTENSIVO: PlanIntensivo[] = [
  {
    bossId: 'creeper-formulario',
    temas: [
      { clase: 1, tema: 0 },
      { clase: 1, tema: 1 },
      {
        clase: 2, tema: 0,
        refuerzo: {
          pide: 'Completá con las variables de peso. Tiene que dar `7.0`.',
          codigo: 'flechas = 8\npeso_flecha = 0.25\nbloques = 2\npeso_bloque = 2.5\n\npeso_total = (flechas * ___) + (bloques * ___)\nprint(peso_total)',
          respuestas: ['peso_flecha', 'peso_bloque'],
          sale: '7.0',
        },
      },
    ],
  },
  {
    bossId: 'guardian-puerta',
    temas: [
      {
        clase: 3, tema: 0,
        refuerzo: {
          pide: 'Completá el `elif` para que con `bloque = "oro"` imprima `Bueno`.',
          codigo: 'bloque = "oro"\n\nif bloque == "diamante":\n    print("Excelente")\nelif bloque == ___:\n    print("Bueno")\nelse:\n    print("Básico")',
          respuestas: ['"oro"'],
          sale: 'Bueno',
        },
      },
      {
        clase: 3, tema: 1,
        refuerzo: {
          pide: 'Con `energia = 2` tiene que imprimir `¡Sin energía!`. ¿Qué número va?',
          codigo: 'energia = 2\n\nif energia <= ___:\n    print("¡Sin energía!")\nelif energia <= 8:\n    print("Un poco cansado")\nelse:\n    print("A full")',
          respuestas: ['3'],
          sale: '¡Sin energía!',
        },
      },
    ],
  },
  {
    bossId: 'golem-infinito',
    temas: [
      {
        clase: 5, tema: 0,
        refuerzo: {
          pide: 'Completá el `range()` para imprimir del 1 al 5.',
          codigo: 'for i in range(___, ___):\n    print(i)',
          respuestas: ['1', '6'],
          sale: '1\n2\n3\n4\n5',
        },
      },
      {
        clase: 5, tema: 1,
        refuerzo: {
          pide: '¿Cuánto baja la durabilidad en cada golpe? Tiene que hacer 4 golpes.',
          codigo: 'durabilidad = 4\n\nwhile durabilidad > 0:\n    print("Golpe! durabilidad:", durabilidad)\n    durabilidad = durabilidad - ___\n\nprint("¡Se rompió!")',
          respuestas: ['1'],
          sale: 'Golpe! durabilidad: 4\nGolpe! durabilidad: 3\nGolpe! durabilidad: 2\nGolpe! durabilidad: 1\n¡Se rompió!',
        },
      },
    ],
  },
  {
    bossId: 'mercader-abismo',
    temas: [
      { clase: 7, tema: 0 },
      { clase: 7, tema: 1 },
      {
        clase: 8, tema: 0,
        refuerzo: {
          pide: 'Completá el `for` para recorrer la lista e imprimir cada ítem.',
          codigo: 'cofre = ["Pico", "Hacha", "Pala"]\n\nfor item in ___:\n    print(item)',
          respuestas: ['cofre'],
          sale: 'Pico\nHacha\nPala',
        },
      },
    ],
  },
  {
    bossId: 'maestro-craftero',
    temas: [
      { clase: 9, tema: 0 },
      { clase: 9, tema: 1 },
      {
        clase: 10, tema: 0,
        refuerzo: {
          pide: 'Con nivel 5 o más es `espada`. Completá el número para que `mejor_arma(8)` dé `espada`.',
          codigo: 'def mejor_arma(nivel):\n    if nivel >= ___:\n        return "espada"\n    else:\n        return "palo"\n\nprint(mejor_arma(8))',
          respuestas: ['5'],
          sale: 'espada',
        },
      },
    ],
  },
  {
    bossId: 'archivista',
    temas: [
      {
        clase: 11, tema: 0,
        refuerzo: {
          pide: 'Completá la clave para imprimir el material.',
          codigo: 'item = {"id": 2, "nombre": "Pico", "material": "hierro"}\n\nprint(item[___])',
          respuestas: ['"material"'],
          sale: 'hierro',
        },
      },
      {
        clase: 11, tema: 1,
        refuerzo: {
          pide: 'Completá la clave para imprimir el nombre de cada fila.',
          codigo: 'inventario = [\n    {"id": 1, "nombre": "Pan"},\n    {"id": 2, "nombre": "Leche"},\n    {"id": 3, "nombre": "Torta"},\n]\n\nfor item in inventario:\n    print(item[___])',
          respuestas: ['"nombre"'],
          sale: 'Pan\nLeche\nTorta',
        },
      },
    ],
  },
  {
    bossId: 'constructor-vacio',
    temas: [
      {
        clase: 13, tema: 0,
        refuerzo: {
          pide: 'La tabla tiene que llamarse `items`.',
          codigo: "CREATE TABLE ___ (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT\n);\nINSERT INTO items VALUES (1, 'Espada');\nSELECT * FROM items;",
          respuestas: ['items'],
          sale: '1|Espada',
        },
      },
      { clase: 13, tema: 1 },
      { clase: 14, tema: 0 },
    ],
  },
  {
    bossId: 'oraculo-oscuro',
    temas: [
      {
        clase: 15, tema: 0,
        refuerzo: {
          pide: 'Traé solo la columna `nombre`.',
          tabla: COFRE_ORACULO,
          codigo: 'SELECT ___\nFROM cofre;',
          respuestas: ['nombre'],
          sale: 'Espada\nAntorcha\nPico\nManzana\nFlecha',
        },
      },
      {
        clase: 15, tema: 1,
        refuerzo: {
          pide: 'Traé el nombre del ítem con `id` 4.',
          tabla: COFRE_ORACULO,
          codigo: 'SELECT nombre\nFROM cofre\nWHERE id = ___;',
          respuestas: ['4'],
          sale: 'Manzana',
        },
      },
    ],
  },
  {
    bossId: 'contador-almas',
    temas: [
      {
        clase: 17, tema: 0,
        refuerzo: {
          pide: 'Contá cuántos monstruos hay en total.',
          tabla: MONSTRUOS,
          codigo: 'SELECT ___(*)\nFROM monstruos;',
          respuestas: ['COUNT'],
          sale: '6',
        },
      },
      {
        clase: 17, tema: 1,
        refuerzo: {
          pide: 'Sumá el `hp` de todo el ejército.',
          tabla: MONSTRUOS,
          codigo: 'SELECT ___(hp)\nFROM monstruos;',
          respuestas: ['SUM'],
          sale: '129',
        },
      },
    ],
  },
  {
    bossId: 'falsificador',
    temas: [
      {
        clase: 19, tema: 0,
        refuerzo: {
          pide: "Que la 'Espada' pase a ser de 'oro'.",
          tabla: COFRE_FALSO,
          codigo: 'UPDATE cofre\nSET material = ___\nWHERE nombre = ___;\nSELECT nombre, material FROM cofre;',
          respuestas: ["'oro'", "'Espada'"],
          sale: 'Espada|oro\nPico|hierro\nFlecha|madera\nTronco|madera\nPoción|vidrio',
        },
      },
      {
        clase: 19, tema: 1,
        refuerzo: {
          pide: "Borrá la 'Flecha'.",
          tabla: COFRE_FALSO,
          codigo: 'DELETE FROM cofre\nWHERE nombre = ___;\nSELECT nombre FROM cofre;',
          respuestas: ["'Flecha'"],
          sale: 'Espada\nPico\nTronco\nPoción',
        },
      },
    ],
  },
  {
    bossId: 'el-nexo',
    temas: [
      { clase: 21, tema: 0 },
      { clase: 21, tema: 1 },
      {
        clase: 22, tema: 0,
        refuerzo: {
          pide: "Los ítems con menos de 7: completá la comparación del `WHERE`.",
          codigo: "cargar_ejemplo(\"cofre\")\n\npocos = sql(\"\"\"\n    SELECT *\n    FROM cofre\n    WHERE cantidad ___ 7\n\"\"\")\nprint(\"Hay\", len(pocos), \"ítems con menos de 7\")\nfor item in pocos:\n    print(\"·\", item[\"nombre\"])",
          respuestas: ["<"],
          sale: "Hay 2 ítems con menos de 7\n· Diamante\n· Hierro",
        },
      },
    ],
  },
  {
    bossId: 'la-hydra',
    temas: [
      { clase: 23, tema: 0 },
      {
        clase: 23, tema: 1,
        refuerzo: {
          pide: "Listá los mobs de la A a la Z: ¿por qué columna ordenás?",
          codigo: "cargar_ejemplo(\"mobs\")\n\ndef listar():\n    mobs = sql(\"\"\"\n        SELECT *\n        FROM mobs\n        ORDER BY ___\n    \"\"\")\n    for mob in mobs:\n        print(mob[\"nombre\"])\n\nlistar()",
          respuestas: ["nombre"],
          sale: "Creeper\nEsqueleto\nZombie",
        },
      },
      { clase: 24, tema: 0 },
    ],
  },
  {
    bossId: 'dragon-rojo',
    temas: [
      {
        clase: 25, tema: 0,
        refuerzo: {
          pide: "La función ya está escrita: llamala para buscar el `\"Diamante\"`.",
          codigo: "cargar_ejemplo(\"cofre\")\n\ndef buscar(nombre):\n    encontrados = sql(f\"\"\"\n        SELECT *\n        FROM cofre\n        WHERE nombre = '{nombre}'\n    \"\"\")\n    if len(encontrados) > 0:\n        print(\"Encontrado:\", nombre)\n    else:\n        print(\"No encontrado:\", nombre)\n\nbuscar(___)",
          respuestas: ["\"Diamante\""],
          sale: "Encontrado: Diamante",
        },
      },
      { clase: 25, tema: 1 },
      { clase: 26, tema: 0 },
    ],
  },
  {
    bossId: 'el-arquitecto',
    temas: [
      { clase: 27, tema: 0 },
      { clase: 27, tema: 1 },
      {
        clase: 28, tema: 0,
        refuerzo: {
          pide: "Arreglá la carta rota: el `Gato ninja` tiene 9 y el tope es 6.",
          codigo: "sql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cartas (nombre, poder)\n    VALUES\n        ('Gato ninja', 9),\n        ('Pulpo DJ', 4)\n\"\"\")\n\nsql(\"\"\"\n    UPDATE cartas\n    SET poder = ___\n    WHERE nombre = ___\n\"\"\")\n\ncartas = sql(\"\"\"\n    SELECT *\n    FROM cartas\n    ORDER BY poder DESC\n\"\"\")\nfor carta in cartas:\n    print(carta[\"nombre\"], carta[\"poder\"])",
          respuestas: ["6", "'Gato ninja'"],
          sale: "Gato ninja 6\nPulpo DJ 4",
        },
      },
      { clase: 28, tema: 1 },
    ],
  },
]

export function getPlanIntensivo(bossId: string): PlanIntensivo | undefined {
  return PLAN_INTENSIVO.find((p) => p.bossId === bossId)
}
