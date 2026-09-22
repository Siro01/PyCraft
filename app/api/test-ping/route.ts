import { NextResponse } from 'next/server'

// Ida y vuelta mínima al servidor (pasa por el middleware, igual que cualquier navegación).
// La usa el HUD del alumno TEST para medir la latencia real de la página.
export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json({ t: Date.now() }, { headers: { 'Cache-Control': 'no-store' } })
}
