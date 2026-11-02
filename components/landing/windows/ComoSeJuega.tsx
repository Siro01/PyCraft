import type { ReactNode } from 'react'
import { IconSnake, IconDatabase, IconSword } from '@/components/ui/PixelIcons'

// como_se_juega.exe: las tres fases del taller, una debajo de la otra.

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

const PHASES: { step: string; title: string; colorVar: string; icon: ReactNode; desc: string }[] = [
  {
    step: '01', title: 'Python', colorVar: '--python',
    icon: <IconSnake size={28} color="hsl(var(--python))" />,
    desc: 'Variables, bucles, listas y funciones. Jefes 1–6.',
  },
  {
    step: '02', title: 'SQLite', colorVar: '--sql',
    icon: <IconDatabase size={28} color="hsl(var(--sql))" />,
    desc: 'CREATE, SELECT, WHERE, UPDATE. Jefes 7–10.',
  },
  {
    step: '03', title: 'Integración', colorVar: '--accent',
    icon: <IconSword size={28} color="hsl(var(--accent))" />,
    desc: 'Python + sqlite3 en proyectos reales. Jefes 11–14.',
  },
]

export default function ComoSeJuegaWindow() {
  return (
    <ol className="flex flex-col" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {PHASES.map((p, i) => (
        <li
          key={p.step}
          className="grid items-start"
          style={{ gridTemplateColumns: '44px 1fr', columnGap: 14, padding: '14px 4px', borderTop: i ? '2px solid hsl(var(--border2))' : undefined }}
        >
          <span className="flex flex-col items-center gap-2">
            <span style={{ fontFamily: jersey, fontSize: 28, lineHeight: 1, color: `hsl(var(${p.colorVar}))` }}>{p.step}</span>
            {p.icon}
          </span>
          <span className="flex flex-col gap-1.5">
            <span style={{ fontFamily: jersey, fontSize: 24, lineHeight: 1.05, color: `hsl(var(${p.colorVar}))` }}>{p.title}</span>
            <span style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx2))' }}>{p.desc}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
