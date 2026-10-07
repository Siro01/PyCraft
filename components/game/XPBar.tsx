'use client'

import { useEffect, useRef, useState } from 'react'
import { sfx } from '@/lib/game/architect/sound'

interface XPBarProps {
  current: number
  max: number
  label?: string
  /** Suena el "ding" de experiencia cuando baja la vida (por defecto sí). */
  sound?: boolean
}

interface Orb { id: number; x: number; dx: number; dy: number; delay: number }

const SEGMENTS = 18
let orbSeq = 0

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function makeOrbs(xPct: number, n: number): Orb[] {
  return Array.from({ length: n }, () => ({
    id: ++orbSeq,
    x: xPct,
    dx: Math.round((Math.random() - 0.5) * 120),
    dy: -Math.round(26 + Math.random() * 46),
    delay: Math.round(Math.random() * 140),
  }))
}

/** Orbe de experiencia de 7×7, dibujado píxel a píxel. El color titila verde ↔ amarillo (CSS). */
function OrbSprite() {
  const rows = ['..###..', '.#ooo#.', '#oowoo#', '#owwwo#', '#oowoo#', '.#ooo#.', '..###..']
  const fill: Record<string, string> = { '#': '#1f4a00', o: 'currentColor', w: '#fbffd0' }
  return (
    <svg width={14} height={14} viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((r, y) => [...r].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[ch]} />)))}
    </svg>
  )
}

/**
 * La vida del Archivista como la barra de experiencia de Minecraft: verde, en
 * segmentos, con el número de nivel arriba. Al perder vida suelta orbes de
 * experiencia, el tramo perdido destella y el número salta. Al hacerle clic
 * también suelta orbes.
 */
export default function XPBar({ current, max, label, sound = true }: XPBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const [orbs, setOrbs] = useState<Orb[]>([])
  const [ghost, setGhost] = useState<{ key: number; from: number; to: number } | null>(null)
  const [pop, setPop] = useState(0)
  const [hit, setHit] = useState(0)
  const prev = useRef(current)
  const trackRef = useRef<HTMLButtonElement>(null)

  const burst = (xPct: number, n: number) => {
    if (reducedMotion()) return
    const fresh = makeOrbs(xPct, n)
    setOrbs((o) => [...o, ...fresh])
    const ids = new Set(fresh.map((f) => f.id))
    setTimeout(() => setOrbs((o) => o.filter((f) => !ids.has(f.id))), 1300)
  }

  useEffect(() => {
    const before = prev.current
    prev.current = current
    if (current >= before) return
    const lost = before - current
    const fromPct = Math.max(0, Math.min(100, (before / max) * 100))
    setGhost({ key: Date.now(), from: fromPct, to: pct })
    setPop((p) => p + 1)
    setHit((h) => h + 1)
    burst(pct, Math.min(14, 5 + Math.round(lost / 8)))
    if (sound) sfx.xpGain(Math.min(6, 2 + Math.round(lost / 15)))
  }, [current])

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = trackRef.current?.getBoundingClientRect()
    const x = r && e.clientX ? ((e.clientX - r.left) / r.width) * 100 : pct
    burst(Math.max(0, Math.min(100, x)), 6)
    setPop((p) => p + 1)
    sfx.xpGain(2)
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="label-mono">{label}</span>
          <span className="font-mono text-xs text-tx3 tabular">{current} / {max}</span>
        </div>
      )}
      <div className="xpbar">
        <span key={`lvl-${pop}`} className={`xpbar-level${pop ? ' xpbar-level--pop' : ''}`} aria-hidden>{current}</span>
        <button
          ref={trackRef}
          type="button"
          key={`trk-${hit}`}
          className={`xpbar-track${hit ? ' xpbar-track--hit' : ''}`}
          onClick={onClick}
          aria-label={`Vida del jefe: ${current} de ${max}`}
          style={{ ['--seg' as string]: `${100 / SEGMENTS}%` }}
        >
          <span className="xpbar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
          {ghost && (
            <span key={ghost.key} className="xpbar-ghost" style={{ left: `${ghost.to}%`, width: `${ghost.from - ghost.to}%` }} />
          )}
          <span className="xpbar-notches" />
        </button>
        {orbs.map((o) => (
          <span
            key={o.id}
            className="xp-orb"
            style={{ left: `${o.x}%`, animationDelay: `${o.delay}ms`, ['--dx' as string]: `${o.dx}px`, ['--dy' as string]: `${o.dy}px` }}
          >
            <OrbSprite />
          </span>
        ))}
      </div>
    </div>
  )
}
