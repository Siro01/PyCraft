'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Win from '@/components/ui/Win'
import FalsificadorSprite, { FALSIFICADOR_FORMS } from '@/components/game/falsificador/FalsificadorSprite'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const MAX = 340

export default function FalsificadorDemo() {
  const [hp, setHp] = useState(MAX)
  const dead = hp <= 0
  const btn: React.CSSProperties = {
    padding: '4px 12px', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface))', color: 'hsl(var(--tx))',
    cursor: 'pointer', fontFamily: jersey, fontSize: 16, letterSpacing: '0.03em',
  }
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">
        <Win title="FALSIFICADOR.SYS" active bodyStyle={{ padding: 14 }}>
          <h1 style={{ fontFamily: jersey, fontSize: 30, lineHeight: 1, color: 'hsl(var(--tx))' }}>El Falsificador</h1>
          <p className="mt-1.5" style={{ fontFamily: vt, fontSize: 20, lineHeight: 1.2, color: 'hsl(var(--tx2))', maxWidth: '72ch' }}>
            Un cambiaformas hecho de cursores. Con cada golpe (o cada clic sobre él) la bandada vuela a otra criatura:
            {' '}{FALSIFICADOR_FORMS.join(', ')}. Derrotado, los cursores forman una X.
          </p>
        </Win>
        <Win title="ARENA.EXE" bodyStyle={{ padding: 0 }}>
          <div className="flex items-end justify-center gap-6 flex-wrap" style={{ background: 'hsl(var(--surface))', padding: '20px 12px 14px' }}>
            <FalsificadorSprite px={256} defeated={dead} hpRatio={hp / MAX} />
            <FalsificadorSprite px={128} defeated={dead} hpRatio={hp / MAX} clickable={false} />
            <FalsificadorSprite px={64} defeated={dead} hpRatio={hp / MAX} clickable={false} />
          </div>
          <div className="flex flex-wrap items-center gap-2" style={{ padding: '10px 12px', borderTop: '2px solid hsl(var(--tx))' }}>
            <span style={{ fontFamily: vt, fontSize: 20, color: 'hsl(var(--tx2))', marginRight: 6 }}>Vida {Math.max(0, hp)}/{MAX}</span>
            <button type="button" style={btn} onClick={() => setHp((h) => Math.max(0, h - 60))} disabled={dead}>Pegarle −60</button>
            <button type="button" style={btn} onClick={() => setHp(0)} disabled={dead}>Derrotarlo</button>
            <button type="button" style={btn} onClick={() => setHp(MAX)}>Revivir</button>
          </div>
        </Win>
        <Win title="FORMAS.SYS" bodyStyle={{ padding: 0 }}>
          <div className="flex items-end justify-center gap-4 flex-wrap" style={{ background: 'hsl(var(--surface))', padding: '16px 12px' }}>
            {FALSIFICADOR_FORMS.map((name, i) => (
              <figure key={name} className="flex flex-col items-center gap-1" style={{ margin: 0 }}>
                <FalsificadorSprite px={128} fixedForm={i} clickable={false} />
                <figcaption style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx2))' }}>{name}</figcaption>
              </figure>
            ))}
            <figure className="flex flex-col items-center gap-1" style={{ margin: 0 }}>
              <FalsificadorSprite px={128} defeated clickable={false} />
              <figcaption style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx2))' }}>derrotado</figcaption>
            </figure>
          </div>
        </Win>
      </main>
    </div>
  )
}
