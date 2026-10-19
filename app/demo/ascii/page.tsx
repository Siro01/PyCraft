import AsciiLab from './AsciiLab'
import './ascii-lab.css'

export const metadata = { title: 'Arte ASCII · Demo' }

// Vista de prueba (solo docente): la versión ASCII de cada jefe y personaje,
// al lado de su pixel art.
export default function AsciiDemoPage() {
  return <AsciiLab />
}
