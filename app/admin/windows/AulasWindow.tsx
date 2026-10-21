'use client'

import { useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { sfx } from '@/lib/game/architect/sound'
import { hhmm, type AdminAula } from '../aula-label'

// AULAS.EXE: un renglón por aula, sin tarjetas. El horario se edita en el
// lugar, la arena se abre/cierra con un toque y el aula se borra
// arrastrándola a la papelera del escritorio (o con Supr sobre el renglón).

export type Turno = 'mañana' | 'tarde' | 'otro'

export interface NuevaAula { nombre: string; turno: Turno; desde: string; hasta: string }

interface Props {
  aulas: AdminAula[]
  countIn: (aulaId: string) => { alumnos: number; activos: number }
  onCreate: (a: NuevaAula) => Promise<boolean>
  onSaveHorario: (aulaId: string, field: 'hora_inicio' | 'hora_fin', value: string) => void
  onToggleArena: (aulaId: string) => void
  onGrip: (aula: AdminAula, e: ReactPointerEvent) => void
  onDelete: (aula: AdminAula) => void
  dragging: string | null
}

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const TURNOS: { id: Turno; label: string }[] = [{ id: 'mañana', label: 'Mañana' }, { id: 'tarde', label: 'Tarde' }, { id: 'otro', label: 'Otro' }]
const TURNO_LABEL: Record<string, string> = { 'mañana': 'Mañana', 'tarde': 'Tarde', 'otro': 'Otro' }
const GRIP = ['##.##', '##.##', '.....', '##.##', '##.##', '.....', '##.##', '##.##']
const COLS = '20px minmax(150px, 1fr) auto 140px 104px'

export default function AulasWindow({ aulas, countIn, onCreate, onSaveHorario, onToggleArena, onGrip, onDelete, dragging }: Props) {
  const [adding, setAdding] = useState(aulas.length === 0)
  const [form, setForm] = useState<NuevaAula>({ nombre: '', turno: 'mañana', desde: '', hasta: '' })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (await onCreate(form)) {
      setForm({ nombre: '', turno: form.turno, desde: '', hasta: '' })
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <button type="button" className="sys-tool" aria-expanded={adding} onClick={() => { sfx.click(); setAdding((a) => !a) }}>
          {adding ? '× Cancelar' : '+ Nueva aula'}
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="aula-new win-pop">
          <label className="flex flex-col gap-1" style={{ flex: '1 1 180px' }}>
            <span className="label-mono">Nombre</span>
            <input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="PyCraft" required autoFocus />
          </label>
          <div className="flex flex-col gap-1">
            <span className="label-mono" id="turno-lbl">Turno</span>
            <div role="radiogroup" aria-labelledby="turno-lbl" className="flex">
              {TURNOS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={form.turno === t.id}
                  className="aula-seg"
                  onClick={() => { sfx.toggle(true); setForm({ ...form, turno: t.id }) }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label-mono">Horario</span>
            <div className="flex items-center gap-1.5">
              <input className="input aula-time" type="time" aria-label="Desde" value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} />
              <span style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>a</span>
              <input className="input aula-time" type="time" aria-label="Hasta" value={form.hasta} onChange={(e) => setForm({ ...form, hasta: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="sys-tool sys-tool--solid" style={{ alignSelf: 'flex-end' }}>Crear</button>
        </form>
      )}

      {aulas.length > 0 && (
        <div role="table" aria-label="Aulas">
          <div role="row" className="aula-row aula-row--head" style={{ gridTemplateColumns: COLS }}>
            <span role="columnheader" aria-hidden />
            <span role="columnheader" className="label-mono">Aula</span>
            <span role="columnheader" className="label-mono">Horario</span>
            <span role="columnheader" className="label-mono">Alumnos</span>
            <span role="columnheader" className="label-mono">Arena</span>
          </div>
          {aulas.map((a) => {
            const { alumnos, activos } = countIn(a.id)
            const arena = a.arena_enabled !== false
            return (
              <div
                key={a.id}
                role="row"
                tabIndex={0}
                aria-label={`${a.nombre} ${TURNO_LABEL[a.turno] ?? a.turno}. Supr para borrar.`}
                className={`aula-row${dragging === a.id ? ' aula-row--lifted' : ''}`}
                style={{ gridTemplateColumns: COLS }}
                onKeyDown={(e) => { if (e.key === 'Delete' && e.target === e.currentTarget) { e.preventDefault(); onDelete(a) } }}
              >
                <span
                  role="cell"
                  className="aula-grip"
                  title="Arrastrá a la papelera para borrar"
                  onPointerDown={(e) => onGrip(a, e)}
                >
                  <PixelBitmap rows={GRIP} scale={2} ink="currentColor" />
                </span>
                <span role="cell" className="min-w-0">
                  <span className="block truncate" style={{ fontFamily: jersey, fontSize: 19, lineHeight: 1, color: 'hsl(var(--tx))' }}>{a.nombre}</span>
                  <span className="block" style={{ fontFamily: vt, fontSize: 17, lineHeight: 1.1, color: 'hsl(var(--tx2))' }}>{TURNO_LABEL[a.turno] ?? a.turno}</span>
                </span>
                <span role="cell" className="flex items-center gap-1.5">
                  <input
                    className="input aula-time" type="time" aria-label={`Desde, ${a.nombre}`}
                    defaultValue={hhmm(a.hora_inicio)}
                    onBlur={(e) => { if (e.target.value !== hhmm(a.hora_inicio)) onSaveHorario(a.id, 'hora_inicio', e.target.value) }}
                  />
                  <span style={{ fontFamily: vt, fontSize: 18, color: 'hsl(var(--tx3))' }}>a</span>
                  <input
                    className="input aula-time" type="time" aria-label={`Hasta, ${a.nombre}`}
                    defaultValue={hhmm(a.hora_fin)}
                    onBlur={(e) => { if (e.target.value !== hhmm(a.hora_fin)) onSaveHorario(a.id, 'hora_fin', e.target.value) }}
                  />
                </span>
                <span role="cell" style={{ fontFamily: vt, fontSize: 18, lineHeight: 1.05 }}>
                  <span className="tabular" style={{ fontFamily: jersey, fontSize: 19, color: 'hsl(var(--tx))' }}>{alumnos}</span>
                  <span style={{ color: activos > 0 ? 'hsl(var(--tx))' : 'hsl(var(--tx3))' }}> · {activos} activo{activos === 1 ? '' : 's'}</span>
                </span>
                <span role="cell">
                  <button
                    type="button"
                    aria-pressed={arena}
                    className="aula-arena"
                    title={arena ? 'Abierta para quien venció al Jefe 3 — clic para cerrarla' : 'Cerrada — clic para abrirla'}
                    onClick={() => { sfx.toggle(!arena); onToggleArena(a.id) }}
                  >
                    {arena ? 'Abierta' : 'Cerrada'}
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
