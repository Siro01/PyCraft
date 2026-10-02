// Pato Debug — explica el código del desafío línea por línea, en palabras
// para chicos de 10-13. No resuelve nada: dice QUÉ hace cada línea y, si hay
// un hueco ___, qué TIPO de cosa va ahí (una variable, un número, un texto…),
// nunca la respuesta. Se adapta a cada jefe con el tema de su clase
// (boss.topic) y el primer paso de sus apuntes (lib/game/lessons.ts).

import type { Boss, Challenge } from '@/types'
import { getLesson } from '@/lib/game/lessons'

export interface DuckStep {
  /** Línea de código que se explica (vacío en los pasos de intro/cierre). */
  code?: string
  lineNo?: number
  text: string
  /** Pista sobre un hueco ___ de esta línea. */
  blank?: string
}

const BLANK = /_{3,}/

function describeValue(v: string): string {
  const t = v.trim()
  if (/^f["']/.test(t)) return 'un texto con huecos {} que se llenan con variables'
  if (/^["']/.test(t)) return `el texto ${t}`
  if (/^-?\d+\.\d+$/.test(t)) return `el número con coma ${t}`
  if (/^-?\d+$/.test(t)) return `el número ${t}`
  if (/^(True|False)$/.test(t)) return `${t} (verdadero o falso)`
  if (t.startsWith('[')) return 'una lista (varias cosas en fila, entre corchetes)'
  if (t.startsWith('{')) return 'un diccionario (pares de clave: valor)'
  if (/^input\s*\(/.test(t)) return 'lo que el usuario escriba con el teclado'
  if (/^int\s*\(/.test(t)) return 'un número entero (int convierte el texto en número)'
  if (/^str\s*\(/.test(t)) return 'un texto (str convierte a texto)'
  if (/^len\s*\(/.test(t)) return 'cuántos elementos hay (len cuenta)'
  if (/[+\-*/%]/.test(t)) return `el resultado de la cuenta ${t}`
  return t
}

function blankHint(line: string): string | undefined {
  if (!BLANK.test(line)) return undefined
  if (/\{\s*_{3,}\s*\}/.test(line)) return 'Adentro de las llaves { } de un f-string va el NOMBRE de una variable que ya existe arriba.'
  if (/=\s*_{3,}/.test(line)) return 'Después del = va un VALOR: fijate en la consigna qué número o texto tiene que guardar.'
  if (/print\(\s*_{3,}\s*\)/.test(line)) return 'Adentro del print va lo que querés mostrar: puede ser una variable o un texto entre comillas.'
  if (/^\s*(if|elif|while)\b/.test(line)) return 'Acá va una comparación, algo que sea verdadero o falso (por ejemplo: vida > 0).'
  if (/\bin\s+_{3,}/.test(line)) return 'Después del "in" va la lista o el range() que querés recorrer.'
  if (/(SELECT|select)\s+_{3,}/.test(line)) return 'Después de SELECT van las COLUMNAS que querés ver (o * para todas).'
  if (/(FROM|from)\s+_{3,}/.test(line)) return 'Después de FROM va el nombre de la TABLA.'
  if (/(WHERE|where)\b/.test(line)) return 'En el WHERE va la condición que filtra las filas, por ejemplo: cantidad > 5.'
  return 'Hay un hueco ___. Leé la consigna con calma: dice qué tiene que aparecer en pantalla, y eso te da la pista.'
}

function explainPython(raw: string): string {
  const line = raw.trim()
  let m: RegExpMatchArray | null

  if (line.startsWith('#')) return 'Es un comentario: Python lo ignora. Es una nota para las personas que leen el código.'
  if ((m = line.match(/^print\s*\(\s*f["']/))) return 'Muestra en pantalla un f-string: un texto con huecos { }. Python reemplaza cada { } por el valor de la variable que tiene adentro.'
  if ((m = line.match(/^print\s*\(\s*(["'])(.*)\1\s*\)$/))) return `Muestra en pantalla el texto "${m[2]}", tal cual.`
  if ((m = line.match(/^print\s*\((.*)\)$/))) {
    const inner = m[1].trim()
    if (inner.includes(',')) return 'Muestra en pantalla varias cosas juntas: print las pone una al lado de la otra, separadas por un espacio.'
    if (/[+\-*/]/.test(inner)) return `Hace la cuenta ${inner} y muestra el resultado en pantalla.`
    return `Muestra en pantalla lo que vale ${inner}.`
  }
  if ((m = line.match(/^(\w+)\s*=\s*input\s*\((.*)\)$/))) return `Le hace una pregunta al usuario${m[2] ? ` (${m[2]})` : ''} y guarda lo que escriba en la variable ${m[1]}.`
  if ((m = line.match(/^(\w+)\s*\+=\s*(.+)$/))) return `Le suma ${m[2]} a lo que ya tenía ${m[1]}. Es lo mismo que escribir ${m[1]} = ${m[1]} + ${m[2]}.`
  if ((m = line.match(/^(\w+)\s*-=\s*(.+)$/))) return `Le resta ${m[2]} a ${m[1]}.`
  if ((m = line.match(/^(\w+)\.append\((.*)\)$/))) return `Agrega ${m[2]} al final de la lista ${m[1]}.`
  if ((m = line.match(/^(\w+)\s*\[(.+)\]\s*=\s*(.+)$/))) return `Guarda ${describeValue(m[3])} en la posición/clave ${m[2]} de ${m[1]}.`
  if ((m = line.match(/^(\w+)\s*=\s*(.+)$/))) return `Crea la variable ${m[1]} y guarda adentro ${describeValue(m[2])}.`
  if ((m = line.match(/^for\s+(\w+)\s+in\s+range\((.*)\):?$/))) return `Repite el bloque de abajo: ${m[1]} va tomando los números de range(${m[2]}), uno por vuelta.`
  if ((m = line.match(/^for\s+(\w+)\s+in\s+(.+?):?$/))) return `Recorre ${m[2]} de a un elemento: en cada vuelta, ${m[1]} vale el elemento que toca.`
  if ((m = line.match(/^while\s+(.+?):?$/))) return `Repite el bloque de abajo MIENTRAS ${m[1]} sea verdadero. Ojo: algo tiene que cambiar adentro, si no, no termina nunca.`
  if ((m = line.match(/^if\s+(.+?):?$/))) return `Pregunta: ¿${m[1]}? Si es verdadero, se ejecuta el bloque corrido a la derecha.`
  if ((m = line.match(/^elif\s+(.+?):?$/))) return `Si lo de arriba no se cumplió, pregunta otra cosa: ¿${m[1]}?`
  if (/^else\s*:?$/.test(line)) return 'Si ninguna de las preguntas de arriba se cumplió, se ejecuta este bloque.'
  if ((m = line.match(/^def\s+(\w+)\s*\((.*)\):?$/))) return `Crea una función llamada ${m[1]}${m[2] ? ` que recibe ${m[2]}` : ''}. Es una receta: no hace nada hasta que la llames.`
  if ((m = line.match(/^return\s+(.+)$/))) return `La función termina y devuelve ${m[1]} a quien la llamó.`
  if (/^break$/.test(line)) return 'Corta el bucle en el acto, aunque no haya terminado.'
  if ((m = line.match(/^(\w+)\((.*)\)$/))) return `Llama (usa) a la función ${m[1]}${m[2] ? ` pasándole ${m[2]}` : ''}.`
  return 'Esta línea es parte del programa. Leela de izquierda a derecha, como una oración.'
}

function explainSql(raw: string): string {
  const line = raw.trim()
  const up = line.toUpperCase()
  let m: RegExpMatchArray | null

  if (line.startsWith('--')) return 'Es un comentario de SQL: la base de datos lo ignora.'
  if ((m = line.match(/^CREATE\s+TABLE\s+(\w+)/i))) return `Crea una tabla nueva llamada ${m[1]}. Entre paréntesis van sus columnas y el tipo de dato de cada una.`
  if ((m = line.match(/^INSERT\s+INTO\s+(\w+)/i))) return `Agrega una fila nueva a la tabla ${m[1]}.`
  if (/^VALUES/i.test(line)) return 'Los valores de la fila nueva, en el mismo orden que las columnas.'
  if ((m = line.match(/^SELECT\s+(.+?)(\s+FROM\s+(\w+))?;?$/i))) {
    const cols = m[1].trim() === '*' ? 'todas las columnas' : `las columnas ${m[1].trim()}`
    return m[3] ? `Pide ${cols} de la tabla ${m[3]}.` : `Elige qué mostrar: ${cols}.`
  }
  if ((m = line.match(/^FROM\s+(\w+)/i))) return `De la tabla ${m[1]}.`
  if ((m = line.match(/^WHERE\s+(.+?);?$/i))) return `Filtra: se quedan solo las filas donde ${m[1]}.`
  if ((m = line.match(/^ORDER\s+BY\s+(.+?);?$/i))) return `Ordena el resultado por ${m[1]}${/DESC/i.test(m[1]) ? ' (de mayor a menor)' : ''}.`
  if ((m = line.match(/^GROUP\s+BY\s+(.+?);?$/i))) return `Junta las filas que tienen el mismo ${m[1]}, para contarlas o sumarlas por grupo.`
  if ((m = line.match(/^UPDATE\s+(\w+)/i))) return `Va a cambiar datos de la tabla ${m[1]}.`
  if ((m = line.match(/^SET\s+(.+?);?$/i))) return `El cambio: ${m[1]}.`
  if ((m = line.match(/^DELETE\s+FROM\s+(\w+)/i))) return `Borra filas de la tabla ${m[1]}. ¡Siempre con WHERE, si no borra todas!`
  if (/JOIN/.test(up)) return 'Une dos tablas usando una columna que tienen en común.'
  if (/COUNT\(/.test(up)) return 'COUNT cuenta cuántas filas hay.'
  if (/SUM\(|AVG\(|MAX\(|MIN\(/.test(up)) return 'Hace una cuenta sobre una columna: SUM suma, AVG promedia, MAX/MIN buscan el más grande/chico.'
  if (/^\w+\s+(INTEGER|TEXT|REAL)/i.test(line)) return 'Una columna de la tabla: primero el nombre, después el tipo (INTEGER número, TEXT texto, REAL número con coma).'
  return 'Esta línea es parte de la consulta. SQL se lee casi como inglés: QUÉ quiero, DE DÓNDE, CON QUÉ CONDICIÓN.'
}

export function buildDuckSteps(boss: Boss, challenge: Challenge, code: string): DuckStep[] {
  const lesson = getLesson(boss.id)
  const reminder = lesson?.steps[0]
  const steps: DuckStep[] = [
    {
      text: `Cuac. Este jefe es de la clase de ${boss.topic}.${reminder ? ` Acordate: ${reminder.title.toLowerCase()}. ${reminder.text}` : ''}`,
    },
    { text: `La consigna dice: ${challenge.description}` },
  ]

  const explain = challenge.type === 'sql' ? explainSql : explainPython
  code.split('\n').forEach((line, i) => {
    if (!line.trim()) return
    steps.push({ code: line, lineNo: i + 1, text: explain(line), blank: blankHint(line) })
  })

  steps.push({
    text: `Ahora probá vos, línea por línea. Cuando atacás, la pantalla tiene que mostrar exactamente:\n${challenge.expectedOutput}${challenge.tip ? `\n\nPista extra: ${challenge.tip}` : ''}`,
  })
  return steps
}
