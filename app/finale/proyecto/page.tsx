import ProyectoFinal from '@/components/game/architect/ProyectoFinal'
import TestHud from '@/components/game/TestHud'
import { isLocalMode } from '@/lib/local-mode'
import { isTestSession } from '@/lib/test-student/server'

export const metadata = { title: 'Proyecto Final · Inventario Minecraft' }

export default async function ProyectoFinalPage() {
  const isTest = !isLocalMode() && (await isTestSession())
  return (
    <>
      <ProyectoFinal />
      {isTest && <TestHud />}
    </>
  )
}
