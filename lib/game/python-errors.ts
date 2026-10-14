/** Traduce al castellano la explicación de un error de Python, dejando el
 *  nombre del error en inglés (TypeError, NameError…) porque es lo que el
 *  alumno va a ver en cualquier otro lado donde programe.
 *
 *  "TypeError: can only concatenate str (not "int") to str"
 *    → "TypeError en la línea 3: solo se puede unir texto con texto, y acá hay un número entero (int)…"
 *
 *  Lo usa el motor (pyodide-runner) para todos los errores de Python: batallas,
 *  patio de prácticas, Biblioteca y repasos. Si un mensaje no está en la lista,
 *  queda el original en inglés — mejor eso que una traducción inventada.
 *  La pista corta "para chicos" de cada tipo de error sigue en friendly-error.ts. */

const TIPOS: Record<string, string> = {
  int: 'un número entero (int)',
  float: 'un número con coma (float)',
  str: 'un texto (str)',
  bool: 'un True/False (bool)',
  list: 'una lista (list)',
  tuple: 'una tupla (tuple)',
  dict: 'un diccionario (dict)',
  set: 'un conjunto (set)',
  NoneType: 'None (un valor vacío)',
  function: 'una función',
  builtin_function_or_method: 'una función',
  method: 'una función',
  range: 'un range',
  module: 'un módulo',
  'sqlite3.Cursor': 'un cursor de sqlite3',
  'sqlite3.Connection': 'una conexión de sqlite3',
}

const tipo = (t: string) => TIPOS[t] ?? `un '${t}'`
const datos = (n: string) => (n === '1' ? '1 dato' : `${n} datos`)
const DE_INPUT = ' Si el valor vino de input(), convertilo con int() o float().'

type Regla = [RegExp, (m: RegExpMatchArray) => string]

const REGLAS: Record<string, Regla[]> = {
  NameError: [
    [/^name '(.+)' is not defined$/, (m) => `Python no conoce ningún '${m[1]}'. ¿Lo creaste antes de usarlo y está escrito igual (mayúsculas también cuentan)?`],
  ],
  UnboundLocalError: [
    [/^cannot access local variable '(.+)' where it is not associated with a value$/, (m) => `usás la variable '${m[1]}' adentro de la función antes de darle un valor ahí adentro.`],
    [/^local variable '(.+)' referenced before assignment$/, (m) => `usás la variable '${m[1]}' adentro de la función antes de darle un valor ahí adentro.`],
  ],
  TypeError: [
    [/^can only concatenate (\w+) \(not "(\w+)"\) to \w+$/, (m) => m[1] === 'str'
      ? `solo se puede unir texto con texto, y acá hay ${tipo(m[2])}. Convertilo con str(), o separá las partes con comas en el print().`
      : `solo se puede sumar ${tipo(m[1])} con otro igual, no con ${tipo(m[2])}.`],
    [/^unsupported operand type\(s\) for (.+): '(.+)' and '(.+)'$/, (m) => `no se puede usar ${m[1]} entre ${tipo(m[2])} y ${tipo(m[3])}.${[m[2], m[3]].includes('str') ? DE_INPUT : ''}`],
    [/^'(.+)' not supported between instances of '(.+)' and '(.+)'$/, (m) => `no se puede comparar con ${m[1]} ${tipo(m[2])} y ${tipo(m[3])}.${[m[2], m[3]].includes('str') ? DE_INPUT : ''}`],
    [/^'(.+)' object is not callable$/, (m) => `${tipo(m[1])} no es una función: no se puede usar con paréntesis ( ). ¿Le pusiste a una variable el mismo nombre que una función?`],
    [/^'(.+)' object is not subscriptable$/, (m) => `a ${tipo(m[1])} no se le pueden pedir posiciones con [ ].${m[1] === 'NoneType' ? ' ¿Guardaste lo que devuelve una función que no tiene return?' : ''}`],
    [/^'(.+)' object is not iterable$/, (m) => `no se puede recorrer ${tipo(m[1])} con un for.${m[1] === 'int' ? ' Para repetir varias veces usá range(): for i in range(5):' : ''}`],
    [/^object of type '(.+)' has no len\(\)$/, (m) => `${tipo(m[1])} no tiene largo: len() no funciona con eso.`],
    [/^(.+)\(\) missing (\d+) required (?:positional|keyword-only) arguments?: (.+)$/, (m) => `a ${m[1]}() le ${m[2] === '1' ? 'falta 1 dato' : `faltan ${m[2]} datos`} al llamarla: ${m[3].replace(/ and /g, ' y ')}.`],
    [/^(.+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given$/, (m) => `${m[1]}() recibe ${datos(m[2])}, pero le pasaste ${m[3]}.`],
    [/^(.+)\(\) takes from (\d+) to (\d+) positional arguments but (\d+) were given$/, (m) => `${m[1]}() recibe de ${m[2]} a ${m[3]} datos, pero le pasaste ${m[4]}.`],
    [/^(.+)\(\) takes no arguments$/, (m) => `${m[1]}() no recibe datos entre los paréntesis.`],
    [/^(.+) expected (?:at most |at least )?(\d+) arguments?, got (\d+)$/, (m) => `${m[1]}() esperaba ${datos(m[2])}, pero le pasaste ${m[3]}.`],
    [/^(.+)\(\) got an unexpected keyword argument '(.+)'$/, (m) => `${m[1]}() no tiene ningún dato que se llame '${m[2]}'.`],
    [/^can't multiply sequence by non-int of type '(.+)'$/, (m) => `un texto o una lista solo se puede multiplicar por un número entero, no por ${tipo(m[1])}.${m[1] === 'str' ? DE_INPUT : ''}`],
    [/^'(.+)' object does not support item assignment$/, (m) => m[1] === 'str'
      ? 'no se puede cambiar una letra de un texto: los textos no se modifican, hay que armar uno nuevo.'
      : m[1] === 'tuple' ? 'una tupla no se puede modificar después de crearla. Si necesitás cambiarla, usá una lista.'
      : `${tipo(m[1])} no deja cambiar posiciones con [ ] =.`],
    [/^(list|tuple|string) indices must be integers(?: or slices)?, not '?(\w+)'?$/, (m) => `las posiciones ${({ list: 'de una lista', tuple: 'de una tupla', string: 'de un texto' } as Record<string, string>)[m[1]]} tienen que ser números enteros, no ${tipo(m[2])}.${m[2] === 'str' ? DE_INPUT : ''}`],
    [/^int\(\) argument must be a string, a bytes-like object or a (?:real )?number, not '(.+)'$/, (m) => `int() no puede convertir ${tipo(m[1])} en un número.`],
    [/^float\(\) argument must be a string or a (?:real )?number, not '(.+)'$/, (m) => `float() no puede convertir ${tipo(m[1])} en un número.`],
    [/^unhashable type: '(.+)'$/, (m) => `${tipo(m[1])} no se puede usar como clave de un diccionario ni guardar en un conjunto.`],
    [/^'(.+)' object cannot be interpreted as an integer$/, (m) => `acá se necesitaba un número entero y llegó ${tipo(m[1])}.${m[1] === 'str' ? DE_INPUT : ''}`],
    [/^not all arguments converted during string formatting$/, () => 'se usó % con un texto. Si querías el resto de una división, el valor es texto: convertilo con int() primero.'],
    [/^bad operand type for unary (.+): '(.+)'$/, (m) => `no se puede poner ${m[1]} delante de ${tipo(m[2])}.`],
  ],
  ValueError: [
    [/^invalid literal for int\(\) with base 10: ''$/, () => 'int() recibió un texto vacío y no lo puede convertir en número. ¿Apretaste Enter sin escribir nada?'],
    [/^invalid literal for int\(\) with base 10: (.+)$/, (m) => `int() no puede convertir ${m[1]} en un número entero: tiene que estar escrito solo con cifras.`],
    [/^could not convert string to float: (.+)$/, (m) => `float() no puede convertir ${m[1]} en un número. Ojo: los decimales van con punto (3.5), no con coma.`],
    [/^list\.remove\(x\): x not in list$/, () => 'ese valor no está en la lista, así que remove() no lo puede sacar.'],
    [/^(.+) is not in list$/, (m) => `${m[1]} no está en la lista.`],
    [/^too many values to unpack \(expected (\d+)(?:, got (\d+))?\)$/, (m) => `hay más valores que variables para guardarlos: había lugar para ${m[1]}${m[2] ? ` y llegaron ${m[2]}` : ''}.`],
    [/^not enough values to unpack \(expected (\d+), got (\d+)\)$/, (m) => `faltan valores: había ${m[1]} variables y llegaron solo ${m[2]}.`],
    [/^(max|min)\(\) (?:arg is an empty sequence|iterable argument is empty)$/, (m) => `${m[1]}() recibió algo vacío: no hay nada para comparar.`],
    [/^empty range (?:for|in) randrange\(\)/, () => 'random no puede elegir: el rango está vacío. ¿El primer número es más grande que el segundo?'],
    [/^math domain error$/, () => 'esa cuenta no se puede hacer (por ejemplo, la raíz cuadrada de un número negativo).'],
    [/^substring not found$/, () => 'ese pedazo de texto no aparece en el texto.'],
  ],
  IndexError: [
    [/^list index out of range$/, () => 'esa posición no existe en la lista. Se cuenta desde 0: la última es len(lista) - 1.'],
    [/^string index out of range$/, () => 'esa posición no existe en el texto. Se cuenta desde 0.'],
    [/^tuple index out of range$/, () => 'esa posición no existe en la tupla. Se cuenta desde 0.'],
    [/^pop from empty list$/, () => 'no se puede sacar nada con pop(): la lista está vacía.'],
    [/^pop index out of range$/, () => 'esa posición no existe en la lista, pop() no la puede sacar.'],
    [/^Cannot choose from an empty sequence$/, () => 'random.choice() no puede elegir de una lista vacía.'],
  ],
  KeyError: [
    [/^(.+)$/, (m) => `el diccionario no tiene la clave ${m[1]}. Fijate cómo está escrita (mayúsculas y espacios cuentan).`],
  ],
  ZeroDivisionError: [
    [/division by zero|modulo by zero/, () => 'no se puede dividir por cero.'],
  ],
  AttributeError: [
    [/^'NoneType' object has no attribute '(.+)'$/, (m) => `estás usando .${m[1]} sobre None (un valor vacío). ¿Guardaste lo que devuelve algo que no devuelve nada, como lista.append() o lista.sort()?`],
    [/^'(.+)' object has no attribute '(.+)'$/, (m) => `${tipo(m[1])} no tiene nada que se llame '${m[2]}'.`],
    [/^module '(.+)' has no attribute '(.+)'$/, (m) => `el módulo ${m[1]} no tiene nada que se llame '${m[2]}'.`],
    [/^type object '(.+)' has no attribute '(.+)'$/, (m) => `${m[1]} no tiene nada que se llame '${m[2]}'.`],
  ],
  RecursionError: [
    [/maximum recursion depth exceeded/, () => 'la función se llamó a sí misma demasiadas veces sin parar. ¿Le falta el caso que corta?'],
  ],
  ModuleNotFoundError: [
    [/^No module named '(.+)'$/, (m) => `no existe ningún módulo '${m[1]}' (o no está disponible acá). ¿Está bien escrito?`],
  ],
  ImportError: [
    [/^cannot import name '(.+?)' from '(.+?)'/, (m) => `el módulo ${m[2]} no tiene nada que se llame '${m[1]}' para importar.`],
  ],
  OverflowError: [
    [/./, () => 'el número quedó demasiado grande para hacer esa cuenta.'],
  ],
  EOFError: [
    [/EOF when reading a line/, () => 'el programa quiso leer algo y no había nada para leer.'],
  ],
}

// sqlite3 desde Python: los errores llegan como OperationalError, IntegrityError…
const REGLAS_SQLITE: Regla[] = [
  [/^no such table: (.+)$/, (m) => `no existe la tabla ${m[1]}. ¿La creaste antes con CREATE TABLE?`],
  [/^no such column: (.+)$/, (m) => `la tabla no tiene una columna que se llame ${m[1]}.`],
  [/^table (\w+) has no column named (\w+)$/, (m) => `la tabla ${m[1]} no tiene una columna que se llame ${m[2]}.`],
  [/^table (\w+) already exists$/, (m) => `la tabla ${m[1]} ya existe. Usá CREATE TABLE IF NOT EXISTS para no crearla dos veces.`],
  [/^near "(.+)": syntax error$/, (m) => `SQL no entendió la orden cerca de «${m[1]}». Puede faltar una coma, una comilla o estar mal escrita una palabra.`],
  [/^incomplete input$/, () => 'la orden SQL quedó cortada: falta cerrar un paréntesis o una comilla.'],
  [/^unrecognized token: (.+)$/, (m) => `SQL no reconoce ${m[1]}. ¿Una comilla que se abrió y no se cerró?`],
  [/^UNIQUE constraint failed: (.+)$/, (m) => `ya hay una fila con ese mismo ${m[1]}, y no se puede repetir.`],
  [/^NOT NULL constraint failed: (.+)$/, (m) => `${m[1]} no puede quedar vacío.`],
  [/^table (\w+) has (\d+) columns but (\d+) values were supplied$/, (m) => `la tabla ${m[1]} tiene ${m[2]} columnas, pero le pasaste ${m[3]} valores.`],
  [/^(\d+) values for (\d+) columns$/, (m) => `pusiste ${m[1]} valores para ${m[2]} columnas: tiene que haber uno por columna.`],
  [/^Incorrect number of bindings supplied\. The current statement uses (\d+), and there are (\d+) supplied\.$/, (m) => `la orden tiene ${m[1]} signos ? pero le pasaste ${m[2]} valores.`],
  [/^Cannot operate on a closed database\.$/, () => 'la conexión ya está cerrada (conn.close()). Usala antes de cerrarla.'],
  [/^Cannot operate on a closed cursor\.$/, () => 'el cursor ya está cerrado.'],
  [/^You can only execute one statement at a time\.$/, () => 'execute() corre una sola orden SQL por vez. Para varias usá executescript().'],
]

const REGLAS_SINTAXIS: Regla[] = [
  [/^invalid syntax$/, () => 'Python no entiende cómo está escrita esta línea.'],
  [/^invalid syntax\. Perhaps you forgot a comma\?$/, () => 'Python no entiende esta línea. ¿Te falta una coma entre dos cosas?'],
  [/^invalid syntax\. Maybe you meant '==' or ':=' instead of '='\?$/, () => 'para comparar se usan dos iguales (==), no uno solo (=).'],
  [/^cannot assign to .+?\. Maybe you meant '==' instead of '='\?$/, () => 'para comparar se usan dos iguales (==), no uno solo (=).'],
  [/^cannot assign to literal/, () => 'no se puede guardar algo en un valor fijo: a la izquierda del = va el nombre de la variable.'],
  [/^cannot assign to function call/, () => 'a la izquierda del = va el nombre de una variable, no una función.'],
  [/^cannot assign to expression/, () => 'a la izquierda del = va solo el nombre de la variable, sin cuentas.'],
  [/^expected ':'$/, () => 'falta el dos puntos (:) al final de la línea.'],
  [/^expected '(.+)'$/, (m) => `falta un '${m[1]}'.`],
  [/^'(.)' was never closed$/, (m) => `se abrió un '${m[1]}' y nunca se cerró.`],
  [/^unmatched '(.)'$/, (m) => `hay un '${m[1]}' que cierra algo que nunca se abrió.`],
  [/^closing parenthesis '(.)' does not match opening parenthesis '(.)'(?: on line (\d+))?$/, (m) => `se cierra con '${m[1]}' algo que se abrió con '${m[2]}'${m[3] ? ` en la línea ${m[3]}` : ''}.`],
  [/^unterminated string literal/, () => 'un texto abrió comillas y no las cerró.'],
  [/^unterminated triple-quoted string literal/, () => 'un texto con triple comilla nunca se cerró.'],
  [/^unexpected indent$/, () => 'esta línea tiene espacios de más a la izquierda (sangría) y no va adentro de nada.'],
  [/^expected an indented block after '(.+?)' statement on line (\d+)$/, (m) => `lo que va adentro del ${m[1]} de la línea ${m[2]} tiene que ir corrido 4 espacios a la derecha.`],
  [/^expected an indented block after function definition on line (\d+)$/, (m) => `lo que va adentro de la función (def) de la línea ${m[1]} tiene que ir corrido 4 espacios a la derecha.`],
  [/^expected an indented block/, () => 'acá tiene que haber una línea corrida 4 espacios a la derecha.'],
  [/^unindent does not match any outer indentation level$/, () => 'la sangría de esta línea no coincide con ninguna de arriba. Usá siempre de a 4 espacios.'],
  [/^unexpected unindent$/, () => 'la sangría de esta línea no coincide con las de arriba.'],
  [/^inconsistent use of tabs and spaces in indentation$/, () => 'se mezclaron tabs y espacios en la sangría. Usá solo espacios.'],
  [/^Missing parentheses in call to '(.+)'\. Did you mean (.+)\?$/, (m) => `a ${m[1]} le faltan los paréntesis. ¿Quisiste decir ${m[2]}?`],
  [/^invalid character '(.)' \(U\+.+\)$/, (m) => `hay un carácter que Python no entiende: '${m[1]}'. Si son comillas curvas (“ ”), cambialas por comillas rectas (").`],
  [/^invalid decimal literal$/, () => 'hay un número pegado a letras. Los nombres de variables no pueden empezar con un número.'],
  [/^invalid non-printable character/, () => 'hay un carácter invisible raro. Borrá la línea y escribila de nuevo.'],
  [/^unexpected EOF while parsing$|^incomplete input$/, () => 'el código terminó de golpe: falta cerrar algo.'],
  [/^'return' outside function$/, () => 'return solo se puede usar adentro de una función (def).'],
  [/^'break' outside loop$/, () => 'break solo se puede usar adentro de un bucle (for o while).'],
  [/^'continue' not properly in loop$/, () => 'continue solo se puede usar adentro de un bucle (for o while).'],
  [/^invalid syntax\. Maybe you meant .+$/, () => 'Python no entiende cómo está escrita esta línea.'],
]

/** Solo la explicación, ya traducida (o la original si no la conocemos). */
export function traducirMensaje(nombre: string, mensaje: string): string {
  let msg = mensaje.trim()
  let extra = ''

  // Sugerencias que agrega Python 3.12 al final ("Did you mean: 'print'?").
  const quiso = msg.match(/^([\s\S]*?)\.? Did you mean: '(.+)'\??$/)
  if (quiso) { msg = quiso[1]; extra = ` ¿Quisiste decir '${quiso[2]}'?` }
  const olvido = msg.match(/^([\s\S]*?)\.? Did you forget to import '(.+)'\??$/)
  if (olvido) return `Python no conoce '${olvido[2]}' porque falta importarlo: escribí import ${olvido[2]} arriba de todo.`

  const reglas = /SyntaxError|IndentationError|TabError/.test(nombre)
    ? REGLAS_SINTAXIS
    : /^(?:sqlite3\.)?(?:Operational|Integrity|Programming|Database|Interface)Error$/.test(nombre)
      ? REGLAS_SQLITE
      : REGLAS[nombre] ?? []
  for (const [re, f] of reglas) {
    const m = msg.match(re)
    if (m) return f(m) + extra
  }
  return msg.replace(/\(detected at line (\d+)\)/, '(línea $1)') + extra
}

/** Error completo para mostrar: "TypeError en la línea 3: solo se puede…". */
export function formatPythonError(nombre: string, mensaje: string, linea?: number | null): string {
  const corto = nombre.replace(/^sqlite3\./, '')
  return `${corto}${linea ? ` en la línea ${linea}` : ''}: ${traducirMensaje(nombre, mensaje)}`
}
