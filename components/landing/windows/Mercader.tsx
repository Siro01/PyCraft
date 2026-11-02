'use client'

import { useState } from 'react'
import { IconWizard, IconSkull, IconPotion, IconCrystal } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'

// mercader.exe: lo que trae el Mercader Ambulante, como casilleros de inventario.

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

const SLOTS = [
  { id: 'mercader', Icon: IconWizard, title: 'Mercader Ambulante', colorVar: '--accent', desc: 'Cada 2 jefes aparece el Mercader con un amuleto para la próxima batalla.' },
  { id: 'debilidad', Icon: IconSkull, title: 'Amuleto de Debilidad', colorVar: '--danger', desc: 'El próximo jefe arranca con el 60% de vida.' },
  { id: 'pocion', Icon: IconPotion, title: 'Poción de Vida', colorVar: '--python', desc: 'Recuperás tu vida en plena batalla (TRAINEE).' },
  { id: 'teletransportador', Icon: IconCrystal, title: 'Teletransportador', colorVar: '--accent', desc: 'Saltás un jefe y volvés después.' },
]

export default function MercaderWindow() {
  const [pick, setPick] = useState(0)
  const s = SLOTS[pick]

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2" role="listbox" aria-label="Inventario del Mercader">
        {SLOTS.map(({ id, Icon, title, colorVar }, i) => {
          const on = i === pick
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={on}
              aria-label={title}
              onClick={() => { if (!on) { sfx.select(); setPick(i) } }}
              className={on ? undefined : 'hatch'}
              style={{
                aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                border: `2px solid ${on ? 'hsl(var(--tx))' : 'hsl(var(--border2))'}`,
                background: on ? 'hsl(var(--bg))' : undefined,
                boxShadow: on ? 'inset 0 0 0 2px hsl(var(--bg)), inset 0 0 0 4px hsl(var(--tx))' : undefined,
              }}
            >
              <span style={{ background: 'hsl(var(--surface))', display: 'flex', padding: 4 }}>
                <Icon size={32} color={`hsl(var(${colorVar}))`} />
              </span>
            </button>
          )
        })}
      </div>
      <div style={{ padding: '10px 12px', border: '2px solid hsl(var(--border2))', background: 'hsl(var(--bg))' }} aria-live="polite">
        <div style={{ fontFamily: jersey, fontSize: 22, lineHeight: 1, color: `hsl(var(${s.colorVar}))`, marginBottom: 6 }}>{s.title}</div>
        <div style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx2))' }}>{s.desc}</div>
      </div>
    </div>
  )
}
