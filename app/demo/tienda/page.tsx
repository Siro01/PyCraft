import Header from '@/components/layout/Header'
import TiendaLab from './TiendaLab'

export const metadata = { title: 'Tienda · Vista previa' }

// Vista previa de la tienda del Mercader y de su zona en el mapa, sin cuenta
// ni guardado: se elige cuántos jefes derrotó el alumno y su nivel, y se ve
// el nodo del mapa (cerrado/abierto) y la tienda como la vería él.
export default function TiendaDemoPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <TiendaLab />
    </div>
  )
}
