// Tienda del Mercader del Abismo — catálogo, diamantes y rotación diaria.
// Catálogo final: 14 ítems de batalla (perks) + stickers decorativos. El
// efecto de cada perk vive en lib/game/perk-effects.ts y su sprite pixelart
// en components/game/items/ItemSprites.tsx.

import type { ShopItem } from '@/types'
import { CHEST_STICKER_ITEMS } from './chest-stickers'

/** Diamantes que otorga derrotar un jefe — un lifetime de 14 jefes da 280. */
export const DIAMONDS_PER_BOSS = 20

/** La tienda abre después de derrotar al jefe #2 (Guardián de la Puerta): para
 *  ese momento el alumno ya tiene 40💎 y entiende de dónde salen. */
export const SHOP_UNLOCK_BOSS_ID = 'guardian-puerta'
export const SHOP_UNLOCK_BOSS_NUMBER = 2

/** Lo que dice el Mercader cuando le señalás un ítem en la vidriera. */
export const MERCADER_ITEM_QUIPS: Record<string, string> = {
  'item-six-seven': 'No me preguntes qué hace. Lo vendo porque los chicos lo piden.',
  'item-mandarina': 'De un árbol que crece donde no llega la luz. Igual es dulce.',
  'item-cupon': 'Lo imprimí yo mismo. Que no se te haga costumbre.',
  'item-pato-debug': 'Escucha más de lo que habla. Ojalá fueran todos así.',
  'item-daga': 'Pequeña, sí. Pero nadie se ríe de una daga dos veces.',
  'item-brocoli': 'Lo odiás. Lo sé. Comelo igual.',
  'item-pinguino': 'Vino nadando desde un sistema operativo lejano. Sabe cosas.',
  'item-corona': 'Esa corona tiene dueño. Y el dueño todavía no lo sabe.',
  'item-compu-hackeada': 'Alguien le instaló algo raro. Ahora corrige código sola. Mejor no preguntar.',
  'item-trebol': 'Cuatro hojas. La quinta se la quedó la suerte.',
  'item-esmeraldas': 'No sé quién las quiere. Pero alguien las va a querer.',
  'item-zonda': 'Lo embotellé una tarde de agosto en Mendoza. No lo abras adentro.',
  'item-pocion-dano': 'Cara, sí. Pero lo barato sale caro, ¿no te dijeron?',
  'item-mazo-diamante': 'No quería venderlo. Pero vos te lo ganaste.',
}

// Precios y niveles siguen los tramos de planificacion/items.md: el techo de
// por vida es 280💎 (14 jefes × 20), así que un alumno que juega bien compra
// cómodo los tramos 1-3 y tiene que ELEGIR entre los ítems de prestigio.
// `level` es el nivel del patio de prácticas (1-20) que hace falta para
// comprarlo — los ítems rotos (Poción, Mazo) piden nivel alto a propósito.
export const SHOP_CATALOG: ShopItem[] = [
  // ── Stickers (decoración, no afectan la batalla) ─────────────────────────
  // Mismo sistema de sprites que los ítems (ver ItemSprites.tsx): mitad
  // Minecraft, mitad PyCraft. Baratos a propósito — compiten poco con los
  // ítems de batalla por los 280💎 de por vida.
  {
    id: 'sticker-corazon', category: 'sticker',
    name: 'Corazón de Vida',
    description: 'Medio corazón no alcanza. Este está entero y late.',
    level: 1, price: 10, glyph: 'item:st-corazon',
  },
  {
    id: 'sticker-antorcha', category: 'sticker',
    name: 'Antorcha',
    description: 'Para que tu escritorio nunca quede a oscuras. Los mobs odian esto.',
    level: 1, price: 10, glyph: 'item:st-antorcha',
  },
  {
    id: 'sticker-creeper', category: 'sticker',
    name: 'Creeper',
    description: 'Ssssss... tranqui, este no explota. Creemos.',
    level: 1, price: 15, glyph: 'item:st-creeper',
  },
  {
    id: 'sticker-pasto', category: 'sticker',
    name: 'Bloque de Pasto',
    description: 'El primer bloque de todos. Ahí empezó todo.',
    level: 2, price: 15, glyph: 'item:st-pasto',
  },
  {
    id: 'sticker-prompt', category: 'sticker',
    name: 'Prompt >>>',
    description: 'La consola de Python esperando tu próxima línea. El cursor nunca se cansa.',
    level: 2, price: 20, glyph: 'item:st-prompt',
  },
  {
    id: 'sticker-cofre', category: 'sticker',
    name: 'Cofre',
    description: 'Como el de tu proyecto final. Este no tiene SQL adentro (todavía).',
    level: 3, price: 25, glyph: 'item:st-cofre',
  },
  {
    id: 'sticker-pico', category: 'sticker',
    name: 'Pico de Diamante',
    description: 'Ya no mina bloques. Ahora decora.',
    level: 4, price: 30, glyph: 'item:st-pico',
  },
  {
    id: 'sticker-rodolfo', category: 'sticker',
    name: 'Rodolfo',
    description: 'Tu guía, en versión bloque. Te mira trabajar con orgullo.',
    level: 5, price: 30, glyph: 'item:st-rodolfo',
  },
  {
    id: 'sticker-abismo', category: 'sticker',
    name: 'Ojos del Abismo',
    description: 'Tres estrellas en la oscuridad. El Mercader dice que no es él.',
    level: 6, price: 40, glyph: 'item:st-abismo',
  },

  // ── Tramo 1 · Inicial (jefes 1-2, 20-40💎) ───────────────────────────────
  {
    id: 'item-six-seven',
    category: 'perk', perkKind: 'consumable', effectId: 'six-seven', printName: '67',
    name: '67',
    description: 'Six seven. No hace nada. Absolutamente nada. Pero lo hace con estilo.',
    effectHint: 'Muestra un 67 gigante en pantalla. No se gasta: podés usarlo las veces que quieras.',
    level: 1, price: 5, glyph: 'item:six-seven',
  },
  {
    id: 'item-mandarina',
    category: 'perk', perkKind: 'consumable', effectId: 'mandarina', printName: 'mandarina',
    name: 'Mandarina',
    description: 'Fresquita, de estación. Te devuelve las ganas de seguir.',
    effectHint: 'Con barra de vida: +35 HP. Sin barra de vida (junior/senior): te da 1 de Armadura para los jefes especiales.',
    level: 1, price: 15, glyph: 'item:mandarina',
  },
  {
    id: 'item-cupon',
    category: 'perk', perkKind: 'consumable', effectId: 'cupon-descuento', printName: 'cupon',
    name: 'Cupón de Descuento',
    description: 'Arrugado, pero vale. El Mercader respeta los cupones (a regañadientes).',
    effectHint: '30% de descuento en todo lo que compres en tu próxima visita a la tienda.',
    level: 2, price: 10, glyph: 'item:cupon',
  },
  {
    id: 'item-pato-debug',
    category: 'perk', perkKind: 'consumable', effectId: 'pato-debug', printName: 'pato_debug',
    name: 'Pato Debug',
    description: 'Le explicás tu código al pato y el pato te lo explica de vuelta. Cuac.',
    effectHint: 'Durante esta batalla, el pato te explica línea por línea el código del desafío.',
    level: 2, price: 20, glyph: 'item:pato-debug',
  },

  // ── Tramo 2 · Temprano (jefes 3-5, 60-100💎) ─────────────────────────────
  {
    id: 'item-daga',
    category: 'perk', perkKind: 'consumable', effectId: 'daga', printName: 'daga',
    name: 'Daga',
    description: 'Chiquita y filosa. No derrota a nadie, pero pica.',
    effectHint: 'Le saca 15 de vida al jefe. Nunca lo derrota sola.',
    level: 3, price: 25, glyph: 'item:daga',
  },
  {
    id: 'item-brocoli',
    category: 'perk', perkKind: 'consumable', effectId: 'brocoli', printName: 'brocoli',
    name: 'Brócoli',
    description: 'A nadie le gusta. Pero te hace más fuerte, eso dicen las abuelas.',
    effectHint: 'Tus próximos 2 golpes hacen +20% de daño (solo esta batalla). Igual tenés que pasar las 3 fases.',
    level: 4, price: 35, glyph: 'item:brocoli',
  },
  {
    id: 'item-pinguino',
    category: 'perk', perkKind: 'passive', effectId: 'pinguino-linux', printName: 'pinguino_linux',
    name: 'Pingüino Linux',
    description: 'Un pingüino que sabe muchas palabras de Python y SQL. Te las sopla.',
    effectHint: 'Equipado: mientras escribís, el pingüino te sugiere cómo terminar la palabra (print, input, SELECT…).',
    level: 5, price: 45, glyph: 'item:pinguino',
  },

  // ── Tramo 3 · Medio (jefes 6-9, 120-180💎) ───────────────────────────────
  {
    id: 'item-corona',
    category: 'perk', perkKind: 'key', effectId: 'corona-oxidada', printName: 'corona_oxidada',
    name: 'Corona Oxidada',
    description: 'Perteneció a alguien importante. Alguien que todavía la extraña.',
    effectHint: 'Objeto de historia: algún jefe la va a reconocer y te va a decir algo que a nadie más le dice.',
    level: 6, price: 40, glyph: 'item:corona',
  },
  {
    id: 'item-compu-hackeada',
    category: 'perk', perkKind: 'consumable', effectId: 'compu-hackeada', printName: 'compu_hackeada',
    name: 'Compu Hackeada',
    description: 'Una netbook que alguien hackeó para que revise código sola. Lenta, pero no se le escapa una.',
    effectHint: 'Revisa tu código y corrige hasta 2 errores, explicándote qué cambió y por qué.',
    level: 7, price: 55, glyph: 'item:compu-hackeada',
  },
  {
    id: 'item-trebol',
    category: 'perk', perkKind: 'passive', effectId: 'trebol', printName: 'trebol',
    name: 'Trébol de la Suerte',
    description: 'Cuatro hojas. Lo encontraste en el pasto del patio, de pura suerte.',
    effectHint: 'Equipado: cuando un jefe de la fase 2 intenta curarse, hay un 20% de chance de que no pueda.',
    level: 9, price: 65, glyph: 'item:trebol',
  },

  // ── Tramo 4 · Avanzado (jefes 10-12, 200-240💎) ──────────────────────────
  {
    id: 'item-esmeraldas',
    category: 'perk', perkKind: 'key', effectId: 'esmeraldas', printName: 'esmeraldas',
    name: 'Puñado de Esmeraldas',
    description: 'Un puñado de esmeraldas... por ahora no hay nadie que las necesite, pero quién sabe para qué pueden ser útiles.',
    effectHint: 'De un solo uso. Si un jefe te ofrece un trato, tenerlas cambia lo que pasa.',
    level: 11, price: 70, glyph: 'item:esmeraldas',
  },
  {
    id: 'item-zonda',
    category: 'perk', perkKind: 'consumable', effectId: 'zonda', printName: 'zonda',
    name: 'Zonda',
    description: 'Viento caliente de Mendoza. Barre todo a su paso, consignas incluidas.',
    effectHint: 'En el próximo ataque no importa lo que pidió el jefe: cualquier código que se ejecute sin error le hace daño.',
    level: 12, price: 90, glyph: 'item:zonda',
  },

  // ── Tramo 5 · Prestigio (jefes 13-14, 260-280💎) ─────────────────────────
  {
    id: 'item-pocion-dano',
    category: 'perk', perkKind: 'consumable', effectId: 'pocion-dano', printName: 'pocion_dano',
    name: 'Poción de Daño Instantáneo',
    description: 'Burbujea con malas intenciones. Muy cara. Muy efectiva.',
    effectHint: 'Le saca al jefe el 55% de su vida máxima de un saque. No lo derrota sola.',
    level: 16, price: 150, glyph: 'item:pocion-dano',
  },
  {
    id: 'item-mazo-diamante',
    category: 'perk', perkKind: 'consumable', effectId: 'mazo-diamante', printName: 'mazo_diamante',
    name: 'Mazo de Diamante',
    description: 'El arma más rota del Abismo. El Mercader no quería venderla.',
    effectHint: 'Deja al jefe con el 3% de su vida. Un solo acierto más y cae.',
    level: 20, price: 220, glyph: 'item:mazo-diamante',
  },

  // ── Stickers de cofre: no se venden, se encuentran explorando el mapa ────
  ...CHEST_STICKER_ITEMS,
]

/** Lo que el Mercader tiene a la venta (sin los stickers de cofre). */
export const SHOP_FOR_SALE: ShopItem[] = SHOP_CATALOG.filter((i) => !i.source)

/** Solo los ítems de batalla (los 14 del Mercader). */
export const BATTLE_ITEMS: ShopItem[] = SHOP_CATALOG.filter((i) => i.category === 'perk')

/** Descuento que da el Cupón — se aplica a todas las compras de la próxima visita. */
export const COUPON_DISCOUNT = 0.3

export function discountedPrice(price: number, discount: number): number {
  return discount > 0 ? Math.max(1, Math.round(price * (1 - discount))) : price
}

/** Selección "de hoy" — determinística por fecha, para que todos los alumnos
 *  vean la misma vidriera en la misma clase y vuelva a cambiar mañana. */
export function getDailyFeatured(catalog: ShopItem[] = SHOP_FOR_SALE, count = 3, date = new Date()): Set<string> {
  const seed = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate()
  const shuffled = [...catalog].sort((a, b) => {
    const ra = Math.sin(seed * 99991 + hashId(a.id))
    const rb = Math.sin(seed * 99991 + hashId(b.id))
    return ra - rb
  })
  return new Set(shuffled.slice(0, Math.min(count, shuffled.length)).map((i) => i.id))
}

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return h
}

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find((i) => i.id === id)
}

/** Tintes disponibles en la paleta de personalización de stickers — 2-3
 *  toques característicos, no un selector de color libre (así ningún alumno
 *  puede terminar con algo fuera del lenguaje pixelart del sitio). */
export const STICKER_COLORWAYS: { label: string; value: string }[] = [
  { label: 'Abismo', value: '190 85% 55%' },
  { label: 'Veneno', value: '150 70% 45%' },
  { label: 'Brasa', value: '14 90% 55%' },
]
