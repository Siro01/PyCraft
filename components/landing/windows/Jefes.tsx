'use client'

import { useState } from 'react'
import { BOSSES } from '@/lib/game/bosses'
import { IconSnake, IconDatabase, IconBolt } from '@/components/ui/PixelIcons'
import AsciiQuestion from '@/components/ui/AsciiQuestion'
import { sfx } from '@/lib/game/architect/sound'
import type { Boss } from '@/types'

// jefes/: los 14 jefes del taller como archivos de una carpeta, agrupados por
// acto. Tocar uno lo selecciona y la línea de estado dice qué tema enseña.

// Solo estos jefes tienen sprite pixel-art en /public/bossicons (id → archivo); el
// resto usa el ícono de categoría directamente para no disparar un 404 en cada carga.
const BOSS_ICONS: Record<string, string> = {
  'creeper-formulario': 'creeper-formulario.png',
  'guardian-puerta': 'guardian-puerta.png',
  'golem-infinito': 'golem-infinito.png',
  'maestro-craftero': 'maestro-craftero.png',
  'dragon-rojo': 'dragon-rojo.gif',
}

const ACTS = [
  { roman: 'I', name: 'Python', colorVar: '--python', bosses: BOSSES.filter((b) => b.type === 'python') },
  { roman: 'II', name: 'SQLite', colorVar: '--sql', bosses: BOSSES.filter((b) => b.type === 'sql') },
  { roman: 'III', name: 'Integración', colorVar: '--accent', bosses: BOSSES.filter((b) => b.type === 'mixed' || b.type === 'final') },
]

const MYSTERY = 'el-arquitecto'
const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

function BossGlyph({ boss, colorVar }: { boss: Boss; colorVar: string }) {
  const [err, setErr] = useState(false)
  if (boss.id === MYSTERY) return <AsciiQuestion size={4} color="hsl(var(--tx2))" />
  if (BOSS_ICONS[boss.id] && !err) {
    return <img src={`/bossicons/${BOSS_ICONS[boss.id]}`} alt="" width={48} height={48} style={{ imageRendering: 'pixelated' }} onError={() => setErr(true)} />
  }
  const Icon = boss.type === 'sql' ? IconDatabase : boss.type === 'mixed' ? IconBolt : IconSnake
  return (
    <span className="hatch flex items-center justify-center" style={{ width: 48, height: 48, border: '2px solid hsl(var(--border2))' }}>
      <span style={{ background: 'hsl(var(--surface))', display: 'flex', padding: 3 }}><Icon size={26} color={`hsl(var(${colorVar}))`} /></span>
    </span>
  )
}

export default function JefesWindow() {
  const [pick, setPick] = useState<string | null>(null)
  const picked = BOSSES.find((b) => b.id === pick)
  const status = !picked
    ? 'Cada jefe es un tema del taller. Tocá uno para ver cuál.'
    : picked.id === MYSTERY
    ? `${picked.title} · ???.exe — Solo lo verás al llegar.`
    : `${picked.title} · ${picked.name} — ${picked.topic}`

  return (
    <div className="flex flex-col gap-3">
      {ACTS.map((act) => (
        <section key={act.roman} aria-label={`Acto ${act.roman}: ${act.name}`}>
          <h3 className="flex items-baseline gap-2" style={{ margin: '0 0 6px', paddingBottom: 4, borderBottom: '2px solid hsl(var(--border2))' }}>
            <span style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.06em', color: `hsl(var(${act.colorVar}))` }}>ACTO {act.roman}</span>
            <span style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx2))' }}>{act.name}</span>
          </h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 4 }}>
            {act.bosses.map((boss) => {
              const on = pick === boss.id
              const mystery = boss.id === MYSTERY
              return (
                <button
                  key={boss.id}
                  type="button"
                  aria-pressed={on}
                  aria-label={mystery ? 'Jefe final: ???' : `${boss.name}: ${boss.topic}`}
                  onClick={() => { sfx.select(); setPick(on ? null : boss.id) }}
                  className="boss-file"
                >
                  <span className="flex items-center justify-center" style={{ width: 52, height: 52 }}><BossGlyph boss={boss} colorVar={act.colorVar} /></span>
                  <span className="desk-lbl">{mystery ? '???.exe' : boss.name}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <p aria-live="polite" style={{ fontFamily: vt, fontSize: 19, lineHeight: 1.2, color: picked ? 'hsl(var(--tx))' : 'hsl(var(--tx2))', margin: 0, padding: '6px 8px', background: 'hsl(var(--bg))', border: '2px solid hsl(var(--border2))', position: 'sticky', bottom: 0 }}>
        &gt; {status}
      </p>
    </div>
  )
}
