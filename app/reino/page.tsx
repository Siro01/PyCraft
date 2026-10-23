import Header from '@/components/layout/Header'
import ProgramShell from '@/components/ui/ProgramShell'
import ReinoApp from '@/components/game/reino/ReinoApp'

export const metadata = { title: 'Mi Reino' }

export default function ReinoPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <ProgramShell>
          <ReinoApp />
        </ProgramShell>
      </main>
    </div>
  )
}
