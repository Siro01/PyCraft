// Los 4 ACTOS como mapas de región pixel-art (referencia: póster 1-bit de un
// mapa de región de Game Boy). Cada acto está DIBUJADO A MANO como un grafo de
// rutas en ángulo recto — con bucles, ramales y desvíos — en vez de una
// serpentina generada: para llegar a cada jefe hay que pasear por el mapa.
//
// Unidades: el mapa es una grilla de MAP_W × MAP_H casillas. Todo lo que es
// arte (manchas de terreno, props, marcas) vive en "píxeles de arte" dentro de
// un viewBox de MAP_W·ART × MAP_H·ART, y ActMap lo escala al ancho real.

import type { Boss } from '@/types'
import { BOSSES } from './bosses'

export type MapTheme = 'light' | 'dark' | 'red'

// Triadas HSL exactas de los 3 temas del sitio (app/globals.css) — se aplican
// como variables inline en el contenedor del mapa, sin depender de [data-theme]
// en <html>, para que cada acto tenga su paleta propia sin pisar el tema global.
export const MAP_PALETTES: Record<MapTheme, Record<string, string>> = {
  light: {
    '--bg': '0 0% 100%', '--surface': '0 0% 98%', '--surface2': '0 0% 96%',
    '--border': '0 0% 90%', '--border2': '0 0% 83%',
    '--tx': '0 0% 4%', '--tx2': '0 0% 32%', '--tx3': '0 0% 42%',
    '--accent': '0 0% 9%', '--accent2': '0 0% 25%',
    '--python': '0 0% 25%', '--sql': '0 0% 40%', '--danger': '0 0% 9%',
  },
  dark: {
    '--bg': '0 0% 0%', '--surface': '0 0% 9%', '--surface2': '0 0% 15%',
    '--border': '0 0% 15%', '--border2': '0 0% 32%',
    '--tx': '0 0% 96%', '--tx2': '0 0% 64%', '--tx3': '0 0% 58%',
    '--accent': '0 0% 90%', '--accent2': '0 0% 75%',
    '--python': '0 0% 83%', '--sql': '0 0% 64%', '--danger': '0 0% 96%',
  },
  red: {
    '--bg': '240 11% 4%', '--surface': '240 9% 7%', '--surface2': '240 8% 10%',
    '--border': '240 8% 14%', '--border2': '240 7% 22%',
    '--tx': '240 20% 93%', '--tx2': '240 8% 56%', '--tx3': '240 6% 54%',
    '--accent': '348 83% 47%', '--accent2': '348 70% 62%',
    '--python': '351 100% 62%', '--sql': '345 100% 30%', '--danger': '348 100% 55%',
  },
}

export const MAP_PALETTE_ON_ACCENT: Record<MapTheme, string> = {
  light: 'hsl(0 0% 100%)',
  dark: 'hsl(0 0% 0%)',
  red: '#fff',
}

/** Casillas del mapa (todas las regiones miden lo mismo: 16:9). */
export const MAP_W = 32
export const MAP_H = 18
/** Píxeles de arte por casilla. 9 deja el centro en 4.5 y una vía de 3px
 *  (de 3 a 6) cae justo en píxeles enteros. */
export const ART = 9

export interface MapPoint { x: number; y: number }
type P = [number, number]

export type BlobKind =
  /** Tramado 50% sin contorno: bosque / montaña (las manchas de la referencia). */
  | 'dither'
  /** Contorno duro + tramado: isla. */
  | 'island'
  /** Solo contorno, con olas adentro: lago / río. */
  | 'lake'

export interface MapBlob { kind: BlobKind; c: P; r: P; seed: number }

export type PropKind =
  | 'pine' | 'house' | 'creeper' | 'cylinder' | 'lighthouse' | 'boat'
  | 'volcano' | 'bridge-h' | 'bridge-v' | 'portal' | 'serpent'

export interface MapProp { kind: PropKind; at: P }
export interface MapMark { kind: 'hill' | 'wave'; at: P }

export interface MapRoute {
  pts: P[]
  /** Sendero punteado (ruta por el agua, atajo secreto) — se camina igual. */
  dotted?: boolean
}

export interface MapNode extends MapPoint { bossId: string }

export interface MapSecret extends MapPoint {
  /** Lo que dice Rodolfo al abrir el cofre — un tip corto del acto. */
  tip: string
}

/** Fragmento de código roto del Acto IV, en celdas de la grilla ASCII. */
export interface AsciiFragment { col: number; row: number; text: string; hot?: boolean }

export interface ActMapDef {
  key: string
  index: number
  roman: string
  title: string
  subtitle: string
  palette: MapTheme
  bosses: Boss[]
  width: number
  height: number
  nodes: MapNode[]
  playground: MapPoint
  practice: MapPoint
  mercader: MapPoint
  /** La Escuelita de Rodolfo (repasos para ponerse al día) — solo aparece si el alumno tiene alguno habilitado. */
  school: MapPoint
  secret: MapSecret | null
  entry: MapPoint
  /** Casilla del borde derecho que lleva al acto siguiente. */
  exit: MapPoint | null
  /** Casilla donde aparece el avatar cuando vuelve desde el acto siguiente. */
  exitApproach: MapPoint | null
  /** Vecinos caminables por casilla ("x,y" → ["x,y", …]). Sale de las rutas,
   *  no de la adyacencia: dos rutas paralelas pegadas no se conectan solas. */
  links: Record<string, string[]>
  routes: MapRoute[]
  dots: MapPoint[]
  blobs: MapBlob[]
  props: MapProp[]
  marks: MapMark[]
  /** Acto IV: el terreno es ASCII (la cara del Arquitecto, código roto). */
  ascii: boolean
  fragments: AsciiFragment[]
}

export const key = (x: number, y: number) => `${x},${y}`

interface Layout {
  entry: P
  exit?: P
  bosses: P[]
  playground: P
  practice: P
  mercader: P
  school: P
  secret?: { at: P; tip: string }
  routes: MapRoute[]
  dots: P[]
  blobs: MapBlob[]
  props: MapProp[]
  marks: MapMark[]
  fragments?: AsciiFragment[]
}

function buildAct(meta: {
  key: string; index: number; roman: string; title: string; subtitle: string; palette: MapTheme; bosses: Boss[]; ascii?: boolean
}, l: Layout): ActMapDef {
  const links: Record<string, Set<string>> = {}
  const link = (a: string, b: string) => {
    ;(links[a] ??= new Set()).add(b)
    ;(links[b] ??= new Set()).add(a)
  }
  for (const r of l.routes) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [x1, y1] = r.pts[i]
      const [x2, y2] = r.pts[i + 1]
      if (x1 !== x2 && y1 !== y2 && process.env.NODE_ENV !== 'production') {
        console.warn(`[act-maps] ${meta.key}: tramo en diagonal ${x1},${y1} → ${x2},${y2}`)
      }
      const dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1)
      let x = x1, y = y1
      while (x !== x2 || y !== y2) {
        const nx = x + dx, ny = y + dy
        link(key(x, y), key(nx, ny))
        x = nx; y = ny
      }
    }
  }

  const pt = ([x, y]: P): MapPoint => ({ x, y })
  const nodes = meta.bosses.map((b, i) => ({ bossId: b.id, ...pt(l.bosses[i]) }))

  if (process.env.NODE_ENV !== 'production') {
    const must: [string, P][] = [
      ['entrada', l.entry], ['patio de juegos', l.playground], ['patio de prácticas', l.practice], ['tienda', l.mercader], ['escuelita', l.school],
      ...l.bosses.map((b, i) => [`jefe ${i + 1}`, b] as [string, P]),
    ]
    if (l.exit) must.push(['salida', l.exit])
    if (l.secret) must.push(['cofre', l.secret.at])
    for (const [name, p] of must) {
      if (!links[key(p[0], p[1])]) console.warn(`[act-maps] ${meta.key}: ${name} (${p}) no está sobre ninguna ruta`)
    }
  }

  const exit = l.exit ? pt(l.exit) : null
  let exitApproach: MapPoint | null = null
  if (exit) {
    const n = [...(links[key(exit.x, exit.y)] ?? [])][0]
    if (n) { const [x, y] = n.split(',').map(Number); exitApproach = { x, y } }
  }

  return {
    ...meta,
    ascii: !!meta.ascii,
    width: MAP_W,
    height: MAP_H,
    nodes,
    playground: pt(l.playground),
    practice: pt(l.practice),
    mercader: pt(l.mercader),
    school: pt(l.school),
    secret: l.secret ? { ...pt(l.secret.at), tip: l.secret.tip } : null,
    entry: pt(l.entry),
    exit,
    exitApproach,
    links: Object.fromEntries(Object.entries(links).map(([k, v]) => [k, [...v]])),
    routes: l.routes,
    dots: l.dots.map(pt),
    blobs: l.blobs,
    props: l.props,
    marks: l.marks,
    fragments: l.fragments ?? [],
  }
}

/** Camino más corto (BFS sobre las rutas) — para caminar con el mouse. */
export function findPath(act: ActMapDef, from: MapPoint, to: MapPoint): MapPoint[] | null {
  const start = key(from.x, from.y)
  const goal = key(to.x, to.y)
  if (start === goal) return []
  if (!act.links[goal]) return null
  const prev = new Map<string, string>([[start, '']])
  const queue = [start]
  while (queue.length) {
    const cur = queue.shift()!
    if (cur === goal) break
    for (const n of act.links[cur] ?? []) {
      if (prev.has(n)) continue
      prev.set(n, cur)
      queue.push(n)
    }
  }
  if (!prev.has(goal)) return null
  const out: MapPoint[] = []
  for (let k = goal; k !== start; k = prev.get(k)!) {
    const [x, y] = k.split(',').map(Number)
    out.unshift({ x, y })
  }
  return out
}

// ─── ACTO I · Python — el bosque ─────────────────────────────────────────────
// Un bucle grande en el centro (como la vuelta de la referencia) con la tienda
// en el claro de adentro. El primer jefe está cerca; el segundo, colgado arriba
// de una torre; para el tercero y el cuarto hay que dar la vuelta entera.
const ACT_I: Layout = {
  entry: [0, 8],
  exit: [31, 12],
  bosses: [[9, 4], [14, 1], [19, 13], [9, 13], [24, 3], [28, 12]],
  playground: [5, 3],
  practice: [5, 12],
  mercader: [14, 10],
  school: [2, 8],
  secret: { at: [1, 15], tip: 'Un cofre escondido... adentro dice: «print() es tu linterna: si no sabés qué pasa, imprimilo».' },
  routes: [
    { pts: [[0, 8], [9, 8]] },
    { pts: [[5, 3], [5, 12]] },
    { pts: [[9, 4], [19, 4], [19, 13], [9, 13], [9, 4]] },
    { pts: [[14, 4], [14, 1]] },
    { pts: [[14, 13], [14, 10]] },
    { pts: [[19, 8], [28, 8], [28, 12], [31, 12]] },
    { pts: [[24, 8], [24, 3]] },
    { pts: [[5, 12], [5, 15], [1, 15]], dotted: true },
  ],
  dots: [[5, 8], [9, 8], [14, 4], [19, 8], [14, 13], [24, 8], [28, 8]],
  blobs: [
    { kind: 'dither', c: [2.5, 2.5], r: [3.6, 2.6], seed: 3 },
    { kind: 'dither', c: [28, 3.5], r: [4.4, 4.2], seed: 11 },
    { kind: 'dither', c: [14, 7.2], r: [3.2, 1.8], seed: 7 },
    { kind: 'dither', c: [23.5, 15.5], r: [3.5, 2], seed: 21 },
    { kind: 'lake', c: [13.8, 16.2], r: [3.6, 1.35], seed: 5 },
  ],
  props: [
    { kind: 'pine', at: [11.6, 1.6] },
    { kind: 'pine', at: [16.5, 1.4] },
    { kind: 'pine', at: [21.7, 5.6] },
    { kind: 'house', at: [7.2, 2.2] },
    { kind: 'house', at: [2.4, 9.9] },
    { kind: 'creeper', at: [16.6, 10.6] },
    { kind: 'serpent', at: [8.2, 16.1] },
  ],
  marks: [
    { kind: 'hill', at: [12, 6] }, { kind: 'hill', at: [17, 11.4] }, { kind: 'hill', at: [21.5, 10.8] },
    { kind: 'hill', at: [3.4, 17] }, { kind: 'hill', at: [19.6, 16.4] }, { kind: 'hill', at: [26.5, 10.3] },
    { kind: 'hill', at: [30, 15.5] }, { kind: 'hill', at: [2.5, 6.2] },
    { kind: 'wave', at: [12.6, 16.3] }, { kind: 'wave', at: [15.6, 16.8] },
  ],
}

// ─── ACTO II · SQLite — el archipiélago de las tablas ────────────────────────
// Islas sueltas en un mar de datos, unidas por rutas punteadas sobre el agua.
// El segundo jefe queda al sur y obliga a bajar y volver por el bucle.
const ACT_II: Layout = {
  entry: [0, 9],
  exit: [31, 13],
  bosses: [[8, 4], [16, 14], [23, 4], [27, 13]],
  playground: [4, 13],
  practice: [15, 4],
  mercader: [28, 4],
  school: [2, 9],
  secret: { at: [8, 16], tip: 'Un cofre flotando... adentro dice: «SELECT * trae todo; con WHERE elegís qué filas querés».' },
  routes: [
    { pts: [[0, 9], [4, 9]] },
    { pts: [[4, 9], [12, 9]], dotted: true },
    { pts: [[4, 9], [4, 4], [8, 4]] },
    { pts: [[4, 9], [4, 13]] },
    { pts: [[4, 13], [4, 16], [8, 16]], dotted: true },
    { pts: [[12, 4], [12, 14], [16, 14], [22, 14], [22, 9]] },
    { pts: [[12, 4], [15, 4]] },
    { pts: [[12, 9], [19, 9]] },
    { pts: [[19, 9], [19, 4], [23, 4], [28, 4]] },
    { pts: [[19, 9], [27, 9]], dotted: true },
    { pts: [[27, 9], [27, 13], [31, 13]] },
  ],
  dots: [[4, 9], [12, 9], [19, 9], [22, 9], [27, 9], [12, 4]],
  blobs: [
    { kind: 'island', c: [6.2, 4.6], r: [4.2, 3.2], seed: 2 },
    { kind: 'island', c: [16.3, 12], r: [5.6, 4], seed: 9 },
    { kind: 'island', c: [23.6, 4.2], r: [6.4, 2.9], seed: 4 },
    { kind: 'island', c: [27.6, 13.4], r: [3.6, 3.2], seed: 14 },
    { kind: 'island', c: [3.4, 13.6], r: [2.2, 1.9], seed: 6 },
  ],
  props: [
    { kind: 'lighthouse', at: [1.6, 2.4] },
    { kind: 'cylinder', at: [17.8, 6.6] },
    { kind: 'cylinder', at: [30, 7.1] },
    { kind: 'boat', at: [9, 11.3] },
    { kind: 'boat', at: [24.6, 11.1] },
  ],
  marks: [
    { kind: 'wave', at: [9.6, 1.6] }, { kind: 'wave', at: [15.8, 1.4] }, { kind: 'wave', at: [2, 7] },
    { kind: 'wave', at: [8.3, 7.4] }, { kind: 'wave', at: [10.6, 12.4] }, { kind: 'wave', at: [1.7, 16.6] },
    { kind: 'wave', at: [13.2, 16.8] }, { kind: 'wave', at: [20.8, 16.4] }, { kind: 'wave', at: [31, 2.2] },
    { kind: 'wave', at: [24.6, 7.4] }, { kind: 'wave', at: [30.6, 16.8] }, { kind: 'wave', at: [6.4, 10.7] },
    { kind: 'hill', at: [21, 12] }, { kind: 'hill', at: [5.4, 6] },
  ],
}

// ─── ACTO III · Integración — la frontera ────────────────────────────────────
// La tierra de Python (bosque, a la izquierda) y el mar de SQL (a la derecha)
// separadas por un río; El Nexo custodia el puente. La Hydra vive en el lago
// del sur y el Dragón Rojo en el volcán, justo antes de la salida.
const ACT_III: Layout = {
  entry: [0, 4],
  exit: [31, 4],
  bosses: [[15, 8], [10, 14], [26, 4]],
  playground: [4, 1],
  practice: [20, 14],
  mercader: [27, 12],
  school: [7, 4],
  secret: { at: [6, 16], tip: 'Un cofre en la orilla... adentro dice: «conn.commit() guarda los cambios: sin commit, no pasó».' },
  routes: [
    { pts: [[0, 4], [10, 4], [10, 8], [15, 8], [27, 8], [27, 12]] },
    { pts: [[4, 1], [4, 14], [10, 14], [15, 14], [15, 8]] },
    { pts: [[20, 8], [20, 4], [26, 4], [31, 4]] },
    { pts: [[20, 8], [20, 14]] },
    { pts: [[10, 14], [10, 16], [6, 16]], dotted: true },
  ],
  dots: [[4, 4], [10, 4], [4, 10], [20, 8], [15, 14], [27, 8], [20, 4]],
  blobs: [
    { kind: 'dither', c: [2.6, 7.6], r: [2.4, 3], seed: 31 },
    { kind: 'dither', c: [7.3, 1.4], r: [2.8, 1.7], seed: 33 },
    { kind: 'dither', c: [12.6, 11], r: [2.2, 1.6], seed: 36 },
    { kind: 'lake', c: [17.6, 9], r: [1.15, 11], seed: 40 },
    { kind: 'lake', c: [9.6, 15.2], r: [3.2, 1.9], seed: 44 },
    { kind: 'dither', c: [29, 15.4], r: [3.6, 2.4], seed: 47 },
  ],
  props: [
    { kind: 'bridge-h', at: [17.6, 8] },
    { kind: 'volcano', at: [25.1, 1.2] },
    { kind: 'portal', at: [13.4, 5.8] },
    { kind: 'pine', at: [1.4, 12.6] },
    { kind: 'pine', at: [7.4, 6.2] },
    { kind: 'cylinder', at: [23.2, 11.4] },
    { kind: 'boat', at: [29.6, 9.8] },
  ],
  marks: [
    { kind: 'wave', at: [17.6, 3.2] }, { kind: 'wave', at: [17.6, 13.4] }, { kind: 'wave', at: [9.4, 15.3] },
    { kind: 'wave', at: [24.2, 15.8] }, { kind: 'wave', at: [30.4, 1.6] }, { kind: 'wave', at: [22.8, 6.2] },
    { kind: 'hill', at: [7, 11.4] }, { kind: 'hill', at: [12.4, 2] }, { kind: 'hill', at: [1.4, 16.6] },
    { kind: 'hill', at: [7.2, 9] },
  ],
}

// ─── ACTO IV · El Arquitecto — el sistema roto ───────────────────────────────
// Un solo jefe, al final de un camino que zigzaguea entre código corrupto
// hasta la cara del Arquitecto. El terreno no es pixel-art: es la misma grilla
// ASCII con la que se dibuja al jefe (ver AsciiField).
const ACT_IV: Layout = {
  entry: [0, 9],
  bosses: [[25, 8]],
  playground: [3, 15],
  practice: [9, 1],
  mercader: [15, 2],
  school: [1, 9],
  secret: { at: [21, 15], tip: 'Un cofre corrupto... adentro, entre basura, se lee: «el error no te borra nada. Leelo: te dice dónde mirar».' },
  routes: [
    { pts: [[0, 9], [3, 9], [3, 3], [9, 3], [9, 14], [15, 14], [15, 8], [25, 8]] },
    { pts: [[3, 9], [3, 15]] },
    { pts: [[9, 3], [9, 1]] },
    { pts: [[15, 8], [15, 2]] },
    { pts: [[15, 14], [21, 14], [21, 15]], dotted: true },
  ],
  dots: [[3, 9], [9, 3], [15, 14], [15, 8], [9, 9]],
  blobs: [],
  props: [],
  marks: [],
  // Celdas de la grilla ASCII (64 × 27): cada casilla del mapa son 2 columnas
  // y 1.5 filas. Ubicados en los huecos entre rutas para no taparlas.
  fragments: [
    { col: 0, row: 0, text: '>>> import salida' },
    { col: 8, row: 8, text: 'while 1:' },
    { col: 8, row: 9, text: '  vigila()', hot: true },
    { col: 8, row: 17, text: 'except:' },
    { col: 8, row: 18, text: '  pass  #?' },
    { col: 20, row: 7, text: 'ERR 0x0E', hot: true },
    { col: 20, row: 8, text: 'mem.rota' },
    { col: 20, row: 15, text: '01010000' },
    { col: 20, row: 16, text: '01011001' },
    { col: 0, row: 25, text: 'SELECT * FROM realidad;  -- 0 filas' },
    { col: 0, row: 26, text: 'Traceback (most recent call last):' },
  ],
}

export const ACT_MAPS: ActMapDef[] = [
  buildAct({
    key: 'python', index: 0, roman: 'ACTO I', title: 'Python',
    subtitle: 'Variables, condicionales, bucles y funciones', palette: 'light',
    bosses: BOSSES.filter((b) => b.type === 'python'),
  }, ACT_I),
  buildAct({
    key: 'sql', index: 1, roman: 'ACTO II', title: 'SQLite',
    subtitle: 'CREATE, SELECT, UPDATE, DELETE', palette: 'dark',
    bosses: BOSSES.filter((b) => b.type === 'sql'),
  }, ACT_II),
  buildAct({
    key: 'mixed', index: 2, roman: 'ACTO III', title: 'Integración',
    subtitle: 'Python + sqlite3 combinados', palette: 'red',
    bosses: BOSSES.filter((b) => b.type === 'mixed'),
  }, ACT_III),
  buildAct({
    key: 'final', index: 3, roman: 'ACTO IV', title: 'El Arquitecto',
    subtitle: 'El sistema completo, cara a cara', palette: 'red',
    bosses: BOSSES.filter((b) => b.type === 'final'),
    ascii: true,
  }, ACT_IV),
]
