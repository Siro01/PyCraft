'use client'

import { getBossById } from '@/lib/game/bosses'
import {
  activeEntries, appendJournal, defeatedBossIds, loadJournal, missingTrophies,
  type JournalEntry, type SyncState,
} from '@/lib/game/reino-store'
import type { Boss } from '@/types'

// Arranque del reino que comparten Mi Reino y AreaTrabajo: el registro de la
// cuenta + los trofeos que falten. Una sola carga a la vez: si la pantalla se
// monta dos veces seguidas (o hay dos pestañas), no se duplican los trofeos.

export const stampEntry = (e: Omit<JournalEntry, 'created_at'>): JournalEntry => ({ ...e, created_at: new Date().toISOString() })

export async function defeatedBosses(): Promise<Boss[]> {
  return (await defeatedBossIds()).map((id) => getBossById(id)).filter((b): b is Boss => !!b)
}

let booting: Promise<{ entries: JournalEntry[]; sync: SyncState }> | null = null

export function bootJournal() {
  booting ??= (async () => {
    const loaded = await loadJournal()
    const missing = missingTrophies(activeEntries(loaded.entries), await defeatedBosses())
    if (!missing.length) return loaded
    return { entries: [...loaded.entries, ...missing.map(stampEntry)], sync: await appendJournal(missing) }
  })().finally(() => { setTimeout(() => { booting = null }, 0) })
  return booting
}
