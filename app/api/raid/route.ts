import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminClient } from '@/lib/test-student/server'
import { defeatedBy, getArenaCaller, type ArenaCaller } from '@/lib/game/arena/server'
import { normalizeOutput } from '@/lib/game/arena/rules'
import { TIER_COOKIE } from '@/lib/game/tiers'
import {
  ATTACK_BY_ID, BANDERA_HEAL, BENGALA_MS, PISTOLERO_HITS_PER_STUDENT, TEAM_HP_MAX, TEAM_HP_PER_MISS, type AttackId,
} from '@/lib/game/raid/pistolero'
import { PISTOLERO_BY_ID, PISTOLERO_EXERCISES, pickExercise } from '@/lib/game/raid/pistolero-ejercicios'
import {
  TASK_COLS, ensureTask, latestPistolero, livePistolero, loadRaid, myTaskView, raidView, tasksOf, tierFor, tierOfTasks,
  type RaidRow, type TaskRow,
} from '@/lib/game/raid/server'
import type { BoardState, StudentRaidState } from '@/lib/game/raid/types'

// API de las raids (por ahora, El Pistolero). El navegador nunca escribe en las
// tablas: todo pasa por acá (service role) y por las funciones de 014_raids.sql.
//
// GET              → alumno: estado del Pistolero en su aula y su ejercicio.
// GET ?aula=<id>   → docente: la Mesa completa (raid, envíos, alumnos, catálogo).
// POST { action }  → docente: arm · summon · start · judge · assign · attack · end · cancel
//                    alumno:  join · submit

const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })
const MIGRATION_HINT = ' — ¿ejecutaste la migración 014_raids.sql?'

async function aulaArmed(admin: SupabaseClient, aulaId: string): Promise<boolean> {
  const { data } = await admin.from('aulas').select('pistolero_armed').eq('id', aulaId).maybeSingle()
  return (data as { pistolero_armed?: boolean } | null)?.pistolero_armed === true
}

async function board(admin: SupabaseClient, aulaId: string): Promise<BoardState> {
  const [armed, live, { data: people }] = await Promise.all([
    aulaArmed(admin, aulaId),
    livePistolero(admin, aulaId).then((r) => r ?? latestPistolero(admin, aulaId)),
    admin.from('profiles').select('id, username, role').eq('aula_id', aulaId).order('username'),
  ])
  let tasks: TaskRow[] = []
  if (live) {
    const { data } = await admin.from('raid_tasks').select(TASK_COLS).eq('raid_id', live.id).order('created_at')
    tasks = (data ?? []) as TaskRow[]
  }
  const rosterRows = ((people ?? []) as { id: string; username: string; role: string }[]).filter((p) => p.role !== 'admin')
  const seenBy = await defeatedBy(admin, rosterRows.map((p) => p.id))
  const lastTier = new Map<string, TaskRow>()
  for (const t of tasks) lastTier.set(t.user_id, t)
  return {
    aulaId, armed,
    raid: live ? await raidView(admin, live) : null,
    tasks: tasks.map((t) => {
      const e = PISTOLERO_BY_ID.get(t.exercise_id)
      return {
        id: t.id, userId: t.user_id, exerciseId: t.exercise_id,
        title: e?.title ?? t.exercise_id, tier: e?.tier ?? 'junior', type: e?.type ?? 'python',
        status: t.status, code: t.code, output: t.output, autoOk: t.auto_ok, expected: e?.expected ?? '',
        createdAt: t.created_at, submittedAt: t.submitted_at,
      }
    }),
    roster: rosterRows.map((p) => ({
      id: p.id, username: p.username, tier: PISTOLERO_BY_ID.get(lastTier.get(p.id)?.exercise_id ?? '')?.tier ?? null,
      defeated: [...(seenBy.get(p.id) ?? [])],
    })),
    catalog: PISTOLERO_EXERCISES.map(({ id, needs, tier, type, title, description, hint, solution, expected }) => ({ id, needs, tier, type, title, description, hint, solution, expected })),
  }
}

async function studentState(admin: SupabaseClient, me: ArenaCaller): Promise<StudentRaidState> {
  const empty: StudentRaidState = { aulaId: me.aulaId, me: me.id, armed: false, raid: null, joined: false, task: null, lastVerdict: null, hint: null, bengalaUntil: 0 }
  if (!me.aulaId) return empty
  const armed = await aulaArmed(admin, me.aulaId)
  const live = await livePistolero(admin, me.aulaId) ?? await latestPistolero(admin, me.aulaId)
  // Un final viejo no se muestra: solo el de la última hora
  if (!live || (live.status !== 'lobby' && live.status !== 'active' && Date.now() - Date.parse(live.created_at) > 3_600_000)) return { ...empty, armed }
  const view = await raidView(admin, live)
  const joined = view.members.some((m) => m.id === me.id && m.state !== 'left')
  const tasks = joined ? await tasksOf(admin, live.id, me.id) : []
  const open = tasks.find((t) => t.status === 'asignado' || t.status === 'enviado')
  const judged = [...tasks].reverse().find((t) => t.status === 'correcto' || t.status === 'incorrecto')
  const bengalaUntil = live.status === 'active' ? Number(live.attacks?.bengala_until) || 0 : 0
  const lit = bengalaUntil > Date.now()
  return {
    ...empty, armed, raid: view, joined, task: myTaskView(open),
    lastVerdict: judged ? { taskId: judged.id, ok: judged.status === 'correcto' } : null,
    hint: lit && open ? PISTOLERO_BY_ID.get(open.exercise_id)?.hint ?? null : null,
    bengalaUntil: lit ? bengalaUntil : 0,
  }
}

// ─── GET ───────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const me = await getArenaCaller()
  if (!me) return err('No autenticado', 401)
  const admin = adminClient()
  try {
    const aulaId = request.nextUrl.searchParams.get('aula')
    if (me.isAdmin && aulaId) return NextResponse.json(await board(admin, aulaId))
    return NextResponse.json(await studentState(admin, me))
  } catch (e) {
    return err((e instanceof Error ? e.message : 'Error inesperado') + MIGRATION_HINT, 500)
  }
}

// ─── POST ──────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const me = await getArenaCaller()
  if (!me) return err('No autenticado', 401)
  const body = await request.json().catch(() => ({}))
  const admin = adminClient()
  const action = String(body.action ?? '')

  try {
    // ══ Docente ══════════════════════════════════════════════════════════════
    if (['arm', 'summon', 'start', 'judge', 'assign', 'attack', 'end', 'cancel'].includes(action)) {
      if (!me.isAdmin) return err('Sin permisos', 403)

      if (action === 'arm') {
        const aulaId = String(body.aulaId ?? '')
        const { error } = await admin.from('aulas').update({ pistolero_armed: body.armed === true }).eq('id', aulaId)
        if (error) return err(error.message + MIGRATION_HINT, 500)
        return NextResponse.json(await board(admin, aulaId))
      }

      if (action === 'summon') {
        const aulaId = String(body.aulaId ?? '')
        if (await livePistolero(admin, aulaId)) return err('Ya hay un duelo del Pistolero en esta aula.')
        const { data: row, error } = await admin.from('raids')
          .insert({ aula_id: aulaId, kind: 'pistolero', leader_id: me.id, status: 'lobby' }).select('id').single()
        if (error || !row) return err((error?.message ?? 'No se pudo crear el duelo') + MIGRATION_HINT, 500)
        await admin.rpc('raid_join', { p_raid: row.id, p_user: me.id, p_role: 'docente', p_hp_per_member: 0 })
        // Desenfundar arma el aula sola, por si el docente se olvidó
        await admin.from('aulas').update({ pistolero_armed: true }).eq('id', aulaId)
        return NextResponse.json(await board(admin, aulaId))
      }

      // El resto actúa sobre una raid o un envío
      if (action === 'judge') {
        const taskId = Number(body.taskId)
        const { data: t } = await admin.from('raid_tasks').select(TASK_COLS).eq('id', taskId).maybeSingle()
        const task = t as TaskRow | null
        if (!task) return err('Ese envío no existe.', 404)
        const ok = body.ok === true
        const { data: r, error } = await admin.rpc('raid_judge', { p_task: taskId, p_ok: ok, p_judge: me.id, p_miss_damage: TEAM_HP_PER_MISS })
        if (error) return err(error.message, 500)
        let raid = r as RaidRow
        // Espuelas: el acierto de quien las usó pega el doble (y se gastan)
        const spur = `espuelas:${task.user_id}`
        if (ok && raid.status === 'active' && raid.attacks?.[spur]) {
          const { [spur]: _gone, ...rest } = raid.attacks
          await admin.from('raids').update({ attacks: rest }).eq('id', raid.id)
          const { data: r2 } = await admin.rpc('raid_apply', { p_raid: raid.id, p_boss_delta: -1, p_team_delta: 0 })
          if (r2) raid = r2 as RaidRow
        }
        if (raid.status === 'active') {
          // ✔ → el siguiente; ✘ → el mismo otra vez (salvo que haya algo en cola)
          const tasks = await tasksOf(admin, task.raid_id, task.user_id)
          await ensureTask(admin, task.raid_id, task.user_id, tierOfTasks(tasks, 'junior'), ok ? undefined : task.exercise_id)
        }
        return NextResponse.json(await board(admin, raid.aula_id ?? ''))
      }

      const raid = await loadRaid(admin, String(body.raidId ?? ''))
      if (!raid) return err('Ese duelo no existe.', 404)
      const aulaId = raid.aula_id ?? ''

      if (action === 'start') {
        const { error } = await admin.rpc('raid_start', { p_raid: raid.id, p_hp_per_member: PISTOLERO_HITS_PER_STUDENT, p_team_hp: TEAM_HP_MAX })
        if (error) return err(error.message, 500)
        return NextResponse.json(await board(admin, aulaId))
      }

      if (action === 'assign') {
        const userId = String(body.userId ?? '')
        const ex = PISTOLERO_BY_ID.get(String(body.exerciseId ?? ''))
        if (!ex) return err('Ese ejercicio no existe.')
        await assignTo(admin, raid, userId, ex.id, me.id)
        return NextResponse.json(await board(admin, aulaId))
      }

      if (action === 'attack') {
        const attack = ATTACK_BY_ID[String(body.attackId ?? '') as AttackId]
        if (!attack) return err('Ese ataque no existe.')
        if (raid.status !== 'active') return err('El duelo no está en curso.')
        const used = raid.attacks?.[attack.id] ?? 0
        if (attack.maxUses && used >= attack.maxUses) return err(`${attack.name} ya se usó ${attack.maxUses} veces.`)
        await admin.from('raids').update({ attacks: { ...(raid.attacks ?? {}), [attack.id]: used + 1 } }).eq('id', raid.id)
        let target = String(body.targetId ?? '') || null
        if (attack.targeted && !target) {
          const { data: ms } = await admin.from('raid_members').select('user_id').eq('raid_id', raid.id).eq('role', 'alumno').neq('state', 'left')
          const list = (ms ?? []) as { user_id: string }[]
          target = list.length ? list[Math.floor(Math.random() * list.length)].user_id : null
        }
        if (attack.id === 'rafaga') await admin.rpc('raid_apply', { p_raid: raid.id, p_boss_delta: 0, p_team_delta: -attack.teamDamage })
        if (attack.id === 'recargar') await admin.rpc('raid_apply', { p_raid: raid.id, p_boss_delta: Math.ceil(raid.boss_hp_max * 0.1), p_team_delta: 0 })
        if (attack.id === 'ruleta' && target) {
          const tasks = await tasksOf(admin, raid.id, target)
          const seen = (await defeatedBy(admin, [target])).get(target) ?? new Set<string>()
          const ex = pickExercise(tierOfTasks(tasks, 'junior'), new Set(tasks.map((t) => t.exercise_id)), seen)
          await assignTo(admin, raid, target, ex.id, me.id)
        }
        // El efecto en pantalla lo manda la Mesa por el canal en tiempo real; acá va el blanco elegido
        return NextResponse.json({ ...(await board(admin, aulaId)), attack: { id: attack.id, targetId: target } })
      }

      if (action === 'end' || action === 'cancel') {
        // «Se acabó el tiempo» = gana el Pistolero. Cancelar = no pasó nada.
        const { error } = await admin.rpc('raid_settle', { p_raid: raid.id, p_status: action === 'end' ? 'lost' : 'cancelled' })
        if (error) return err(error.message, 500)
        return NextResponse.json(await board(admin, aulaId))
      }
    }

    // ══ Alumno ═══════════════════════════════════════════════════════════════
    if (action === 'join') {
      if (!me.aulaId) return err('No estás en ningún aula.')
      const raid = await livePistolero(admin, me.aulaId)
      if (!raid) return err('El Pistolero ya se fue.')
      const { error } = await admin.rpc('raid_join', { p_raid: raid.id, p_user: me.id, p_role: 'alumno', p_hp_per_member: PISTOLERO_HITS_PER_STUDENT })
      if (error) return err(error.message + MIGRATION_HINT, 500)
      const preferred = (await cookies()).get(TIER_COOKIE)?.value
      await ensureTask(admin, raid.id, me.id, await tierFor(admin, me.aulaId, preferred))
      return NextResponse.json(await studentState(admin, me))
    }

    if (action === 'item') {
      // Ítems del Mercader para el duelo (el Chaleco se resuelve en la pantalla del alumno)
      if (!me.aulaId) return err('No estás en ningún aula.')
      const raid = await livePistolero(admin, me.aulaId)
      if (!raid || raid.status !== 'active') return err('El duelo no está en curso.')
      const { data: member } = await admin.from('raid_members').select('state').eq('raid_id', raid.id).eq('user_id', me.id).maybeSingle()
      if (!member || (member as { state: string }).state === 'left') return err('No estás en el duelo.')
      const itemId = String(body.itemId ?? '')
      if (itemId === 'bandera') {
        await admin.rpc('raid_apply', { p_raid: raid.id, p_boss_delta: 0, p_team_delta: BANDERA_HEAL })
      } else if (itemId === 'espuelas') {
        if (raid.attacks?.[`espuelas:${me.id}`]) return err('Ya tenés las espuelas puestas: tu próximo acierto pega doble.')
        await admin.from('raids').update({ attacks: { ...(raid.attacks ?? {}), [`espuelas:${me.id}`]: 1 } }).eq('id', raid.id)
      } else if (itemId === 'bengala') {
        if ((Number(raid.attacks?.bengala_until) || 0) > Date.now()) return err('Ya hay una bengala en el cielo. Esperá a que se apague.')
        await admin.from('raids').update({ attacks: { ...(raid.attacks ?? {}), bengala_until: Date.now() + BENGALA_MS } }).eq('id', raid.id)
      } else if (itemId !== 'chaleco') {
        return err('Ese ítem no sirve en el duelo.')
      }
      return NextResponse.json(await studentState(admin, me))
    }

    if (action === 'submit') {
      const taskId = Number(body.taskId)
      const { data: t } = await admin.from('raid_tasks').select(TASK_COLS).eq('id', taskId).maybeSingle()
      const task = t as TaskRow | null
      if (!task || task.user_id !== me.id) return err('Ese ejercicio no es tuyo.', 404)
      if (task.status !== 'asignado') return err('Ese ejercicio ya se envió.')
      const raid = await loadRaid(admin, task.raid_id)
      if (!raid || raid.status !== 'active') return err('El duelo no está en curso.')
      const ex = PISTOLERO_BY_ID.get(task.exercise_id)
      const output = String(body.output ?? '').slice(0, 10_000)
      const code = String(body.code ?? '').slice(0, 10_000)
      const autoOk = !!ex && normalizeOutput(output) === normalizeOutput(ex.expected)
      await admin.from('raid_tasks')
        .update({ status: 'enviado', code, output, auto_ok: autoOk, submitted_at: new Date().toISOString() })
        .eq('id', taskId).eq('status', 'asignado')
      return NextResponse.json(await studentState(admin, me))
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Error inesperado', 500)
  }

  return err('Acción inválida')
}

/**
 * El docente le da un ejercicio a un alumno:
 * - si tiene uno abierto sin enviar, se lo cambia;
 * - si está esperando corrección (o todavía no entró), queda en cola para después.
 */
async function assignTo(admin: SupabaseClient, raid: RaidRow, userId: string, exerciseId: string, by: string) {
  const tasks = await tasksOf(admin, raid.id, userId)
  const open = tasks.find((t) => t.status === 'asignado')
  // Una sola cola por alumno: lo nuevo reemplaza lo que estaba esperando
  await admin.from('raid_tasks').update({ status: 'cambiado' }).eq('raid_id', raid.id).eq('user_id', userId).eq('status', 'en_cola')
  if (open) await admin.from('raid_tasks').update({ status: 'cambiado' }).eq('id', open.id)
  await admin.from('raid_tasks').insert({
    raid_id: raid.id, user_id: userId, exercise_id: exerciseId, assigned_by: by,
    status: open ? 'asignado' : 'en_cola',
  })
}
