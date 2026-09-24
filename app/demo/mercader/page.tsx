import Header from '@/components/layout/Header'
import MercaderLab from './MercaderLab'

export const metadata = { title: 'Mercader · Vista previa' }

export default function MercaderDemoPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <MercaderLab />
    </div>
  )
}
