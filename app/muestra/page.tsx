import MuestraApp from '@/components/game/muestra/MuestraApp'

export const metadata = { title: 'Muestra · PyCraft' }

// El stand de la muestra final: pantalla completa, sin la barra del sitio.
// No pide cuenta: lee muestra.json (exportado desde el panel docente).
export default function MuestraPage() {
  return <MuestraApp />
}
