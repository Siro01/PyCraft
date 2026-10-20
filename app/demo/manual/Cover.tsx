'use client'

import { useMemo, type CSSProperties } from 'react'
import PixelTitle from '@/components/game/map/PixelTitle'
import { PROP_BITMAPS } from '@/components/game/map/MapArt'
import { PixelGrid } from '@/components/game/items/ItemSprites'
import { CHEST_CLOSED, ICON_ARROW_RIGHT, PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { hash2 } from '@/lib/game/architect/art'
import { MANUAL, STOPS } from './content'
import { AVATAR, Dots, Node, Win } from './parts'

// ─── Portada: el mapa del manual ─────────────────────────────────────────────

const MAP_W = 80
const MAP_H = 56.5
type Side = 'up' | 'down' | 'left' | 'right'

// Recorrido en ángulo recto, igual que las rutas del mapa de actos.
const ROUTE: { x: number; y: number; side: Side }[] = [
  { x: 6, y: 44, side: 'down' },   // inicio (portada)
  { x: 16, y: 44, side: 'down' },
  { x: 16, y: 30, side: 'up' },
  { x: 30, y: 30, side: 'up' },
  { x: 30, y: 46, side: 'down' },
  { x: 46, y: 46, side: 'down' },
  { x: 46, y: 32, side: 'up' },
  { x: 58, y: 32, side: 'down' },
  { x: 58, y: 18, side: 'up' },
  { x: 70, y: 18, side: 'up' },
  { x: 70, y: 40, side: 'left' },
]
const SPUR = [{ x: 70, y: 40 }, { x: 77, y: 40 }, { x: 77, y: 49 }]
const BLOBS = [
  { x: 38, y: 38, r: 5.5 }, { x: 7, y: 34, r: 4.5 }, { x: 77, y: 28, r: 3.5 },
  { x: 57, y: 47, r: 6 }, { x: 20, y: 53, r: 4.5 }, { x: 42, y: 23, r: 3.4 },
]
const PROPS: { kind: keyof typeof PROP_BITMAPS; x: number; y: number }[] = [
  { kind: 'pine', x: 23, y: 36 }, { kind: 'pine', x: 25, y: 38.5 }, { kind: 'pine', x: 52, y: 25 },
  { kind: 'pine', x: 64, y: 26 }, { kind: 'pine', x: 10, y: 49 }, { kind: 'house', x: 36, y: 50 },
  { kind: 'creeper', x: 50, y: 51 }, { kind: 'cylinder', x: 64, y: 34.5 }, { kind: 'lighthouse', x: 75, y: 9 },
]
const PROP_INK: Record<string, string> = { '#': 'hsl(var(--tx))', o: 'hsl(var(--bg))', a: 'hsl(var(--accent))', h: 'hsl(var(--tx2))' }
const PX = 0.22 // un píxel de arte de los props, en casillas del mapa

const pct = (x: number, y: number): CSSProperties => ({ left: `${(x / MAP_W) * 100}%`, top: `${(y / MAP_H) * 100}%` })

function CoverMap() {
  // El tramado va como un solo trazado vectorial: un <pattern> por casilla hace
  // que el navegador imprima cada casilla como una imagen de página entera.
  const dither = useMemo(() => {
    const q = 0.25
    let d = ''
    for (let y = 0; y < Math.ceil(MAP_H); y++) {
      for (let x = 0; x < MAP_W; x++) {
        const hit = BLOBS.some((b) => Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) / b.r + (hash2(x, y) - 0.5) * 0.45 < 1)
        if (!hit) continue
        for (let j = 0; j < 4; j++) {
          for (let i = (j % 2); i < 4; i += 2) d += `M${x + i * q} ${y + j * q}h${q}v${q}h-${q}z`
        }
      }
    }
    return d
  }, [])
  const turns = ROUTE.slice(1, -1)
  const line = ROUTE.map((p) => `${p.x},${p.y}`).join(' ')
  return (
    <svg className="mm-cover-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
      <path d={dither} fill="hsl(var(--tx2))" />
      {PROPS.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) scale(${PX})`}>
          {PROP_BITMAPS[p.kind].flatMap((row, y) => [...row].map((ch, x) => PROP_INK[ch]
            ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={PROP_INK[ch]} />
            : null))}
        </g>
      ))}
      <polyline points={SPUR.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="hsl(var(--tx))" strokeWidth={0.45} strokeDasharray="0.55 0.55" />
      <polyline points={line} fill="none" stroke="hsl(var(--tx))" strokeWidth={0.7} strokeLinejoin="miter" strokeLinecap="square" />
      {turns.map((p, i) => <rect key={i} x={p.x - 0.75} y={p.y - 0.75} width={1.5} height={1.5} fill="hsl(var(--tx))" />)}
    </svg>
  )
}

export default function Cover({ pages }: { pages: Record<string, number> }) {
  const [start, ...stops] = ROUTE
  return (
    <article className="mm-page">
      <Dots />
      <CoverMap />
      <div style={{ position: 'absolute', left: 44, top: 40, maxWidth: 560 }}>
        <PixelTitle text={MANUAL.title.toUpperCase()} scale={7} />
        <div className="mm-display" style={{ fontSize: 64, marginTop: 14 }}>{MANUAL.product}</div>
        <p className="mm-read" style={{ marginTop: 10, maxWidth: 470 }}>{MANUAL.tagline}</p>
      </div>

      <Win title="LEEME.TXT" style={{ position: 'absolute', right: 40, top: 40, width: 250 }} bodyStyle={{ padding: '10px 12px' }}>
        <div className="mm-label" style={{ color: 'hsl(var(--tx2))' }}>{MANUAL.edition}</div>
        <p className="mm-read" style={{ marginTop: 6, color: 'hsl(var(--tx))' }}>{MANUAL.coverHint}</p>
      </Win>

      {/* Inicio: el avatar parado sobre la portada. */}
      <div className="mm-cover-stop" data-side="down" style={pct(start.x, start.y)}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 2 }}>
            <PixelGrid rows={AVATAR} size={44} />
          </div>
          <Node icon={ICON_ARROW_RIGHT} state="here" scale={2} />
        </div>
        <span className="mm-cover-tag"><span className="mm-h2">Portada</span><span className="mm-label">p. 1</span></span>
      </div>

      {stops.map((p, i) => {
        const s = STOPS[i]
        return (
          <div key={s.id} className="mm-cover-stop" data-side={p.side} style={pct(p.x, p.y)}>
            <Node icon={s.icon} state="done" scale={2} />
            <span className="mm-cover-tag"><span className="mm-h2">{s.name}</span><span className="mm-label">p. {pages[s.id]}</span></span>
          </div>
        )
      })}

      <div className="mm-cover-stop" data-side="left" style={pct(SPUR[2].x, SPUR[2].y)}>
        <PixelBitmap rows={CHEST_CLOSED} scale={3} />
        <span className="mm-cover-tag"><span className="mm-h2">Anexo</span><span className="mm-label">p. {pages.anexo}</span></span>
      </div>
    </article>
  )
}
