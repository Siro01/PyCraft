'use client'

import { useMemo, useState } from 'react'
import Win from '@/components/ui/Win'
import InventoryApp from '@/components/game/inventory/InventoryApp'
import { BATTLE_ITEMS, SHOP_CATALOG, STICKER_COLORWAYS } from '@/lib/game/shop'
import type { Amulet, AmuletType, OwnedShopItem, ShopItem } from '@/types'

const jersey = 'var(--font-jersey), monospace'

type Preset = 'vacio' | 'pocos' | 'todo' | 'muchos'
const PRESETS: { id: Preset; label: string }[] = [
  { id: 'vacio', label: 'Vacío' },
  { id: 'pocos', label: 'Pocos' },
  { id: 'todo', label: 'Todo el catálogo' },
  { id: 'muchos', label: 'Muchos (hojas)' },
]

const own = (id: string, colorway?: string): OwnedShopItem => ({ id, pricePaid: 0, acquiredAt: '2026-01-01', colorway })
const amulets = (types: AmuletType[]): Amulet[] => types.map((type, i) => ({ id: `demo-${i}`, type }))

function build(preset: Preset): { demo: { amulets: Amulet[]; owned: OwnedShopItem[]; equipped: string[] }; items?: ShopItem[] } {
  const stickers = SHOP_CATALOG.filter((i) => i.category === 'sticker')
  if (preset === 'vacio') return { demo: { amulets: [], owned: [], equipped: [] } }
  if (preset === 'pocos') {
    return {
      demo: {
        amulets: amulets(['health-potion', 'health-potion', 'escape']),
        owned: [own(BATTLE_ITEMS[1].id), own(BATTLE_ITEMS[4].id), own(stickers[0].id), own(stickers[2].id, STICKER_COLORWAYS[1].value)],
        equipped: [],
      },
    }
  }
  const all = {
    amulets: amulets(['boss-hp-reduction', 'health-potion', 'health-potion', 'escape', 'skip-boss', 'skip-boss', 'skip-boss']),
    owned: [...BATTLE_ITEMS.map((i) => own(i.id)), ...stickers.map((s, i) => own(s.id, i % 3 === 0 ? STICKER_COLORWAYS[i % 3].value : undefined))],
    equipped: BATTLE_ITEMS.filter((i) => i.perkKind === 'passive').slice(0, 1).map((i) => i.id),
  }
  if (preset === 'todo') return { demo: all }
  // Más ítems que una hoja de 18: copias del catálogo con otro id, solo para ver las hojas.
  const items = [...BATTLE_ITEMS, ...BATTLE_ITEMS.map((i) => ({ ...i, id: `${i.id}-copia` }))]
  return { demo: all, items }
}

export default function InventoryLab() {
  const [preset, setPreset] = useState<Preset>('pocos')
  const data = useMemo(() => build(preset), [preset])

  const btn = (on: boolean): React.CSSProperties => ({
    fontFamily: jersey, fontSize: 16, padding: '3px 10px', cursor: 'pointer', border: '2px solid hsl(var(--tx))', marginLeft: -2,
    background: on ? 'hsl(var(--tx))' : 'hsl(var(--surface))', color: on ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
  })

  return (
    <main className="desk relative min-h-[calc(100vh-56px)] px-4 py-6">
      <div className="flex items-center flex-wrap gap-3 mb-6">
        <span style={{ fontFamily: jersey, fontSize: 18, color: 'hsl(var(--tx))' }}>Inventario de prueba</span>
        <div className="flex" role="group" aria-label="Contenido">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" style={btn(preset === p.id)} aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>{p.label}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-8">
        <div style={{ width: 340 }}>
          <Win title="INVENTARIO.EXE · escritorio" active bodyStyle={{ padding: 14 }}>
            <InventoryApp key={`d-${preset}`} demo={data.demo} itemsOverride={data.items} />
          </Win>
        </div>
        <div style={{ width: 460, maxWidth: '100%' }}>
          <Win title="INVENTARIO.EXE · batalla" active bodyStyle={{ padding: 16 }}>
            <InventoryApp key={`b-${preset}`} inBattle demo={data.demo} itemsOverride={data.items} />
          </Win>
        </div>
      </div>
    </main>
  )
}
