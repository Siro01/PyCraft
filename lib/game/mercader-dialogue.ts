// Diálogos del Mercader del Abismo — 3 tipos, como pidió el profesor:
// primera vez (presentación), visitas siguientes (re-bienvenida, rota entre
// varias) y un aviso especial cuando la batalla contra él (jefe #4, Acto I)
// ya está a un paso.

export const MERCADER_PRESENTACION = [
  'Mmm... otro par de ojos nuevos en mi tienda.',
  'Yo colecciono lo que otros dejan atrás en el Abismo — y lo vendo a buen precio.',
  'Cada objeto tiene un nivel mínimo y un precio en diamantes. Ganá diamantes derrotando jefes.',
  'Mirá con calma. No muerdo. Probablemente.',
]

export const MERCADER_REBIENVENIDA = [
  'Volviste. Sabía que lo harías — siempre vuelven.',
  'La vidriera cambió desde tu última visita. Fijate qué hay de nuevo hoy.',
  '¿Buscando algo en especial, o solo mirando?',
  'Mis estantes nunca están quietos. Ni yo tampoco, para el caso.',
]

export const MERCADER_BATALLA_CERCANA = [
  'Se acerca el momento en que dejemos de ser... cordiales.',
  'Disfrutá mi tienda mientras dure — pronto vas a tener que enfrentarme.',
  'No hace falta que finjamos. Los dos sabemos lo que viene.',
]

export type MercaderDialogueKind = 'presentacion' | 'rebienvenida' | 'batalla-cercana'

export function pickDialogue(kind: MercaderDialogueKind): string[] {
  if (kind === 'presentacion') return MERCADER_PRESENTACION
  if (kind === 'batalla-cercana') return MERCADER_BATALLA_CERCANA
  // Re-bienvenida: una sola línea al azar por visita, no las 4 — sería repetitivo de más.
  const line = MERCADER_REBIENVENIDA[Math.floor(Math.random() * MERCADER_REBIENVENIDA.length)]
  return [line]
}
