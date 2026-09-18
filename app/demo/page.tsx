import Link from 'next/link'
import Header from '@/components/layout/Header'
import BossCard from '@/components/game/BossCard'
import { BOSSES } from '@/lib/game/bosses'

export const metadata = { title: 'Demo · PySQLBossRush' }

export default function DemoPage() {
  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="label-mono mb-1">Modo demo</div>
            <h1 className="text-3xl font-bold text-tx tracking-wide">
              Mapa de <span className="text-accent">jefes</span>
            </h1>
          </div>
          <Link href="/login" className="btn-ghost font-mono text-xs">
            Crear cuenta →
          </Link>
        </div>

        {/* Demo notice */}
        <div
          className="mb-6 p-4 pixel-corners-sm border font-mono text-xs leading-relaxed"
          style={{
            background: 'hsl(var(--accent) / 0.07)',
            borderColor: 'hsl(var(--accent) / 0.25)',
            color: 'hsl(var(--tx2))',
          }}
        >
          <span className="text-accent font-bold">⚡ DEMO</span>
          {' '}— Todos los jefes están desbloqueados. El progreso{' '}
          <strong>no se guarda</strong>.{' '}
          <Link href="/login" className="underline text-accent hover:opacity-80">
            Iniciá sesión
          </Link>{' '}
          para guardar tu avance clase a clase.
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-5 flex-wrap">
          {[
            { color: 'hsl(var(--python))', label: 'Python (Clases 1–6)' },
            { color: 'hsl(var(--sql))',    label: 'SQL (Clases 7–10)' },
            { color: 'hsl(var(--accent))', label: 'Python + SQL (Clases 11–13)' },
            { color: 'hsl(38 92% 60%)',    label: 'Jefe Final' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-2 h-2" style={{ background: color }} />
              <span className="font-mono text-xs text-tx3">{label}</span>
            </div>
          ))}
        </div>

        {/* Boss grid — all enabled, links to /demo/[id] */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {BOSSES.map((boss) => (
            <BossCard
              key={boss.id}
              boss={boss}
              isEnabled={true}
              href={`/demo/${boss.id}`}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
