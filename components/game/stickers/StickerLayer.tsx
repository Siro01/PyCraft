'use client'

import { useEffect, useRef, useState } from 'react'
import { ShopGlyph } from '@/components/game/shop/ShopIcons'
import { SHOP_CATALOG } from '@/lib/game/shop'
import { getChestSticker } from '@/lib/game/chest-stickers'
import ChestStickerToy, { ChestSparkle } from './ChestStickerToy'
import { sfx } from '@/lib/game/architect/sound'
import {
  getShopOwned, getStickerPlacements, getStickerSurface, removeStickerPlacement, setStickerPlacement,
  type StickerPlacement, type StickerSurface,
} from '@/lib/storage/local-store'
import type { OwnedShopItem } from '@/types'

const jersey = 'var(--font-jersey), monospace'

interface Props {
  surface: StickerSurface
}

// Capa de decoración — se monta absoluta (inset:0) adentro de un contenedor
// con position:relative (el .desk del dashboard o del patio de prácticas).
// pointer-events:none en el layer, salvo en la bandeja y en cada sticker ya
// pegado, para no tapar clics del mapa/editor de abajo. Arrastre con
// pointer events (mismo mecanismo que el divisor del patio de prácticas):
// desde la bandeja "suelta" uno nuevo, sobre un sticker ya puesto lo mueve.
export default function StickerLayer({ surface }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [owned, setOwned] = useState<OwnedShopItem[]>([])
  const [placements, setPlacements] = useState<Record<string, StickerPlacement>>({})
  const [decorate, setDecorate] = useState(false)
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number } | null>(null)
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOwned(getShopOwned().filter((o) => SHOP_CATALOG.find((i) => i.id === o.id)?.category === 'sticker'))
    setPlacements(getStickerPlacements(surface))
    setLoaded(true)
  }, [surface])

  const clampPct = (v: number) => Math.min(96, Math.max(0, v))

  const dropAt = (itemId: string, clientX: number, clientY: number) => {
    const rect = layerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = clampPct(((clientX - rect.left) / rect.width) * 100)
    const y = clampPct(((clientY - rect.top) / rect.height) * 100)
    setStickerPlacement(surface, itemId, { x, y })
    setPlacements(getStickerPlacements(surface))
  }

  // Arrastrar uno nuevo desde la bandeja.
  const startNewDrag = (itemId: string) => (e: React.PointerEvent) => {
    e.preventDefault()
    sfx.pick()
    setGhost({ id: itemId, x: e.clientX, y: e.clientY })
    const onMove = (ev: PointerEvent) => setGhost({ id: itemId, x: ev.clientX, y: ev.clientY })
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setGhost(null)
      const rect = layerRef.current?.getBoundingClientRect()
      if (rect && ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
        sfx.drop()
        dropAt(itemId, ev.clientX, ev.clientY)
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // Mover uno ya pegado.
  const startMoveDrag = (itemId: string) => (e: React.PointerEvent) => {
    if (!decorate) return
    e.preventDefault()
    e.stopPropagation()
    sfx.pick()
    const onMove = (ev: PointerEvent) => {
      const rect = layerRef.current?.getBoundingClientRect()
      if (!rect) return
      const x = clampPct(((ev.clientX - rect.left) / rect.width) * 100)
      const y = clampPct(((ev.clientY - rect.top) / rect.height) * 100)
      setPlacements((p) => ({ ...p, [itemId]: { surface, x, y } }))
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      sfx.drop()
      dropAt(itemId, ev.clientX, ev.clientY)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleRemove = (itemId: string) => {
    sfx.trash()
    removeStickerPlacement(itemId)
    setPlacements(getStickerPlacements(surface))
  }

  if (!loaded) return null

  const placedEntries = Object.entries(placements).filter(([id]) => owned.some((o) => o.id === id))

  return (
    <div ref={layerRef} className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 5 }} aria-hidden={!decorate && placedEntries.length === 0}>
      {placedEntries.map(([id, pos]) => {
        const item = SHOP_CATALOG.find((i) => i.id === id)
        const owned1 = owned.find((o) => o.id === id)
        if (!item || !owned1) return null
        const tint = owned1.colorway ? `hsl(${owned1.colorway})` : 'hsl(var(--accent))'
        const chest = item.source === 'chest' ? getChestSticker(id) : undefined
        return (
          <div
            key={id}
            onPointerDown={startMoveDrag(id)}
            className="absolute flex items-center justify-center"
            style={{
              left: `${pos.x}%`, top: `${pos.y}%`, width: 30, height: 30, transform: 'translate(-50%, -50%)',
              pointerEvents: 'auto', cursor: decorate ? 'grab' : 'default', touchAction: 'none',
              zIndex: chest ? 1 : undefined,
            }}
            title={chest && !decorate ? undefined : item.name}
          >
            {chest ? (
              <>
                {/* Los stickers de cofre están vivos: fuera del modo decorar, tocarlos los hace reaccionar y hablar. */}
                <ChestStickerToy
                  id={id}
                  size={32}
                  interactive={!decorate}
                  bubble={pos.y < 26 ? 'bottom' : 'top'}
                  align={pos.x < 20 ? 'start' : pos.x > 80 ? 'end' : 'center'}
                />
                {!decorate && <ChestSparkle kind={chest.kind} px={7} style={{ right: -6, top: -6 }} />}
              </>
            ) : (
              <ShopGlyph glyph={item.glyph} size={22} color={tint} animated />
            )}
            {decorate && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => handleRemove(id)}
                aria-label={`Sacar ${item.name}`}
                style={{
                  position: 'absolute', top: -8, right: -8, width: 14, height: 14, fontSize: 9, lineHeight: '12px',
                  border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))', color: 'hsl(var(--tx))', cursor: 'pointer', padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        )
      })}

      {/* Botón + bandeja de decoración — únicas zonas clickeables del layer además de los stickers ya puestos. */}
      <div className="absolute" style={{ left: 8, bottom: 8, pointerEvents: 'auto' }}>
        <button
          type="button"
          onClick={() => { sfx.click(); setDecorate((d) => !d) }}
          className="label-mono"
          style={{
            padding: '5px 9px', cursor: 'pointer', border: '2px solid hsl(var(--tx))',
            background: decorate ? 'hsl(var(--tx))' : 'hsl(var(--surface))', color: decorate ? 'hsl(var(--bg))' : 'hsl(var(--tx2))',
            boxShadow: '2px 2px 0 hsl(var(--tx) / 0.15)',
          }}
        >
          {decorate ? '✓ Decorando' : '✦ Decorar'}
        </button>
      </div>

      {decorate && (
        <div
          className="absolute flex items-center gap-2 overflow-x-auto"
          style={{
            left: 8, right: 8, bottom: 44, maxWidth: 420, padding: '8px 10px', pointerEvents: 'auto',
            border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface) / 0.96)', boxShadow: '3px 3px 0 hsl(var(--tx) / 0.15)',
          }}
        >
          {owned.length === 0 ? (
            <span style={{ fontFamily: jersey, fontSize: 13, color: 'hsl(var(--tx3))' }}>Sin stickers todavía — comprá en la tienda.</span>
          ) : owned.map((o) => {
            const item = SHOP_CATALOG.find((i) => i.id === o.id)
            if (!item) return null
            const tint = o.colorway ? `hsl(${o.colorway})` : 'hsl(var(--accent))'
            const elsewhere = getStickerSurface(o.id)
            const elsewhereOther = elsewhere && elsewhere !== surface
            return (
              <div
                key={o.id}
                onPointerDown={startNewDrag(o.id)}
                className="relative flex items-center justify-center shrink-0"
                style={{ width: 34, height: 34, border: '2px solid hsl(var(--border2))', background: 'hsl(var(--surface2))', cursor: 'grab', touchAction: 'none' }}
                title={elsewhereOther ? `${item.name} está en la otra pantalla — arrastralo para traerlo acá` : `Arrastrá ${item.name} a donde quieras`}
              >
                <ShopGlyph glyph={item.glyph} size={18} color={tint} animated />
                {elsewhereOther && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, background: 'hsl(var(--border2))', border: '1px solid hsl(var(--surface))' }} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {ghost && (
        <div
          className="fixed flex items-center justify-center"
          style={{ left: ghost.x, top: ghost.y, width: 30, height: 30, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 60, opacity: 0.85 }}
        >
          {(() => {
            const item = SHOP_CATALOG.find((i) => i.id === ghost.id)
            const o = owned.find((x) => x.id === ghost.id)
            if (!item) return null
            const tint = o?.colorway ? `hsl(${o.colorway})` : 'hsl(var(--accent))'
            return <ShopGlyph glyph={item.glyph} size={22} color={tint} animated />
          })()}
        </div>
      )}
    </div>
  )
}
