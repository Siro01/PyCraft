'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppWindow from '@/components/ui/AppWindow'
import { sfx } from '@/lib/game/architect/sound'
import { DIAMONDS_PER_BOSS, SHOP_UNLOCK_BOSS_NUMBER, SHOP_CATALOG, STICKER_COLORWAYS, discountedPrice, getDailyFeatured, getShopItem } from '@/lib/game/shop'
import { pickDialogue, type MercaderDialogueKind } from '@/lib/game/mercader-dialogue'
import {
  addAdminDiamondBonus, buyShopItem, diamondsAvailable, getPlaygroundState, getShopDiscount, getShopOwned, playgroundLevel,
  setStickerColorway, startCouponVisit, PLAYGROUND_MAX_LEVEL,
} from '@/lib/storage/local-store'
import type { OwnedShopItem, ShopItem } from '@/types'
import { ShopGlyph } from './ShopIcons'
import MerchantBook from './MerchantBook'
import { MercaderPortrait } from './MercaderPortrait'

const jersey = 'var(--font-jersey), monospace'

const VISITED_KEY = 'pysql:mercader-visited'

// Paleta propia de la tienda — un mundo aparte de las 3 del mapa (light/dark/
// red), como pide el profesor ("oscura, tenebrosa"): negro violáceo de
// abismo con un único acento cian de "brillo de diamante", mismo mecanismo
// que MAP_PALETTES en lib/game/act-maps.ts (variables HSL inline, nunca pisa
// el tema global del sitio).
const ABYSS_PALETTE: Record<string, string> = {
  '--bg': '260 32% 4%', '--surface': '262 22% 8%', '--surface2': '262 18% 12%',
  '--border': '262 16% 16%', '--border2': '262 12% 26%',
  '--tx': '46 24% 92%', '--tx2': '260 10% 62%', '--tx3': '260 8% 46%',
  '--accent': '189 85% 55%', '--accent2': '189 60% 70%',
  '--danger': '348 100% 58%', '--on-accent': '260 32% 4%',
}

interface Props {
  totalDefeated: number
  username?: string
  /** El jefe "Mercader del Abismo" (#4, Acto I) ya está habilitado y todavía no fue derrotado. */
  battleNear?: boolean
  /** Ya derrotó al jefe #2 — si no, la tienda se muestra cerrada (también si entran por URL). */
  unlocked?: boolean
  /** Vista previa (/demo/tienda): nivel fijo y compras solo en memoria — no toca el inventario real. */
  preview?: { level: number }
  /** Entró el docente: la tienda está abierta aunque no haya derrotado al jefe #2. */
  adminView?: boolean
}

export default function ShopApp({ totalDefeated, username, battleNear = false, unlocked = true, preview, adminView = false }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [level, setLevel] = useState(1)
  const [, setBonusTick] = useState(0)
  const [owned, setOwned] = useState<OwnedShopItem[]>([])
  const [customizing, setCustomizing] = useState<string | null>(null)
  const [dialogueLines, setDialogueLines] = useState<string[]>([])
  const [discount, setDiscount] = useState(0)

  useEffect(() => {
    if (preview) {
      setDialogueLines(pickDialogue('presentacion'))
      setLoaded(true)
      return
    }
    // El docente compra sin traba de nivel, para poder probar cualquier ítem.
    setLevel(adminView ? PLAYGROUND_MAX_LEVEL : playgroundLevel(getPlaygroundState().xp).level)
    setOwned(getShopOwned())
    // Un Cupón usado en batalla empieza a correr acá: vale para toda esta visita.
    startCouponVisit()
    setDiscount(getShopDiscount())

    const kind: MercaderDialogueKind = battleNear
      ? 'batalla-cercana'
      : localStorage.getItem(VISITED_KEY) ? 'rebienvenida' : 'presentacion'
    setDialogueLines(pickDialogue(kind))
    try { localStorage.setItem(VISITED_KEY, '1') } catch { /* modo privado */ }
    if (unlocked) sfx.mercaderGreet()

    setLoaded(true)
  }, [battleNear, unlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (preview) setLevel(preview.level) }, [preview])

  const diamonds = preview
    ? totalDefeated * DIAMONDS_PER_BOSS - owned.reduce((sum, o) => sum + o.pricePaid, 0)
    : diamondsAvailable(totalDefeated)
  const dailyFeatured = useMemo(() => getDailyFeatured(), [])
  const ownedIds = useMemo(() => new Set(owned.map((o) => o.id)), [owned])
  const sortedCatalog = useMemo(
    () => [...SHOP_CATALOG]
      .sort((a, b) => (a.level !== b.level ? a.level - b.level : a.price - b.price))
      .map((i) => (discount > 0 ? { ...i, price: discountedPrice(i.price, discount) } : i)),
    [discount]
  )
  const ownedStickers = owned.filter((o) => SHOP_CATALOG.find((i) => i.id === o.id)?.category === 'sticker')

  const handleBuy = (item: ShopItem): { ok: boolean } => {
    if (preview) {
      const ok = !owned.some((o) => o.id === item.id) && level >= item.level && diamonds >= item.price
      if (ok) setOwned((prev) => [...prev, { id: item.id, pricePaid: item.price, acquiredAt: new Date().toISOString() }])
      if (ok) sfx.confirm(); else sfx.denied()
      return { ok }
    }
    // Siempre con el ítem original del catálogo: buyShopItem ya aplica el cupón.
    const result = buyShopItem(getShopItem(item.id) ?? item, totalDefeated, level)
    if (result) {
      sfx.confirm()
      setOwned(getShopOwned())
      return { ok: true }
    }
    sfx.denied()
    return { ok: false }
  }

  const handleSetColorway = (id: string, value: string) => {
    if (preview) { setOwned((prev) => prev.map((o) => (o.id === id ? { ...o, colorway: value } : o))); return }
    setStickerColorway(id, value)
    setOwned(getShopOwned())
  }

  if (!loaded) return null

  return (
    <div
      className="desk relative"
      style={{
        ...(ABYSS_PALETTE as React.CSSProperties),
        border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))',
        backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.14) 1px, transparent 1px)', backgroundSize: '14px 14px',
        boxShadow: '6px 6px 0 hsl(var(--tx) / 0.18)',
      }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1" style={{ minHeight: 28, background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))' }}>
        <span style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.08em', color: 'hsl(var(--tx))' }}>PYCRAFT OS</span>
        {adminView && (
          <span className="label-mono" title="Los alumnos la ven recién después de derrotar al jefe 2" style={{ padding: '1px 6px', border: '2px solid hsl(var(--accent))', color: 'hsl(var(--accent))' }}>
            Vista docente
          </span>
        )}
        {adminView && !preview && (
          <button
            type="button"
            onClick={() => { addAdminDiamondBonus(150); setBonusTick((t) => t + 1); sfx.mercader() }}
            className="label-mono"
            title="Bono de prueba del docente: solo en este navegador"
            style={{ padding: '1px 6px', border: '2px solid hsl(var(--accent))', background: 'hsl(var(--accent))', color: 'hsl(var(--bg))', cursor: 'pointer' }}
          >
            <span className="flex items-center gap-1">+150 <ShopGlyph glyph="crystal" size={10} color="hsl(var(--bg))" /></span>
          </button>
        )}
        <span className="hidden sm:block" style={{ flex: 1 }} />
        <div className="flex items-center gap-1" title={`Nivel ${level} de ${PLAYGROUND_MAX_LEVEL} — jugá el patio de juegos para subir`}>
          <span className="label-mono" style={{ color: 'hsl(var(--tx3))' }}>NIVEL</span>
          <span style={{ fontFamily: jersey, fontSize: 16, color: 'hsl(var(--accent))' }}>{level}</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ border: '2px solid hsl(var(--tx))', padding: '2px 8px', background: 'hsl(var(--surface2))' }} title={`${totalDefeated} jefes × ${DIAMONDS_PER_BOSS} diamantes + los del patio de juegos`}>
          <ShopGlyph glyph="crystal" size={13} color="hsl(var(--accent))" />
          <span className="tabular" style={{ fontFamily: jersey, fontSize: 16, color: 'hsl(var(--tx))' }}>{diamonds}</span>
        </div>
        <Link href="/dashboard" className="label-mono" style={{ color: 'hsl(var(--tx2))' }}>← Volver al mapa</Link>
      </div>

      {!unlocked ? (
        <div className="p-3">
          <AppWindow
            title="TIENDA.EXE"
            icon={<ShopGlyph glyph="crystal" size={12} color="hsl(var(--bg))" />}
            x={0} y={0} w={0} z={0} active mode="normal" essential flow onFocus={() => {}}
            bodyStyle={{ padding: 20 }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative shrink-0" style={{ filter: 'brightness(0.55)' }}>
                <MercaderPortrait scale={4} crop />
              </div>
              <div className="flex flex-col gap-3 items-start" style={{ maxWidth: '52ch' }}>
                <span style={{ fontFamily: jersey, fontSize: 30, lineHeight: 1, padding: '2px 12px', border: '3px solid hsl(var(--tx))', color: 'hsl(var(--tx))', transform: 'rotate(-3deg)', background: 'hsl(var(--surface))' }}>
                  CERRADO
                </span>
                <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 22, lineHeight: 1.2, color: 'hsl(var(--tx))' }}>
                  “Todavía no atiendo a cualquiera. Volvé cuando hayas derrotado al jefe {SHOP_UNLOCK_BOSS_NUMBER}, el Guardián de la Puerta. Ahí vas a tener diamantes, y yo, clientes.”
                </p>
                <Link href="/dashboard" className="label-mono" style={{ padding: '6px 14px', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--tx))', color: 'hsl(var(--bg))' }}>
                  ← Volver al mapa
                </Link>
              </div>
            </div>
          </AppWindow>
        </div>
      ) : (
      <div className="p-3">
        {discount > 0 && (
          <div className="flex items-center gap-2 mb-3 item-status-in" style={{ padding: '6px 10px', border: '2px solid hsl(var(--accent))', background: 'hsl(var(--surface))' }}>
            <ShopGlyph glyph="item:cupon" size={16} animated />
            <span style={{ fontFamily: jersey, fontSize: 17, color: 'hsl(var(--tx))' }}>
              Cupón activo: <span style={{ color: 'hsl(var(--accent))' }}>−{Math.round(discount * 100)}%</span> en todo, durante esta visita.
            </span>
          </div>
        )}
        <AppWindow
          title="TIENDA.EXE"
          icon={<ShopGlyph glyph="crystal" size={12} color="hsl(var(--bg))" />}
          x={0} y={0} w={0}
          z={0}
          active
          mode="normal"
          essential
          flow
          onFocus={() => {}}
          bodyStyle={{ padding: 12 }}
        >
          <MerchantBook
            dialogueLines={dialogueLines}
            catalog={sortedCatalog}
            ownedIds={ownedIds}
            ownedStickers={ownedStickers}
            level={level}
            diamonds={diamonds}
            dailyFeatured={dailyFeatured}
            onBuy={handleBuy}
            customizingId={customizing}
            onToggleCustomize={setCustomizing}
            colorways={STICKER_COLORWAYS}
            onSetColorway={handleSetColorway}
          />
        </AppWindow>
      </div>
      )}
    </div>
  )
}
