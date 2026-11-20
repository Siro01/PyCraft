import type { Challenge, ChallengeTier } from '@/types'

export const CHALLENGES: Challenge[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 01 · Creeper Formulario · Variables y tipos de datos
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c01-j1',
    bossId: 'creeper-formulario',
    title: 'La tarjeta del ítem',
    description: 'El nombre ya está listo. Completá `cantidad = 3` (número sin comillas) y `material = "diamante"` (texto con comillas). El código ya imprime las tres.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Espada de diamante\n3\ndiamante',
    initialCode: 'nombre_item = "Espada de diamante"\ncantidad = ___\nmaterial = ___\n\nprint(nombre_item)\nprint(cantidad)\nprint(material)',
    damage: 50,
    orderIndex: 0,
    tip: 'Una variable es una etiqueta con un valor adentro. El texto va entre comillas `"..."`, los números van sin comillas. Completá los dos valores que faltan: un número y un texto.',
  },
  {
    id: 'c01-j2',
    bossId: 'creeper-formulario',
    title: 'La poción en pantalla',
    description: 'Completá el f-string para mostrar el ítem. Con las variables dadas, debe imprimir: `Poción de curación x2 - dura 45 segundos`.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Poción de curación x2 - dura 45 segundos',
    initialCode: 'nombre_pocion = "Poción de curación"\ncantidad_pocion = 2\nduracion_segundos = 45\n\nprint(f"{___} x{___} - dura {___} segundos")',
    damage: 50,
    orderIndex: 1,
    tip: 'En un f-string escribís `{variable}` y Python pone el valor ahí. Hay tres huecos: el nombre de la poción, la cantidad y la duración en segundos.',
  },
  {
    id: 'c01-j3',
    bossId: 'creeper-formulario',
    title: 'Peso del cofre',
    description: 'Completá `peso_total` multiplicando y sumando los ítems del cofre. Debe imprimir `17.5`.',
    type: 'python',
    tier: 'junior',
    expectedOutput: '17.5',
    initialCode: 'item1_cantidad = 5\nitem1_peso = 0.5\nitem2_cantidad = 10\nitem2_peso = 1.5\n\npeso_total = (item1_cantidad * ___) + (item2_cantidad * ___)\nprint(peso_total)',
    damage: 50,
    orderIndex: 2,
    tip: 'Multiplicás la cantidad de cada ítem por su peso, y sumás los dos resultados. Los huecos son los nombres de las variables de peso de cada ítem.',
  },

  // ── TRAINEE ──
  {
    id: 'c01-t1',
    bossId: 'creeper-formulario',
    title: 'La espada de diamante',
    description: 'Creá tres variables: `nombre_item = "Espada de diamante"`, `cantidad = 1`, `material = "diamante"`. Luego imprimí las tres con `print()`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Espada de diamante\n1\ndiamante',
    initialCode: '# Asigná las variables y usá print() para cada una\nnombre_item = ___\ncantidad = ___\nmaterial = ___\n\nprint(nombre_item)\nprint(cantidad)\nprint(material)',
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c01-t2',
    bossId: 'creeper-formulario',
    title: 'La poción de curación',
    description: 'Completá el hueco: asigná `duracion_segundos = 45`. Debe imprimir: `Poción de curación x2 - dura 45 segundos`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Poción de curación x2 - dura 45 segundos',
    initialCode: 'nombre_pocion = "Poción de curación"\ncantidad_pocion = 2\nduracion_segundos = ___\n\nprint(f"{nombre_pocion} x{cantidad_pocion} - dura {duracion_segundos} segundos")',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c01-t3',
    bossId: 'creeper-formulario',
    title: 'El cofre pesado',
    description: 'Calculá el `peso_total` de tres ítems usando las variables dadas. Imprimí solo el número resultante. (Pista: debe dar `18.0`)',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '18.0',
    initialCode: 'item1_cantidad = 5\nitem1_peso_unitario = 0.5\nitem2_cantidad = 10\nitem2_peso_unitario = 1.5\nitem3_cantidad = 2\nitem3_peso_unitario = 0.25\n\npeso_total = ___\nprint(peso_total)',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 02 · Guardián de la Puerta · Condicionales if / elif / else
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c02-j1',
    bossId: 'guardian-puerta',
    title: '¿Puede pasar?',
    description: 'Completá la condición del `if`: si `espada == "diamante"`, imprimí `"Puedes pasar"`, sino `"No puedes pasar"`.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Puedes pasar',
    initialCode: 'espada = "diamante"\n\nif espada == ___:\n    print("Puedes pasar")\nelse:\n    print("No puedes pasar")',
    damage: 60,
    orderIndex: 0,
    tip: 'El `==` compara si dos valores son iguales. La variable `espada` tiene asignado el valor `"diamante"`. ¿Con qué valor la comparamos para que pase?',
  },
  {
    id: 'c02-j2',
    bossId: 'guardian-puerta',
    title: 'Salud crítica',
    description: 'Completá el primer `if`: si `salud <= 5` → `"¡Peligro! Salud crítica"`. Con `salud = 4` debe imprimir eso.',
    type: 'python',
    tier: 'junior',
    expectedOutput: '¡Peligro! Salud crítica',
    initialCode: 'salud = 4\n\nif salud <= ___:\n    print("¡Peligro! Salud crítica")\nelif salud <= 10:\n    print("Cuidado, poca salud")\nelse:\n    print("Salud estable")',
    damage: 60,
    orderIndex: 1,
    tip: '`salud = 4`. El `if` se activa cuando `salud <= número`. Para que 4 entre en el primer caso, el número del hueco tiene que ser mayor o igual a 4.',
  },
  {
    id: 'c02-j3',
    bossId: 'guardian-puerta',
    title: 'El mejor bloque',
    description: 'Completá el `elif` para que cuando `bloque == "hierro"` imprima `"Bueno"`. Con `bloque = "hierro"` debe imprimir `Bueno`.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Bueno',
    initialCode: 'bloque = "hierro"\n\nif bloque == "diamante":\n    print("Excelente")\nelif bloque == ___:\n    print("Bueno")\nelse:\n    print("Básico")',
    damage: 60,
    orderIndex: 2,
    tip: 'El `elif` solo se evalúa si el `if` de arriba resultó falso. La variable `bloque` tiene el valor `"hierro"`. ¿Con qué comparamos para que caiga en el `elif`?',
  },

  // ── TRAINEE ──
  {
    id: 'c02-t1',
    bossId: 'guardian-puerta',
    title: 'El bloque correcto',
    description: '`bloque = "diamante"`. Escribí un `if/elif/else` que imprima `"Excelente hallazgo."` para diamante, `"Buen hallazgo."` para oro, y `"Sigue buscando."` para cualquier otro.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Excelente hallazgo.',
    initialCode: 'bloque = "diamante"\n\n# Tu if/elif/else acá',
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c02-t2',
    bossId: 'guardian-puerta',
    title: 'La durabilidad crítica',
    description: 'Con `durabilidad = 8`, completá el `elif` para que imprima `"¡Advertencia! Se va a romper pronto."` cuando la durabilidad sea menor a 10.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '¡Advertencia! Se va a romper pronto.',
    initialCode: 'durabilidad = 8\nif durabilidad <= 0:\n    print("La herramienta se rompió.")\nelif durabilidad < ___:\n    print("¡Advertencia! Se va a romper pronto.")\nelse:\n    print("La herramienta está en buen estado.")',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c02-t3',
    bossId: 'guardian-puerta',
    title: 'Acceso al portal',
    description: 'Un jugador tiene `nivel = 7` y `tiene_llave = True`. Imprimí `"Acceso concedido"` solo si el nivel es mayor a 5 Y tiene la llave. En cualquier otro caso, `"Acceso denegado"`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Acceso concedido',
    initialCode: 'nivel = 7\ntiene_llave = True\n\n# Usá "and" para combinar condiciones',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 03 · Golem Infinito · Bucles for y while
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c03-j1',
    bossId: 'golem-infinito',
    title: 'Contar bloques',
    description: 'Completá el `range()` para que el `for` imprima los números del 1 al 5, uno por línea.',
    type: 'python',
    tier: 'junior',
    expectedOutput: '1\n2\n3\n4\n5',
    initialCode: 'for i in range(___, ___):\n    print(i)',
    damage: 65,
    orderIndex: 0,
    tip: '`range(inicio, fin)` genera números desde `inicio` hasta `fin - 1`. Para imprimir del 1 al 5, ¿dónde empezamos y hasta qué número tenemos que llegar (sin incluirlo)?',
  },
  {
    id: 'c03-j2',
    bossId: 'golem-infinito',
    title: 'El pico se rompe',
    description: 'Completá el hueco: ¿cuánto baja la durabilidad en cada golpe? Debe imprimir los 5 pasos y terminar con `"¡El pico se rompió!"`.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Picando... durabilidad restante: 5\nPicando... durabilidad restante: 4\nPicando... durabilidad restante: 3\nPicando... durabilidad restante: 2\nPicando... durabilidad restante: 1\n¡El pico se rompió!',
    initialCode: 'durabilidad = 5\n\nwhile durabilidad > 0:\n    print("Picando... durabilidad restante:", durabilidad)\n    durabilidad = durabilidad - ___\n\nprint("¡El pico se rompió!")',
    damage: 65,
    orderIndex: 1,
    tip: 'El `while` repite mientras `durabilidad > 0`. En cada vuelta se imprime la durabilidad actual y luego se le resta algo. Para que baje de a 1 por golpe, ¿qué número va en el hueco?',
  },
  {
    id: 'c03-j3',
    bossId: 'golem-infinito',
    title: 'El árbol crece',
    description: 'Completá el `range()` para que el for cuente regresivamente de 5 a 1, y al terminar imprima `"¡El árbol está listo para cosechar!"`.',
    type: 'python',
    tier: 'junior',
    expectedOutput: '5\n4\n3\n2\n1\n¡El árbol está listo para cosechar!',
    initialCode: 'for minutos in range(___, ___, -1):\n    print(minutos)\n\nprint("¡El árbol está listo para cosechar!")',
    damage: 70,
    orderIndex: 2,
    tip: '`range(inicio, fin, paso)` con paso `-1` cuenta hacia atrás. Para ir de 5 a 1 (inclusive), el inicio es 5 y el fin es el número hasta donde querés llegar sin incluirlo.',
  },

  // ── TRAINEE ──
  {
    id: 'c03-t1',
    bossId: 'golem-infinito',
    title: 'Contando bloques',
    description: 'Usá un `for` con `range()` para imprimir los números del 1 al 5, uno por línea.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '1\n2\n3\n4\n5',
    initialCode: '# Usá for i in range(...)',
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c03-t2',
    bossId: 'golem-infinito',
    title: 'Cuenta regresiva',
    description: 'Usá un `while` para imprimir los números del 5 al 1 (decreciente), uno por línea. No uses `range()`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '5\n4\n3\n2\n1',
    initialCode: 'contador = 5\n\n# Mientras contador sea mayor a 0, imprimí y restá 1',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c03-t3',
    bossId: 'golem-infinito',
    title: 'La suma del Golem',
    description: 'Sumá todos los números del 1 al 100 usando un `for`. Imprimí solo el resultado final.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '5050',
    initialCode: 'total = 0\n\n# Usá for i in range(1, 101)',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 04 · Mercader del Abismo · Listas y diccionarios
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c04-j1',
    bossId: 'mercader-abismo',
    title: 'Mi primera lista',
    description: 'La lista ya tiene `"Espada"`. Completá con `"Pico"` y `"Poción"`. Luego imprimí el primer elemento (`inventario[0]`).',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Espada',
    initialCode: 'inventario = ["Espada", ___, ___]\nprint(inventario[0])',
    damage: 70,
    orderIndex: 0,
    tip: 'Una lista se escribe con corchetes `[]` y los elementos separados por comas. El texto va entre comillas `""`. Completá los dos ítems que faltan.',
  },
  {
    id: 'c04-j2',
    bossId: 'mercader-abismo',
    title: 'La tarjeta como diccionario',
    description: 'Accedé a las claves `"nombre"`, `"cantidad"` y `"material"` del diccionario e imprimí cada una.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Espada de diamante\n3\ndiamante',
    initialCode: 'item = {"nombre": "Espada de diamante", "cantidad": 3, "material": "diamante"}\n\nprint(item[___])\nprint(item[___])\nprint(item[___])',
    damage: 75,
    orderIndex: 1,
    tip: 'Un diccionario tiene "clave: valor". Para acceder a un valor usás `diccionario["clave"]`. Las claves disponibles son `"nombre"`, `"cantidad"` y `"material"`.',
  },
  {
    id: 'c04-j3',
    bossId: 'mercader-abismo',
    title: 'Recorrer el inventario',
    description: 'Completá el `for` para recorrer la lista e imprimir cada ítem.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Espada\nPico\nFlecha',
    initialCode: 'inventario = ["Espada", "Pico", "Flecha"]\n\nfor item in ___:\n    print(item)',
    damage: 75,
    orderIndex: 2,
    tip: '`for item in lista:` recorre cada elemento de `lista` uno por uno. ¿Cómo se llama la lista que queremos recorrer?',
  },

  // ── TRAINEE ──
  {
    id: 'c04-t1',
    bossId: 'mercader-abismo',
    title: 'El inventario',
    description: 'Creá una lista `inventario` con tres strings: `"Espada"`, `"Pico"`, `"Hacha"`. Imprimí la cantidad de ítems con `len()`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '3',
    initialCode: 'inventario = [___]\nprint(len(inventario))',
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c04-t2',
    bossId: 'mercader-abismo',
    title: 'La ficha del ítem',
    description: 'Accedé a las claves del diccionario e imprimí `nombre`, `cantidad` y `material`, cada uno en una línea.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Espada\n10\ndiamante',
    initialCode: 'item = {"nombre": "Espada", "cantidad": 10, "material": "diamante"}\n\nprint(item[___])\nprint(item[___])\nprint(item[___])',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c04-t3',
    bossId: 'mercader-abismo',
    title: 'Filtro del mercader',
    description: 'Recorrés la lista de ítems e imprimís el `nombre` de los que tienen `cantidad > 1`, en el orden en que aparecen.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Flecha\nPiedra',
    initialCode: 'inventario = [\n    {"nombre": "Flecha", "cantidad": 64},\n    {"nombre": "Espada", "cantidad": 1},\n    {"nombre": "Piedra", "cantidad": 5},\n]\n\n# Recorré con for y filtrá con if',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 05 · Maestro Craftero · Funciones con parámetros
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c05-j1',
    bossId: 'maestro-craftero',
    title: 'Llamar a la función',
    description: 'La función `saludar(nombre)` ya está definida. Llamala con `"Steve"` para imprimir `Hola, Steve!`.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Hola, Steve!',
    initialCode: 'def saludar(nombre):\n    return "Hola, " + nombre + "!"\n\nprint(saludar(___))',
    damage: 80,
    orderIndex: 0,
    tip: 'Para llamar a una función escribís su nombre seguido de paréntesis con el argumento adentro. La función espera un `nombre` — ¿con qué string queremos saludar?',
  },
  {
    id: 'c05-j2',
    bossId: 'maestro-craftero',
    title: 'Agregar al cofre',
    description: 'Completá el método que agrega un ítem a `lista_cofre`. Llamá a la función dos veces. Al final el cofre debe tener 2 ítems.',
    type: 'python',
    tier: 'junior',
    expectedOutput: '2',
    initialCode: 'cofre = []\n\ndef agregar_item(lista_cofre, nuevo_item):\n    lista_cofre.___(nuevo_item)\n\nagregar_item(cofre, {"nombre": "Manzana", "cantidad": 5})\nagregar_item(cofre, {"nombre": "Lingote de oro", "cantidad": 2})\n\nprint(len(cofre))',
    damage: 80,
    orderIndex: 1,
    tip: '`append()` agrega un elemento al final de una lista. La función ya tiene los parámetros listos: recibe la lista y el ítem a agregar.',
  },
  {
    id: 'c05-j3',
    bossId: 'maestro-craftero',
    title: '¿Diamante o hierro?',
    description: 'Completá el umbral: si `puntos >= 10` retorna `"diamante"`, sino `"hierro"`. Con `puntos = 15` debe imprimir `diamante`.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'diamante',
    initialCode: 'def mejor_material(puntos):\n    if puntos >= ___:\n        return "diamante"\n    else:\n        return "hierro"\n\nprint(mejor_material(15))',
    damage: 80,
    orderIndex: 2,
    tip: 'Con `puntos = 15` queremos que devuelva `"diamante"`. El `if` dice `puntos >= número`. ¿Cuál es el mínimo de puntos para tener diamante?',
  },

  // ── TRAINEE ──
  {
    id: 'c05-t1',
    bossId: 'maestro-craftero',
    title: 'La función de saludo',
    description: 'Definí una función `saludar(nombre)` que retorne el string `"Hola, " + nombre + "!"`. Luego imprimí `saludar("Steve")`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Hola, Steve!',
    initialCode: 'def saludar(nombre):\n    return ___\n\nprint(saludar("Steve"))',
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c05-t2',
    bossId: 'maestro-craftero',
    title: 'Daño de diamante',
    description: 'Completá la función `calcular_dano(fuerza, material)`. Si el material es `"diamante"`, el multiplicador es 2; si no, es 1. Retorná `fuerza * multiplicador`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '50',
    initialCode: 'def calcular_dano(fuerza, material):\n    multiplicador = ___ if material == "diamante" else ___\n    return fuerza * multiplicador\n\nprint(calcular_dano(25, "diamante"))',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c05-t3',
    bossId: 'maestro-craftero',
    title: 'La receta de crafteo',
    description: 'La función `craftear(material, cantidad)` debe retornar `"Espada de diamante"` si el material es `"diamante"` y la cantidad >= 3, o `"No alcanza el material"` en cualquier otro caso.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Espada de diamante\nNo alcanza el material',
    initialCode: 'def craftear(material, cantidad):\n    if ___ and ___:\n        return "Espada de diamante"\n    else:\n        return "No alcanza el material"\n\nprint(craftear("diamante", 3))\nprint(craftear("hierro", 2))',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 06 · El Archivista · De listas a tablas
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c06-j1',
    bossId: 'archivista',
    title: 'Acceder al diccionario',
    description: 'Completá la clave para imprimir el `nombre` del ítem.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Espada',
    initialCode: 'item = {"id": 1, "nombre": "Espada", "material": "diamante"}\n\nprint(item[___])',
    damage: 85,
    orderIndex: 0,
    tip: 'El diccionario tiene tres claves: `"id"`, `"nombre"` y `"material"`. Para imprimir `Espada`, necesitás la clave que almacena el nombre del ítem.',
  },
  {
    id: 'c06-j2',
    bossId: 'archivista',
    title: 'Formato de tabla',
    description: 'Completá las claves del f-string para imprimir `1 | Espada | diamante`.',
    type: 'python',
    tier: 'junior',
    expectedOutput: '1 | Espada | diamante',
    initialCode: "item = {\"id\": 1, \"nombre\": \"Espada\", \"material\": \"diamante\"}\n\nprint(f\"{item['id']} | {item[___]} | {item[___]}\")",
    damage: 90,
    orderIndex: 1,
    tip: 'El `id` ya está. Necesitás completar las otras dos posiciones: el nombre y el material. ¿Cuáles son esas dos claves del diccionario?',
  },
  {
    id: 'c06-j3',
    bossId: 'archivista',
    title: 'La tabla completa',
    description: 'Completá la clave en el `print` para imprimir el nombre de cada ítem.',
    type: 'python',
    tier: 'junior',
    expectedOutput: 'Espada\nPico\nFlecha',
    initialCode: 'inventario = [\n    {"id": 1, "nombre": "Espada"},\n    {"id": 2, "nombre": "Pico"},\n    {"id": 3, "nombre": "Flecha"},\n]\n\nfor item in inventario:\n    print(item[___])',
    damage: 85,
    orderIndex: 2,
    tip: 'En cada vuelta del `for`, `item` es un diccionario con dos claves: `"id"` y `"nombre"`. ¿Cuál de las dos queremos imprimir?',
  },

  // ── TRAINEE ──
  {
    id: 'c06-t1',
    bossId: 'archivista',
    title: 'La tabla de ítems',
    description: 'Recorrés la lista de diccionarios e imprimís cada ítem con el formato `"id | nombre | material"`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '1 | Espada | diamante\n2 | Pico | hierro',
    initialCode: "inventario = [\n    {\"id\": 1, \"nombre\": \"Espada\", \"material\": \"diamante\"},\n    {\"id\": 2, \"nombre\": \"Pico\",   \"material\": \"hierro\"},\n]\n\nfor item in inventario:\n    print(f\"{item['id']} | {item[___]} | {item[___]}\")",
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c06-t2',
    bossId: 'archivista',
    title: 'Índices del archivo',
    description: 'Usá `enumerate()` para imprimir cada ítem con su índice, en el formato `"índice: ítem"`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '0: manzana\n1: pan\n2: pocion',
    initialCode: 'items = ["manzana", "pan", "pocion"]\n\nfor i, item in enumerate(___):\n    print(f"{i}: {item}")',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c06-t3',
    bossId: 'archivista',
    title: 'El ORDER BY de Python',
    description: 'Ordená la lista por `cantidad` (menor a mayor) usando `sorted()` y `lambda`. Imprimí `"nombre: cantidad"` por cada ítem.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Hacha: 1\nPico: 2\nEspada: 5',
    initialCode: "inventario = [\n    {\"nombre\": \"Pico\",   \"cantidad\": 2},\n    {\"nombre\": \"Espada\", \"cantidad\": 5},\n    {\"nombre\": \"Hacha\",  \"cantidad\": 1},\n]\n\nordenado = sorted(inventario, key=lambda x: x[___])\nfor item in ordenado:\n    print(f\"{item['nombre']}: {item['cantidad']}\")",
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 07 · Constructor del Vacío · CREATE TABLE · INSERT INTO
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c07-j1',
    bossId: 'constructor-vacio',
    title: 'Crear la tabla',
    description: 'Completá el nombre de la tabla: `CREATE TABLE items (...)`. La tabla debe llamarse `items`.',
    type: 'sql',
    tier: 'junior',
    blocks: 'open',
    expectedOutput: 'items',
    verifySQL: "SELECT name FROM sqlite_master WHERE type='table' AND name='items'",
    initialCode: 'CREATE TABLE ___ (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT\n);',
    damage: 90,
    orderIndex: 0,
    tip: 'La sintaxis es `CREATE TABLE nombre_tabla (columnas...)`. El nombre que necesitamos es `items`. Va justo después de `CREATE TABLE`.',
  },
  {
    id: 'c07-j2',
    bossId: 'constructor-vacio',
    title: 'Insertar un ítem',
    description: 'Insertá en `items` el ítem con `id=1` y `nombre=\'Espada\'`.',
    type: 'sql',
    tier: 'junior',
    blocks: 'open',
    seedSQL: 'CREATE TABLE items (id INTEGER PRIMARY KEY, nombre TEXT);',
    expectedOutput: '1|Espada',
    verifySQL: 'SELECT id, nombre FROM items',
    initialCode: 'INSERT INTO items (id, nombre)\nVALUES (___, ___);',
    damage: 95,
    orderIndex: 1,
    tip: 'En `VALUES (id, nombre)`: el `id` es un número (sin comillas) y el `nombre` es texto (entre comillas simples `\'\'`). Queremos id=1 y nombre="Espada".',
  },
  {
    id: 'c07-j3',
    bossId: 'constructor-vacio',
    title: 'Dos ítems de una vez',
    description: 'Insertá dos filas: `(1, \'Espada\')` y `(2, \'Pico\')` en la tabla `items`.',
    type: 'sql',
    tier: 'junior',
    blocks: 'closed',
    seedSQL: 'CREATE TABLE items (id INTEGER PRIMARY KEY, nombre TEXT);',
    expectedOutput: '2',
    verifySQL: 'SELECT COUNT(*) FROM items',
    initialCode: 'INSERT INTO items (id, nombre)\nVALUES\n  (1, ___),\n  (2, ___);',
    damage: 95,
    orderIndex: 2,
    tip: 'Cada fila va entre paréntesis y separada por coma. El texto va entre comillas simples: `\'Espada\'`, `\'Pico\'`. El número sin comillas.',
  },

  // ── TRAINEE ──
  {
    id: 'c07-t1',
    bossId: 'constructor-vacio',
    title: 'La tabla del cofre',
    description: 'Escribí el `CREATE TABLE` para la tabla `cofre` con columnas: `id INTEGER PRIMARY KEY`, `nombre TEXT`, `cantidad INTEGER`, `material TEXT`.',
    type: 'sql',
    tier: 'trainee',
    expectedOutput: 'cofre',
    verifySQL: "SELECT name FROM sqlite_master WHERE type='table' AND name='cofre'",
    initialCode: 'CREATE TABLE ___ (\n  ___ INTEGER PRIMARY KEY,\n  nombre ___,\n  cantidad ___,\n  material ___\n);',
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c07-t2',
    bossId: 'constructor-vacio',
    title: 'El INSERT perfecto',
    description: 'Insertá en `cofre`: id=1, nombre=\'Espada de diamante\', cantidad=1, material=\'diamante\'.',
    type: 'sql',
    tier: 'trainee',
    seedSQL: 'CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER, material TEXT);',
    expectedOutput: '1|Espada de diamante|1|diamante',
    verifySQL: 'SELECT id, nombre, cantidad, material FROM cofre',
    initialCode: "INSERT INTO cofre (id, nombre, cantidad, material)\nVALUES (___, ___, ___, ___);",
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c07-t3',
    bossId: 'constructor-vacio',
    title: 'Tres ítems de una vez',
    description: 'Insertá tres filas en `cofre` con un solo bloque de `INSERT INTO ... VALUES (...), (...), (...)`. Los ítems: (1,\'Pico\',1,\'diamante\'), (2,\'Hacha\',1,\'hierro\'), (3,\'Flecha\',64,\'madera\').',
    type: 'sql',
    tier: 'trainee',
    seedSQL: 'CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER, material TEXT);',
    expectedOutput: '3',
    verifySQL: 'SELECT COUNT(*) FROM cofre',
    initialCode: 'INSERT INTO cofre (id, nombre, cantidad, material)\nVALUES\n  (1, ___, ___, ___),\n  (2, ___, ___, ___),\n  (3, ___, ___, ___);',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 08 · Oráculo Oscuro · SELECT · WHERE · ORDER BY
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c08-j1',
    bossId: 'oraculo-oscuro',
    title: 'Todos los nombres',
    description: 'Completá el `SELECT` para obtener la columna `nombre` de todos los ítems del cofre.',
    type: 'sql',
    tier: 'junior',
    blocks: 'open',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT);
INSERT INTO cofre VALUES (1,'Espada','diamante');
INSERT INTO cofre VALUES (2,'Pico','hierro');
INSERT INTO cofre VALUES (3,'Flecha','madera');`,
    expectedOutput: 'Espada\nPico\nFlecha',
    initialCode: 'SELECT ___\nFROM cofre;',
    damage: 100,
    orderIndex: 0,
    tip: '`SELECT columna FROM tabla` devuelve esa columna de todas las filas. La columna que queremos ver se llama `nombre`.',
  },
  {
    id: 'c08-j2',
    bossId: 'oraculo-oscuro',
    title: 'Solo el primero',
    description: 'Seleccioná el `nombre` del ítem con `id = 1`.',
    type: 'sql',
    tier: 'junior',
    blocks: 'open',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT);
INSERT INTO cofre VALUES (1,'Espada','diamante');
INSERT INTO cofre VALUES (2,'Pico','hierro');
INSERT INTO cofre VALUES (3,'Flecha','madera');`,
    expectedOutput: 'Espada',
    initialCode: 'SELECT nombre\nFROM cofre\nWHERE id = ___;',
    damage: 100,
    orderIndex: 1,
    tip: '`WHERE id = número` filtra solo la fila con ese id. La Espada tiene `id = 1`. ¿Qué número ponemos?',
  },
  {
    id: 'c08-j3',
    bossId: 'oraculo-oscuro',
    title: 'Solo los de diamante',
    description: 'Seleccioná `nombre` de los ítems donde `material = \'diamante\'`.',
    type: 'sql',
    tier: 'junior',
    blocks: 'closed',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT);
INSERT INTO cofre VALUES (1,'Espada','diamante');
INSERT INTO cofre VALUES (2,'Pico','diamante');
INSERT INTO cofre VALUES (3,'Flecha','madera');`,
    expectedOutput: 'Espada\nPico',
    initialCode: "SELECT nombre\nFROM cofre\nWHERE material = ___;",
    damage: 100,
    orderIndex: 2,
    tip: 'Para comparar texto en SQL usás comillas simples: `WHERE material = \'diamante\'`. El texto va entre las comillas simples.',
  },

  // ── TRAINEE ──
  {
    id: 'c08-t1',
    bossId: 'oraculo-oscuro',
    title: 'Solo los de diamante (completo)',
    description: 'Seleccioná `nombre` y `cantidad` de todos los ítems donde `material = \'diamante\'`.',
    type: 'sql',
    tier: 'trainee',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER, material TEXT);
INSERT INTO cofre VALUES (1,'Espada de diamante',1,'diamante');
INSERT INTO cofre VALUES (2,'Pico de diamante',1,'diamante');
INSERT INTO cofre VALUES (3,'Hacha de hierro',1,'hierro');`,
    expectedOutput: "Espada de diamante|1\nPico de diamante|1",
    initialCode: "SELECT ___, ___\nFROM cofre\nWHERE ___ = 'diamante';",
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c08-t2',
    bossId: 'oraculo-oscuro',
    title: 'El más poderoso primero',
    description: 'Seleccioná `nombre` y `cantidad` de todos los ítems, ordenados por `cantidad` de mayor a menor (`DESC`).',
    type: 'sql',
    tier: 'trainee',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER, material TEXT);
INSERT INTO cofre VALUES (1,'Espada',5,'hierro');
INSERT INTO cofre VALUES (2,'Pico',2,'hierro');
INSERT INTO cofre VALUES (3,'Flecha',64,'madera');`,
    expectedOutput: 'Flecha|64\nEspada|5\nPico|2',
    initialCode: 'SELECT nombre, cantidad\nFROM cofre\nORDER BY ___ ___;',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c08-t3',
    bossId: 'oraculo-oscuro',
    title: 'Filtro y orden combinados',
    description: 'Seleccioná `nombre` y `material` de los ítems con `cantidad > 1`, ordenados por `nombre` alfabéticamente.',
    type: 'sql',
    tier: 'trainee',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER, material TEXT);
INSERT INTO cofre VALUES (1,'Espada',5,'diamante');
INSERT INTO cofre VALUES (2,'Pico',2,'hierro');
INSERT INTO cofre VALUES (3,'Flecha',64,'madera');
INSERT INTO cofre VALUES (4,'Antorcha',1,'madera');`,
    expectedOutput: 'Espada|diamante\nFlecha|madera\nPico|hierro',
    initialCode: 'SELECT nombre, material\nFROM cofre\nWHERE ___ > ___\nORDER BY ___;',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 09 · Contador de Almas · COUNT · SUM · AVG · GROUP BY
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c09-j1',
    bossId: 'contador-almas',
    title: 'Cuántos hay',
    description: 'Usá `COUNT(*)` para contar cuántos monstruos hay en la tabla.',
    type: 'sql',
    tier: 'junior',
    blocks: 'open',
    seedSQL: `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, hp INTEGER);
INSERT INTO monstruos VALUES (1,'Creeper A','Creeper',30);
INSERT INTO monstruos VALUES (2,'Zombie A','Zombie',20);
INSERT INTO monstruos VALUES (3,'Creeper B','Creeper',30);
INSERT INTO monstruos VALUES (4,'Zombie B','Zombie',30);`,
    expectedOutput: '4',
    initialCode: 'SELECT ___(*)  FROM monstruos;',
    damage: 105,
    orderIndex: 0,
    tip: '`COUNT(*)` cuenta todas las filas de la tabla. Es una función de agregación: va en el `SELECT` en lugar de un nombre de columna.',
  },
  {
    id: 'c09-j2',
    bossId: 'contador-almas',
    title: 'HP total del ejército',
    description: 'Usá `SUM()` para calcular la suma total de `hp` de todos los monstruos.',
    type: 'sql',
    tier: 'junior',
    blocks: 'closed',
    seedSQL: `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, hp INTEGER);
INSERT INTO monstruos VALUES (1,'Creeper A','Creeper',30);
INSERT INTO monstruos VALUES (2,'Zombie A','Zombie',20);
INSERT INTO monstruos VALUES (3,'Creeper B','Creeper',30);
INSERT INTO monstruos VALUES (4,'Zombie B','Zombie',30);`,
    expectedOutput: '110',
    initialCode: 'SELECT ___(hp)\nFROM monstruos;',
    damage: 110,
    orderIndex: 1,
    tip: '`SUM(columna)` suma todos los valores de esa columna. En este caso la columna se llama `hp`. ¿Qué va dentro del paréntesis?',
  },
  {
    id: 'c09-j3',
    bossId: 'contador-almas',
    title: 'Contar solo los Creepers',
    description: 'Completá el `WHERE` para que `COUNT(*)` cuente solo los monstruos de tipo `\'Creeper\'`.',
    type: 'sql',
    tier: 'junior',
    blocks: 'closed',
    seedSQL: `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, hp INTEGER);
INSERT INTO monstruos VALUES (1,'Creeper A','Creeper',30);
INSERT INTO monstruos VALUES (2,'Zombie A','Zombie',20);
INSERT INTO monstruos VALUES (3,'Creeper B','Creeper',30);
INSERT INTO monstruos VALUES (4,'Zombie B','Zombie',30);`,
    expectedOutput: '2',
    initialCode: "SELECT COUNT(*)\nFROM monstruos\nWHERE tipo = ___;",
    damage: 105,
    orderIndex: 2,
    tip: '`COUNT(*)` cuenta las filas que cumplen la condición del `WHERE`. Para filtrar por tipo de monstruo usás `WHERE tipo = \'valor\'`. El texto en SQL va entre comillas simples.',
  },

  // ── TRAINEE ──
  {
    id: 'c09-t1',
    bossId: 'contador-almas',
    title: 'Contando monstruos',
    description: 'Usá `COUNT(*)` para contar cuántos registros hay en la tabla `monstruos`.',
    type: 'sql',
    tier: 'trainee',
    seedSQL: `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, hp INTEGER);
INSERT INTO monstruos VALUES (1,'Creeper A','Creeper',30);
INSERT INTO monstruos VALUES (2,'Zombie A','Zombie',20);
INSERT INTO monstruos VALUES (3,'Creeper B','Creeper',30);
INSERT INTO monstruos VALUES (4,'Esqueleto A','Esqueleto',40);
INSERT INTO monstruos VALUES (5,'Esqueleto B','Esqueleto',60);`,
    expectedOutput: '5',
    initialCode: 'SELECT ___(*)  FROM monstruos;',
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c09-t2',
    bossId: 'contador-almas',
    title: 'HP total del ejército (completo)',
    description: 'Usá `SUM()` para calcular la suma total de `hp` de todos los monstruos.',
    type: 'sql',
    tier: 'trainee',
    seedSQL: `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, hp INTEGER);
INSERT INTO monstruos VALUES (1,'Creeper A','Creeper',30);
INSERT INTO monstruos VALUES (2,'Zombie A','Zombie',20);
INSERT INTO monstruos VALUES (3,'Creeper B','Creeper',30);
INSERT INTO monstruos VALUES (4,'Esqueleto A','Esqueleto',40);
INSERT INTO monstruos VALUES (5,'Esqueleto B','Esqueleto',60);`,
    expectedOutput: '180',
    initialCode: 'SELECT ___(hp)\nFROM monstruos;',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c09-t3',
    bossId: 'contador-almas',
    title: 'Censo por tipo',
    description: 'Agrupá por `tipo` y contá cuántos monstruos hay de cada tipo. Usá `GROUP BY` y ordená por `tipo` alfabéticamente.',
    type: 'sql',
    tier: 'trainee',
    seedSQL: `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, hp INTEGER);
INSERT INTO monstruos VALUES (1,'Creeper A','Creeper',30);
INSERT INTO monstruos VALUES (2,'Zombie A','Zombie',20);
INSERT INTO monstruos VALUES (3,'Creeper B','Creeper',30);
INSERT INTO monstruos VALUES (4,'Esqueleto A','Esqueleto',40);
INSERT INTO monstruos VALUES (5,'Esqueleto B','Esqueleto',60);`,
    expectedOutput: 'Creeper|2\nEsqueleto|2\nZombie|1',
    initialCode: 'SELECT tipo, COUNT(*)\nFROM monstruos\nGROUP BY tipo\nORDER BY tipo;',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 10 · El Falsificador · UPDATE · DELETE
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c10-j1',
    bossId: 'falsificador',
    title: 'Cambiar el material',
    description: 'Completá el `UPDATE` para cambiar el `material` de la `\'Espada\'` a `\'oro\'`.',
    type: 'sql',
    tier: 'junior',
    blocks: 'open',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, cantidad INTEGER);
INSERT INTO cofre VALUES (1,'Espada','hierro',5);
INSERT INTO cofre VALUES (2,'Pico','hierro',1);
INSERT INTO cofre VALUES (3,'Flecha','madera',64);`,
    expectedOutput: 'Espada|oro\nPico|hierro\nFlecha|madera',
    verifySQL: "SELECT nombre, material FROM cofre ORDER BY id",
    initialCode: "UPDATE cofre\nSET material = ___\nWHERE nombre = ___;",
    damage: 110,
    orderIndex: 0,
    tip: '`UPDATE tabla SET columna = valor WHERE condicion`. El nuevo material es `\'oro\'` y la condición es `nombre = \'Espada\'`. Recordá las comillas simples para texto.',
  },
  {
    id: 'c10-j2',
    bossId: 'falsificador',
    title: 'Borrar un ítem',
    description: 'Completá el `DELETE` para borrar la `\'Flecha\'` del cofre. Verificá que queden 2 ítems.',
    type: 'sql',
    tier: 'junior',
    blocks: 'open',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, cantidad INTEGER);
INSERT INTO cofre VALUES (1,'Espada','hierro',5);
INSERT INTO cofre VALUES (2,'Pico','hierro',1);
INSERT INTO cofre VALUES (3,'Flecha','madera',64);`,
    expectedOutput: '1|Espada\n2|Pico',
    verifySQL: "SELECT id, nombre FROM cofre ORDER BY id",
    initialCode: "DELETE FROM cofre\nWHERE nombre = ___;",
    damage: 115,
    orderIndex: 1,
    tip: '`DELETE FROM tabla WHERE nombre = \'valor\'` borra solo las filas que cumplen la condición. Sin `WHERE`, borrarías TODAS las filas. El nombre a borrar es `\'Flecha\'`.',
  },
  {
    id: 'c10-j3',
    bossId: 'falsificador',
    title: 'Actualizar cantidad',
    description: 'Actualizá la `cantidad` de la `\'Espada\'` a `10`.',
    type: 'sql',
    tier: 'junior',
    blocks: 'closed',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, cantidad INTEGER);
INSERT INTO cofre VALUES (1,'Espada','hierro',5);
INSERT INTO cofre VALUES (2,'Pico','hierro',1);`,
    expectedOutput: 'Espada|10\nPico|1',
    verifySQL: "SELECT nombre, cantidad FROM cofre ORDER BY id",
    initialCode: "UPDATE cofre\nSET cantidad = ___\nWHERE nombre = ___;",
    damage: 115,
    orderIndex: 2,
    tip: 'Queremos que `cantidad` sea `10`. El `WHERE` debe apuntar exactamente a la `\'Espada\'`. Los números van sin comillas en SQL.',
  },

  // ── TRAINEE ──
  {
    id: 'c10-t1',
    bossId: 'falsificador',
    title: 'La falsificación',
    description: 'Actualizá el `material` de la `Espada` a `\'oro\'` usando `UPDATE ... SET ... WHERE`.',
    type: 'sql',
    tier: 'trainee',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, cantidad INTEGER);
INSERT INTO cofre VALUES (1,'Espada','hierro',1);
INSERT INTO cofre VALUES (2,'Pico','hierro',1);
INSERT INTO cofre VALUES (3,'Flecha','madera',64);
INSERT INTO cofre VALUES (4,'Tronco','madera',32);
INSERT INTO cofre VALUES (5,'Pocion','vidrio',3);`,
    expectedOutput: 'Espada|oro\nPico|hierro\nFlecha|madera\nTronco|madera\nPocion|vidrio',
    verifySQL: "SELECT nombre, material FROM cofre ORDER BY id",
    initialCode: "UPDATE cofre\nSET material = ___\nWHERE nombre = ___;",
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c10-t2',
    bossId: 'falsificador',
    title: 'Eliminar la evidencia',
    description: 'Borrá con `DELETE` todos los ítems donde `material = \'madera\'`. ¡No olvidés el `WHERE` o perdés todo!',
    type: 'sql',
    tier: 'trainee',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, cantidad INTEGER);
INSERT INTO cofre VALUES (1,'Espada','hierro',1);
INSERT INTO cofre VALUES (2,'Pico','hierro',1);
INSERT INTO cofre VALUES (3,'Flecha','madera',64);
INSERT INTO cofre VALUES (4,'Tronco','madera',32);
INSERT INTO cofre VALUES (5,'Pocion','vidrio',3);`,
    expectedOutput: 'Espada|hierro\nPico|hierro\nPocion|vidrio',
    verifySQL: "SELECT nombre, material FROM cofre ORDER BY id",
    initialCode: "DELETE FROM cofre\nWHERE ___ = ___;",
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c10-t3',
    bossId: 'falsificador',
    title: 'Reparación masiva',
    description: 'Actualizá la `durabilidad` a `100` para todos los ítems con `durabilidad < 50`. El resto no se toca.',
    type: 'sql',
    tier: 'trainee',
    seedSQL: `CREATE TABLE herramientas (id INTEGER PRIMARY KEY, nombre TEXT, durabilidad INTEGER);
INSERT INTO herramientas VALUES (1,'Espada',15);
INSERT INTO herramientas VALUES (2,'Pico',80);
INSERT INTO herramientas VALUES (3,'Hacha',30);
INSERT INTO herramientas VALUES (4,'Arco',95);`,
    expectedOutput: 'Espada|100\nPico|80\nHacha|100\nArco|95',
    verifySQL: "SELECT nombre, durabilidad FROM herramientas ORDER BY id",
    initialCode: 'UPDATE herramientas\nSET durabilidad = ___\nWHERE ___ < ___;',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 11 · El Nexo · Python + sqlite3
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c11-j1',
    bossId: 'el-nexo',
    title: "Despertar al Nexo",
    description: "Creá el cofre, guardá 3 de Hierro y mostrá todo lo que tiene. La máquina de arriba no se toca: vos le hablás con `sql()`.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Diamante 5\nHierro 3",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE cofre (\n        nombre TEXT,\n        cantidad INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cofre (nombre, cantidad)\n    VALUES\n        ('Diamante', 5),\n        ('___', ___)\n\"\"\")\n\ncofre = sql(\"\"\"\n    SELECT *\n    FROM ___\n\"\"\")\nfor item in cofre:\n    print(item[\"nombre\"], item[\"cantidad\"])",
    damage: 120,
    orderIndex: 0,
    tip: "El texto va entre comillas simples y el número sin comillas: `('Hierro', 3)`. Y en el `FROM` va el nombre de la tabla.",
  },
  {
    id: 'c11-j2',
    bossId: 'el-nexo',
    title: "Las barras del poder",
    description: "Mostrá el cofre de mayor a menor, con una barra por ítem.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Oro ███████\nDiamante █████\nHierro ███",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE cofre (\n        nombre TEXT,\n        cantidad INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cofre (nombre, cantidad)\n    VALUES\n        ('Diamante', 5),\n        ('Hierro', 3),\n        ('Oro', 7)\n\"\"\")\n\ncofre = sql(\"\"\"\n    SELECT *\n    FROM cofre\n    ORDER BY cantidad DESC\n\"\"\")\nfor item in cofre:\n    print(item[\"___\"], \"█\" * item[\"___\"])",
    damage: 120,
    orderIndex: 1,
    tip: "Cada `item` es un diccionario: ¿qué clave tiene el nombre y cuál el número?",
  },
  {
    id: 'c11-j3',
    bossId: 'el-nexo',
    title: "El radar del Nexo",
    description: "Encontrá los ítems con más de 4 y contalos.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Tenés 2 ítems con más de 4\n★ Diamante\n★ Oro",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE cofre (\n        nombre TEXT,\n        cantidad INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cofre (nombre, cantidad)\n    VALUES\n        ('Diamante', 5),\n        ('Hierro', 3),\n        ('Oro', 7)\n\"\"\")\n\nmuchos = sql(\"\"\"\n    SELECT *\n    FROM cofre\n    WHERE cantidad ___ 4\n\"\"\")\nprint(\"Tenés\", len(___), \"ítems con más de 4\")\nfor item in muchos:\n    print(\"★\", item[\"nombre\"])",
    damage: 120,
    orderIndex: 2,
    tip: "`len()` cuenta cuántas cosas hay en una lista. ¿Cómo se llama tu lista?",
  },

  // ── TRAINEE ──
  {
    id: 'c11-t1',
    bossId: 'el-nexo',
    title: 'La conexión',
    description: 'Usá `sqlite3` para conectar a una base en memoria, crear la tabla `items`, insertar `"Espada de diamante"` con id=1, y luego imprimí el nombre con `SELECT`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Espada de diamante',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\n\ncursor.execute("CREATE TABLE items (id INTEGER PRIMARY KEY, nombre TEXT)")\n\ncursor.execute("INSERT INTO items VALUES (1, ___)")\nconn.commit()\n\ncursor.execute("SELECT nombre FROM items WHERE id = 1")\nprint(cursor.fetchone()[0])\nconn.close()',
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c11-t2',
    bossId: 'el-nexo',
    title: 'Inserción múltiple',
    description: 'Usá `executemany()` para insertar la lista `datos` en la tabla `monstruos` de una sola vez. Luego imprimí el total de filas con `COUNT(*)`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '3',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE monstruos (nombre TEXT, tipo TEXT)")\n\ndatos = [("Creeper", "explosivo"), ("Zombie", "no muerto"), ("Esqueleto", "arquero")]\ncursor.___(   "INSERT INTO monstruos VALUES (?, ?)", datos   )\nconn.commit()\n\ncursor.execute("SELECT COUNT(*) FROM monstruos")\nprint(cursor.fetchone()[0])\nconn.close()',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c11-t3',
    bossId: 'el-nexo',
    title: 'La consulta parametrizada',
    description: 'Completá la consulta parametrizada para buscar ítems por `material`. Imprimí solo los nombres que coinciden.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Espada',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, material TEXT, cantidad INTEGER)")\nitems = [("Espada","diamante",1), ("Pico","hierro",2), ("Flecha","madera",64)]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?, ?)", items)\n\nmaterial_buscado = "diamante"\ncursor.execute("SELECT nombre FROM inventario WHERE material = ?", ___)\nfor row in cursor.fetchall():\n    print(row[0])\nconn.close()',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 12 · La Hydra · Proyecto: agregar y listar
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c12-j1',
    bossId: 'la-hydra',
    title: "Cabezas que crecen",
    description: "Completá la función `crecer` para que guarde cada cabeza nueva. Las variables entran al SQL entre llaves: `{nombre}`.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "La Hydra tiene 3 cabezas",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE cabezas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\n\ndef crecer(nombre, poder):\n    sql(f\"\"\"\n        INSERT INTO cabezas (nombre, poder)\n        VALUES\n            ('{___}', {___})\n    \"\"\")\n\ncrecer(\"Fuego\", 7)\ncrecer(\"Hielo\", 4)\ncrecer(\"Rayo\", 9)\n\ncabezas = sql(\"\"\"\n    SELECT *\n    FROM cabezas\n\"\"\")\nprint(\"La Hydra tiene\", len(cabezas), \"cabezas\")",
    damage: 125,
    orderIndex: 0,
    tip: "Adentro de la f-string, cada variable va entre llaves. El texto además lleva comillas simples: `'{nombre}'`. El número, sin comillas: `{poder}`.",
  },
  {
    id: 'c12-j2',
    bossId: 'la-hydra',
    title: "Las cabezas en fila",
    description: "Completá `listar()` para mostrar las cabezas de la más poderosa a la más débil.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Rayo #########\nFuego #######\nHielo ####",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE cabezas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cabezas (nombre, poder)\n    VALUES\n        ('Fuego', 7),\n        ('Hielo', 4),\n        ('Rayo', 9)\n\"\"\")\n\ndef listar():\n    cabezas = sql(\"\"\"\n        SELECT *\n        FROM cabezas\n        ORDER BY ___ ___\n    \"\"\")\n    for cabeza in cabezas:\n        print(cabeza[\"nombre\"], \"#\" * cabeza[\"poder\"])\n\nlistar()",
    damage: 130,
    orderIndex: 1,
    tip: "`ORDER BY` lleva la columna por la que ordenás. De mayor a menor se agrega `DESC`.",
  },
  {
    id: 'c12-j3',
    bossId: 'la-hydra',
    title: "El poder de la Hydra",
    description: "SQL trae las cabezas y Python suma su poder. Completá la suma y el `print`.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Poder total de la Hydra: 20",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE cabezas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cabezas (nombre, poder)\n    VALUES\n        ('Fuego', 7),\n        ('Hielo', 4),\n        ('Rayo', 9)\n\"\"\")\n\ncabezas = sql(\"\"\"\n    SELECT *\n    FROM cabezas\n\"\"\")\ntotal = 0\nfor cabeza in cabezas:\n    total = total + cabeza[\"___\"]\nprint(\"Poder total de la Hydra:\", ___)",
    damage: 125,
    orderIndex: 2,
    tip: "Cada `cabeza` es un diccionario: el número está en la clave `\"poder\"`. Al final se imprime la variable que fue juntando todo.",
  },

  // ── TRAINEE ──
  {
    id: 'c12-t1',
    bossId: 'la-hydra',
    title: 'Agregar al inventario',
    description: 'Completá la función `agregar_item(nombre)` para que inserte en la tabla. Luego agregá los tres ítems y listá todos en orden alfabético.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Flecha\nManzana\nPoción',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT)")\n\ndef agregar_item(nombre):\n    cursor.execute("INSERT INTO inventario VALUES (?)", ___)\n    conn.commit()\n\nagregar_item("Poción")\nagregar_item("Flecha")\nagregar_item("Manzana")\n\ncursor.execute("SELECT nombre FROM inventario ORDER BY nombre")\nfor row in cursor.fetchall():\n    print(row[0])\nconn.close()',
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c12-t2',
    bossId: 'la-hydra',
    title: 'Conteo por tipo',
    description: 'Con la tabla ya cargada, consultá cuántos ítems hay de cada `tipo` usando `GROUP BY`. Imprimí `"cantidad tipo(s)"` ordenado por tipo.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '2 arma(s)\n1 consumible(s)',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT)")\nconn.commit()\n\nitems = [("Espada", "arma"), ("Arco", "arma"), ("Poción de vida", "consumible")]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", items)\nconn.commit()\n\ncursor.execute("SELECT tipo, COUNT(*) FROM inventario GROUP BY tipo ORDER BY ___")\nfor tipo, cantidad in cursor.fetchall():\n    print(f"{cantidad} {tipo}(s)")\nconn.close()',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c12-t3',
    bossId: 'la-hydra',
    title: 'Listar con total',
    description: 'Listá todos los ítems del inventario ordenados por nombre (A→Z). Al final imprimí `"Total: X"` donde X es la cantidad total de filas.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Arco\nEspada\nPoción\nTotal: 3',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT)")\nitems = [("Espada",), ("Arco",), ("Poción",)]\ncursor.executemany("INSERT INTO inventario VALUES (?)", items)\nconn.commit()\n\n# SELECT nombre ORDER BY nombre, luego SELECT COUNT(*)',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 13 · Dragón Rojo · Proyecto: buscar, quitar, actualizar
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c13-j1',
    bossId: 'dragon-rojo',
    title: "Buscar en el tesoro",
    description: "Completá `buscar(nombre)`: filtrá por la columna del nombre y fijate si la lista trajo algo.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Encontrado: Rubí\nNo está: Corona",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE tesoro (\n        nombre TEXT,\n        cantidad INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO tesoro (nombre, cantidad)\n    VALUES\n        ('Oro', 50),\n        ('Rubí', 2),\n        ('Huevo', 1)\n\"\"\")\n\ndef buscar(nombre):\n    encontrados = sql(f\"\"\"\n        SELECT *\n        FROM tesoro\n        WHERE ___ = '{nombre}'\n    \"\"\")\n    if len(encontrados) ___ 0:\n        print(\"Encontrado:\", nombre)\n    else:\n        print(\"No está:\", nombre)\n\nbuscar(\"Rubí\")\nbuscar(\"Corona\")",
    damage: 130,
    orderIndex: 0,
    tip: "Si no encuentra nada, `sql()` devuelve una lista vacía y `len()` da 0. Si encontró algo, `len()` es mayor que 0.",
  },
  {
    id: 'c13-j2',
    bossId: 'dragon-rojo',
    title: "Robar el huevo",
    description: "Llevate el `'Huevo'` del tesoro con `DELETE` y contá cuántos tesoros quedan.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Quedan 2 tesoros\n- Oro\n- Rubí",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE tesoro (\n        nombre TEXT,\n        cantidad INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO tesoro (nombre, cantidad)\n    VALUES\n        ('Oro', 50),\n        ('Rubí', 2),\n        ('Huevo', 1)\n\"\"\")\n\nsql(\"\"\"\n    DELETE FROM tesoro\n    WHERE nombre = ___\n\"\"\")\n\ntesoro = sql(\"\"\"\n    SELECT *\n    FROM tesoro\n\"\"\")\nprint(\"Quedan\", len(___), \"tesoros\")\nfor item in tesoro:\n    print(\"-\", item[\"nombre\"])",
    damage: 135,
    orderIndex: 1,
    tip: "El texto adentro del SQL va con comillas simples: `'Huevo'`. `len()` cuenta la lista que trajo el SELECT.",
  },
  {
    id: 'c13-j3',
    bossId: 'dragon-rojo',
    title: "El dragón se enoja",
    description: "Sacale 10 de oro al dragón con `UPDATE`.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Al dragón le quedan 40 de oro",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE tesoro (\n        nombre TEXT,\n        cantidad INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO tesoro (nombre, cantidad)\n    VALUES\n        ('Oro', 50),\n        ('Rubí', 2),\n        ('Huevo', 1)\n\"\"\")\n\nsql(\"\"\"\n    UPDATE tesoro\n    SET cantidad = cantidad ___ 10\n    WHERE nombre = ___\n\"\"\")\n\noro = sql(\"\"\"\n    SELECT *\n    FROM tesoro\n    WHERE nombre = 'Oro'\n\"\"\")\nprint(\"Al dragón le quedan\", oro[0][\"cantidad\"], \"de oro\")",
    damage: 135,
    orderIndex: 2,
    tip: "Para sacar se resta: `cantidad - 10`. Y en el `WHERE` va el nombre con comillas simples: `'Oro'`.",
  },

  // ── TRAINEE ──
  {
    id: 'c13-t1',
    bossId: 'dragon-rojo',
    title: 'Función buscar_item',
    description: 'Completá `buscar_item(nombre)` para que consulte la tabla y, si existe, imprima `"Encontrado: nombre (cantidad: X)"`. Si no existe, `"No encontrado"`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Encontrado: Espada (cantidad: 3)\nNo encontrado',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", [("Espada",3),("Pico",1),("Flecha",64)])\nconn.commit()\n\ndef buscar_item(nombre):\n    cursor.execute("SELECT nombre, cantidad FROM inventario WHERE nombre = ?", (nombre,))\n    resultado = cursor.fetchone()\n    if resultado:\n        print(f"Encontrado: {resultado[0]} (cantidad: {resultado[1]})")\n    else:\n        print(___)\n\nbuscar_item("Espada")\nbuscar_item("Hacha")\nconn.close()',
    damage: 30,
    orderIndex: 0,
  },
  {
    id: 'c13-t2',
    bossId: 'dragon-rojo',
    title: 'Reparar y contar',
    description: 'Usá `UPDATE` para reparar todas las herramientas con `durabilidad < 50` (ponelas en 100). Luego imprimí cuántas herramientas tienen `durabilidad = 100`.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '2',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, durabilidad INTEGER)")\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", [("Espada",50),("Pico",80),("Hacha",30),("Arco",15)])\nconn.commit()\n\ncursor.execute("UPDATE inventario SET durabilidad = 100 WHERE durabilidad < ___")\nconn.commit()\n\ncursor.execute("SELECT COUNT(*) FROM inventario WHERE durabilidad = 100")\nprint(cursor.fetchone()[0])\nconn.close()',
    damage: 50,
    orderIndex: 1,
  },
  {
    id: 'c13-t3',
    bossId: 'dragon-rojo',
    title: 'Eliminar y verificar',
    description: 'Borrá el ítem `"Flecha"` usando una query parametrizada con `?`. Luego listá los nombres restantes en orden alfabético.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Espada\nPico',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT)")\ncursor.executemany("INSERT INTO inventario VALUES (?)", [("Espada",),("Flecha",),("Pico",)])\nconn.commit()\n\n# DELETE con ? y luego SELECT ORDER BY nombre',
    damage: 80,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 14 · El Arquitecto · Sistema completo integrado
  // ════════════════════════════════════════════════════════════════════════════

  // ── JUNIOR ──
  {
    id: 'c14-j1',
    bossId: 'el-arquitecto',
    title: "El eco del Creeper",
    description: "Acto I. Contá las manzanas de la mochila con un `for`, un `if` y un contador.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Tenés 2 manzanas\n¡Alcanza para curarte!",
    initialCode: "# El Arquitecto revive al Creeper: Python puro, como en el Acto I\nmochila = [\"Espada\", \"Manzana\", \"Antorcha\", \"Manzana\"]\n\nmanzanas = 0\nfor cosa in mochila:\n    if cosa ___ \"Manzana\":\n        manzanas = manzanas ___ 1\n\nprint(\"Tenés\", manzanas, \"manzanas\")\nif manzanas >= 2:\n    print(\"¡Alcanza para curarte!\")",
    damage: 100,
    orderIndex: 0,
    tip: "Para comparar se usan dos iguales: `==`. Y el contador suma 1 en cada vuelta: `manzanas + 1`.",
  },
  {
    id: 'c14-j2',
    bossId: 'el-arquitecto',
    title: "El eco del Oráculo",
    description: "Acto II. Traé los monstruos con más de 20 de `hp`, del más fuerte al más débil. Escribí la condición entera del `WHERE`.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Esqueleto 27\nZombie 22",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE monstruos (\n        nombre TEXT,\n        hp INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO monstruos (nombre, hp)\n    VALUES\n        ('Creeper', 20),\n        ('Zombie', 22),\n        ('Araña', 16),\n        ('Esqueleto', 27)\n\"\"\")\n\nfuertes = sql(\"\"\"\n    SELECT *\n    FROM monstruos\n    WHERE ___\n    ORDER BY hp ___\n\"\"\")\nfor monstruo in fuertes:\n    print(monstruo[\"nombre\"], monstruo[\"hp\"])",
    damage: 100,
    orderIndex: 1,
    tip: "La condición tiene columna, comparación y número: `hp > 20`. De mayor a menor es `DESC`.",
  },
  {
    id: 'c14-j3',
    bossId: 'el-arquitecto',
    title: "La fábrica de cartas",
    description: "Nexo e Hydra. Completá `agregar` y contá cuántas cartas fabricaste.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Fabricaste 3 cartas",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\n\ndef agregar(nombre, poder):\n    sql(f\"\"\"\n        INSERT INTO cartas (nombre, poder)\n        VALUES\n            ('{___}', {___})\n    \"\"\")\n\nagregar(\"Gato ninja\", 8)\nagregar(\"Dragón de papel\", 3)\nagregar(\"Robot tostadora\", 5)\n\ncartas = sql(\"\"\"\n    SELECT *\n    FROM cartas\n\"\"\")\nprint(\"Fabricaste\", ___(cartas), \"cartas\")",
    damage: 100,
    orderIndex: 2,
    tip: "Las variables entran al SQL entre llaves; el texto con comillas simples: `'{nombre}'`. La función que cuenta una lista es `len`.",
  },
  {
    id: 'c14-j4',
    bossId: 'el-arquitecto',
    title: "La carta rota",
    description: "Dragón. El Arquitecto rompió tu mazo: el `Gato ninja` tiene 8 y el tope es 6. Bajalo a 6 y borrá la `'Carta fantasma'`.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Gato ninja 6\nRobot tostadora 5\nDragón de papel 3",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cartas (nombre, poder)\n    VALUES\n        ('Gato ninja', 8),\n        ('Carta fantasma', 0),\n        ('Dragón de papel', 3),\n        ('Robot tostadora', 5)\n\"\"\")\n\nsql(\"\"\"\n    UPDATE cartas\n    SET poder = ___\n    WHERE nombre = 'Gato ninja'\n\"\"\")\n\nsql(\"\"\"\n    DELETE FROM cartas\n    WHERE nombre = ___\n\"\"\")\n\ncartas = sql(\"\"\"\n    SELECT *\n    FROM cartas\n    ORDER BY poder DESC\n\"\"\")\nfor carta in cartas:\n    print(carta[\"nombre\"], carta[\"poder\"])",
    damage: 100,
    orderIndex: 3,
    tip: "En el `SET` va el número nuevo. En el `DELETE`, el nombre entre comillas simples: `'Carta fantasma'`.",
  },
  {
    id: 'c14-j5',
    bossId: 'el-arquitecto',
    title: "Tu carta contra la mía",
    description: "El proyecto. Dibujá tu carta más fuerte y fijate si le gana al Arquitecto, que tiene poder 5.",
    type: 'python',
    tier: 'junior',
    expectedOutput: "Arquitecto: poder 5\n| Gato ninja ######\n¡Tu carta le gana al Arquitecto!",
    initialCode: "# ===== MÁQUINA DEL NEXO (no se toca) =====\nimport sqlite3\nbase = sqlite3.connect(\":memory:\")\ndef sql(orden):\n    cursor = base.execute(orden)\n    if cursor.description is None:\n        return []\n    columnas = [c[0] for c in cursor.description]\n    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]\n# =========================================\n\nsql(\"\"\"\n    CREATE TABLE cartas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\nsql(\"\"\"\n    INSERT INTO cartas (nombre, poder)\n    VALUES\n        ('Dragón de papel', 3),\n        ('Gato ninja', 6),\n        ('Robot tostadora', 5)\n\"\"\")\n\ndef carta(fila):\n    barra = \"#\" * fila[\"poder\"]\n    return \"| \" + fila[\"___\"] + \" \" + barra\n\nmazo = sql(\"\"\"\n    SELECT *\n    FROM cartas\n    ORDER BY poder DESC\n\"\"\")\nmejor = mazo[0]\n\nprint(\"Arquitecto: poder 5\")\nprint(carta(mejor))\nif mejor[\"poder\"] ___ 5:\n    print(\"¡Tu carta le gana al Arquitecto!\")\nelse:\n    print(\"Empate... ¡otra vez!\")",
    damage: 100,
    orderIndex: 4,
    tip: "La carta muestra el nombre: `fila[\"nombre\"]`. Para ganar, tu poder tiene que ser mayor: `>`.",
  },

  // ── TRAINEE ──
  {
    id: 'c14-t1',
    bossId: 'el-arquitecto',
    title: 'Inicializar el sistema',
    description: 'Completá el sistema: creá la tabla con `AUTOINCREMENT`, insertá los tres ítems, imprimí "Sistema iniciado", el conteo, y luego eliminá el "Arco" e imprimí "Arco eliminado".',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'Sistema iniciado\nÍtems: 3\nArco eliminado',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\n\ncursor.execute("""\n    CREATE TABLE inventario (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        nombre TEXT,\n        tipo TEXT,\n        cantidad INTEGER\n    )\n""")\n\nitems = [\n    ("Espada de diamante", "arma", 1),\n    ("Arco", "arma", 1),\n    ("Poción de vida", "consumible", 5),\n]\ncursor.executemany("INSERT INTO inventario (nombre, tipo, cantidad) VALUES (?, ?, ?)", items)\nconn.commit()\n\nprint("Sistema iniciado")\ncursor.execute("SELECT COUNT(*) FROM inventario")\nprint(f"Ítems: {cursor.fetchone()[0]}")\n\ncursor.execute("DELETE FROM inventario WHERE nombre = ___")\nconn.commit()\nprint("Arco eliminado")\nconn.close()',
    damage: 50,
    orderIndex: 0,
  },
  {
    id: 'c14-t2',
    bossId: 'el-arquitecto',
    title: 'Análisis del inventario',
    description: 'Consultá el total de `cantidad` por `tipo`, usando `SUM()` y `GROUP BY`. Imprimí `"tipo: total"` ordenado alfabéticamente por tipo.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: 'arma: 4\nconsumible: 17',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT, cantidad INTEGER)")\nconn.commit()\n\nconn.commit()\nitems = [\n    ("Espada", "arma", 3),\n    ("Arco", "arma", 1),\n    ("Poción", "consumible", 10),\n    ("Manzana", "consumible", 7),\n]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?, ?)", items)\nconn.commit()\n\ncursor.execute("SELECT tipo, SUM(cantidad) FROM inventario GROUP BY tipo ORDER BY tipo")\nfor tipo, total in cursor.fetchall():\n    print(f"{tipo}: {total}")\nconn.close()',
    damage: 80,
    orderIndex: 1,
  },
  {
    id: 'c14-t3',
    bossId: 'el-arquitecto',
    title: 'El sistema completo',
    description: 'Creá funciones `agregar`, `buscar` y `listar_todos`. Ejecutá la secuencia del test — la salida debe ser exacta.',
    type: 'python',
    tier: 'trainee',
    expectedOutput: '3 ítems en el sistema\nEncontrado: Espada (x1)\nFuera: Poción',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inv (nombre TEXT, cantidad INTEGER)")\nconn.commit()\n\ndef agregar(nombre, cantidad):\n    cursor.execute("INSERT INTO inv VALUES (?, ?)", (nombre, cantidad))\n    conn.commit()\n\ndef buscar(nombre):\n    cursor.execute("SELECT nombre, cantidad FROM inv WHERE nombre = ?", (nombre,))\n    r = cursor.fetchone()\n    return f"Encontrado: {r[0]} (x{r[1]})" if r else "No encontrado"\n\ndef listar_todos():\n    cursor.execute("SELECT COUNT(*) FROM inv")\n    print(f"{cursor.fetchone()[0]} ítems en el sistema")\n\nagregar("Espada", 1)\nagregar("Pico", 2)\nagregar("Poción", 5)\n\nlistar_todos()\nprint(buscar("Espada"))\n\ncursor.execute("DELETE FROM inv WHERE nombre = ___")\nconn.commit()\nprint(f"Fuera: Poción")\nconn.close()',
    damage: 120,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // DESAFÍOS SENIOR — 3 por jefe × 14 jefes = 42 desafíos
  // Sin tip · Código completo desde cero · Para 10-14 años
  // ════════════════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 01 · Creeper Formulario · Variables y tipos de datos — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c01-s1',
    bossId: 'creeper-formulario',
    title: 'Ficha de personaje',
    description: 'Creá las variables `nombre` (string), `nivel` (entero), `vida` (float) y `activo` (booleano). Usá un f-string para imprimir exactamente: `Steve | Nv.12 | HP: 18.5 | Activo: True`.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Steve | Nv.12 | HP: 18.5 | Activo: True',
    initialCode: '# Declarar variables y armar el f-string',
    damage: 70,
    orderIndex: 0,
  },
  {
    id: 'c01-s2',
    bossId: 'creeper-formulario',
    title: 'Intercambio de inventario',
    description: 'Tenés `slot_a = "Espada"` y `slot_b = "Pico"`. Intercambiá los valores sin usar una variable extra (solo con la sintaxis de Python para swap). Imprimí primero `slot_a` y después `slot_b`.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Pico\nEspada',
    initialCode: 'slot_a = "Espada"\nslot_b = "Pico"\n\n# Intercambiá los valores en una sola línea',
    damage: 75,
    orderIndex: 1,
  },
  {
    id: 'c01-s3',
    bossId: 'creeper-formulario',
    title: 'Estadísticas del jefe',
    description: 'Tenés `ataque = 45`, `defensa = 30`, `velocidad = 12`. Calculá y almacená: `poder_total = ataque + defensa + velocidad`, `promedio = poder_total / 3`. Imprimí `poder_total` en la primera línea y `promedio` con exactamente 1 decimal en la segunda.',
    type: 'python',
    tier: 'senior',
    expectedOutput: '87\n29.0',
    initialCode: 'ataque = 45\ndefensa = 30\nvelocidad = 12\n\n# Calculá poder_total y promedio, luego imprimilos',
    damage: 75,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 02 · Guardián de la Puerta · Condicionales — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c02-s1',
    bossId: 'guardian-puerta',
    title: 'Sistema de rango',
    description: 'Dado `puntos = 720`, determiná el rango: `"Leyenda"` si puntos >= 800, `"Maestro"` si >= 600, `"Guerrero"` si >= 400, `"Novato"` en cualquier otro caso. Imprimí el rango.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Maestro',
    initialCode: 'puntos = 720\n\n# Tu if/elif/elif/else acá',
    damage: 80,
    orderIndex: 0,
  },
  {
    id: 'c02-s2',
    bossId: 'guardian-puerta',
    title: 'Control de acceso',
    description: '`nivel = 6`, `tiene_pase = False`, `es_admin = True`. Imprimí `"Acceso concedido"` si el nivel es >= 5 Y tiene pase, O si es admin. En cualquier otro caso, `"Acceso denegado"`.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Acceso concedido',
    initialCode: 'nivel = 6\ntiene_pase = False\nes_admin = True\n\n# Combiná and / or con paréntesis para la lógica correcta',
    damage: 85,
    orderIndex: 1,
  },
  {
    id: 'c02-s3',
    bossId: 'guardian-puerta',
    title: 'Daño con crítico',
    description: '`ataque_base = 25`, `es_critico = True`, `tiene_espada_diamante = True`. Si es crítico Y tiene espada de diamante, el daño se multiplica por 3. Si solo es crítico, por 2. Si no hay crítico, el daño es `ataque_base`. Imprimí el daño final.',
    type: 'python',
    tier: 'senior',
    expectedOutput: '75',
    initialCode: 'ataque_base = 25\nes_critico = True\ntiene_espada_diamante = True\n\n# Calculá el daño con los condicionales correctos',
    damage: 85,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 03 · Golem Infinito · Bucles — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c03-s1',
    bossId: 'golem-infinito',
    title: 'Los múltiplos del Golem',
    description: 'Imprimí todos los números del 1 al 50 que sean múltiplos de 3 O de 5 (pero no de ambos a la vez). Un número por línea. Usá un `for` con `range()` y condicionales.',
    type: 'python',
    tier: 'senior',
    expectedOutput: '3\n5\n6\n9\n10\n12\n18\n20\n21\n24\n25\n27\n33\n35\n36\n39\n40\n42\n48\n50',
    initialCode: '# for + range + condiciones con % (módulo)',
    damage: 90,
    orderIndex: 0,
  },
  {
    id: 'c03-s2',
    bossId: 'golem-infinito',
    title: 'Contador de golpes',
    description: 'El Golem tiene `100` de vida. Cada turno le quitás `7` puntos de vida. Usá un `while` para contar cuántos turnos tardás en derrotarlo (vida <= 0). Imprimí `"Turnos: X"` donde X es la cantidad de turnos.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Turnos: 15',
    initialCode: 'vida = 100\ndanio_por_turno = 7\nturnos = 0\n\n# while vida > 0: restá daño y sumá turno',
    damage: 90,
    orderIndex: 1,
  },
  {
    id: 'c03-s3',
    bossId: 'golem-infinito',
    title: 'Pirámide de bloques',
    description: 'Usá un `for` con `range()` para imprimir una pirámide de `*` de 5 pisos. El piso 1 tiene 1 `*`, el piso 2 tiene 2 `*`, etc. Cada piso en una línea.',
    type: 'python',
    tier: 'senior',
    expectedOutput: '*\n**\n***\n****\n*****',
    initialCode: '# for i in range(1, 6): imprimí "*" * i',
    damage: 95,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 04 · Mercader del Abismo · Listas y diccionarios — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c04-s1',
    bossId: 'mercader-abismo',
    title: 'El mercado más caro',
    description: 'Dado el inventario, encontrá el ítem con mayor precio sin usar `max()`. Imprimí `"nombre: precio"`. En caso de empate, el primero en la lista gana.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Armadura: 340',
    initialCode: 'inventario = [\n    {"nombre": "Espada", "precio": 120},\n    {"nombre": "Armadura", "precio": 340},\n    {"nombre": "Pico", "precio": 85},\n    {"nombre": "Arco", "precio": 200},\n]\n\n# Sin usar max() — recorrés la lista y guardás el mayor',
    damage: 95,
    orderIndex: 0,
  },
  {
    id: 'c04-s2',
    bossId: 'mercader-abismo',
    title: 'Filtrar por material',
    description: 'Recorrés el inventario y armás una **nueva lista** con los nombres de los ítems cuyo `material` sea `"diamante"`. Imprimí cada nombre de la nueva lista, uno por línea, en el orden que aparecen.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Espada\nCasco',
    initialCode: 'inventario = [\n    {"nombre": "Espada", "material": "diamante", "cantidad": 1},\n    {"nombre": "Pico", "material": "hierro", "cantidad": 2},\n    {"nombre": "Casco", "material": "diamante", "cantidad": 1},\n    {"nombre": "Flecha", "material": "madera", "cantidad": 64},\n]\n\n# Armá la lista filtrada y luego imprimí cada nombre',
    damage: 95,
    orderIndex: 1,
  },
  {
    id: 'c04-s3',
    bossId: 'mercader-abismo',
    title: 'Fusionar inventarios',
    description: 'Tenés dos listas de ítems. Combiná ambas en una sola lista y ordenalas por `nombre` (A→Z) usando `sorted()` con `lambda`. Imprimí `"nombre (cantidad)"` de cada ítem del resultado.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Arco (3)\nEspada (1)\nFlecha (64)\nPico (2)',
    initialCode: 'cofre1 = [{"nombre": "Espada", "cantidad": 1}, {"nombre": "Flecha", "cantidad": 64}]\ncofre2 = [{"nombre": "Pico", "cantidad": 2}, {"nombre": "Arco", "cantidad": 3}]\n\n# Combiná con + y ordená con sorted(key=lambda)',
    damage: 100,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 05 · Maestro Craftero · Funciones — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c05-s1',
    bossId: 'maestro-craftero',
    title: 'Función de crafteo',
    description: 'Definí `craftear(material, cantidad)`. Retorna `"Espada de " + material` si cantidad >= 2, `"No alcanza el material"` si cantidad == 1, y `"Sin material"` si cantidad == 0. Imprimí los tres casos.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Espada de diamante\nNo alcanza el material\nSin material',
    initialCode: 'def craftear(material, cantidad):\n    pass  # Reemplazá pass con la lógica\n\nprint(craftear("diamante", 3))\nprint(craftear("hierro", 1))\nprint(craftear("madera", 0))',
    damage: 100,
    orderIndex: 0,
  },
  {
    id: 'c05-s2',
    bossId: 'maestro-craftero',
    title: 'Aplicar mejora',
    description: 'Definí `aplicar_mejora(stats, tipo)`. Recibe un diccionario `stats` con claves `"ataque"` y `"defensa"`, y un string `tipo`. Si `tipo == "ofensivo"` sumá 10 al ataque; si `tipo == "defensivo"` sumá 10 a la defensa. Retorná el diccionario modificado. Imprimí `ataque` y `defensa` del resultado.',
    type: 'python',
    tier: 'senior',
    expectedOutput: '35\n20',
    initialCode: 'def aplicar_mejora(stats, tipo):\n    pass  # Reemplazá pass con la lógica\n\npersonaje = {"ataque": 25, "defensa": 20}\nresultado = aplicar_mejora(personaje, "ofensivo")\nprint(resultado["ataque"])\nprint(resultado["defensa"])',
    damage: 105,
    orderIndex: 1,
  },
  {
    id: 'c05-s3',
    bossId: 'maestro-craftero',
    title: 'El contador de uso',
    description: 'Definí `usar_herramienta(durabilidad, usos)`. Restá `usos` a `durabilidad`. Si el resultado es <= 0, retorná `0` (no puede ser negativo). En caso contrario, retorná el valor restante. Imprimí los tres resultados.',
    type: 'python',
    tier: 'senior',
    expectedOutput: '70\n0\n0',
    initialCode: 'def usar_herramienta(durabilidad, usos):\n    pass  # Reemplazá pass con la lógica\n\nprint(usar_herramienta(100, 30))\nprint(usar_herramienta(100, 100))\nprint(usar_herramienta(50, 200))',
    damage: 105,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 06 · El Archivista · Listas de diccionarios / enumerate / sorted — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c06-s1',
    bossId: 'archivista',
    title: 'Reporte numerado',
    description: 'Usá `enumerate(inventario, start=1)` para imprimir cada ítem con su número de línea. El formato es `"N. nombre — tipo"`. Ordená primero el inventario por `nombre` con `sorted()` + `lambda`.',
    type: 'python',
    tier: 'senior',
    expectedOutput: '1. Arco — arma\n2. Espada — arma\n3. Poción — consumible',
    initialCode: 'inventario = [\n    {"nombre": "Espada", "tipo": "arma"},\n    {"nombre": "Poción", "tipo": "consumible"},\n    {"nombre": "Arco", "tipo": "arma"},\n]\n\n# sorted + enumerate(start=1)',
    damage: 105,
    orderIndex: 0,
  },
  {
    id: 'c06-s2',
    bossId: 'archivista',
    title: 'Total por categoría',
    description: 'Recorrés la lista y calculás la cantidad total de ítems de tipo `"arma"` y la total de tipo `"consumible"` usando acumuladores. Imprimí `"armas: X"` y `"consumibles: Y"`.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'armas: 66\nconsumibles: 77',
    initialCode: 'inventario = [\n    {"nombre": "Espada", "tipo": "arma", "cantidad": 1},\n    {"nombre": "Flecha", "tipo": "arma", "cantidad": 64},\n    {"nombre": "Arco", "tipo": "arma", "cantidad": 1},\n    {"nombre": "Manzana", "tipo": "consumible", "cantidad": 12},\n    {"nombre": "Poción", "tipo": "consumible", "cantidad": 5},\n    {"nombre": "Pan", "tipo": "consumible", "cantidad": 60},\n]\n\n# Contadores separados para armas y consumibles (sumar cantidad, no contar filas)',
    damage: 110,
    orderIndex: 1,
  },
  {
    id: 'c06-s3',
    bossId: 'archivista',
    title: 'Tabla con encabezado',
    description: 'Imprimí primero la línea `"ID | NOMBRE | MATERIAL"` como encabezado. Luego imprimí cada ítem como `"id | nombre | material"` usando `enumerate(inventario, start=1)` para el id.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'ID | NOMBRE | MATERIAL\n1 | Espada | diamante\n2 | Pico | hierro\n3 | Flecha | madera',
    initialCode: 'inventario = [\n    {"nombre": "Espada", "material": "diamante"},\n    {"nombre": "Pico", "material": "hierro"},\n    {"nombre": "Flecha", "material": "madera"},\n]\n\n# print del encabezado, luego enumerate(start=1)',
    damage: 110,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 07 · Constructor del Vacío · CREATE TABLE / INSERT INTO — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c07-s1',
    bossId: 'constructor-vacio',
    title: 'Tabla de héroes',
    description: 'Escribí el `CREATE TABLE heroes` con las columnas: `id INTEGER PRIMARY KEY`, `nombre TEXT NOT NULL`, `clase TEXT`, `nivel INTEGER DEFAULT 1`. Luego insertá al héroe `(1, \'Alex\', \'Guerrero\', 5)`. La verificación comprueba que el nombre y nivel son correctos.',
    type: 'sql',
    tier: 'senior',
    expectedOutput: 'Alex|5',
    verifySQL: 'SELECT nombre, nivel FROM heroes WHERE id = 1',
    initialCode: '-- CREATE TABLE y luego INSERT',
    damage: 110,
    orderIndex: 0,
  },
  {
    id: 'c07-s2',
    bossId: 'constructor-vacio',
    title: 'Carga masiva',
    description: 'Ya existe la tabla `items`. Insertá exactamente estos 4 ítems en un solo bloque `INSERT INTO ... VALUES (...), (...), (...), (...)`: `(1,\'Espada\',\'arma\')`, `(2,\'Pico\',\'herramienta\')`, `(3,\'Arco\',\'arma\')`, `(4,\'Manzana\',\'consumible\')`. La verificación cuenta cuántos hay de tipo `\'arma\'`.',
    type: 'sql',
    tier: 'senior',
    seedSQL: 'CREATE TABLE items (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT);',
    expectedOutput: '2',
    verifySQL: "SELECT COUNT(*) FROM items WHERE tipo = 'arma'",
    initialCode: '-- INSERT INTO con 4 valores en un solo bloque',
    damage: 115,
    orderIndex: 1,
  },
  {
    id: 'c07-s3',
    bossId: 'constructor-vacio',
    title: 'Tabla de puntajes',
    description: 'Creá la tabla `puntajes` con columnas `id INTEGER PRIMARY KEY`, `jugador TEXT`, `puntos INTEGER`, `fecha TEXT`. Insertá tres registros: `(1,\'Steve\',1500,\'2024-01-10\')`, `(2,\'Alex\',2300,\'2024-01-11\')`, `(3,\'Herobrine\',9999,\'2024-01-12\')`. La verificación retorna el nombre del jugador con más puntos.',
    type: 'sql',
    tier: 'senior',
    expectedOutput: 'Herobrine',
    verifySQL: 'SELECT jugador FROM puntajes ORDER BY puntos DESC LIMIT 1',
    initialCode: '-- CREATE TABLE y luego INSERT con los 3 registros',
    damage: 120,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 08 · Oráculo Oscuro · SELECT / WHERE / ORDER BY — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c08-s1',
    bossId: 'oraculo-oscuro',
    title: 'Los tres más poderosos',
    description: 'Seleccioná `nombre` y `poder` de los monstruos, ordenados por `poder` descendente. Retorná solo los 3 primeros usando `LIMIT`.',
    type: 'sql',
    tier: 'senior',
    seedSQL: `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, poder INTEGER);
INSERT INTO monstruos VALUES (1,'Zombie',15);
INSERT INTO monstruos VALUES (2,'Creeper',35);
INSERT INTO monstruos VALUES (3,'Enderman',50);
INSERT INTO monstruos VALUES (4,'Wither',95);
INSERT INTO monstruos VALUES (5,'Dragon',120);`,
    expectedOutput: 'Dragon|120\nWither|95\nEnderman|50',
    initialCode: 'SELECT nombre, poder\nFROM monstruos\n-- ORDER BY y LIMIT acá',
    damage: 120,
    orderIndex: 0,
  },
  {
    id: 'c08-s2',
    bossId: 'oraculo-oscuro',
    title: 'Búsqueda por nombre parcial',
    description: 'Seleccioná `nombre` y `material` de todos los ítems cuyo nombre empiece con la letra `\'E\'`. Usá `LIKE` con el patrón correcto. Ordená por nombre.',
    type: 'sql',
    tier: 'senior',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, cantidad INTEGER);
INSERT INTO cofre VALUES (1,'Espada','diamante',1);
INSERT INTO cofre VALUES (2,'Pico','hierro',1);
INSERT INTO cofre VALUES (3,'Escudo','diamante',1);
INSERT INTO cofre VALUES (4,'Flecha','madera',64);
INSERT INTO cofre VALUES (5,'Escalera','madera',16);`,
    expectedOutput: 'Escalera|madera\nEscudo|diamante\nEspada|diamante',
    initialCode: "SELECT nombre, material\nFROM cofre\nWHERE nombre LIKE '___'\nORDER BY nombre;",
    damage: 125,
    orderIndex: 1,
  },
  {
    id: 'c08-s3',
    bossId: 'oraculo-oscuro',
    title: 'Rango de cantidad',
    description: 'Seleccioná `nombre` y `cantidad` de los ítems donde `cantidad` esté entre 5 y 50 (inclusive) usando `BETWEEN`. Ordenalos por cantidad ascendente.',
    type: 'sql',
    tier: 'senior',
    seedSQL: `CREATE TABLE cofre (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER);
INSERT INTO cofre VALUES (1,'Flecha',64);
INSERT INTO cofre VALUES (2,'Piedra',32);
INSERT INTO cofre VALUES (3,'Antorcha',8);
INSERT INTO cofre VALUES (4,'Espada',1);
INSERT INTO cofre VALUES (5,'Pan',10);`,
    expectedOutput: 'Antorcha|8\nPan|10\nPiedra|32',
    initialCode: 'SELECT nombre, cantidad\nFROM cofre\nWHERE cantidad BETWEEN ___ AND ___\nORDER BY cantidad;',
    damage: 125,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 09 · Contador de Almas · COUNT / SUM / AVG / GROUP BY — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c09-s1',
    bossId: 'contador-almas',
    title: 'Promedio de HP por tipo',
    description: 'Calculá el promedio de `hp` por cada `tipo` de monstruo usando `AVG()` y `GROUP BY`. Usá `ROUND(valor, 0)` para redondear al entero más cercano. Ordená por tipo alfabéticamente.',
    type: 'sql',
    tier: 'senior',
    seedSQL: `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT, hp INTEGER);
INSERT INTO monstruos VALUES (1,'Creeper A','Creeper',30);
INSERT INTO monstruos VALUES (2,'Creeper B','Creeper',50);
INSERT INTO monstruos VALUES (3,'Zombie A','Zombie',20);
INSERT INTO monstruos VALUES (4,'Zombie B','Zombie',40);
INSERT INTO monstruos VALUES (5,'Zombie C','Zombie',30);`,
    expectedOutput: 'Creeper|40.0\nZombie|30.0',
    initialCode: 'SELECT tipo, ROUND(AVG(hp), 1)\nFROM monstruos\nGROUP BY tipo\nORDER BY tipo;',
    damage: 130,
    orderIndex: 0,
  },
  {
    id: 'c09-s2',
    bossId: 'contador-almas',
    title: 'Solo los grupos grandes',
    description: 'Agrupá por `tipo` y contá cuántos monstruos hay de cada tipo. Mostrá solo los tipos que tienen MÁS DE 2 monstruos usando `HAVING`. Ordená por tipo.',
    type: 'sql',
    tier: 'senior',
    seedSQL: `CREATE TABLE monstruos (id INTEGER PRIMARY KEY, nombre TEXT, tipo TEXT);
INSERT INTO monstruos VALUES (1,'Creeper A','Creeper');
INSERT INTO monstruos VALUES (2,'Creeper B','Creeper');
INSERT INTO monstruos VALUES (3,'Creeper C','Creeper');
INSERT INTO monstruos VALUES (4,'Zombie A','Zombie');
INSERT INTO monstruos VALUES (5,'Zombie B','Zombie');
INSERT INTO monstruos VALUES (6,'Esqueleto A','Esqueleto');`,
    expectedOutput: 'Creeper|3',
    initialCode: 'SELECT tipo, COUNT(*)\nFROM monstruos\nGROUP BY tipo\nHAVING COUNT(*) > 2\nORDER BY tipo;',
    damage: 135,
    orderIndex: 1,
  },
  {
    id: 'c09-s3',
    bossId: 'contador-almas',
    title: 'El jefe con más poder',
    description: 'Calculá la suma total de `poder` por `zona`. Solo incluí las zonas donde la suma total de poder sea mayor a 100. Mostrate `zona` y la suma como `total_poder`. Ordená por `total_poder` descendente.',
    type: 'sql',
    tier: 'senior',
    seedSQL: `CREATE TABLE jefes (id INTEGER PRIMARY KEY, nombre TEXT, zona TEXT, poder INTEGER);
INSERT INTO jefes VALUES (1,'Dragon','End',120);
INSERT INTO jefes VALUES (2,'Wither','Nether',80);
INSERT INTO jefes VALUES (3,'Guardian','Ocean',45);
INSERT INTO jefes VALUES (4,'Wither 2','Nether',60);
INSERT INTO jefes VALUES (5,'Blaze','Nether',30);`,
    expectedOutput: 'Nether|170\nEnd|120',
    initialCode: 'SELECT zona, SUM(poder) AS total_poder\nFROM jefes\nGROUP BY zona\nHAVING SUM(poder) > ___\nORDER BY total_poder DESC;',
    damage: 135,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 10 · El Falsificador · UPDATE / DELETE — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c10-s1',
    bossId: 'falsificador',
    title: 'Devaluar ítems comunes',
    description: 'Actualizá el `precio` de TODOS los ítems donde `material = \'madera\'`, reduciéndolo a la mitad (precio = precio / 2). Los demás ítems tienen que quedar igual.',
    type: 'sql',
    tier: 'senior',
    seedSQL: `CREATE TABLE mercado (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, precio INTEGER);
INSERT INTO mercado VALUES (1,'Palo','madera',20);
INSERT INTO mercado VALUES (2,'Tabla','madera',40);
INSERT INTO mercado VALUES (3,'Espada','hierro',150);
INSERT INTO mercado VALUES (4,'Arco','madera',60);`,
    expectedOutput: 'Palo|10\nTabla|20\nEspada|150\nArco|30',
    verifySQL: "SELECT nombre, precio FROM mercado ORDER BY id",
    initialCode: "UPDATE mercado\nSET precio = precio / 2\nWHERE material = 'madera';",
    damage: 140,
    orderIndex: 0,
  },
  {
    id: 'c10-s2',
    bossId: 'falsificador',
    title: 'Limpieza del mercado',
    description: 'Borrá todos los ítems cuya `cantidad` sea igual a 0. Los demás se quedan.',
    type: 'sql',
    tier: 'senior',
    seedSQL: `CREATE TABLE mercado (id INTEGER PRIMARY KEY, nombre TEXT, cantidad INTEGER);
INSERT INTO mercado VALUES (1,'Espada',1);
INSERT INTO mercado VALUES (2,'Pico',0);
INSERT INTO mercado VALUES (3,'Flecha',64);
INSERT INTO mercado VALUES (4,'Hacha',0);
INSERT INTO mercado VALUES (5,'Antorcha',16);`,
    expectedOutput: 'Espada|1\nFlecha|64\nAntorcha|16',
    verifySQL: "SELECT nombre, cantidad FROM mercado ORDER BY id",
    initialCode: 'DELETE FROM mercado\nWHERE cantidad = 0;',
    damage: 140,
    orderIndex: 1,
  },
  {
    id: 'c10-s3',
    bossId: 'falsificador',
    title: 'Promoción de temporada',
    description: 'Aplicá dos cambios en orden: primero actualizá el `precio` de los ítems de `\'diamante\'` aumentándolo un 50% (`precio = precio * 1.5`). Luego borrá todos los ítems con `precio > 400`.',
    type: 'sql',
    tier: 'senior',
    seedSQL: `CREATE TABLE mercado (id INTEGER PRIMARY KEY, nombre TEXT, material TEXT, precio INTEGER);
INSERT INTO mercado VALUES (1,'Espada','diamante',200);
INSERT INTO mercado VALUES (2,'Pico','diamante',300);
INSERT INTO mercado VALUES (3,'Casco','hierro',100);
INSERT INTO mercado VALUES (4,'Arco','madera',50);`,
    expectedOutput: 'Espada\nCasco\nArco',
    verifySQL: "SELECT nombre FROM mercado ORDER BY id",
    initialCode: '-- Dos sentencias separadas: UPDATE y luego DELETE',
    damage: 145,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 11 · El Nexo · Python + sqlite3 — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c11-s1',
    bossId: 'el-nexo',
    title: 'El sistema de monstruos',
    description: 'Usá `sqlite3` para crear la tabla `monstruos` con columnas `nombre TEXT` y `hp INTEGER`. Insertá los 3 monstruos de la lista con `executemany`. Consultá con `fetchall` y para cada monstruo imprimí `"nombre: hp HP"`.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Creeper: 30 HP\nZombie: 20 HP\nEnderman: 40 HP',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\n\nmonstruos = [("Creeper", 30), ("Zombie", 20), ("Enderman", 40)]\n\n# CREATE TABLE, executemany, SELECT y loop de impresión',
    damage: 145,
    orderIndex: 0,
  },
  {
    id: 'c11-s2',
    bossId: 'el-nexo',
    title: 'Filtro parametrizado',
    description: 'Con la tabla `inventario` cargada, pedí al sistema los ítems cuya `cantidad` sea mayor a un valor pasado como parámetro (no hardcodeado en la query). Imprimí los nombres de los ítems que cumplen la condición, uno por línea, en orden alfabético.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Flecha\nPiedra',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\nconn.commit()\n\nconn.commit()\nitems = [("Espada", 1), ("Flecha", 64), ("Piedra", 32), ("Antorcha", 4)]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", items)\nconn.commit()\n\nminimo = 10\n# SELECT con ? para el mínimo, ORDER BY nombre',
    damage: 150,
    orderIndex: 1,
  },
  {
    id: 'c11-s3',
    bossId: 'el-nexo',
    title: 'Resumen con agregación',
    description: 'Usá `sqlite3` en Python para calcular el total de `cantidad` de ítems de tipo `"arma"` con `SUM()`. Luego contá cuántos tipos distintos hay con `COUNT(DISTINCT tipo)`. Imprimí primero el total de armas y luego la cantidad de tipos distintos.',
    type: 'python',
    tier: 'senior',
    expectedOutput: '66\n3',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT, cantidad INTEGER)")\nconn.commit()\n\nconn.commit()\ndata = [("Espada","arma",2), ("Arco","arma",64), ("Pico","herramienta",3), ("Poción","consumible",10), ("Hacha","arma",0)]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?, ?)", data)\nconn.commit()\n\n# dos consultas: SUM(cantidad) WHERE tipo=arma y COUNT(DISTINCT tipo)',
    damage: 155,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 12 · La Hydra · Proyecto: agregar y listar — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c12-s1',
    bossId: 'la-hydra',
    title: 'Agregar con validación',
    description: 'Definí `agregar(nombre, cantidad)` que inserte el ítem solo si `cantidad > 0`. Si la cantidad es 0 o negativa, imprimí `"Cantidad inválida"` y no insertes. Luego listá todos los ítems insertados en orden alfabético como `"nombre: cantidad"`.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Cantidad inválida\nFlecha: 64\nPico: 3',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\nconn.commit()\n\ndef agregar(nombre, cantidad):\n    pass  # Validar y ejecutar INSERT\n\nagregar("Pico", 3)\nagregar("Flecha", 64)\nagregar("Espada", 0)\n\n# Listá los ítems ordenados por nombre',
    damage: 155,
    orderIndex: 0,
  },
  {
    id: 'c12-s2',
    bossId: 'la-hydra',
    title: 'Existe o crea',
    description: 'Definí `agregar_si_no_existe(nombre)` que solo inserte si no hay ya un ítem con ese nombre en la tabla. Si ya existe, imprimí `"Ya existe: nombre"`. Imprimí el total al final.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Ya existe: Espada\n2',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT)")\nconn.commit()\n\ndef agregar_si_no_existe(nombre):\n    pass  # SELECT para ver si existe, luego decide\n\nagregar_si_no_existe("Espada")\nagregar_si_no_existe("Pico")\nagregar_si_no_existe("Espada")  # duplicado\n\ncursor.execute("SELECT COUNT(*) FROM inventario")\nprint(cursor.fetchone()[0])\nconn.close()',
    damage: 160,
    orderIndex: 1,
  },
  {
    id: 'c12-s3',
    bossId: 'la-hydra',
    title: 'Listar con formato',
    description: 'Con la tabla cargada, definí `listar()` que consulte todos los ítems ordenados por `cantidad` descendente y los imprima como `"N. nombre (cantidad)"` usando `enumerate(start=1)`.',
    type: 'python',
    tier: 'senior',
    expectedOutput: '1. Flecha (64)\n2. Piedra (32)\n3. Espada (1)',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\ndata = [("Espada", 1), ("Flecha", 64), ("Piedra", 32)]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", data)\nconn.commit()\n\ndef listar():\n    pass  # SELECT + ORDER BY + enumerate(start=1)\n\nlistar()\nconn.close()',
    damage: 160,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 13 · Dragón Rojo · Proyecto: buscar, quitar, actualizar — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c13-s1',
    bossId: 'dragon-rojo',
    title: 'CRUD completo',
    description: 'Ya tenés las funciones `buscar`, `quitar` y `actualizar_cantidad`. Completá cada una para que pasen los tests. Salida esperada de la secuencia de llamadas.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Encontrado: Pico (x2)\nEspada eliminada\nPico actualizado: 10',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\ndata = [("Espada", 5), ("Pico", 2), ("Flecha", 64)]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?)", data)\nconn.commit()\n\ndef buscar(nombre):\n    cursor.execute("SELECT nombre, cantidad FROM inventario WHERE nombre = ?", (nombre,))\n    r = cursor.fetchone()\n    if r:\n        print(f"Encontrado: {r[0]} (x{r[1]})")\n    else:\n        print("No encontrado")\n\ndef quitar(nombre):\n    cursor.execute("DELETE FROM inventario WHERE nombre = ?", (nombre,))\n    conn.commit()\n    print(f"{nombre} eliminada")\n\ndef actualizar_cantidad(nombre, nueva_cantidad):\n    cursor.execute("UPDATE inventario SET cantidad = ? WHERE nombre = ?", (nueva_cantidad, nombre))\n    conn.commit()\n    print(f"{nombre} actualizado: {nueva_cantidad}")\n\nbuscar("Pico")\nquitar("Espada")\nactualizar_cantidad("Pico", 10)\nconn.close()',
    damage: 165,
    orderIndex: 0,
  },
  {
    id: 'c13-s2',
    bossId: 'dragon-rojo',
    title: 'Búsqueda parcial',
    description: 'Definí `buscar_por_letra(letra)` que use `LIKE` con `?` para buscar todos los ítems cuyo nombre empiece con esa letra. Imprimí los nombres en orden alfabético.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Escudo\nEspada',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT)")\ndata = [("Espada",), ("Pico",), ("Escudo",), ("Flecha",)]\ncursor.executemany("INSERT INTO inventario VALUES (?)", data)\nconn.commit()\n\ndef buscar_por_letra(letra):\n    patron = letra + "%"\n    cursor.execute("SELECT nombre FROM inventario WHERE nombre LIKE ? ORDER BY nombre", (patron,))\n    for row in cursor.fetchall():\n        print(row[0])\n\nbuscar_por_letra("E")\nconn.close()',
    damage: 165,
    orderIndex: 1,
  },
  {
    id: 'c13-s3',
    bossId: 'dragon-rojo',
    title: 'Actualizar o insertar',
    description: 'Definí `upsert(nombre, cantidad)`: si el ítem ya existe, actualizá su cantidad SUMANDO la nueva cantidad a la existente. Si no existe, insertalo. Probá la secuencia y al final listá todos como `"nombre: cantidad"` ordenados por nombre.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Espada: 8\nFlecha: 64\nPico: 5',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, cantidad INTEGER)")\nconn.commit()\n\ndef upsert(nombre, cantidad):\n    cursor.execute("SELECT cantidad FROM inventario WHERE nombre = ?", (nombre,))\n    r = cursor.fetchone()\n    if r:\n        # ya existe: sumar cantidad\n        pass\n    else:\n        # no existe: insertar\n        pass\n    conn.commit()\n\nupsert("Espada", 3)\nupsert("Flecha", 64)\nupsert("Espada", 5)  # suma a la existente → 8\nupsert("Pico", 5)\n\ncursor.execute("SELECT nombre, cantidad FROM inventario ORDER BY nombre")\nfor row in cursor.fetchall():\n    print(f"{row[0]}: {row[1]}")\nconn.close()',
    damage: 170,
    orderIndex: 2,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOSS 14 · El Arquitecto · Sistema completo integrado — SENIOR
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 'c14-s1',
    bossId: 'el-arquitecto',
    title: 'Sistema con reporte',
    description: 'Con la tabla `inventario` cargada, calculá: total de ítems (COUNT), suma total de `cantidad` (SUM) y el nombre del ítem con más cantidad. Imprimí los tres resultados.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Ítems distintos: 4\nCantidad total: 72\nÍtem más abundante: Flecha',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inventario (nombre TEXT, tipo TEXT, cantidad INTEGER)")\ndata = [\n    ("Espada","arma",1),\n    ("Arco","arma",5),\n    ("Flecha","arma",64),\n    ("Poción","consumible",2),\n]\ncursor.executemany("INSERT INTO inventario VALUES (?, ?, ?)", data)\nconn.commit()\n\n# Tres consultas: COUNT(*), SUM(cantidad), SELECT nombre ORDER BY cantidad DESC LIMIT 1',
    damage: 175,
    orderIndex: 0,
  },
  {
    id: 'c14-s2',
    bossId: 'el-arquitecto',
    title: 'El sistema completo',
    description: 'Creá las funciones `agregar`, `buscar`, `quitar` y `reporte`. `reporte` imprime la cantidad de ítems por tipo usando GROUP BY. Ejecutá la secuencia exacta para obtener la salida esperada.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Sistema iniciado\narma: 2\nconsumible: 1\nEspada encontrada (x1)\nPico eliminado\narma: 1\nconsumible: 1',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("CREATE TABLE inv (nombre TEXT, tipo TEXT, cantidad INTEGER)")\nconn.commit()\n\ndef agregar(nombre, tipo, cantidad):\n    cursor.execute("INSERT INTO inv VALUES (?, ?, ?)", (nombre, tipo, cantidad))\n    conn.commit()\n\ndef buscar(nombre):\n    cursor.execute("SELECT nombre, cantidad FROM inv WHERE nombre = ?", (nombre,))\n    r = cursor.fetchone()\n    print(f"{r[0]} encontrada (x{r[1]})" if r else "No encontrado")\n\ndef quitar(nombre):\n    cursor.execute("DELETE FROM inv WHERE nombre = ?", (nombre,))\n    conn.commit()\n    print(f"{nombre} eliminado")\n\ndef reporte():\n    cursor.execute("SELECT tipo, COUNT(*) FROM inv GROUP BY tipo ORDER BY tipo")\n    for tipo, cantidad in cursor.fetchall():\n        print(f"{tipo}: {cantidad}")\n\nagregar("Espada", "arma", 1)\nagregar("Pico", "arma", 2)\nagregar("Poción", "consumible", 5)\nprint("Sistema iniciado")\nreporte()\nbuscar("Espada")\nquitar("Pico")\nreporte()\nconn.close()',
    damage: 180,
    orderIndex: 1,
  },
  {
    id: 'c14-s3',
    bossId: 'el-arquitecto',
    title: 'El gran jefe final',
    description: 'Creá un sistema completo con la tabla `heroes` (id, nombre, clase, nivel, experiencia). Insertá 3 héroes. Definí `subir_nivel(nombre)`: si experiencia >= 100, aumentá nivel en 1 y restá 100 a la experiencia. Aplicalo a todos los héroes con experiencia suficiente. Imprimí el nombre y nivel final de cada héroe ordenado por nivel descendente.',
    type: 'python',
    tier: 'senior',
    expectedOutput: 'Herobrine: nivel 5\nAlex: nivel 3\nSteve: nivel 2',
    initialCode: 'import sqlite3\n\nconn = sqlite3.connect(":memory:")\ncursor = conn.cursor()\ncursor.execute("""\n    CREATE TABLE heroes (\n        id INTEGER PRIMARY KEY,\n        nombre TEXT,\n        clase TEXT,\n        nivel INTEGER,\n        experiencia INTEGER\n    )\n""")\ndata = [\n    (1, "Steve", "Guerrero", 2, 50),\n    (2, "Alex", "Arquera", 2, 150),\n    (3, "Herobrine", "Mago", 4, 200),\n]\ncursor.executemany("INSERT INTO heroes VALUES (?, ?, ?, ?, ?)", data)\nconn.commit()\n\ndef subir_nivel(nombre):\n    cursor.execute("SELECT nivel, experiencia FROM heroes WHERE nombre = ?", (nombre,))\n    r = cursor.fetchone()\n    if r and r[1] >= 100:\n        cursor.execute(\n            "UPDATE heroes SET nivel = nivel + 1, experiencia = experiencia - 100 WHERE nombre = ?",\n            (nombre,)\n        )\n        conn.commit()\n\n# Aplicá subir_nivel a los tres héroes\n# Luego consultá nombre y nivel ORDER BY nivel DESC',
    damage: 185,
    orderIndex: 2,
  },
]

export function getChallengesForBoss(bossId: string, tier: ChallengeTier = 'trainee'): Challenge[] {
  return CHALLENGES
    .filter((c) => c.bossId === bossId && c.tier === tier)
    .sort((a, b) => a.orderIndex - b.orderIndex)
}
