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
