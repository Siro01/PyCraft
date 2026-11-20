// Apuntes con ejemplos visuales, paso a paso, para cada jefe.
// Complementan los diálogos de intro (que explican con palabras): acá se ve el código,
// qué líneas importan y qué sale en pantalla. Se abren desde Rodolfo o desde el jefe.

export type LessonLang = 'python' | 'sql'

export interface LessonTable {
  cols: string[]
  rows: (string | number)[][]
}

export interface LessonStep {
  title: string
  text: string
  code: string
  lang: LessonLang
  /** Líneas del código (desde 1) que se marcan en este paso. */
  highlight?: number[]
  /** Texto que "imprime" el ejemplo al ejecutarlo. */
  output?: string[]
  /** Resultado en forma de tabla (consultas SQL). */
  table?: LessonTable
  /** Aviso rojo al pie del paso. */
  warn?: string
}

export interface Lesson {
  bossId: string
  file: string
  /** Tabla de ejemplo sobre la que trabajan los pasos (jefes SQL). */
  context?: { label: string; table: LessonTable }
  steps: LessonStep[]
}

const COFRE_ITEMS: LessonTable = {
  cols: ['nombre', 'cantidad', 'material'],
  rows: [
    ['Espada', 1, 'diamante'],
    ['Antorcha', 16, 'madera'],
    ['Pico', 1, 'diamante'],
    ['Manzana', 8, 'comida'],
  ],
}

export const LESSONS: Record<string, Lesson> = {
  // ── 01 · Variables ─────────────────────────────────────────────────────────
  'creeper-formulario': {
    bossId: 'creeper-formulario',
    file: 'variables.py',
    steps: [
      {
        title: 'Una variable es una etiqueta',
        text: 'Escribís el nombre de la etiqueta, un signo = y el valor que guarda. Después podés usar la etiqueta cuando quieras.',
        lang: 'python',
        code: 'nombre_item = "Espada"\nprint(nombre_item)',
        highlight: [1],
        output: ['Espada'],
      },
      {
        title: 'Números sin comillas, texto con comillas',
        text: 'Los números van solos y se pueden sumar. El texto va entre comillas y se muestra tal cual.',
        lang: 'python',
        code: 'cantidad = 3\nmaterial = "diamante"\nprint(cantidad + 2)\nprint(material)',
        highlight: [1, 2],
        output: ['5', 'diamante'],
      },
      {
        title: 'Python sabe qué tipo de dato es',
        text: '3 es un número entero (int). "3" con comillas es texto (str). Parecen iguales, pero no se comportan igual.',
        lang: 'python',
        code: 'print(type(3))\nprint(type("3"))',
        output: ["<class 'int'>", "<class 'str'>"],
      },
      {
        title: 'Una variable puede cambiar',
        text: 'Le podés guardar un valor nuevo a la misma etiqueta. Acá tomamos el valor viejo, le sumamos 1 y lo volvemos a guardar.',
        lang: 'python',
        code: 'cantidad = 3\ncantidad = cantidad + 1\nprint(cantidad)',
        highlight: [2],
        output: ['4'],
      },
    ],
  },

  // ── 02 · Condicionales ─────────────────────────────────────────────────────
  'guardian-puerta': {
    bossId: 'guardian-puerta',
    file: 'condicionales.py',
    steps: [
      {
        title: 'if: si se cumple, hace algo',
        text: 'Python mira la condición. Si es verdadera, ejecuta las líneas con sangría (el espacio de la izquierda). Si no, las saltea.',
        lang: 'python',
        code: 'bloque = "diamante"\nif bloque == "diamante":\n    print("¡Pasá!")',
        highlight: [2, 3],
        output: ['¡Pasá!'],
      },
      {
        title: 'else: todo lo demás',
        text: 'else cubre lo que no entró en el if. Es el "si no".',
        lang: 'python',
        code: 'bloque = "tierra"\nif bloque == "diamante":\n    print("¡Pasá!")\nelse:\n    print("Atrás.")',
        highlight: [4, 5],
        output: ['Atrás.'],
      },
      {
        title: 'elif: más casos',
        text: 'Se revisan de arriba hacia abajo y solo se ejecuta el primero que se cumple. Los demás se saltean.',
        lang: 'python',
        code: 'bloque = "oro"\nif bloque == "diamante":\n    print("Pasá primero")\nelif bloque == "oro":\n    print("Pasá segundo")\nelse:\n    print("Atrás")',
        highlight: [4, 5],
        output: ['Pasá segundo'],
      },
      {
        title: 'Comparar no es guardar',
        text: 'Un = guarda un valor. Dos == comparan y devuelven True (verdadero) o False (falso).',
        lang: 'python',
        code: 'cantidad = 5\nprint(cantidad == 5)\nprint(cantidad > 10)',
        highlight: [2, 3],
        output: ['True', 'False'],
      },
    ],
  },

  // ── 03 · Bucles ────────────────────────────────────────────────────────────
  'golem-infinito': {
    bossId: 'golem-infinito',
    file: 'bucles.py',
    steps: [
      {
        title: 'for: repite una cantidad exacta',
        text: 'range(3) genera 0, 1 y 2. El bloque con sangría se repite una vez por cada número.',
        lang: 'python',
        code: 'for golpe in range(3):\n    print("Golpe", golpe)',
        highlight: [1],
        output: ['Golpe 0', 'Golpe 1', 'Golpe 2'],
      },
      {
        title: 'for también recorre listas',
        text: 'En cada vuelta, la variable toma el siguiente elemento de la lista.',
        lang: 'python',
        code: 'bloques = ["piedra", "tierra", "oro"]\nfor b in bloques:\n    print(b)',
        highlight: [2, 3],
        output: ['piedra', 'tierra', 'oro'],
      },
      {
        title: 'while: repite mientras se cumpla',
        text: 'Como el pico: se sigue usando mientras la durabilidad sea mayor a 0. Cada vuelta gasta 1.',
        lang: 'python',
        code: 'durabilidad = 3\nwhile durabilidad > 0:\n    print("Picando...", durabilidad)\n    durabilidad = durabilidad - 1\nprint("Se rompió")',
        highlight: [2, 4],
        output: ['Picando... 3', 'Picando... 2', 'Picando... 1', 'Se rompió'],
      },
      {
        title: 'Cuidado con el bucle infinito',
        text: 'Si la condición nunca deja de cumplirse, el bucle no termina. Siempre tiene que haber algo que la cambie.',
        lang: 'python',
        code: 'durabilidad = 3\nwhile durabilidad > 0:\n    print("Picando...")',
        highlight: [2],
        output: ['Picando...', 'Picando...', 'Picando...', '(¡nunca termina!)'],
        warn: 'Falta la línea que baja la durabilidad: la condición siempre es verdadera.',
      },
    ],
  },

  // ── 04 · Listas de diccionarios ────────────────────────────────────────────
  'mercader-abismo': {
    bossId: 'mercader-abismo',
    file: 'diccionarios.py',
    steps: [
      {
        title: 'Un diccionario es una tarjeta',
        text: 'Cada dato tiene un nombre (la clave) y un valor. Para leer uno, escribís la clave entre corchetes.',
        lang: 'python',
        code: 'item = {"nombre": "Espada", "cantidad": 3, "material": "diamante"}\nprint(item["nombre"])',
        highlight: [2],
        output: ['Espada'],
      },
      {
        title: 'Se puede modificar',
        text: 'Asignás un valor nuevo a esa clave y la tarjeta se actualiza.',
        lang: 'python',
        code: 'item = {"nombre": "Espada", "cantidad": 3}\nitem["cantidad"] = 4\nprint(item["cantidad"])',
        highlight: [2],
        output: ['4'],
      },
      {
        title: 'Una lista de tarjetas es un cofre',
        text: 'Los ítems se numeran desde 0. cofre[1] es el segundo, y ["nombre"] lee su campo.',
        lang: 'python',
        code: 'cofre = [\n    {"nombre": "Espada", "cantidad": 1},\n    {"nombre": "Antorcha", "cantidad": 16},\n]\nprint(cofre[1]["nombre"])',
        highlight: [5],
        output: ['Antorcha'],
      },
      {
        title: 'Recorrer el cofre con for',
        text: 'El for que ya conocés pasa por cada tarjeta, y adentro leés los campos que quieras.',
        lang: 'python',
        code: 'for item in cofre:\n    print(item["nombre"], item["cantidad"])',
        highlight: [1, 2],
        output: ['Espada 1', 'Antorcha 16'],
      },
    ],
  },

  // ── 05 · Funciones ─────────────────────────────────────────────────────────
  'maestro-craftero': {
    bossId: 'maestro-craftero',
    file: 'funciones.py',
    steps: [
      {
        title: 'Una función es una receta',
        text: 'La definís una vez con def y la usás todas las veces que quieras, escribiendo su nombre con paréntesis.',
        lang: 'python',
        code: 'def saludar():\n    print("¡Hola, aprendiz!")\n\nsaludar()\nsaludar()',
        highlight: [1, 2, 4, 5],
        output: ['¡Hola, aprendiz!', '¡Hola, aprendiz!'],
      },
      {
        title: 'Los parámetros son los ingredientes',
        text: 'Lo que va entre paréntesis en def son datos que la función recibe. Cada llamada puede pasarle cosas distintas.',
        lang: 'python',
        code: 'def agregar_item(lista_cofre, nuevo_item):\n    lista_cofre.append(nuevo_item)\n\ncofre = []\nagregar_item(cofre, "Espada")\nprint(cofre)',
        highlight: [1, 5],
        output: ["['Espada']"],
      },
      {
        title: 'return devuelve un resultado',
        text: 'Con return la función te entrega un valor que podés guardar en una variable.',
        lang: 'python',
        code: 'def doble(n):\n    return n * 2\n\nresultado = doble(4)\nprint(resultado)',
        highlight: [2, 4],
        output: ['8'],
      },
    ],
  },

  // ── 06 · De listas a tablas ────────────────────────────────────────────────
  'archivista': {
    bossId: 'archivista',
    file: 'tablas.py',
    steps: [
      {
        title: 'Cada diccionario es una fila',
        text: 'Si dibujás la lista de diccionarios en papel, sale una tabla: las claves son las columnas y cada tarjeta es una fila.',
        lang: 'python',
        code: 'cofre = [\n    {"id": 1, "nombre": "Espada", "cantidad": 1},\n    {"id": 2, "nombre": "Antorcha", "cantidad": 16},\n]',
        highlight: [2, 3],
        table: {
          cols: ['id', 'nombre', 'cantidad'],
          rows: [[1, 'Espada', 1], [2, 'Antorcha', 16]],
        },
      },
      {
        title: 'El id identifica cada fila',
        text: 'Dos ítems pueden llamarse igual, pero el id es único para cada uno. Eso se llama clave primaria.',
        lang: 'python',
        code: 'for item in cofre:\n    print(item["id"], item["nombre"])',
        highlight: [2],
        output: ['1 Espada', '2 Antorcha'],
      },
      {
        title: 'Python no controla los ids repetidos',
        text: 'Podés agregar un ítem con un id que ya existe y Python no se queja. En la próxima clase vas a ver que la base de datos sí lo prohíbe.',
        lang: 'python',
        code: 'cofre.append({"id": 1, "nombre": "Pico", "cantidad": 1})\nfor item in cofre:\n    print(item["id"], item["nombre"])',
        highlight: [1],
        output: ['1 Espada', '2 Antorcha', '1 Pico'],
        warn: 'Hay dos ítems con id 1: ya no se sabe cuál es cuál.',
      },
    ],
  },

  // ── 07 · CREATE TABLE · INSERT INTO ────────────────────────────────────────
  'constructor-vacio': {
    bossId: 'constructor-vacio',
    file: 'crear.sql',
    steps: [
      {
        title: 'CREATE TABLE arma la estructura',
        text: 'Le ponés nombre a la tabla y describís cada columna con su tipo. Sin estructura no hay datos.',
        lang: 'sql',
        code: 'CREATE TABLE cofre (\n  id INTEGER PRIMARY KEY,\n  nombre TEXT,\n  cantidad INTEGER\n);',
        highlight: [1, 2],
        output: ['Tabla "cofre" creada (0 filas)'],
      },
      {
        title: 'INSERT INTO agrega una fila',
        text: 'VALUES lleva los datos en el mismo orden que las columnas. El texto va entre comillas simples.',
        lang: 'sql',
        code: "INSERT INTO cofre VALUES (1, 'Espada', 3);",
        highlight: [1],
        output: ['1 fila agregada'],
      },
      {
        title: 'SELECT * muestra lo que hay',
        text: 'El asterisco significa "todas las columnas". Así comprobás que la fila quedó guardada.',
        lang: 'sql',
        code: 'SELECT * FROM cofre;',
        table: { cols: ['id', 'nombre', 'cantidad'], rows: [[1, 'Espada', 3]] },
      },
      {
        title: 'La base cuida el id por vos',
        text: 'Si intentás guardar otra fila con el mismo id, SQL la rechaza. No tenés que programar esa regla.',
        lang: 'sql',
        code: "INSERT INTO cofre VALUES (1, 'Pico', 1);",
        highlight: [1],
        output: ['Error: UNIQUE constraint failed: cofre.id'],
        warn: 'El id 1 ya existe. Probá con el 2.',
      },
    ],
  },

  // ── 08 · SELECT · WHERE · ORDER BY ─────────────────────────────────────────
  'oraculo-oscuro': {
    bossId: 'oraculo-oscuro',
    file: 'consultas.sql',
    context: { label: 'Tabla cofre', table: COFRE_ITEMS },
    steps: [
      {
        title: 'Elegí las columnas que querés ver',
        text: 'En vez de *, escribís los nombres de las columnas separados por comas.',
        lang: 'sql',
        code: 'SELECT nombre, cantidad FROM cofre;',
        highlight: [1],
        table: {
          cols: ['nombre', 'cantidad'],
          rows: [['Espada', 1], ['Antorcha', 16], ['Pico', 1], ['Manzana', 8]],
        },
      },
      {
        title: 'WHERE filtra las filas',
        text: 'Solo aparecen las filas que cumplen la condición. En Python harías un for con un if; acá es una línea.',
        lang: 'sql',
        code: "SELECT nombre FROM cofre\nWHERE material = 'diamante';",
        highlight: [2],
        table: { cols: ['nombre'], rows: [['Espada'], ['Pico']] },
      },
      {
        title: 'ORDER BY ordena el resultado',
        text: 'DESC es de mayor a menor. Sin DESC ordena de menor a mayor.',
        lang: 'sql',
        code: 'SELECT nombre, cantidad FROM cofre\nORDER BY cantidad DESC;',
        highlight: [2],
        table: {
          cols: ['nombre', 'cantidad'],
          rows: [['Antorcha', 16], ['Manzana', 8], ['Espada', 1], ['Pico', 1]],
        },
      },
      {
        title: 'LIMIT se queda con los primeros',
        text: 'Combinado con ORDER BY, te da el "top": acá los 2 ítems que más hay.',
        lang: 'sql',
        code: 'SELECT nombre, cantidad FROM cofre\nORDER BY cantidad DESC\nLIMIT 2;',
        highlight: [3],
        table: { cols: ['nombre', 'cantidad'], rows: [['Antorcha', 16], ['Manzana', 8]] },
      },
    ],
  },

  // ── 09 · COUNT · SUM · AVG · GROUP BY ──────────────────────────────────────
  'contador-almas': {
    bossId: 'contador-almas',
    file: 'resumenes.sql',
    context: {
      label: 'Tabla cofre',
      table: {
        cols: ['nombre', 'tipo', 'cantidad'],
        rows: [
          ['Espada', 'arma', 1],
          ['Hacha', 'arma', 1],
          ['Antorcha', 'luz', 16],
          ['Linterna', 'luz', 4],
          ['Manzana', 'comida', 8],
        ],
      },
    },
    steps: [
      {
        title: 'COUNT cuenta filas',
        text: 'COUNT(*) responde "¿cuántas filas hay?". No importa qué contienen.',
        lang: 'sql',
        code: 'SELECT COUNT(*) FROM cofre;',
        highlight: [1],
        table: { cols: ['COUNT(*)'], rows: [[5]] },
      },
      {
        title: 'SUM suma números',
        text: 'Suma todos los valores de una columna. Es el for con total += cantidad, pero resuelto.',
        lang: 'sql',
        code: 'SELECT SUM(cantidad) FROM cofre;',
        highlight: [1],
        table: { cols: ['SUM(cantidad)'], rows: [[30]] },
      },
      {
        title: 'AVG calcula el promedio',
        text: '30 ítems repartidos en 5 filas dan un promedio de 6.',
        lang: 'sql',
        code: 'SELECT AVG(cantidad) FROM cofre;',
        highlight: [1],
        table: { cols: ['AVG(cantidad)'], rows: [[6.0]] },
      },
      {
        title: 'GROUP BY calcula por grupo',
        text: 'Junta todas las filas con el mismo tipo y hace la cuenta para cada grupo. Una línea reemplaza varios if.',
        lang: 'sql',
        code: 'SELECT tipo, SUM(cantidad) FROM cofre\nGROUP BY tipo;',
        highlight: [2],
        table: {
          cols: ['tipo', 'SUM(cantidad)'],
          rows: [['arma', 2], ['comida', 8], ['luz', 20]],
        },
      },
    ],
  },

  // ── 10 · UPDATE · DELETE ───────────────────────────────────────────────────
  'falsificador': {
    bossId: 'falsificador',
    file: 'modificar.sql',
    context: {
      label: 'Tabla cofre',
      table: {
        cols: ['id', 'nombre', 'cantidad'],
        rows: [[1, 'Lingote de hierro', 5], [2, 'Espada', 1], [3, 'Pico', 1]],
      },
    },
    steps: [
      {
        title: 'UPDATE modifica una fila',
        text: 'SET dice qué cambiar y WHERE dice a qué fila. Acá descontamos un lingote de hierro.',
        lang: 'sql',
        code: "UPDATE cofre\nSET cantidad = cantidad - 1\nWHERE nombre = 'Lingote de hierro';",
        highlight: [2, 3],
        output: ['1 fila modificada'],
        table: {
          cols: ['id', 'nombre', 'cantidad'],
          rows: [[1, 'Lingote de hierro', 4], [2, 'Espada', 1], [3, 'Pico', 1]],
        },
      },
      {
        title: 'Primero mirá con un SELECT',
        text: 'Corré un SELECT con el mismo WHERE para ver qué filas vas a tocar. Si es la que esperabas, seguís.',
        lang: 'sql',
        code: 'SELECT * FROM cofre\nWHERE id = 3;',
        highlight: [2],
        table: { cols: ['id', 'nombre', 'cantidad'], rows: [[3, 'Pico', 1]] },
      },
      {
        title: 'DELETE borra la fila',
        text: 'Con el mismo WHERE que probaste antes, borrás solo esa fila.',
        lang: 'sql',
        code: 'DELETE FROM cofre\nWHERE id = 3;',
        highlight: [2],
        output: ['1 fila borrada'],
        table: {
          cols: ['id', 'nombre', 'cantidad'],
          rows: [[1, 'Lingote de hierro', 4], [2, 'Espada', 1]],
        },
      },
      {
        title: 'Sin WHERE se borra TODO',
        text: 'Es el error más común con datos reales. Antes de ejecutar un DELETE o un UPDATE, revisá que tenga su WHERE.',
        lang: 'sql',
        code: 'DELETE FROM cofre;',
        highlight: [1],
        output: ['3 filas borradas'],
        table: { cols: ['id', 'nombre', 'cantidad'], rows: [] },
        warn: 'La tabla quedó vacía. Esto no se puede deshacer.',
      },
    ],
  },

  // ── 11 · Python + SQL: la máquina sql() ─────────────────────────────────────
  'el-nexo': {
    bossId: 'el-nexo',
    file: 'nexo.py',
    steps: [
      {
        title: "sql() es la máquina",
        text: "La máquina del Nexo ya está hecha: le pasás una orden SQL y la ejecuta. La orden va entre \"\"\", escrita como siempre.",
        lang: 'python',
        code: "sql(\"\"\"\n    CREATE TABLE mobs (\n        nombre TEXT,\n        vida INTEGER\n    )\n\"\"\")",
        highlight: [1],
        output: ["(tabla mobs creada)"],
      },
      {
        title: "Guardar varias filas",
        text: "Un INSERT con varias filas en VALUES. Los textos de adentro del SQL van con comillas simples.",
        lang: 'python',
        code: "sql(\"\"\"\n    INSERT INTO mobs (nombre, vida)\n    VALUES\n        ('Zombie', 4),\n        ('Creeper', 6)\n\"\"\")",
        highlight: [4, 5],
        output: ["(2 mobs guardados)"],
        warn: "Sin comillas simples, SQL cree que Zombie es una columna.",
      },
      {
        title: "SELECT devuelve una lista",
        text: "sql() devuelve una lista de diccionarios, como en el Archivista: cada fila es un diccionario.",
        lang: 'python',
        code: "mobs = sql(\"\"\"\n    SELECT *\n    FROM mobs\n\"\"\")\nprint(mobs)",
        highlight: [5],
        output: ["[{'nombre': 'Zombie', 'vida': 4}, {'nombre': 'Creeper', 'vida': 6}]"],
      },
      {
        title: "Un for y listo",
        text: "Con un for recorrés la lista. Cada mob es un diccionario: mob[\"nombre\"], mob[\"vida\"].",
        lang: 'python',
        code: "for mob in mobs:\n    print(mob[\"nombre\"], \"#\" * mob[\"vida\"])",
        highlight: [2],
        output: ["Zombie ####", "Creeper ######"],
      },
    ],
  },

  // ── 12 · agregar() y listar() ───────────────────────────────────────────────
  'la-hydra': {
    bossId: 'la-hydra',
    file: 'hydra.py',
    steps: [
      {
        title: "agregar(): una función que guarda",
        text: "Con f\"\"\" las variables entran al SQL entre llaves. El texto lleva además comillas simples: '{nombre}'.",
        lang: 'python',
        code: "sql(\"\"\"\n    CREATE TABLE cabezas (\n        nombre TEXT,\n        poder INTEGER\n    )\n\"\"\")\n\ndef agregar(nombre, poder):\n    sql(f\"\"\"\n        INSERT INTO cabezas (nombre, poder)\n        VALUES\n            ('{nombre}', {poder})\n    \"\"\")",
        highlight: [9, 12],
        output: ["(se define la función, todavía no hace nada)"],
      },
      {
        title: "Llamar a agregar()",
        text: "Cada vez que llamás a agregar() se guarda una fila nueva.",
        lang: 'python',
        code: "agregar(\"Fuego\", 7)\nagregar(\"Hielo\", 4)\nagregar(\"Rayo\", 9)",
        highlight: [1, 2, 3],
        output: ["(3 cabezas guardadas)"],
      },
      {
        title: "listar(): todo en orden",
        text: "ORDER BY ordena. Con DESC, de mayor a menor.",
        lang: 'python',
        code: "def listar():\n    cabezas = sql(\"\"\"\n        SELECT *\n        FROM cabezas\n        ORDER BY poder DESC\n    \"\"\")\n    for cabeza in cabezas:\n        print(cabeza[\"nombre\"], \"#\" * cabeza[\"poder\"])\n\nlistar()",
        highlight: [5, 8],
        output: ["Rayo #########", "Fuego #######", "Hielo ####"],
      },
      {
        title: "SQL trae, Python suma",
        text: "Un acumulador arranca en 0 y suma en cada vuelta del for.",
        lang: 'python',
        code: "total = 0\nfor cabeza in sql(\"SELECT * FROM cabezas\"):\n    total = total + cabeza[\"poder\"]\nprint(\"Poder total:\", total)",
        highlight: [3],
        output: ["Poder total: 20"],
      },
    ],
  },

  // ── 13 · buscar, actualizar y borrar ────────────────────────────────────────
  'dragon-rojo': {
    bossId: 'dragon-rojo',
    file: 'dragon.py',
    steps: [
      {
        title: "buscar(): WHERE con una variable",
        text: "Si no encuentra nada, sql() devuelve una lista vacía y len() da 0. Así sabés si está o no.",
        lang: 'python',
        code: "cargar_ejemplo(\"cofre\")\n\ndef buscar(nombre):\n    encontrados = sql(f\"\"\"\n        SELECT *\n        FROM cofre\n        WHERE nombre = '{nombre}'\n    \"\"\")\n    if len(encontrados) > 0:\n        print(\"Encontrado:\", nombre)\n    else:\n        print(\"No está:\", nombre)\n\nbuscar(\"Oro\")\nbuscar(\"Corona\")",
        highlight: [7, 9],
        output: ["Encontrado: Oro", "No está: Corona"],
      },
      {
        title: "UPDATE: cambiar lo que ya está",
        text: "cantidad - 10 le resta 10 a lo que tenía. ¡Sin WHERE cambia todas las filas!",
        lang: 'python',
        code: "sql(\"\"\"\n    UPDATE cofre\n    SET cantidad = cantidad - 2\n    WHERE nombre = 'Oro'\n\"\"\")\nprint(sql(\"SELECT * FROM cofre WHERE nombre = 'Oro'\"))",
        highlight: [3, 4],
        output: ["[{'nombre': 'Oro', 'cantidad': 5}]"],
      },
      {
        title: "DELETE: llevarse algo",
        text: "DELETE borra las filas que cumplen el WHERE. Un SELECT después muestra lo que quedó.",
        lang: 'python',
        code: "sql(\"\"\"\n    DELETE FROM cofre\n    WHERE nombre = 'Hierro'\n\"\"\")\nprint(\"Quedan\", len(sql(\"SELECT * FROM cofre\")), \"cosas\")",
        highlight: [2, 3],
        output: ["Quedan 2 cosas"],
        warn: "Antes de borrar, preguntá con input() si está seguro.",
      },
    ],
  },
  // ── 14 · El examen del Arquitecto ─────────────────────────────────────────
  'el-arquitecto': {
    bossId: 'el-arquitecto',
    file: 'examen.py',
    steps: [
      {
        title: "Cinco ecos, un examen",
        text: "El Arquitecto revive a los jefes que venciste. Cada ataque repasa una parte del viaje: Acto I, Acto II, Nexo e Hydra, Dragón y tu proyecto.",
        lang: 'python',
        code: "mochila = [\"Espada\", \"Manzana\", \"Manzana\"]\nmanzanas = 0\nfor cosa in mochila:\n    if cosa == \"Manzana\":\n        manzanas = manzanas + 1\nprint(manzanas)",
        highlight: [4, 5],
        output: ["2"],
      },
      {
        title: "El SQL de siempre, adentro de sql()",
        text: "WHERE y ORDER BY se escriben igual que en el Acto II. Python recorre la lista que vuelve.",
        lang: 'python',
        code: "cargar_ejemplo(\"mobs\")\nfuertes = sql(\"\"\"\n    SELECT *\n    FROM mobs\n    WHERE vida > 3\n    ORDER BY vida DESC\n\"\"\")\nfor mob in fuertes:\n    print(mob[\"nombre\"], mob[\"vida\"])",
        highlight: [5, 6],
        output: ["Creeper 6", "Zombie 4"],
      },
      {
        title: "Fabricar y arreglar cartas",
        text: "agregar() guarda con f-string. UPDATE baja la carta que pasa el tope; DELETE borra la que sobra.",
        lang: 'python',
        code: "sql(\"CREATE TABLE cartas (nombre TEXT, poder INTEGER)\")\nsql(\"INSERT INTO cartas VALUES ('Gato ninja', 8)\")\nsql(\"\"\"\n    UPDATE cartas\n    SET poder = 6\n    WHERE poder > 6\n\"\"\")\nprint(sql(\"SELECT * FROM cartas\"))",
        highlight: [4, 5, 6],
        output: ["[{'nombre': 'Gato ninja', 'poder': 6}]"],
        warn: "¡Sin WHERE, el UPDATE cambia todas las cartas!",
      },
      {
        title: "Tu carta contra la mía",
        text: "carta(fila) devuelve el texto de la carta. Con ORDER BY poder DESC, mazo[0] es la más fuerte.",
        lang: 'python',
        code: "def carta(fila):\n    return \"| \" + fila[\"nombre\"] + \" \" + \"#\" * fila[\"poder\"]\n\nmazo = sql(\"SELECT * FROM cartas ORDER BY poder DESC\")\nprint(carta(mazo[0]))",
        highlight: [2, 4, 5],
        output: ["| Gato ninja ######"],
      },
    ],
  },
}

export function getLesson(bossId: string): Lesson | undefined {
  return LESSONS[bossId]
}
