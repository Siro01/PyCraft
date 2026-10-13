// Los ítems del Mercader en un duelo de la arena: acá no hay jefe con vida,
// así que los de daño se tiran CONTRA EL RIVAL (lo frenan unos segundos) y
// los de ayuda te ayudan a vos. Regla de oro, igual que con los jefes: ningún
// ítem resuelve un ejercicio — el punto siempre lo hace el código.
//
// Protecciones para que nadie quede trabado: máximo ARENA_ATTACKS_PER_DUEL
// ataques por jugador en cada duelo, y después de cada golpe el que lo
// recibió queda protegido ARENA_IMMUNITY_SECONDS.

import type { ShopItem } from '@/types'
import type { AttackEffect } from './types'

export const ARENA_ATTACKS_PER_DUEL = 3
export const ARENA_IMMUNITY_SECONDS = 8
/** Probabilidad de que el Trébol equipado esquive un ataque. */
export const ARENA_CLOVER_DODGE = 0.2

export type ArenaItemEffect =
  /** Se le tira al rival. */
  | { kind: 'attack'; effect: AttackEffect; seconds: number; consumes: boolean; text: string }
  /** Mandarina: el próximo ataque del rival rebota. */
  | { kind: 'shield'; text: string }
  /** Brócoli: tu próximo ataque dura el doble. */
  | { kind: 'power'; text: string }
  | { kind: 'duck'; text: string }
  | { kind: 'autofix'; text: string }
  /** Pingüino / Trébol: equipar o desequipar. */
  | { kind: 'passive'; text: string }
  /** No sirve en la arena: no se gasta. */
  | { kind: 'none'; text: string }

export function arenaItemEffect(item: ShopItem): ArenaItemEffect {
  switch (item.effectId) {
    case 'daga':
      return { kind: 'attack', effect: 'freeze', seconds: 5, consumes: true, text: 'congela el editor del rival 5 s' }
    case 'pocion-dano':
      return { kind: 'attack', effect: 'freeze', seconds: 10, consumes: true, text: 'congela el editor del rival 10 s' }
    case 'mazo-diamante':
      return { kind: 'attack', effect: 'freeze', seconds: 15, consumes: true, text: 'congela el editor del rival 15 s' }
    case 'zonda':
      return { kind: 'attack', effect: 'wind', seconds: 12, consumes: true, text: 'se lleva la consigna del rival 12 s' }
    case 'six-seven':
      return { kind: 'attack', effect: 'taunt', seconds: 2, consumes: false, text: 'le aparece un 67 gigante al rival' }
    case 'mandarina':
      return { kind: 'shield', text: 'el próximo ataque del rival rebota' }
    case 'brocoli':
      return { kind: 'power', text: 'tu próximo ataque dura el doble' }
    case 'pato-debug':
      return { kind: 'duck', text: 'el pato te explica tu código' }
    case 'compu-hackeada':
      return { kind: 'autofix', text: 'corrige errores de escritura de tu código' }
    case 'pinguino-linux':
    case 'trebol':
      return { kind: 'passive', text: item.effectId === 'trebol' ? `${Math.round(ARENA_CLOVER_DODGE * 100)}% de esquivar cada ataque` : 'te sugiere palabras mientras escribís' }
    case 'cupon-descuento':
      return { kind: 'none', text: 'El cupón se usa en la tienda del Mercader, no en la arena.' }
    default:
      return { kind: 'none', text: `${item.name} no hace nada en la arena.` }
  }
}

/** ¿Se gasta al usarlo? (para el aviso de "se pierde aunque pierdas"). */
export function arenaItemConsumes(e: ArenaItemEffect): boolean {
  return e.kind === 'attack' ? e.consumes : e.kind === 'shield' || e.kind === 'power' || e.kind === 'duck' || e.kind === 'autofix'
}

export const ATTACK_LABEL: Record<AttackEffect, string> = {
  freeze: 'congelado',
  wind: 'sin consigna',
  taunt: '67',
}
