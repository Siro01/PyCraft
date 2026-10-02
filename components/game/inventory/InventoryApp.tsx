'use client'

import { useEffect, useMemo, useState } from 'react'
import { AmuletCard } from '@/components/game/MercaderModal'
import { ShopGlyph } from '@/components/game/shop/ShopIcons'
import { SHOP_CATALOG, STICKER_COLORWAYS } from '@/lib/game/shop'
import { PERK_SLOT_LIMIT, applyItem, ownedPerkItems, type ItemUseResult } from '@/lib/game/perk-effects'
import { sfx } from '@/lib/game/architect/sound'
import {
  activateShopCoupon, consumePerk, getAmulets, getEquippedPerks, getShopOwned, setStickerColorway, togglePerkEquipped,
} from '@/lib/storage/local-store'
import InventoryConsole from '@/components/game/items/InventoryConsole'
import { SixSevenOverlay } from '@/components/game/items/ItemOverlays'
import type { Amulet, OwnedShopItem, ShopItem, ShopItemCategory } from '@/types'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

type Tab = 'amulets' | 'perks' | 'stickers'
const TABS: { id: Tab; label: string }[] = [
  { id: 'amulets', label: 'Amuletos' },
  { id: 'perks', label: 'Ítems' },
  { id: 'stickers', label: 'Stickers' },
]

// Ventana de inventario compartida entre el escritorio (/dashboard) y la
// batalla: todo lo que el alumno juntó en su partida en un solo lugar — los
// amuletos que le da el Mercader Ambulante (de un solo uso, ver
// AMULETOS.SYS en batalla para usarlos) y los ítems/stickers permanentes que
// compra en la tienda del Mercader del Abismo. Mismo lenguaje visual que
// MercaderModal/AmuletCard — no es una superficie nueva, extiende la que ya existe.
interface InventoryAppProps {
  /** Abierto en medio de una batalla: los ítems se muestran, pero se usan desde INVENTARIO.PY de la arena. */
  inBattle?: boolean
  /** Sandbox (/demo/items): lista de ítems fija en vez de lo comprado. */
  itemsOverride?: ShopItem[]
  /** Equipados según la batalla en curso (que puede haber cambiado sin pasar por acá). */
  equippedOverride?: string[]
}

export default function InventoryApp({ inBattle = false, itemsOverride, equippedOverride }: InventoryAppProps = {}) {
  const [loaded, setLoaded] = useState(false)
  const [show67, setShow67] = useState(false)
  const [tab, setTab] = useState<Tab>('amulets')
  const [amulets, setAmulets] = useState<Amulet[]>([])
  const [owned, setOwned] = useState<OwnedShopItem[]>([])
  const [equipped, setEquipped] = useState<string[]>([])
  const [customizing, setCustomizing] = useState<string | null>(null)

  useEffect(() => {
    setAmulets(getAmulets())
    setOwned(getShopOwned())
    setEquipped(getEquippedPerks())
    setLoaded(true)
  }, [])

  const ownedByCategory = useMemo(() => {
    const byId = new Map(SHOP_CATALOG.map((i) => [i.id, i]))
    const out: Record<ShopItemCategory, OwnedShopItem[]> = { perk: [], sticker: [] }
    for (const o of owned) {
      const item = byId.get(o.id)
      if (item) out[item.category].push(o)
    }
    return out
  }, [owned])

  const handleColorway = (id: string, value: string) => {
    setStickerColorway(id, value)
    setOwned(getShopOwned())
  }

  const perkItems = useMemo(() => itemsOverride ?? ownedPerkItems(owned), [itemsOverride, owned])
  const equippedNow = equippedOverride ?? equipped

  // Fuera de batalla: el Cupón, el 67, equipar pasivos y leer los objetos de historia.
  const handleUseOutside = (item: ShopItem): ItemUseResult => {
    const result = applyItem(item, {
      battle: null,
      show67: () => { setShow67(true); sfx.jingle() },
      activateCoupon: (pct) => activateShopCoupon(pct),
      togglePassive: (it) => {
        const wasOn = equipped.includes(it.id)
        const ok = togglePerkEquipped(it.id, PERK_SLOT_LIMIT)
        if (ok) { setEquipped(getEquippedPerks()); sfx.equip(!wasOn) }
        return { ok, equipped: ok ? !wasOn : wasOn }
      },
    })
    if (result.status === 'used') {
      sfx.perkUse()
      consumePerk(item.id)
      setOwned(getShopOwned())
    }
    return result
  }

  if (!loaded) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2" role="tablist" aria-label="Secciones del inventario">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="label-mono"
            style={{
              padding: '5px 10px', cursor: 'pointer', border: '2px solid hsl(var(--tx))',
              background: tab === t.id ? 'hsl(var(--tx))' : 'transparent',
              color: tab === t.id ? 'hsl(var(--bg))' : 'hsl(var(--tx2))',
            }}
          >
            {t.label}
            {t.id === 'amulets' && ` (${amulets.length})`}
            {t.id === 'perks' && ` (${(itemsOverride ?? ownedByCategory.perk).length})`}
            {t.id === 'stickers' && ` (${ownedByCategory.sticker.length})`}
          </button>
        ))}
      </div>

      {tab === 'amulets' && (
        amulets.length === 0 ? (
          <p style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>
            Todavía no tenés amuletos. El Mercader Ambulante te ofrece uno cada 2 jefes que derrotás.
          </p>
        ) : (
          <>
            <p style={{ fontFamily: vt, fontSize: 15, color: 'hsl(var(--tx3))' }}>
              De un solo uso — se activan desde AMULETOS.SYS durante la batalla.
            </p>
            <div className="flex flex-wrap gap-3">
              {amulets.map((a) => <AmuletCard key={a.id} type={a.type} compact />)}
            </div>
          </>
        )
      )}

      {tab === 'perks' && (
        <div className="flex flex-col gap-2">
          <p style={{ fontFamily: vt, fontSize: 15, color: 'hsl(var(--tx3))' }}>
            {inBattle
              ? 'Tus ítems de batalla. Se usan escribiendo print(nombre) en INVENTARIO.PY.'
              : `Los de combate se usan en batalla. Acá podés usar el Cupón, equipar hasta ${PERK_SLOT_LIMIT} ítems o mirar los objetos de historia.`}
          </p>
          <InventoryConsole
            items={perkItems}
            equipped={equippedNow}
            onUse={handleUseOutside}
            inBattle={false}
            readOnly={inBattle}
          />
          {show67 && <SixSevenOverlay onDone={() => setShow67(false)} />}
        </div>
      )}

      {tab === 'stickers' && (
        ownedByCategory.sticker.length === 0 ? (
          <p style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>
            Todavía no tenés stickers. Se compran con diamantes en la tienda del Mercader del Abismo.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ownedByCategory.sticker.map((o) => {
              const item = SHOP_CATALOG.find((i) => i.id === o.id)
              if (!item) return null
              const tint = o.colorway ? `hsl(${o.colorway})` : 'hsl(var(--accent))'
              return (
                <div key={o.id} className="flex flex-col items-center gap-1.5 p-2.5" style={{ border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface))', boxShadow: '3px 3px 0 hsl(var(--tx) / 0.15)' }}>
                  <span className="flex items-center justify-center" style={{ width: 40, height: 40, border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface2))' }}>
                    <ShopGlyph glyph={item.glyph} size={20} color={tint} animated />
                  </span>
                  <span style={{ fontFamily: jersey, fontSize: 12, color: 'hsl(var(--tx))', textAlign: 'center', lineHeight: 1.1 }}>{item.name}</span>
                  <button
                    type="button"
                    onClick={() => setCustomizing((c) => (c === o.id ? null : o.id))}
                    className="label-mono"
                    style={{ color: 'hsl(var(--accent))', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {customizing === o.id ? 'Cerrar' : 'Personalizar'}
                  </button>
                  {customizing === o.id && (
                    <div className="flex items-center gap-1.5 mt-1" role="group" aria-label="Elegir color">
                      {STICKER_COLORWAYS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          title={c.label}
                          onClick={() => handleColorway(o.id, c.value)}
                          style={{ width: 16, height: 16, background: `hsl(${c.value})`, border: o.colorway === c.value ? '2px solid hsl(var(--tx))' : '2px solid hsl(var(--border2))', cursor: 'pointer' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
