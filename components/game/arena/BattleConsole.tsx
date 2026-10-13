'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { isPyodideLoaded, type SqlDetail } from '@/lib/game/executor'
import { getSeedTables, runSQL, type TableSnapshot } from '@/lib/game/executor/sql-runner'
import SqlTable from '@/components/game/sql/SqlTable'
import SqlResult from '@/components/game/sql/SqlResult'
import QueryBlocks from '@/components/game/sql/QueryBlocks'
import { sfx } from '@/lib/game/architect/sound'
import type { Boss, Challenge } from '@/types'

// Consigna + consola de una batalla, con la misma distribución que la arena de
// los jefes secretos (sin ventanas: título, consigna, editor, ejecutar, salida).
// A diferencia de los secretos, acá sí hay ayuda: tablas del desafío, pizarra
// de bloques, la salida esperada y los errores de SQL explicados.

const CodeMirrorEditor = dynamic(() => import('@/components/game/CodeMirrorEditor'), {
  ssr: false,
  loading: () => <div style={{ minHeight: 200, padding: 14, color: 'hsl(var(--tx3))', fontSize: 20 }}>Cargando editor…</div>,
})

export interface BattleResult {
  isCorrect: boolean
  output: string
  expected: string
  error: string | null
  sql?: SqlDetail
}

interface Props {
  boss: Boss
  challenge: Challenge
  onSubmit: (code: string) => void
  isLoading?: boolean
  lastResult?: BattleResult | null
  /** Pingüino Linux equipado. */
  penguin?: boolean
  /** Reemplazo de código desde afuera (Compu Hackeada) — cambia el nonce para aplicarlo. */
  codeReplace?: { code: string; nonce: number } | null
  onCodeChange?: (code: string) => void
  /** Aviso encima del editor (ítems activos en este ataque: Zonda…). */
  banner?: React.ReactNode
  /** Daño que hizo el último acierto (se muestra junto al ✓). */
  lastDamage?: number | null
  /** Arena PvP: la consigna está tapada (el rival tiró el Zonda). */
  taskHidden?: boolean
  /** Texto del botón de ejecutar (por defecto "atacar"). */
  goLabel?: string
  /** Texto cuando la salida no es la pedida (por defecto habla del jefe). */
  wrongLabel?: string
}

export default function BattleConsole({
  boss, challenge, onSubmit, isLoading = false, lastResult, penguin = false, codeReplace, onCodeChange, banner, lastDamage,
  taskHidden = false, goLabel = 'atacar', wrongLabel = '✗ Todavía no es lo que pide el jefe',
}: Props) {
  const [code, setCode] = useState(challenge.initialCode)
  useEffect(() => { onCodeChange?.(code) }, [code, onCodeChange])
  useEffect(() => { if (codeReplace) setCode(codeReplace.code) }, [codeReplace])

  const [engineReady, setEngineReady] = useState(challenge.type === 'sql' ? true : isPyodideLoaded())
  useEffect(() => {
    if (challenge.type !== 'python' || engineReady) return
    const id = setInterval(() => { if (isPyodideLoaded()) { setEngineReady(true); clearInterval(id) } }, 300)
    return () => clearInterval(id)
  }, [challenge.type, engineReady])

  useEffect(() => {
    setCode(challenge.initialCode)
    setEngineReady(challenge.type === 'sql' ? true : isPyodideLoaded())
  }, [challenge.id, challenge.initialCode, challenge.type])

  const [seed, setSeed] = useState<{ id: string; tables: TableSnapshot[] } | null>(null)
  useEffect(() => {
    let alive = true
    if (challenge.type === 'sql') getSeedTables(challenge.seedSQL).then((tables) => { if (alive) setSeed({ id: challenge.id, tables }) })
    return () => { alive = false }
  }, [challenge.id, challenge.type, challenge.seedSQL])
  const seedReady = seed?.id === challenge.id
  const seedTables = seedReady ? seed.tables : []

  const [blocksOpen, setBlocksOpen] = useState(false)
  useEffect(() => { setBlocksOpen(false) }, [challenge.id])
  const showBlocks = challenge.type === 'sql' && !!challenge.blocks

  const [submitted, setSubmitted] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (lastResult) resultRef.current?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [lastResult])

  const handleSubmit = () => {
    if (isLoading || !engineReady) return
    sfx.attack()
    setSubmitted(code)
    onSubmit(code)
  }

  const isPython = challenge.type === 'python'
  const ok = !!lastResult && lastResult.isCorrect && !lastResult.error

  return (
    <>
      <div className={`arena-task${taskHidden ? ' arena-task--hidden' : ''}`}>
        <h2>{challenge.title}</h2>
        <p>{taskHidden ? 'El Zonda se llevó la consigna… ya vuelve.' : withCode(challenge.description)}</p>
        {seedTables.length > 0 && !taskHidden && (
          <div className="arena-task-tables">
            {seedTables.map((t) => <SqlTable key={t.name} label={t.name} isTable columns={t.columns} rows={t.rows} maxHeight={168} />)}
          </div>
        )}
      </div>

      {banner}

      {showBlocks && blocksOpen && seedReady && (
        <QueryBlocks
          key={challenge.id}
          initialCode={challenge.initialCode}
          tables={seedTables}
          onTry={async (sql) => {
            const r = await runSQL(sql, challenge.seedSQL)
            return { sql: { columns: r.columns, rows: r.rows, changes: r.changes ?? [], schema: r.schema ?? [], fromVerify: false }, error: r.error }
          }}
          onClose={() => setBlocksOpen(false)}
        />
      )}

      <div className="arena-console">
        <div className="arena-console-bar">
          <span>{isPython ? 'python' : 'sqlite'}</span>
          <span className="arena-top-spacer" />
          {showBlocks && !blocksOpen && (
            <button type="button" className="arena-link" onClick={() => { sfx.open(); setBlocksOpen(true) }}>
              {challenge.blocks === 'open' ? '¿te trabás? armalo con bloques' : 'armar con bloques'}
            </button>
          )}
          <span className="hidden sm:inline" style={{ color: 'hsl(var(--tx3))' }}>ctrl+enter</span>
        </div>
        <CodeMirrorEditor
          value={code}
          onChange={setCode}
          language={challenge.type}
          onCtrlEnter={handleSubmit}
          accentColor={boss.color}
          penguin={penguin}
        />
        <div className="arena-run">
          <button type="button" className="arena-go" onClick={handleSubmit} disabled={isLoading || !engineReady}>
            {isLoading ? 'ejecutando…' : !engineReady ? 'cargando python…' : `${goLabel} ▸`}
          </button>
          {lastResult && (
            <span className={ok ? 'arena-ok' : 'arena-bad'}>
              {ok
                ? `✓ ¡Correcto!${lastDamage ? ` −${lastDamage}` : ''}`
                : lastResult.error
                  ? isPython ? '✗ Error de ejecución' : '✗ SQL no pudo ejecutar tu orden'
                  : wrongLabel}
            </span>
          )}
          {!engineReady && isPython && (
            <span className="arena-num">la primera vez tarda ~10 s</span>
          )}
        </div>

        {lastResult && (
          <div ref={resultRef} className="arena-result" style={{ scrollMarginBottom: 72 }}>
            {lastResult.sql && !isPython ? (
              <SqlResult isCorrect={lastResult.isCorrect} error={lastResult.error} expected={lastResult.expected} sql={lastResult.sql} code={submitted} seedTables={seedTables} />
            ) : lastResult.error ? (
              <pre className="arena-out arena-out--err">{lastResult.error}</pre>
            ) : ok ? (
              <>
                <h4>salida</h4>
                <pre className="arena-out">{lastResult.output || '(vacío)'}</pre>
              </>
            ) : (
              <>
                <h4>tu salida</h4>
                <pre className="arena-out">{lastResult.output || '(vacío)'}</pre>
                {lastResult.expected && (
                  <>
                    <h4>esperada</h4>
                    <pre className="arena-out arena-out--dim">{lastResult.expected}</pre>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}

/** `código` dentro de una consigna → chip de código (en vez de mostrar los backticks). */
function withCode(text: string): React.ReactNode {
  const parts = text.split('`')
  if (parts.length < 3) return text
  return parts.map((p, i) => (i % 2 === 1 ? <code key={i} className="code-chip">{p}</code> : p))
}
