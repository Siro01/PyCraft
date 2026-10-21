'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PixelBitmap, ICON_FOLDER, ICON_TEAM_SHIELD, ICON_TERMINAL, ICON_SWORDS, ICON_RAID, ICON_KEYS, ICON_FILE, ICON_WANTED, ICON_BIN, ICON_BIN_OPEN } from '@/components/game/architect/desktop/PixelBitmap'
import { PlaceNode } from '@/components/game/map/MapNodeIcon'
import { IconSkull, IconSigma } from '@/components/ui/PixelIcons'
import AdminDesktop, { type DeskProgram } from '@/components/admin/os/AdminDesktop'
import { useAulaActiva, TODAS } from '@/components/admin/os/AulaPicker'
import SysDialog, { DialogButton, useSysConfirm } from '@/components/admin/os/SysDialog'
import { useStatus } from '@/components/admin/os/StatusLine'
import { useDragToTrash } from '@/components/admin/os/useDragToTrash'
import { useNarrowDesk } from '@/components/admin/os/useDesktopWindows'
import AlumnosWindow, { needsAction, type NuevoAlumno } from './windows/AlumnosWindow'
import type { StudentStanding } from '@/app/api/admin/compensar/route'
import JefesWindow, { type JefesRow } from './windows/JefesWindow'
import AulasWindow, { type NuevaAula } from './windows/AulasWindow'
import RepasosWindow, { type RepasoRow } from './windows/RepasosWindow'
import StatsWindow from './windows/StatsWindow'
import EjerciciosWindow from './windows/EjerciciosWindow'
import ReinosWindow from './windows/ReinosWindow'
import ArenaWindow from './windows/ArenaWindow'
import RaidWindow from './windows/RaidWindow'
import TestWindow from './windows/TestWindow'
import { aulaHorario, type AdminAula } from './aula-label'
import { TEST_USERNAME } from '@/lib/test-student/constants'
import { REPASOS } from '@/lib/game/repasos'
import { DEFAULT_TIER_ENABLED, TIER_META } from '@/lib/game/tiers'
import type { AttackRow, BattleRow } from '@/lib/admin/stats'
import type { Boss, ChallengeTier } from '@/types'

interface Student {
  id: string
  username: string
  role: string
  aula_id: string | null
  created_at: string
}

type Aula = AdminAula

interface AdminPanelProps {
  bosses: Boss[]
  bossEnabledMap: Record<string, boolean>
  students: Student[]
  scoreMap: Record<string, { defeated: number; attacks: number }>
  aulas: Aula[]
  aulaBossMap: Record<string, Record<string, boolean>>
  activeIds: string[]
  aulaTierMap: Record<string, Record<string, boolean>>
  aulaRepasoMap: Record<string, Record<string, boolean>>
  alumnoRepasoMap: Record<string, Record<string, boolean>>
  repasoProgress: Record<string, Record<string, { beat: number; done: boolean }>>
  battles: BattleRow[]
  attacks: AttackRow[]
}

const TURNO_LABEL: Record<string, string> = {
  'mañana': 'Mañana',
  'tarde': 'Tarde',
  'otro': 'Otro',
}

type WinId = 'jefes' | 'aulas' | 'alumnos' | 'repasos' | 'ejercicios' | 'stats' | 'reinos' | 'arena' | 'raid' | 'test' | 'planificacion' | 'pistolero'

/** Glifo de 8×8 de PixelIcons en la misma caja de 48px que `mapa.exe` del alumno. */
function Boxed({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-center" style={{ width: 48, height: 48, border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))' }}>
      {children}
    </span>
  )
}

export default function AdminPanel({ bosses, bossEnabledMap, students: initialStudents, scoreMap, aulas: initialAulas, aulaBossMap, activeIds, aulaTierMap: initialTierMap, aulaRepasoMap, alumnoRepasoMap, repasoProgress, battles, attacks }: AdminPanelProps) {
  const router = useRouter()
  const [tierMap, setTierMap] = useState<Record<string, Record<string, boolean>>>(initialTierMap)
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(bossEnabledMap)
  const [aulaEnabledMap, setAulaEnabledMap] = useState<Record<string, Record<string, boolean>>>(aulaBossMap)

  // Refresca los datos del servidor (activos, progreso) cada 30 s
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000)
    return () => clearInterval(t)
  }, [router])
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [aulas, setAulas] = useState<Aula[]>(initialAulas)

  // Una sola aula activa para todo el escritorio (barra de menú).
  const [aulaId, setAulaId] = useAulaActiva(aulas)

  // Repasos: el estado vive acá porque lo comparten repasos.exe y la ficha del alumno.
  const [aulaRepasos, setAulaRepasos] = useState(aulaRepasoMap)
  const [alumnoRepasos, setAlumnoRepasos] = useState(alumnoRepasoMap)

  // Saldo, nivel y avisos de cada alumno (los mismos datos que usaba la pestaña Compensar).
  const [standings, setStandings] = useState<Record<string, StudentStanding> | null>(null)
  const [standingsError, setStandingsError] = useState<string | null>(null)
  const loadStandings = useCallback(async () => {
    const res = await fetch('/api/admin/compensar', { cache: 'no-store' })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setStandingsError(json.error ?? 'No se pudo cargar el saldo.'); return }
    setStandingsError(null)
    setStandings(Object.fromEntries((json.students as StudentStanding[]).map((st) => [st.id, st])))
  }, [])
  useEffect(() => { loadStandings() }, [loadStandings])
  const narrow = useNarrowDesk()

  const [resetTarget, setResetTarget] = useState<Student | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetStatus, setResetStatus] = useState('')

  const [jefesStatus, sayJefes] = useStatus()
  const [aulasStatus, sayAulas] = useStatus()
  const [alumnosStatus, sayAlumnos] = useStatus()
  const [repasosStatus, sayRepasos] = useStatus()
  const [arenaStatus, sayArena] = useStatus()
  const [raidStatus, sayRaid] = useStatus()
  const [testStatus, sayTest] = useStatus()
  const [ask, confirmNode] = useSysConfirm()

  const isTierEnabled = (id: string, tier: ChallengeTier) =>
    tierMap[id]?.[tier] ?? DEFAULT_TIER_ENABLED[tier]

  // La Arena: abierta por defecto (desde el Jefe 3); el docente la cierra por aula.
  const toggleArena = async (id: string) => {
    const next = !(aulas.find((a) => a.id === id)?.arena_enabled ?? true)
    const { error } = await createClient().from('aulas').update({ arena_enabled: next }).eq('id', id)
    if (error) { sayAulas(`${error.message} — ¿ejecutaste la migración 013_arena.sql?`, false); return }
    setAulas((prev) => prev.map((a) => (a.id === id ? { ...a, arena_enabled: next } : a)))
    sayAulas(`Arena ${next ? 'abierta' : 'cerrada'} en ${aulaName(id)}`)
  }

  const toggleTier = async (id: string, tier: ChallengeTier) => {
    const next = !isTierEnabled(id, tier)
    const supabase = createClient()
    const { error } = await supabase
      .from('aula_tiers')
      .upsert({ aula_id: id, tier, is_enabled: next }, { onConflict: 'aula_id,tier' })
    if (error) { sayJefes('Error: ' + error.message, false); return }
    setTierMap((prev) => ({ ...prev, [id]: { ...prev[id], [tier]: next } }))
    sayJefes(`${TIER_META[tier].label} ${next ? 'habilitada' : 'deshabilitada'}`)
  }

  // rowId '' = alumnos sin aula (tabla `bosses`); si no, el aula.
  const isBossEnabled = (rowId: string, bossId: string) =>
    rowId ? aulaEnabledMap[rowId]?.[bossId] ?? false : enabledMap[bossId] ?? false

  const toggleBoss = async (rowId: string, boss: Boss) => {
    const supabase = createClient()
    const next = !isBossEnabled(rowId, boss.id)

    if (rowId) {
      const { error } = await supabase
        .from('aula_bosses')
        .upsert({ aula_id: rowId, boss_id: boss.id, is_enabled: next }, { onConflict: 'aula_id,boss_id' })
      if (error) { sayJefes('Error: ' + error.message, false); return }
      setAulaEnabledMap((prev) => ({ ...prev, [rowId]: { ...prev[rowId], [boss.id]: next } }))
    } else {
      const { error } = await supabase
        .from('bosses')
        .upsert({ id: boss.id, is_enabled: next }, { onConflict: 'id' })
      if (error) { sayJefes('Error: ' + error.message, false); return }
      setEnabledMap((prev) => ({ ...prev, [boss.id]: next }))
    }
    sayJefes(`${boss.name} ${next ? 'habilitado' : 'bloqueado'} en ${aulaName(rowId || null)}`)
  }

  const activeSet = new Set(activeIds)
  const activeIn = (id: string | null) =>
    students.filter((s) => s.role === 'student' && s.aula_id === id && activeSet.has(s.id)).length
  const totalActive = students.filter((s) => s.role === 'student' && activeSet.has(s.id)).length
  const todas = aulaId === TODAS

  const createAlumno = async (n: NuevoAlumno) => {
    sayAlumnos('Creando...', null)
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: n.username, password: n.password, aulaId: n.aulaId || null }),
    })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'no se pudo crear' }))
      sayAlumnos('Error: ' + error, false)
      return false
    }
    sayAlumnos(`Alumno ${n.username} creado`)
    // Refresca la lista sin recargar la página
    const { data } = await createClient()
      .from('profiles')
      .select('id, username, role, aula_id, created_at')
      .order('username')
    if (data) setStudents((data as Student[]).filter((s) => s.username !== TEST_USERNAME))
    loadStandings()
    return true
  }

  const repasoError = (msg: string) =>
    /relation .* does not exist|schema cache/i.test(msg) ? 'Falta correr la migración 011_repasos.sql' : 'Error: ' + msg
  const repasoTitle = (bossId: string) => REPASOS.find((r) => r.bossId === bossId)?.title ?? 'Repaso'

  // Desde la ficha del alumno o desde repasos.exe: cada ventana avisa en su propia línea de estado.
  const toggleRepasoAlumno = async (a: { id: string; username: string }, bossId: string, say = sayAlumnos) => {
    const next = !alumnoRepasos[a.id]?.[bossId]
    const { error } = await createClient()
      .from('alumno_repasos')
      .upsert({ user_id: a.id, boss_id: bossId, is_enabled: next }, { onConflict: 'user_id,boss_id' })
    if (error) { say(repasoError(error.message), false); return }
    setAlumnoRepasos((prev) => ({ ...prev, [a.id]: { ...prev[a.id], [bossId]: next } }))
    say(`${repasoTitle(bossId)} ${next ? 'habilitado' : 'quitado'} para ${a.username}`)
  }

  const toggleRepasoAula = async (id: string, bossId: string) => {
    const next = !aulaRepasos[id]?.[bossId]
    const { error } = await createClient()
      .from('aula_repasos')
      .upsert({ aula_id: id, boss_id: bossId, is_enabled: next }, { onConflict: 'aula_id,boss_id' })
    if (error) { sayRepasos(repasoError(error.message), false); return }
    setAulaRepasos((prev) => ({ ...prev, [id]: { ...prev[id], [bossId]: next } }))
    sayRepasos(`${repasoTitle(bossId)} ${next ? 'habilitado' : 'quitado'} para ${aulaName(id)}`)
  }

  const compensar = async (method: 'POST' | 'DELETE', body: Record<string, unknown>) => {
    const res = await fetch('/api/admin/compensar', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return (json.error as string) ?? 'No se pudo.'
    await loadStandings()
    return null
  }
  const grant = async (a: Student, diamonds: number, xp: number, note: string) => {
    const err = await compensar('POST', { userId: a.id, diamonds, xp, note })
    if (!err) sayAlumnos(`${a.username} recibió${diamonds ? ` ${diamonds} diamantes` : ''}${diamonds && xp ? ' y' : ''}${xp ? ` ${xp} XP` : ''}`)
    return err
  }
  const undoGrant = async (a: Student, compId: number) => {
    const ok = await ask({ title: 'DESHACER.EXE', body: <>¿Deshacer esta compensación de <b>{a.username}</b>?</>, ok: 'Deshacer', danger: true })
    if (!ok) return null
    const err = await compensar('DELETE', { id: compId })
    if (!err) sayAlumnos(`Compensación de ${a.username} deshecha`)
    return err
  }

  const createAula = async (n: NuevaAula) => {
    sayAulas('Creando...', null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('aulas')
      .insert({
        nombre: n.nombre, turno: n.turno,
        // El horario es opcional: sin la migración 011 no se manda, así crear aula sigue andando.
        ...(n.desde ? { hora_inicio: n.desde } : {}),
        ...(n.hasta ? { hora_fin: n.hasta } : {}),
      })
      .select()
      .single()

    if (error) {
      sayAulas('Error: ' + error.message, false)
      return false
    }
    setAulas((prev) => [...prev, data as Aula].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    sayAulas(`Aula ${n.nombre} creada`)
    return true
  }

  const deleteAula = async (aula: Aula) => {
    const n = students.filter((s) => s.aula_id === aula.id).length
    const ok = await ask({
      title: 'BORRAR_AULA.EXE',
      body: <>¿Borrar <b>{aula.nombre} · {TURNO_LABEL[aula.turno] ?? aula.turno}</b>? {n > 0 ? `Sus ${n} alumno${n === 1 ? '' : 's'} quedan sin aula.` : 'No tiene alumnos.'} El progreso no se toca.</>,
      ok: 'Borrar',
      danger: true,
    })
    if (!ok) return
    const supabase = createClient()
    const { error } = await supabase.from('aulas').delete().eq('id', aula.id)
    if (error) { sayAulas('Error: ' + error.message, false); return }
    setAulas((prev) => prev.filter((a) => a.id !== aula.id))
    setStudents((prev) => prev.map((s) => (s.aula_id === aula.id ? { ...s, aula_id: null } : s)))
    sayAulas(`Aula ${aula.nombre} borrada`)
  }

  const saveHorario = async (id: string, field: 'hora_inicio' | 'hora_fin', value: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('aulas').update({ [field]: value || null }).eq('id', id)
    if (!error) {
      setAulas((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value || null } : a)))
      sayAulas(`Horario de ${aulaName(id)} guardado`)
    } else sayAulas('Error: ' + (/column/i.test(error.message) ? 'falta correr la migración 011_repasos.sql' : error.message), false)
  }

  const reassignAula = async (student: Student, id: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ aula_id: id || null })
      .eq('id', student.id)
    if (error) { sayAlumnos('Error: ' + error.message, false); return }
    setStudents((prev) => prev.map((s) => (s.id === student.id ? { ...s, aula_id: id || null } : s)))
    sayAlumnos(`${student.username} pasó a ${aulaName(id || null)}`)
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
      sayAlumnos(`Contraseña de ${resetTarget.username} actualizada`)
      setResetTarget(null)
      setResetPassword('')
      setResetStatus('')
    } else {
      const { error } = await res.json()
      setResetStatus('Error: ' + error)
    }
  }

  const aulaName = (id: string | null) => aulas.find((a) => a.id === id)?.nombre ?? 'Sin aula'

  const visibleStudents = todas ? students : students.filter((s) => s.aula_id === (aulaId || null))

  // Papelera: soltar un aula ahí la borra (después de preguntar).
  const trashRef = useRef<HTMLDivElement>(null)
  const draggedId = useRef<string | null>(null)
  const trash = useDragToTrash<Aula>(trashRef, (a) => { draggedId.current = null; deleteAula(a) })

  // Arena y raids ya entienden '' como "todas las aulas".
  const anyAula = todas ? '' : aulaId

  // ── Contenido de cada ventana ──

  const jefesRows: JefesRow[] = todas
    ? [...aulas.map((a) => ({ id: a.id, label: `${a.nombre} · ${TURNO_LABEL[a.turno] ?? a.turno}`, sub: aulaHorario(a) || undefined })), { id: '', label: 'Sin aula', sub: 'alumnos sin asignar' }]
    : [{ id: aulaId, label: aulaId ? `${aulaName(aulaId)} · ${TURNO_LABEL[aulas.find((a) => a.id === aulaId)?.turno ?? ''] ?? ''}` : 'Sin aula', sub: aulaId ? aulaHorario(aulas.find((a) => a.id === aulaId)!) || undefined : 'alumnos sin asignar' }]

  const jefesBody = (
    <JefesWindow
      rows={jefesRows}
      isEnabled={isBossEnabled}
      onToggle={toggleBoss}
      tierOn={isTierEnabled}
      onToggleTier={toggleTier}
    />
  )

  const aulasBody = (
    <AulasWindow
      aulas={aulas}
      countIn={(id) => ({ alumnos: students.filter((s) => s.aula_id === id).length, activos: activeIn(id) })}
      onCreate={createAula}
      onSaveHorario={saveHorario}
      onToggleArena={toggleArena}
      onGrip={(a, e) => { draggedId.current = a.id; trash.start(a, `${a.nombre} · ${TURNO_LABEL[a.turno] ?? a.turno}`, e) }}
      onDelete={deleteAula}
      dragging={trash.ghost ? draggedId.current : null}
    />
  )

  const alumnos = visibleStudents.filter((s) => s.role !== 'admin')
  const repasoRows: RepasoRow[] = (todas ? aulas : aulas.filter((a) => a.id === aulaId))
    .map((a) => ({ id: a.id, label: `${a.nombre} · ${TURNO_LABEL[a.turno] ?? a.turno}`, sub: aulaHorario(a) || undefined }))
  const flagged = students.filter((s) => s.role !== 'admin' && needsAction(standings?.[s.id])).length

  const alumnosBody = (
    <AlumnosWindow
      alumnos={alumnos}
      aulas={aulas}
      todas={todas}
      totalBosses={bosses.length}
      score={(id) => scoreMap[id] ?? { defeated: 0, attacks: 0 }}
      isActive={(id) => activeSet.has(id)}
      standings={standings}
      standingsError={standingsError}
      aulaRepasos={aulaRepasos}
      alumnoRepasos={alumnoRepasos}
      repasoProgress={repasoProgress}
      narrow={narrow}
      onCreate={createAlumno}
      onReassign={reassignAula}
      onResetClave={(a) => { setResetTarget(a); setResetPassword(''); setResetStatus('') }}
      onToggleRepaso={toggleRepasoAlumno}
      onGrant={grant}
      onUndo={undoGrant}
    />
  )

  const programs: DeskProgram<WinId>[] = [
    { id: 'jefes', file: 'jefes.exe', title: 'JEFES.EXE', w: 1080, status: jefesStatus, body: jefesBody,
      icon: <Boxed><IconSkull size={32} color="hsl(var(--tx))" /></Boxed> },
    { id: 'aulas', file: 'aulas.exe', title: 'AULAS.EXE', w: 820, status: aulasStatus, body: aulasBody,
      icon: <PixelBitmap rows={ICON_FOLDER} scale={3} /> },
    { id: 'alumnos', file: 'alumnos.exe', title: 'ALUMNOS.EXE', w: 980, status: alumnosStatus, body: alumnosBody,
      badge: flagged, badgeLabel: `${flagged} alumno${flagged === 1 ? '' : 's'} para revisar (15/10)`,
      icon: <PixelBitmap rows={ICON_TEAM_SHIELD} scale={4} /> },
    { id: 'repasos', file: 'repasos.exe', title: 'REPASOS.EXE', w: 900, status: repasosStatus,
      icon: <PlaceNode kind="school" open focused={false} size={48} />,
      body: (
        <RepasosWindow
          rows={repasoRows}
          alumnos={students.filter((s) => s.role !== 'admin')}
          aulaRepasos={aulaRepasos}
          alumnoRepasos={alumnoRepasos}
          progress={repasoProgress}
          onToggleAula={toggleRepasoAula}
          onToggleAlumno={(a, bossId) => toggleRepasoAlumno(a, bossId, sayRepasos)}
        />
      ) },
    { id: 'ejercicios', file: 'ejercicios.exe', title: 'EJERCICIOS.EXE', w: 900,
      icon: <PixelBitmap rows={ICON_TERMINAL} scale={3} />,
      body: <EjerciciosWindow bosses={bosses} alumnos={alumnos} aulaId={todas || !aulaId ? null : aulaId} aulaTierMap={tierMap} battles={battles} attacks={attacks} narrow={narrow} /> },
    { id: 'stats', file: 'stats.log', title: 'STATS.LOG', w: 900,
      icon: <Boxed><IconSigma size={32} color="hsl(var(--tx))" /></Boxed>,
      body: <StatsWindow bosses={bosses} aulas={aulas} alumnos={alumnos} todas={todas} battles={battles} attacks={attacks} /> },
    { id: 'reinos', file: 'reinos.db', title: 'REINOS.DB', w: 900,
      icon: <PlaceNode kind="reino" open focused={false} size={48} />,
      body: <ReinosWindow alumnos={alumnos} aulas={aulas} todas={todas} narrow={narrow} /> },
    { id: 'arena', file: 'arena.exe', title: 'ARENA.EXE', w: 900, status: arenaStatus,
      icon: <PixelBitmap rows={ICON_SWORDS} scale={4} />,
      body: <ArenaWindow aulaId={anyAula} aulas={aulas} students={students} ask={ask} say={sayArena} /> },
    { id: 'raid', file: 'raid.exe', title: 'RAID.EXE', w: 900, status: raidStatus,
      icon: <PixelBitmap rows={ICON_RAID} scale={4} />,
      body: <RaidWindow aulaId={anyAula} aulas={aulas} students={students} ask={ask} say={sayRaid} /> },
    { id: 'test', file: 'test.exe', title: 'ALUMNO_TEST.EXE', w: 720, status: testStatus,
      icon: <PixelBitmap rows={ICON_KEYS} scale={3} />,
      body: <TestWindow ask={ask} say={sayTest} /> },
    { id: 'planificacion', file: 'plan.txt', title: 'PLANIFICACION', href: '/planificacion',
      icon: <PixelBitmap rows={ICON_FILE} scale={4} /> },
    { id: 'pistolero', file: 'pistolero.exe', title: 'PISTOLERO', href: '/admin/pistolero', place: 'corner',
      icon: <PixelBitmap rows={ICON_WANTED} scale={3} /> },
  ]

  return (
    <>
      <AdminDesktop
        programs={programs}
        openAtStart={[]}
        aulas={aulas}
        aulaId={aulaId}
        onAula={setAulaId}
        activeCount={todas ? totalActive : activeIn(aulaId || null)}
        cornerExtra={
          <div
            ref={trashRef}
            role="img"
            aria-label="Papelera: arrastrá un aula hasta acá para borrarla"
            title="Arrastrá un aula hasta acá para borrarla"
            className={`desk-icon desk-trash${trash.dragging ? ' desk-trash--armed' : ''}${trash.over ? ' desk-trash--over' : ''}`}
          >
            <span className="flex items-center justify-center" style={{ width: 48, height: 48 }}>
              <PixelBitmap rows={trash.over ? ICON_BIN_OPEN : ICON_BIN} scale={4} />
            </span>
            <span className="desk-lbl">papelera</span>
          </div>
        }
      />
      {trash.ghost && createPortal(
        // Cerca del borde derecho (donde vive la papelera) el cartelito va a la izquierda del puntero.
        <div className="drag-ghost" style={{ left: trash.ghost.x, top: trash.ghost.y, transform: trash.ghost.x > window.innerWidth - 260 ? 'translate(calc(-100% - 12px), 10px)' : undefined }}>{trash.ghost.label}</div>,
        document.body,
      )}

      {resetTarget && (
        <SysDialog title="CAMBIAR_CLAVE.EXE" onClose={() => setResetTarget(null)}>
          <form onSubmit={submitResetPassword} className="flex flex-col gap-3">
            <label htmlFor="reset-pass">Nueva contraseña para <b>{resetTarget.username}</b></label>
            <input
              id="reset-pass"
              className="input"
              type="text"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="clase123"
              required
            />
            {resetStatus && <div style={{ color: resetStatus.startsWith('Error') ? 'hsl(var(--danger))' : 'hsl(var(--tx2))' }}>&gt; {resetStatus}</div>}
            <div className="flex flex-wrap justify-end gap-2">
              <DialogButton label="Cancelar" quiet onClick={() => setResetTarget(null)} />
              <DialogButton label="Guardar" type="submit" />
            </div>
          </form>
        </SysDialog>
      )}
      {confirmNode}
    </>
  )
}
