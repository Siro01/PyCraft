'use client'

// Sprites pixelart 16×16 de los 14 ítems del Mercader del Abismo.
//
// Cada sprite es una grilla de letras; cada letra es un ROL de color, no un
// color fijo — se resuelve contra los tokens del tema activo, así el mismo
// ítem se repinta solo en dark/light (1-bit, tinta sobre papel) y en red
// (con acento carmesí), igual que el resto del escritorio:
//   k tinta (--tx)   m medio (--tx2)   d sombra (--tx3)   f papel (--surface2)
//   a acento (--accent)   b acento suave (--accent2)   . transparente
//
// Las animaciones son leves y por ítem (clase item-anim-*, en globals.css);
// todas se apagan con prefers-reduced-motion.

import { memo, useId, useMemo } from 'react'
import { CHEST_SPRITES, CHEST_SPRITE_ANIM } from '@/components/game/stickers/chest-sprites'

const ROLE: Record<string, string> = {
  k: 'hsl(var(--tx))',
  m: 'hsl(var(--tx2))',
  d: 'hsl(var(--tx3))',
  f: 'hsl(var(--surface2))',
  a: 'hsl(var(--accent))',
  b: 'hsl(var(--accent2))',
  w: 'hsl(var(--bg))',
}

export const ITEM_SPRITES: Record<string, string[]> = {
  'pato-debug': [
    '................',
    '.......kkkk.....',
    '......kffffk....',
    '.....kfffkffk...',
    '.....kffffffkkk.',
    '.....kfffffkaaak',
    '......kffffkkkk.',
    '.kk....kffk.....',
    '.kfk..kffffkkk..',
    '.kffkkffffffffk.',
    '.kfffffmmmffffk.',
    '..kfffffmmmfffk.',
    '..kffffffffffk..',
    '...kffffffffk...',
    '....kkkkkkkk....',
    '................',
  ],
  'mandarina': [
    '................',
    '..........kkk...',
    '.........kbbbk..',
    '........kbbbk...',
    '.....kkkkkk.....',
    '...kkaaaaaakk...',
    '..kaafaaaaaaak..',
    '.kaaffaaaaaaaak.',
    '.kafaaaaaaaaaak.',
    '.kaaaaaaaaaaaak.',
    '.kaaaaaaaaaaadk.',
    '.kaaaaaaaaaaadk.',
    '..kaaaaaaaaadk..',
    '...kkaaaaadkk...',
    '.....kkkkkk.....',
    '................',
  ],
  'cupon': [
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kffffdfffffffk.',
    '.kfmmfffffffffk.',
    '.kffffdfaaffafk.',
    '..kfffffaafafk..',
    '..kfffdfffaffk..',
    '.kfmmffffafaafk.',
    '.kffffdfaffaafk.',
    '.kfmmmffffffffk.',
    '.kffffdfffffffk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
  ],
  'compu-hackeada': [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..kaaaaaaaaaak..',
    '..kaffffaaaaak..',
    '..kaaffaffaaak..',
    '..kaffffffaaak..',
    '..kaaffbaaaaak..',
    '..kaaaaaaaaaak..',
    '..kkkkkkkkkkkk..',
    '.kmmmmmmmmmmmmk.',
    'kmfmfmfmfmfmfmmk',
    'kmmmmmmffmmmmmmk',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
  ],
  'six-seven': [
    '................',
    '................',
    '................',
    '................',
    '..aaaa...aaaaaa.',
    '.aadddd...dddaad',
    '.aad........aadd',
    '.aaaaa.....aadd.',
    '.aaddaa....aad..',
    '.aad.aad..aadd..',
    '.aad.aad..aad...',
    '..aaaadd..aad...',
    '...dddd....dd...',
    '................',
    '................',
    '................',
  ],
  'daga': [
    '.......kk.......',
    '......kffk......',
    '......kfmk......',
    '......kfmk......',
    '......kfmk......',
    '......kfmk......',
    '......kfmk......',
    '......kfmk......',
    '...kkkkkkkkkk...',
    '...kaaaaaaaak...',
    '...kkkkkkkkkk...',
    '......kddk......',
    '......kmdk......',
    '......kddk......',
    '.....kaaaak.....',
    '......kkkk......',
  ],
  'brocoli': [
    '................',
    '.....kkk.kkk....',
    '...kkbbbkbbbkk..',
    '..kbbabbbbbabbk.',
    '.kbabbbbabbbbbk.',
    '.kbbbbbbbbbabbbk',
    '..kbabbbbabbbbk.',
    '...kkbbbbbbbkk..',
    '.....kkmmmkk....',
    '......kmmmk.....',
    '......kmfmk.....',
    '......kmmmk.....',
    '......kmfmk.....',
    '.....kmmmmmk....',
    '.....kkkkkkk....',
    '................',
  ],
  'pinguino': [
    '................',
    '......kkkk......',
    '.....kkkkkk.....',
    '.....kfkkfk.....',
    '.....kkbbkk.....',
    '....kkfbbfkk....',
    '....kffffffk....',
    '...kkffffffkk...',
    '...kkffffffkk...',
    '..kkkffffffkkk..',
    '...kkffffffkk...',
    '...kkffffffkk...',
    '....kkffffkk....',
    '...bbbkkkkbbb...',
    '................',
    '................',
  ],
  'pocion-dano': [
    '......kkkk......',
    '......kddk......',
    '......kkkk......',
    '......kffk......',
    '......kffk......',
    '.....kkffkk.....',
    '....kffffffk....',
    '...kffbfffffk...',
    '..kaaaaaaaaaak..',
    '..kaafaaaaaaak..',
    '..kaaaaaaafaak..',
    '..kafaaaaaaaak..',
    '..kaaaaaafaaak..',
    '...kaaaaaaaak...',
    '....kkkkkkkk....',
    '................',
  ],
  'trebol': [
    '................',
    '.......kk.......',
    '......kaak......',
    '.....kafaak.....',
    '.....kaaaak.....',
    '...kk.kaak.kk...',
    '..kaakaaaakaak..',
    '.kafaaakdaafaak.',
    '.kaaaaadkaaaaak.',
    '..kaakaaaakaak..',
    '...kk.kaak.kk...',
    '.....kafaakk....',
    '.....kaaaakbk...',
    '......kaak.kbk..',
    '.......kk...kbk.',
    '.............k..',
  ],
  'corona': [
    '................',
    '................',
    '................',
    '................',
    '..k....kk....k..',
    '.kak..kaak..kak.',
    '.kmk..kmmk..kmk.',
    '.kmmkkmmmmkkmmk.',
    '.kmmmmmmmmmmmmk.',
    '.kmdmmmmmmmmdmk.',
    '.kkkkkkkkkkkkkk.',
    '.kmamdmmamdmamk.',
    '.kmmmmdmmmmmdmk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
  ],
  'zonda': [
    '................',
    '...d........kk..',
    '...........k..k.',
    '.kkkaaaakkk.k.k.',
    '............kk..',
    '........d.......',
    '...............d',
    '................',
    'kkaaaaakkkkk....',
    '............k...',
    '......d....k.k..',
    '.d........k..k..',
    '...........kk...',
    '..kaak.kk.k....b',
    '..............b.',
    '................',
  ],
  'mazo-diamante': [
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    'kfffbbbbbbbbbbak',
    'kffbbbbbbbbbbaak',
    'kfbbbbbbbbbbaaak',
    'kbbbbbbbbbbaaaak',
    '.kkkkkkkkkkkkkk.',
    '......kddk......',
    '......kmdk......',
    '......kddk......',
    '......kmdk......',
    '......kddk......',
    '......kmdk......',
    '......kkkk......',
    '................',
  ],
  'esmeraldas': [
    '................',
    '................',
    '.............b..',
    '.......kkk..b.b.',
    '..b...kfaak..b..',
    '......kaaak.....',
    '......kaadk.....',
    '.......kdk......',
    '...kkk..k.kkk...',
    '..kfaak..kfaak..',
    '..kaaak..kaaak..',
    '..kaadk..kaadk..',
    '...kdk....kdk...',
    '....k......k....',
    '................',
    '................',
  ],
  // ── Stickers (decoración, Minecraft + PyCraft) ──
  'st-creeper': [
    'kkkkkkkkkkkkkkkk',
    'kabbaaaaaaaabbak',
    'kaaaaabbaaaaaaak',
    'kaaaaabbaaaaaaak',
    'kawwwwaaaawwwwak',
    'kawwwwaaaawwwwak',
    'kawwwwaaaawwwwak',
    'kawwwwaaaawwwwak',
    'kabbaawwwwaaaaak',
    'kabbaawwwwaaaaak',
    'kaaawwwwwwwwbbak',
    'kaaawwwwwwwwbbak',
    'kaaawwwwwwwwaaak',
    'kaaawwwwwwwwaaak',
    'kaaawwaaaawwaaak',
    'kkkkkkkkkkkkkkkk',
  ],
  'st-pico': [
    '................',
    '....kkkkkk......',
    '...kbffbbbkk....',
    '....kkkkkbbbk...',
    '.........kmbbk..',
    '........kmkkabk.',
    '.......kmk..kabk',
    '......kmk...kabk',
    '.....kmk....kbk.',
    '....kmk......k..',
    '...kmk..........',
    '..kmk...........',
    '.kmk............',
    '.kk.............',
    '................',
    '................',
  ],
  'st-pasto': [
    'kkkkkkkkkkkkkkkk',
    'kaabaaaabaaabaak',
    'kaaaaabaaaaaaabk',
    'kabaaaaaaabaaaak',
    'kmaamaamaaamaamk',
    'kmdmmamdmmmmadmk',
    'kmmmdmmmmdmmmmmk',
    'kdmmmmmdmmmdmmdk',
    'kmmdmmmmmmmmmdmk',
    'kmmmmmdmmdmmmmmk',
    'kmdmmmmmmmmdmmmk',
    'kmmmmdmmmmmmmdmk',
    'kmmdmmmmdmmmmmmk',
    'kdmmmmmmmmmdmmdk',
    'kmmmmdmmmmmmmmmk',
    'kkkkkkkkkkkkkkkk',
  ],
  'st-antorcha': [
    '................',
    '.......kk.......',
    '......kaak......',
    '.....kabak......',
    '....kabbbak.....',
    '....kabfbak.....',
    '....kabffak.....',
    '.....kaaak......',
    '......kmdk......',
    '......kmdk......',
    '......kmdk......',
    '......kmdk......',
    '......kmdk......',
    '......kmdk......',
    '......kkkk......',
    '................',
  ],
  'st-cofre': [
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kmmmmmmmmmmmmk.',
    '.kmddddddddddmk.',
    '.kmmmmmmmmmmmmk.',
    '.kkkkkkaakkkkkk.',
    '.kmmmmmaammmmmk.',
    '.kmmmmmkkmmmmmk.',
    '.kmddddddddddmk.',
    '.kmmmmmmmmmmmmk.',
    '.kmddddddddddmk.',
    '.kmmmmmmmmmmmmk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
  ],
  'st-rodolfo': [
    '................',
    '..kkk......kkk..',
    '..kbbk....kbbk..',
    '..kbbbkkkkbbbk..',
    '..kbbbbbbbbbbk..',
    '..kbkfbbbbkfbk..',
    '..kbkkbbbbkkbk..',
    '..kbbbbbbbbbbk..',
    '..kbbkkkkkkbbk..',
    '..kbbkaaaakbbk..',
    '..kbbkakkakbbk..',
    '..kbbkaaaakbbk..',
    '..kbbkkkkkkbbk..',
    '..kdbbbbbbbbdk..',
    '...kkkkkkkkkk...',
    '................',
  ],
  'st-corazon': [
    '................',
    '................',
    '...kkk....kkk...',
    '..kaaak..kaaak..',
    '.kafaaakkaaaaak.',
    '.kaffaaaaaaaadk.',
    '.kafaaaaaaaaadk.',
    '.kaaaaaaaaaaadk.',
    '..kaaaaaaaaadk..',
    '...kaaaaaaadk...',
    '....kaaaaadk....',
    '.....kaaadk.....',
    '......kadk......',
    '.......kk.......',
    '................',
    '................',
  ],
  'st-prompt': [
    '................',
    '................',
    'kkkkkkkkkkkkkkkk',
    'kffffffffffbkakk',
    'kkkkkkkkkkkkkkkk',
    'kwwwwwwwwwwwwwwk',
    'kwawwawwawwwwwwk',
    'kwwawwawwawwwwwk',
    'kwawwawwawwwwwwk',
    'kwwwwwwwwwwwwwwk',
    'kwmmmmwmmmwwwwwk',
    'kwwwwwwwwwwwwwwk',
    'kkkkkkkkkkkkkkkk',
    '................',
    '................',
    '................',
  ],
  'st-abismo': [
    '................',
    '.......kk.......',
    '......kmmk......',
    '.....kmmmmk.....',
    '....kmmwwwmk....',
    '....kmwwwawk....',
    '...kmwwawwwwk...',
    '...kmwawawwwmk..',
    '...kmwwawwwwmk..',
    '..kmmwwwwwawmk..',
    '..kmmwwwwawawmk.',
    '..kmmmwwwwawmmk.',
    '.kmmmmmwwwwmmmk.',
    '.kmmmmmmwwmmmmmk',
    '.kkkkkkkkkkkkkkk',
    '................',
  ],
  // ── Stickers de cofre (se encuentran explorando el mapa) ──
  ...CHEST_SPRITES,
}

/** Animación leve de cada ítem en el inventario — elegida por lo que ES el objeto. */
export const ITEM_ANIM: Record<string, string> = {
  'pato-debug': 'item-anim-bob',
  mandarina: 'item-anim-sway',
  cupon: 'item-anim-flutter',
  'compu-hackeada': 'item-anim-screen',
  'six-seven': 'item-anim-jiggle',
  daga: 'item-anim-glint',
  pinguino: 'item-anim-waddle',
  'pocion-dano': 'item-anim-bubble',
  trebol: 'item-anim-sway',
  corona: 'item-anim-glint',
  brocoli: 'item-anim-squash',
  zonda: 'item-anim-drift',
  'mazo-diamante': 'item-anim-glint',
  esmeraldas: 'item-anim-twinkle',
  'st-creeper': 'item-anim-squash',
  'st-pico': 'item-anim-glint',
  'st-pasto': 'item-anim-bob',
  'st-antorcha': 'item-anim-flicker',
  'st-cofre': 'item-anim-bob',
  'st-rodolfo': 'item-anim-waddle',
  'st-corazon': 'item-anim-pulse',
  'st-prompt': 'item-anim-screen',
  'st-abismo': 'item-anim-twinkle',
  ...CHEST_SPRITE_ANIM,
}

/** Une los píxeles iguales consecutivos de cada fila en un solo <rect> (menos nodos en el DOM). */
function runs(rows: string[]): { x: number; y: number; w: number; c: string }[] {
  const out: { x: number; y: number; w: number; c: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const c = row[x]
      let w = 1
      while (x + w < row.length && row[x + w] === c) w++
      if (c !== '.') out.push({ x, y, w, c })
      x += w
    }
  })
  return out
}

interface ItemSpriteProps {
  /** Clave del sprite (sin el prefijo "item:"). */
  sprite: string
  size?: number
  /** Animación leve en reposo — apagada por defecto, se prende en el inventario. */
  animated?: boolean
  className?: string
  title?: string
  /** Tinte de sticker elegido por el alumno (triada HSL, ej. "150 70% 45%"): reemplaza el acento. */
  tint?: string
}

/** "150 70% 45%" → acento y acento suave del mismo tono, para recolorear un sticker. */
function tintVars(tint?: string): React.CSSProperties | undefined {
  const m = tint?.match(/^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*$/)
  if (!m) return undefined
  const [, h, sat, l] = m
  return { ['--accent' as string]: `${h} ${sat}% ${l}%`, ['--accent2' as string]: `${h} ${sat}% ${Math.min(85, Number(l) + 20)}%` }
}

export const ItemSprite = memo(function ItemSprite({ sprite, size = 32, animated = false, className = '', title, tint }: ItemSpriteProps) {
  const rows = ITEM_SPRITES[sprite]
  const rects = useMemo(() => (rows ? runs(rows) : []), [rows])
  const maskId = `glint-${useId().replace(/:/g, '')}`
  if (!rows) return null
  const anim = animated ? ITEM_ANIM[sprite] ?? '' : ''
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={`${anim} ${className}`.trim()}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block', flexShrink: 0, overflow: 'visible', ...tintVars(tint) }}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={ROLE[r.c]} />
      ))}
      {anim === 'item-anim-glint' && (
        <>
          {/* Destello que cruza el objeto — enmascarado a su silueta, nunca pinta el fondo. */}
          <mask id={maskId}>
            {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill="white" />)}
          </mask>
          <g mask={`url(#${maskId})`}>
            <rect className="item-glint-bar" x={-4} y={-2} width={2} height={20} fill="hsl(var(--bg))" opacity={0.7} transform="skewX(-20)" />
          </g>
        </>
      )}
      {anim === 'item-anim-screen' && <rect className="item-screen-cursor" x={9} y={7} width={1} height={1} fill="hsl(var(--accent2))" />}
    </svg>
  )
})

/** Para los glyphs del catálogo: "item:daga" → "daga"; null si no es un ítem. */
export function itemSpriteKey(glyph: string): string | null {
  return glyph.startsWith('item:') ? glyph.slice(5) : null
}

/** Cualquier grilla con los mismos roles de color (lo usa, por ejemplo, la tienda del mapa). */
export function PixelGrid({ rows, size = 32, className, title }: { rows: string[]; size?: number; className?: string; title?: string }) {
  const rects = useMemo(() => runs(rows), [rows])
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${rows[0]?.length ?? 16} ${rows.length}`}
      shapeRendering="crispEdges"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={ROLE[r.c] ?? 'transparent'} />
      ))}
    </svg>
  )
}
