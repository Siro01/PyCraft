import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import PlanBook, { type AtaqueInfo } from '@/components/game/planificacion/PlanBook'
import { CHALLENGES } from '@/lib/game/challenges'
import { PLAN_CLASES } from '@/lib/game/planificacion'
import { isLocalMode } from '@/lib/local-mode'

export const metadata = { title: 'Planificación' }

// Contrato de dirección (Impeccable): queda en el HTML para poder auditarlo.
const CONTRACT = `<!-- impeccable:direction
THESIS: El cuaderno de clases del docente se hojea como la Escuelita de Rodolfo: índice primero, una clase por página, tres versiones por tema; rechaza la grilla de tarjetas de un panel.
OWN-WORLD: PyCraft OS 1-bit. Ventana PLANIFICACION.EXE de barra sólida, bordes de 2px, sombra dura, renglones de cuaderno en el riel, casilleros por día, Jersey 25 / VT323, tokens de los 3 temas.
STORY: El docente abre la clase del día, ve a qué jefe prepara y proyecta el ejemplo, el guiado y el desafío para que el aula los escriba en el patio.
FIRST VIEWPORT: Índice a todo el ancho: franja con Planificación, 14 semanas · 28 clases y el ritmo Día 1 / Día 2; debajo, por acto, una fila por semana con el jefe y dos casilleros de día con sus temas y página.
FORM: Extensión de la Escuelita (superficie dentro del mundo establecido, pedido precisado por el docente).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`

interface PageProps {
  searchParams: Promise<{ clase?: string }>
}

export default async function PlanificacionPage({ searchParams }: PageProps) {
  // El middleware ya deja pasar solo al docente; esto cubre el caso sin middleware.
  if (!isLocalMode()) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') redirect('/dashboard')
  }

  const { clase } = await searchParams
  const n = Number(clase)
  const initialPage = Number.isInteger(n) && n >= 1 && n <= PLAN_CLASES.length ? n : 0

  // Solo el título y el nivel de cada ataque: la solución no viaja al navegador.
  const ataques: Record<string, AtaqueInfo> = {}
  for (const c of CHALLENGES) ataques[c.id] = { title: c.title, tier: c.tier }

  return (
    <div className="min-h-screen desk-theme">
      <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <PlanBook initialPage={initialPage} ataques={ataques} />
      </main>
    </div>
  )
}
