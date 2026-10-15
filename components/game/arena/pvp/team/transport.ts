import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { DuelEvent, RoomView } from '@/lib/game/arena/types'

// Cómo habla una sala 2 vs 2 con "el otro lado": /api/arena/sala + el canal
// privado arena-room-<sala> (solo sus 4 integrantes y el docente). En
// /demo/arena es un simulador con bots (sandbox.ts). La sala vuelve a leerse
// cada pocos segundos por si se pierde un aviso.

export interface RoomTransport {
  solve(idx: number, output: string): Promise<{ correct: boolean; room: RoomView }>
  relay(): Promise<RoomView>
  refresh(): Promise<RoomView>
  leave(): Promise<RoomView>
  ready(ready: boolean): Promise<RoomView>
  callTeacher(): Promise<RoomView>
  send(ev: DuelEvent): void
  listen(cb: (ev: DuelEvent) => void): () => void
  close(): void
  /** Solo en la demo: la solución de un ejercicio, para el botón "acierto". */
  cheat?(ex: number): string
}

export async function callSala<T = { room: RoomView }>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/arena/sala', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Error de conexión')
  return json as T
}

export function createRoomTransport(supabase: SupabaseClient, roomId: string): RoomTransport {
  const listeners = new Set<(ev: DuelEvent) => void>()
  const channel: RealtimeChannel = supabase.channel(`arena-room-${roomId}`, { config: { private: true, broadcast: { self: false } } })
  channel.on('broadcast', { event: 'duel' }, ({ payload }) => listeners.forEach((cb) => cb(payload as DuelEvent))).subscribe()
  const room = async (action: string, extra: Record<string, unknown> = {}) => (await callSala({ action, roomId, ...extra })).room

  return {
    solve: (idx, output) => callSala<{ correct: boolean; room: RoomView }>({ action: 'solve', roomId, idx, output }),
    relay: () => room('relay'),
    refresh: () => room('tick'),
    leave: () => room('leave'),
    ready: (ready) => room('ready', { ready }),
    callTeacher: () => room('call'),
    send(ev) { void channel.send({ type: 'broadcast', event: 'duel', payload: ev }) },
    listen(cb) { listeners.add(cb); return () => { listeners.delete(cb) } },
    close() { listeners.clear(); void supabase.removeChannel(channel) },
  }
}
