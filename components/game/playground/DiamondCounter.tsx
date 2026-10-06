'use client'

import { useEffect, useState } from 'react'
import { ShopGlyph } from '@/components/game/shop/ShopIcons'
import { sfx } from '@/lib/game/architect/sound'

const jersey = 'var(--font-jersey), monospace'

interface Props {
  from: number
  to: number
  /** Total posible, para mostrar "8 / 25". */
  max?: number
  label?: string
}

// Contador de diamantes del patio: sube de a uno, al mismo ritmo que la
// barra de nivel (arranca a los 120ms y dura ~700ms), con un "+N" que salta
// y un tintineo por diamante. Si from === to, se queda quieto.
export default function DiamondCounter({ from, to, max, label = 'Diamantes del patio' }: Props) {
  const [shown, setShown] = useState(from)
  const gained = to - from

  useEffect(() => {
    setShown(from)
    if (gained <= 0) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setShown(to); return }
    const step = Math.max(70, Math.floor(700 / gained))
    let n = from
    let id: ReturnType<typeof setInterval> | undefined
    const start = setTimeout(() => {
      id = setInterval(() => {
        n += 1
        setShown(n)
        sfx.itemFocus()
        if (n >= to) { clearInterval(id); sfx.confirm() }
      }, step)
    }, 120)
    return () => { clearTimeout(start); if (id) clearInterval(id) }
  }, [from, to, gained])

  const done = shown >= to

  return (
    <div className="relative flex items-center gap-2" aria-live="polite">
      <span className={gained > 0 && done ? 'item-use-pop' : undefined} style={{ display: 'inline-flex' }}>
        <ShopGlyph glyph="crystal" size={16} color="hsl(var(--accent))" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="label-mono" style={{ color: 'hsl(var(--tx3))' }}>{label}</span>
        <span className="tabular" style={{ fontFamily: jersey, fontSize: 22, color: 'hsl(var(--tx))' }}>
          {shown}{max !== undefined && <span style={{ color: 'hsl(var(--tx3))', fontSize: 16 }}> / {max}</span>}
        </span>
      </span>
      {gained > 0 && (
        <span
          className="diamond-gain absolute tabular"
          style={{ left: 18, top: -14, fontFamily: jersey, fontSize: 18, color: 'hsl(var(--accent))', textShadow: '2px 2px 0 hsl(var(--bg))' }}
        >
          +{gained}
        </span>
      )}
    </div>
  )
}
