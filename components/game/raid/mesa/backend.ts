// De dónde saca la Mesa del Pistolero sus datos:
// - `liveBackend`: la API real (/api/raid) + los canales de Supabase Realtime.
// - `demoBackend`: un ensayo en memoria con alumnos de mentira que entran,
//   escriben y mandan respuestas solos (para practicar el evento y para la
//   vitrina /demo/pistolero). No toca la base.

import type { SupabaseClient } from '@supabase/supabase-js'
import { ATTACK_BY_ID, PISTOLERO_HITS_PER_STUDENT, TEAM_HP_MAX, TEAM_HP_PER_MISS, type AttackId } from '@/lib/game/raid/pistolero'
import { aulaTopic, callRaid, getRaid, openRaidChannel, raidTopic, type RaidChannel, type RaidEvent } from '@/lib/game/raid/live'
import type { BoardState, BoardTask, CatalogEntry, RaidView, TaskStatus } from '@/lib/game/raid/types'
import type { ChallengeTier } from '@/types'

export type MesaResult = BoardState & { attack?: { id: AttackId; targetId: string | null } }

export interface MesaBackend {
  load(): Promise<BoardState>
  act(body: Record<string, unknown>): Promise<MesaResult>
  /** Escucha el aula y (si hay) la raid. Devuelve cómo dejar de escuchar. */
  watch(raidId: string | null, onEvent: (ev: RaidEvent) => void): () => void
  /** Manda un aviso a la raid (o al aula entera con `toAula`). */
  send(ev: RaidEvent, toAula?: boolean): void
}

// ─── Real ────────────────────────────────────────────────────────────────────

export function liveBackend(supabase: SupabaseClient, aulaId: string): MesaBackend {
  let aulaCh: RaidChannel | null = null
  let raidCh: RaidChannel | null = null
  return {
    load: () => getRaid<BoardState>(`?aula=${encodeURIComponent(aulaId)}`),
    act: (body) => callRaid<MesaResult>({ ...body, aulaId: body.aulaId ?? aulaId }),
    watch(raidId, onEvent) {
      aulaCh = openRaidChannel(supabase, aulaTopic(aulaId), onEvent)
      raidCh = raidId ? openRaidChannel(supabase, raidTopic(raidId), onEvent) : null
      return () => { aulaCh?.close(); raidCh?.close(); aulaCh = null; raidCh = null }
    },
    send(ev, toAula) { (toAula ? aulaCh : raidCh ?? aulaCh)?.send(ev) },
  }
}

// ─── Ensayo ──────────────────────────────────────────────────────────────────

const DEMO_CATALOG: CatalogEntry[] = [
  { id: 'demo-py-1', needs: 'creeper-formulario', tier: 'junior', type: 'python', title: 'Seis balas', description: 'Guardá 6 en balas.', hint: 'balas = 6', solution: 'balas = 6\nprint("Balas en el tambor:", balas)', expected: 'Balas en el tambor: 6' },
  { id: 'demo-py-2', needs: 'golem-infinito', tier: 'junior', type: 'python', title: 'Cuenta regresiva', description: 'Contá 3, 2, 1.', hint: 'paso -1', solution: 'for i in range(3, 0, -1):\n    print(i)\nprint("¡Fuego!")', expected: '3\n2\n1\n¡Fuego!' },
  { id: 'demo-sql-1', needs: 'oraculo-oscuro', tier: 'junior', type: 'sql', title: 'Los más buscados', description: 'Recompensa mayor a 100.', hint: '>', solution: 'SELECT nombre FROM buscados WHERE recompensa > 100;', expected: 'Juana Gatillo\nEl Tuerto Ramírez\nRosita Pólvora' },
  { id: 'demo-py-3', needs: 'mercader-abismo', tier: 'trainee', type: 'python', title: 'Contar el botín', description: 'Sumá las bolsas.', hint: 'sum()', solution: 'print(sum([12, 30, 8, 50]))', expected: '100' },
  { id: 'demo-sql-2', needs: 'contador-almas', tier: 'trainee', type: 'sql', title: 'Botín por pueblo', description: 'SUM por pueblo.', hint: 'GROUP BY', solution: 'SELECT pueblo, SUM(recompensa) FROM buscados GROUP BY pueblo ORDER BY pueblo;', expected: 'Cactus Seco|210\nPolvorín|370\nRío Bravo|120' },
  { id: 'demo-py-4', needs: 'maestro-craftero', tier: 'senior', type: 'python', title: 'Duelo al amanecer', description: 'Función duelo(a, b).', hint: 'return', solution: 'def duelo(a, b): ...', expected: 'Gana A\nGana B\nEmpate' },
]

// Cada uno venció distintos jefes: así se ve que nadie recibe un tema que no vio
const PY4 = ['creeper-formulario', 'guardian-puerta', 'golem-infinito', 'mercader-abismo']
const HASTA_SQL = [...PY4, 'maestro-craftero', 'archivista', 'constructor-vacio', 'oraculo-oscuro', 'contador-almas']
const DEMO_STUDENTS: { id: string; username: string; tier: ChallengeTier; skill: number; defeated: string[] }[] = [
  { id: 'bot-1', username: 'agus', tier: 'junior', skill: 0.8, defeated: PY4 },
  { id: 'bot-2', username: 'cami', tier: 'trainee', skill: 0.7, defeated: HASTA_SQL },
  { id: 'bot-3', username: 'lucho', tier: 'junior', skill: 0.5, defeated: PY4.slice(0, 3) },
  { id: 'bot-4', username: 'mili', tier: 'senior', skill: 0.85, defeated: HASTA_SQL },
  { id: 'bot-5', username: 'tomi', tier: 'junior', skill: 0.4, defeated: PY4 },
  { id: 'bot-6', username: 'valen', tier: 'trainee', skill: 0.65, defeated: PY4 },
]

const WRONG = ['Balas en el tambor: 5', '3\n2\n1', 'Juana Gatillo', '99', 'Polvorín|370', 'Gana A\nGana A\nEmpate', 'NameError: name \'bala\' is not defined']

export function demoBackend(aulaId: string): MesaBackend {
  let armed = false
  let raid: RaidView | null = null
  let tasks: BoardTask[] = []
  let nextTask = 1
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let listener: ((ev: RaidEvent) => void) | null = null
  const later = (ms: number, fn: () => void) => { const t = setTimeout(() => { timers.delete(t); fn() }, ms); timers.add(t) }
  const emit = (ev: RaidEvent) => listener?.(ev)
  const live = () => raid && (raid.status === 'lobby' || raid.status === 'active')

  const snapshot = (): BoardState => ({
    aulaId, armed,
    raid: raid ? { ...raid, members: raid.members.map((m) => ({ ...m })) } : null,
    tasks: tasks.map((t) => ({ ...t })),
    roster: DEMO_STUDENTS.map((s) => ({ id: s.id, username: s.username, tier: s.tier, defeated: s.defeated })),
    catalog: DEMO_CATALOG,
  })

  const settle = (status: 'won' | 'lost' | 'cancelled') => {
    if (!raid || !live()) return
    raid.status = status
    tasks.forEach((t) => { if (t.status === 'asignado' || t.status === 'en_cola') t.status = 'cambiado' })
  }

  const applyHp = (boss: number, team: number) => {
    if (!raid || raid.status !== 'active') return
    raid.bossHp = Math.max(0, Math.min(raid.bossHpMax, raid.bossHp + boss))
    if (raid.teamHp !== null && raid.teamHpMax !== null) raid.teamHp = Math.max(0, Math.min(raid.teamHpMax, raid.teamHp + team))
    if (raid.bossHp <= 0) settle('won')
    else if (raid.teamHp !== null && raid.teamHp <= 0) settle('lost')
  }

  const newTask = (userId: string, exerciseId: string, status: TaskStatus = 'asignado') => {
    const e = DEMO_CATALOG.find((c) => c.id === exerciseId)!
    const t: BoardTask = {
      id: nextTask++, userId, exerciseId, title: e.title, tier: e.tier, type: e.type, status,
      code: null, output: null, autoOk: null, expected: e.expected, createdAt: new Date().toISOString(), submittedAt: null,
    }
    tasks.push(t)
    return t
  }

  const ensureTask = (userId: string, retry?: string) => {
    const mine = tasks.filter((t) => t.userId === userId)
    if (mine.some((t) => t.status === 'asignado' || t.status === 'enviado')) return
    const queued = mine.find((t) => t.status === 'en_cola')
    if (queued) { queued.status = 'asignado'; botWork(userId); return }
    const s = DEMO_STUDENTS.find((x) => x.id === userId)!
    const used = new Set(mine.map((t) => t.exerciseId))
    const seen = DEMO_CATALOG.filter((c) => s.defeated.includes(c.needs))
    const order = s.tier === 'senior' ? ['senior', 'trainee', 'junior'] : s.tier === 'trainee' ? ['trainee', 'junior'] : ['junior']
    const pool = order.map((t) => seen.filter((c) => c.tier === t && !used.has(c.id))).find((l) => l.length) ?? seen
    const pick = retry ?? pool[Math.floor(Math.random() * pool.length)].id
    newTask(userId, pick)
    botWork(userId)
  }

  // Un alumno de mentira «escribe» un rato y manda (bien o mal según su habilidad)
  const botWork = (userId: string) => {
    const s = DEMO_STUDENTS.find((x) => x.id === userId)!
    for (let k = 1; k <= 2; k++) later(1500 * k, () => live() && emit({ type: 'typing', userId }))
    later(5000 + Math.random() * 9000, () => {
      const t = tasks.find((x) => x.userId === userId && x.status === 'asignado')
      if (!t || raid?.status !== 'active') return
      const ok = Math.random() < s.skill
      const e = DEMO_CATALOG.find((c) => c.id === t.exerciseId)!
      t.status = 'enviado'
      t.code = ok ? e.solution : e.solution.replace(/\d/, (d) => String((Number(d) + 1) % 10)) // un número cambiado
      t.output = ok ? e.expected : WRONG[Math.floor(Math.random() * WRONG.length)]
      t.autoOk = ok
      t.submittedAt = new Date().toISOString()
      emit({ type: 'submitted', userId })
    })
  }

  return {
    async load() { return snapshot() },
    // los alumnos de mentira siguen jugando aunque la Mesa cambie de canal
    watch(_raidId, onEvent) { listener = onEvent; return () => { if (listener === onEvent) listener = null } },
    send() { /* en el ensayo no hay a quién avisar */ },
    async act(body) {
      const action = String(body.action)
      if (action === 'arm') armed = body.armed === true
      if (action === 'summon' && !live()) {
        armed = true
        tasks = []
        raid = {
          id: `demo-${Date.now()}`, kind: 'pistolero', status: 'lobby', bossHp: 0, bossHpMax: 0, teamHp: null, teamHpMax: null,
          attacks: {}, startedAt: null, members: [{ id: 'docente', username: 'docente', role: 'docente', state: 'alive', solved: 0 }],
        }
        // los alumnos van entrando de a uno
        DEMO_STUDENTS.forEach((s, i) => later(700 + i * 650, () => {
          if (!live() || !raid) return
          raid.members.push({ id: s.id, username: s.username, role: 'alumno', state: 'alive', solved: 0 })
          if (raid.status === 'active') { raid.bossHp += PISTOLERO_HITS_PER_STUDENT; raid.bossHpMax += PISTOLERO_HITS_PER_STUDENT }
          ensureTask(s.id)
          emit({ type: 'joined', userId: s.id })
        }))
      }
      if (action === 'start' && raid?.status === 'lobby') {
        const n = raid.members.filter((m) => m.role === 'alumno').length
        raid.status = 'active'
        raid.startedAt = new Date().toISOString()
        raid.bossHp = raid.bossHpMax = Math.max(4, n * PISTOLERO_HITS_PER_STUDENT)
        raid.teamHp = raid.teamHpMax = TEAM_HP_MAX
        tasks.filter((t) => t.status === 'asignado').forEach((t) => botWork(t.userId))
      }
      if (action === 'judge') {
        const t = tasks.find((x) => x.id === Number(body.taskId))
        if (t && t.status === 'enviado' && raid?.status === 'active') {
          const ok = body.ok === true
          t.status = ok ? 'correcto' : 'incorrecto'
          if (ok) { const m = raid.members.find((x) => x.id === t.userId); if (m) m.solved++; applyHp(-1, 0) } else applyHp(0, -TEAM_HP_PER_MISS)
          if (live()) ensureTask(t.userId, ok ? undefined : t.exerciseId)
        }
      }
      if (action === 'assign') {
        const userId = String(body.userId)
        const open = tasks.find((t) => t.userId === userId && t.status === 'asignado')
        tasks.filter((t) => t.userId === userId && t.status === 'en_cola').forEach((t) => { t.status = 'cambiado' })
        if (open) open.status = 'cambiado'
        newTask(userId, String(body.exerciseId), open ? 'asignado' : 'en_cola')
        if (open) botWork(userId)
      }
      let attack: MesaResult['attack']
      if (action === 'attack' && raid?.status === 'active') {
        const a = ATTACK_BY_ID[String(body.attackId) as AttackId]
        const used = raid.attacks[a.id] ?? 0
        if (a.maxUses && used >= a.maxUses) throw new Error(`${a.name} ya se usó ${a.maxUses} veces.`)
        raid.attacks[a.id] = used + 1
        const alumnos = raid.members.filter((m) => m.role === 'alumno')
        const targetId = a.targeted ? (String(body.targetId ?? '') || alumnos[Math.floor(Math.random() * alumnos.length)]?.id || null) : null
        if (a.id === 'rafaga') applyHp(0, -a.teamDamage)
        if (a.id === 'recargar') applyHp(Math.ceil(raid.bossHpMax * 0.1), 0)
        if (a.id === 'ruleta' && targetId) {
          const s = DEMO_STUDENTS.find((x) => x.id === targetId)
          const pool = DEMO_CATALOG.filter((c) => s?.defeated.includes(c.needs))
          const open = tasks.find((t) => t.userId === targetId && t.status === 'asignado')
          if (open) open.status = 'cambiado'
          newTask(targetId, pool[Math.floor(Math.random() * pool.length)].id)
          botWork(targetId)
        }
        attack = { id: a.id, targetId }
      }
      if (action === 'end') settle('lost')
      if (action === 'cancel') settle('cancelled')
      return { ...snapshot(), attack }
    },
  }
}
