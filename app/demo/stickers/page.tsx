import Header from '@/components/layout/Header'
import StickersLab from './StickersLab'

export const metadata = { title: 'Stickers de cofre · Vista previa' }

// Vista previa de los stickers de cofre (solo docente): todos vivos para
// tocarlos, la escena de apertura de cada cofre y dónde está cada uno en el
// mapa. Los toques de esta página no se guardan.
export default function StickersDemoPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <StickersLab />
    </div>
  )
}
