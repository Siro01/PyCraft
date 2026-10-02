'use client'

import Win from '@/components/ui/Win'
import MercaderV2 from '@/components/game/shop/MercaderV2'
import { MERCADER_V2_VARIANTS } from '@/lib/game/mercader-v2-sprite'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

// Fondo de la tienda del Abismo (ShopApp) — así se ve cada opción donde va a vivir.
const ABYSS_BG = 'hsl(260 32% 4%)'

export default function MercaderV2Lab() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
      <Win title="MERCADER_REDISENO.SYS" active bodyStyle={{ padding: 14 }}>
        <h1 style={{ fontFamily: jersey, fontSize: 30, lineHeight: 1, color: 'hsl(var(--tx))' }}>Elegí al nuevo Mercader</h1>
        <p className="mt-1.5" style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx2))', maxWidth: '72ch' }}>
          Cuatro opciones animadas: los ojos-estrella titilan, el farol se mece y parpadea, y el cuerpo respira.
          Cada una se ve en grande y al tamaño chico que usa la tienda.
        </p>
      </Win>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {MERCADER_V2_VARIANTS.map((v, i) => (
          <Win key={v.id} title={`OPCION_${i + 1}_${v.name.toUpperCase()}.PNG`} bodyStyle={{ padding: 0 }}>
            <div className="flex items-end justify-center gap-4" style={{ background: ABYSS_BG, padding: '18px 10px 12px' }}>
              <MercaderV2 variant={v.id} scale={4} />
              <MercaderV2 variant={v.id} scale={2} />
            </div>
            <div style={{ padding: '10px 12px', borderTop: '2px solid hsl(var(--tx))' }}>
              <div style={{ fontFamily: jersey, fontSize: 20, color: 'hsl(var(--tx))' }}>{i + 1}. {v.name}</div>
              <p style={{ fontFamily: vt, fontSize: 17, lineHeight: 1.15, color: 'hsl(var(--tx2))' }}>{v.note}</p>
            </div>
          </Win>
        ))}
      </div>
    </main>
  )
}
