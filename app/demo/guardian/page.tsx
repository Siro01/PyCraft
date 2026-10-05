import Header from '@/components/layout/Header'
import GuardianLab from './GuardianLab'

export const metadata = { title: 'Guardián · Rediseño' }

export default function GuardianPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <GuardianLab />
    </div>
  )
}
