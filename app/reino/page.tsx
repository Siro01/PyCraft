import Header from '@/components/layout/Header'
import ReinoApp from '@/components/game/reino/ReinoApp'

export const metadata = { title: 'Mi Reino' }

export default function ReinoPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <ReinoApp />
      </main>
    </div>
  )
}
