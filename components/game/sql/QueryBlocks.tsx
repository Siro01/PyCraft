'use client'

import { useEffect, useState } from 'react'
import Win from '@/components/ui/Win'
import { PixelBitmap, ICON_CLOSE } from '@/components/game/architect/desktop/PixelBitmap'
import type { TableSnapshot } from '@/lib/game/executor/sql-runner'
import type { SqlDetail } from '@/lib/game/executor'
import { friendlySqlError } from '@/lib/game/friendly-error'
import { Produced } from './SqlResult'

// Pizarra de bloques para los desafíos SQL junior: el alumno arma la idea con
// fichas y ve cómo se escribe en SQL. La pizarra NUNCA ataca: para pegarle al
// jefe tiene que escribir la sentencia él mismo en QUERY.SQL. Por eso la vista
// previa no se puede seleccionar ni copiar. Cada desafío muestra solo las
// fichas de su orden (SELECT, INSERT, UPDATE, DELETE o CREATE).

const BLANK = '___'

type Kind = 'select' | 'insert' | 'update' | 'delete' | 'create'

function kindOf(code: string): Kind {
  const kw = code.trim().split(/\s+/)[0]?.toUpperCase()
  if (kw === 'INSERT') return 'insert'
  if (kw === 'UPDATE') return 'update'
  if (kw === 'DELETE') return 'delete'
  if (kw === 'CREATE') return 'create'
  return 'select'
}

const isNumericType = (t = '') => /INT|REAL|NUM|FLOA|DOUB/i.test(t)

/** Valor escrito en una ficha → literal SQL (texto entre comillas simples, número tal cual). */
function literal(raw: string, type?: string): string {
  const v = raw.trim().replace(/^(['"])(.*)\1$/, '$2')
  if (!v) return BLANK
  const looksNum = v !== '' && !Number.isNaN(Number(v))
  if (looksNum && (isNumericType(type) || !type)) return v
  return `'${v.replace(/'/g, "''")}'`
}

interface Cond { col: string; op: string; val: string }
const OPS = [
  { v: '=', l: '= es igual a' },
  { v: '>', l: '> es mayor que' },
  { v: '<', l: '< es menor que' },
]

function condSql(c: Cond, table?: TableSnapshot): string {
  const type = table?.types[table.columns.indexOf(c.col)]
  return `${c.col || BLANK} ${c.op} ${literal(c.val, type)}`
}

// ── Piezas ───────────────────────────────────────────────────────────────────

function Kw({ es, sql }: { es: string; sql: string }) {
  return (
    <span className="blk-kw">
      <b>{es}</b>
      <small>{sql}</small>
    </span>
  )
}

function Pick({ value, onChange, options, label, placeholder = 'elegí…' }: {
  value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; label: string; placeholder?: string
}) {
  return (
    <select className="blk-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}

function Field({ value, onChange, label, placeholder = 'valor', width = 9 }: {
  value: string; onChange: (v: string) => void; label: string; placeholder?: string; width?: number
}) {
  return (
    <input
      className="blk-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      placeholder={placeholder}
      spellCheck={false}
      autoComplete="off"
      style={{ width: `${width}ch` }}
    />
  )
}

function Remove({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="blk-remove" onClick={onClick} aria-label={label} title={label}>
      <PixelBitmap rows={ICON_CLOSE} scale={2} ink="currentColor" />
    </button>
  )
}

function TablePick({ tables, value, onChange }: { tables: TableSnapshot[]; value: string; onChange: (v: string) => void }) {
  if (tables.length === 1) return <span className="blk-fixed">{tables[0].name}</span>
  return <Pick value={value} onChange={onChange} label="Tabla" options={tables.map((t) => ({ v: t.name, l: t.name }))} />
}

function CondLine({ cond, table, onChange, onRemove, required }: {
  cond: Cond; table?: TableSnapshot; onChange: (c: Cond) => void; onRemove: () => void; required?: boolean
}) {
  return (
    <div className="blk-line">
      <Kw es="DONDE" sql="WHERE" />
      <Pick value={cond.col} onChange={(col) => onChange({ ...cond, col })} label="Columna a comparar" options={(table?.columns ?? []).map((c) => ({ v: c, l: c }))} />
      <Pick value={cond.op} onChange={(op) => onChange({ ...cond, op })} label="Comparación" options={OPS} />
      <Field value={cond.val} onChange={(val) => onChange({ ...cond, val })} label="Valor a comparar" />
      <Remove onClick={onRemove} label={required ? 'Quitar DONDE (cuidado)' : 'Quitar DONDE'} />
    </div>
  )
}

function AddWhere({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="blk-add" onClick={onClick}>
      + DONDE <small>WHERE</small>
    </button>
  )
}

const emptyCond = (): Cond => ({ col: '', op: '=', val: '' })

// ── Constructores por orden ─────────────────────────────────────────────────

type BuilderProps = { tables: TableSnapshot[]; initialCode: string; onSql: (sql: string) => void; free?: boolean }

const AGGS = [
  { v: 'COUNT', l: 'contar filas' },
  { v: 'SUM', l: 'sumar' },
  { v: 'AVG', l: 'promedio' },
  { v: 'MAX', l: 'el más grande' },
  { v: 'MIN', l: 'el más chico' },
]

function SelectBuilder({ tables, initialCode, onSql, free }: BuilderProps) {
  // En la batalla, solo los desafíos de COUNT/SUM muestran "calcular". En el reino (free) se elige.
  const allowAgg = free || /SELECT\s+[\w_]+\s*\(/i.test(initialCode)
  const [table, setTable] = useState(tables[0]?.name ?? '')
  const [agg, setAgg] = useState(free ? 'cols' : '')
  const [aggCol, setAggCol] = useState('')
  const [cols, setCols] = useState<string[]>([])
  const [where, setWhere] = useState<Cond | null>(/WHERE/i.test(initialCode) ? emptyCond() : null)
  const t = tables.find((x) => x.name === table)
  const columns = t?.columns ?? []

  const toggle = (c: string) => setCols((cur) => {
    if (c === '*') return cur.includes('*') ? [] : ['*']
    const next = cur.filter((x) => x !== '*')
    return next.includes(c) ? next.filter((x) => x !== c) : columns.filter((x) => x === c || next.includes(x))
  })

  const showCols = !allowAgg || agg === 'cols'
  const what = agg && agg !== 'cols'
    ? `${agg}(${agg === 'COUNT' ? '*' : aggCol || BLANK})`
    : cols.length ? cols.join(', ') : BLANK
  const sql = `SELECT ${what}\nFROM ${table || BLANK}${where ? `\nWHERE ${condSql(where, t)}` : ''};`
  useEffect(() => { onSql(sql) }, [sql, onSql])

  return (
    <>
      <div className="blk-line">
        <Kw es="MOSTRAR" sql="SELECT" />
        {allowAgg && (
          <Pick value={agg} onChange={setAgg} label="Qué mostrar" options={free ? [{ v: 'cols', l: 'columnas' }, ...AGGS] : AGGS} placeholder="¿qué calculo?" />
        )}
        {allowAgg && agg && agg !== 'COUNT' && agg !== 'cols' && (
          <Pick value={aggCol} onChange={setAggCol} label="De qué columna" options={columns.map((c) => ({ v: c, l: c }))} placeholder="¿de qué columna?" />
        )}
        {showCols && (
          <div className="blk-toggles" role="group" aria-label="Columnas para mostrar">
            {columns.map((c) => (
              <button key={c} type="button" className="blk-toggle" aria-pressed={cols.includes(c)} onClick={() => toggle(c)}>{c}</button>
            ))}
            <button type="button" className="blk-toggle" aria-pressed={cols.includes('*')} onClick={() => toggle('*')}>todas <small>*</small></button>
          </div>
        )}
      </div>
      <div className="blk-line">
        <Kw es="DE" sql="FROM" />
        <TablePick tables={tables} value={table} onChange={setTable} />
      </div>
      {where
        ? <CondLine cond={where} table={t} onChange={setWhere} onRemove={() => setWhere(null)} />
        : <AddWhere onClick={() => setWhere(emptyCond())} />}
    </>
  )
}

function InsertBuilder({ tables, onSql }: BuilderProps) {
  const [table, setTable] = useState(tables[0]?.name ?? '')
  const t = tables.find((x) => x.name === table)
  const columns = t?.columns ?? []
  const [rows, setRows] = useState<string[][]>([[]])

  const setCell = (ri: number, ci: number, v: string) =>
    setRows((cur) => cur.map((r, i) => (i === ri ? Object.assign([...r], { [ci]: v }) : r)))

  const values = rows.map((r) => `(${columns.map((_, ci) => literal(r[ci] ?? '', t?.types[ci])).join(', ')})`)
  const sql = `INSERT INTO ${table || BLANK} (${columns.join(', ') || BLANK})\nVALUES${values.length > 1 ? `\n  ${values.join(',\n  ')}` : ` ${values[0]}`};`
  useEffect(() => { onSql(sql) }, [sql, onSql])

  return (
    <>
      <div className="blk-line">
        <Kw es="AGREGAR A" sql="INSERT INTO" />
        <TablePick tables={tables} value={table} onChange={setTable} />
      </div>
      <div className="blk-line blk-line--top">
        <Kw es="VALORES" sql="VALUES" />
        <div className="blk-rows">
          {rows.map((r, ri) => (
            <div key={ri} className="blk-row">
              {columns.map((c, ci) => (
                <label key={c} className="blk-cell">
                  <span>{c}</span>
                  <Field value={r[ci] ?? ''} onChange={(v) => setCell(ri, ci, v)} label={`${c} de la fila ${ri + 1}`} placeholder={isNumericType(t?.types[ci]) ? 'número' : 'texto'} width={isNumericType(t?.types[ci]) ? 6 : 10} />
                </label>
              ))}
              {rows.length > 1 && <Remove onClick={() => setRows((cur) => cur.filter((_, i) => i !== ri))} label={`Quitar la fila ${ri + 1}`} />}
            </div>
          ))}
          <button type="button" className="blk-add" onClick={() => setRows((cur) => [...cur, []])}>+ otra fila</button>
        </div>
      </div>
    </>
  )
}

function UpdateBuilder({ tables, onSql }: BuilderProps) {
  const [table, setTable] = useState(tables[0]?.name ?? '')
  const t = tables.find((x) => x.name === table)
  const columns = t?.columns ?? []
  const [setCol, setSetCol] = useState('')
  const [setVal, setSetVal] = useState('')
  const [where, setWhere] = useState<Cond | null>(emptyCond())

  const sql = `UPDATE ${table || BLANK}\nSET ${setCol || BLANK} = ${literal(setVal, t?.types[columns.indexOf(setCol)])}${where ? `\nWHERE ${condSql(where, t)}` : ''};`
  useEffect(() => { onSql(sql) }, [sql, onSql])

  return (
    <>
      <div className="blk-line">
        <Kw es="CAMBIAR EN" sql="UPDATE" />
        <TablePick tables={tables} value={table} onChange={setTable} />
      </div>
      <div className="blk-line">
        <Kw es="PONER" sql="SET" />
        <Pick value={setCol} onChange={setSetCol} label="Columna a cambiar" options={columns.map((c) => ({ v: c, l: c }))} />
        <span className="blk-op">=</span>
        <Field value={setVal} onChange={setSetVal} label="Valor nuevo" placeholder="valor" width={9} />
      </div>
      {where
        ? <CondLine cond={where} table={t} onChange={setWhere} onRemove={() => setWhere(null)} required />
        : <NoWhere verb="cambiar" onAdd={() => setWhere(emptyCond())} />}
    </>
  )
}

function DeleteBuilder({ tables, onSql }: BuilderProps) {
  const [table, setTable] = useState(tables[0]?.name ?? '')
  const t = tables.find((x) => x.name === table)
  const [where, setWhere] = useState<Cond | null>(emptyCond())

  const sql = `DELETE FROM ${table || BLANK}${where ? `\nWHERE ${condSql(where, t)}` : ''};`
  useEffect(() => { onSql(sql) }, [sql, onSql])

  return (
    <>
      <div className="blk-line">
        <Kw es="BORRAR DE" sql="DELETE FROM" />
        <TablePick tables={tables} value={table} onChange={setTable} />
      </div>
      {where
        ? <CondLine cond={where} table={t} onChange={setWhere} onRemove={() => setWhere(null)} required />
        : <NoWhere verb="borrar" onAdd={() => setWhere(emptyCond())} />}
    </>
  )
}

/** Sin DONDE, un UPDATE o DELETE toca todas las filas: la ficha lo avisa. */
function NoWhere({ verb, onAdd }: { verb: string; onAdd: () => void }) {
  return (
    <div className="blk-line">
      <AddWhere onClick={onAdd} />
      <span className="blk-warn" role="status">Sin DONDE vas a {verb} TODAS las filas.</span>
    </div>
  )
}

const COL_TYPES = [
  { v: 'INTEGER PRIMARY KEY', l: 'número clave (id)' },
  { v: 'INTEGER', l: 'número' },
  { v: 'TEXT', l: 'texto' },
]

function CreateBuilder({ onSql }: BuilderProps) {
  const [name, setName] = useState('')
  const [cols, setCols] = useState([{ name: 'id', type: 'INTEGER PRIMARY KEY' }, { name: '', type: 'TEXT' }])
  const setCol = (i: number, patch: Partial<{ name: string; type: string }>) =>
    setCols((cur) => cur.map((c, ci) => (ci === i ? { ...c, ...patch } : c)))

  const clean = (s: string) => s.trim().replace(/\s+/g, '_')
  const sql = `CREATE TABLE ${clean(name) || BLANK} (\n${cols.map((c) => `  ${clean(c.name) || BLANK} ${c.type}`).join(',\n')}\n);`
  useEffect(() => { onSql(sql) }, [sql, onSql])

  return (
    <>
      <div className="blk-line">
        <Kw es="CREAR TABLA" sql="CREATE TABLE" />
        <Field value={name} onChange={setName} label="Nombre de la tabla" placeholder="nombre" width={11} />
      </div>
      <div className="blk-line blk-line--top">
        <Kw es="COLUMNAS" sql="( … )" />
        <div className="blk-rows">
          {cols.map((c, i) => (
            <div key={i} className="blk-row">
              <Field value={c.name} onChange={(v) => setCol(i, { name: v })} label={`Nombre de la columna ${i + 1}`} placeholder="columna" width={10} />
              <Pick value={c.type} onChange={(v) => setCol(i, { type: v })} label={`Tipo de la columna ${i + 1}`} options={COL_TYPES} />
              {cols.length > 1 && <Remove onClick={() => setCols((cur) => cur.filter((_, ci) => ci !== i))} label={`Quitar la columna ${i + 1}`} />}
            </div>
          ))}
          <button type="button" className="blk-add" onClick={() => setCols((cur) => [...cur, { name: '', type: 'TEXT' }])}>+ otra columna</button>
        </div>
      </div>
    </>
  )
}

const BUILDERS: Record<Kind, (p: BuilderProps) => JSX.Element> = {
  select: SelectBuilder,
  insert: InsertBuilder,
  update: UpdateBuilder,
  delete: DeleteBuilder,
  create: CreateBuilder,
}

// ── Vista previa ─────────────────────────────────────────────────────────────

const KW_RE = /(\b(?:SELECT|FROM|WHERE|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|CREATE TABLE|COUNT|SUM|AVG|MAX|MIN|INTEGER|TEXT|PRIMARY KEY)\b|___)/g

function Highlight({ sql }: { sql: string }) {
  return (
    <>
      {sql.split(KW_RE).map((part, i) =>
        part === BLANK ? <span key={i} className="blk-hole">{part}</span>
          : i % 2 === 1 ? <b key={i}>{part}</b>
            : part,
      )}
    </>
  )
}

// ── Pizarra ──────────────────────────────────────────────────────────────────

export type BlocksTry = { sql: SqlDetail; error: string | null }

interface QueryBlocksProps {
  /** Batalla: el código inicial del desafío decide qué orden se arma. */
  initialCode?: string
  tables: TableSnapshot[]
  /** Corre lo armado en una base de prueba (nunca ataca ni guarda). */
  onTry: (sql: string) => Promise<BlocksTry>
  onClose: () => void
  /** Mi Reino: se elige la orden y MOSTRAR permite columnas o cálculos. */
  free?: boolean
}

type Tried = BlocksTry & { code: string }

const KINDS: { v: Kind; es: string; sql: string }[] = [
  { v: 'create', es: 'Crear tabla', sql: 'CREATE' },
  { v: 'insert', es: 'Agregar filas', sql: 'INSERT' },
  { v: 'select', es: 'Mostrar', sql: 'SELECT' },
  { v: 'update', es: 'Cambiar', sql: 'UPDATE' },
  { v: 'delete', es: 'Borrar', sql: 'DELETE' },
]

export default function QueryBlocks({ initialCode = '', tables, onTry, onClose, free = false }: QueryBlocksProps) {
  const [kind, setKind] = useState<Kind>(free ? (tables.length ? 'select' : 'create') : kindOf(initialCode))
  const Builder = BUILDERS[kind]
  const needsTable = kind !== 'create' && tables.length === 0
  const [sql, setSql] = useState('')
  const [tried, setTried] = useState<Tried | null>(null)

  // Cualquier cambio en las fichas borra la prueba anterior: lo que se ve siempre es de lo que está armado.
  useEffect(() => { setTried(null) }, [sql])

  const complete = sql !== '' && !sql.includes(BLANK) && !needsTable

  const probar = async () => {
    const r = await onTry(sql)
    setTried({ ...r, code: sql })
  }

  return (
    <Win
      title="BLOQUES.SQL"
      onClose={onClose}
      className="shrink-0 win-pop"
      bodyStyle={{ padding: 14 }}
    >
      {free && (
        <div className="blk-toggles mb-3" role="group" aria-label="Qué querés hacer">
          {KINDS.map((k) => (
            <button key={k.v} type="button" className="blk-toggle" aria-pressed={kind === k.v} onClick={() => { setKind(k.v); setSql('') }}>
              {k.es} <small>{k.sql}</small>
            </button>
          ))}
        </div>
      )}

      {needsTable ? (
        <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 21, color: 'hsl(var(--tx2))', margin: 0 }}>
          Primero creá una tabla: todavía no hay dónde {kind === 'insert' ? 'agregar' : kind === 'select' ? 'mirar' : kind === 'update' ? 'cambiar' : 'borrar'}.
        </p>
      ) : (
        <div className="blk-lines">
          <Builder key={kind} tables={tables} initialCode={initialCode} onSql={setSql} free={free} />
        </div>
      )}

      <div className="blk-preview">
        <span className="blk-preview-label">Se escribe así</span>
        <pre aria-live="polite"><Highlight sql={sql} /></pre>
      </div>

      <div className="flex items-center gap-3 flex-wrap mt-3">
        <button type="button" className="btn-ghost" onClick={probar} disabled={!complete} title={complete ? undefined : 'Completá las fichas primero'}>
          Probar en la pizarra
        </button>
        <span style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, lineHeight: 1.1, color: 'hsl(var(--tx2))' }}>
          {free ? 'Para guardarlo en tu reino, escribilo vos abajo.' : 'Para atacar, escribilo vos en QUERY.SQL.'}
        </span>
      </div>

      {tried && (
        <div className="mt-3">
          {tried.error
            ? <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 21, color: 'hsl(var(--tx))', margin: 0 }}>{friendlySqlError(tried.error, tried.code, tried.sql.schema).message}</p>
            : <Produced sql={tried.sql} />}
        </div>
      )}
    </Win>
  )
}
