'use client'

import Header from '@/components/layout/Header'
import SpriteVariantLab from '@/components/game/SpriteVariantLab'
import { ACTIVE_GOLEM, GOLEM_FRAMES, GOLEM_FRAME_MS, GOLEM_VARIANTS, golemSrc, type GolemId } from '@/lib/game/golem-sprite'

export default function GolemPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <SpriteVariantLab
        windowTitle="GOLEM_REDISENO.SYS"
        heading="Elegí al nuevo Golem Infinito"
        intro="Tres cuerpos de cobre para la misma cabeza. Cuando pierde, el cobre se oxida y queda estatua verde. Cada uno se ve al tamaño de la batalla, al tamaño chico y derrotado."
        variants={GOLEM_VARIANTS}
        active={ACTIVE_GOLEM}
        src={(id, d) => golemSrc(id as GolemId, d)}
        frames={GOLEM_FRAMES}
        frameMs={GOLEM_FRAME_MS}
        bg="hsl(25 14% 5%)"
      />
    </div>
  )
}
