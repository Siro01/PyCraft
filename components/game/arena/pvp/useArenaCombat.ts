'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { parseInventoryCommand } from '@/components/game/items/InventoryConsole'
import { autoFixCode, type CodeFix } from '@/lib/game/items/auto-fix'
import { BATTLE_ITEMS } from '@/lib/game/shop'
import { sfx } from '@/lib/game/architect/sound'
import { ownedPerkItems, PERK_SLOT_LIMIT } from '@/lib/game/perk-effects'
import {
  ARENA_ATTACKS_PER_DUEL, ARENA_CLOVER_DODGE, ARENA_IMMUNITY_SECONDS, arenaItemConsumes, arenaItemEffect,
} from '@/lib/game/arena/items'
import type { DuelEvent } from '@/lib/game/arena/types'
import { consumePerk, getEquippedPerks, getShopOwned, setEquippedPerks } from '@/lib/storage/local-store'
import type { Challenge, ShopItem } from '@/types'

// Los ítems del Mercader en un duelo de la arena (1 vs 1 y 2 vs 2): usar con
// print(nombre), tirar ataques al rival elegido y recibir los suyos (congelado,
// sin consigna, 67), con escudo, trébol, protección y tope de ataques.

interface Options {
  sandbox: boolean
  send: (ev: DuelEvent) => void
  meId: string
  /** Reloj de la pantalla (se actualiza 4 veces por segundo). */
  now: number
  challenge: Challenge | null
  /** A quién van los ataques ahora (el rival elegido). */
  target: { id: string; username: string } | null
  nameOf: (id: string) => string
  /** La Compu Hackeada cambia el código del editor. */
  getCode: () => string
  replaceCode: (code: string) => void
  /** Sin ítems (el docente en un 2 vs 2). */
  disabled?: boolean
}

export function useArenaCombat({ sandbox, send, meId, now, challenge, target, nameOf, getCode, replaceCode, disabled = false }: Options) {
  const [frozenUntil, setFrozenUntil] = useState(0)
  const [windUntil, setWindUntil] = useState(0)
  const [tauntUntil, setTauntUntil] = useState(0)
  const immuneUntil = useRef(0)
  const received = useRef(0)
  const [shield, setShield] = useState(0)
  const [power, setPower] = useState(false)
  const [thrown, setThrown] = useState(0)
  const [hit, setHit] = useState(false)

  const [items, setItems] = useState<ShopItem[]>([])
  const [equipped, setEquipped] = useState<string[]>([])
  useEffect(() => {
    setItems(sandbox ? BATTLE_ITEMS : ownedPerkItems(getShopOwned()))
    setEquipped(sandbox ? [] : getEquippedPerks())
  }, [sandbox])
  const penguin = equipped.includes('item-pinguino')
  const clover = equipped.includes('item-trebol')
  const [duck, setDuck] = useState<'off' | 'open' | 'hidden'>('off')
  const [compuFix, setCompuFix] = useState<{ fixes: CodeFix[]; hasBlanks: boolean } | null>(null)
  const [invLine, setInvLine] = useState('')
  const [invEcho, setInvEcho] = useState<{ text: string; ok: boolean } | null>(null)
  /** El primer ítem que se gasta en el duelo pide confirmación: se pierde aunque pierdas. */
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null)
  const confirmed = useRef(false)

  const frozen = now < frozenUntil
  const windy = now < windUntil

  // ── Lo que llega del rival (ataques y rebotes)
  const onItemEvent = useCallback((ev: DuelEvent) => {
    if (ev.from === meId) return
    if (ev.type === 'blocked') {
      if (ev.to !== meId) return
      const who = nameOf(ev.from)
      const why = ev.reason === 'shield' ? 'tenía la mandarina puesta' : ev.reason === 'clover' ? 'lo esquivó con el trébol' : ev.reason === 'immune' ? 'estaba protegido' : 'ya no puede recibir más ataques'
      setInvEcho({ ok: false, text: `Rebotó: ${who} ${why}.` })
      sfx.denied()
      return
    }
    if (ev.type !== 'item' || ev.to !== meId) return
    const who = nameOf(ev.from)
    const t = Date.now()
    if (ev.effect === 'taunt') { setTauntUntil(t + ev.seconds * 1000); sfx.jingle(); return }
    const block = (reason: 'shield' | 'clover' | 'immune' | 'limit') => send({ type: 'blocked', from: meId, to: ev.from, reason })
    if (received.current >= ARENA_ATTACKS_PER_DUEL) return block('limit')
    received.current += 1
    if (t < immuneUntil.current) return block('immune')
    if (shield > 0) {
      setShield((s) => s - 1)
      setInvEcho({ ok: true, text: `¡La mandarina frenó ${ev.item === 'Zonda' ? 'el Zonda' : `la ${ev.item}`} de ${who}!` })
      sfx.denied()
      return block('shield')
    }
    if (clover && Math.random() < ARENA_CLOVER_DODGE) {
      setInvEcho({ ok: true, text: `El trébol esquivó el ataque de ${who}.` })
      return block('clover')
    }
    const until = t + ev.seconds * 1000
    immuneUntil.current = until + ARENA_IMMUNITY_SECONDS * 1000
    if (ev.effect === 'freeze') {
      setFrozenUntil(until)
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    } else setWindUntil(until)
    setHit(true); setTimeout(() => setHit(false), 380)
    sfx.damage()
    setInvEcho({ ok: false, text: `${who} te tiró ${ev.item}: ${ev.effect === 'freeze' ? `editor congelado ${ev.seconds} s` : `sin consigna ${ev.seconds} s`}.` })
  }, [meId, nameOf, send, shield, clover])

  // Congelado: el editor no recibe teclas, pegado ni clics (el inventario sí).
  const consoleRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!frozen) return
    const stop = (e: Event) => { if (consoleRef.current?.contains(e.target as Node)) { e.preventDefault(); e.stopPropagation() } }
    window.addEventListener('keydown', stop, true)
    window.addEventListener('beforeinput', stop, true)
    window.addEventListener('paste', stop, true)
    return () => {
      window.removeEventListener('keydown', stop, true)
      window.removeEventListener('beforeinput', stop, true)
      window.removeEventListener('paste', stop, true)
    }
  }, [frozen])

  // ── Usar un ítem: print(nombre)
  const applyItem = useCallback((item: ShopItem): { ok: boolean; text: string } => {
    const fx = arenaItemEffect(item)
    if (fx.kind === 'none') return { ok: false, text: fx.text }
    if (arenaItemConsumes(fx) && !confirmed.current && !sandbox) {
      if (pendingConfirm !== item.id) {
        setPendingConfirm(item.id)
        sfx.warn()
        return { ok: false, text: `Ojo: ${item.name} se gasta aunque pierdas el duelo. Escribilo otra vez para usarlo.` }
      }
      confirmed.current = true
    }
    setPendingConfirm(null)
    const spend = () => {
      if (sandbox) return
      consumePerk(item.id)
      setItems((list) => {
        const i = list.findIndex((x) => x.id === item.id)
        return i < 0 ? list : [...list.slice(0, i), ...list.slice(i + 1)]
      })
    }

    if (fx.kind === 'passive') {
      const on = equipped.includes(item.id)
      if (!on && equipped.length >= PERK_SLOT_LIMIT) return { ok: false, text: `Ya tenés ${PERK_SLOT_LIMIT} ítems equipados.` }
      const next = on ? equipped.filter((id) => id !== item.id) : [...equipped, item.id]
      setEquipped(next)
      if (!sandbox) setEquippedPerks(next)
      sfx.equip(!on)
      return { ok: true, text: on ? `${item.name} desequipado.` : `${item.name} equipado: ${fx.text}.` }
    }
    if (fx.kind === 'attack') {
      if (!target) return { ok: false, text: 'Elegí a qué rival tirárselo: tocá su nombre.' }
      if (fx.effect !== 'taunt' && thrown >= ARENA_ATTACKS_PER_DUEL) return { ok: false, text: `Ya tiraste ${ARENA_ATTACKS_PER_DUEL} ataques en este duelo. El resto, con código.` }
      const seconds = fx.effect !== 'taunt' && power ? fx.seconds * 2 : fx.seconds
      send({ type: 'item', from: meId, to: target.id, effect: fx.effect, seconds, item: item.name })
      if (fx.effect !== 'taunt') { setThrown((n) => n + 1); if (power) setPower(false) }
      if (fx.consumes) spend()
      sfx.perkUse()
      return { ok: true, text: fx.effect === 'taunt' ? `67. ${target.username} lo vio.` : `¡Le tiraste ${item.name} a ${target.username}! ${fx.effect === 'freeze' ? `Editor congelado ${seconds} s` : `Sin consigna ${seconds} s`}${power ? ' (con brócoli)' : ''}.` }
    }
    if (fx.kind === 'shield') { setShield((s) => s + 1); spend(); sfx.potion(); return { ok: true, text: `Mandarina puesta: ${fx.text}.` } }
    if (fx.kind === 'power') {
      if (power) return { ok: false, text: 'Ya comiste brócoli. Tirá un ataque primero.' }
      setPower(true); spend(); sfx.perkUse(); return { ok: true, text: `Puaj… pero ${fx.text}.` }
    }
    if (fx.kind === 'duck') {
      if (duck !== 'off') { setDuck('open'); return { ok: true, text: 'El pato ya está con vos en este duelo. Cuac.' } }
      setDuck('open'); spend(); sfx.perkUse(); return { ok: true, text: 'Cuac. El Pato Debug se sentó al lado de tu código.' }
    }
    // autofix
    if (!challenge) return { ok: false, text: 'Todavía no hay código para revisar.' }
    const r = autoFixCode(getCode(), challenge.type)
    if (!r.fixes.length) return { ok: false, text: 'La Compu no encontró errores para corregir. No se gastó.' }
    replaceCode(r.code)
    setCompuFix({ fixes: r.fixes, hasBlanks: r.hasBlanks })
    spend(); sfx.perkUse()
    return { ok: true, text: `La Compu Hackeada corrigió ${r.fixes.length} ${r.fixes.length === 1 ? 'error' : 'errores'}.` }
  }, [sandbox, pendingConfirm, equipped, thrown, power, send, meId, target, duck, challenge, getCode, replaceCode])

  const runInventory = useCallback((fighting: boolean) => {
    const line = invLine.trim()
    if (!line) return
    setInvLine('')
    if (!fighting) { setInvEcho({ ok: false, text: 'Esperá a que arranque el duelo.' }); return }
    if (disabled) { setInvEcho({ ok: false, text: 'En este duelo no usás ítems.' }); return }
    const p = parseInventoryCommand(line, items)
    const res = p.ok ? applyItem(p.item) : { ok: false, text: p.hint ? `${p.error} · ${p.hint}` : p.error }
    if (!res.ok) sfx.denied()
    setInvEcho(res)
  }, [invLine, items, applyItem, disabled])

  const statusTags = [
    frozen && `congelado ${Math.ceil((frozenUntil - now) / 1000)}`,
    windy && `sin consigna ${Math.ceil((windUntil - now) / 1000)}`,
    shield > 0 && `mandarina ×${shield}`,
    power && 'brócoli',
    penguin && 'pingüino',
    clover && 'trébol',
  ].filter(Boolean) as string[]

  return {
    items, penguin, clover, frozen, windy, frozenLeft: Math.ceil((frozenUntil - now) / 1000), tauntOn: now < tauntUntil,
    hit, thrown, attacksLeft: ARENA_ATTACKS_PER_DUEL - thrown, statusTags,
    duck, setDuck, compuFix, setCompuFix, invLine, setInvLine, invEcho, setInvEcho, runInventory, onItemEvent, consoleRef,
  }
}
