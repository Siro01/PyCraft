'use client'

import type { Database } from 'sql.js'
import { activeEntries, loadJournal } from '@/lib/game/reino-store'
import { cloneReino, openReino } from '@/lib/game/reino-engine'
import { TABLAS_REGLAS, sqlTablasReglas } from './reglas'

// ─── Puente Python ↔ Mi Reino ────────────────────────────────────────────────
// Python lee la base del alumno como `reino.db` (ver PUENTE_REINO en
// pyodide-runner). Acá se arma ese archivo: el reino tal como está + las
// tablas `reglas` y `economia` del juego, que el alumno puede consultar pero
// no cambiar.

/** Agrega (o repone) las tablas del juego sobre una base. */
export function inyectarReglas(db: Database): void {
  for (const t of TABLAS_REGLAS) db.run(`DROP TABLE IF EXISTS ${t};`)
  db.run(sqlTablasReglas())
}

/** El archivo reino.db a partir de un reino ya abierto (AreaTrabajo lo tiene vivo). */
export async function reinoDesdeDb(db: Database): Promise<Uint8Array> {
  const copia = await cloneReino(db)
  try {
    inyectarReglas(copia)
    return copia.export()
  } finally {
    copia.close()
  }
}

/** El archivo reino.db del alumno, leyendo su registro (cuenta o navegador).
 *  null si todavía no tiene nada en Mi Reino. */
export async function cargarReinoParaPython(): Promise<Uint8Array | null> {
  const { entries } = await loadJournal()
  const activas = activeEntries(entries)
  if (activas.length === 0) return null
  const db = await openReino(activas)
  try {
    inyectarReglas(db)
    return db.export()
  } finally {
    db.close()
  }
}
