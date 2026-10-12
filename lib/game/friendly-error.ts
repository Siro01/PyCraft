/** Traduce el error crudo de Python/SQLite a algo que un chico de 10 años entienda.
 *  Lo comparten la Escuelita de Rodolfo y la Biblioteca. */
export function friendlyError(err: string): string {
  if (/lo frenamos/i.test(err)) return 'El programa no terminaba nunca y lo frenamos. ¿Algo adentro del bucle cambia la condición?'
  if (/SyntaxError/i.test(err)) return 'Python no entendió cómo está escrito. Revisá que no falte ni sobre ningún signo.'
  if (/IndentationError/i.test(err)) return 'La sangría (los espacios de la izquierda) no coincide. Lo de adentro de un if, for o def va corrido 4 espacios.'
  if (/NameError/i.test(err)) return 'Python no conoce ese nombre. ¿Está bien escrito, igual que arriba?'
  if (/TypeError/i.test(err)) return 'Se mezclaron cosas que no van juntas (por ejemplo, texto con números).'
  if (/IndexError/i.test(err)) return 'Esa posición no existe en la lista. Acordate que se cuenta desde 0.'
  if (/KeyError/i.test(err)) return 'Esa etiqueta no existe en el diccionario. Fijate cómo está escrita.'
  if (/ValueError/i.test(err)) return 'El valor no se pudo convertir. int() solo entiende números escritos con cifras.'
  if (/UNIQUE constraint/i.test(err)) return 'Ese id ya existe en la tabla: la base de datos no deja repetirlo.'
  if (/no such table/i.test(err)) return 'Esa tabla no existe. Revisá el nombre (o creala primero).'
  if (/no such column/i.test(err)) return 'Esa columna no existe en la tabla. Revisá el nombre.'
  if (/syntax error/i.test(err)) return 'SQL no entendió la orden. Revisá que la palabra esté bien escrita.'
  return 'Algo no salió. Revisá lo que escribiste y probá de nuevo.'
}

export interface SqlErrorHelp {
  /** Una frase corta en castellano: qué pasó. */
  message: string
  /** Nombre parecido que sí existe (para "¿Quisiste decir…?"). */
  suggestion?: string
}

/** Distancia de edición: cuántas letras hay que cambiar para pasar de a a b. */
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return d[a.length][b.length]
}

function closest(word: string, options: string[]): string | undefined {
  const w = word.toLowerCase()
  let best: string | undefined
  let bestD = Infinity
  for (const o of options) {
    const dd = distance(w, o.toLowerCase())
    if (dd < bestD) { bestD = dd; best = o }
  }
  // Solo sugerimos si se parece de verdad (hasta 2 letras distintas, o 1 en palabras cortas).
  return best && bestD > 0 && bestD <= (w.length <= 4 ? 1 : 2) ? best : undefined
}

/** Error de SQL de una batalla → una frase que un chico de 10 años entienda,
 *  con sugerencia de nombre si escribió mal una tabla o columna. */
export function friendlySqlError(
  err: string,
  code: string,
  schema: { name: string; columns: string[] }[] = [],
): SqlErrorHelp {
  if (code.includes('___')) return { message: 'Todavía quedan huecos ___ sin completar. Reemplazalos y atacá de nuevo.' }

  const tables = schema.map((t) => t.name)
  const columns = Array.from(new Set(schema.flatMap((t) => t.columns)))

  let m = err.match(/no such table: (\w+)/i)
  if (m) return { message: `No hay ninguna tabla que se llame ${m[1]}.`, suggestion: closest(m[1], tables) }

  m = err.match(/no such column: (\w+)/i) ?? err.match(/has no column named (\w+)/i)
  if (m) return { message: `La tabla no tiene una columna que se llame ${m[1]}.`, suggestion: closest(m[1], columns) }

  m = err.match(/table (\w+) already exists/i)
  if (m) return { message: `La tabla ${m[1]} ya existe. No hace falta crearla otra vez.` }

  m = err.match(/(\d+) values for (\d+) columns/i)
  if (m) return { message: `Pusiste ${m[1]} valores, pero la tabla espera ${m[2]}. Tiene que haber uno por columna.` }

  if (/UNIQUE constraint|PRIMARY KEY/i.test(err)) return { message: 'Ese id ya existe en la tabla: la base de datos no deja repetirlo.' }
  if (/NOT NULL constraint/i.test(err)) return { message: 'Te faltó un dato obligatorio: esa columna no puede quedar vacía.' }
  if (/unrecognized token/i.test(err)) return { message: 'Hay una comilla que se abrió y no se cerró. El texto va entre comillas simples: \'Espada\'.' }
  if (/incomplete input/i.test(err)) return { message: 'La orden quedó cortada: falta cerrar un paréntesis o una comilla.' }

  m = err.match(/near "([^"]+)": syntax error/i)
  if (m) return { message: `SQL se trabó cerca de «${m[1]}». Revisá esa parte: puede faltar una coma, una comilla o estar mal escrita.` }

  if (/syntax error/i.test(err)) return { message: 'SQL no entendió la orden. Revisá que cada palabra esté bien escrita.' }
  return { message: 'Algo no salió. Revisá lo que escribiste y probá de nuevo.' }
}
