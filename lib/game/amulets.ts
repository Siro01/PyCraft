import type { AmuletType } from '@/types'

export interface AmuletMeta {
  name: string
  description: string
  color: string
}

export const AMULET_META: Record<AmuletType, AmuletMeta> = {
  'boss-hp-reduction': {
    name: 'Amuleto de Debilidad',
    description: 'El próximo jefe comienza con el 60% de vida.',
    color: 'hsl(var(--danger))',
  },
  'health-potion': {
    name: 'Poción de Vida',
    description: 'Restaura 50 puntos de vida durante la batalla.',
    color: 'hsl(var(--python))',
  },
  'escape': {
    name: 'Capa de Escape',
    description: 'Escapá de una batalla cuando tu vida sea crítica (≤ 30 HP).',
    color: 'hsl(var(--accent))',
  },
  'skip-boss': {
    name: 'Teletransportador',
    description: 'Saltate un jefe a tu elección. ¡Úsalo con sabiduría!',
    color: '#FFB800',
  },
}

// Amulets that require a player HP bar (TRAINEE/SENIOR only)
const HP_AMULETS = new Set<AmuletType>(['health-potion', 'escape'])

const AMULET_POOL: AmuletType[] = [
  'boss-hp-reduction',
  'health-potion',
  'escape',
  'skip-boss',
]

export function getRandomAmuletOffer(count = 2, tier?: string): AmuletType[] {
  const pool = tier === 'junior'
    ? AMULET_POOL.filter((t) => !HP_AMULETS.has(t))
    : AMULET_POOL
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
