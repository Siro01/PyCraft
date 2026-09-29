import Header from '@/components/layout/Header'
import PlaygroundApp from '@/components/game/playground/PlaygroundApp'
import { getPlaygroundAct, PLAYGROUND_ACTS } from '@/lib/game/playground'

export const metadata = { title: 'Patio de juegos' }

interface PageProps {
  searchParams: Promise<{ acto?: string }>
}

const ACT_TITLE: Record<string, string> = { python: 'Python' }

export default async function PatioDeJuegosPage({ searchParams }: PageProps) {
  const { acto } = await searchParams
  const actKey = acto && getPlaygroundAct(acto) ? acto : PLAYGROUND_ACTS[0].actKey

  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <PlaygroundApp actKey={actKey} actTitle={ACT_TITLE[actKey] ?? actKey} />
      </main>
    </div>
  )
}
