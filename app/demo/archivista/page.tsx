'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Win from '@/components/ui/Win'
import SpriteVariantLab from '@/components/game/SpriteVariantLab'
import XPBar from '@/components/game/XPBar'
import { sfx } from '@/lib/game/architect/sound'
import {
  ACTIVE_ARCHIVISTA, ARCHIVISTA_FRAMES, ARCHIVISTA_FRAME_MS, ARCHIVISTA_VARIANTS, archivistaSrc, type ArchivistaId,
} from '@/lib/game/archivista-sprite'

const MAX = 260

function XPBarPlayground() {
  const [hp, setHp] = useState(MAX)
  const btn: React.CSSProperties = {
    padding: '4px 12px', border: '2px solid hsl(var(--tx))', background: 'hsl(var(--surface))', color: 'hsl(var(--tx))',
    cursor: 'pointer', fontFamily: 'var(--font-jersey), monospace', fontSize: 16, letterSpacing: '0.03em',
  }
  return (
    <div className="max-w-6xl mx-auto px-4 pb-8">
      <Win title="BARRA_DE_EXPERIENCIA.SYS" bodyStyle={{ padding: 16 }}>
        <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, lineHeight: 1.2, color: 'hsl(var(--tx2))', marginBottom: 14 }}>
          Así se ve la vida del Archivista en la batalla. Pegale para ver los orbes y escuchar el sonido de experiencia, o hacé clic sobre la barra.
        </p>
        <div style={{ maxWidth: 520 }}>
          <XPBar current={hp} max={MAX} label="HP JEFE" />
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          <button type="button" style={btn} onClick={() => setHp((h) => Math.max(0, h - 20))}>Golpe −20</button>
          <button type="button" style={btn} onClick={() => setHp((h) => Math.max(0, h - 65))}>Golpe fuerte −65</button>
          <button type="button" style={btn} onClick={() => { sfx.potion(); setHp(MAX) }}>Llenar</button>
        </div>
      </Win>
    </div>
  )
}

export default function ArchivistaPage() {
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <SpriteVariantLab
        windowTitle="ARCHIVISTA_REDISENO.SYS"
        heading="Elegí al nuevo Archivista"
        intro="Tres cuerpos para la misma melena, siempre con libros en las manos y el encantamiento de Minecraft: runas que vuelan hacia el libro y el brillo violeta de lo encantado. Cada uno se ve al tamaño de la batalla, al tamaño chico y derrotado."
        variants={ARCHIVISTA_VARIANTS}
        active={ACTIVE_ARCHIVISTA}
        src={(id, d) => archivistaSrc(id as ArchivistaId, d)}
        frames={ARCHIVISTA_FRAMES}
        frameMs={ARCHIVISTA_FRAME_MS}
        bg="hsl(265 30% 5%)"
      />
      <XPBarPlayground />
    </div>
  )
}
