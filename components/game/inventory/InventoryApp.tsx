'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ShopGlyph } from '@/components/game/shop/ShopIcons'
import { AmuletIcon, IconCheck } from '@/components/ui/PixelIcons'
import { AMULET_META } from '@/lib/game/amulets'
import { SHOP_CATALOG, STICKER_COLORWAYS } from '@/lib/game/shop'
import { ACT_LABEL, CHEST_STICKERS, getChestSticker, heardLines, type ChestSticker } from '@/lib/game/chest-stickers'
import ChestStickerToy, { ChestSparkle, PixelStar, SecretTag, type ToySay } from '@/components/game/stickers/ChestStickerToy'
import { CHEST_CLOSED, PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { PERK_SLOT_LIMIT, applyItem, ownedPerkItems, type ItemUseResult } from '@/lib/game/perk-effects'
import { sfx } from '@/lib/game/architect/sound'
import {
  activateShopCoupon, consumePerk, getAmulets, getEquippedPerks, getShopOwned, getStickerPokes, setStickerColorway, togglePerkEquipped,
} from '@/lib/storage/local-store'
import InventoryConsole from '@/components/game/items/InventoryConsole'
import { SixSevenOverlay } from '@/components/game/items/ItemOverlays'
import PixelBurst from '@/components/game/repaso/PixelBurst'
import type { Amulet, AmuletType, OwnedShopItem, ShopItem } from '@/types'

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const mono = "'Courier New', Courier, monospace"

// INVENTARIO.EXE — compartido entre el escritorio (/dashboard) y la batalla.
// Una grilla de casilleros, como la mochila de Minecraft: en reposo solo se ven
// los dibujos (y un número si hay varios iguales). Todo lo demás — qué hace,
// cómo se usa, de dónde sale — vive detrás de un toque: la placa de abajo
// muestra el casillero elegido, ⓘ despliega la descripción, ? explica la
// solapa y >_ abre INVENTARIO.PY. Crece en hojas de 6×3 casilleros.

type Tab = 'amulets' | 'perks' | 'stickers'
const TABS: { id: Tab; label: string }[] = [
  { id: 'amulets', label: 'Amuletos' },
  { id: 'perks', label: 'Ítems' },
  { id: 'stickers', label: 'Stickers' },
]

const COLS = 6
const ROWS = 3
const PAGE = COLS * ROWS

/** Qué se puede hacer con un ítem fuera de batalla (siempre escribiendo su print()). */
type OutsideAction = 'use' | 'equip' | 'read' | null
function outsideAction(item: ShopItem): OutsideAction {
  if (item.perkKind === 'passive') return 'equip'
  if (item.perkKind === 'key') return 'read'
  if (item.effectId === 'six-seven' || item.effectId === 'cupon-descuento') return 'use'
  return null
}

const KIND_TAG: Record<string, string> = { consumable: 'Se gasta', passive: 'Equipable', key: 'Historia' }

/** Un casillero lleno: amuleto (apilable), ítem de batalla o sticker. */
interface Entry {
  key: string
  name: string
  description: string
  tag: string
  count: number
  amulet?: AmuletType
  item?: ShopItem
  owned?: OwnedShopItem
  equipped?: boolean
  /** Sticker encontrado en un cofre del mapa: está vivo (reacciona al toque). */
  chest?: ChestSticker
}

const TAB_HELP: Record<Tab, (inBattle: boolean) => string> = {
  amulets: () => 'Te los regala el Mercader Ambulante cada 2 jefes. Son de un solo uso y se activan desde AMULETOS.SYS en medio de una batalla.',
  perks: (inBattle) => inBattle
    ? 'Para usar un ítem, escribí print(nombre) en la ventana INVENTARIO.PY de la batalla.'
    : `Se compran en la tienda del Mercader del Abismo. Los de combate se usan en batalla; acá podés equipar hasta ${PERK_SLOT_LIMIT}, usar el Cupón o leer los objetos de historia — siempre con print().`,
  stickers: () => 'Se compran en la tienda del Mercader del Abismo o se encuentran en cofres escondidos del mapa (los de cofre están vivos: tocalos). Pegalos en tu escritorio con ✦ Decorar.',
}

const EMPTY_TEXT: Record<Tab, string> = {
  amulets: 'Sin amuletos. El Mercader Ambulante aparece cada 2 jefes.',
  perks: 'Sin ítems. Se consiguen en la tienda del Mercader del Abismo.',
  stickers: 'Sin stickers. Se compran en la tienda o se encuentran en los cofres del mapa.',
}

interface InventoryAppProps {
  /** Abierto en medio de una batalla: los ítems se muestran, pero se usan desde INVENTARIO.PY de la arena. */
  inBattle?: boolean
  /** Sandbox (/demo/items): lista de ítems fija en vez de lo comprado. */
  itemsOverride?: ShopItem[]
  /** Equipados según la batalla en curso (que puede haber cambiado sin pasar por acá). */
  equippedOverride?: string[]
  /** Vista previa (/demo/inventario): datos en memoria, nada se lee ni se guarda en el navegador. */
  demo?: { amulets: Amulet[]; owned: OwnedShopItem[]; equipped: string[] }
}

export default function InventoryApp({ inBattle = false, itemsOverride, equippedOverride, demo }: InventoryAppProps = {}) {
  const [loaded, setLoaded] = useState(false)
  const [show67, setShow67] = useState(false)
  const [tab, setTab] = useState<Tab>('amulets')
  const [amulets, setAmulets] = useState<Amulet[]>([])
  const [owned, setOwned] = useState<OwnedShopItem[]>([])
  const [equipped, setEquipped] = useState<string[]>([])
  const [sel, setSel] = useState(0)
  const [pageDir, setPageDir] = useState<'next' | 'prev' | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [focusSignal, setFocusSignal] = useState(0)
  const [burst, setBurst] = useState(0)
  const [pop, setPop] = useState<string | null>(null)
  const [pokes, setPokes] = useState<Record<string, number>>({})
  const [say, setSay] = useState<{ key: string; say: ToySay } | null>(null)
  const [pokeSignal, setPokeSignal] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const uid = useId()

  useEffect(() => {
    if (demo) {
      setAmulets(demo.amulets); setOwned(demo.owned); setEquipped(demo.equipped)
    } else {
      setAmulets(getAmulets()); setOwned(getShopOwned()); setEquipped(getEquippedPerks())
      setPokes(getStickerPokes())
    }
    setLoaded(true)
  }, [demo])

  const equippedNow = equippedOverride ?? equipped
  const perkItems = useMemo(() => itemsOverride ?? ownedPerkItems(owned), [itemsOverride, owned])

  const entries = useMemo<Record<Tab, Entry[]>>(() => {
    // Amuletos iguales se apilan en un casillero (×N), en el orden en que llegaron.
    const stacks = new Map<AmuletType, number>()
    for (const a of amulets) stacks.set(a.type, (stacks.get(a.type) ?? 0) + 1)
    const amuletEntries: Entry[] = Array.from(stacks, ([type, count]) => ({
      key: `amulet:${type}`, name: AMULET_META[type].name, description: AMULET_META[type].description,
      tag: 'Uso único', count, amulet: type,
    }))

    const perkEntries: Entry[] = [...perkItems]
      .sort((a, b) => a.level - b.level || a.price - b.price)
      .map((item) => {
        const isEq = equippedNow.includes(item.id)
        return {
          key: item.id, name: item.name, description: item.effectHint ?? item.description,
          tag: isEq ? 'Equipado' : KIND_TAG[item.perkKind ?? 'consumable'], count: 1, item, equipped: isEq,
        }
      })

    const byId = new Map(SHOP_CATALOG.map((i) => [i.id, i]))
    const stickerEntries: Entry[] = owned.flatMap((o) => {
      const item = byId.get(o.id)
      if (!item || item.category !== 'sticker') return []
      const chest = item.source === 'chest' ? getChestSticker(o.id) : undefined
      if (chest) {
        return [{ key: o.id, name: item.name, description: item.description, tag: `${chest.kind === 'secreto' ? 'Cofre secreto' : 'Cofre'} · ${ACT_LABEL[chest.act]}`, count: 1, item, owned: o, chest }]
      }
      const colorway = STICKER_COLORWAYS.find((c) => c.value === o.colorway)
      return [{ key: o.id, name: item.name, description: item.description, tag: colorway ? `Color ${colorway.label}` : 'Sticker', count: 1, item, owned: o }]
    })

    return { amulets: amuletEntries, perks: perkEntries, stickers: stickerEntries }
  }, [amulets, perkItems, owned, equippedNow])

  const list = entries[tab]
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const selIdx = Math.min(sel, Math.max(0, list.length - 1))
  const page = Math.floor(selIdx / PAGE)
  const current = list[selIdx] as Entry | undefined

  // ── Acciones ──────────────────────────────────────────────────────────────
  const refreshOwned = () => { if (!demo) setOwned(getShopOwned()) }

  const handleUseOutside = (item: ShopItem): ItemUseResult => {
    const result = applyItem(item, {
      battle: null,
      show67: () => { setShow67(true); sfx.jingle() },
      activateCoupon: (pct) => (demo ? true : activateShopCoupon(pct)),
      togglePassive: (it) => {
        const wasOn = equipped.includes(it.id)
        let ok: boolean
        if (demo) {
          ok = wasOn || equipped.length < PERK_SLOT_LIMIT
          if (ok) setEquipped((e) => (wasOn ? e.filter((id) => id !== it.id) : [...e, it.id]))
        } else {
          ok = togglePerkEquipped(it.id, PERK_SLOT_LIMIT)
          if (ok) setEquipped(getEquippedPerks())
        }
        if (ok) { sfx.equip(!wasOn); flashSlot(it.id) }
        return { ok, equipped: ok ? !wasOn : wasOn }
      },
    })
    if (result.status === 'used') {
      sfx.perkUse()
      if (demo) setOwned((o) => o.filter((x) => x.id !== item.id))
      else { consumePerk(item.id); refreshOwned() }
    }
    return result
  }

  const handleColorway = (o: OwnedShopItem, value: string) => {
    if (o.colorway === value) return
    if (demo) setOwned((list) => list.map((x) => (x.id === o.id ? { ...x, colorway: value } : x)))
    else { setStickerColorway(o.id, value); refreshOwned() }
    sfx.invDye()
    flashSlot(o.id)
    setBurst((b) => b + 1)
  }

  const flashSlot = (key: string) => {
    setPop(null)
    requestAnimationFrame(() => setPop(key))
  }

  // Abre INVENTARIO.PY con el cursor listo pero el prompt vacío: el print lo tipea el alumno.
  const openConsole = () => {
    if (!consoleOpen) sfx.open()
    setConsoleOpen(true)
    setFocusSignal((n) => n + 1)
  }

  // ── Navegación ────────────────────────────────────────────────────────────
  const changeTab = (t: Tab) => {
    if (t === tab) return
    sfx.invTab()
    setTab(t); setSel(0); setPageDir(null); setShowInfo(false); setShowHelp(false)
  }

  const select = useCallback((i: number, opts: { focus?: boolean } = {}) => {
    const next = Math.max(0, Math.min(list.length - 1, i))
    const nextPage = Math.floor(next / PAGE)
    if (nextPage !== page) { setPageDir(nextPage > page ? 'next' : 'prev'); sfx.pageFlip() } else sfx.invSlot()
    setSel(next)
    if (opts.focus) requestAnimationFrame(() => gridRef.current?.querySelector<HTMLElement>(`[data-slot="${next}"]`)?.focus())
  }, [list.length, page])

  const goPage = (p: number) => {
    if (p < 0 || p >= pages || p === page) return
    setPageDir(p > page ? 'next' : 'prev')
    sfx.pageFlip()
    setSel(p * PAGE)
  }

  const onGridKey = (e: React.KeyboardEvent) => {
    if (!list.length) return
    const local = selIdx - page * PAGE
    const move: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }
    if (e.key in move) {
      e.preventDefault()
      let to = selIdx + move[e.key]
      // Arriba/abajo se quedan en la hoja; izquierda/derecha pasan de hoja en los bordes.
      if (e.key === 'ArrowDown' && (local + COLS >= PAGE || to >= list.length)) return
      if (e.key === 'ArrowUp' && local - COLS < 0) return
      to = Math.max(0, Math.min(list.length - 1, to))
      if (to !== selIdx) select(to, { focus: true })
    } else if (e.key === 'PageDown') { e.preventDefault(); goPage(page + 1) }
    else if (e.key === 'PageUp') { e.preventDefault(); goPage(page - 1) }
    else if (e.key === 'i' || e.key === 'I') { e.preventDefault(); toggleInfo() }
  }

  const toggleInfo = () => {
    sfx.invInfo(!showInfo)
    setShowInfo(!showInfo)
  }

  if (!loaded) return null

  const slots = Array.from({ length: PAGE }, (_, i) => list[page * PAGE + i])
  const counts: Record<Tab, number> = {
    amulets: amulets.length,
    perks: entries.perks.length,
    stickers: entries.stickers.length,
  }
  const canConsole = tab === 'perks' && !inBattle

  return (
    <div className="inv flex flex-col">
      {/* Solapas tipo carpeta, pegadas al marco de la grilla */}
      <div className="flex items-end gap-1" style={{ marginBottom: -2, position: 'relative', zIndex: 1 }}>
        <div className="flex items-end gap-1 min-w-0" role="tablist" aria-label="Secciones del inventario">
          {TABS.map((t) => {
            const on = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${uid}-tab-${t.id}`}
                aria-selected={on}
                aria-controls={`${uid}-panel`}
                onClick={() => changeTab(t.id)}
                className={`inv-tab${on ? ' is-on' : ''}`}
              >
                {t.label}
                <span className="inv-tab-n">{counts[t.id]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Marco con la grilla */}
      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`} className="inv-frame">
        {showHelp && (
          <p className="inv-note" role="note">
            {TAB_HELP[tab](inBattle)}
          </p>
        )}

        <div
          ref={gridRef}
          key={`${tab}-${page}`}
          role="listbox"
          aria-label={`${TABS.find((t) => t.id === tab)?.label}, hoja ${page + 1} de ${pages}`}
          onKeyDown={onGridKey}
          className={`inv-grid${pageDir ? ` inv-grid--${pageDir}` : ''}`}
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {slots.map((entry, i) => {
            const idx = page * PAGE + i
            if (!entry) {
              return (
                <span
                  key={`empty-${i}`}
                  className="inv-slot inv-slot--empty"
                  style={{ ['--i' as string]: i }}
                  onClick={() => sfx.invEmpty()}
                  aria-hidden
                />
              )
            }
            const isSel = idx === selIdx
            return (
              <button
                key={entry.key}
                                data-slot={idx}
                type="button"
                role="option"
                aria-selected={isSel}
                aria-label={`${entry.name}${entry.count > 1 ? `, ${entry.count}` : ''}${entry.equipped ? ', equipado' : ''}`}
                tabIndex={isSel ? 0 : -1}
                onClick={() => { if (!isSel) select(idx); else toggleInfo() }}
                onMouseEnter={() => sfx.hover()}
                className={`inv-slot${isSel ? ' is-sel' : ''}${entry.equipped ? ' is-eq' : ''}`}
                style={{ ['--i' as string]: i }}
              >
                <span className={`inv-sprite${pop === entry.key ? ' inv-pop' : ''}`} onAnimationEnd={() => setPop(null)}>
                  <EntryIcon entry={entry} px={32} animated={isSel} />
                </span>
                {entry.count > 1 && <span className="inv-count">{entry.count}</span>}
                {entry.chest && <ChestSparkle kind={entry.chest.kind} px={7} style={{ right: 3, top: 3 }} />}
                {entry.equipped && (
                  <span className="inv-eq" aria-hidden><IconCheck size={9} color="hsl(var(--bg))" /></span>
                )}
                {isSel && <span className="inv-cursor" aria-hidden />}
              </button>
            )
          })}
        </div>

        {/* Pie del marco: consola, hojas y la ayuda de la solapa */}
        <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
          {canConsole && (
            <button
              type="button"
              onClick={() => { setConsoleOpen((v) => !v); if (consoleOpen) sfx.close(); else sfx.open() }}
              aria-expanded={consoleOpen}
              className={`inv-tool inv-tool--wide${consoleOpen ? ' is-on' : ''}`}
              title="Abrir INVENTARIO.PY"
            >
              <span aria-hidden>&gt;_</span> inventario.py
            </button>
          )}
          {tab === 'stickers' && <ChestCounter found={entries.stickers.filter((e) => e.chest).length} />}
          <span style={{ flex: 1 }} />
          {pages > 1 && (
            <div className="flex items-center gap-1.5" aria-label="Hojas">
              <button type="button" className="inv-tool" onClick={() => goPage(page - 1)} disabled={page === 0} aria-label="Hoja anterior">‹</button>
              <span className="inv-pages" aria-live="polite">{page + 1}/{pages}</span>
              <button type="button" className="inv-tool" onClick={() => goPage(page + 1)} disabled={page >= pages - 1} aria-label="Hoja siguiente">›</button>
            </div>
          )}
          <button
            type="button"
            onClick={() => { sfx.invInfo(!showHelp); setShowHelp(!showHelp) }}
            aria-expanded={showHelp}
            aria-label="¿Para qué sirve esta solapa?"
            title="¿Para qué sirve?"
            className={`inv-tool${showHelp ? ' is-on' : ''}`}
          >
            ?
          </button>
        </div>
      </div>

      {/* Placa del casillero elegido */}
      <div className="inv-plate" aria-live="polite">
        {!current ? (
          <p style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.1, color: 'hsl(var(--tx3))', padding: '2px 2px' }}>{EMPTY_TEXT[tab]}</p>
        ) : (
          <div key={current.key} className="inv-plate-in">
            <div className="flex items-center gap-2.5">
              <span className="inv-plate-icon">
                {current.chest ? (
                  <ChestStickerToy
                    key={current.key}
                    id={current.key}
                    size={48}
                    bubble="none"
                    demo={!!demo}
                    pokeSignal={pokeSignal}
                    onSay={(sy) => { setSay({ key: current.key, say: sy }); setPokes((p) => ({ ...p, [current.key]: sy.n })) }}
                  />
                ) : (
                  <span className={pop === current.key ? 'inv-pop' : undefined} style={{ display: 'flex' }}>
                    <EntryIcon entry={current} px={48} animated />
                  </span>
                )}
                {burst > 0 && tab === 'stickers' && (
                  <span style={{ position: 'absolute', left: '50%', top: '50%' }}><PixelBurst key={burst} kind="chalk" /></span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div style={{ fontFamily: jersey, fontSize: 19, lineHeight: 1.05, color: 'hsl(var(--tx))', overflowWrap: 'anywhere' }}>
                  {current.name}
                  {current.count > 1 && <span style={{ color: 'hsl(var(--tx3))' }}> ×{current.count}</span>}
                </div>
                <div className={`inv-tag${current.equipped ? ' is-eq' : ''}`}>{current.tag}</div>
              </div>
              <button
                type="button"
                onClick={toggleInfo}
                aria-expanded={showInfo}
                aria-label={showInfo ? 'Ocultar descripción' : 'Ver qué hace'}
                title="Qué hace (I)"
                className={`inv-tool inv-tool--info${showInfo ? ' is-on' : ''}`}
              >
                i
              </button>
            </div>

            {showInfo && <p className="inv-desc">{current.description}</p>}

            {current.chest ? (
              <ChestPlate
                chest={current.chest}
                pokes={pokes[current.key] ?? 0}
                say={say?.key === current.key ? say.say : null}
                onPoke={() => setPokeSignal((n) => n + 1)}
              />
            ) : (
              <PlateAction
                entry={current}
                inBattle={inBattle}
                onConsole={openConsole}
                onColor={handleColorway}
              />
            )}
          </div>
        )}
      </div>

      {canConsole && consoleOpen && (
        <div className="inv-console-in" style={{ marginTop: 10 }}>
          <InventoryConsole
            items={perkItems}
            equipped={equippedNow}
            onUse={handleUseOutside}
            inBattle={false}
            showList={false}
            focusSignal={focusSignal}
          />
        </div>
      )}

      {show67 && <SixSevenOverlay onDone={() => setShow67(false)} />}
    </div>
  )
}

/** `px` = lado final del dibujo; los sprites de 16×16 quedan nítidos en múltiplos de 16. */
function EntryIcon({ entry, px, animated }: { entry: Entry; px: number; animated: boolean }) {
  if (entry.amulet) return <AmuletIcon type={entry.amulet} size={Math.round(px * 0.8)} color="hsl(var(--tx))" />
  if (!entry.item) return null
  const tint = entry.owned?.colorway ? `hsl(${entry.owned.colorway})` : undefined
  // ShopGlyph agranda ×1.5 los sprites ("item:*"), así que se le pasa px/1.5.
  return <ShopGlyph glyph={entry.item.glyph} size={px / 1.5} color={tint} animated={animated} />
}

/** La única acción del casillero, según qué es y dónde se abrió el inventario. */
function PlateAction({ entry, inBattle, onConsole, onColor }: {
  entry: Entry
  inBattle: boolean
  onConsole: (item: ShopItem) => void
  onColor: (o: OwnedShopItem, value: string) => void
}) {
  if (entry.owned && entry.item?.category === 'sticker') {
    const o = entry.owned
    return (
      <div className="inv-actions" role="group" aria-label="Color del sticker">
        {STICKER_COLORWAYS.map((c) => {
          const on = o.colorway === c.value
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onColor(o, c.value)}
              aria-pressed={on}
              className={`inv-dye${on ? ' is-on' : ''}`}
              style={{ ['--dye' as string]: c.value }}
            >
              <span className="inv-dye-chip" aria-hidden />
              {c.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (entry.amulet) {
    return <p className="inv-hint">{inBattle ? 'Se activa desde AMULETOS.SYS.' : 'Se usa en batalla.'}</p>
  }

  const item = entry.item
  if (!item) return null
  // Solo el nombre: el print( ) lo arma y lo tipea el alumno, nunca se autocompleta.
  const code = <code style={{ fontFamily: mono, fontSize: 13, color: 'hsl(var(--accent))' }}>{item.printName}</code>

  if (inBattle) return <p className="inv-hint">Se usa con print(item) · se llama {code}</p>

  const action = outsideAction(item)
  if (!action) return <p className="inv-hint">Se usa en batalla · se llama {code}</p>
  const label = action === 'equip' ? (entry.equipped ? 'Desequipar' : 'Equipar') : action === 'read' ? 'Leer' : 'Usar'
  return (
    <div className="inv-actions">
      <button type="button" className="inv-go" onClick={() => onConsole(item)}>
        <span aria-hidden>&gt;_</span> {label}
      </button>
      <span className="inv-hint" style={{ margin: 0 }}>se llama {code}</span>
    </div>
  )
}

/** Pie de la solapa Stickers: cuántos cofres del mapa ya abrió (motiva a explorar). */
function ChestCounter({ found }: { found: number }) {
  return (
    <span className="inv-chests" title="Stickers encontrados en cofres del mapa">
      <PixelBitmap rows={CHEST_CLOSED} scale={1} />
      Cofres {found}/{CHEST_STICKERS.length}
    </span>
  )
}

/** La placa de un sticker de cofre: lo último que dijo, cuántas frases le sacaste y el botón para tocarlo. */
function ChestPlate({ chest, pokes, say, onPoke }: { chest: ChestSticker; pokes: number; say: ToySay | null; onPoke: () => void }) {
  const { heard, total, secret } = heardLines(chest, pokes)
  const plain = heard - (secret ? 1 : 0)
  return (
    <>
      {say && (
        <p key={say.n} className={`inv-say${say.secret ? ' is-secret' : ''}`} aria-live="polite">
          {say.secret && <SecretTag />}
          {say.text}
        </p>
      )}
      <div className="inv-actions">
        <button type="button" className="inv-go" onClick={onPoke}>Tocar</button>
        <span className="inv-heard" role="img" aria-label={`Frases descubiertas: ${heard} de ${total}${secret ? ', incluida la secreta' : ''}`}>
          {Array.from({ length: total - 1 }, (_, i) => <span key={i} className={`inv-pip${i < plain ? ' is-on' : ''}`} />)}
          <span className={`inv-pip-star${secret ? ' is-on' : ''}`}><PixelStar px={9} /></span>
        </span>
      </div>
    </>
  )
}
