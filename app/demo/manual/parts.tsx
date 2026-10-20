'use client'

import { useId, type CSSProperties, type ReactNode } from 'react'
import { avatarRows } from '@/components/game/map/avatars'
import { PixelGrid } from '@/components/game/items/ItemSprites'
import { ICON_CLOSE, PixelBitmap, type Bitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { MAP_PALETTES, MAP_PALETTE_ON_ACCENT, type MapTheme } from '@/lib/game/act-maps'
import { MANUAL, STATE_LABELS, STOPS, type CheckState } from './content'

// Piezas que comparten todas las hojas del manual.

export const AVATAR = avatarRows('minero', 'down', 0)

export function themeVars(theme: MapTheme): CSSProperties {
  return { ...MAP_PALETTES[theme], '--on-accent': MAP_PALETTE_ON_ACCENT[theme] } as CSSProperties
}

/** Triada HSL de los tokens ("0 0% 9%") → #RRGGBB, para escribir el código a mano. */
export function hslToHex(triad: string): string {
  const [h, s, l] = triad.split(/\s+/).map((v) => parseFloat(v))
  const sat = s / 100
  const lig = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Fondo de puntos de PyCraft OS (1px cada 14px, tinta al 15%). Va como un solo
// patrón SVG: un degradado por punto infla el PDF.
export function Dots() {
  const id = useId()
  return (
    <svg className="mm-dots" aria-hidden="true">
      <defs>
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="1.5" height="1.5" fill="hsl(var(--tx) / 0.15)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

export function Win({ title, rest = false, tone, children, style, bodyStyle, className }: {
  title: string; rest?: boolean; tone?: 'danger'; children: ReactNode; style?: CSSProperties; bodyStyle?: CSSProperties; className?: string
}) {
  return (
    <section className={`mm-win${tone ? ` mm-win--${tone}` : ''}${className ? ` ${className}` : ''}`} style={style}>
      <header className={`mm-win-bar${rest ? ' mm-win-bar--rest hatch' : ''}`}>
        <span className="mm-win-title">{title}</span>
        <span className="mm-win-close"><PixelBitmap rows={ICON_CLOSE} scale={2} ink={rest ? 'hsl(var(--tx))' : 'hsl(var(--bg))'} /></span>
      </header>
      <div className="mm-win-body" style={bodyStyle}>{children}</div>
    </section>
  )
}

export type NodeState = 'done' | 'here' | 'next'

export function Node({ icon, state, scale = 2 }: { icon: Bitmap; state: NodeState; scale?: number }) {
  const ink = state === 'done' ? 'hsl(var(--bg))' : state === 'here' ? 'var(--on-accent)' : 'hsl(var(--tx3))'
  return (
    <div className="mm-node" data-state={state}>
      <div className="mm-node-in"><PixelBitmap rows={icon} scale={scale} ink={ink} style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }} /></div>
    </div>
  )
}

function Rail({ here }: { here: string }) {
  const found = STOPS.findIndex((s) => s.id === here)
  const idx = found < 0 ? STOPS.length : found
  const last = STOPS.length - 1
  const at = (i: number) => `calc(13px + (100% - 26px) * ${i / last})`
  return (
    <nav className="mm-rail" aria-label="Recorrido del manual">
      <div className="mm-rail-line" />
      <div className="mm-rail-line-done" style={{ width: `calc((100% - 26px) * ${Math.min(idx, last) / last})` }} />
      {STOPS.map((s, i) => {
        const state: NodeState = i < idx ? 'done' : i === idx ? 'here' : 'next'
        return (
          <div key={s.id} className="mm-rail-stop" data-state={state} style={{ left: at(i) }}>
            {state === 'here' && <div className="mm-rail-avatar"><PixelGrid rows={AVATAR} size={26} /></div>}
            <Node icon={s.icon} state={state} scale={1} />
            <span className="mm-label mm-rail-name">{s.name}</span>
          </div>
        )
      })}
    </nav>
  )
}

export function Page({ folio, here, children }: { folio: number; here: string; children: ReactNode }) {
  return (
    <article className="mm-page">
      <Dots />
      <div className="mm-inner">
        <Rail here={here} />
        {children}
        <footer className="mm-foot">
          <span className="mm-label">{MANUAL.product} · {MANUAL.title}</span>
          <span className="mm-folio">{folio}</span>
        </footer>
      </div>
    </article>
  )
}

export function PageHead({ title, summary }: { title: string; summary?: string }) {
  return (
    <header className="mm-head">
      <h1 className="mm-h1">{title}</h1>
      {summary && <p className="mm-read mm-summary">{summary}</p>}
    </header>
  )
}

export function State({ state, size }: { state: CheckState; size?: number }) {
  return <span className="mm-state" data-state={state} role="img" aria-label={STATE_LABELS[state]} style={size ? { width: size, height: size } : undefined} />
}

/** Lista corta de rasgos: cuadrado lleno = es, punteado = no es. */
export function Traits({ is, isNot }: { is: string[]; isNot: string[] }) {
  return (
    <div className="mm-traits">
      <div>
        <h2 className="mm-h2 mm-sub">Es</h2>
        {is.map((t) => <div key={t} className="mm-trait"><State state="ok" size={12} />{t}</div>)}
      </div>
      <div>
        <h2 className="mm-h2 mm-sub">No es</h2>
        {isNot.map((t) => <div key={t} className="mm-trait mm-trait--not"><State state="falta" size={12} />{t}</div>)}
      </div>
    </div>
  )
}

/** Fila de datos chicos: etiqueta arriba, valor abajo. */
export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="mm-facts">
      {items.map((f) => (
        <div key={f.label}>
          <dt className="mm-label">{f.label}</dt>
          <dd className="mm-h2">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Swatch({ color, size = 18 }: { color: string; size?: number }) {
  return <span style={{ display: 'inline-block', width: size, height: size, background: color, border: '2px solid hsl(var(--tx))', flex: 'none', verticalAlign: 'middle' }} />
}

/** Captura de pantalla real del juego dentro de una ventana. `y` recorta desde arriba (0-100). */
export function Shot({ name, title, y = 0 }: { name: string; title: string; y?: number }) {
  return (
    <Win title={title} bodyStyle={{ padding: 0, lineHeight: 0, background: 'hsl(var(--bg))' }}>
      <img src={`/manual/shots/${name}.png`} alt="" className="mm-shot" style={{ objectPosition: `50% ${y}%` }} />
    </Win>
  )
}
