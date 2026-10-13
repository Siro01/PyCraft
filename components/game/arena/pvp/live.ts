import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { DuelEvent, MatchView } from '@/lib/game/arena/types'
import type { DuelTransport } from './transport'

// Duelo real: las jugadas van a /api/arena (que decide) y los avisos entre los
// dos navegadores (avance, "escribiendo", ítems) viajan por un canal de
// Supabase Realtime (Broadcast). Realtime es solo un aviso: si se pierde un
// mensaje, ArenaDuel igual vuelve a leer el duelo cada pocos segundos.
// Los canales son privados (013_arena.sql → arena_can_join): solo entran los
// dos jugadores del duelo, aunque alguien conozca el id.

export async function callArena<T = { match: MatchView }>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/arena', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Error de conexión')
  return json as T
}

export function createLiveTransport(supabase: SupabaseClient, matchId: string): DuelTransport {
  const listeners = new Set<(ev: DuelEvent) => void>()
  const channel: RealtimeChannel = supabase.channel(`arena-duel-${matchId}`, { config: { private: true, broadcast: { self: false } } })
  channel.on('broadcast', { event: 'duel' }, ({ payload }) => listeners.forEach((cb) => cb(payload as DuelEvent))).subscribe()

  return {
    async submit(idx, output) {
      return callArena<{ correct: boolean; match: MatchView }>({ action: 'submit', matchId, idx, output })
    },
    async refresh() { return (await callArena({ action: 'tick', matchId })).match },
    async leave() { return (await callArena({ action: 'forfeit', matchId })).match },
    send(ev) { void channel.send({ type: 'broadcast', event: 'duel', payload: ev }) },
    listen(cb) { listeners.add(cb); return () => { listeners.delete(cb) } },
    close() { listeners.clear(); void supabase.removeChannel(channel) },
  }
}
