'use client'

import Win from '@/components/ui/Win'
import GuardianSprite from '@/components/game/GuardianSprite'
import { ACTIVE_GUARDIAN, GUARDIAN_VARIANTS } from '@/lib/game/guardian-sprite'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

// Fondo oscuro neutro, como la arena de combate.
const ARENA_BG = 'hsl(160 12% 5%)'

export default function GuardianLab() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
      <Win title="GUARDIAN_REDISENO.SYS" active bodyStyle={{ padding: 14 }}>
        <h1 style={{ fontFamily: jersey, fontSize: 30, lineHeight: 1, color: 'hsl(var(--tx))' }}>Elegí al nuevo Guardián de la Puerta</h1>
        <p className="mt-1.5" style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx2))', maxWidth: '72ch' }}>
          Tres cuerpos para la misma cabeza, con su paleta: piedra verde-gris, esquineros naranja y el ojo menta.
          Cada uno se ve al tamaño de la batalla, al tamaño chico y derrotado.
        </p>
      </Win>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {GUARDIAN_VARIANTS.map((v, i) => (
          <Win key={v.id} title={`OPCION_${i + 1}_${v.id.toUpperCase()}.PNG`} active={v.id === ACTIVE_GUARDIAN} bodyStyle={{ padding: 0 }}>
            <div className="flex items-end justify-center gap-3 flex-wrap" style={{ background: ARENA_BG, padding: '18px 10px 12px' }}>
              <GuardianSprite variant={v.id} px={128} />
              <GuardianSprite variant={v.id} px={64} />
              <GuardianSprite variant={v.id} px={64} defeated />
            </div>
            <div style={{ padding: '10px 12px', borderTop: '2px solid hsl(var(--tx))' }}>
              <div style={{ fontFamily: jersey, fontSize: 20, color: 'hsl(var(--tx))' }}>
                {i + 1}. {v.name}{v.id === ACTIVE_GUARDIAN ? ' · en el juego' : ''}
              </div>
              <p style={{ fontFamily: vt, fontSize: 17, lineHeight: 1.15, color: 'hsl(var(--tx2))' }}>{v.note}</p>
            </div>
          </Win>
        ))}
      </div>
    </main>
  )
}
