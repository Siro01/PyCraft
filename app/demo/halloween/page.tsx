import Header from '@/components/layout/Header'
import HalloweenLab from './HalloweenLab'

export const metadata = { title: 'Halloween · Vista previa' }

// Vista previa de la semana de Halloween (23/10 al 30/10): prende la temporada
// en esta pestaña antes de la fecha para ver la paleta, los disfraces de
// Rodolfo y disparar rayos y murciélagos a mano.
export default function HalloweenDemoPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <HalloweenLab />
    </div>
  )
}
