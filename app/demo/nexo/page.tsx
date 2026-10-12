'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Win from '@/components/ui/Win'
import NexoCanvas from '@/components/game/nexo/NexoCanvas'
import { NEXO_VARIANTS, ACTIVE_NEXO } from '@/lib/game/nexo-art'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

const MAX = 360

function Arena() {
  const [hp, setHp] = useState(MAX)
  const dead = hp <= 0
  const btn: React.CSSProperties = {
    padding: '4px 12px', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface))', color: 'hsl(var(--tx))',
    cursor: 'pointer', fontFamily: jersey, fontSize: 16, letterSpacing: '0.03em',
  }
  return (
    <Win title="ARENA_DEL_NEXO.EXE" active bodyStyle={{ padding: 0 }}>
      <div className="flex justify-center" style={{ background: 'hsl(var(--surface))', padding: '16px 10px' }}>
        <NexoCanvas variant={ACTIVE_NEXO} width={260} hpRatio={hp / MAX} defeated={dead} />
      </div>
      <div className="flex flex-wrap items-center gap-2" style={{ padding: '10px 12px', borderTop: '2px solid hsl(var(--tx))' }}>
        <span style={{ fontFamily: vt, fontSize: 20, color: 'hsl(var(--tx2))', marginRight: 6 }}>Vida {Math.max(0, hp)}/{MAX}</span>
        <button type="button" style={btn} onClick={() => setHp((h) => Math.max(0, h - 72))} disabled={dead}>Pegarle −72</button>
        <button type="button" style={btn} onClick={() => setHp(0)} disabled={dead}>Derrotarlo</button>
        <button type="button" style={btn} onClick={() => setHp(MAX)}>Revivir</button>
        <span style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>Cada golpe lo hace temblar y le corta una tabla.</span>
      </div>
    </Win>
  )
}

export default function NexoDemo() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
        <Win title="NEXO_REDISENO.SYS" active bodyStyle={{ padding: 14 }}>
          <h1 style={{ fontFamily: jersey, fontSize: 30, lineHeight: 1, color: 'hsl(var(--tx))' }}>Elegí al nuevo Nexo</h1>
          <p className="mt-1.5" style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx2))', maxWidth: '72ch' }}>
            Tres calamares ASCII a partir de tu referencia, dibujados con el mismo motor de caracteres que El Arquitecto
            (así el Acto III ya anticipa al jefe final). Cada uno se ve al tamaño de la batalla, chico y derrotado.
          </p>
        </Win>
        <Arena />
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {NEXO_VARIANTS.map((v, i) => (
            <Win key={v.id} title={`OPCION_${i + 1}_${v.id.toUpperCase()}.TXT`} active={v.id === ACTIVE_NEXO} bodyStyle={{ padding: 0 }}>
              <div className="flex items-end justify-center gap-3 flex-wrap" style={{ background: 'hsl(var(--surface))', padding: '16px 10px 12px' }}>
                <NexoCanvas variant={v.id} width={220} />
                <div className="flex flex-col items-center gap-3">
                  <NexoCanvas variant={v.id} width={64} />
                  <NexoCanvas variant={v.id} width={64} defeated />
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderTop: '2px solid hsl(var(--tx))' }}>
                <div style={{ fontFamily: jersey, fontSize: 20, color: 'hsl(var(--tx))' }}>{i + 1}. {v.name}{v.id === ACTIVE_NEXO ? ' · en el juego' : ''}</div>
                <p style={{ fontFamily: vt, fontSize: 17, lineHeight: 1.15, color: 'hsl(var(--tx2))' }}>{v.note}</p>
              </div>
            </Win>
          ))}
        </div>
        <Win title="DERROTADO.TXT" bodyStyle={{ padding: 0 }}>
          <div className="flex items-end justify-center gap-6 flex-wrap" style={{ background: 'hsl(var(--surface))', padding: '16px 10px' }}>
            {NEXO_VARIANTS.map((v) => <NexoCanvas key={v.id} variant={v.id} width={160} mode="ascii" defeated />)}
          </div>
        </Win>
      </main>
    </div>
  )
}
