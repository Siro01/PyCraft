'use client'

import { useSysConfirm } from '@/components/ui/SysDialog'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Database } from 'sql.js'
import Win from '@/components/ui/Win'
import { LoadingBar } from '@/components/ui/LoadingBar'
import { IconGrid } from '@/components/ui/PixelIcons'
import SqlTable from '@/components/game/sql/SqlTable'
import SqlResult from '@/components/game/sql/SqlResult'
import QueryBlocks from '@/components/game/sql/QueryBlocks'
import { sfx } from '@/lib/game/architect/sound'
import { getBossById } from '@/lib/game/bosses'
import type { TableSnapshot } from '@/lib/game/executor/sql-runner'
import {
  loadJournal, appendJournal, activeEntries, missingTrophies, defeatedBossIds, trophyStatement,
  MAX_ACTIVE, MAX_STATEMENT, type JournalEntry, type SyncState,
} from '@/lib/game/reino-store'
import { openReino, cloneReino, reinoTables, runInReino, exportReino, type ReinoRun } from '@/lib/game/reino-engine'
import type { Boss } from '@/types'

const CodeMirrorEditor = dynamic(() => import('@/components/game/CodeMirrorEditor'), {
  ssr: false,
  loading: () => <div style={{ minHeight: 160, background: 'hsl(var(--bg))' }} />,
})

// ─── Mi Reino ────────────────────────────────────────────────────────────────
// La base de datos propia del alumno. Arriba, sus tablas (siempre a la vista);
// abajo, dónde escribe. Lo que cambia la base se guarda en su cuenta como una
// lista de sentencias (ver reino-store). Un paso a la vez: ver → escribir → ejecutar.

const vt = 'var(--font-vt323), monospace'
const jersey = 'var(--font-jersey), monospace'

const SYNC_LABEL: Record<SyncState, string> = {
  synced: 'guardado en tu cuenta',
  pending: 'guardado en esta compu · se sube cuando haya conexión',
  local: 'guardado en este navegador',
}

const stamp = (e: Omit<JournalEntry, 'created_at'>): JournalEntry => ({ ...e, created_at: new Date().toISOString() })

async function defeatedBosses(): Promise<Boss[]> {
  return (await defeatedBossIds()).map((id) => getBossById(id)).filter((b): b is Boss => !!b)
}

/** Registro + trofeos que falten. Una sola carga a la vez: si la pantalla se monta
 *  dos veces seguidas (o hay dos pestañas), no se duplican los trofeos. */
let booting: Promise<{ entries: JournalEntry[]; sync: SyncState }> | null = null
function bootJournal() {
  booting ??= (async () => {
    const loaded = await loadJournal()
    const missing = missingTrophies(activeEntries(loaded.entries), await defeatedBosses())
    if (!missing.length) return loaded
    return { entries: [...loaded.entries, ...missing.map(stamp)], sync: await appendJournal(missing) }
  })().finally(() => { setTimeout(() => { booting = null }, 0) })
  return booting
}

export default function ReinoApp() {
  const dbRef = useRef<Database | null>(null)
  const [entries, setEntries] = useState<JournalEntry[] | null>(null)
  const [tables, setTables] = useState<TableSnapshot[]>([])
  const [sync, setSync] = useState<SyncState>('local')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ run: ReinoRun; code: string; notice?: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [blocksOpen, setBlocksOpen] = useState(false)
  const [ask, confirmNode] = useSysConfirm()

  // Armar el reino: registro → (trofeos que falten) → sql.js.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { entries: all, sync: state } = await bootJournal()
      const db = await openReino(activeEntries(all))
      if (!alive) { db.close(); return }
      dbRef.current = db
      setEntries(all)
      setTables(reinoTables(db))
      setSync(state)
    })()
    return () => { alive = false; dbRef.current?.close(); dbRef.current = null }
  }, [])

  const run = useCallback(async () => {
    const db = dbRef.current
    if (!db || busy || !code.trim() || !entries) return
    setBusy(true)
    sfx.attack()
    try {
      const r = runInReino(db, code)
      const active = activeEntries(entries).length
      const tooLong = r.applied.some((s) => s.length > MAX_STATEMENT)
      if (tooLong || active + r.applied.length > MAX_ACTIVE) {
        // No entra: deshacemos volviendo a armar el reino desde lo guardado.
        db.close()
        const fresh = await openReino(activeEntries(entries))
        dbRef.current = fresh
        setTables(reinoTables(fresh))
        setResult({
          run: { ...r, changes: [], applied: [], error: 'limite' },
          code,
          notice: tooLong
            ? 'Esa orden es demasiado larga para guardarla. Partila en varias más cortas.'
            : `Tu reino llegó al máximo de ${MAX_ACTIVE} órdenes guardadas. Pedile ayuda a tu profe o reinicialo.`,
        })
        return
      }
      if (r.applied.length) {
        const added = r.applied.map((statement) => ({ statement, source: 'libre' as const }))
        setEntries((cur) => [...(cur ?? []), ...added.map(stamp)])
        setTables(reinoTables(db))
        setSync(await appendJournal(added))
      }
      setResult({ run: r, code })
      if (r.error) sfx.miss()
    } finally {
      setBusy(false)
    }
  }, [busy, code, entries])

  const reset = useCallback(async () => {
    if (!entries) return
    // El reinicio es una marca: lo anterior queda guardado (lo ve el docente).
    // Los trofeos se ganaron peleando: vuelven solos.
    const trophies = (await defeatedBosses()).sort((a, b) => a.classNumber - b.classNumber)
      .map((b) => ({ statement: trophyStatement(b), source: 'botin' as const }))
    const added = [{ statement: '-- reinicio', source: 'reinicio' as const }, ...trophies]
    const all = [...entries, ...added.map(stamp)]
    dbRef.current?.close()
    const db = await openReino(activeEntries(all))
    dbRef.current = db
    setEntries(all)
    setTables(reinoTables(db))
    setResult(null)
    setBlocksOpen(false)
    setSync(await appendJournal(added))
  }, [entries])

  const download = () => {
    const db = dbRef.current
    if (!db) return
    const blob = new Blob([exportReino(db) as BlobPart], { type: 'application/vnd.sqlite3' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mi_reino.db'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  if (!entries) {
    return (
      <Win title="MI_REINO.DB" bodyStyle={{ padding: 24 }}>
        <LoadingBar label="Abriendo tu reino..." size="sm" estimatedMs={2500} />
      </Win>
    )
  }

  const onlyTrophies = tables.length > 0 && tables.every((t) => t.name === 'trofeos')
  const r = result?.run

  return (
    <div className="flex flex-col gap-4">
      {/* Tus tablas: lo primero que se ve */}
      <Win
        title="MI_REINO.DB"
        active
        right={<span className="hidden sm:inline" style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, letterSpacing: '0.1em', color: 'hsl(var(--bg))' }}>{SYNC_LABEL[sync]}</span>}
        bodyStyle={{ padding: 16 }}
      >
        <h1 style={{ fontFamily: jersey, fontSize: 28, lineHeight: 1, margin: 0, color: 'hsl(var(--tx))' }}>Tu reino</h1>
        <p className="mt-1.5" style={{ fontFamily: vt, fontSize: 21, lineHeight: 1.2, color: 'hsl(var(--tx2))', maxWidth: '62ch' }}>
          Una base de datos que es tuya. Lo que guardes acá te sigue a cualquier compu.
        </p>

        {tables.length === 0 ? (
          <div className="reino-hint mt-4">
            <p>Tu reino está vacío. Primer paso: creá una tabla. Por ejemplo:</p>
            <pre>CREATE TABLE heroes (id INTEGER PRIMARY KEY, nombre TEXT, nivel INTEGER);</pre>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-5 items-start">
            {tables.map((t) => (
              <SqlTable key={t.name} label={t.name} isTable columns={t.columns} rows={t.rows} maxHeight={232} />
            ))}
          </div>
        )}
        {onlyTrophies && (
          <div className="reino-hint mt-4">
            <p>Cada jefe que vencés deja un trofeo acá. Miralos con:</p>
            <pre>SELECT * FROM trofeos;</pre>
            <p>Y después creá tu propia tabla.</p>
          </div>
        )}
        <p className="sm:hidden mt-3 label-mono" style={{ color: 'hsl(var(--tx3))' }}>{SYNC_LABEL[sync]}</p>
      </Win>

      {blocksOpen && (
        <QueryBlocks
          free
          // Sus tablas primero: los trofeos quedan al final de la lista.
          tables={[...tables].sort((a, b) => Number(a.name === 'trofeos') - Number(b.name === 'trofeos'))}
          onTry={async (sql) => {
            const copy = await cloneReino(dbRef.current!)
            const t = runInReino(copy, sql)
            copy.close()
            return { sql: { columns: t.columns, rows: t.rows, changes: t.changes, schema: t.schema, fromVerify: false }, error: t.error }
          }}
          onClose={() => setBlocksOpen(false)}
        />
      )}

      {/* Dónde escribe */}
      <Win
        title="ORDEN.SQL"
        active
        right={
          <>
            {!blocksOpen && (
              <button type="button" className="blk-open" onClick={() => setBlocksOpen(true)}>
                <IconGrid size={12} color="currentColor" /> Armar con bloques
              </button>
            )}
            <span className="hidden sm:inline" style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, letterSpacing: '0.1em', color: 'hsl(var(--bg))' }}>Ctrl+Enter para ejecutar</span>
          </>
        }
      >
        <CodeMirrorEditor value={code} onChange={setCode} language="sql" onCtrlEnter={run} accentColor="#38BDF8" />
      </Win>

      <div>
        <button
          type="button"
          className="cta-btn cta-btn--primary"
          onClick={run}
          disabled={busy || !code.trim()}
          title={code.trim() ? 'Ejecutar (Ctrl+Enter)' : 'Escribí una orden SQL para ejecutar'}
        >
          ▶ Ejecutar
        </button>
      </div>

      {r && result && (
        <Win
          title={r.error ? 'ERROR.EXE' : 'RESULTADO.TXT'}
          tone={r.error ? 'danger' : 'safe'}
          active
          className="win-pop"
          bodyStyle={{ padding: 14 }}
        >
          <div className="mb-2.5" style={{ fontFamily: jersey, fontSize: 19, color: r.error ? 'hsl(var(--danger))' : 'hsl(var(--accent))' }}>
            {result.notice
              ? 'No se guardó'
              : r.error
                ? r.applied.length ? 'Una orden falló — las de antes sí se guardaron' : 'SQL no pudo ejecutar tu orden'
                : r.applied.length ? 'Guardado en tu reino' : 'Esto encontró tu consulta'}
          </div>
          {result.notice ? (
            <p style={{ fontFamily: vt, fontSize: 22, lineHeight: 1.15, color: 'hsl(var(--tx))', margin: 0 }}>{result.notice}</p>
          ) : (
            <SqlResult
              isCorrect={!r.error}
              error={r.error}
              expected=""
              code={result.code}
              sql={{ columns: r.columns, rows: r.rows, changes: r.changes, schema: r.schema, fromVerify: false }}
            />
          )}
        </Win>
      )}

      {/* Lo de menos uso, abajo y en voz baja */}
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <button type="button" className="sys-tool" onClick={download} disabled={tables.length === 0}>
          Descargar mi reino (.db)
        </button>
        <button
          type="button"
          className="sys-danger-btn"
          onClick={async () => {
            if (await ask({ title: 'REINICIAR_REINO.EXE', body: <>Tus tablas se borran y los trofeos vuelven solos. Lo que escribiste antes queda guardado para tu docente.</>, ok: 'Reiniciar', danger: true })) reset()
          }}
        >
          Reiniciar mi reino
        </button>
      </div>
      {confirmNode}
    </div>
  )
}
