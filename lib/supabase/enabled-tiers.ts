import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChallengeTier } from '@/types'
import { TIER_ORDER, resolveEnabledTiers } from '@/lib/game/tiers'

export async function getEnabledTiers(
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean,
): Promise<ChallengeTier[]> {
  if (isAdmin) return TIER_ORDER

  const { data: profile } = await supabase
    .from('profiles')
    .select('aula_id')
    .eq('id', userId)
    .single()

  if (!profile?.aula_id) return resolveEnabledTiers([])

  const { data } = await supabase
    .from('aula_tiers')
    .select('tier, is_enabled')
    .eq('aula_id', profile.aula_id)

  return resolveEnabledTiers(data ?? [])
}
