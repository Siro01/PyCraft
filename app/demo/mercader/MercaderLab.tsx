'use client'

import { useState } from 'react'
import MercaderModal, { AmuletCard } from '@/components/game/MercaderModal'
import Win from '@/components/ui/Win'
import { getRandomAmuletOffer } from '@/lib/game/amulets'
import type { AmuletType } from '@/types'

const ALL: AmuletType[] = ['boss-hp-reduction', 'health-potion', 'escape', 'skip-boss']

export default function MercaderLab() {
  const [offers, setOffers] = useState<AmuletType[] | null>(null)
  const [chosen, setChosen] = useState<AmuletType | null>(null)

  const open = () => { setChosen(null); setOffers(getRandomAmuletOffer(2)) }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
      <Win title="MERCADER_LAB.EXE" active bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 21, color: 'hsl(var(--tx2))', margin: 0 }}>
          Vista previa del Mercader sin jugar: aparece solo en las batallas cuando se derrotan 2, 4, 6… jefes. Acá lo podés abrir cuando quieras (no guarda nada).
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={open} className="btn-primary">Abrir el Mercader</button>
          {chosen && (
            <span style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: 'hsl(var(--accent))' }}>
              Elegiste: {chosen}
            </span>
          )}
        </div>
      </Win>

      <Win title="AMULETOS.SYS · CARTAS" bodyStyle={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="flex flex-wrap gap-4">
          {ALL.map(t => <AmuletCard key={t} type={t} onClick={() => setChosen(t)} />)}
        </div>
        <div className="flex flex-wrap gap-3">
          {ALL.map(t => <AmuletCard key={t} type={t} compact footer="Pasivo" />)}
        </div>
      </Win>

      {offers && (
        <MercaderModal
          offers={offers}
          onChoose={(t) => { setChosen(t); setOffers(null) }}
          onSkip={() => setOffers(null)}
        />
      )}
    </main>
  )
}
