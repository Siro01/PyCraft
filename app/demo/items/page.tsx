import Link from 'next/link'
import Header from '@/components/layout/Header'
import ItemsLab from './ItemsLab'

export const metadata = { title: 'Banco de ítems · Demo' }

// Banco de pruebas de los 14 ítems del Mercader del Abismo: un jefe con la
// vida ajustable, los 14 ítems en INVENTARIO.PY y nada se gasta ni se guarda.
// Para que el profe (y Claude) prueben cada efecto sin comprar nada.
export default function ItemsDemoPage() {
  return (
    <div className="min-h-screen flex flex-col desk-theme">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-2 mb-4 font-mono text-xs text-tx3 flex-wrap">
          <Link href="/demo" className="hover:text-tx transition-colors inline-block py-1.5">← Demo</Link>
          <span>/</span>
          <span className="text-tx">Banco de ítems</span>
          <span
            className="ml-auto px-2 py-0.5 pixel-corners-sm text-[10px] font-bold tracking-widest"
            style={{ background: 'hsl(var(--accent) / 0.12)', color: 'hsl(var(--accent))', border: '1px solid hsl(var(--accent) / 0.3)' }}
          >
            SANDBOX · nada se gasta
          </span>
        </div>
        <ItemsLab />
      </main>
    </div>
  )
}
