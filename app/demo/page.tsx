import Link from 'next/link'
import Header from '@/components/layout/Header'
import BossCard from '@/components/game/BossCard'
import { getBossById } from '@/lib/game/bosses'

export const metadata = { title: 'Demo · PySQLBossRush' }

// La demo pública muestra un solo jefe (Creeper Formulario) — antes mostraba
// los 14 con todo desbloqueado, lo que le spoileaba a un futuro alumno todo
// el taller antes de la primera clase. El resto se conoce jugando de verdad.
export default function DemoPage() {
  const boss = getBossById('creeper-formulario')
  if (!boss) return null

  return (
    <div className="min-h-screen desk-theme">
      <Header />

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="mb-6 text-center">
          <div className="label-mono mb-1">Modo demo</div>
          <h1 className="text-3xl font-bold text-tx tracking-wide">
            Probá el primer <span className="text-accent">jefe</span>
          </h1>
          <p className="font-mono text-xs text-tx3 mt-2 leading-relaxed">
            Sin cuenta, sin guardar progreso. Los otros 13 jefes se conocen en el taller de verdad.
          </p>
        </div>

        <BossCard boss={boss} isEnabled href={`/demo/${boss.id}`} />

        <div className="mt-6 text-center">
          <Link href="/login" className="btn-ghost font-mono text-xs">
            Quiero jugar el taller completo →
          </Link>
        </div>
      </main>
    </div>
  )
}
