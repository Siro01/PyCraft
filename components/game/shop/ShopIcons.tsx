'use client'

// Registro de glifos de la tienda — reusa los íconos pixelart que ya existen
// en PixelIcons.tsx (misma paleta de tokens, mismo trazo) en vez de dibujar
// sprites nuevos para cada ítem de la muestra. Un ítem nuevo del catálogo
// solo necesita mapear su `glyph` acá (o agregar un ícono nuevo a PixelIcons
// si hace falta uno que todavía no existe).

import {
  IconBolt, IconBulb, IconCrown, IconCrystal, IconDagger, IconPickaxe, IconSkull, IconSnake, IconSprout,
} from '@/components/ui/PixelIcons'
import { ItemSprite, itemSpriteKey } from '@/components/game/items/ItemSprites'

export const SHOP_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
  crystal: IconCrystal,
  skull: IconSkull,
  sprout: IconSprout,
  snake: IconSnake,
  crown: IconCrown,
  bulb: IconBulb,
  bolt: IconBolt,
  pickaxe: IconPickaxe,
  dagger: IconDagger,
}

/** Los 14 ítems de batalla ("item:*") tienen sprite propio a color de tema;
 *  `color` solo aplica a los íconos de una tinta (stickers y UI). */
export function ShopGlyph({ glyph, size, color, className, animated }: { glyph: string; size?: number; color?: string; className?: string; animated?: boolean }) {
  const sprite = itemSpriteKey(glyph)
  if (sprite) {
    // Un sticker recoloreado llega como "hsl(150 70% 45%)": se pasa la triada como tinte.
    const tint = color?.match(/^hsl\(([\d.]+ [\d.]+% [\d.]+%)\)$/)?.[1]
    return <ItemSprite sprite={sprite} size={size ? Math.round(size * 1.5) : 24} className={className} animated={animated} tint={tint} />
  }
  const Cmp = SHOP_ICONS[glyph] ?? IconCrystal
  return <Cmp size={size} color={color} className={className} />
}
