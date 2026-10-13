import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminClient } from '@/lib/test-student/server'
import { defeatedBy, getArenaCaller, type ArenaCaller } from '@/lib/game/arena/server'
import { normalizeOutput } from '@/lib/game/arena/rules'
import { TIER_COOKIE } from '@/lib/game/tiers'
import { CHALLENGES } from '@/lib/game/challenges'
import {
  SECRET_HEAL_RATIO, SECRET_PLAYER_HP, SECRET_WRONG_DAMAGE, buildSecretSeries, getSecretBoss, nextRemate, secretHitDamage, secretUnlock, seededRng,
} from '@/lib/game/secret/bosses'
import {
  RAID_ABANDON_PENALTY, RAID_BANDERA_HP, RAID_GRACE_SECONDS, RAID_MAX_MEMBERS, RAID_MIN_MEMBERS, RAID_RESCUE_HP, RAID_UNLOCK_DEFEATED,
  TEACHER_HEALS, TEACHER_HEAL_HP, TEACHER_REVIVES,
  type RaidChallengePublic, type SecretFightState, type SecretLobbyState, type SecretRaidMember, type SecretRaidView,
} from '@/lib/game/raid/secret-raid'
import { RAID_COLS, loadRaid, tierFor, type RaidRow } from '@/lib/game/raid/server'
import { SHOP_CATALOG } from '@/lib/game/shop'
import type { Challenge, ChallengeTier, OwnedShopItem } from '@/types'

// API de las raids contra los jefes secretos (equipos de 2 a 4).
// El navegador nunca escribe en las tablas: todo pasa por acá (service role) y
// por las funciones de 014/015 (raid_join, raid_hit, raid_leave, raid_settle).
// La salida esperada de cada ejercicio se compara ACÁ: el alumno solo manda lo
// que imprimió su código.
//
// GET              → lobby: guaridas que puede liderar, raids del aula, la suya.
// GET ?raid=<id>   → pelea: estado de la raid y el ejercicio de este alumno.
// POST { action }  → create · join · leave · start · submit · rescue · item · support · ping

const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })
const MIGRATION_HINT = ' — ¿ejecutaste la migración 015_raids_secretos.sql?'
const CH_BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]))

interface MemberRow {
  user_id: string
  role: 'alumno' | 'docente'
  state: 'alive' | 'down' | 'left'
  hp: number
  solved: number
  step: number
  rescuing: string | null
  last_seen: string
  series: string[]
  tier: ChallengeTier | null
}
const MEMBER_COLS = 'user_id, role, state, hp, solved, step, rescuing, last_seen, series, tier'

async function membersOf(admin: SupabaseClient, raidId: string): Promise<MemberRow[]> {
  const { data, error } = await admin.from('raid_members').select(MEMBER_COLS).eq('raid_id', raidId)
  if (error) throw new Error(error.message + MIGRATION_HINT)
  return (data ?? []) as MemberRow[]
}

const seedOf = (raidId: string, userId: string) => {
  let h = 2166136261
  for (const ch of raidId + userId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

const COSMETIC = new Map(SHOP_CATALOG.filter((i) => i.cosmetic).map((i) => [i.id, i.cosmetic!]))

/** Título y estandarte de cada uno: lo último que compró de cada tipo (game_extras.shop viaja a la nube). */
async function cosmeticsOf(admin: SupabaseClient, ids: string[]): Promise<Map<string, { title: string | null; banner: string | null }>> {
  const out = new Map<string, { title: string | null; banner: string | null }>()
  if (!ids.length) return out
  const { data } = await admin.from('game_extras').select('user_id, shop').in('user_id', ids)
  for (const row of (data ?? []) as { user_id: string; shop: OwnedShopItem[] | null }[]) {
    const owned = [...(row.shop ?? [])].sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt))
    let title: string | null = null
    let banner: string | null = null
    for (const o of owned) {
      const c = COSMETIC.get(o.id)
      if (c?.kind === 'titulo') title = c.value
      if (c?.kind === 'estandarte') banner = c.value
    }
    out.set(row.user_id, { title, banner })
  }
  return out
}

async function viewOf(admin: SupabaseClient, r: RaidRow, rows?: MemberRow[]): Promise<SecretRaidView> {
  const ms = rows ?? await membersOf(admin, r.id)
  const ids = ms.map((m) => m.user_id)
  const [{ data: people }, looks] = await Promise.all([
    ids.length ? admin.from('profiles').select('id, username').in('id', ids) : Promise.resolve({ data: [] }),
    cosmeticsOf(admin, [...new Set([...ids, r.leader_id])]),
  ])
  const names = new Map(((people ?? []) as { id: string; username: string }[]).map((p) => [p.id, p.username]))
  const members: SecretRaidMember[] = ms.filter((m) => m.state !== 'left').map((m) => ({
    id: m.user_id, username: names.get(m.user_id) ?? '¿?', role: m.role, state: m.state, hp: m.hp, solved: m.solved, step: m.step, rescuing: m.rescuing,
    title: m.role === 'alumno' ? looks.get(m.user_id)?.title ?? null : null,
  }))
  return {
    id: r.id, bossId: r.boss_id ?? '', leaderId: r.leader_id, status: r.status,
    bossHp: r.boss_hp, bossHpMax: r.boss_hp_max, members,
    support: { heals: TEACHER_HEALS - (Number(r.attacks?.heals) || 0), revives: TEACHER_REVIVES - (Number(r.attacks?.revives) || 0) },
    banner: looks.get(r.leader_id)?.banner ?? null,
    createdAt: r.created_at,
  }
}

/** Quien no da señales de vida hace más de 60 s se fue (en pelea, cuenta como abandono). */
async function sweepGone(admin: SupabaseClient, r: RaidRow, rows: MemberRow[]): Promise<boolean> {
  if (r.status !== 'lobby' && r.status !== 'active') return false
  const cutoff = Date.now() - RAID_GRACE_SECONDS * 1000
  const gone = rows.filter((m) => m.role === 'alumno' && m.state !== 'left' && Date.parse(m.last_seen) < cutoff)
  for (const m of gone) {
    await admin.rpc('raid_leave', { p_raid: r.id, p_user: m.user_id, p_penalty: r.status === 'active' ? RAID_ABANDON_PENALTY : 0 })
  }
  return gone.length > 0
}

/** Raid viva (lobby o pelea) en la que está este usuario, si hay. */
async function liveRaidOf(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await admin.from('raid_members').select('raid_id, state, raids!inner(status, kind)')
    .eq('user_id', userId).neq('state', 'left').in('raids.status', ['lobby', 'active']).eq('raids.kind', 'secreto').limit(1)
  return ((data ?? []) as { raid_id: string }[])[0]?.raid_id ?? null
}

function publicChallenge(c: Challenge): RaidChallengePublic {
  return { id: c.id, type: c.type, tier: c.tier, title: c.title, description: c.description, initialCode: c.initialCode, seedSQL: c.seedSQL, verifySQL: c.verifySQL }
}

/** El ejercicio que le toca; si ya terminó su serie y el jefe sigue en pie, le agrega un remate. */
async function currentChallenge(admin: SupabaseClient, r: RaidRow, m: MemberRow): Promise<Challenge | null> {
  if (m.step < m.series.length) return CH_BY_ID.get(m.series[m.step]) ?? null
  const secret = getSecretBoss(r.boss_id ?? '')
  if (!secret) return null
  const defeated = (await defeatedBy(admin, [m.user_id])).get(m.user_id) ?? new Set<string>()
  const have = m.series.map((id) => CH_BY_ID.get(id)).filter((c): c is Challenge => !!c)
  const extra = nextRemate(secret, defeated, m.tier ?? 'junior', seedOf(r.id, m.user_id), have)
    ?? buildSecretSeries(secret, defeated, m.tier ?? 'junior', seededRng(seedOf(r.id, m.user_id) + m.step))[0]
  if (!extra) return null
  await admin.from('raid_members').update({ series: [...m.series, extra.id] }).eq('raid_id', r.id).eq('user_id', m.user_id)
  return extra
}

async function lobbyState(admin: SupabaseClient, me: ArenaCaller): Promise<SecretLobbyState> {
  const defeated = me.isAdmin ? new Set<string>() : (await defeatedBy(admin, [me.id])).get(me.id) ?? new Set<string>()
  const { SECRET_BOSSES } = await import('@/lib/game/secret/bosses')
  const canLead = me.isAdmin || defeated.size < RAID_UNLOCK_DEFEATED ? [] : SECRET_BOSSES.filter((s) => secretUnlock(s, defeated).open).map((s) => s.id)
  let q = admin.from('raids').select(RAID_COLS).eq('kind', 'secreto').in('status', ['lobby', 'active']).order('created_at', { ascending: false }).limit(20)
  if (!me.isAdmin) q = q.eq('aula_id', me.aulaId ?? '00000000-0000-0000-0000-000000000000')
  const { data, error } = await q
  if (error) throw new Error(error.message + MIGRATION_HINT)
  const raids: SecretRaidView[] = []
  for (const r of (data ?? []) as RaidRow[]) {
    const rows = await membersOf(admin, r.id)
    if (await sweepGone(admin, r, rows)) {
      const fresh = await loadRaid(admin, r.id)
      if (fresh && (fresh.status === 'lobby' || fresh.status === 'active')) raids.push(await viewOf(admin, fresh))
    } else raids.push(await viewOf(admin, r, rows))
  }
  const { data: firsts } = await admin.from('raid_firsts').select('boss_id').eq('user_id', me.id)
  return {
    me: me.id, isAdmin: me.isAdmin, aulaId: me.aulaId, defeated: defeated.size, canLead, raids,
    mine: await liveRaidOf(admin, me.id),
    firsts: ((firsts ?? []) as { boss_id: string }[]).map((f) => f.boss_id),
  }
}

async function fightState(admin: SupabaseClient, me: ArenaCaller, raidId: string): Promise<SecretFightState | null> {
  let r = await loadRaid(admin, raidId)
  if (!r || r.kind !== 'secreto') return null
  let rows = await membersOf(admin, r.id)
  if (await sweepGone(admin, r, rows)) {
    r = (await loadRaid(admin, raidId))!
    rows = await membersOf(admin, r.id)
  }
  const mine = rows.find((m) => m.user_id === me.id)
  const challenge = r.status === 'active' && mine?.role === 'alumno' && mine.state === 'alive' ? await currentChallenge(admin, r, mine) : null
  let loot: SecretFightState['loot'] = null
  if (r.status === 'won') {
    const { data } = await admin.from('raid_ledger').select('delta, xp').eq('raid_id', r.id).eq('user_id', me.id)
    const rowsL = (data ?? []) as { delta: number; xp: number }[]
    loot = { diamonds: rowsL.reduce((s, l) => s + l.delta, 0), xp: rowsL.reduce((s, l) => s + l.xp, 0) }
  }
  return { me: me.id, raid: await viewOf(admin, r), challenge: challenge ? publicChallenge(challenge) : null, round: (mine?.step ?? 0) + 1, loot }
}

// ─── GET ───────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const me = await getArenaCaller()
  if (!me) return err('No autenticado', 401)
  const admin = adminClient()
  try {
    const raidId = request.nextUrl.searchParams.get('raid')
    if (raidId) {
      const st = await fightState(admin, me, raidId)
      return st ? NextResponse.json(st) : err('Esa raid no existe.', 404)
    }
    return NextResponse.json(await lobbyState(admin, me))
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Error inesperado', 500)
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
    if (action === 'create') {
      if (me.isAdmin) return err('El docente no arma raids: se suma a una como apoyo.')
      if (!me.aulaId) return err('No estás en ningún aula.')
      const secret = getSecretBoss(String(body.bossId ?? ''))
      if (!secret) return err('Ese jefe no existe.')
      const defeated = (await defeatedBy(admin, [me.id])).get(me.id) ?? new Set<string>()
      if (defeated.size < RAID_UNLOCK_DEFEATED) return err(`Las raids se abren al derrotar ${RAID_UNLOCK_DEFEATED} jefes.`)
      if (!secretUnlock(secret, defeated).open) return err(`Para liderar la raid contra ${secret.name} necesitás tener su guarida abierta.`)
      if (await liveRaidOf(admin, me.id)) return err('Ya estás en otra raid.')
      const { data: row, error } = await admin.from('raids')
        .insert({ aula_id: me.aulaId, kind: 'secreto', boss_id: secret.id, leader_id: me.id, status: 'lobby' }).select('id').single()
      if (error || !row) return err((error?.message ?? 'No se pudo crear la raid') + MIGRATION_HINT, 500)
      await joinAs(admin, row.id, me, 'alumno')
      return NextResponse.json({ raidId: row.id })
    }

    const raid = await loadRaid(admin, String(body.raidId ?? ''))
    if (!raid || raid.kind !== 'secreto') return err('Esa raid no existe.', 404)
    if (!me.isAdmin && raid.aula_id !== me.aulaId) return err('Esa raid es de otra aula.', 403)
    const rows = await membersOf(admin, raid.id)
    const mine = rows.find((m) => m.user_id === me.id && m.state !== 'left')
    const done = () => fightState(admin, me, raid.id).then((st) => NextResponse.json(st))

    if (action === 'join') {
      if (mine) return done()
      if (me.isAdmin) {
        if (raid.status !== 'lobby' && raid.status !== 'active') return err('Esa raid ya terminó.')
        await joinAs(admin, raid.id, me, 'docente')
        return done()
      }
      if (raid.status !== 'lobby') return err('Esa raid ya empezó.')
      if (rows.filter((m) => m.role === 'alumno' && m.state !== 'left').length >= RAID_MAX_MEMBERS) return err(`La raid ya tiene ${RAID_MAX_MEMBERS} integrantes.`)
      const defeated = (await defeatedBy(admin, [me.id])).get(me.id) ?? new Set<string>()
      if (defeated.size < RAID_UNLOCK_DEFEATED) return err(`Las raids se abren al derrotar ${RAID_UNLOCK_DEFEATED} jefes.`)
      if (await liveRaidOf(admin, me.id)) return err('Ya estás en otra raid.')
      await joinAs(admin, raid.id, me, 'alumno')
      return done()
    }

    if (!mine) return err('No estás en esta raid.', 403)
    await admin.from('raid_members').update({ last_seen: new Date().toISOString() }).eq('raid_id', raid.id).eq('user_id', me.id)

    if (action === 'ping') return done()

    if (action === 'leave') {
      const { error } = await admin.rpc('raid_leave', { p_raid: raid.id, p_user: me.id, p_penalty: raid.status === 'active' ? RAID_ABANDON_PENALTY : 0 })
      if (error) return err(error.message, 500)
      return done()
    }

    if (action === 'start') {
      if (raid.leader_id !== me.id) return err('Solo quien armó la raid la puede empezar.')
      if (raid.status !== 'lobby') return err('La raid ya empezó.')
      const secret = getSecretBoss(raid.boss_id ?? '')!
      const alumnos = rows.filter((m) => m.role === 'alumno' && m.state !== 'left')
      if (alumnos.length < RAID_MIN_MEMBERS) return err(`Hacen falta al menos ${RAID_MIN_MEMBERS} integrantes.`)
      const defeated = await defeatedBy(admin, alumnos.map((m) => m.user_id))
      for (const m of alumnos) {
        const series = buildSecretSeries(secret, defeated.get(m.user_id) ?? [], m.tier ?? 'junior', seededRng(seedOf(raid.id, m.user_id))).map((c) => c.id)
        await admin.from('raid_members').update({ series, step: 0, hp: SECRET_PLAYER_HP, state: 'alive', last_seen: new Date().toISOString() })
          .eq('raid_id', raid.id).eq('user_id', m.user_id)
      }
      const hp = secret.hpMax * alumnos.length
      await admin.from('raids').update({ status: 'active', boss_hp: hp, boss_hp_max: hp, started_at: new Date().toISOString() }).eq('id', raid.id).eq('status', 'lobby')
      return done()
    }

    if (raid.status !== 'active') return err('La raid no está en pelea.')
    const secret = getSecretBoss(raid.boss_id ?? '')!

    if (action === 'submit') {
      if (mine.role !== 'alumno' || mine.state !== 'alive') return err('Ahora no podés atacar.')
      const ch = await currentChallenge(admin, raid, mine)
      if (!ch) return err('No hay ejercicio.')
      if (String(body.challengeId ?? '') !== ch.id) return done() // envío viejo (doble clic): no cuenta
      const output = String(body.output ?? '').slice(0, 10_000)
      const ok = normalizeOutput(output) === normalizeOutput(ch.expectedOutput)
      // Espuelas: el próximo acierto pega doble (y se gastan)
      const spur = `espuelas:${me.id}`
      let damage = secretHitDamage(secret)
      if (ok && raid.attacks?.[spur]) {
        damage *= 2
        const { [spur]: _gone, ...rest } = raid.attacks
        await admin.from('raids').update({ attacks: rest }).eq('id', raid.id)
      }
      const { error } = await admin.rpc('raid_hit', {
        p_raid: raid.id, p_user: me.id, p_ok: ok, p_damage: damage, p_miss: SECRET_WRONG_DAMAGE,
        p_heal: Math.ceil(secret.hpMax * SECRET_HEAL_RATIO), p_rescue_hp: RAID_RESCUE_HP,
      })
      if (error) return err(error.message + MIGRATION_HINT, 500)
      const st = await fightState(admin, me, raid.id)
      return NextResponse.json({ ...st, correct: ok, rescued: ok && !!mine.rescuing })
    }

    if (action === 'rescue') {
      const target = rows.find((m) => m.user_id === String(body.targetId ?? ''))
      if (mine.state !== 'alive' || mine.role !== 'alumno') return err('Para rescatar tenés que estar en pie.')
      if (!target || target.state !== 'down') return err('Esa persona no está caída.')
      await admin.from('raid_members').update({ rescuing: target.user_id }).eq('raid_id', raid.id).eq('user_id', me.id)
      return done()
    }

    if (action === 'item') {
      const itemId = String(body.itemId ?? '')
      if (itemId === 'botiquin') {
        const target = rows.find((m) => m.user_id === String(body.targetId ?? '') && m.state === 'down') ?? rows.find((m) => m.state === 'down' && m.role === 'alumno')
        if (!target) return err('No hay nadie caído. Guardá el botiquín.')
        await admin.from('raid_members').update({ state: 'alive', hp: RAID_RESCUE_HP }).eq('raid_id', raid.id).eq('user_id', target.user_id).eq('state', 'down')
      } else if (itemId === 'bandera') {
        for (const m of rows.filter((x) => x.role === 'alumno' && x.state === 'alive')) {
          await admin.from('raid_members').update({ hp: Math.min(SECRET_PLAYER_HP, m.hp + RAID_BANDERA_HP) }).eq('raid_id', raid.id).eq('user_id', m.user_id)
        }
      } else if (itemId === 'espuelas') {
        if (raid.attacks?.[`espuelas:${me.id}`]) return err('Ya tenés las espuelas puestas.')
        await admin.from('raids').update({ attacks: { ...(raid.attacks ?? {}), [`espuelas:${me.id}`]: 1 } }).eq('id', raid.id)
      } else {
        return err('Ese ítem no sirve en esta raid.')
      }
      return done()
    }

    if (action === 'support') {
      if (mine.role !== 'docente') return err('Solo el docente da apoyo.')
      const kind = String(body.kind ?? '')
      const target = rows.find((m) => m.user_id === String(body.targetId ?? '') && m.role === 'alumno')
      if (!target) return err('Elegí a quién ayudar.')
      const used = Number(raid.attacks?.[kind === 'revive' ? 'revives' : 'heals']) || 0
      if (kind === 'heal') {
        if (used >= TEACHER_HEALS) return err('Ya usaste las curas de esta raid.')
        if (target.state !== 'alive') return err('Para curar tiene que estar en pie.')
        await admin.from('raid_members').update({ hp: Math.min(SECRET_PLAYER_HP, target.hp + TEACHER_HEAL_HP) }).eq('raid_id', raid.id).eq('user_id', target.user_id)
      } else if (kind === 'revive') {
        if (used >= TEACHER_REVIVES) return err('Ya usaste el rescate de esta raid.')
        if (target.state !== 'down') return err('No está caído.')
        await admin.from('raid_members').update({ state: 'alive', hp: RAID_RESCUE_HP }).eq('raid_id', raid.id).eq('user_id', target.user_id)
      } else return err('Ayuda inválida.')
      await admin.from('raids').update({ attacks: { ...(raid.attacks ?? {}), [kind === 'revive' ? 'revives' : 'heals']: used + 1 } }).eq('id', raid.id)
      return done()
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Error inesperado', 500)
  }
  return err('Acción inválida')
}

async function joinAs(admin: SupabaseClient, raidId: string, me: ArenaCaller, role: 'alumno' | 'docente') {
  const { error } = await admin.rpc('raid_join', { p_raid: raidId, p_user: me.id, p_role: role, p_hp_per_member: 0 })
  if (error) throw new Error(error.message + MIGRATION_HINT)
  const tier = role === 'alumno' ? await tierFor(admin, me.aulaId, (await cookies()).get(TIER_COOKIE)?.value) : null
  await admin.from('raid_members').update({ tier, last_seen: new Date().toISOString(), hp: SECRET_PLAYER_HP }).eq('raid_id', raidId).eq('user_id', me.id)
}
