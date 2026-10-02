// Compu Hackeada — corrector automático de hasta 2 errores.
//
// No hay soluciones de referencia en los desafíos (solo expectedOutput), así
// que la Compu NO resuelve el ejercicio: arregla errores de ESCRITURA que un
// chico de 10-13 años comete seguido (prin, paréntesis o comillas sin
// cerrar, los dos puntos del if, = en vez de ==, SELEC/FORM…). Cada arreglo
// guarda la línea antes/después y una explicación corta de qué y por qué,
// para que la corrección enseñe en vez de solo "hacer magia".
// Los huecos ___ no se tocan nunca: eso lo tiene que pensar el alumno.

export interface CodeFix {
  /** Número de línea, desde 1. */
  line: number
  before: string
  after: string
  /** Qué cambió, en una frase. */
  what: string
  /** Por qué, en palabras para chicos. */
  why: string
}

export interface AutoFixResult {
  code: string
  fixes: CodeFix[]
  /** El código tiene huecos ___ que la Compu no puede (ni debe) adivinar. */
  hasBlanks: boolean
}

type Lang = 'python' | 'sql'

interface Rule {
  lang: Lang | 'both'
  /** Devuelve la línea corregida + explicación, o null si la regla no aplica. */
  apply: (line: string, ctx: { prev: string | undefined }) => { after: string; what: string; why: string } | null
}

const PY_PRINT_TYPOS = /\b(prin|pritn|prnit|prnt|pirnt|printt|pint|Print|PRINT)\s*\(/
const PY_INPUT_TYPOS = /\b(imput|inptu|inpt|Input|INPUT)\s*\(/
const BLOCK_START = /^\s*(if|elif|else|for|while|def)\b/

/** Cuenta comillas fuera de comentarios — aproximado, alcanza para código de taller. */
function countChar(line: string, ch: string): number {
  let n = 0
  for (const c of line) if (c === ch) n++
  return n
}

/** La comilla que quedó abierta al final de la línea (respeta un ' adentro de "…"). */
function unclosedQuote(line: string): '"' | "'" | null {
  let inS: '"' | "'" | null = null
  for (const c of line) {
    if (inS) { if (c === inS) inS = null }
    else if (c === '"' || c === "'") inS = c
    else if (c === '#') break
  }
  return inS
}

function stripComment(line: string): string {
  // Corta en el primer # que no está adentro de un string.
  let inS: string | null = null
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inS) { if (c === inS) inS = null }
    else if (c === '"' || c === "'") inS = c
    else if (c === '#') return line.slice(0, i)
  }
  return line
}

const RULES: Rule[] = [
  // Comillas "inteligentes" pegadas desde otro lado
  {
    lang: 'both',
    apply: (line) => {
      if (!/[“”‘’]/.test(line)) return null
      return {
        after: line.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"),
        what: 'Cambié las comillas curvas “ ” por comillas rectas " ".',
        why: 'Las comillas curvas aparecen cuando copiás de un documento. La compu solo entiende las rectas.',
      }
    },
  },
  // print mal escrito
  {
    lang: 'python',
    apply: (line) => {
      const m = line.match(PY_PRINT_TYPOS)
      if (!m) return null
      return {
        after: line.replace(PY_PRINT_TYPOS, 'print('),
        what: `Cambié "${m[1]}" por "print".`,
        why: 'La función para mostrar en pantalla se llama print: 5 letras, todo en minúscula.',
      }
    },
  },
  // input mal escrito
  {
    lang: 'python',
    apply: (line) => {
      const m = line.match(PY_INPUT_TYPOS)
      if (!m) return null
      return {
        after: line.replace(PY_INPUT_TYPOS, 'input('),
        what: `Cambié "${m[1]}" por "input".`,
        why: 'La función para preguntarle algo al usuario se llama input, todo en minúscula.',
      }
    },
  },
  // print sin paréntesis
  {
    lang: 'python',
    apply: (line) => {
      const m = line.match(/^(\s*)print\s+([^(=].*?)\s*$/)
      if (!m) return null
      return {
        after: `${m[1]}print(${m[2]})`,
        what: 'Le agregué los paréntesis a print.',
        why: 'En Python, print siempre lleva paréntesis: print(lo_que_querés_mostrar).',
      }
    },
  },
  // Comillas sin cerrar
  {
    lang: 'both',
    apply: (line) => {
      const q = unclosedQuote(line)
      if (!q) return null
      // Cerrar la comilla antes del paréntesis final si lo hay; si no, al final.
      const m = line.match(/^(.*?)(\)*)(\s*)$/)
      const after = m && m[2] ? `${m[1]}${q}${m[2]}${m[3]}` : `${line.trimEnd()}${q}`
      return {
        after,
        what: `Cerré la comilla ${q} que había quedado abierta.`,
        why: 'Todo texto empieza y termina con comillas. Si falta la de cierre, la compu no sabe dónde termina el texto.',
      }
    },
  },
  // Paréntesis sin cerrar
  {
    lang: 'both',
    apply: (line) => {
      const code = stripComment(line)
      const open = countChar(code, '('), close = countChar(code, ')')
      if (open <= close) return null
      const missing = ')'.repeat(open - close)
      const colon = /:\s*$/.test(code) && BLOCK_START.test(code)
      const after = colon ? line.replace(/:\s*$/, `${missing}:`) : `${line.trimEnd()}${missing}`
      return {
        after,
        what: open - close === 1 ? 'Cerré un paréntesis que faltaba.' : `Cerré ${open - close} paréntesis que faltaban.`,
        why: 'Cada ( necesita su ). Son como una caja: si la abrís, la tenés que cerrar.',
      }
    },
  },
  // Faltan los dos puntos en if/for/while/def/else
  {
    lang: 'python',
    apply: (line) => {
      const code = stripComment(line).trimEnd()
      if (!BLOCK_START.test(code) || code.endsWith(':')) return null
      const kw = code.trim().split(/\s|\(/)[0]
      return {
        after: `${code}:${line.slice(stripComment(line).length)}`,
        what: `Agregué los dos puntos ":" al final del ${kw}.`,
        why: `Después de un ${kw} siempre van dos puntos. Le avisan a Python que abajo viene el bloque de código que le pertenece.`,
      }
    },
  },
  // = en vez de == adentro de un if/elif/while
  {
    lang: 'python',
    apply: (line) => {
      const m = line.match(/^(\s*(?:if|elif|while)\b[^=!<>]*?[^=!<>\s])\s*=\s*(?!=)(.*)$/)
      if (!m) return null
      return {
        after: `${m[1]} == ${m[2]}`,
        what: 'Cambié "=" por "==" en la comparación.',
        why: 'Un solo = guarda un valor en una variable. Para PREGUNTAR si dos cosas son iguales se usan dos: ==.',
      }
    },
  },
  // true/false en minúscula
  {
    lang: 'python',
    apply: (line) => {
      const code = stripComment(line)
      const m = code.match(/(?<!["'\w])(true|false)(?!["'\w])/)
      if (!m) return null
      const fixed = m[1] === 'true' ? 'True' : 'False'
      return {
        after: line.replace(new RegExp(`(?<!["'\\w])${m[1]}(?!["'\\w])`), fixed),
        what: `Cambié "${m[1]}" por "${fixed}".`,
        why: 'En Python, True y False van con la primera letra en mayúscula.',
      }
    },
  },
  // Falta indentar la línea que sigue a un bloque
  {
    lang: 'python',
    apply: (line, { prev }) => {
      if (!prev || !line.trim()) return null
      const prevCode = stripComment(prev).trimEnd()
      if (!prevCode.endsWith(':') || !BLOCK_START.test(prevCode)) return null
      const prevIndent = prev.match(/^\s*/)?.[0].length ?? 0
      const indent = line.match(/^\s*/)?.[0].length ?? 0
      if (indent > prevIndent) return null
      return {
        after: ' '.repeat(prevIndent + 4) + line.trimStart(),
        what: 'Le agregué 4 espacios al principio de la línea (sangría).',
        why: 'Lo que va adentro de un if, for, while o def tiene que estar corrido a la derecha. Así Python sabe qué líneas le pertenecen.',
      }
    },
  },
  // Palabras de SQL mal escritas
  {
    lang: 'sql',
    apply: (line) => {
      const typos: [RegExp, string][] = [
        [/\b(SELEC|SLECT|SELCT|SELET|SELECCT)\b/i, 'SELECT'],
        [/\b(FORM|FRON|FRMO)\b/i, 'FROM'],
        [/\b(WERE|WHER|WHRE|WEHRE)\b/i, 'WHERE'],
        [/\b(INSER|INSRT|INSETR)\b/i, 'INSERT'],
        [/\b(VALUE|VALUS|VALEUS)\b(?=\s*\()/i, 'VALUES'],
        [/\b(UPDTE|UDPATE|UPDAT)\b/i, 'UPDATE'],
        [/\b(DELET|DELTE)\b/i, 'DELETE'],
        [/\b(CRATE|CREAT|CRETE)\b/i, 'CREATE'],
        [/\b(TABEL|TALBE|TABL)\b/i, 'TABLE'],
        [/\bORDER\s+(?!BY\b)(?=\w)/i, 'ORDER BY '],
      ]
      for (const [re, good] of typos) {
        const m = line.match(re)
        if (m) {
          const bad = m[0].trim()
          return {
            after: line.replace(re, good),
            what: good.trim() === 'ORDER BY' ? 'Agregué "BY" después de ORDER.' : `Cambié "${bad}" por "${good}".`,
            why: good.trim() === 'ORDER BY'
              ? 'Para ordenar en SQL se escribe ORDER BY, siempre las dos palabras juntas.'
              : `${good} es una palabra clave de SQL: tiene que estar escrita exacta para que la base de datos la entienda.`,
          }
        }
      }
      return null
    },
  },
  // INSERT sin INTO
  {
    lang: 'sql',
    apply: (line) => {
      if (!/\bINSERT\s+(?!INTO\b)\w/i.test(line)) return null
      return {
        after: line.replace(/\bINSERT\s+/i, 'INSERT INTO '),
        what: 'Agregué "INTO" después de INSERT.',
        why: 'Para agregar filas se escribe INSERT INTO tabla: el INTO le dice EN QUÉ tabla guardar.',
      }
    },
  },
]

export const MAX_AUTO_FIXES = 2

export function autoFixCode(code: string, lang: Lang, maxFixes = MAX_AUTO_FIXES): AutoFixResult {
  const lines = code.split('\n')
  const fixes: CodeFix[] = []
  const hasBlanks = /_{3,}/.test(code)

  for (let i = 0; i < lines.length && fixes.length < maxFixes; i++) {
    // Se aplican las reglas de a una por pasada: así una línea con dos
    // errores cuenta como dos arreglos (y cada uno trae su explicación).
    let guard = 0
    while (fixes.length < maxFixes && guard++ < 4) {
      const line = lines[i]
      if (!line.trim() || line.trim().startsWith('#') || line.trim().startsWith('--')) break
      let applied = false
      for (const rule of RULES) {
        if (rule.lang !== 'both' && rule.lang !== lang) continue
        const r = rule.apply(line, { prev: i > 0 ? lines[i - 1] : undefined })
        if (r && r.after !== line) {
          fixes.push({ line: i + 1, before: line, after: r.after, what: r.what, why: r.why })
          lines[i] = r.after
          applied = true
          break
        }
      }
      if (!applied) break
    }
  }

  return { code: lines.join('\n'), fixes, hasBlanks }
}
