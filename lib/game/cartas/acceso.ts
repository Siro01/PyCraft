import type { SupabaseClient } from '@supabase/supabase-js'

// ─── ¿Puede entrar a AreaTrabajo? ────────────────────────────────────────────
// Hace falta las dos cosas: tener Mi Reino (vencer al Constructor del Vacío,
// porque las cartas viven ahí) y que el docente la haya habilitado para su
// aula (aulas.areatrabajo_habilitada, migración 020). El docente entra siempre.

export const AREA_UNLOCK_BOSS_ID = 'constructor-vacio'
export const AREA_UNLOCK_BOSS_NAME = 'Constructor del Vacío'

export type AccesoArea = 'open' | 'locked' | 'closed'

export const MENSAJE_ACCESO: Record<Exclude<AccesoArea, 'open'>, string> = {
  locked: `AreaTrabajo usa tu Mi Reino: se abre cuando vencés al ${AREA_UNLOCK_BOSS_NAME}.`,
  closed: 'Tu docente todavía no abrió AreaTrabajo para tu aula. ¡Ya falta poco!',
}

export async function accesoAreaTrabajo(
  supabase: SupabaseClient,
  user: { id: string; isAdmin: boolean; aulaId: string | null },
  reinoAbierto?: boolean,
): Promise<AccesoArea> {
  if (user.isAdmin) return 'open'
  let reino = reinoAbierto
  if (reino === undefined) {
    const { data } = await supabase
      .from('battle_records').select('boss_id').eq('user_id', user.id).eq('boss_id', AREA_UNLOCK_BOSS_ID).eq('is_completed', true).limit(1)
    reino = (data ?? []).length > 0
  }
  if (!reino) return 'locked'
  if (!user.aulaId) return 'closed'
  const { data: aula } = await supabase.from('aulas').select('*').eq('id', user.aulaId).maybeSingle()
  return (aula as { areatrabajo_habilitada?: boolean } | null)?.areatrabajo_habilitada === true ? 'open' : 'closed'
}
