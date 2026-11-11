import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import ProgramShell from '@/components/ui/ProgramShell'
import Win from '@/components/ui/Win'
import RodolfoImg from '@/components/game/RodolfoImg'
import AreaTrabajoApp from '@/components/game/area/AreaTrabajoApp'
import { isLocalMode } from '@/lib/local-mode'
import { accesoAreaTrabajo, MENSAJE_ACCESO } from '@/lib/game/cartas/acceso'

export const metadata = { title: 'AreaTrabajo · PySQLBossRush' }
export const dynamic = 'force-dynamic'

// AreaTrabajo: donde cada alumno arma su mazo de cartas (proyecto final).

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="mx-auto px-4 py-6" style={{ maxWidth: 1400 }}>
        <ProgramShell>{children}</ProgramShell>
      </main>
    </div>
  )
}

export default async function AreaTrabajoPage() {
  if (!isLocalMode()) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    const { data: profile } = await supabase.from('profiles').select('role, aula_id').eq('id', user.id).maybeSingle()
    const acceso = await accesoAreaTrabajo(supabase, { id: user.id, isAdmin: profile?.role === 'admin', aulaId: profile?.aula_id ?? null })
    if (acceso !== 'open') {
      return (
        <Marco>
          <div className="flex justify-center p-3 sm:p-10">
            <Win title="AREATRABAJO.EXE" active style={{ width: '100%', maxWidth: 520 }} bodyStyle={{ padding: '18px 20px' }}>
              <div className="flex items-start gap-4">
                <RodolfoImg width={72} height={72} alt="Rodolfo" style={{ imageRendering: 'pixelated', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 30, lineHeight: 1 }}>{acceso === 'locked' ? 'TODAVÍA NO' : 'CERRADA POR AHORA'}</div>
                  <p style={{ fontFamily: 'var(--font-text), monospace', fontSize: 21, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: '10px 0 0' }}>{MENSAJE_ACCESO[acceso]}</p>
                </div>
              </div>
            </Win>
          </div>
        </Marco>
      )
    }
  }
  return (
    <Marco>
      <AreaTrabajoApp />
    </Marco>
  )
}
