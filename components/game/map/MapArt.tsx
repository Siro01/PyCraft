'use client'

import { memo, useId, useMemo } from 'react'
import { ART, type ActMapDef, type MapBlob, type PropKind } from '@/lib/game/act-maps'
import { hash2 } from '@/lib/game/architect/art'
import AsciiField from './AsciiField'

// Arte del mapa en un solo SVG de "píxeles de arte" (ART por casilla):
// terreno tramado, costas, props, rutas en ángulo recto, puntos de paso y las
// barras de salida — el mismo vocabulario del póster de referencia, con props
// propios de PyCraft (bloque creeper, cilindro de base de datos, volcán del
// dragón, portal del Nexo). Todo sale de los tokens: se repinta solo con la
// paleta del acto. Es estático por acto (memo), así que caminar no lo redibuja.

const CELL = 2 // resolución del terreno: celdas de 2×2 píxeles de arte

type Bmp = string[]
const pad = (rows: Bmp): Bmp => {
  const w = Math.max(...rows.map((r) => r.length))
  return rows.map((r) => r.padEnd(w, '.'))
}

export const PROP_BITMAPS: Record<PropKind, Bmp> = {
  pine: pad(['...#...', '..###..', '.#####.', '..###..', '.#####.', '#######', '...#...', '...#...']),
  house: pad(['....#....', '...###...', '..#ooo#..', '.#ooooo#.', '#########', '.#ooooo#.', '.#o#o#o#.', '.#o#ooo#.', '.#######.']),
  creeper: pad(['##########', '#ohooohoo#', '#o##oo##o#', '#o##oo##o#', '#ooo##ooo#', '#oo####oo#', '#oo####oh#', '#oo#oo#oo#', '#hoooooho#', '##########']),
  cylinder: pad(['.#######.', '#ooooooo#', '.#######.', '#ooooooo#', '#ooaoooo#', '.#######.', '#ooooooo#', '#ooooooo#', '.#######.']),
  lighthouse: pad(['...a...', '..###..', '..#a#..', '.#####.', '..#o#..', '..###..', '..#o#..', '..###..', '.#ooo#.', '.#####.', '#######']),
  boat: pad(['....#....', '...##....', '..#o#....', '.#oo#....', '....#....', '#########', '.#ooooo#.', '..#####..']),
  volcano: pad(['......a.a......', '.......a.......', '.....#####.....', '....#oaaao#....', '...#ooo#ooo#...', '..#oo#ooooo#...', '.#ooooooo#oo#..', '#ooo#ooooooooo#', '###############']),
  'bridge-h': pad(['#...#...#...#', '#############', 'ooooooooooooo', 'ooooooooooooo', 'ooooooooooooo', 'ooooooooooooo', 'ooooooooooooo', '#############', '#...#...#...#']),
  'bridge-v': pad(['##ooooo##', '.#ooooo#.', '.#ooooo#.', '##ooooo##', '.#ooooo#.', '.#ooooo#.', '##ooooo##']),
  portal: pad(['..#####..', '.#aaaaa#.', '#a#####a#', '#a#ooo#a#', '#a#ooo#a#', '#a#ooo#a#', '#a#ooo#a#', '#a#####a#', '.#aaaaa#.', '..#####..']),
  serpent: pad(['........####.', '.......#oaoo#', '..###..#oo###', '.#ooo#.#oo#..', '#oo#oo#oo#...', '#o#.#oooo#...', '.#...####....']),
}

const MARKS: Record<'hill' | 'wave', Bmp> = {
  hill: ['.###.', '#...#'],
  wave: ['.##..##.', '#..##..#'],
}

const DOT: Bmp = ['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..']

const INK: Record<string, string> = {
  '#': 'hsl(var(--tx))',
  o: 'hsl(var(--bg))',
  h: 'hsl(var(--tx2))',
  a: 'hsl(var(--accent))',
}

/** Filas de un bitmap → un <path> por color (runs horizontales). */
function bitmapPaths(rows: Bmp, ox: number, oy: number): Record<string, string> {
  const out: Record<string, string> = {}
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (!INK[ch]) { x++; continue }
      let n = 1
      while (row[x + n] === ch) n++
      out[ch] = (out[ch] ?? '') + `M${ox + x} ${oy + y}h${n}v1h${-n}z`
      x += n
    }
  })
  return out
}

function Bitmap({ rows, cx, cy, glowClass }: { rows: Bmp; cx: number; cy: number; glowClass?: string }) {
  const w = rows[0].length
  const h = rows.length
  const paths = bitmapPaths(rows, Math.round(cx - w / 2), Math.round(cy - h / 2))
  return (
    <g>
      {Object.entries(paths).map(([ch, d]) => (
        <path key={ch} d={d} fill={INK[ch]} className={ch === 'a' ? glowClass : undefined} />
      ))}
    </g>
  )
}

// ── Terreno ─────────────────────────────────────────────────────────────────

function inBlob(b: MapBlob, tx: number, ty: number): boolean {
  const nx = (tx - b.c[0]) / b.r[0]
  const ny = (ty - b.c[1]) / b.r[1]
  const a = Math.atan2(ny, nx)
  const s = b.seed
  const wobble = 0.13 * Math.sin(3 * a + s) + 0.09 * Math.sin(5 * a + 2 * s) + 0.06 * Math.sin(9 * a + 3 * s)
  return Math.hypot(nx, ny) < 1 + wobble
}

function runsToPath(mask: Uint8Array, mw: number, mh: number): string {
  let d = ''
  for (let j = 0; j < mh; j++) {
    let i = 0
    while (i < mw) {
      if (!mask[j * mw + i]) { i++; continue }
      let n = 1
      while (i + n < mw && mask[j * mw + i + n]) n++
      d += `M${i * CELL} ${j * CELL}h${n * CELL}v${CELL}h${-n * CELL}z`
      i += n
    }
  }
  return d
}

/** Zonas a dejar limpias: rutas (con margen) y nodos — así la línea y las
 *  puertas siempre se leen, como el corte blanco del tramado en la referencia. */
export function clearRects(act: ActMapDef): [number, number, number, number][] {
  const rects: [number, number, number, number][] = []
  const c = (v: number) => v * ART + ART / 2
  const M = 5
  for (const r of act.routes) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [x1, y1] = r.pts[i]
      const [x2, y2] = r.pts[i + 1]
      rects.push([Math.min(c(x1), c(x2)) - M, Math.min(c(y1), c(y2)) - M, Math.max(c(x1), c(x2)) + M, Math.max(c(y1), c(y2)) + M])
    }
  }
  const nodeR = 10
  const pts = [...act.nodes, act.playground, act.practice, act.mercader, ...(act.secret ? [act.secret] : [])]
  for (const p of pts) rects.push([c(p.x) - nodeR, c(p.y) - nodeR - 6, c(p.x) + nodeR, c(p.y) + nodeR])
  for (const p of act.props) {
    const b = PROP_BITMAPS[p.kind]
    if (p.kind.startsWith('bridge')) continue
    const w = b[0].length, h = b.length
    rects.push([p.at[0] * ART - w / 2 - 2, p.at[1] * ART - h / 2 - 2, p.at[0] * ART + w / 2 + 2, p.at[1] * ART + h / 2 + 2])
  }
  return rects
}

function buildTerrain(act: ActMapDef) {
  const mw = Math.ceil((act.width * ART) / CELL)
  const mh = Math.ceil((act.height * ART) / CELL)
  const fill = new Uint8Array(mw * mh)
  const shore = new Uint8Array(mw * mh) // islas + lagos: los que llevan contorno
  for (let j = 0; j < mh; j++) {
    for (let i = 0; i < mw; i++) {
      const tx = ((i + 0.5) * CELL) / ART - 0.5
      const ty = ((j + 0.5) * CELL) / ART - 0.5
      for (const b of act.blobs) {
        if (!inBlob(b, tx, ty)) continue
        if (b.kind === 'dither' || b.kind === 'island') fill[j * mw + i] = 1
        if (b.kind === 'island' || b.kind === 'lake') shore[j * mw + i] = 1
      }
    }
  }
  const edge = new Uint8Array(mw * mh)
  for (let j = 0; j < mh; j++) {
    for (let i = 0; i < mw; i++) {
      if (!shore[j * mw + i]) continue
      const out = (ii: number, jj: number) => ii < 0 || jj < 0 || ii >= mw || jj >= mh ? false : !shore[jj * mw + ii]
      if (out(i + 1, j) || out(i - 1, j) || out(i, j + 1) || out(i, j - 1)) edge[j * mw + i] = 1
    }
  }
  // Lagos: adentro no hay tramado.
  for (let j = 0; j < mh; j++) {
    for (let i = 0; i < mw; i++) {
      const tx = ((i + 0.5) * CELL) / ART - 0.5
      const ty = ((j + 0.5) * CELL) / ART - 0.5
      if (act.blobs.some((b) => b.kind === 'lake' && inBlob(b, tx, ty))) fill[j * mw + i] = 0
    }
  }
  for (const [x1, y1, x2, y2] of clearRects(act)) {
    for (let j = Math.max(0, Math.floor(y1 / CELL)); j < Math.min(mh, Math.ceil(y2 / CELL)); j++) {
      for (let i = Math.max(0, Math.floor(x1 / CELL)); i < Math.min(mw, Math.ceil(x2 / CELL)); i++) {
        fill[j * mw + i] = 0
        edge[j * mw + i] = 0
      }
    }
  }
  return { fill: runsToPath(fill, mw, mh), edge: runsToPath(edge, mw, mh) }
}

// ── Rutas ───────────────────────────────────────────────────────────────────

const center = (v: number) => v * ART + ART / 2

function routePath(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${center(x)} ${center(y)}`).join('')
}

/** Acto IV: tramos que parpadean como si el camino estuviera roto. */
function brokenGaps(act: ActMapDef): { x: number; y: number; d: number }[] {
  const gaps: { x: number; y: number; d: number }[] = []
  const nodeKeys = new Set([...act.nodes, act.playground, act.practice, act.mercader, act.entry].map((p) => `${p.x},${p.y}`))
  for (const [k, ns] of Object.entries(act.links)) {
    const [x, y] = k.split(',').map(Number)
    for (const n of ns) {
      const [nx, ny] = n.split(',').map(Number)
      if (nx < x || ny < y) continue // cada tramo una vez
      if (nodeKeys.has(k) || nodeKeys.has(n)) continue
      if (hash2(x * 3 + nx, y * 5 + ny, 17) > 0.16) continue
      gaps.push({ x: (center(x) + center(nx)) / 2, y: (center(y) + center(ny)) / 2, d: hash2(x, y, 3) * 3 })
    }
  }
  return gaps
}

interface Props {
  act: ActMapDef
  /** El Arquitecto parpadea (solo Acto IV). */
  blink?: boolean
}

function MapArt({ act, blink = false }: Props) {
  const uid = useId().replace(/:/g, '')
  const W = act.width * ART
  const H = act.height * ART
  const terrain = useMemo(() => (act.ascii ? null : buildTerrain(act)), [act])
  const gaps = useMemo(() => (act.ascii ? brokenGaps(act) : []), [act])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, display: 'block' }}
    >
      <defs>
        <pattern id={`dither-${uid}`} width="2" height="2" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="1" height="1" fill="hsl(var(--tx))" />
          <rect x="1" y="1" width="1" height="1" fill="hsl(var(--tx))" />
        </pattern>
      </defs>

      {act.ascii && <AsciiField act={act} blink={blink} />}

      {terrain && (
        <>
          <path d={terrain.fill} fill={`url(#dither-${uid})`} />
          <path d={terrain.edge} fill="hsl(var(--tx))" />
        </>
      )}

      {act.marks.map((m, i) => (
        <Bitmap key={`m${i}`} rows={MARKS[m.kind]} cx={m.at[0] * ART} cy={m.at[1] * ART} />
      ))}

      {act.props.map((p, i) => (
        <Bitmap key={`p${i}`} rows={PROP_BITMAPS[p.kind]} cx={p.at[0] * ART + (p.kind.startsWith('bridge') ? ART / 2 : 0)} cy={p.at[1] * ART + (p.kind.startsWith('bridge') ? ART / 2 : 0)} glowClass="map-prop-glow" />
      ))}

      {/* Rutas: vía de 3px en ángulo recto; las punteadas se caminan igual. */}
      <g fill="none" strokeLinejoin="miter">
        {act.routes.map((r, i) => (
          <path
            key={`r${i}`}
            d={routePath(r.pts)}
            stroke={r.dotted ? 'hsl(var(--tx2))' : 'hsl(var(--tx))'}
            strokeWidth={3}
            // Punta cuadrada en la vía (esquinas llenas); en el sendero
            // punteado, punta recta — si no, cada guion se estira y se tapa
            // el hueco.
            strokeLinecap={r.dotted ? 'butt' : 'square'}
            strokeDasharray={r.dotted ? '3 3' : undefined}
          />
        ))}
      </g>

      {gaps.map((g, i) => (
        <rect
          key={`g${i}`}
          className="map-route-gap"
          x={g.x - 2.5}
          y={g.y - 2.5}
          width={5}
          height={5}
          fill="hsl(var(--bg))"
          style={{ animationDelay: `${g.d.toFixed(2)}s` }}
        />
      ))}

      {act.dots.map((d) => (
        <Bitmap key={`d${d.x},${d.y}`} rows={DOT} cx={center(d.x)} cy={center(d.y)} />
      ))}

      {/* Fin de vía: dos barras, como el borde de la referencia. Pulsan en
          acento para que se lea "por acá se sigue". */}
      {act.exit && (
        <g className="map-exit-bars" fill="hsl(var(--accent))">
          <rect x={act.exit.x * ART + 3} y={center(act.exit.y) - 4} width={2} height={9} />
          <rect x={act.exit.x * ART + 6} y={center(act.exit.y) - 4} width={2} height={9} />
        </g>
      )}
      {act.index > 0 && (
        <g className="map-exit-bars" fill="hsl(var(--accent))">
          <rect x={1} y={center(act.entry.y) - 4} width={2} height={9} />
          <rect x={4} y={center(act.entry.y) - 4} width={2} height={9} />
        </g>
      )}
    </svg>
  )
}

export default memo(MapArt)
