import type { SupabaseClient } from '@supabase/supabase-js'
import { REPASO_BOSS_IDS } from '@/lib/game/repasos'

// Repasos que ve un alumno = los habilitados para toda su aula + los que el
// docente le habilitó a él puntualmente. El docente los ve todos (para poder
// revisarlos). Si la migración 011 no se corrió, las tablas no existen y
// simplemente no hay repasos — el mapa queda como estaba.
export async function getEnabledRepasoIds(supabase: SupabaseClient, userId: string, isAdmin: boolean): Promise<string[]> {
  if (isAdmin) return REPASO_BOSS_IDS

  const { data: profile } = await supabase.from('profiles').select('aula_id').eq('id', userId).single()

  const ids = new Set<string>()
  if (profile?.aula_id) {
    const { data } = await supabase
      .from('aula_repasos')
      .select('boss_id')
      .eq('aula_id', profile.aula_id)
      .eq('is_enabled', true)
    for (const r of (data ?? []) as { boss_id: string }[]) ids.add(r.boss_id)
  }
  const { data: own } = await supabase
    .from('alumno_repasos')
    .select('boss_id')
    .eq('user_id', userId)
    .eq('is_enabled', true)
  for (const r of (own ?? []) as { boss_id: string }[]) ids.add(r.boss_id)

  return REPASO_BOSS_IDS.filter((id) => ids.has(id))
}
