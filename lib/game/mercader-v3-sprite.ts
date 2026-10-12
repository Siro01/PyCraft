// Mercader del Abismo — rediseño propio (ronda 5).
//
// El Farolero: diseño propio con la atmósfera tenebrosa del Mercader (capucha
// alta en punta, tres ojos-estrella que titilan, manos de hueso y el farol
// colgando del bastón por encima de la cabeza). Tres variantes a elegir.
// Las genera scripts/sprites/mercader.py como tiras de 8 cuadros de 64×64 en
// public/sprites/mercader-abismo/. Para regenerarlas: `python scripts/sprites/mercader.py`.

export type MercaderV3Id = 'clasico' | 'abisal' | 'ermitano'

export const MERCADER_V3_FRAMES = 8
export const MERCADER_V3_FRAME_MS = 170

/** La variante que se ve en el juego (batalla, tienda y libro de compras). */
export const ACTIVE_MERCADER_V3: MercaderV3Id = 'abisal'

/** Plano medio para la tienda: corta los jirones del ruedo para que se vea más grande. */
export const MERCADER_V3_CROP = { x: 10, y: 2, w: 50, h: 52 }

export const MERCADER_V3_VARIANTS: { id: MercaderV3Id; name: string; note: string }[] = [
  {
    id: 'clasico',
    name: 'Farolero',
    note: 'Manto gris verdoso deshilachado, bastón recto de madera y un farol-jaula que se mece en lo alto. Frascos en la soga de la cintura y un llavero en la mano de hueso.',
  },
  {
    id: 'abisal',
    name: 'Farolero Abisal',
    note: 'Manto azul petróleo con jirones largos que ondulan como algas. Un cayado de metal curvo del que cuelga un farol-boya que late, una cadena con llaves y burbujas que suben.',
  },
  {
    id: 'ermitano',
    name: 'Farolero Ermitaño',
    note: 'Manto ciruela ceniza con parches cosidos y una campanita en la punta de la capucha. Su bastón es una raíz nudosa y el farol es una jaula con tres luciérnagas cian.',
  },
]

export const mercaderV3Src = (id: MercaderV3Id, defeated = false) =>
  `/sprites/mercader-abismo/${id}${defeated ? '-defeated' : ''}.png`
