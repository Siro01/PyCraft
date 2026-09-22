import type { ChallengeTier } from '@/types'

export const TIER_ORDER: ChallengeTier[] = ['junior', 'trainee', 'senior']

export const TIER_META: Record<ChallengeTier, { label: string; desc: string; colorVar: string }> = {
  junior:  { label: 'JUNIOR',  desc: 'Ejercicios guiados, completá los huecos', colorVar: '--python' },
  trainee: { label: 'TRAINEE', desc: 'Escribís más código vos',                 colorVar: '--accent' },
  senior:  { label: 'SENIOR',  desc: 'Ejercicios sin guía',                     colorVar: '--danger' },
}

// Valor cuando el aula no tiene una fila explícita en aula_tiers.
export const DEFAULT_TIER_ENABLED: Record<ChallengeTier, boolean> = {
  junior: true,
  trainee: true,
  senior: false,
}

export const TIER_COOKIE = 'pysql_tier'

export function resolveEnabledTiers(rows: { tier: string; is_enabled: boolean }[]): ChallengeTier[] {
  const overrides = new Map(rows.map((r) => [r.tier, r.is_enabled]))
  return TIER_ORDER.filter((t) => overrides.get(t) ?? DEFAULT_TIER_ENABLED[t])
}

// La cookie es una preferencia del alumno; solo vale si la dificultad sigue habilitada.
export function pickTier(enabled: ChallengeTier[], preferred?: string): ChallengeTier | null {
  if (preferred && (enabled as string[]).includes(preferred)) return preferred as ChallengeTier
  return enabled[0] ?? null
}
