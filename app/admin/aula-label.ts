export interface AdminAula {
  id: string
  nombre: string
  turno: string
  created_at: string
  /** "08:00:00" (Postgres TIME) — null si el docente no cargó horario. */
  hora_inicio?: string | null
  hora_fin?: string | null
}

const TURNO: Record<string, string> = { 'mañana': 'Mañana', 'tarde': 'Tarde', 'otro': 'Otro' }

export const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '')

export function aulaHorario(a: AdminAula): string {
  const i = hhmm(a.hora_inicio)
  const f = hhmm(a.hora_fin)
  return i && f ? `${i}–${f}` : i ? `desde ${i}` : ''
}

/** "PyCraft · Mañana · 08:00–11:00" */
export function aulaLabel(a: AdminAula): string {
  return [a.nombre, TURNO[a.turno] ?? a.turno, aulaHorario(a)].filter(Boolean).join(' · ')
}
