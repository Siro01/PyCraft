'use client'

import { useState, type ReactNode } from 'react'
import { IconSprout, IconDagger, IconSkull } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'

// dificultad.cfg: los tres niveles de combate como un panel de configuración.
// Es demostrativo: elegir una opción solo cambia lo que se muestra, no guarda nada.

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const pixel = 'var(--font-pixel), monospace'

const TIERS: { label: string; colorVar: string; level: number; icon: ReactNode; desc: string; badge?: string }[] = [
  {
    label: 'JUNIOR', colorVar: '--python', level: 1,
    icon: <IconSprout size={30} color="hsl(var(--python))" />,
    desc: 'Completás huecos, con tips de Rodolfo.',
    badge: 'RECOMENDADO',
  },
  {
    label: 'TRAINEE', colorVar: '--accent', level: 2,
    icon: <IconDagger size={30} color="hsl(var(--accent))" />,
    desc: 'Escribís vos; cada error te cuesta vida.',
  },
  {
    label: 'SENIOR', colorVar: '--danger', level: 3,
    icon: <IconSkull size={30} color="hsl(var(--danger))" />,
    desc: 'Sin guías ni tips: solo vos y el problema.',
    badge: 'PRÓXIMAMENTE',
  },
]

export default function DificultadWindow() {
  const [pick, setPick] = useState(0)
  const t = TIERS[pick]

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Nivel de combate" className="flex flex-col gap-1.5">
        {TIERS.map((tier, i) => {
          const on = i === pick
          return (
            <button
              key={tier.label}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => { if (!on) { sfx.select(); setPick(i) } }}
              className="flex items-center gap-3 text-left"
              style={{
                padding: '8px 10px', cursor: 'pointer',
                border: `2px solid ${on ? 'hsl(var(--tx))' : 'hsl(var(--border2))'}`,
                background: on ? 'hsl(var(--tx))' : 'transparent',
                color: on ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
              }}
            >
              <span aria-hidden style={{ width: 14, height: 14, border: '2px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {on && <span style={{ width: 6, height: 6, background: 'currentColor' }} />}
              </span>
              <span style={{ fontFamily: jersey, fontSize: 22, lineHeight: 1, letterSpacing: '0.04em' }}>{tier.label}</span>
              <span style={{ flex: 1 }} />
              {tier.badge && <span style={{ fontFamily: pixel, fontSize: 11, letterSpacing: '0.1em', opacity: 0.8 }}>{tier.badge}</span>}
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 items-start" style={{ padding: 12, border: '2px solid hsl(var(--border2))', background: 'hsl(var(--bg))' }}>
        <span className="hatch flex shrink-0" style={{ border: '2px solid hsl(var(--tx))', padding: 4 }}>
          <span style={{ background: 'hsl(var(--surface))', display: 'flex', padding: 4 }}>{t.icon}</span>
        </span>
        <div className="flex flex-col gap-2.5" style={{ minWidth: 0 }}>
          <p aria-live="polite" style={{ fontFamily: vt, fontSize: 21, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: 0 }}>{t.desc}</p>
          <div className="flex items-center gap-2" aria-label={`Desafío ${t.level} de 3`}>
            <span style={{ fontFamily: pixel, fontSize: 12, letterSpacing: '0.12em', color: 'hsl(var(--tx3))' }}>RETO</span>
            <span className="flex gap-1" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span key={n} style={{ width: 22, height: 10, border: `2px solid hsl(var(${n <= t.level ? t.colorVar : '--border2'}))`, background: n <= t.level ? `hsl(var(${t.colorVar}))` : 'transparent' }} />
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
