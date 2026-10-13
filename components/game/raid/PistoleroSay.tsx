'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { westernSfx } from '@/lib/game/raid/western-sfx'

// Cómo habla el Pistolero:
// - Lo normal lo escribe una planta rodadora que va rodando delante del texto,
//   con crujido de ramitas secas en cada letra.
// - Si GRITA (la frase está toda en mayúsculas), el texto cae de golpe, con un
//   sacudón y un golpe sobre la mesa del saloon.
// - El punto final es un disparo: fogonazo pixel, agujero de bala y estampido.
// Clic (o Enter / espacio) para apurarlo. Estilos: .psay-* en globals.css.

interface Props {
  lines: string[]
  /** Cuando terminó la última frase. */
  onDone?: () => void
  /** Las frases anteriores quedan a la vista (más tenues). */
  keep?: boolean
  /** Milisegundos por letra. */
  speed?: number
  className?: string
}

const LETTERS = /[A-Za-zÁÉÍÓÚÑáéíóúñ]/g

/** ¿La frase es un grito? (toda en mayúsculas y con algo para gritar) */
export function isShout(text: string): boolean {
  const letters = text.match(LETTERS) ?? []
  return letters.length >= 3 && text === text.toLocaleUpperCase('es')
}

/** Parte un texto en frases (cada una con su puntuación), para decirlas de a una. */
export function sentences(text: string): string[] {
  // no corta en «...» (puntos suspensivos): esos siguen en la misma frase
  return text.split(/(?<=(?:(?<!\.)\.|[!?…]))\s+/).map((t) => t.trim()).filter(Boolean)
}

const PAUSE: Record<string, number> = { ',': 5, ';': 5, ':': 5, '…': 8, '?': 6, '!': 6, '—': 4 }

export default function PistoleroSay({ lines, onDone, keep = true, speed = 34, className }: Props) {
  const [i, setI] = useState(0)
  const [count, setCount] = useState(0)
  const [fired, setFired] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const doneRef = useRef(onDone)
  useEffect(() => { doneRef.current = onDone }, [onDone])

  // Si cambian las frases (otra situación), arranca de cero
  const key = lines.join('\u0001')
  useEffect(() => { setI(0); setCount(0); setFired(false) }, [key])

  const line = lines[i] ?? ''
  const shout = isShout(line)
  const endsShot = !shout && line.endsWith('.')
  const body = endsShot ? line.slice(0, -1) : line
  const typed = shout ? line.length : count
  const lineDone = shout || (count >= body.length && (!endsShot || fired))

  const fire = useCallback(() => {
    setFired(true)
    westernSfx.shot()
    if (Math.random() < 0.35) westernSfx.ricochet()
  }, [])

  // Escribir la frase actual
  useEffect(() => {
    clearTimeout(timer.current)
    if (!line) return
    if (shout) {
      westernSfx.slam()
      return
    }
    if (count < body.length) {
      const ch = body[count]
      timer.current = setTimeout(() => {
        setCount((n) => n + 1)
        if (ch !== ' ' && count % 2 === 0) westernSfx.rustle()
      }, count === 0 ? speed * 3 : (PAUSE[body[count - 1]] ?? 1) * speed)
    } else if (endsShot && !fired) {
      timer.current = setTimeout(fire, speed * 7)
    }
    return () => clearTimeout(timer.current)
  }, [line, shout, count, body, endsShot, fired, fire, speed])

  // Pasar a la siguiente frase (o avisar que terminó)
  useEffect(() => {
    if (!line || !lineDone) return
    const t = setTimeout(() => {
      if (i < lines.length - 1) { setI((n) => n + 1); setCount(0); setFired(false) } else doneRef.current?.()
    }, shout ? 1100 : 750)
    return () => clearTimeout(t)
  }, [lineDone, i, lines.length, line, shout])

  const skip = () => {
    if (shout || lineDone) return
    setCount(body.length)
    if (endsShot && !fired) fire()
  }

  return (
    <div className={`psay ${className ?? ''}`} onClick={skip}>
      {keep && lines.slice(0, i).map((l, k) => (
        <p key={k} className={`psay-old ${isShout(l) ? 'psay-shout-old' : ''}`}>{l}</p>
      ))}
      {line && (
        <p key={`${i}-${key.length}`} className={shout ? 'psay-shout' : 'psay-line'} aria-live="polite">
          {shout ? line : body.slice(0, typed)}
          {!shout && count < body.length && <Tumbleweed />}
          {!shout && endsShot && fired && <GunDot />}
        </p>
      )}
    </div>
  )
}

/** Planta rodadora pixel que rueda delante del texto. */
function Tumbleweed() {
  return (
    <svg className="psay-tumble" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden>
      {['..###....', '.#..#.#..', '#.#..#.#.', '#..##..#.', '.#.#.##.#', '#.#..#..#', '.#..#.##.', '..##.#.#.', '....###..']
        .flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  )
}

/** El punto final: fogonazo y después el agujero de bala. */
function GunDot() {
  return (
    <span className="psay-dot" aria-label=".">
      <svg className="psay-flash" viewBox="0 0 11 11" shapeRendering="crispEdges" aria-hidden>
        {['.....#.....', '..#..#..#..', '...#.#.#...', '....###....', '#####@#####', '....###....', '...#.#.#...', '..#..#..#..', '.....#.....']
          .flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y + 1} width={1} height={1} className={c === '@' ? 'psay-core' : undefined} />)))}
      </svg>
      <svg className="psay-hole" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden>
        {['#.....#', '.#.#.#.', '..###..', '.#####.', '..###..', '.#.#.#.', '#.....#']
          .flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} className={x >= 2 && x <= 4 && y >= 2 && y <= 4 ? 'psay-hole-in' : undefined} /> : null)))}
      </svg>
    </span>
  )
}
