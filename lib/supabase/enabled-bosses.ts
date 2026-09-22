import type { SupabaseClient } from '@supabase/supabase-js'

// Alumno con aula → jefes habilitados en aula_bosses. Sin aula → habilitación global (bosses.is_enabled).
export async function getEnabledBossIds(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('aula_id')
    .eq('id', userId)
    .single()

  if (profile?.aula_id) {
    const { data } = await supabase
      .from('aula_bosses')
      .select('boss_id')
      .eq('aula_id', profile.aula_id)
      .eq('is_enabled', true)
    return new Set((data ?? []).map((r: { boss_id: string }) => r.boss_id))
  }

  const { data } = await supabase.from('bosses').select('id').eq('is_enabled', true)
  return new Set((data ?? []).map((r: { id: string }) => r.id))
}
