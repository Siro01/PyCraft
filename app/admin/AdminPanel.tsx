'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BossSprite from '@/components/game/BossSprite'
import type { Boss } from '@/types'

interface Student {
  id: string
  username: string
  role: string
  created_at: string
}

interface AdminPanelProps {
  bosses: Boss[]
  bossEnabledMap: Record<string, boolean>
  students: Student[]
  scoreMap: Record<string, { defeated: number; attacks: number }>
}

export default function AdminPanel({ bosses, bossEnabledMap, students, scoreMap }: AdminPanelProps) {
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(bossEnabledMap)
  const [newEmail, setNewEmail] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [createStatus, setCreateStatus] = useState('')
  const [tab, setTab] = useState<'bosses' | 'students'>('bosses')

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
      body: JSON.stringify({ email: newEmail, username: newUsername, password: newPassword }),
    })

    if (res.ok) {
      setCreateStatus('✓ Usuario creado')
      setNewEmail('')
      setNewUsername('')
      setNewPassword('')
    } else {
      const { error } = await res.json()
      setCreateStatus('Error: ' + error)
    }
  }

  const tabs = [
    { key: 'bosses', label: 'Jefes' },
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

      {/* ── STUDENTS TAB ── */}
      {tab === 'students' && (
        <div className="flex flex-col gap-6">

          {/* Create user form */}
          <div className="card p-5">
            <div className="label-mono mb-3">Crear nuevo alumno</div>
            <form onSubmit={createStudent} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label-mono mb-1 block">Email</label>
                  <input
                    className="input"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="alumno@escuela.edu"
                    required
                  />
                </div>
                <div>
                  <label className="label-mono mb-1 block">Username</label>
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
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" className="btn-primary font-mono">
                  Crear usuario
                </button>
                {createStatus && (
                  <span className={`font-mono text-xs ${createStatus.startsWith('✓') ? 'text-python' : 'text-danger'}`}>
                    {createStatus}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Student table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface2">
                    {['Usuario', 'Rol', 'Jefes derrotados', 'Ataques totales', 'Creado'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left label-mono">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
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
                        <td className="px-4 py-2.5 font-mono text-tx2 tabular">{score.defeated}</td>
                        <td className="px-4 py-2.5 font-mono text-tx2 tabular">{score.attacks}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-tx3">
                          {new Date(s.created_at).toLocaleDateString('es-AR')}
                        </td>
                      </tr>
                    )
                  })}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center font-mono text-xs text-tx3">
                        No hay alumnos registrados todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
