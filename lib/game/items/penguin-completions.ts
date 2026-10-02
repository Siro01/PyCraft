// Pingüino Linux — autocompletado de CodeMirror con el ícono del pingüino.
// Solo palabras que se ven en el taller, cada una con una explicación de
// 3-6 palabras para chicos. Las funciones completan con los paréntesis y
// dejan el cursor adentro (snippet), así el alumno sigue escribiendo.

import { autocompletion, snippetCompletion, type Completion, type CompletionContext } from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'

const PY: Completion[] = [
  snippetCompletion('print(${})', { label: 'print', detail: 'muestra en pantalla', type: 'function' }),
  snippetCompletion('input("${}")', { label: 'input', detail: 'pregunta al usuario', type: 'function' }),
  snippetCompletion('len(${})', { label: 'len', detail: 'cuenta elementos', type: 'function' }),
  snippetCompletion('range(${})', { label: 'range', detail: 'números en fila', type: 'function' }),
  snippetCompletion('int(${})', { label: 'int', detail: 'texto → número', type: 'function' }),
  snippetCompletion('str(${})', { label: 'str', detail: 'número → texto', type: 'function' }),
  snippetCompletion('float(${})', { label: 'float', detail: 'número con coma', type: 'function' }),
  snippetCompletion('sum(${})', { label: 'sum', detail: 'suma una lista', type: 'function' }),
  snippetCompletion('max(${})', { label: 'max', detail: 'el más grande', type: 'function' }),
  snippetCompletion('min(${})', { label: 'min', detail: 'el más chico', type: 'function' }),
  snippetCompletion('round(${})', { label: 'round', detail: 'redondea', type: 'function' }),
  snippetCompletion('sorted(${})', { label: 'sorted', detail: 'ordena', type: 'function' }),
  snippetCompletion('append(${})', { label: 'append', detail: 'agrega al final', type: 'method' }),
  snippetCompletion('upper()', { label: 'upper', detail: 'TODO MAYÚSCULA', type: 'method' }),
  snippetCompletion('lower()', { label: 'lower', detail: 'todo minúscula', type: 'method' }),
  snippetCompletion('if ${}:\n    ', { label: 'if', detail: 'pregunta algo', type: 'keyword' }),
  snippetCompletion('elif ${}:\n    ', { label: 'elif', detail: 'si no, pregunta otra', type: 'keyword' }),
  snippetCompletion('else:\n    ${}', { label: 'else', detail: 'si nada se cumplió', type: 'keyword' }),
  snippetCompletion('for ${i} in range(${}):\n    ', { label: 'for', detail: 'repite', type: 'keyword' }),
  snippetCompletion('while ${}:\n    ', { label: 'while', detail: 'repite mientras…', type: 'keyword' }),
  snippetCompletion('def ${nombre}(${}):\n    ', { label: 'def', detail: 'crea una función', type: 'keyword' }),
  { label: 'return', detail: 'devuelve un valor', type: 'keyword' },
  { label: 'True', detail: 'verdadero', type: 'constant' },
  { label: 'False', detail: 'falso', type: 'constant' },
]

const SQL: Completion[] = [
  { label: 'SELECT', detail: 'qué columnas ver', type: 'keyword', apply: 'SELECT ' },
  { label: 'FROM', detail: 'de qué tabla', type: 'keyword', apply: 'FROM ' },
  { label: 'WHERE', detail: 'filtra filas', type: 'keyword', apply: 'WHERE ' },
  { label: 'ORDER BY', detail: 'ordena', type: 'keyword', apply: 'ORDER BY ' },
  { label: 'GROUP BY', detail: 'agrupa', type: 'keyword', apply: 'GROUP BY ' },
  { label: 'INSERT INTO', detail: 'agrega una fila', type: 'keyword', apply: 'INSERT INTO ' },
  snippetCompletion('VALUES (${})', { label: 'VALUES', detail: 'los datos nuevos', type: 'keyword' }),
  snippetCompletion('CREATE TABLE ${nombre} (\n  ${}\n);', { label: 'CREATE TABLE', detail: 'crea una tabla', type: 'keyword' }),
  { label: 'UPDATE', detail: 'cambia datos', type: 'keyword', apply: 'UPDATE ' },
  { label: 'SET', detail: 'el cambio', type: 'keyword', apply: 'SET ' },
  { label: 'DELETE FROM', detail: 'borra filas', type: 'keyword', apply: 'DELETE FROM ' },
  snippetCompletion('COUNT(${*})', { label: 'COUNT', detail: 'cuenta filas', type: 'function' }),
  snippetCompletion('SUM(${})', { label: 'SUM', detail: 'suma', type: 'function' }),
  snippetCompletion('AVG(${})', { label: 'AVG', detail: 'promedio', type: 'function' }),
  snippetCompletion('MAX(${})', { label: 'MAX', detail: 'el más grande', type: 'function' }),
  snippetCompletion('MIN(${})', { label: 'MIN', detail: 'el más chico', type: 'function' }),
  { label: 'JOIN', detail: 'une dos tablas', type: 'keyword', apply: 'JOIN ' },
  { label: 'AND', detail: 'y además', type: 'keyword', apply: 'AND ' },
  { label: 'OR', detail: 'o si no', type: 'keyword', apply: 'OR ' },
  { label: 'INTEGER', detail: 'número entero', type: 'type' },
  { label: 'TEXT', detail: 'texto', type: 'type' },
  { label: 'REAL', detail: 'número con coma', type: 'type' },
  { label: 'DESC', detail: 'de mayor a menor', type: 'keyword' },
]

// El pingüino en chiquito (8×8) — mismo trazo y roles de color que su sprite.
const MINI = [
  '..kkkk..',
  '.kfkkfk.',
  '.kkbbkk.',
  'kkffffkk',
  'kkffffkk',
  '.kffffk.',
  '..kkkk..',
  '.bb..bb.',
]
const MINI_ROLE: Record<string, string> = { k: 'hsl(var(--tx))', f: 'hsl(var(--surface2))', b: 'hsl(var(--accent2))' }

function penguinIcon(): Node {
  const ns = 'http://www.w3.org/2000/svg'
  const wrap = document.createElement('span')
  wrap.className = 'cm-penguin-icon'
  wrap.setAttribute('aria-hidden', 'true')
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 8 8')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('shape-rendering', 'crispEdges')
  MINI.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x]
      if (c === '.') continue
      const r = document.createElementNS(ns, 'rect')
      r.setAttribute('x', String(x)); r.setAttribute('y', String(y))
      r.setAttribute('width', '1'); r.setAttribute('height', '1')
      r.setAttribute('fill', MINI_ROLE[c])
      svg.appendChild(r)
    }
  })
  wrap.appendChild(svg)
  return wrap
}

function source(list: Completion[], caseInsensitive: boolean) {
  return (ctx: CompletionContext) => {
    const word = ctx.matchBefore(/[\w]+/)
    // Aparece a partir de la 2ª letra (o con Ctrl+Espacio): sin ruido al escribir.
    if (!word || (word.to - word.from < 2 && !ctx.explicit)) return null
    const typed = word.text
    const options = list.filter((c) =>
      caseInsensitive ? c.label.toLowerCase().startsWith(typed.toLowerCase()) : c.label.startsWith(typed),
    )
    if (!options.length) return null
    return { from: word.from, options, validFor: /^\w*$/ }
  }
}

export function penguinAutocomplete(language: 'python' | 'sql'): Extension {
  return autocompletion({
    override: [language === 'sql' ? source(SQL, true) : source(PY, false)],
    icons: false,
    addToOptions: [{ render: () => penguinIcon(), position: 20 }],
    closeOnBlur: true,
  })
}
