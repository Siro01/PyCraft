import Header from '@/components/layout/Header'
import PracticeApp from '@/components/game/practice/PracticeApp'

export const metadata = { title: 'Patio de prácticas' }

export default function PatioDePracticasPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <PracticeApp />
      </main>
    </div>
  )
}
