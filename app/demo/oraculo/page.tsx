'use client'

import Header from '@/components/layout/Header'
import SpriteVariantLab from '@/components/game/SpriteVariantLab'
import {
  ACTIVE_ORACULO, ORACULO_FRAMES, ORACULO_FRAME_MS, ORACULO_VARIANTS, oraculoSrc, type OraculoId,
} from '@/lib/game/oraculo-sprite'

export default function OraculoPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <SpriteVariantLab
        windowTitle="ORACULO_REDISENO.SYS"
        heading="Elegí al nuevo Oráculo Oscuro"
        intro="Tres propuestas a partir de tu referencia: una sombra de bloques que flota, con ojos de anillos rosa, turquesa y rojo, muchas manos y pedacitos de oscuridad que se le desprenden. Cada una se ve al tamaño de la batalla, al tamaño chico y derrotada."
        variants={ORACULO_VARIANTS}
        active={ACTIVE_ORACULO}
        src={(id, d) => oraculoSrc(id as OraculoId, d)}
        frames={ORACULO_FRAMES}
        frameMs={ORACULO_FRAME_MS}
        bg="hsl(var(--surface))"
      />
    </div>
  )
}
