// Avisos en tiempo real del Pistolero (Supabase Realtime · Broadcast).
//
// La base es la fuente de verdad: los avisos solo dicen «algo cambió» o
// disparan un efecto en pantalla. Si se pierde uno, la pantalla igual vuelve a
// leer el estado cada pocos segundos. Los canales son privados
// (014_raids.sql → raid_can_join): solo entra gente de esa aula.
//
// · raid-aula-<aula>: el aviso sorpresa («¡Desenfundar!»).
// · raid-<raid>:      la pelea.

import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { AttackId } from './pistolero'

export type RaidEvent =
  | { type: 'summon'; raidId: string }
  | { type: 'state' }                                            // «volvé a leer»
  | { type: 'attack'; attackId: AttackId; targetId: string | null; line: string }
  | { type: 'line'; text: string }                               // frase en vivo del docente
  | { type: 'judged'; userId: string; ok: boolean }
  | { type: 'joined'; userId: string }
  | { type: 'submitted'; userId: string }
  | { type: 'typing'; userId: string }
  | { type: 'item'; userId: string; username: string; itemId: string }
  | { type: 'end'; result: 'won' | 'lost' | 'cancelled' }
  // Raids de secretos
  | { type: 'phrase'; userId: string; username: string; text: string }
  | { type: 'hit'; userId: string; ok: boolean; rescued?: boolean }

export const aulaTopic = (aulaId: string) => `raid-aula-${aulaId}`
export const raidTopic = (raidId: string) => `raid-${raidId}`

export interface RaidChannel {
  send: (ev: RaidEvent) => void
  close: () => void
}

/** Se suscribe a un canal de la raid y llama a `onEvent` con cada aviso. */
export function openRaidChannel(supabase: SupabaseClient, topic: string, onEvent: (ev: RaidEvent) => void): RaidChannel {
  const ch: RealtimeChannel = supabase.channel(topic, { config: { private: true, broadcast: { self: false } } })
  ch.on('broadcast', { event: 'raid' }, ({ payload }) => onEvent(payload as RaidEvent)).subscribe()
  return {
    send: (ev) => { void ch.send({ type: 'broadcast', event: 'raid', payload: ev }) },
    close: () => { void supabase.removeChannel(ch) },
  }
}

export async function callRaid<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/raid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Error de conexión')
  return json as T
}

export async function getRaid<T>(query = ''): Promise<T> {
  const res = await fetch(`/api/raid${query}`, { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Error de conexión')
  return json as T
}
