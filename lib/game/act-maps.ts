// Layout de los 4 ACTOS como mapa 2D navegable (estilo ruta Game Boy).
// Cada acto agrupa jefes por tipo y arma un camino en serpentina que los conecta,
// con un punto de entrada a la izquierda y un punto de salida a la derecha que
// dispara la transición de "pasar página" hacia el acto siguiente.

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

export interface MapPoint { x: number; y: number }
export type TileKind = 'path' | 'tree' | 'water'
export interface MapTile extends MapPoint {
  kind: TileKind
  /** Ramal corto sin salida — hoy es solo decorativo, pensado para colgar
   *  algo (secreto, jefe extra) más adelante. Se dibuja punteado y tenue. */
  branch?: boolean
  /** Tramo final que lleva al borde del acto — se resalta en acento con un
   *  brillo animado para que se note que ahí se pasa al mapa siguiente. */
  exit?: boolean
  /** Casilla de entrada por la que se vuelve al acto anterior — mismo
   *  resalte que `exit`, pero del lado izquierdo. */
  back?: boolean
}
export interface MapNode extends MapPoint { bossId: string }

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
  tiles: MapTile[]
  nodes: MapNode[]
  playground: MapPoint
  entry: MapPoint
  exit: MapPoint | null
}

const TILE = 48

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function hLine(tiles: Map<string, MapTile>, y: number, x1: number, x2: number) {
  const [a, b] = x1 <= x2 ? [x1, x2] : [x2, x1]
  for (let x = a; x <= b; x++) tiles.set(`${x},${y}`, { x, y, kind: 'path' })
}

function vLine(tiles: Map<string, MapTile>, x: number, y1: number, y2: number) {
  const [a, b] = y1 <= y2 ? [y1, y2] : [y2, y1]
  for (let y = a; y <= b; y++) tiles.set(`${x},${y}`, { x, y, kind: 'path' })
}

// Conecta dos puntos que no comparten fila ni columna con un codo en L, en
// vez de exigir que estén alineados — así el trazado puede curvarse en vez
// de ser una fila y columna perfectas. El lado del codo (horizontal u
// horizontal-primero) sale de una semilla, para que el resultado sea
// siempre el mismo pero no siempre "para el mismo lado".
function connect(tiles: Map<string, MapTile>, a: MapPoint, b: MapPoint, seed: number) {
  if (a.x === b.x) { vLine(tiles, a.x, a.y, b.y); return }
  if (a.y === b.y) { hLine(tiles, a.y, a.x, b.x); return }
  if (seededRandom(seed) < 0.5) {
    hLine(tiles, a.y, a.x, b.x)
    vLine(tiles, b.x, a.y, b.y)
  } else {
    vLine(tiles, a.x, a.y, b.y)
    hLine(tiles, b.y, a.x, b.x)
  }
}

function buildAct(opts: {
  key: string
  index: number
  roman: string
  title: string
  subtitle: string
  palette: MapTheme
  bosses: Boss[]
  hasExit: boolean
}): ActMapDef {
  const { bosses } = opts
  const PER_ROW = 3
  const COL_STEP = 6
  const ROW_STEP = 6
  const MARGIN_LEFT = 2
  const MARGIN_TOP = 3

  const jitter = (seed: number) => Math.round((seededRandom(seed) - 0.5) * 2) // -1, 0 o 1

  // La última fila tiene que terminar del lado derecho — es de ahí que sale
  // el tramo de salida hacia el próximo acto. La serpentina alterna el
  // sentido fila por fila para no dejar saltos largos, pero cuando esa
  // alternancia dejaría la última fila completa terminando a la izquierda
  // (pasa con un múltiplo exacto de PER_ROW, como los 6 jefes del Acto I) se
  // fuerza esa fila a ir de izquierda a derecha, así el último jefe siempre
  // queda en la columna más a la derecha del acto.
  const totalSegments = Math.ceil(bosses.length / PER_ROW)
  const lastSegmentLength = bosses.length - (totalSegments - 1) * PER_ROW
  const forceLastLeftToRight = lastSegmentLength === PER_ROW

  const nodes: MapNode[] = bosses.map((boss, i) => {
    const segment = Math.floor(i / PER_ROW)
    const within = i % PER_ROW
    const row = MARGIN_TOP + segment * ROW_STEP
    const isLastSegment = segment === totalSegments - 1
    const leftToRight = isLastSegment && forceLastLeftToRight ? true : segment % 2 === 0
    const col = MARGIN_LEFT + (leftToRight ? within : PER_ROW - 1 - within) * COL_STEP
    // Corrimiento chico y determinístico por nodo: rompe la grilla perfecta
    // (referencia: las rutas de un mapa de región nunca son un tablero) sin
    // desarmar el orden de lectura. La primera fila no sube, para no volver
    // a acercarse al cartucho del título.
    const jx = within === 0 ? 0 : jitter(opts.index * 97 + i * 13 + 1)
    const jyRaw = jitter(opts.index * 97 + i * 13 + 2)
    const jy = segment === 0 ? Math.max(0, jyRaw) : jyRaw
    return { bossId: boss.id, x: Math.max(MARGIN_LEFT, col + jx), y: Math.max(1, row + jy) }
  })

  const tiles = new Map<string, MapTile>()

  // Conecta nodos consecutivos con un codo cuando el corrimiento los sacó de
  // fila/columna — así el camino curva en vez de ser siempre una escuadra.
  for (let i = 0; i < nodes.length - 1; i++) {
    connect(tiles, nodes[i], nodes[i + 1], opts.index * 211 + i * 31 + 5)
  }

  const firstNode = nodes[0] ?? { x: MARGIN_LEFT, y: MARGIN_TOP }
  const lastNode = nodes[nodes.length - 1] ?? firstNode

  const entry: MapPoint = { x: Math.max(0, firstNode.x - 2), y: firstNode.y }
  hLine(tiles, entry.y, entry.x, firstNode.x)
  if (opts.index > 0) {
    // La casilla 0 es por donde se vuelve al acto anterior — se marca
    // `back: true` para que ActMap.tsx la pinte igual que la salida de
    // avance (mismo acento, misma barrera), y así se lea como "esto lleva a
    // otro mapa" sin importar para qué lado sea.
    tiles.set(`0,${entry.y}`, { x: 0, y: entry.y, kind: 'path', back: true })
  }

  let exit: MapPoint | null = null
  let maxX = Math.max(entry.x, ...nodes.map((n) => n.x))
  if (opts.hasExit) {
    // El tramo final se marca `exit: true` — ActMap.tsx lo pinta de acento
    // con un brillo animado, para que se note que ahí se pasa al mapa
    // siguiente y no es un tramo más del camino.
    exit = { x: lastNode.x + 3, y: lastNode.y }
    for (let x = lastNode.x; x <= exit.x; x++) {
      tiles.set(`${x},${exit.y}`, { x, y: exit.y, kind: 'path', exit: true })
    }
    maxX = Math.max(maxX, exit.x + 1)
  } else {
    // Acto final: el camino termina un par de casillas después del jefe, sin salida.
    hLine(tiles, lastNode.y, lastNode.x, lastNode.x + 2)
    maxX = Math.max(maxX, lastNode.x + 3)
  }

  // Patio de juegos: rama corta desde el punto de entrada, hacia arriba (o abajo
  // si no hay lugar), para no interferir con el corredor principal.
  const playgroundUp = entry.y - 3 >= 0
  const playground: MapPoint = { x: entry.x, y: playgroundUp ? entry.y - 3 : entry.y + 3 }
  vLine(tiles, entry.x, entry.y, playground.y)

  // Sendero secundario: un ramal corto y sin salida que no lleva a nada
  // todavía — el trazado ya soporta curvas y ramas, así que más adelante se
  // puede colgar un secreto en la punta. Se dibuja punteado y tenue (ver
  // .map-tile-branch en globals.css), como el camino a la isla del mapa de
  // referencia. Si no encuentra lugar libre, no se dibuja — no es necesario
  // que todos los actos tengan uno.
  {
    const mainTiles = Array.from(tiles.values())
    const originIdx = Math.floor(seededRandom(opts.index * 733 + 2) * mainTiles.length)
    const origin = mainTiles[originIdx]
    const dirs: MapPoint[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
    const dir = dirs[Math.floor(seededRandom(opts.index * 733 + 3) * dirs.length)]
    const len = 2 + Math.floor(seededRandom(opts.index * 733 + 4) * 3) // 2–4 casilleros
    const branchTiles: MapTile[] = []
    for (let s = 1; s <= len; s++) {
      const x = origin.x + dir.x * s
      const y = origin.y + dir.y * s
      if (x < 1 || y < 1 || tiles.has(`${x},${y}`)) break
      branchTiles.push({ x, y, kind: 'path', branch: true })
    }
    if (branchTiles.length >= 2) {
      for (const t of branchTiles) tiles.set(`${t.x},${t.y}`, t)
    }
  }

  const allTiles = Array.from(tiles.values())
  const maxY = Math.max(...nodes.map((n) => n.y), playground.y, entry.y, ...allTiles.map((t) => t.y))
  const width = Math.max(maxX, ...allTiles.map((t) => t.x)) + 3
  const height = maxY + 3

  // Terreno: manchas de 2×2 a 3×3 de montaña o de agua en zonas abiertas,
  // lejos del camino y de los nodos (con un casillero de margen alrededor) —
  // así el mapa lee como región con relieve, no como puntitos sueltos
  // pegados a la ruta.
  const occupied = new Set(tiles.keys())
  for (const n of nodes) occupied.add(`${n.x},${n.y}`)
  occupied.add(`${playground.x},${playground.y}`)

  const decorations: MapTile[] = []
  let seed = opts.index * 1000 + 7
  const next = () => { seed += 1; return seededRandom(seed) }
  const blobCount = 3 + Math.floor(next() * 3) // 3–5 manchas por acto
  for (let b = 0; b < blobCount; b++) {
    const kind: TileKind = next() < 0.55 ? 'tree' : 'water'
    const bw = 2 + Math.floor(next() * 2) // 2–3 de ancho
    const bh = 2 + Math.floor(next() * 2) // 2–3 de alto
    const bx = 1 + Math.floor(next() * Math.max(1, width - bw - 2))
    const by = 1 + Math.floor(next() * Math.max(1, height - bh - 2))

    let clear = true
    for (let x = bx - 1; x <= bx + bw && clear; x++) {
      for (let y = by - 1; y <= by + bh; y++) {
        if (occupied.has(`${x},${y}`)) { clear = false; break }
      }
    }
    if (!clear) continue

    for (let x = bx; x < bx + bw; x++) {
      for (let y = by; y < by + bh; y++) {
        const key = `${x},${y}`
        decorations.push({ x, y, kind })
        occupied.add(key)
      }
    }
  }

  return {
    key: opts.key,
    index: opts.index,
    roman: opts.roman,
    title: opts.title,
    subtitle: opts.subtitle,
    palette: opts.palette,
    bosses,
    width,
    height,
    tiles: [...tiles.values(), ...decorations],
    nodes,
    playground,
    entry,
    exit,
  }
}

export const TILE_SIZE = TILE

export const ACT_MAPS: ActMapDef[] = [
  buildAct({
    key: 'python',
    index: 0,
    roman: 'ACTO I',
    title: 'Python',
    subtitle: 'Variables, condicionales, bucles y funciones',
    palette: 'light',
    bosses: BOSSES.filter((b) => b.type === 'python'),
    hasExit: true,
  }),
  buildAct({
    key: 'sql',
    index: 1,
    roman: 'ACTO II',
    title: 'SQLite',
    subtitle: 'CREATE, SELECT, UPDATE, DELETE',
    palette: 'dark',
    bosses: BOSSES.filter((b) => b.type === 'sql'),
    hasExit: true,
  }),
  buildAct({
    key: 'mixed',
    index: 2,
    roman: 'ACTO III',
    title: 'Integración',
    subtitle: 'Python + sqlite3 combinados',
    palette: 'red',
    bosses: BOSSES.filter((b) => b.type === 'mixed'),
    hasExit: true,
  }),
  buildAct({
    key: 'final',
    index: 3,
    roman: 'ACTO IV',
    title: 'El Arquitecto',
    subtitle: 'El sistema completo, cara a cara',
    palette: 'red',
    bosses: BOSSES.filter((b) => b.type === 'final'),
    hasExit: false,
  }),
]
