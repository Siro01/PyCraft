'use client'

import Header from '@/components/layout/Header'
import SpriteVariantLab from '@/components/game/SpriteVariantLab'
import {
  ACTIVE_MERCADER_V3, MERCADER_V3_FRAMES, MERCADER_V3_FRAME_MS, MERCADER_V3_VARIANTS, mercaderV3Src, type MercaderV3Id,
} from '@/lib/game/mercader-v3-sprite'

export default function MercaderV3Page() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <SpriteVariantLab
        windowTitle="MERCADER_PROPIO.SYS"
        heading="Elegí al Farolero"
        intro="Tres variantes del Farolero: capucha alta en punta, tres ojos-estrella que titilan en el vacío, manos de hueso y el farol colgando del bastón por encima de la cabeza. Cambian el manto, el bastón, el farol y lo que lleva encima. Cada una se ve al tamaño de la batalla, chica y derrotada."
        variants={MERCADER_V3_VARIANTS}
        active={ACTIVE_MERCADER_V3}
        src={(id, d) => mercaderV3Src(id as MercaderV3Id, d)}
        frames={MERCADER_V3_FRAMES}
        frameMs={MERCADER_V3_FRAME_MS}
        bg="hsl(var(--surface))"
      />
    </div>
  )
}
