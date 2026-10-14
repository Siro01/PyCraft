// Lo último que sabe el vigía del Pistolero (PistoleroWatcher, en el layout
// raíz), compartido con quien lo quiera mostrar — p. ej. el cartel SE BUSCA
// del mapa — sin hacer otro pedido al servidor.

export interface PistoleroSighting {
  /** El aula está armada: el Pistolero puede aparecer en cualquier momento. */
  armed: boolean
  /** Hay un duelo en curso (o esperando alumnos). */
  live: boolean
}

let last: PistoleroSighting | null = null
const listeners = new Set<(s: PistoleroSighting | null) => void>()

export function publishSighting(s: PistoleroSighting | null): void {
  last = s
  listeners.forEach((fn) => fn(s))
}

export function watchSighting(fn: (s: PistoleroSighting | null) => void): () => void {
  listeners.add(fn)
  fn(last)
  return () => { listeners.delete(fn) }
}
