'use client'

import Header from '@/components/layout/Header'
import SpriteVariantLab from '@/components/game/SpriteVariantLab'
import { ACTIVE_CRAFTERO, CRAFTERO_FRAMES, CRAFTERO_FRAME_MS, CRAFTERO_VARIANTS, crafteroSrc, type CrafteroId } from '@/lib/game/craftero-sprite'

export default function CrafteroPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <SpriteVariantLab
        windowTitle="CRAFTERO_REDISENO.SYS"
        heading="Elegí al nuevo Maestro Craftero"
        intro="Tres cuerpos oscuros, con capucha y capa, para la misma cabeza. Lo único que brilla son sus ojos y lo que fabrica. Cada uno se ve al tamaño de la batalla, al tamaño chico y derrotado."
        variants={CRAFTERO_VARIANTS}
        active={ACTIVE_CRAFTERO}
        src={(id, d) => crafteroSrc(id as CrafteroId, d)}
        frames={CRAFTERO_FRAMES}
        frameMs={CRAFTERO_FRAME_MS}
        bg="hsl(240 10% 4%)"
      />
    </div>
  )
}
