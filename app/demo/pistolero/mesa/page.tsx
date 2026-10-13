import MesaPistolero from '@/components/game/raid/mesa/MesaPistolero'

export const metadata = { title: 'Mesa del Pistolero (ensayo) · Demo' }

// Ensayo de la Mesa con alumnos de mentira: no toca la base (sirve también en modo local).
export default function MesaDemoPage() {
  return <MesaPistolero aulas={[{ id: 'ensayo', nombre: 'Aula de ensayo' }]} initialAulaId="ensayo" mode="demo" />
}
