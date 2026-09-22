import FinaleFlow from '@/components/game/architect/FinaleFlow'
import TestHud from '@/components/game/TestHud'
import { isLocalMode } from '@/lib/local-mode'
import { isTestSession } from '@/lib/test-student/server'

export const metadata = { title: 'El Arquitecto · Final' }

export default async function FinalePage() {
  const isTest = !isLocalMode() && (await isTestSession())
  return (
    <>
      <FinaleFlow />
      {isTest && <TestHud />}
    </>
  )
}
