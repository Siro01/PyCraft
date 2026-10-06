'use client'

import Header from '@/components/layout/Header'
import SpriteVariantLab from '@/components/game/SpriteVariantLab'
import {
  ACTIVE_GUARDIAN, GUARDIAN_FRAMES, GUARDIAN_FRAME_MS, GUARDIAN_VARIANTS, guardianSrc, type GuardianId,
} from '@/lib/game/guardian-sprite'

export default function GuardianPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <SpriteVariantLab
        windowTitle="GUARDIAN_REDISENO.SYS"
        heading="Elegí al nuevo Guardián de la Puerta"
        intro="Tres cuerpos para la misma cabeza, con su paleta: piedra verde-gris, esquineros naranja y el ojo menta. Cada uno se ve al tamaño de la batalla, al tamaño chico y derrotado."
        variants={GUARDIAN_VARIANTS}
        active={ACTIVE_GUARDIAN}
        src={(id, d) => guardianSrc(id as GuardianId, d)}
        frames={GUARDIAN_FRAMES}
        frameMs={GUARDIAN_FRAME_MS}
        bg="hsl(160 12% 5%)"
      />
    </div>
  )
}
