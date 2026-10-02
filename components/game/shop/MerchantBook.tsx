'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { IconCheck, IconLock } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'
import { getShopItem } from '@/lib/game/shop'
import type { OwnedShopItem, ShopItem } from '@/types'
import { ItemSprite, itemSpriteKey } from '@/components/game/items/ItemSprites'
import { MercaderPortrait } from './MercaderPortrait'
import { ShopGlyph } from './ShopIcons'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'

const TABS = [
  { id: 'perk', label: 'Ítems' },
  { id: 'sticker', label: 'Stickers' },
  { id: 'collectibles', label: 'Mis stickers' },
] as const
type TabId = (typeof TABS)[number]['id']

interface Props {
  dialogueLines: string[]
  catalog: ShopItem[]
  ownedIds: Set<string>
  ownedStickers: OwnedShopItem[]
  level: number
  diamonds: number
  dailyFeatured: Set<string>
  onBuy: (item: ShopItem) => { ok: boolean } | void
  customizingId: string | null
  onToggleCustomize: (id: string | null) => void
  colorways: { label: string; value: string }[]
  onSetColorway: (id: string, value: string) => void
}

// Tienda en lenguaje PyCraft OS: una línea del Mercader, solapas, una lista
// tipo menú (la fila elegida se invierte, como una selección de sistema) y
// un panel con el ítem elegido. Sin cajas dentro de cajas: las zonas se
// separan con una sola línea. Elegir y comprar son dos pasos — un clic en la
// lista nunca gasta diamantes. Teclado: ↑↓ elige, Enter compra.
export default function MerchantBook({
  dialogueLines, catalog, ownedIds, ownedStickers, level, diamonds,
  onBuy, customizingId, onToggleCustomize, colorways, onSetColorway,
}: Props) {
  const [tab, setTab] = useState<TabId>('perk')
  const [selected, setSelected] = useState(0)
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const items = useMemo(() => (tab === 'collectibles' ? [] : catalog.filter((i) => i.category === tab)), [tab, catalog])
  const isCollectibles = tab === 'collectibles'
  const count = isCollectibles ? ownedStickers.length : items.length

  useEffect(() => { setSelected(0) }, [tab])

  const select = (i: number) => {
    if (i === selected) return
    setSelected(i)
    sfx.itemFocus()
  }

  const buy = (item: ShopItem) => {
    const result = onBuy(item)
    setFlash({ id: item.id, ok: !!result?.ok })
    setTimeout(() => setFlash((f) => (f?.id === item.id ? null : f)), 2200)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!rootRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (!count) return
        sfx.itemFocus()
        setSelected((s) => Math.max(0, Math.min(count - 1, s + (e.key === 'ArrowUp' ? -1 : 1))))
      } else if (e.key === 'Enter') {
        if ((document.activeElement as HTMLElement | null)?.tagName === 'BUTTON') return
        e.preventDefault()
        if (isCollectibles) {
          const o = ownedStickers[selected]
          if (o) onToggleCustomize(customizingId === o.id ? null : o.id)
        } else if (items[selected]) buy(items[selected])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, items, isCollectibles, ownedStickers, customizingId, count])

  const shown = !isCollectibles ? items[selected] : undefined
  const line = dialogueLines[dialogueLines.length - 1] ?? ''

  return (
    <div ref={rootRef} tabIndex={0} className="flex flex-col outline-none">
      {/* El Mercader: una sola línea, sin recuadro */}
      <div className="flex items-end gap-3 pb-3" style={{ borderBottom: '2px solid hsl(var(--tx))' }}>
        <div className="shrink-0" style={{ marginBottom: -2 }}><MercaderPortrait scale={3} crop /></div>
        <p style={{ fontFamily: vt, fontSize: 19, lineHeight: 1.2, color: 'hsl(var(--tx2))', paddingBottom: 4 }}>“{line}”</p>
      </div>

      {/* Solapas */}
      <div className="flex gap-0" role="tablist" aria-label="Secciones de la tienda" style={{ marginTop: 10 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => { sfx.tab(); setTab(t.id) }}
            className="label-mono"
            style={{
              padding: '5px 12px', cursor: 'pointer', marginRight: -2,
              border: '2px solid hsl(var(--tx))', borderBottom: tab === t.id ? '2px solid hsl(var(--tx))' : '2px solid hsl(var(--tx))',
              background: tab === t.id ? 'hsl(var(--tx))' : 'transparent',
              color: tab === t.id ? 'hsl(var(--bg))' : 'hsl(var(--tx2))',
            }}
          >
            {t.label}{t.id === 'collectibles' ? ` (${ownedStickers.length})` : ''}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row" style={{ border: '2px solid hsl(var(--tx))', marginTop: -2 }}>
        {/* Lista tipo menú */}
        <ul className="flex-1 min-w-0" style={{ maxHeight: 420, overflowY: 'auto' }} aria-label="Ítems a la venta">
          {count === 0 && (
            <li style={{ padding: 14, fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>
              {isCollectibles ? 'Todavía no tenés stickers.' : 'No hay nada acá.'}
            </li>
          )}

          {!isCollectibles && items.map((item, i) => {
            const locked = level < item.level
            const owned = ownedIds.has(item.id)
            const isSel = selected === i
            const sprite = itemSpriteKey(item.glyph)
            const ink = isSel ? 'hsl(var(--bg))' : 'hsl(var(--tx))'
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => select(i)}
                  onFocus={() => select(i)}
                  onClick={() => select(i)}
                  aria-current={isSel}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', textAlign: 'left',
                    cursor: 'pointer', border: 'none', borderBottom: '1px solid hsl(var(--border2))',
                    background: isSel ? 'hsl(var(--tx))' : 'transparent', color: ink,
                  }}
                >
                  <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, opacity: locked ? 0.4 : 1, background: isSel ? 'hsl(var(--bg))' : 'transparent' }}>
                    {sprite
                      ? <ItemSprite sprite={sprite} size={24} />
                      : <ShopGlyph glyph={item.glyph} size={16} color={isSel ? 'hsl(var(--bg))' : 'hsl(var(--accent))'} />}
                  </span>
                  <span className="flex-1 min-w-0 truncate" style={{ fontFamily: jersey, fontSize: 17, lineHeight: 1.1, opacity: locked ? 0.55 : 1 }}>{item.name}</span>
                  <span className="shrink-0 flex items-center gap-1 tabular" style={{ fontFamily: jersey, fontSize: 16 }}>
                    {owned ? <IconCheck size={10} color={ink} />
                      : locked ? <><IconLock size={10} color={ink} /><span style={{ opacity: 0.7 }}>Nv {item.level}</span></>
                      : <>{item.price}<ShopGlyph glyph="crystal" size={10} color={isSel ? 'hsl(var(--bg))' : 'hsl(var(--accent))'} /></>}
                  </span>
                </button>
              </li>
            )
          })}

          {isCollectibles && ownedStickers.map((o, i) => {
            const item = catalog.find((c) => c.id === o.id)
            if (!item) return null
            const isSel = selected === i
            const tint = o.colorway ? `hsl(${o.colorway})` : 'hsl(var(--accent))'
            return (
              <li key={o.id} style={{ borderBottom: '1px solid hsl(var(--border2))' }}>
                <button
                  type="button"
                  onMouseEnter={() => select(i)}
                  onClick={() => { setSelected(i); sfx.click(); onToggleCustomize(customizingId === o.id ? null : o.id) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', textAlign: 'left', cursor: 'pointer', border: 'none',
                    background: isSel ? 'hsl(var(--tx))' : 'transparent', color: isSel ? 'hsl(var(--bg))' : 'hsl(var(--tx))',
                  }}
                >
                  <ShopGlyph glyph={item.glyph} size={16} color={tint} />
                  <span className="flex-1" style={{ fontFamily: jersey, fontSize: 17 }}>{item.name}</span>
                  <span className="label-mono" style={{ color: 'inherit' }}>{customizingId === o.id ? 'Cerrar' : 'Color'}</span>
                </button>
                {customizingId === o.id && (
                  <div className="flex items-center gap-1.5 px-3 py-2" role="group" aria-label="Elegir color">
                    {colorways.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        onClick={() => { sfx.click(); onSetColorway(o.id, c.value) }}
                        style={{ width: 20, height: 20, background: `hsl(${c.value})`, border: o.colorway === c.value ? '2px solid hsl(var(--tx))' : '2px solid hsl(var(--border2))', cursor: 'pointer' }}
                      />
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {shown && (
          <Showcase
            key={shown.id}
            item={shown}
            owned={ownedIds.has(shown.id)}
            level={level}
            diamonds={diamonds}
            flash={flash?.id === shown.id ? flash.ok : null}
            onBuy={() => buy(shown)}
          />
        )}
      </div>
    </div>
  )
}

// ── Panel del ítem elegido ───────────────────────────────────────────────────
// Lo justo para decidir: el objeto, qué hace en una frase, el precio y un botón.

interface ShowcaseProps {
  item: ShopItem
  owned: boolean
  level: number
  diamonds: number
  flash: boolean | null
  onBuy: () => void
}

function Showcase({ item, owned, level, diamonds, flash, onBuy }: ShowcaseProps) {
  const sprite = itemSpriteKey(item.glyph)
  const locked = level < item.level
  const affordable = diamonds >= item.price
  const original = getShopItem(item.id)?.price ?? item.price
  const canBuy = !owned && !locked && affordable

  const note = flash === true
    ? item.printName ? `¡Es tuyo! En batalla: print(${item.printName})` : '¡Es tuyo!'
    : flash === false ? 'No se pudo comprar.'
    : owned ? 'Ya lo tenés.'
    : locked ? `Se desbloquea en el nivel ${item.level}.`
    : !affordable ? `Te faltan ${item.price - diamonds} diamantes.`
    : null

  return (
    <aside
      aria-label={`Elegido: ${item.name}`}
      className="md:w-[260px] shrink-0 flex flex-col items-center text-center gap-2 p-4"
      style={{ borderTop: '2px solid hsl(var(--tx))', borderLeft: '2px solid hsl(var(--tx))', marginTop: -2, marginLeft: -2 }}
    >
      <div className={flash ? 'item-use-pop' : undefined} style={{ padding: '8px 0', opacity: locked ? 0.35 : 1 }}>
        {sprite
          ? <ItemSprite sprite={sprite} size={96} animated={!locked} />
          : <ShopGlyph glyph={item.glyph} size={60} color="hsl(var(--accent))" />}
      </div>

      <h3 style={{ fontFamily: jersey, fontSize: 24, lineHeight: 1, color: 'hsl(var(--tx))', margin: 0 }}>{item.name}</h3>
      <p style={{ fontFamily: vt, fontSize: 19, lineHeight: 1.15, color: 'hsl(var(--tx2))', maxWidth: '26ch' }}>
        {item.effectHint ?? item.description}
      </p>

      <div className="w-full mt-auto pt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={onBuy}
          disabled={!canBuy}
          className="flex items-center justify-center gap-2"
          style={{
            width: '100%', padding: '8px 12px', fontFamily: jersey, fontSize: 18, letterSpacing: '0.04em',
            border: '2px solid hsl(var(--tx))', cursor: canBuy ? 'pointer' : 'default',
            background: canBuy ? 'hsl(var(--tx))' : 'transparent',
            color: canBuy ? 'hsl(var(--bg))' : 'hsl(var(--tx3))',
          }}
        >
          {owned ? 'Comprado' : locked ? `Nivel ${item.level}` : (
            <>
              Comprar · {item.price}
              <ShopGlyph glyph="crystal" size={11} color={canBuy ? 'hsl(var(--bg))' : 'hsl(var(--tx3))'} />
              {original !== item.price && <s style={{ opacity: 0.6, fontSize: 15 }}>{original}</s>}
            </>
          )}
        </button>
        <p aria-live="polite" style={{ fontFamily: vt, fontSize: 17, lineHeight: 1.1, minHeight: 19, color: flash === false ? 'hsl(var(--danger))' : 'hsl(var(--tx3))' }}>
          {note}
        </p>
      </div>
    </aside>
  )
}
