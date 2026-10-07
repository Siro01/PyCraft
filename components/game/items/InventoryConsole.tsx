'use client'

// INVENTARIO.PY — la ventanita donde se USAN los ítems.
//
// Para usar un ítem hay que escribir print(nombre_del_item), igual que en
// Python: si está mal escrito, no se usa (y no se gasta). Los errores imitan
// a los de Python pero en criollo, para que el error enseñe algo. Rodolfo
// explica la regla la primera vez; después queda un "?" para volver a verlo.

import { useEffect, useMemo, useRef, useState } from 'react'
import Win from '@/components/ui/Win'
import { ItemSprite, itemSpriteKey } from './ItemSprites'
import { sfx } from '@/lib/game/architect/sound'
import { BATTLE_ITEMS } from '@/lib/game/shop'
import type { ItemUseResult } from '@/lib/game/perk-effects'
import type { ShopItem } from '@/types'

const vt = 'var(--font-vt323), monospace'
const jersey = 'var(--font-jersey), monospace'
const mono = "'Courier New', Courier, monospace"

const RODOLFO_SEEN_KEY = 'pysql:inventario-py-rodolfo'

type Line = { id: number; kind: 'in' | 'out' | 'err' | 'ok' | 'note'; text: string }

interface Props {
  /** Ítems que el alumno tiene (ya cruzados con el catálogo). */
  items: ShopItem[]
  /** Pasivos equipados ahora. */
  equipped: string[]
  /** Usa el ítem — el llamador decide el efecto y si se gasta. */
  onUse: (item: ShopItem) => ItemUseResult
  /** Sin batalla en curso: se aclara en la lista qué ítems esperan a un jefe. */
  inBattle?: boolean
  /** Lista de ítems arriba de la consola (true) o solo la consola (false). */
  showList?: boolean
  /** Solo la lista, sin consola (el inventario abierto en batalla: se usan desde la ventana de abajo). */
  readOnly?: boolean
  /** Número nuevo = enfocar el prompt (vacío: el alumno siempre tipea el print, nunca se autocompleta). */
  focusSignal?: number
  /** Contenido extra a la derecha de la barra (ej. el botón para cerrar la consola). */
  titleRight?: React.ReactNode
  /** Batalla: cinturón de una fila (solo dibujos + prompt) y una sola línea de respuesta. */
  hotbar?: boolean
  className?: string
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

function closest(name: string, pool: ShopItem[]): ShopItem | undefined {
  const n = normalize(name)
  let best: ShopItem | undefined, bestD = 3
  for (const it of pool) {
    const d = distance(n, it.printName ?? '')
    if (d < bestD) { best = it; bestD = d }
  }
  return best
}

type Parsed =
  | { ok: true; item: ShopItem }
  | { ok: false; error: string; hint?: string }

/** Interpreta la línea como lo haría Python con un print(), pero solo para ítems. */
export function parseInventoryCommand(raw: string, owned: ShopItem[]): Parsed {
  const line = raw.trim()
  const m = line.match(/^(\w+)\s*\((.*)\)\s*$/)
  const bare = line.match(/^(\w+)$/)

  if (!m) {
    if (bare && owned.some((i) => i.printName === bare[1])) {
      return { ok: false, error: `${bare[1]} está en tu inventario, pero solo nombrarlo no hace nada.`, hint: `Imprimilo para usarlo: print(${bare[1]})` }
    }
    if (/^print\s*\(/.test(line)) return { ok: false, error: 'SyntaxError: falta cerrar el paréntesis )', hint: 'Cada ( necesita su ).' }
    if (/^print\b/.test(line)) return { ok: false, error: 'SyntaxError: print necesita paréntesis', hint: 'Así: print(nombre_del_item)' }
    return { ok: false, error: 'SyntaxError: no entiendo esa línea', hint: 'Para usar un ítem escribí print(nombre_del_item).' }
  }

  const [, fn, argRaw] = m
  if (fn !== 'print') {
    const near = normalize(fn).startsWith('pri') || distance(normalize(fn), 'print') <= 2
    return {
      ok: false,
      error: `NameError: name '${fn}' is not defined`,
      hint: near ? '¿Quisiste decir print? Va todo en minúscula y con las 5 letras.' : 'La función para usar ítems es print().',
    }
  }

  const arg = argRaw.trim()
  if (!arg) return { ok: false, error: 'print() está vacío', hint: 'Adentro de los paréntesis va el nombre del ítem.' }
  if (/^["'].*["']$/.test(arg)) {
    return { ok: false, error: `Eso es un texto, no un ítem: imprimiría las letras ${arg}.`, hint: `Sacale las comillas: print(${arg.slice(1, -1)})` }
  }

  const found = owned.find((i) => i.printName === arg)
  if (found) return { ok: true, item: found }

  const inCatalog = BATTLE_ITEMS.find((i) => i.printName === arg)
  if (inCatalog) return { ok: false, error: `No tenés ${inCatalog.name} en el inventario.`, hint: 'Se consigue en la tienda del Mercader del Abismo.' }

  const near = closest(arg, owned)
  return {
    ok: false,
    error: `NameError: name '${arg}' is not defined`,
    hint: near ? `¿Quisiste decir ${near.printName}? Tiene que estar escrito exacto.` : 'Fijate el nombre exacto en la lista de arriba.',
  }
}

const KIND_LABEL: Record<string, string> = { consumable: 'Se gasta', passive: 'Equipable', key: 'Historia' }

export default function InventoryConsole({ items, equipped, onUse, inBattle = true, showList = true, readOnly = false, focusSignal, titleRight, hotbar = false, className }: Props) {
  const [input, setInput] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState<number | null>(null)
  const [rodolfo, setRodolfo] = useState(false)
  const [shake, setShake] = useState(false)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [peek, setPeek] = useState<ShopItem | null>(null)
  const [chosen, setChosen] = useState<ShopItem | null>(null)
  const [showResult, setShowResult] = useState(false)
  const idRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const outRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { if (!localStorage.getItem(RODOLFO_SEEN_KEY)) setRodolfo(true) } catch { setRodolfo(true) }
  }, [])

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight })
  }, [lines])

  useEffect(() => {
    if (focusSignal) inputRef.current?.focus()
  }, [focusSignal])

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.level - b.level || a.price - b.price),
    [items],
  )

  const push = (...ls: Omit<Line, 'id'>[]) =>
    setLines((prev) => [...prev, ...ls.map((l) => ({ ...l, id: ++idRef.current }))].slice(-14))

  const closeRodolfo = () => {
    setRodolfo(false)
    try { localStorage.setItem(RODOLFO_SEEN_KEY, '1') } catch { /* modo privado */ }
  }

  const run = () => {
    const cmd = input.trim()
    if (!cmd) return
    setHistory((h) => [...h, cmd].slice(-20))
    setHistIdx(null)
    setInput('')
    setShowResult(true)
    const parsed = parseInventoryCommand(cmd, items)
    if (!parsed.ok) {
      sfx.error()
      // Reinicia la animación sin remontar el input (así no pierde el foco).
      setShake(false)
      requestAnimationFrame(() => setShake(true))
      push({ kind: 'in', text: cmd }, { kind: 'err', text: parsed.error }, ...(parsed.hint ? [{ kind: 'note' as const, text: parsed.hint }] : []))
      return
    }
    const result = onUse(parsed.item)
    if (result.status === 'rejected') {
      sfx.denied()
      push({ kind: 'in', text: cmd }, { kind: 'note', text: result.message })
      return
    }
    setFlashId(parsed.item.id)
    setTimeout(() => setFlashId(null), 700)
    push({ kind: 'in', text: cmd }, { kind: parsed.item.effectId === 'six-seven' ? 'out' : 'ok', text: result.message })
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); run(); return }
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault()
      const i = histIdx === null ? history.length - 1 : Math.max(0, histIdx - 1)
      setHistIdx(i); setInput(history[i])
    }
    if (e.key === 'ArrowDown' && histIdx !== null) {
      e.preventDefault()
      const i = histIdx + 1
      if (i >= history.length) { setHistIdx(null); setInput('') } else { setHistIdx(i); setInput(history[i]) }
    }
  }

  const describe = (item: ShopItem) => {
    sfx.itemFocus()
    if (readOnly) return
    push({ kind: 'note', text: `# ${item.name}: ${item.effectHint ?? item.description}` })
    inputRef.current?.focus()
  }

  if (hotbar) {
    // Lo último que pasó: desde el último comando escrito en adelante.
    const lastIn = lines.map((l) => l.kind).lastIndexOf('in')
    const last = lastIn >= 0 ? lines.slice(lastIn) : []
    // Tocar un ítem NO escribe nada: lo deja marcado con su nombre abajo y
    // pone el cursor en el prompt — el print lo tipea siempre el alumno.
    const pick = (item: ShopItem) => {
      sfx.invSlot()
      setChosen(item)
      setShowResult(false)
      inputRef.current?.focus()
    }
    const shown = peek ?? chosen
    return (
      <Win
        title="INVENTARIO.PY"
        className={className}
        right={
          <button
            type="button"
            onClick={() => { sfx.invInfo(!rodolfo); if (rodolfo) closeRodolfo(); else setRodolfo(true) }}
            aria-label="Cómo se usa inventario.py"
            aria-expanded={rodolfo}
            title="¿Cómo se usa?"
            className={`inv-tool${rodolfo ? ' is-on' : ''}`}
            style={{ height: 20, minWidth: 20, fontSize: 15 }}
          >
            ?
          </button>
        }
        bodyStyle={{ padding: 0 }}
      >
        {rodolfo && (
          <div className="flex items-center gap-2.5 inv-note" style={{ margin: 0, border: 'none', borderBottom: '2px solid hsl(var(--border2))', padding: '6px 10px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rodolfo/rodolfo.gif" alt="" width={28} height={28} style={{ imageRendering: 'pixelated', flexShrink: 0 }} />
            <span className="flex-1" style={{ color: 'hsl(var(--tx))' }}>
              Tocá un ítem y apretá <b>Enter</b>: se usa con <code style={{ fontFamily: mono, fontSize: 14 }}>print(nombre)</code>, sin comillas. Mal escrito no se gasta.
            </span>
            <button type="button" onClick={closeRodolfo} className="inv-tool" style={{ height: 22, fontSize: 15 }}>Entendido</button>
          </div>
        )}
        <div
          className={`inv-belt${shake ? ' console-shake' : ''}`}
          onAnimationEnd={(e) => { if (e.target === e.currentTarget) setShake(false) }}
        >
          <ul className="inv-belt-slots" aria-label="Tus ítems" onMouseLeave={() => setPeek(null)}>
            {sorted.map((item) => {
              const sprite = itemSpriteKey(item.glyph)
              const isEq = equipped.includes(item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => pick(item)}
                    onMouseEnter={() => { setPeek(item); sfx.hover() }}
                    onFocus={() => setPeek(item)}
                    onBlur={() => setPeek(null)}
                    aria-label={`${item.name}${isEq ? ', equipado' : ''}. Se escribe ${item.printName}`}
                    aria-pressed={chosen?.id === item.id}
                    className={`inv-belt-slot${isEq ? ' is-eq' : ''}${chosen?.id === item.id ? ' is-sel' : ''}${flashId === item.id ? ' item-use-pop' : ''}`}
                  >
                    {sprite && <ItemSprite sprite={sprite} size={24} />}
                  </button>
                </li>
              )
            })}
          </ul>
          <label className="inv-belt-prompt" onClick={() => inputRef.current?.focus()}>
            <span aria-hidden style={{ color: 'hsl(var(--accent))', fontWeight: 700 }}>&gt;&gt;&gt;</span>
            <span className="sr-only">Comando de inventario</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              placeholder="print(item)"
              className="inv-input"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'hsl(var(--tx))', fontFamily: mono, fontSize: 14, caretColor: 'hsl(var(--accent))' }}
            />
            <button
              type="button"
              onClick={run}
              disabled={!input.trim()}
              className="inv-tool"
              style={{ height: 24, fontSize: 15 }}
            >
              Enter
            </button>
          </label>
        </div>
        {(shown || last.length > 0) && (
          <div className="inv-belt-status" aria-live="polite">
            {shown && (peek || !showResult || !last.length) ? (
              <span key={`p-${shown.id}`} className="item-status-in">
                <b style={{ fontFamily: jersey, fontWeight: 400, color: 'hsl(var(--tx))' }}>{shown.name}</b>
                <span style={{ color: 'hsl(var(--tx2))' }}> — {shown.effectHint ?? shown.description}</span>
                <span style={{ color: 'hsl(var(--tx3))' }}> · se llama </span>
                <code style={{ fontFamily: mono, fontSize: 14, color: 'hsl(var(--accent))' }}>{shown.printName}</code>
              </span>
            ) : last.filter((l) => l.kind !== 'in').map((l) => (
              <span
                key={l.id}
                className="item-status-in"
                style={{
                  display: 'block',
                  color: l.kind === 'err' ? 'hsl(var(--danger))' : l.kind === 'note' ? 'hsl(var(--tx3))' : 'hsl(var(--tx))',
                  fontFamily: l.kind === 'err' ? mono : vt, fontSize: l.kind === 'err' ? 13 : l.kind === 'out' ? 22 : 18,
                  fontWeight: l.kind === 'err' ? 700 : 400,
                }}
              >
                {l.text}
              </span>
            ))}
          </div>
        )}
      </Win>
    )
  }

  return (
    <Win
      title="INVENTARIO.PY"
      className={className}
      right={
        <>
        <button
          type="button"
          onClick={() => setRodolfo((r) => !r)}
          aria-label="Cómo se usa inventario.py"
          title="¿Cómo se usa?"
          style={{ fontFamily: jersey, fontSize: 14, lineHeight: 1, width: 20, height: 18, border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface))', color: 'hsl(var(--tx))', cursor: 'pointer' }}
        >
          ?
        </button>
        {titleRight}
        </>
      }
      bodyStyle={{ padding: 0 }}
    >
      {rodolfo && !readOnly && (
        <div className="flex items-start gap-2.5 item-status-in" style={{ padding: '10px 10px 8px', borderBottom: '2px solid hsl(var(--border2))', background: 'hsl(var(--surface2))' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rodolfo/rodolfo.gif" alt="Rodolfo" width={44} height={44} style={{ imageRendering: 'pixelated', border: '2px solid hsl(var(--tx))', flexShrink: 0 }} />
          <div className="min-w-0 flex-1">
            <div style={{ fontFamily: jersey, fontSize: 15, letterSpacing: '0.06em', color: 'hsl(var(--tx))' }}>RODOLFO</div>
            <p style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.15, color: 'hsl(var(--tx))' }}>
              Esto es <b>inventario.py</b>. Para usar un ítem, <b>imprimilo</b>: escribí <code style={{ fontFamily: mono, fontSize: 14, background: 'hsl(var(--bg))', padding: '0 4px' }}>print(</code> + el nombre + <code style={{ fontFamily: mono, fontSize: 14, background: 'hsl(var(--bg))', padding: '0 4px' }}>)</code> y apretá Enter.
            </p>
            <p style={{ fontFamily: vt, fontSize: 17, lineHeight: 1.15, color: 'hsl(var(--tx2))', marginTop: 4 }}>
              Ejemplo: <code style={{ fontFamily: mono, fontSize: 14, color: 'hsl(var(--tx))' }}>print(mandarina)</code>. Sin comillas y escrito exacto. Si le errás a una letra, el ítem no se usa — tampoco se pierde.
            </p>
            <button type="button" onClick={closeRodolfo} className="label-mono" style={{ marginTop: 6, padding: '3px 10px', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--tx))', color: 'hsl(var(--bg))', cursor: 'pointer' }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {showList && (
        <ul className="flex flex-col" style={{ maxHeight: 216, overflowY: 'auto', borderBottom: '2px solid hsl(var(--border2))' }} aria-label="Ítems en tu inventario">
          {sorted.length === 0 && (
            <li style={{ padding: '10px 12px', fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx3))' }}>
              Vacío. Los ítems se compran con diamantes en la tienda del Mercader del Abismo.
            </li>
          )}
          {sorted.map((item) => {
            const sprite = itemSpriteKey(item.glyph)
            const isEq = equipped.includes(item.id)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => describe(item)}
                  title={item.effectHint ?? item.description}
                  className={`inv-row ${flashId === item.id ? 'item-use-pop' : ''}`}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', background: 'transparent', border: 'none', borderBottom: '1px solid hsl(var(--border))', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, background: 'hsl(var(--surface2))', border: `2px solid ${isEq ? 'hsl(var(--accent))' : 'hsl(var(--border2))'}` }}>
                    {sprite && <ItemSprite sprite={sprite} size={26} animated />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2 flex-wrap">
                      <span style={{ fontFamily: jersey, fontSize: 15, color: 'hsl(var(--tx))', lineHeight: 1.1 }}>{item.name}</span>
                      <span className="label-mono" style={{ fontSize: 10, color: isEq ? 'hsl(var(--accent))' : 'hsl(var(--tx3))' }}>
                        {isEq ? '✓ Equipado' : KIND_LABEL[item.perkKind ?? 'consumable']}
                      </span>
                    </span>
                    <code style={{ fontFamily: mono, fontSize: 12, color: 'hsl(var(--tx2))' }}>{item.printName}</code>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {readOnly ? (
        <p style={{ padding: '8px 10px', fontFamily: vt, fontSize: 17, color: 'hsl(var(--tx3))' }}>
          Para usar uno, escribí su print() en la ventana INVENTARIO.PY de la batalla.
        </p>
      ) : (
      <div
        className={shake ? 'console-shake' : undefined}
        onAnimationEnd={(e) => { if (e.target === e.currentTarget) setShake(false) }}
        style={{ background: 'hsl(var(--bg))', fontFamily: mono, fontSize: 13, lineHeight: 1.45 }}
        onClick={() => inputRef.current?.focus()}
      >
        <div ref={outRef} aria-live="polite" style={{ maxHeight: 132, overflowY: 'auto', padding: lines.length ? '8px 10px 0' : 0 }}>
          {lines.map((l) => (
            <div
              key={l.id}
              className="item-status-in"
              style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                color: l.kind === 'err' ? 'hsl(var(--danger))' : l.kind === 'note' ? 'hsl(var(--tx3))' : l.kind === 'in' ? 'hsl(var(--tx2))' : 'hsl(var(--tx))',
                fontFamily: l.kind === 'ok' || l.kind === 'note' ? vt : mono,
                fontSize: l.kind === 'ok' || l.kind === 'note' ? 17 : l.kind === 'out' ? 22 : 13,
                fontWeight: l.kind === 'err' ? 700 : 400,
              }}
            >
              {l.kind === 'in' ? `>>> ${l.text}` : l.text}
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2" style={{ padding: '8px 10px' }}>
          <span aria-hidden style={{ color: 'hsl(var(--accent))', fontWeight: 700 }}>&gt;&gt;&gt;</span>
          <span className="sr-only">Comando de inventario</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            placeholder={inBattle ? 'print(item)' : 'print(item)  ·  fuera de batalla'}
            className="inv-input"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: 'hsl(var(--tx))', fontFamily: mono, fontSize: 14, caretColor: 'hsl(var(--accent))' }}
          />
          <button
            type="button"
            onClick={run}
            disabled={!input.trim()}
            className="label-mono"
            style={{ padding: '3px 10px', border: '2px solid hsl(var(--tx))', background: input.trim() ? 'hsl(var(--tx))' : 'transparent', color: input.trim() ? 'hsl(var(--bg))' : 'hsl(var(--tx3))', cursor: input.trim() ? 'pointer' : 'default' }}
          >
            Enter
          </button>
        </label>
      </div>
      )}
    </Win>
  )
}
