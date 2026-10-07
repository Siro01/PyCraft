'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ItemSprite } from '@/components/game/items/ItemSprites'
import { getChestSticker, lineFor, stageFor, type PokeFx } from '@/lib/game/chest-stickers'
import { sfx } from '@/lib/game/architect/sound'
import { addStickerPoke, getStickerPokes } from '@/lib/storage/local-store'

// Un sticker de cofre que reacciona al toque: cambia de cuadro, hace su
// movimiento (por pasos, como un sprite), suelta partículas pixel propias
// (escamas, gotas, burbujas, bits, corazones...) y dice una frase del lore.
// Los toques se acumulan para siempre en esta PC: hay stickers que cambian
// de etapa (el huevo se raja y nace) y todos sueltan una frase secreta si el
// alumno insiste. Nada de esto toca el progreso del juego.

export interface ToySay { text: string; secret: boolean; n: number }

interface Props {
  id: string
  /** Lado del dibujo en px (los sprites son de 16: múltiplos de 16 quedan nítidos). */
  size: number
  /** Globito propio arriba/abajo del sticker; 'none' = la frase la muestra quien lo contiene (onSay). */
  bubble?: 'top' | 'bottom' | 'none'
  align?: 'center' | 'start' | 'end'
  /** Con false, se dibuja quieto y no se puede tocar (ej. en modo decorar). */
  interactive?: boolean
  /** Vista de prueba: los toques cuentan solo en memoria. */
  demo?: boolean
  onSay?: (say: ToySay) => void
  /** Cada vez que cambia, el sticker se toca solo (botón "Tocar" de quien lo contiene). */
  pokeSignal?: number
  className?: string
}

const REACT_MS: Record<PokeFx, number> = { hiss: 520, bounce: 620, uncork: 700, vanish: 900, wobble: 560, snap: 520, glitch: 480, purr: 760 }

export default function ChestStickerToy({ id, size, bubble = 'top', align = 'center', interactive = true, demo = false, onSay, pokeSignal = 0, className = '' }: Props) {
  const def = getChestSticker(id)
  const [pokes, setPokes] = useState(0)
  const [reacting, setReacting] = useState(0) // 0 = quieto; si no, un id que reinicia la animación
  const [say, setSay] = useState<ToySay | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { if (!demo) setPokes(getStickerPokes()[id] ?? 0) }, [id, demo])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  const pokeRef = useRef<() => void>(() => {})
  const lastSignal = useRef(pokeSignal)
  useEffect(() => {
    if (pokeSignal === lastSignal.current) return
    lastSignal.current = pokeSignal
    pokeRef.current()
  }, [pokeSignal])

  if (!def) return null
  const stage = stageFor(def, pokes)
  const showPoke = reacting > 0 && stage.poke

  const poke = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation()
    if (!interactive) return
    const n = demo ? pokes + 1 : addStickerPoke(id)
    setPokes(n)
    const line = lineFor(def, n)
    sfx.poke(def.fx, line.secret)
    const next = { ...line, n }
    setSay(next)
    onSay?.(next)
    setReacting(n)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setReacting(0), REACT_MS[def.fx])
  }
  pokeRef.current = poke

  return (
    <span className={`cs-toy ${className}`.trim()} style={{ width: size, height: size }}>
      <span
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? `Tocar a ${def.name}` : undefined}
        onClick={poke}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(e) } }}
        onPointerDown={(e) => { if (interactive) e.stopPropagation() }}
        className={`cs-toy-hit${interactive ? ' is-live' : ''}`}
      >
        {/* La capa de adentro se vuelve a montar en cada toque (reinicia la animación) sin perder el foco. */}
        <span key={reacting || 'idle'} className={`cs-toy-body${reacting ? ` cs-poke--${def.fx}` : ''}`}>
          <ItemSprite sprite={showPoke ? stage.poke! : stage.sprite} size={size} animated={!reacting} />
          {/* El ojo se parte en dos: copia corrida en acento, cortada en tiras. */}
          {reacting > 0 && def.fx === 'glitch' && (
            <span className="cs-glitch-ghost" aria-hidden><ItemSprite sprite={stage.poke ?? stage.sprite} size={size} /></span>
          )}
        </span>
        {reacting > 0 && def.fx === 'bounce' && stage.from === 0 && (
          <span key={`c-${reacting}`} className="cs-bounce-count" aria-hidden>×{pokes}</span>
        )}
      </span>
      {reacting > 0 && <StickerFx key={`fx-${reacting}`} kind={def.fx} size={size} />}
      {bubble !== 'none' && say && (
        <StickerBubble key={`b-${say.n}`} say={say} voice={def.voice} place={bubble} align={align} onDone={() => setSay(null)} />
      )}
    </span>
  )
}

// ── Globito ──────────────────────────────────────────────────────────────────

/** Texto que se escribe letra por letra, con el tic de la voz del sticker. */
export function useTyped(text: string, voice: 'machine' | 'cat', active = true): string {
  const [out, setOut] = useState('')
  useEffect(() => {
    if (!active) { setOut(text); return }
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setOut(text); return }
    let i = 0
    setOut('')
    const t = setInterval(() => {
      i++
      setOut(text.slice(0, i))
      if (i % 3 === 1 && text[i - 1] !== ' ') sfx.type(voice)
      if (i >= text.length) clearInterval(t)
    }, 24)
    return () => clearInterval(t)
  }, [text, voice, active])
  return out
}

function StickerBubble({ say, voice, place, align, onDone }: {
  say: ToySay; voice: 'machine' | 'cat'; place: 'top' | 'bottom'; align: 'center' | 'start' | 'end'; onDone: () => void
}) {
  const typed = useTyped(say.text, voice)
  useEffect(() => {
    const t = setTimeout(onDone, 2400 + say.text.length * 55)
    return () => clearTimeout(t)
  }, [say, onDone])
  return (
    <span className={`cs-bubble cs-bubble--${place} cs-bubble--${align}${say.secret ? ' is-secret' : ''}`} role="status" aria-live="polite">
      {say.secret && <SecretTag />}
      <span className="cs-bubble-text">
        {typed}
        {/* Reserva el alto del texto entero: el globo no crece mientras se escribe. */}
        <span className="cs-bubble-ghost" aria-hidden>{say.text.slice(typed.length)}</span>
      </span>
    </span>
  )
}

export function SecretTag() {
  return (
    <span className="cs-secret-tag">
      <PixelStar px={7} /> Secreto
    </span>
  )
}

// ── Pixeles chiquitos (estrella de rareza y partículas) ──────────────────────

const STAR = ['...#...', '...#...', '..###..', '#######', '..###..', '...#...', '...#...']

function Bits({ rows, px, fill }: { rows: string[]; px: number; fill: string }) {
  const w = rows[0].length
  return (
    <svg width={px} height={(px / w) * rows.length} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" aria-hidden style={{ display: 'block' }}>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} /> : null)))}
    </svg>
  )
}

export function PixelStar({ px = 7, fill = 'currentColor' }: { px?: number; fill?: string }) {
  return <Bits rows={STAR} px={px} fill={fill} />
}

/** Destello de rareza: una estrellita que titila de a ratos en la esquina (cofre = tinta, secreto = acento). */
export function ChestSparkle({ kind, px = 7, style }: { kind: 'cofre' | 'secreto'; px?: number; style?: React.CSSProperties }) {
  return (
    <span className={`cs-sparkle cs-sparkle--${kind}`} aria-hidden style={style}>
      <PixelStar px={px} fill={kind === 'secreto' ? 'hsl(var(--accent))' : 'hsl(var(--tx))'} />
    </span>
  )
}

const PIECES: Record<PokeFx, { rows: string[][]; color: string[]; motion: 'rise' | 'burst' | 'fall'; count: number }> = {
  // Escamas en ese que se escapan (sss...).
  hiss: { rows: [['.##', '#..', '.#.', '..#', '##.']], color: ['var(--accent2)', 'var(--tx2)'], motion: 'rise', count: 4 },
  // Polvo que levanta al caer.
  bounce: { rows: [['##', '##'], ['#']], color: ['var(--tx2)', 'var(--accent2)'], motion: 'burst', count: 8 },
  // Burbujas que suben del pico.
  uncork: { rows: [['.#.', '#.#', '.#.'], ['##', '##']], color: ['var(--accent2)', 'var(--tx2)'], motion: 'rise', count: 6 },
  // Puntitos que se dispersan: se desarma.
  vanish: { rows: [['#'], ['#.#']], color: ['var(--tx3)', 'var(--tx2)'], motion: 'burst', count: 12 },
  // Chispas tibias.
  wobble: { rows: [['#'], ['##', '##']], color: ['var(--accent)', 'var(--accent2)'], motion: 'rise', count: 6 },
  // Chispazo de conexión.
  snap: { rows: [['..#..', '..#..', '##.##', '..#..', '..#..'], ['#']], color: ['var(--accent)', 'var(--tx)'], motion: 'burst', count: 6 },
  // Bits sueltos (se dibujan como texto 0/1 aparte).
  glitch: { rows: [['####'], ['##']], color: ['var(--accent)', 'var(--tx)'], motion: 'fall', count: 6 },
  // Corazones que suben.
  purr: { rows: [['.#.#.', '#####', '#####', '.###.', '..#..']], color: ['var(--accent)', 'var(--accent2)'], motion: 'rise', count: 4 },
}

function StickerFx({ kind, size }: { kind: PokeFx; size: number }) {
  const spec = PIECES[kind]
  const pieces = useMemo(() => Array.from({ length: spec.count }, (_, i) => {
    const t = (i + Math.random() * 0.6) / spec.count
    const unit = Math.max(2, Math.round(size / 16))
    if (spec.motion === 'rise') {
      return { x: Math.round((t - 0.5) * size * 0.9), y: -Math.round(size * (0.55 + Math.random() * 0.5)), sx: Math.round((t - 0.5) * size * 0.9), sy: -Math.round(size * 0.1), unit, d: i * 70 }
    }
    if (spec.motion === 'fall') {
      return { x: Math.round((Math.random() - 0.5) * size * 1.3), y: Math.round(size * (0.3 + Math.random() * 0.4)), sx: Math.round((Math.random() - 0.5) * size), sy: -Math.round(size * 0.35), unit, d: i * 40 }
    }
    const a = t * Math.PI * 2
    const r = size * (0.55 + Math.random() * 0.3)
    return { x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r * (kind === 'bounce' ? 0.25 : 0.8)) + (kind === 'bounce' ? Math.round(size * 0.4) : 0), sx: 0, sy: kind === 'bounce' ? Math.round(size * 0.4) : 0, unit, d: Math.random() * 60 }
  }), [kind, size, spec])

  return (
    <span className={`cs-fx cs-fx--${spec.motion}`} aria-hidden>
      {pieces.map((p, i) => {
        const rows = spec.rows[i % spec.rows.length]
        const color = `hsl(${spec.color[i % spec.color.length]})`
        return (
          <span
            key={i}
            style={{ ['--sx' as string]: `${p.sx}px`, ['--sy' as string]: `${p.sy}px`, ['--fx' as string]: `${p.x}px`, ['--fy' as string]: `${p.y}px`, animationDelay: `${p.d}ms` }}
          >
            {kind === 'glitch' && i % 2 === 0
              ? <span className="cs-fx-bit" style={{ color, fontSize: Math.max(12, size * 0.32) }}>{Math.random() < 0.5 ? '0' : '1'}</span>
              : <Bits rows={rows} px={rows[0].length * p.unit} fill={color} />}
          </span>
        )
      })}
    </span>
  )
}
