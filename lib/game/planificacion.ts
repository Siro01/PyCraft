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
          codigo: "UPDATE cofre\nSET nombre = 'Espada de cartón'\nWHERE id = 1;\nSELECT nombre FROM cofre WHERE id = 1;",
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
      solucion: "UPDATE cofre\nSET cantidad = cantidad + 10\nWHERE nombre = 'Flecha';\nSELECT cantidad FROM cofre WHERE nombre = 'Flecha';",
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

  // ══ Semana 11 · El Nexo · Python + sqlite3 ═════════════════════════════════
  {
    numero: 21, semana: 11, dia: 1, bossId: 'el-nexo', lang: 'python',
    temas: [
      {
        titulo: 'Conectar, crear y cerrar',
        ataques: ['c11-j1'],
        ejemplo: {
          pide: '`connect` abre la base, `cursor` es el que ejecuta, `commit` guarda y `close` cierra.',
          codigo: db('cursor.execute("CREATE TABLE mascotas (nombre TEXT)")\nconn.commit()\nprint("Tabla creada")'),
          sale: 'Tabla creada',
        },
        guiado: {
          pide: 'Completá las dos funciones de conexión y el nombre de la tabla `items`.',
          codigo: 'import sqlite3\n\nconn = sqlite3.___(":memory:")\ncursor = conn.___()\n\ncursor.execute("CREATE TABLE ___ (nombre TEXT)")\nconn.commit()\n\nprint("Listo")\nconn.close()',
          respuestas: ['connect', 'cursor', 'items'],
          sale: 'Listo',
        },
        desafio: {
          pide: 'Desde cero: conectá a `":memory:"`, creá `monstruos (nombre TEXT, tipo TEXT)`, hacé `commit`, imprimí `Base lista` y cerrá.',
          codigo: 'import sqlite3\n\n# Tu conexión, la tabla y el print',
          solucion: db('cursor.execute("CREATE TABLE monstruos (nombre TEXT, tipo TEXT)")\nconn.commit()\nprint("Base lista")'),
          sale: 'Base lista',
        },
        gracioso: {
          pide: 'Una tabla ultra secreta.',
          codigo: db('cursor.execute("CREATE TABLE secretos_de_rodolfo (secreto TEXT)")\nconn.commit()\nprint("Shhh... tabla creada")'),
          sale: 'Shhh... tabla creada',
        },
      },
      {
        titulo: 'INSERT con ? y tuplas · executemany()',
        ataques: ['c11-j2', 'c11-t1', 'c11-t2'],
        arena: ['El segundo ítem', 'Contar desde Python'],
        ejemplo: {
          pide: 'Cada `?` se llena con un valor de la tupla, en orden. `fetchone()[0]` lee el número del `COUNT`.',
          codigo: db('cursor.execute("CREATE TABLE items (nombre TEXT, cantidad INTEGER)")\n\ncursor.execute("INSERT INTO items VALUES (?, ?)", ("Pan", 3))\ncursor.execute("INSERT INTO items VALUES (?, ?)", ("Leche", 1))\nconn.commit()\n\ncursor.execute("SELECT COUNT(*) FROM items")\nprint(cursor.fetchone()[0])'),
          sale: '2',
        },
        guiado: {
          pide: 'Insertá "Escudo" igual que la línea de arriba: tupla de un solo elemento, con la coma.',
          codigo: db('cursor.execute("CREATE TABLE items (nombre TEXT)")\n\ncursor.execute("INSERT INTO items VALUES (?)", ("Espada",))\ncursor.execute("INSERT INTO items VALUES (?)", ___)\nconn.commit()\n\ncursor.execute("SELECT COUNT(*) FROM items")\nprint(cursor.fetchone()[0])'),
          respuestas: ['("Escudo",)'],
          sale: '2',
        },
        desafio: {
          pide: 'Insertá toda la lista `datos` de una vez con `executemany()` y mostrá cuántas filas quedaron.',
          codigo: db('cursor.execute("CREATE TABLE monstruos (nombre TEXT, tipo TEXT)")\n\ndatos = [("Creeper", "explosivo"), ("Zombie", "no muerto"), ("Araña", "trepadora"), ("Bruja", "mágica")]\n\n# Tu executemany y el COUNT(*) acá\n'),
          solucion: db('cursor.execute("CREATE TABLE monstruos (nombre TEXT, tipo TEXT)")\n\ndatos = [("Creeper", "explosivo"), ("Zombie", "no muerto"), ("Araña", "trepadora"), ("Bruja", "mágica")]\n\ncursor.executemany("INSERT INTO monstruos VALUES (?, ?)", datos)\nconn.commit()\n\ncursor.execute("SELECT COUNT(*) FROM monstruos")\nprint(cursor.fetchone()[0])'),
          sale: '4',
        },
        gracioso: {
          pide: 'El libro de quejas contra los creepers.',
          codigo: db('cursor.execute("CREATE TABLE quejas (texto TEXT)")\n\nquejas = [("me explotó la casa",), ("otra vez",), ("y otra vez",)]\ncursor.executemany("INSERT INTO quejas VALUES (?)", quejas)\nconn.commit()\n\ncursor.execute("SELECT COUNT(*) FROM quejas")\nprint(f"Quejas contra los creepers: {cursor.fetchone()[0]}")'),
          sale: 'Quejas contra los creepers: 3',
        },
      },
    ],
  },
  {
    numero: 22, semana: 11, dia: 2, bossId: 'el-nexo', lang: 'python',
    temas: [
      {
        titulo: 'Leer: fetchone(), fetchall() y consultas con ?',
        ataques: ['c11-j3', 'c11-t3'],
        arena: ['La columna justa'],
        ejemplo: {
          pide: 'Cada fila es una tupla: `fila[0]` es la primera columna. `fetchall()` trae todas para recorrerlas con `for`.',
          codigo: db('cursor.execute("CREATE TABLE items (nombre TEXT, cantidad INTEGER)")\ncursor.executemany("INSERT INTO items VALUES (?, ?)", [("Pan", 3), ("Leche", 1)])\nconn.commit()\n\ncursor.execute("SELECT nombre, cantidad FROM items")\nfila = cursor.fetchone()\nprint(fila[0])\nprint(fila[1])\n\ncursor.execute("SELECT nombre FROM items")\nfor row in cursor.fetchall():\n    print(row[0])'),
          sale: 'Pan\n3\nPan\nLeche',
        },
        guiado: {
          pide: 'La fila es `(nombre, cantidad)`. Imprimí solo la cantidad: ¿qué índice tiene?',
          codigo: db('cursor.execute("CREATE TABLE items (nombre TEXT, cantidad INTEGER)")\ncursor.execute("INSERT INTO items VALUES (?, ?)", ("Flecha", 64))\nconn.commit()\n\ncursor.execute("SELECT nombre, cantidad FROM items")\nfila = cursor.fetchone()\nprint(fila[___])'),
          respuestas: ['1'],
          sale: '64',
        },
        desafio: {
          pide: 'Buscá con una consulta con `?` los ítems de `material_buscado` e imprimí sus nombres con un `for`.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, material TEXT)")\nitems = [("Arco", "madera"), ("Pico", "hierro"), ("Flecha", "madera")]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", items)\n\nmaterial_buscado = "madera"\n# SELECT ... WHERE material = ? y un for con fetchall()\n'),
          solucion: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, material TEXT)")\nitems = [("Arco", "madera"), ("Pico", "hierro"), ("Flecha", "madera")]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", items)\n\nmaterial_buscado = "madera"\ncursor.execute("SELECT nombre FROM inventario WHERE material = ?", (material_buscado,))\nfor row in cursor.fetchall():\n    print(row[0])'),
          sale: 'Arco\nFlecha',
        },
        gracioso: {
          pide: 'La base de datos de chistes malos.',
          codigo: db('cursor.execute("CREATE TABLE chistes (texto TEXT)")\ncursor.execute("INSERT INTO chistes VALUES (?)", ("¿Qué le dijo un bloque a otro? Nada, los bloques no hablan.",))\nconn.commit()\n\ncursor.execute("SELECT texto FROM chistes")\nprint(cursor.fetchone()[0])'),
          sale: '¿Qué le dijo un bloque a otro? Nada, los bloques no hablan.',
        },
      },
    ],
  },

  // ══ Semana 12 · La Hydra · agregar y listar ════════════════════════════════
  {
    numero: 23, semana: 12, dia: 1, bossId: 'la-hydra', lang: 'python',
    temas: [
      {
        titulo: 'Funciones que guardan: agregar()',
        ataques: ['c12-j1', 'c12-t1'],
        arena: ['Cortar cabezas'],
        ejemplo: {
          pide: 'El `INSERT` va adentro de una función: la llamás y guarda. El parámetro va en una tupla `(nombre,)`.',
          codigo: db('cursor.execute("CREATE TABLE cabezas (nombre TEXT)")\n\ndef agregar(nombre):\n    cursor.execute("INSERT INTO cabezas VALUES (?)", (nombre,))\n    conn.commit()\n\nagregar("Cabeza 1")\nagregar("Cabeza 2")\n\ncursor.execute("SELECT COUNT(*) FROM cabezas")\nprint(cursor.fetchone()[0])'),
          sale: '2',
        },
        guiado: {
          pide: 'Completá la tupla del `INSERT` adentro de `agregar`.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT)")\n\ndef agregar(nombre):\n    cursor.execute("INSERT INTO inventario VALUES (?)", ___)\n    conn.commit()\n\nagregar("Pan")\nagregar("Torta")\nagregar("Galleta")\n\ncursor.execute("SELECT COUNT(*) FROM inventario")\nprint(cursor.fetchone()[0])'),
          respuestas: ['(nombre,)'],
          sale: '3',
        },
        desafio: {
          pide: 'Escribí `agregar_item(nombre, cantidad)` que inserte en `inventario`. Agregá "Arco" 1 y "Flecha" 32 y mostrá cuántas filas hay.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\n\n# Tu función, las dos llamadas y el COUNT\n'),
          solucion: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\n\ndef agregar_item(nombre, cantidad):\n    cursor.execute("INSERT INTO inventario VALUES (?, ?)", (nombre, cantidad))\n    conn.commit()\n\nagregar_item("Arco", 1)\nagregar_item("Flecha", 32)\n\ncursor.execute("SELECT COUNT(*) FROM inventario")\nprint(cursor.fetchone()[0])'),
          sale: '2',
        },
        gracioso: {
          pide: 'Cortás una cabeza... y crecen dos.',
          codigo: db('cursor.execute("CREATE TABLE hydra (cabeza TEXT)")\n\ndef cortar(cabeza):\n    cursor.execute("INSERT INTO hydra VALUES (?)", (cabeza + " bis",))\n    cursor.execute("INSERT INTO hydra VALUES (?)", (cabeza + " ter",))\n    conn.commit()\n\ncortar("Cabeza 1")\ncursor.execute("SELECT COUNT(*) FROM hydra")\nprint(f"Cabezas: {cursor.fetchone()[0]}. Esto no está funcionando.")'),
          sale: 'Cabezas: 2. Esto no está funcionando.',
        },
      },
      {
        titulo: 'Listar en orden y con total',
        ataques: ['c12-j2', 'c12-t1', 'c12-t3'],
        arena: ['Listar en orden'],
        ejemplo: {
          pide: '`ORDER BY nombre` adentro del `execute` y un `for` sobre `fetchall()`.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?)", [("Pico",), ("Arco",), ("Mapa",)])\nconn.commit()\n\ncursor.execute("SELECT nombre FROM inventario ORDER BY nombre")\nfor row in cursor.fetchall():\n    print(row[0])'),
          sale: 'Arco\nMapa\nPico',
        },
        guiado: {
          pide: 'Completá el `ORDER BY` para que salgan en orden alfabético.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?)", [("Zanahoria",), ("Balde",), ("Lana",)])\nconn.commit()\n\ncursor.execute("SELECT nombre FROM inventario ORDER BY ___")\nfor row in cursor.fetchall():\n    print(row[0])'),
          respuestas: ['nombre'],
          sale: 'Balde\nLana\nZanahoria',
        },
        desafio: {
          pide: 'Listá los nombres en orden A → Z y al final imprimí `Total: X` con un `COUNT(*)`.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?)", [("Cama",), ("Antorcha",), ("Bote",)])\nconn.commit()\n\n# SELECT con ORDER BY, después SELECT COUNT(*)\n'),
          solucion: db('cursor.execute("CREATE TABLE inventario (nombre TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?)", [("Cama",), ("Antorcha",), ("Bote",)])\nconn.commit()\n\ncursor.execute("SELECT nombre FROM inventario ORDER BY nombre")\nfor row in cursor.fetchall():\n    print(row[0])\n\ncursor.execute("SELECT COUNT(*) FROM inventario")\nprint(f"Total: {cursor.fetchone()[0]}")'),
          sale: 'Antorcha\nBote\nCama\nTotal: 3',
        },
        gracioso: {
          pide: 'Para la cabeza de la Hydra que lee de atrás para adelante.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?)", [("Arco",), ("Mapa",), ("Pico",)])\nconn.commit()\n\ncursor.execute("SELECT nombre FROM inventario ORDER BY nombre DESC")\nfor row in cursor.fetchall():\n    print(row[0])'),
          sale: 'Pico\nMapa\nArco',
        },
      },
    ],
  },
  {
    numero: 24, semana: 12, dia: 2, bossId: 'la-hydra', lang: 'python',
    temas: [
      {
        titulo: 'Contar por tipo desde Python',
        ataques: ['c12-j3', 'c12-t2'],
        ejemplo: {
          pide: 'El `GROUP BY` devuelve filas `(tipo, cantidad)`: el `for` las desarma en dos variables.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", [("Espada", "arma"), ("Pan", "comida"), ("Arco", "arma")])\nconn.commit()\n\ncursor.execute("SELECT tipo, COUNT(*) FROM inventario GROUP BY tipo ORDER BY tipo")\nfor tipo, cantidad in cursor.fetchall():\n    print(f"{cantidad} {tipo}(s)")'),
          sale: '2 arma(s)\n1 comida(s)',
        },
        guiado: {
          pide: 'Completá por qué columna agrupamos.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", [("Casco", "armadura"), ("Botas", "armadura"), ("Pechera", "armadura"), ("Pan", "comida")])\nconn.commit()\n\ncursor.execute("SELECT tipo, COUNT(*) FROM inventario GROUP BY ___ ORDER BY tipo")\nfor tipo, cantidad in cursor.fetchall():\n    print(f"{cantidad} {tipo}(s)")'),
          respuestas: ['tipo'],
          sale: '3 armadura(s)\n1 comida(s)',
        },
        desafio: {
          pide: 'Con la tabla cargada, imprimí `tipo: cantidad` por cada tipo, ordenado por tipo.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT)")\nitems = [("Poción", "consumible"), ("Manzana", "consumible"), ("Espada", "arma"), ("Pala", "herramienta")]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", items)\nconn.commit()\n\n# Tu GROUP BY y el for\n'),
          solucion: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT)")\nitems = [("Poción", "consumible"), ("Manzana", "consumible"), ("Espada", "arma"), ("Pala", "herramienta")]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", items)\nconn.commit()\n\ncursor.execute("SELECT tipo, COUNT(*) FROM inventario GROUP BY tipo ORDER BY tipo")\nfor tipo, cantidad in cursor.fetchall():\n    print(f"{tipo}: {cantidad}")'),
          sale: 'arma: 1\nconsumible: 2\nherramienta: 1',
        },
        gracioso: {
          pide: 'El estado de ánimo de las cabezas.',
          codigo: db('cursor.execute("CREATE TABLE cabezas (estado TEXT)")\ncursor.executemany("INSERT INTO cabezas VALUES (?)", [("enojada",), ("dormida",), ("enojada",), ("enojada",)])\nconn.commit()\n\ncursor.execute("SELECT estado, COUNT(*) FROM cabezas GROUP BY estado ORDER BY estado")\nfor estado, n in cursor.fetchall():\n    print(f"{n} cabeza(s) {estado}")'),
          sale: '1 cabeza(s) dormida\n3 cabeza(s) enojada',
        },
      },
    ],
  },

  // ══ Semana 13 · Dragón Rojo · buscar, quitar, actualizar ═══════════════════
  {
    numero: 25, semana: 13, dia: 1, bossId: 'dragon-rojo', lang: 'python',
    temas: [
      {
        titulo: 'Buscar: fetchone() y si no hay nada',
        ataques: ['c13-j1', 'c13-t1'],
        arena: ['Buscar en el tesoro'],
        ejemplo: {
          pide: 'Si no encuentra nada, `fetchone()` devuelve `None` y el `if resultado:` da falso.',
          codigo: db('cursor.execute("CREATE TABLE tesoro (nombre TEXT, cantidad INTEGER)")\ncursor.executemany("INSERT INTO tesoro VALUES (?, ?)", [("Oro", 50), ("Rubí", 2)])\nconn.commit()\n\ndef buscar(nombre):\n    cursor.execute("SELECT nombre, cantidad FROM tesoro WHERE nombre = ?", (nombre,))\n    resultado = cursor.fetchone()\n    if resultado:\n        print(f"Encontrado: {resultado[0]} (cantidad: {resultado[1]})")\n    else:\n        print("No encontrado")\n\nbuscar("Oro")\nbuscar("Esmeralda")'),
          sale: 'Encontrado: Oro (cantidad: 50)\nNo encontrado',
        },
        guiado: {
          pide: 'Completá el índice de la cantidad y el mensaje cuando no está.',
          codigo: db('cursor.execute("CREATE TABLE tesoro (nombre TEXT, cantidad INTEGER)")\ncursor.executemany("INSERT INTO tesoro VALUES (?, ?)", [("Oro", 50), ("Rubí", 2), ("Perla", 7)])\nconn.commit()\n\ndef buscar(nombre):\n    cursor.execute("SELECT nombre, cantidad FROM tesoro WHERE nombre = ?", (nombre,))\n    resultado = cursor.fetchone()\n    if resultado:\n        print(f"Encontrado: {resultado[0]} (cantidad: {resultado[___]})")\n    else:\n        print(___)\n\nbuscar("Perla")\nbuscar("Diamante")'),
          respuestas: ['1', '"No encontrado"'],
          sale: 'Encontrado: Perla (cantidad: 7)\nNo encontrado',
        },
        desafio: {
          pide: 'Escribí `buscar_item(nombre)` entera: si existe imprime `Encontrado: nombre (cantidad: X)`; si no, `No encontrado`. Probala con "Pico" y "Hacha".',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", [("Espada", 3), ("Pico", 1)])\nconn.commit()\n\n# Tu función buscar_item y las dos llamadas\n'),
          solucion: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", [("Espada", 3), ("Pico", 1)])\nconn.commit()\n\ndef buscar_item(nombre):\n    cursor.execute("SELECT nombre, cantidad FROM inventario WHERE nombre = ?", (nombre,))\n    resultado = cursor.fetchone()\n    if resultado:\n        print(f"Encontrado: {resultado[0]} (cantidad: {resultado[1]})")\n    else:\n        print("No encontrado")\n\nbuscar_item("Pico")\nbuscar_item("Hacha")'),
          sale: 'Encontrado: Pico (cantidad: 1)\nNo encontrado',
        },
        gracioso: {
          pide: 'El dragón y su memoria selectiva.',
          codigo: db('cursor.execute("CREATE TABLE tesoro (nombre TEXT)")\ncursor.execute("INSERT INTO tesoro VALUES (?)", ("Oro",))\nconn.commit()\n\ndef buscar(nombre):\n    cursor.execute("SELECT nombre FROM tesoro WHERE nombre = ?", (nombre,))\n    if cursor.fetchone():\n        print("El dragón lo tiene")\n    else:\n        print(f"¿{nombre}? El dragón se hace el distraído")\n\nbuscar("Oro")\nbuscar("Mis medias")'),
          sale: 'El dragón lo tiene\n¿Mis medias? El dragón se hace el distraído',
        },
      },
      {
        titulo: 'UPDATE desde Python',
        ataques: ['c13-j3', 'c13-t2'],
        arena: ['Actualizar el botín'],
        ejemplo: {
          pide: 'Dos `?`: la tupla va en el mismo orden — primero el valor nuevo, después el nombre del `WHERE`.',
          codigo: db('cursor.execute("CREATE TABLE tesoro (nombre TEXT, cantidad INTEGER)")\ncursor.execute("INSERT INTO tesoro VALUES (?, ?)", ("Oro", 50))\nconn.commit()\n\ncursor.execute("UPDATE tesoro SET cantidad = ? WHERE nombre = ?", (80, "Oro"))\nconn.commit()\n\ncursor.execute("SELECT cantidad FROM tesoro WHERE nombre = ?", ("Oro",))\nprint(cursor.fetchone()[0])'),
          sale: '80',
        },
        guiado: {
          pide: 'Que la Flecha quede en 25. Primero la cantidad, después el nombre.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\ncursor.execute("INSERT INTO inventario VALUES (?, ?)", ("Flecha", 10))\nconn.commit()\n\ncursor.execute("UPDATE inventario SET cantidad = ? WHERE nombre = ?", ___)\nconn.commit()\n\ncursor.execute("SELECT cantidad FROM inventario WHERE nombre = \'Flecha\'")\nprint(cursor.fetchone()[0])'),
          respuestas: ['(25, "Flecha")'],
          sale: '25',
        },
        desafio: {
          pide: 'Repará con `UPDATE` todas las herramientas con `durabilidad < 40` (ponelas en 100). Después imprimí cuántas quedaron en 100.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, durabilidad INTEGER)")\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", [("Espada", 50), ("Pico", 20), ("Hacha", 35), ("Arco", 90)])\nconn.commit()\n\n# Tu UPDATE y el COUNT\n'),
          solucion: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, durabilidad INTEGER)")\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", [("Espada", 50), ("Pico", 20), ("Hacha", 35), ("Arco", 90)])\nconn.commit()\n\ncursor.execute("UPDATE inventario SET durabilidad = 100 WHERE durabilidad < 40")\nconn.commit()\n\ncursor.execute("SELECT COUNT(*) FROM inventario WHERE durabilidad = 100")\nprint(cursor.fetchone()[0])'),
          sale: '2',
        },
        gracioso: {
          pide: 'Cómo calmar a un dragón.',
          codigo: db('cursor.execute("CREATE TABLE dragon (humor TEXT)")\ncursor.execute("INSERT INTO dragon VALUES (\'furioso\')")\ncursor.execute("UPDATE dragon SET humor = \'feliz\' WHERE humor = \'furioso\'")\nconn.commit()\n\ncursor.execute("SELECT humor FROM dragon")\nprint(f"Le diste una galletita. El dragón está {cursor.fetchone()[0]}")'),
          sale: 'Le diste una galletita. El dragón está feliz',
        },
      },
    ],
  },
  {
    numero: 26, semana: 13, dia: 2, bossId: 'dragon-rojo', lang: 'python',
    temas: [
      {
        titulo: 'DELETE con ? y listar lo que queda',
        ataques: ['c13-j2', 'c13-t3'],
        ejemplo: {
          pide: 'El `DELETE` también usa `?` y una tupla. Después listamos para comprobar.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?)", [("Espada",), ("Tierra",), ("Pico",)])\nconn.commit()\n\ncursor.execute("DELETE FROM inventario WHERE nombre = ?", ("Tierra",))\nconn.commit()\n\ncursor.execute("SELECT nombre FROM inventario ORDER BY nombre")\nfor row in cursor.fetchall():\n    print(row[0])'),
          sale: 'Espada\nPico',
        },
        guiado: {
          pide: 'Borrá la "Piedra". Tupla de un elemento.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?)", [("Arco",), ("Piedra",)])\nconn.commit()\n\ncursor.execute("DELETE FROM inventario WHERE nombre = ?", ___)\nconn.commit()\n\ncursor.execute("SELECT COUNT(*) FROM inventario")\nprint(cursor.fetchone()[0])'),
          respuestas: ['("Piedra",)'],
          sale: '1',
        },
        desafio: {
          pide: 'Borrá el "Huevo podrido" con una consulta con `?` y listá los que quedan en orden alfabético.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?)", [("Pan",), ("Huevo podrido",), ("Manzana",)])\nconn.commit()\n\n# DELETE con ? y después SELECT ORDER BY nombre\n'),
          solucion: db('cursor.execute("CREATE TABLE inventario (nombre TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?)", [("Pan",), ("Huevo podrido",), ("Manzana",)])\nconn.commit()\n\ncursor.execute("DELETE FROM inventario WHERE nombre = ?", ("Huevo podrido",))\nconn.commit()\n\ncursor.execute("SELECT nombre FROM inventario ORDER BY nombre")\nfor row in cursor.fetchall():\n    print(row[0])'),
          sale: 'Manzana\nPan',
        },
        gracioso: {
          pide: 'Si tan solo los deberes se borraran así.',
          codigo: db('cursor.execute("CREATE TABLE deberes (tarea TEXT)")\ncursor.executemany("INSERT INTO deberes VALUES (?)", [("matemática",), ("lengua",)])\ncursor.execute("DELETE FROM deberes WHERE tarea = ?", ("matemática",))\nconn.commit()\n\ncursor.execute("SELECT COUNT(*) FROM deberes")\nprint(f"Deberes que quedan: {cursor.fetchone()[0]} (en la vida real no funciona)")'),
          sale: 'Deberes que quedan: 1 (en la vida real no funciona)',
        },
      },
    ],
  },

  // ══ Semana 14 · El Arquitecto · el sistema completo ════════════════════════
  {
    numero: 27, semana: 14, dia: 1, bossId: 'el-arquitecto', lang: 'python',
    temas: [
      {
        titulo: 'Arrancar el sistema: AUTOINCREMENT y executemany()',
        ataques: ['c14-j1', 'c14-t1'],
        ejemplo: {
          pide: 'Con `AUTOINCREMENT` el `id` se pone solo: en el `INSERT` solo nombrás las otras columnas.',
          codigo: db('cursor.execute("""\n    CREATE TABLE inventario (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        nombre TEXT\n    )\n""")\ncursor.execute("INSERT INTO inventario (nombre) VALUES (?)", ("Espada",))\ncursor.execute("INSERT INTO inventario (nombre) VALUES (?)", ("Arco",))\nconn.commit()\n\ncursor.execute("SELECT id, nombre FROM inventario")\nfor fila in cursor.fetchall():\n    print(fila[0], fila[1])'),
          sale: '1 Espada\n2 Arco',
        },
        guiado: {
          pide: 'Completá el `executemany` con la lista.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT)")\n\nitems = [("Pala", "herramienta"), ("Pan", "comida"), ("Casco", "armadura")]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", ___)\nconn.commit()\n\nprint("Sistema listo")\ncursor.execute("SELECT COUNT(*) FROM inventario")\nprint(cursor.fetchone()[0])'),
          respuestas: ['items'],
          sale: 'Sistema listo\n3',
        },
        desafio: {
          pide: 'Creá `inventario` con `id` AUTOINCREMENT, `nombre`, `tipo` y `cantidad`. Cargá la lista, imprimí `Sistema iniciado` y `Ítems: 3`, borrá el "Bote" e imprimí `Bote eliminado`.',
          codigo: db('items = [("Bote", "transporte", 1), ("Mapa", "herramienta", 1), ("Pan", "comida", 6)]\n\n# Tu CREATE TABLE, el executemany, el conteo y el DELETE\n'),
          solucion: db('items = [("Bote", "transporte", 1), ("Mapa", "herramienta", 1), ("Pan", "comida", 6)]\n\ncursor.execute("""\n    CREATE TABLE inventario (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        nombre TEXT,\n        tipo TEXT,\n        cantidad INTEGER\n    )\n""")\ncursor.executemany("INSERT INTO inventario (nombre, tipo, cantidad) VALUES (?, ?, ?)", items)\nconn.commit()\n\nprint("Sistema iniciado")\ncursor.execute("SELECT COUNT(*) FROM inventario")\nprint(f"Ítems: {cursor.fetchone()[0]}")\n\ncursor.execute("DELETE FROM inventario WHERE nombre = ?", ("Bote",))\nconn.commit()\nprint("Bote eliminado")'),
          sale: 'Sistema iniciado\nÍtems: 3\nBote eliminado',
        },
        gracioso: {
          pide: 'Los planos del Arquitecto (tiene una sola idea).',
          codigo: db('cursor.execute("CREATE TABLE planos (id INTEGER PRIMARY KEY AUTOINCREMENT, idea TEXT)")\ncursor.executemany("INSERT INTO planos (idea) VALUES (?)", [("castillo",), ("castillo más grande",), ("castillo con tobogán",)])\nconn.commit()\n\ncursor.execute("SELECT id, idea FROM planos")\nfor fila in cursor.fetchall():\n    print(f"Plano {fila[0]}: {fila[1]}")'),
          sale: 'Plano 1: castillo\nPlano 2: castillo más grande\nPlano 3: castillo con tobogán',
        },
      },
      {
        titulo: 'Totales por tipo: SUM() + GROUP BY',
        ataques: ['c14-j3', 'c14-t2'],
        ejemplo: {
          pide: '`SUM(cantidad)` con `GROUP BY tipo`: un total por cada tipo.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT, cantidad INTEGER)")\ncursor.executemany("INSERT INTO inventario VALUES (?, ?, ?)", [("Espada", "arma", 2), ("Pan", "comida", 5), ("Arco", "arma", 1)])\nconn.commit()\n\ncursor.execute("SELECT tipo, SUM(cantidad) FROM inventario GROUP BY tipo ORDER BY tipo")\nfor tipo, total in cursor.fetchall():\n    print(f"{tipo}: {total}")'),
          sale: 'arma: 3\ncomida: 5',
        },
        guiado: {
          pide: 'Contá cuántos hay de cada tipo. ¿Por qué columna agrupamos?',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", [("Espada", "arma"), ("Hacha", "arma"), ("Pan", "comida"), ("Torta", "comida"), ("Leche", "comida")])\nconn.commit()\n\ncursor.execute("SELECT tipo, COUNT(*) FROM inventario GROUP BY ___ ORDER BY tipo")\nfor tipo, cantidad in cursor.fetchall():\n    print(f"{tipo}: {cantidad}")'),
          respuestas: ['tipo'],
          sale: 'arma: 2\ncomida: 3',
        },
        desafio: {
          pide: 'Consultá el total de `cantidad` por `tipo` con `SUM()` y `GROUP BY`. Imprimí `tipo: total` ordenado por tipo.',
          codigo: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT, cantidad INTEGER)")\nitems = [("Flecha", "arma", 32), ("Arco", "arma", 1), ("Pan", "comida", 4), ("Torta", "comida", 1)]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?, ?)", items)\nconn.commit()\n\n# Tu SUM con GROUP BY y el for\n'),
          solucion: db('cursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT, cantidad INTEGER)")\nitems = [("Flecha", "arma", 32), ("Arco", "arma", 1), ("Pan", "comida", 4), ("Torta", "comida", 1)]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?, ?)", items)\nconn.commit()\n\ncursor.execute("SELECT tipo, SUM(cantidad) FROM inventario GROUP BY tipo ORDER BY tipo")\nfor tipo, total in cursor.fetchall():\n    print(f"{tipo}: {total}")'),
          sale: 'arma: 33\ncomida: 5',
        },
        gracioso: {
          pide: 'Auditoría oficial de galletitas.',
          codigo: db('cursor.execute("CREATE TABLE snacks (quien TEXT, galletitas INTEGER)")\ncursor.executemany("INSERT INTO snacks VALUES (?, ?)", [("Rodolfo", 5), ("Steve", 1), ("Rodolfo", 7)])\nconn.commit()\n\ncursor.execute("SELECT quien, SUM(galletitas) FROM snacks GROUP BY quien ORDER BY quien")\nfor quien, total in cursor.fetchall():\n    print(f"{quien}: {total}")'),
          sale: 'Rodolfo: 12\nSteve: 1',
        },
      },
    ],
  },
  {
    numero: 28, semana: 14, dia: 2, bossId: 'el-arquitecto', lang: 'python',
    temas: [
      {
        titulo: 'El sistema completo: agregar, buscar, listar',
        ataques: ['c14-j2', 'c14-t3'],
        ejemplo: {
          pide: 'Cada tarea en su función. El programa principal solo las llama.',
          codigo: db('cursor.execute("CREATE TABLE inv (nombre TEXT, cantidad INTEGER)")\n\ndef agregar(nombre, cantidad):\n    cursor.execute("INSERT INTO inv VALUES (?, ?)", (nombre, cantidad))\n    conn.commit()\n\ndef listar_todos():\n    cursor.execute("SELECT nombre, cantidad FROM inv ORDER BY nombre")\n    for nombre, cantidad in cursor.fetchall():\n        print(f"{nombre} x{cantidad}")\n\nagregar("Pico", 1)\nagregar("Antorcha", 16)\nlistar_todos()'),
          sale: 'Antorcha x16\nPico x1',
        },
        guiado: {
          pide: 'Completá la tupla del `?` adentro de `buscar`.',
          codigo: db('cursor.execute("CREATE TABLE inv (nombre TEXT, cantidad INTEGER)")\ncursor.executemany("INSERT INTO inv VALUES (?, ?)", [("Espada", 1), ("Pan", 6)])\nconn.commit()\n\ndef buscar(nombre):\n    cursor.execute("SELECT nombre, cantidad FROM inv WHERE nombre = ?", ___)\n    r = cursor.fetchone()\n    return f"Encontrado: {r[0]} (x{r[1]})" if r else "No encontrado"\n\nprint(buscar("Pan"))\nprint(buscar("Tridente"))'),
          respuestas: ['(nombre,)'],
          sale: 'Encontrado: Pan (x6)\nNo encontrado',
        },
        desafio: {
          pide: 'Armá `agregar`, `buscar` y `listar_todos` (imprime `N ítems en el sistema`). Agregá "Arco" 1, "Flecha" 20 y "Pan" 3; listá, buscá "Arco", borrá "Pan" con `?` e imprimí `Fuera: Pan`.',
          codigo: db('cursor.execute("CREATE TABLE inv (nombre TEXT, cantidad INTEGER)")\nconn.commit()\n\n# Tus tres funciones y la secuencia\n'),
          solucion: db('cursor.execute("CREATE TABLE inv (nombre TEXT, cantidad INTEGER)")\nconn.commit()\n\ndef agregar(nombre, cantidad):\n    cursor.execute("INSERT INTO inv VALUES (?, ?)", (nombre, cantidad))\n    conn.commit()\n\ndef buscar(nombre):\n    cursor.execute("SELECT nombre, cantidad FROM inv WHERE nombre = ?", (nombre,))\n    r = cursor.fetchone()\n    return f"Encontrado: {r[0]} (x{r[1]})" if r else "No encontrado"\n\ndef listar_todos():\n    cursor.execute("SELECT COUNT(*) FROM inv")\n    print(f"{cursor.fetchone()[0]} ítems en el sistema")\n\nagregar("Arco", 1)\nagregar("Flecha", 20)\nagregar("Pan", 3)\n\nlistar_todos()\nprint(buscar("Arco"))\n\ncursor.execute("DELETE FROM inv WHERE nombre = ?", ("Pan",))\nconn.commit()\nprint("Fuera: Pan")'),
          sale: '3 ítems en el sistema\nEncontrado: Arco (x1)\nFuera: Pan',
        },
        gracioso: {
          pide: 'El Arquitecto evalúa tu sistema.',
          codigo: db('cursor.execute("CREATE TABLE inv (nombre TEXT, cantidad INTEGER)")\ncursor.executemany("INSERT INTO inv VALUES (?, ?)", [("Pico", 1), ("Mesa", 1)])\nconn.commit()\n\ndef listar_todos():\n    cursor.execute("SELECT COUNT(*) FROM inv")\n    n = cursor.fetchone()[0]\n    print(f"{n} ítems en el sistema. El Arquitecto está impresionado. Un poquito.")\n\nlistar_todos()'),
          sale: '2 ítems en el sistema. El Arquitecto está impresionado. Un poquito.',
        },
      },
    ],
  },
]

export function getPlanClase(numero: number): PlanClase | undefined {
  return PLAN_CLASES.find((c) => c.numero === numero)
}
