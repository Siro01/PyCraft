import { ARENA_COUNTDOWN_SECONDS, ARENA_DUEL_SECONDS, ARENA_EXERCISES, ARENA_TOPICS, normalizeOutput } from '@/lib/game/arena/rules'
import { ARENA_TOPIC_IDS, buildDuel, toPublic } from '@/lib/game/arena/generators'
import type { DuelEvent, MatchView } from '@/lib/game/arena/types'
import type { DuelTransport } from './transport'

// Rival simulado para /demo/arena: resuelve un ejercicio cada 45-90 s y a
// veces tira una daga. Sin servidor, sin diamantes, sin guardar nada.

const ME = 'yo'
const BOT = 'bot'

export function createSandboxDuel(): { initial: MatchView; transport: DuelTransport } {
  const topics = ARENA_TOPICS.filter((t) => ARENA_TOPIC_IDS.has(t.id))
  const topic = topics[Math.floor(Math.random() * topics.length)]
  const exercises = buildDuel(topic.id, topics, Math.floor(Math.random() * 2 ** 31))
  const t0 = Date.now()
  const startedAt = t0 + ARENA_COUNTDOWN_SECONDS * 1000
  const endsAt = startedAt + ARENA_DUEL_SECONDS * 1000

  const st = {
    status: 'active' as MatchView['status'],
    me: 0, bot: 0, meAt: 0, botAt: 0,
    winner: null as string | null,
    reason: null as string | null,
  }
  const listeners = new Set<(ev: DuelEvent) => void>()
  const emit = (ev: DuelEvent) => listeners.forEach((cb) => cb(ev))
  const timers: ReturnType<typeof setTimeout>[] = []

  const view = (): MatchView => ({
    id: 'demo', status: st.status, stake: 0, bossId: topic.id, actKey: topic.type, iChallenged: true,
    me: { id: ME, username: 'Docente', progress: st.me },
    rival: { id: BOT, username: 'Rival de práctica', progress: st.bot },
    exercises: exercises.map(toPublic),
    createdAt: new Date(t0).toISOString(), startedAt: new Date(startedAt).toISOString(), endsAt: new Date(endsAt).toISOString(),
    serverNow: new Date().toISOString(),
    winnerId: st.winner, endReason: st.reason,
  })

  const finish = (winner: string | null, reason: string) => {
    if (st.status !== 'active') return
    st.status = 'finished'; st.winner = winner; st.reason = reason
    timers.forEach(clearTimeout)
  }

  const timeoutCheck = () => {
    if (st.status !== 'active' || Date.now() < endsAt) return
    const w = st.me > st.bot ? ME : st.bot > st.me ? BOT : st.me === 0 ? null : st.meAt <= st.botAt ? ME : BOT
    finish(w, w ? 'timeout' : 'draw')
  }

  // El bot: resuelve de a uno y, a los ~25 s, tira una daga.
  const botSolve = () => {
    if (st.status !== 'active') return
    st.bot += 1; st.botAt = Date.now()
    if (st.bot >= ARENA_EXERCISES) finish(BOT, 'solved')
    emit({ type: 'progress', from: BOT })
    if (st.status === 'active') timers.push(setTimeout(botSolve, 45_000 + Math.random() * 45_000))
  }
  timers.push(setTimeout(botSolve, startedAt - t0 + 50_000 + Math.random() * 40_000))
  timers.push(setTimeout(() => emit({ type: 'item', from: BOT, to: ME, effect: 'freeze', seconds: 5, item: 'Daga' }), startedAt - t0 + 25_000))
  const typing = setInterval(() => { if (st.status === 'active' && Math.random() < 0.5) emit({ type: 'typing', from: BOT }) }, 3_000)

  const transport: DuelTransport = {
    async submit(idx, output) {
      timeoutCheck()
      const correct = st.status === 'active' && idx === st.me && normalizeOutput(output) === normalizeOutput(exercises[idx].expectedOutput)
      if (correct) {
        st.me += 1; st.meAt = Date.now()
        if (st.me >= ARENA_EXERCISES) finish(ME, 'solved')
      }
      return { correct, match: view() }
    },
    async refresh() { timeoutCheck(); return view() },
    async leave() { finish(BOT, 'forfeit'); return view() },
    send(ev) {
      // El bot tiene un escudo de vez en cuando.
      if (ev.type === 'item' && ev.effect !== 'taunt' && Math.random() < 0.3) {
        setTimeout(() => emit({ type: 'blocked', from: BOT, to: ME, reason: 'shield' }), 300)
      }
    },
    listen(cb) { listeners.add(cb); return () => { listeners.delete(cb) } },
    close() { timers.forEach(clearTimeout); clearInterval(typing); listeners.clear() },
    cheat: (idx) => exercises[idx]?.solution ?? '',
  }
  return { initial: view(), transport }
}
