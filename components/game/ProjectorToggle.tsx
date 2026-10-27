'use client'

import type { CSSProperties } from 'react'
import { IconBulb } from '@/components/ui/PixelIcons'
import { sfx } from '@/lib/game/architect/sound'

// Paleta clara de alto contraste para el proyector: fondo blanco, tinta casi
// negra y colores de sintaxis oscuros, que no se lavan con la luz del aula.
// Va como variables en el `style` de ProgramShell, así le gana al tema del
// alumno y a la paleta de temporada (Halloween) solo dentro del programa.
export const PROJECTOR_PALETTE = {
  '--bg': '0 0% 100%',
  '--surface': '0 0% 98%',
  '--surface2': '0 0% 94%',
  '--border': '0 0% 82%',
  '--border2': '0 0% 62%',
  '--tx': '0 0% 6%',
  '--tx2': '0 0% 24%',
  '--tx3': '0 0% 36%',
  '--accent': '348 83% 38%',
  '--on-accent': '#fff',
  '--accent2': '24 95% 34%',
  '--python': '140 70% 24%',
  '--sql': '266 60% 42%',
  '--danger': '354 85% 40%',
} as CSSProperties

interface Props {
  on: boolean
  onChange: (next: boolean) => void
}

/** Botón del docente en la barra del programa: prende o apaga el modo proyector. */
export default function ProjectorToggle({ on, onChange }: Props) {
  return (
    <button
      type="button"
      data-sfx="none"
      onClick={() => { sfx.toggle(!on); onChange(!on) }}
      aria-pressed={on}
      aria-label="Modo proyector (claro)"
      title={on ? 'Modo proyector: prendido' : 'Modo proyector (claro)'}
      style={{
        width: 26, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid hsl(var(--tx))', cursor: 'pointer',
        background: on ? 'hsl(var(--tx))' : 'transparent',
      }}
    >
      <IconBulb size={12} color={on ? 'hsl(var(--bg))' : 'hsl(var(--tx2))'} />
    </button>
  )
}
