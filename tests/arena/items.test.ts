import { describe, expect, it } from 'vitest'
import { BATTLE_ITEMS, SHOP_CATALOG } from '@/lib/game/shop'
import { arenaItemConsumes, arenaItemEffect } from '@/lib/game/arena/items'

const item = (effectId: string) => {
  const i = SHOP_CATALOG.find((x) => x.effectId === effectId)
  if (!i) throw new Error(`no existe el ítem ${effectId}`)
  return i
}

describe('ítems en la arena', () => {
  it('todos los ítems de batalla tienen un efecto definido (aunque sea "no sirve acá")', () => {
    for (const i of BATTLE_ITEMS) expect(arenaItemEffect(i).kind, i.id).toBeTruthy()
  })

  it('ningún ítem resuelve un ejercicio: solo congelan, tapan la consigna o molestan', () => {
    const attacks = BATTLE_ITEMS.map(arenaItemEffect).filter((e) => e.kind === 'attack')
    for (const a of attacks) expect(['freeze', 'wind', 'taunt']).toContain(a.kind === 'attack' && a.effect)
  })

  it('daga, poción y mazo congelan cada vez más tiempo', () => {
    const secs = ['daga', 'pocion-dano', 'mazo-diamante'].map((id) => {
      const e = arenaItemEffect(item(id))
      return e.kind === 'attack' && e.effect === 'freeze' ? e.seconds : -1
    })
    expect(secs).toEqual([5, 10, 15])
  })

  it('el Zonda le tapa la consigna al rival', () => {
    const e = arenaItemEffect(item('zonda'))
    expect(e.kind === 'attack' && e.effect).toBe('wind')
  })

  it('el 67 no se gasta; los ataques y las ayudas sí', () => {
    expect(arenaItemConsumes(arenaItemEffect(item('six-seven')))).toBe(false)
    for (const id of ['daga', 'zonda', 'mandarina', 'brocoli', 'pato-debug', 'compu-hackeada']) {
      expect(arenaItemConsumes(arenaItemEffect(item(id))), id).toBe(true)
    }
  })

  it('los pasivos y el cupón no se gastan', () => {
    for (const id of ['pinguino-linux', 'trebol', 'cupon-descuento']) {
      expect(arenaItemConsumes(arenaItemEffect(item(id))), id).toBe(false)
    }
  })
})
