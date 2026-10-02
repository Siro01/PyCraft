'use client'

// PATO_DEBUG.EXE — ventana flotante (no modal: el alumno sigue escribiendo
// en el editor mientras el pato le explica). Recorre el código del desafío
// línea por línea; cada línea se "tipea" de a una letra para que se lea
// como algo que se escribe, no como un bloque que se pega.

import { useEffect, useMemo, useRef, useState } from 'react'
import Win from '@/components/ui/Win'
import { ItemSprite } from './ItemSprites'
import { buildDuckSteps } from '@/lib/game/items/duck-explainer'
import { sfx } from '@/lib/game/architect/sound'
import type { Boss, Challenge } from '@/types'

const vt = 'var(--font-vt323), monospace'
const mono = "'Courier New', Courier, monospace"

interface Props {
  boss: Boss
  challenge: Challenge
  /** Lee el código actual del editor — el pato explica lo que el alumno está mirando. */
  getCode: () => string
  onClose: () => void
}

export default function PatoDebugWindow({ boss, challenge, getCode, onClose }: Props) {
  // Se arma una vez por desafío (y al tocar "Releer mi código"), no en cada tecla:
  // si no, el paso actual saltaría mientras el alumno escribe.
  const [snapshot, setSnapshot] = useState(getCode)
  const steps = useMemo(() => buildDuckSteps(boss, challenge, snapshot), [boss, challenge, snapshot])
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState(0)
  const [quack, setQuack] = useState(0)

  // Cambió el desafío: el editor vuelve al código inicial, el pato también (sin leer
  // el editor, que en este mismo render todavía tiene el código del desafío anterior).
  const lastChallenge = useRef(challenge.id)
  useEffect(() => {
    if (lastChallenge.current === challenge.id) return
    lastChallenge.current = challenge.id
    setSnapshot(challenge.initialCode)
    setI(0)
  }, [challenge.id, challenge.initialCode])

  const step = steps[Math.min(i, steps.length - 1)]

  useEffect(() => {
    setTyped(0)
    if (!step.code) return
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setTyped(step.code.length); return }
    const id = setInterval(() => setTyped((t) => {
      if (t >= step.code!.length) { clearInterval(id); return t }
      return t + 1
    }), 28)
    return () => clearInterval(id)
  }, [step])

  const go = (d: number) => {
    const n = Math.max(0, Math.min(steps.length - 1, i + d))
    if (n === i) return
    setI(n)
    setQuack((q) => q + 1)
    sfx.step()
  }

  const isLast = i === steps.length - 1

  return (
    <div className="fixed z-50 item-status-in" style={{ left: 16, bottom: 16, width: 'min(400px, calc(100vw - 32px))' }}>
      <Win title="PATO_DEBUG.EXE" active onClose={onClose} bodyStyle={{ padding: 12 }}>
        <div className="flex items-start gap-3">
          <button
            type="button"
            key={quack}
            onClick={() => { setQuack((q) => q + 1); sfx.select() }}
            className="duck-quack shrink-0"
            aria-label="Cuac"
            style={{ background: 'hsl(var(--surface2))', border: '2px solid hsl(var(--tx))', padding: 4, cursor: 'pointer' }}
          >
            <ItemSprite sprite="pato-debug" size={48} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="label-mono" style={{ color: 'hsl(var(--tx3))' }}>
                {step.lineNo ? `Línea ${step.lineNo}` : i === 0 ? 'Para arrancar' : isLast ? 'Tu turno' : 'La consigna'}
              </span>
              <span className="label-mono tabular" style={{ color: 'hsl(var(--tx3))' }}>{i + 1}/{steps.length}</span>
            </div>

            {step.code !== undefined && (
              <pre
                style={{ margin: '6px 0', padding: '6px 8px', background: 'hsl(var(--bg))', border: '2px solid hsl(var(--border2))', fontFamily: mono, fontSize: 13, lineHeight: 1.5, color: 'hsl(var(--tx))', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {step.code.slice(0, typed)}
                <span className="animate-caret" style={{ color: 'hsl(var(--accent))' }}>{typed < step.code.length ? '█' : ''}</span>
              </pre>
            )}

            <p style={{ fontFamily: vt, fontSize: 19, lineHeight: 1.18, color: 'hsl(var(--tx))', whiteSpace: 'pre-wrap', marginTop: step.code ? 0 : 6 }}>
              {step.text}
            </p>
            {step.blank && (
              <p style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.15, color: 'hsl(var(--tx))', marginTop: 6, padding: '4px 8px', border: '2px dashed hsl(var(--accent))' }}>
                <b>Hueco ___</b> — {step.blank}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button type="button" onClick={() => go(-1)} disabled={i === 0} className="label-mono" style={navBtn(i === 0)}>← Atrás</button>
          <button type="button" onClick={() => { setSnapshot(getCode()); setI(2); sfx.select() }} className="label-mono" style={{ ...navBtn(false), marginRight: 'auto' }} title="Volver a leer el código como está ahora en el editor">
            Releer mi código
          </button>
          <button type="button" onClick={() => (isLast ? onClose() : go(1))} className="label-mono" style={{ ...navBtn(false), background: 'hsl(var(--tx))', color: 'hsl(var(--bg))' }}>
            {isLast ? 'A programar' : 'Siguiente →'}
          </button>
        </div>
      </Win>
    </div>
  )
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '5px 10px', border: '2px solid hsl(var(--tx))', background: 'transparent',
    color: disabled ? 'hsl(var(--tx3))' : 'hsl(var(--tx))', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
  }
}
