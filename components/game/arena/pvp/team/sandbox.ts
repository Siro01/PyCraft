import { ARENA_COUNTDOWN_SECONDS, ARENA_TOPICS, normalizeOutput } from '@/lib/game/arena/rules'
import { ARENA_TOPIC_IDS, buildDuel, toPublic } from '@/lib/game/arena/generators'
import {
  applyRelay, applySolve, initialTasks, myTask, relayState, SENAS, solvedBy, TEAM_DUEL_SECONDS, TEAM_EXERCISES, timeoutWinner,
  type RoomSeat, type RoomTask, type Team,
} from '@/lib/game/arena/team'
import type { DuelEvent, RoomView } from '@/lib/game/arena/types'
import type { RoomTransport } from './transport'

// 2 vs 2 de práctica para /demo/arena: vos + un compañero bot (Equipo Espada)
// contra dos bots (Equipo Escudo). Usa las mismas reglas que el servidor
// (lib/game/arena/team.ts). Sin servidor, sin diamantes.

export const SANDBOX_ME = 'yo'

export function createSandboxRoom(): { initial: RoomView; transport: RoomTransport } {
  const topics = ARENA_TOPICS.filter((t) => ARENA_TOPIC_IDS.has(t.id))
  const topic = topics[Math.floor(Math.random() * topics.length)]
  const base = buildDuel(topic.id, topics, Math.floor(Math.random() * 2 ** 31), TEAM_EXERCISES)
  const t0 = Date.now()
  const startedAt = t0 + ARENA_COUNTDOWN_SECONDS * 1000
  const endsAt = startedAt + TEAM_DUEL_SECONDS * 1000

  const seat = (team: Team, slot: 1 | 2, userId: string, username: string): RoomSeat =>
    ({ team, slot, userId, username, role: 'alumno', ready: true, relays: 0, gone: false })
  const seats: RoomSeat[] = [
    seat('espada', 1, SANDBOX_ME, 'Docente'), seat('espada', 2, 'bot-luz', 'Luz (bot)'),
    seat('escudo', 1, 'bot-teo', 'Teo (bot)'), seat('escudo', 2, 'bot-ana', 'Ana (bot)'),
  ]
  let tasks: RoomTask[] = initialTasks(seats)
  let status: RoomView['status'] = 'active'
  let winner: Team | null = null
  let reason: string | null = null

  const listeners = new Set<(ev: DuelEvent) => void>()
  const emit = (ev: DuelEvent) => listeners.forEach((cb) => cb(ev))
  const timers: ReturnType<typeof setTimeout>[] = []
  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))

  const finish = (w: Team | null, why: string) => {
    if (status !== 'active') return
    status = 'finished'; winner = w; reason = why
    timers.forEach(clearTimeout)
  }
  const check = () => {
    for (const team of ['espada', 'escudo'] as Team[]) if (solvedBy(tasks, team) >= TEAM_EXERCISES) finish(team, 'solved')
    if (status === 'active' && Date.now() >= endsAt) { const w = timeoutWinner(tasks); finish(w, w ? 'timeout' : 'draw') }
  }

  const view = (): RoomView => ({
    id: 'demo-2v2', status, leaderId: SANDBOX_ME, bossId: topic.id, actKey: topic.type, stake: 0, needsTeacher: false,
    topics: [topic.id], seats: seats.map((s) => ({ ...s })),
    exercises: [...base, ...base.slice(0, 3)].map(toPublic),
    tasks: tasks.map((t) => ({ ...t })),
    createdAt: new Date(t0).toISOString(), startedAt: new Date(startedAt).toISOString(), endsAt: new Date(endsAt).toISOString(),
    serverNow: new Date().toISOString(), winnerTeam: winner, endReason: reason,
  })

  // Cada bot resuelve el suyo cada tanto; cuando termina su columna, hace relevo.
  const botLoop = (id: string, minS: number, maxS: number) => {
    const step = () => {
      if (status !== 'active') return
      const me = seats.find((s) => s.userId === id)!
      if (myTask(tasks, me.team, id)) {
        tasks = applySolve(tasks, me, Date.now())
        emit({ type: 'progress', from: id })
        check()
      } else if (relayState(tasks, seats, me) === 'ready') {
        tasks = applyRelay(tasks, me); me.relays += 1
        emit({ type: 'progress', from: id })
      }
      later((minS + Math.random() * (maxS - minS)) * 1000, step)
    }
    later(startedAt - t0 + (minS + Math.random() * (maxS - minS)) * 1000, step)
  }
  botLoop('bot-luz', 70, 120)
  botLoop('bot-teo', 45, 80)
  botLoop('bot-ana', 60, 100)
  later(startedAt - t0 + 20_000, () => emit({ type: 'item', from: 'bot-teo', to: SANDBOX_ME, effect: 'freeze', seconds: 5, item: 'Daga' }))
  later(startedAt - t0 + 35_000, () => emit({ type: 'sena', from: 'bot-luz', text: SENAS[0] }))
  const typing = setInterval(() => {
    if (status !== 'active') return
    const who = ['bot-luz', 'bot-teo', 'bot-ana'][Math.floor(Math.random() * 3)]
    emit({ type: 'typing', from: who })
  }, 3_000)

  const transport: RoomTransport = {
    async solve(idx, output) {
      check()
      const me = seats[0]
      const cur = myTask(tasks, me.team, SANDBOX_ME)
      const correct = status === 'active' && !!cur && cur.idx === idx && normalizeOutput(output) === normalizeOutput(base[cur.ex % TEAM_EXERCISES].expectedOutput)
      if (correct) { tasks = applySolve(tasks, me, Date.now()); check() }
      return { correct, room: view() }
    },
    async relay() {
      const me = seats[0]
      if (relayState(tasks, seats, me) !== 'ready') throw new Error('Todavía no podés hacer relevo.')
      tasks = applyRelay(tasks, me); me.relays += 1
      return view()
    },
    async refresh() { check(); return view() },
    async leave() { finish('escudo', 'forfeit'); return view() },
    async ready() { return view() },
    async callTeacher() { return view() },
    send(ev) {
      if (ev.type === 'item' && ev.effect !== 'taunt' && Math.random() < 0.3) {
        setTimeout(() => emit({ type: 'blocked', from: ev.to, to: SANDBOX_ME, reason: 'shield' }), 300)
      }
      if (ev.type === 'sena') setTimeout(() => emit({ type: 'sena', from: 'bot-luz', text: SENAS[0] }), 1200)
    },
    listen(cb) { listeners.add(cb); return () => { listeners.delete(cb) } },
    close() { timers.forEach(clearTimeout); clearInterval(typing); listeners.clear() },
    cheat: (ex) => base[ex % TEAM_EXERCISES]?.solution ?? '',
  }
  return { initial: view(), transport }
}
