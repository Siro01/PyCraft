import Header from '@/components/layout/Header'
import InventoryLab from './InventoryLab'

export const metadata = { title: 'Inventario · Vista previa' }

// Vista previa de INVENTARIO.EXE (solo docente): el mismo inventario del
// escritorio y de la batalla, con datos inventados en memoria — nada se lee
// ni se guarda en el navegador del alumno.
export default function InventarioDemoPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <InventoryLab />
    </div>
  )
}
