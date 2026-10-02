import Header from '@/components/layout/Header'
import MercaderV2Lab from './MercaderV2Lab'

export const metadata = { title: 'Mercader · Rediseño' }

export default function MercaderV2Page() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <MercaderV2Lab />
    </div>
  )
}
