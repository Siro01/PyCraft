'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BossSprite from '@/components/game/BossSprite'
import type { Boss } from '@/types'

interface Student {
  id: string
  username: string
  role: string
  aula_id: string | null
  created_at: string
}

interface Aula {
  id: string
  nombre: string
  turno: string
  created_at: string
}

interface AdminPanelProps {
  bosses: Boss[]
  bossEnabledMap: Record<string, boolean>
  students: Student[]
  scoreMap: Record<string, { defeated: number; attacks: number }>
  aulas: Aula[]
}

const TURNO_LABEL: Record<string, string> = {
  'mañana': 'Mañana',
  'tarde': 'Tarde',
  'otro': 'Otro',
}

export default function AdminPanel({ bosses, bossEnabledMap, students: initialStudents, scoreMap, aulas: initialAulas }: AdminPanelProps) {
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(bossEnabledMap)
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [aulas, setAulas] = useState<Aula[]>(initialAulas)

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newAulaId, setNewAulaId] = useState('')
  const [createStatus, setCreateStatus] = useState('')

  const [newAulaNombre, setNewAulaNombre] = useState('')
  const [newAulaTurno, setNewAulaTurno] = useState<'mañana' | 'tarde' | 'otro'>('mañana')
  const [aulaStatus, setAulaStatus] = useState('')

  const [aulaFilter, setAulaFilter] = useState('')
  const [resetTarget, setResetTarget] = useState<Student | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetStatus, setResetStatus] = useState('')

  const [tab, setTab] = useState<'bosses' | 'aulas' | 'students'>('bosses')

  const toggleBoss = async (bossId: string) => {
    const supabase = createClient()
    const next = !enabledMap[bossId]

    await supabase
      .from('bosses')
      .upsert({ id: bossId, is_enabled: next }, { onConflict: 'id' })

    setEnabledMap((prev) => ({ ...prev, [bossId]: next }))
  }

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateStatus('Creando...')

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, password: newPassword, aulaId: newAulaId || null }),
    })

    if (res.ok) {
      setCreateStatus('✓ Alumno creado')
      setNewUsername('')
      setNewPassword('')
      // Refresh list without a full reload
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, username, role, aula_id, created_at')
        .order('username')
      if (data) setStudents(data as Student[])
    } else {
      const { error } = await res.json()
      setCreateStatus('Error: ' + error)
    }
  }

  const createAula = async (e: React.FormEvent) => {
    e.preventDefault()
    setAulaStatus('Creando...')
    const supabase = createClient()
    const { data, error } = await supabase
      .from('aulas')
      .insert({ nombre: newAulaNombre, turno: newAulaTurno })
      .select()
      .single()

    if (error) {
      setAulaStatus('Error: ' + error.message)
    } else {
      setAulas((prev) => [...prev, data as Aula].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setAulaStatus('✓ Aula creada')
      setNewAulaNombre('')
    }
  }

  const deleteAula = async (aulaId: string) => {
    if (!confirm('¿Borrar esta aula? Los alumnos asignados quedarán sin aula.')) return
    const supabase = createClient()
    const { error } = await supabase.from('aulas').delete().eq('id', aulaId)
    if (!error) {
      setAulas((prev) => prev.filter((a) => a.id !== aulaId))
      setStudents((prev) => prev.map((s) => (s.aula_id === aulaId ? { ...s, aula_id: null } : s)))
    }
  }

  const reassignAula = async (studentId: string, aulaId: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ aula_id: aulaId || null })
      .eq('id', studentId)
    if (!error) {
      setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, aula_id: aulaId || null } : s)))
    }
  }

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    setResetStatus('Guardando...')
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: resetTarget.id, newPassword: resetPassword }),
    })
    if (res.ok) {
      setResetStatus('✓ Contraseña actualizada')
      setTimeout(() => {
        setResetTarget(null)
        setResetPassword('')
        setResetStatus('')
      }, 1200)
    } else {
      const { error } = await res.json()
      setResetStatus('Error: ' + error)
    }
  }

  const aulaName = (aulaId: string | null) => aulas.find((a) => a.id === aulaId)?.nombre ?? 'Sin aula'

  const visibleStudents = aulaFilter ? students.filter((s) => s.aula_id === aulaFilter) : students

  const tabs = [
    { key: 'bosses', label: 'Jefes' },
    { key: 'aulas', label: 'Aulas' },
    { key: 'students', label: 'Alumnos' },
  ] as const

  return (
    <div className="flex flex-col gap-6">

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`font-mono text-xs px-4 py-2 border-b-2 transition-all -mb-px ${
              tab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-tx3 hover:text-tx'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BOSSES TAB ── */}
      {tab === 'bosses' && (
        <div>
          <p className="text-sm text-tx2 mb-4">
            Habilitá cada jefe cuando el grupo llegue a esa clase.
          </p>
          <div className="flex flex-col gap-2">
            {bosses.map((boss) => {
              const isEnabled = enabledMap[boss.id] ?? false
              return (
                <div key={boss.id} className="card p-3 flex items-center gap-4">
                  <BossSprite boss={boss} size="sm" defeated={false} />

                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-tx3">{boss.title}</div>
                    <div className="font-mono text-sm font-bold text-tx truncate">{boss.name}</div>
                    <div className="text-xs text-tx3 truncate">{boss.topic}</div>
                  </div>

                  <button
                    onClick={() => toggleBoss(boss.id)}
                    className={`font-mono text-xs px-3 py-1.5 pixel-corners-sm border transition-all shrink-0 ${
                      isEnabled
                        ? 'border-python/50 text-python bg-python/10 hover:bg-python/20'
                        : 'border-border text-tx3 hover:border-border2 hover:text-tx'
                    }`}
                  >
                    {isEnabled ? '● Habilitado' : '○ Bloqueado'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── AULAS TAB ── */}
      {tab === 'aulas' && (
        <div className="flex flex-col gap-6">

          {/* Create aula form */}
          <div className="card p-5">
            <div className="label-mono mb-3">Crear nueva aula</div>
            <form onSubmit={createAula} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label-mono mb-1 block">Nombre</label>
                  <input
                    className="input"
                    type="text"
                    value={newAulaNombre}
                    onChange={(e) => setNewAulaNombre(e.target.value)}
                    placeholder="Comisión A"
                    required
                  />
                </div>
                <div>
                  <label className="label-mono mb-1 block">Turno</label>
                  <select
                    className="input"
                    value={newAulaTurno}
                    onChange={(e) => setNewAulaTurno(e.target.value as 'mañana' | 'tarde' | 'otro')}
                  >
                    <option value="mañana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" className="btn-primary font-mono">
                  Crear aula
                </button>
                {aulaStatus && (
                  <span className={`font-mono text-xs ${aulaStatus.startsWith('✓') ? 'text-python' : 'text-danger'}`}>
                    {aulaStatus}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Aula list */}
          <div className="flex flex-col gap-2">
            {aulas.map((a) => {
              const count = students.filter((s) => s.aula_id === a.id).length
              return (
                <div key={a.id} className="card p-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-bold text-tx truncate">{a.nombre}</div>
                    <div className="text-xs text-tx3">{TURNO_LABEL[a.turno] ?? a.turno} · {count} alumno{count === 1 ? '' : 's'}</div>
                  </div>
                  <button
                    onClick={() => deleteAula(a.id)}
                    className="font-mono text-xs px-3 py-1.5 pixel-corners-sm border border-danger/40 text-danger hover:bg-danger/10 transition-all shrink-0"
                  >
                    Borrar
                  </button>
                </div>
              )
            })}
            {aulas.length === 0 && (
              <div className="card p-6 text-center font-mono text-xs text-tx3">
                No hay aulas creadas todavía.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STUDENTS TAB ── */}
      {tab === 'students' && (
        <div className="flex flex-col gap-6">

          {/* Create user form */}
          <div className="card p-5">
            <div className="label-mono mb-3">Crear nuevo alumno</div>
            <form onSubmit={createStudent} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label-mono mb-1 block">Usuario</label>
                  <input
                    className="input"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="nombre_alumno"
                    required
                  />
                </div>
                <div>
                  <label className="label-mono mb-1 block">Contraseña</label>
                  <input
                    className="input"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="clase123"
                    required
                  />
                </div>
                <div>
                  <label className="label-mono mb-1 block">Aula</label>
                  <select
                    className="input"
                    value={newAulaId}
                    onChange={(e) => setNewAulaId(e.target.value)}
                  >
                    <option value="">Sin aula</option>
                    {aulas.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre} ({TURNO_LABEL[a.turno] ?? a.turno})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" className="btn-primary font-mono">
                  Crear alumno
                </button>
                {createStatus && (
                  <span className={`font-mono text-xs ${createStatus.startsWith('✓') ? 'text-python' : 'text-danger'}`}>
                    {createStatus}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Aula filter */}
          <div className="flex items-center gap-2">
            <span className="label-mono">Filtrar por aula</span>
            <select
              className="input max-w-[240px]"
              value={aulaFilter}
              onChange={(e) => setAulaFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {aulas.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </div>

          {/* Student table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface2">
                    {['Usuario', 'Rol', 'Aula', 'Jefes derrotados', 'Ataques totales', 'Creado', ''].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left label-mono">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((s, i) => {
                    const score = scoreMap[s.id] ?? { defeated: 0, attacks: 0 }
                    return (
                      <tr
                        key={s.id}
                        className={`border-b border-border text-sm ${i % 2 === 0 ? '' : 'bg-surface2/40'}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-tx">{s.username}</td>
                        <td className="px-4 py-2.5">
                          <span className={`badge ${s.role === 'admin' ? 'badge-mixed' : 'badge-python'}`}>
                            {s.role}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {s.role === 'admin' ? (
                            <span className="text-xs text-tx3">—</span>
                          ) : (
                            <select
                              className="input text-xs py-1"
                              value={s.aula_id ?? ''}
                              onChange={(e) => reassignAula(s.id, e.target.value)}
                            >
                              <option value="">Sin aula</option>
                              {aulas.map((a) => (
                                <option key={a.id} value={a.id}>{a.nombre}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-tx2 tabular">{score.defeated}</td>
                        <td className="px-4 py-2.5 font-mono text-tx2 tabular">{score.attacks}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-tx3">
                          {new Date(s.created_at).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => { setResetTarget(s); setResetPassword(''); setResetStatus('') }}
                            className="font-mono text-xs px-2 py-1 pixel-corners-sm border border-border text-tx3 hover:border-border2 hover:text-tx transition-all"
                          >
                            Resetear clave
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {visibleStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center font-mono text-xs text-tx3">
                        No hay alumnos para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setResetTarget(null)}
        >
          <div className="card p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="label-mono mb-3">Resetear contraseña de {resetTarget.username}</div>
            <form onSubmit={submitResetPassword} className="flex flex-col gap-3">
              <input
                className="input"
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Nueva contraseña"
                required
                autoFocus
              />
              <div className="flex items-center gap-3">
                <button type="submit" className="btn-primary font-mono">
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="font-mono text-xs text-tx3 hover:text-tx"
                >
                  Cancelar
                </button>
                {resetStatus && (
                  <span className={`font-mono text-xs ${resetStatus.startsWith('✓') ? 'text-python' : 'text-danger'}`}>
                    {resetStatus}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
