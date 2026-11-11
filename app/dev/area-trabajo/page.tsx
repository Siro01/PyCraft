import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import ProgramShell from '@/components/ui/ProgramShell'
import AreaTrabajoApp from '@/components/game/area/AreaTrabajoApp'

// ─────────────────────────────────────────────────────────────────────────
// PÁGINA DE PRUEBA — solo en desarrollo. AreaTrabajo sin iniciar sesión: el
// reino y el proyecto se guardan en este navegador (como en modo local).
// ─────────────────────────────────────────────────────────────────────────

export default function AreaTrabajoDevPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="mx-auto px-4 py-6" style={{ maxWidth: 1400 }}>
        <ProgramShell>
          <AreaTrabajoApp />
        </ProgramShell>
      </main>
    </div>
  )
}
