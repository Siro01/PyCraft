import type { DuelEvent, MatchView } from '@/lib/game/arena/types'

/**
 * Cómo habla la pantalla del duelo con "el otro lado". En un duelo real es
 * /api/arena + un canal de Supabase Realtime (live.ts); en /demo/arena es un
 * rival simulado (sandbox.ts). ArenaDuel no sabe cuál de los dos tiene.
 */
export interface DuelTransport {
  /** Manda la salida del código; el servidor decide si está bien. */
  submit(idx: number, output: string): Promise<{ correct: boolean; match: MatchView }>
  /** Vuelve a leer el duelo (y lo cierra si se terminó el tiempo). */
  refresh(): Promise<MatchView>
  /** Rendirse. */
  leave(): Promise<MatchView>
  /** Avisarle algo al navegador del rival (avance, "escribiendo", ítems). */
  send(ev: DuelEvent): void
  listen(cb: (ev: DuelEvent) => void): () => void
  close(): void
  /** Solo en la demo: la solución, para el botón "acierto" del docente. */
  cheat?(idx: number): string
}
