import Header from '@/components/layout/Header'
import BibliotecaApp from '@/components/game/biblioteca/BibliotecaApp'
import { ACT_MAPS } from '@/lib/game/act-maps'
import { getBook } from '@/lib/game/biblioteca'

export const metadata = { title: 'Biblioteca' }

interface PageProps {
  searchParams: Promise<{ acto?: string; libro?: string; pagina?: string }>
}

export default async function BibliotecaPage({ searchParams }: PageProps) {
  const { acto, libro, pagina } = await searchParams
  const book = libro ? getBook(libro) : undefined
  // El libro manda: un link desde el patio abre el estante de su acto aunque no venga ?acto=.
  const actKey = book?.actKey ?? (ACT_MAPS.some((a) => a.key === acto) ? acto! : ACT_MAPS[0].key)
  const page = pagina ? Math.max(0, Number.parseInt(pagina, 10) || 0) : undefined

  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <BibliotecaApp actKey={actKey} initialBook={book?.id} initialPage={page} />
      </main>
    </div>
  )
}
