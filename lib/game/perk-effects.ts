// Motor de efectos de los 14 ítems del Mercader del Abismo.
//
// Un ítem no hace nada por sí mismo: ShopItem.effectId se traduce acá a un
// efecto real. Los efectos NO tocan la batalla directamente — piden lo que
// necesitan a través de ItemContext (CombatArena arma uno con sus setters;
// fuera de batalla, el inventario arma uno sin `battle`). Así este archivo
// no depende de React ni de localStorage, y agregar un ítem nuevo es:
// 1) sumarlo a SHOP_CATALOG, 2) agregar un `case` acá, 3) su sprite en
// components/game/items/ItemSprites.tsx.
//
// Regla de oro de balance: ningún ítem de daño derrota al jefe por sí solo.
// Daga, Poción y Mazo dejan al jefe con al menos 1 HP — el golpe final
// siempre lo da el código del alumno.

import type { Boss, OwnedShopItem, ShopItem } from '@/types'
import { BATTLE_ITEMS, COUPON_DISCOUNT, SHOP_CATALOG } from '@/lib/game/shop'

/** Máximo de pasivos equipados a la vez (Pingüino + Trébol entran justo). */
export const PERK_SLOT_LIMIT = 2

export const DAGGER_DAMAGE = 15
export const POTION_DAMAGE_RATIO = 0.55
export const HAMMER_LEAVES_RATIO = 0.03
export const MANDARINA_HEAL = 35
export const BROCCOLI_HITS = 2
export const BROCCOLI_BONUS = 0.2
/** Probabilidad de que el Trébol frene una curación del jefe. "Muy bajo", a pedido del profe. */
export const CLOVER_BLOCK_CHANCE = 0.2

/** Lo que un ítem puede pedirle a la batalla en curso. */
export interface BattleHooks {
  boss: Boss
  bossHp: number
  /** Cambia la vida del jefe (con animación de daño + guardado). */
  damageBoss: (amount: number, source: string) => void
  /** Hay barra de vida del jugador (solo trainee). */
  hasPlayerHp: boolean
  playerHp: number
  maxPlayerHp: number
  healPlayer: (amount: number) => void
  addArmor: () => number
  openDuck: () => void
  runAutoFix: () => { fixes: number; reason?: string }
  armBroccoli: () => void
  broccoliHitsLeft: number
  armZonda: () => void
  zondaArmed: boolean
  duckActive: boolean
}

export interface ItemContext {
  /** `null` fuera de batalla (dashboard) — los ítems de combate se rechazan con un mensaje. */
  battle: BattleHooks | null
  show67: () => void
  activateCoupon: (pct: number) => boolean
  togglePassive: (item: ShopItem) => { ok: boolean; equipped: boolean }
}

/**
 * - 'used': hizo efecto y se gasta (sale del inventario).
 * - 'kept': hizo efecto pero no se gasta (67, pasivos, objetos de historia).
 * - 'rejected': no se pudo usar ahora — el ítem se queda, el mensaje explica por qué.
 */
export interface ItemUseResult {
  status: 'used' | 'kept' | 'rejected'
  /** Lo que "imprime" INVENTARIO.PY — en voz de juego, para chicos. */
  message: string
}

const needsBattle = (item: ShopItem): ItemUseResult => ({
  status: 'rejected',
  message: `${item.name} solo funciona en medio de una batalla. Guardalo para el próximo jefe.`,
})

/** Nueva vida del jefe después de un golpe de ítem: nunca menos de 1 (el último golpe es del alumno). */
export function itemDamageFloor(bossHp: number, damage: number): number {
  return Math.max(1, bossHp - damage)
}

export function applyItem(item: ShopItem, ctx: ItemContext): ItemUseResult {
  const b = ctx.battle
  switch (item.effectId) {
    case 'six-seven':
      ctx.show67()
      return { status: 'kept', message: '67' }

    case 'cupon-descuento': {
      const ok = ctx.activateCoupon(COUPON_DISCOUNT)
      return ok
        ? { status: 'used', message: `Cupón activado: ${Math.round(COUPON_DISCOUNT * 100)}% de descuento en tu próxima visita al Mercader.` }
        : { status: 'rejected', message: 'Ya tenés un cupón esperando. Usalo en la tienda antes de activar otro.' }
    }

    case 'corona-oxidada':
      return { status: 'kept', message: 'La corona está fría y pesa más de lo que parece. Alguien, en algún lugar, la está buscando.' }

    case 'esmeraldas':
      return { status: 'kept', message: 'Un puñado de esmeraldas... por ahora no hay nadie que las necesite, pero quién sabe para qué pueden ser útiles.' }

    case 'pinguino-linux':
    case 'trebol': {
      const r = ctx.togglePassive(item)
      if (!r.ok) return { status: 'rejected', message: `Ya tenés ${PERK_SLOT_LIMIT} ítems equipados. Desequipá uno escribiendo su print() de nuevo.` }
      return {
        status: 'kept',
        message: r.equipped
          ? item.effectId === 'trebol'
            ? 'Trébol equipado. Los jefes que se curan ahora la tienen más difícil.'
            : 'Pingüino equipado. Cuando escribas, va a aparecer para sugerirte palabras.'
          : `${item.name} desequipado.`,
      }
    }

    case 'pato-debug':
      if (!b) return needsBattle(item)
      if (b.duckActive) { b.openDuck(); return { status: 'kept', message: 'El pato ya está con vos en esta batalla. Cuac.' } }
      b.openDuck()
      return { status: 'used', message: 'Cuac. El Pato Debug se sentó al lado de tu código.' }

    case 'mandarina':
      if (!b) return needsBattle(item)
      if (b.hasPlayerHp) {
        if (b.playerHp >= b.maxPlayerHp) return { status: 'rejected', message: 'Tenés la vida llena. Guardá la mandarina para cuando la necesites.' }
        b.healPlayer(MANDARINA_HEAL)
        return { status: 'used', message: `Ñam. +${MANDARINA_HEAL} HP.` }
      } else {
        const total = b.addArmor()
        return { status: 'used', message: `Sin barra de vida, la mandarina se volvió Armadura. Tenés ${total} de armadura para los jefes especiales.` }
      }

    case 'compu-hackeada': {
      if (!b) return needsBattle(item)
      const r = b.runAutoFix()
      return r.fixes > 0
        ? { status: 'used', message: `La Compu Hackeada corrigió ${r.fixes} ${r.fixes === 1 ? 'error' : 'errores'}. Mirá qué cambió.` }
        : { status: 'rejected', message: r.reason ?? 'La Compu no encontró errores para corregir. No se gastó.' }
    }

    case 'daga': {
      if (!b) return needsBattle(item)
      if (b.bossHp <= 1) return { status: 'rejected', message: 'El jefe está en las últimas. El golpe final te toca a vos, con código.' }
      const dmg = b.bossHp - itemDamageFloor(b.bossHp, DAGGER_DAMAGE)
      b.damageBoss(dmg, 'Daga')
      return { status: 'used', message: `¡Zas! La daga le sacó ${dmg} de vida.` }
    }

    case 'pocion-dano': {
      if (!b) return needsBattle(item)
      if (b.bossHp <= 1) return { status: 'rejected', message: 'El jefe está en las últimas. El golpe final te toca a vos, con código.' }
      const dmg = b.bossHp - itemDamageFloor(b.bossHp, Math.ceil(b.boss.hpMax * POTION_DAMAGE_RATIO))
      b.damageBoss(dmg, 'Poción de Daño Instantáneo')
      return { status: 'used', message: `¡BUM! La poción le sacó ${dmg} de vida de un saque.` }
    }

    case 'mazo-diamante': {
      if (!b) return needsBattle(item)
      const target = Math.max(1, Math.round(b.boss.hpMax * HAMMER_LEAVES_RATIO))
      if (b.bossHp <= target) return { status: 'rejected', message: 'El jefe ya está casi sin vida. No gastes el Mazo: terminalo con código.' }
      b.damageBoss(b.bossHp - target, 'Mazo de Diamante')
      return { status: 'used', message: `¡CRACK! El Mazo dejó al jefe con ${target} de vida. Un acierto más y cae.` }
    }

    case 'brocoli':
      if (!b) return needsBattle(item)
      if (b.broccoliHitsLeft > 0) return { status: 'rejected', message: 'Ya comiste brócoli en esta batalla. Con uno alcanza.' }
      b.armBroccoli()
      return { status: 'used', message: `Puaj... pero funciona. Tus próximos ${BROCCOLI_HITS} golpes hacen +${Math.round(BROCCOLI_BONUS * 100)}% de daño.` }

    case 'zonda':
      if (!b) return needsBattle(item)
      if (b.zondaArmed) return { status: 'rejected', message: 'El Zonda ya está soplando. Ejecutá cualquier código válido.' }
      b.armZonda()
      return { status: 'used', message: 'Se levantó el Zonda. En el próximo ataque, cualquier código que funcione le pega al jefe.' }

    default:
      console.warn(`[items] effectId sin implementar: "${item.effectId}"`)
      return { status: 'rejected', message: 'Este ítem todavía no hace nada.' }
  }
}

/** Daño de un acierto con Brócoli activo: +20%, pero sin terminar al jefe antes de la última fase. */
export function broccoliDamage(base: number, bossHp: number, isLastPhase: boolean): number {
  const boosted = Math.round(base * (1 + BROCCOLI_BONUS))
  if (isLastPhase || base >= bossHp) return boosted
  // El bonus nunca puede saltear una fase: si el golpe normal no lo mataba, el bonus tampoco.
  return Math.min(boosted, bossHp - 1)
}

/**
 * Para los jefes de la fase 2 que se curan: decide si la curación pasa.
 * Con el Trébol equipado hay CLOVER_BLOCK_CHANCE de que se frene.
 */
export function rollBossHeal(cloverEquipped: boolean, rng: () => number = Math.random): { blocked: boolean } {
  return { blocked: cloverEquipped && rng() < CLOVER_BLOCK_CHANCE }
}

/** Ítems de categoría 'perk' que el alumno tiene comprados, ya cruzados con el catálogo. */
export function ownedPerkItems(owned: OwnedShopItem[]): ShopItem[] {
  const byId = new Map(SHOP_CATALOG.map((i) => [i.id, i]))
  return owned
    .map((o) => byId.get(o.id))
    .filter((i): i is ShopItem => !!i && i.category === 'perk')
}

/** Para diálogos/jefes futuros: ¿el alumno tiene este objeto de historia? */
export function hasKeyItem(owned: OwnedShopItem[], itemId: 'item-corona' | 'item-esmeraldas'): boolean {
  return owned.some((o) => o.id === itemId)
}

/** Busca un ítem por lo que el alumno escribió adentro del print(). */
export function findItemByPrintName(name: string, pool: ShopItem[] = BATTLE_ITEMS): ShopItem | undefined {
  return pool.find((i) => i.printName === name)
}
