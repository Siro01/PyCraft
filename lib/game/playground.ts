// Contenido del Patio de Juegos — minijuegos opcionales, más cortos que un
// jefe y sin Mercader, para practicar los temas de cada acto fuera de una
// batalla. Por ahora solo está armado el Acto I (fundamentos de Python);
// los demás actos se agregan más adelante.

export type PlaygroundExerciseType = 'mcq' | 'fill'

export interface PlaygroundExercise {
  id: string
  type: PlaygroundExerciseType
  /** Fragmento de código opcional, mostrado en un bloque tipo editor. */
  code?: string
  prompt: string
  /** Solo para 'mcq'. */
  options?: string[]
  /** Respuesta correcta: el texto exacto de la opción, o el string esperado en 'fill'. */
  answer: string
  /** Se muestra después de responder, acierte o no. */
  explain: string
}

export interface PlaygroundTopic {
  key: string
  title: string
  /** Ícono del catálogo de BossTopicIcon (mismo lenguaje visual que el mapa). */
  icon: string
  blurb: string
  exercises: PlaygroundExercise[]
}

export interface PlaygroundAct {
  actKey: string
  title: string
  topics: PlaygroundTopic[]
}

export const PLAYGROUND_ACTS: PlaygroundAct[] = [
  {
    actKey: 'python',
    title: 'Python',
    topics: [
      {
        key: 'variables',
        title: 'Variables y tipos',
        icon: 'tag',
        blurb: 'Etiquetas con un valor adentro — texto, número entero o decimal.',
        exercises: [
          {
            id: 'var-1',
            type: 'mcq',
            code: `nombre_item = "Espada de diamante"`,
            prompt: '¿Qué tipo de dato es nombre_item?',
            options: ['str (texto)', 'int (entero)', 'float (decimal)', 'bool (verdadero/falso)'],
            answer: 'str (texto)',
            explain: 'Todo lo que va entre comillas es str — aunque adentro tenga números, como "1561".',
          },
          {
            id: 'var-2',
            type: 'fill',
            code: `cantidad = 5`,
            prompt: 'Escribí el tipo de dato de cantidad (una palabra, en inglés).',
            answer: 'int',
            explain: 'Un número sin coma decimal es int (entero).',
          },
          {
            id: 'var-3',
            type: 'mcq',
            prompt: '¿Cuál variable guarda correctamente el precio 12.5 de una poción?',
            options: ['precio = 12.5', 'precio = "12.5"', 'precio = 12,5', 'precio = doce.cinco'],
            answer: 'precio = 12.5',
            explain: 'Python usa punto para decimales, no coma, y sin comillas si querés que sea un número (float).',
          },
          {
            id: 'var-4',
            type: 'mcq',
            code: `esta_encantada = True`,
            prompt: '¿Qué tipo de dato es esta_encantada?',
            options: ['bool (verdadero/falso)', 'str (texto)', 'int (entero)', 'float (decimal)'],
            answer: 'bool (verdadero/falso)',
            explain: 'True y False (con mayúscula, sin comillas) son del tipo bool.',
          },
        ],
      },
      {
        key: 'print',
        title: 'print() y f-strings',
        icon: 'print',
        blurb: 'Mostrar en pantalla lo que hace tu programa.',
        exercises: [
          {
            id: 'print-1',
            type: 'mcq',
            code: `print("Vida:", 20)`,
            prompt: '¿Qué imprime esta línea?',
            options: ['Vida: 20', 'Vida:20', 'Vida", 20', 'Da error'],
            answer: 'Vida: 20',
            explain: 'print() separa cada dato con una coma agregando un espacio automáticamente.',
          },
          {
            id: 'print-2',
            type: 'fill',
            prompt: 'Completá el f-string para que muestre el valor de la variable nombre: print(f"Hola, {____}")',
            answer: 'nombre',
            explain: 'Dentro de las llaves {} de un f-string va el nombre de la variable, sin comillas.',
          },
          {
            id: 'print-3',
            type: 'mcq',
            code: `nombre = "Steve"\ncantidad = 3\nprint(f"{nombre} tiene {cantidad} diamantes")`,
            prompt: '¿Qué imprime este código?',
            options: ['Steve tiene 3 diamantes', '{nombre} tiene {cantidad} diamantes', 'nombre tiene cantidad diamantes', 'Da error'],
            answer: 'Steve tiene 3 diamantes',
            explain: 'El f-string reemplaza cada {variable} por su valor actual.',
          },
          {
            id: 'print-4',
            type: 'mcq',
            prompt: '¿Cuál es la forma correcta de imprimir dos variables juntas, a y b?',
            options: ['print(a, b)', 'print[a, b]', 'print(a; b)', 'print a, b'],
            answer: 'print(a, b)',
            explain: 'print() siempre lleva paréntesis, y varios valores se separan con comas adentro.',
          },
        ],
      },
      {
        key: 'input',
        title: 'input() y conversión',
        icon: 'input',
        blurb: 'Preguntarle algo al jugador mientras el programa corre.',
        exercises: [
          {
            id: 'input-1',
            type: 'fill',
            prompt: 'input() siempre devuelve un dato de tipo ____ (una palabra, en inglés), aunque el jugador escriba un número.',
            answer: 'str',
            explain: 'Por eso hay que convertirlo con int() o float() antes de hacer cuentas con él.',
          },
          {
            id: 'input-2',
            type: 'fill',
            code: `madera = int(input("¿Cuánta madera tenés? "))`,
            prompt: '¿Qué función convierte el texto de input() en un número entero?',
            answer: 'int',
            explain: 'int(input(...)) es el combo clásico para pedir un número entero.',
          },
          {
            id: 'input-3',
            type: 'mcq',
            code: `edad = input("¿Cuántos años tenés? ")\nprint(edad + 1)`,
            prompt: 'El jugador escribe 12. ¿Qué pasa al ejecutar la segunda línea?',
            options: ['Da error (TypeError)', 'Imprime 13', 'Imprime "121"', 'Imprime "12 + 1"'],
            answer: 'Da error (TypeError)',
            explain: 'edad es texto ("12"), y texto + número no se puede sumar directo — Python tira TypeError.',
          },
          {
            id: 'input-4',
            type: 'mcq',
            prompt: 'Querés leer el peso de un ítem con decimales, como 2.5. ¿Qué línea usás?',
            options: [
              'peso = float(input("Peso: "))',
              'peso = input("Peso: ")',
              'peso = int(input("Peso: "))',
              'peso = str(input("Peso: "))',
            ],
            answer: 'peso = float(input("Peso: "))',
            explain: 'float() convierte el texto en un número con decimales.',
          },
        ],
      },
      {
        key: 'condicionales',
        title: 'if / elif / else',
        icon: 'branch',
        blurb: 'Reaccionar distinto según lo que encontraste.',
        exercises: [
          {
            id: 'if-1',
            type: 'mcq',
            code: `bloque = "piedra"\nif bloque == "diamante":\n    print("¡Wow!")\nelif bloque == "piedra":\n    print("Sirve para construir")\nelse:\n    print("No sé qué es")`,
            prompt: '¿Qué se imprime?',
            options: ['Sirve para construir', '¡Wow!', 'No sé qué es', 'Las tres líneas'],
            answer: 'Sirve para construir',
            explain: 'Se ejecuta solo la PRIMERA rama que se cumple — acá es el elif de "piedra".',
          },
          {
            id: 'if-2',
            type: 'fill',
            prompt: 'Si ninguna condición anterior se cumple, se ejecuta el bloque ____ (sin dos puntos).',
            answer: 'else',
            explain: 'else es el "en cualquier otro caso" — no lleva condición propia.',
          },
          {
            id: 'if-3',
            type: 'mcq',
            prompt: '¿Qué símbolo se usa para comparar "es igual a" en un if?',
            options: ['==', '=', '===', '<>'],
            answer: '==',
            explain: 'Un solo = es asignar un valor; == es comparar si son iguales.',
          },
          {
            id: 'if-4',
            type: 'mcq',
            code: `vida = 0\nif vida > 0:\n    print("Vivo")\nelse:\n    print("GAME OVER")`,
            prompt: '¿Qué se imprime?',
            options: ['GAME OVER', 'Vivo', 'Nada', 'Error'],
            answer: 'GAME OVER',
            explain: '0 > 0 es falso, así que se ejecuta el else.',
          },
        ],
      },
      {
        key: 'bucles',
        title: 'Bucles for / while',
        icon: 'loop',
        blurb: 'Repetir una acción, con o sin saber cuántas veces.',
        exercises: [
          {
            id: 'loop-1',
            type: 'mcq',
            code: `for golpe in range(3):\n    print("Golpe")`,
            prompt: '¿Cuántas veces se imprime "Golpe"?',
            options: ['3', '2', '4', 'Infinitas'],
            answer: '3',
            explain: 'range(3) genera 3 vueltas: 0, 1 y 2.',
          },
          {
            id: 'loop-2',
            type: 'fill',
            code: `durabilidad = 5\n____ durabilidad > 0:\n    durabilidad -= 1`,
            prompt: 'Completá la palabra clave que falta al inicio de la segunda línea.',
            answer: 'while',
            explain: 'while repite mientras la condición sea verdadera, sin saber de antemano cuántas vueltas va a dar.',
          },
          {
            id: 'loop-3',
            type: 'mcq',
            prompt: '¿Qué números recorre range(4)?',
            options: ['0, 1, 2, 3', '1, 2, 3, 4', '0, 1, 2, 3, 4', '4, 3, 2, 1'],
            answer: '0, 1, 2, 3',
            explain: 'range(n) siempre arranca en 0 y no incluye el n.',
          },
          {
            id: 'loop-4',
            type: 'mcq',
            code: `durabilidad = 5\nwhile durabilidad > 0:\n    print(durabilidad)`,
            prompt: 'A este while le falta algo adentro. ¿Qué problema tiene?',
            options: [
              'Es un bucle infinito: durabilidad nunca cambia',
              'No tiene ningún problema',
              'range() está mal usado',
              'Falta el else',
            ],
            answer: 'Es un bucle infinito: durabilidad nunca cambia',
            explain: 'Como nada resta durabilidad, la condición durabilidad > 0 siempre es verdadera.',
          },
        ],
      },
    ],
  },
]

export function getPlaygroundAct(actKey: string): PlaygroundAct | undefined {
  return PLAYGROUND_ACTS.find((a) => a.actKey === actKey)
}
