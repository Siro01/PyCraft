import Header from '@/components/layout/Header'
import MapaLab from './MapaLab'

export const metadata = { title: 'Mapa · Vista previa' }

// Vista previa del mapa de actos (solo docente): el dashboard del alumno con
// un progreso elegido a mano, sin cuenta ni guardado.
export default function MapaDemoPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <MapaLab />
    </div>
  )
}
