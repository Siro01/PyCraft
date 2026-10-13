'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SecretCanvas from '@/components/game/secret/SecretCanvas'
import BattleConsole, { type BattleResult } from '@/components/game/arena/BattleConsole'
import ChestStickerToy from '@/components/game/stickers/ChestStickerToy'
import { parseInventoryCommand } from '@/components/game/items/InventoryConsole'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { MAP_PALETTES } from '@/lib/game/act-maps'
import { getSecretBoss, secretAsBoss, SECRET_PLAYER_HP } from '@/lib/game/secret/bosses'
import { raidStickerFor } from '@/lib/game/chest-stickers'
import { executeChallenge, preloadPyodide, preloadSqlJs } from '@/lib/game/executor'
import { sfx } from '@/lib/game/architect/sound'
import { ownedPerkItems } from '@/lib/game/perk-effects'
import { consumePerk, getShopOwned } from '@/lib/storage/local-store'
import { openRaidChannel, raidTopic, type RaidChannel, type RaidEvent } from '@/lib/game/raid/live'
import {
  QUICK_PHRASES, RAID_ABANDON_PENALTY, RAID_BANDERA_HP, RAID_ITEMS, RAID_MIN_MEMBERS, RAID_PING_SECONDS, RAID_RESCUE_HP,
  TEACHER_HEAL_HP, type SecretFightState, type SecretRaidMember,
} from '@/lib/game/raid/secret-raid'
import type { Challenge, ShopItem } from '@/types'

// La pelea en equipo contra un jefe secreto. Misma arena oscura y sin ayuda
// que en solitario: cada uno tiene su serie (de su nivel y de los jefes que
// venció), la vida del jefe es de todos y cada alumno tiene la suya. El
// servidor corrige: el navegador solo manda lo que imprimió el código.

const DARK_VARS = MAP_PALETTES.dark as React.CSSProperties
const isRaidItem = (i: ShopItem) => (RAID_ITEMS as readonly string[]).includes(i.printName ?? '')
const ITEM_DONE: Record<string, string> = {
  botiquin: `Botiquín: tu compañero se levanta con ${RAID_RESCUE_HP} de vida.`,
  bandera: `¡La bandera flamea! +${RAID_BANDERA_HP} de vida a cada uno en pie.`,
  espuelas: 'Espuelas puestas: tu próximo acierto pega el doble.',
}

async function api<T>(body?: Record<string, unknown>, raidId?: string): Promise<T> {
  const res = await fetch(body ? '/api/raid/secreto' : `/api/raid/secreto?raid=${raidId}`, body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Error de conexión')
  return json as T
}

export default function SecretRaidFight({ raidId }: { raidId: string }) {
  const [st, setSt] = useState<SecretFightState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastResult, setLastResult] = useState<BattleResult | null>(null)
  const [hurt, setHurt] = useState(0)
  const [toasts, setToasts] = useState<{ id: number; who: string; text: string }[]>([])
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [items, setItems] = useState<ShopItem[]>([])
  const [invLine, setInvLine] = useState('')
  const [invEcho, setInvEcho] = useState<{ ok: boolean; text: string } | null>(null)
  const ch = useRef<RaidChannel | null>(null)

  const apply = useCallback((s: SecretFightState) => { setSt(s); setError(null) }, [])
  const load = useCallback(async () => {
    try { apply(await api<SecretFightState>(undefined, raidId)) } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
  }, [raidId, apply])

  useEffect(() => { void load(); preloadPyodide(); preloadSqlJs(); setItems(ownedPerkItems(getShopOwned()).filter(isRaidItem)) }, [load])

  // Señales de vida: si nadie sabe de vos en 60 s, cuenta como que te fuiste
  const status = st?.raid.status
  const live = status === 'lobby' || status === 'active'
  useEffect(() => {
    if (!live) return
    const poll = setInterval(() => void load(), 4000)
    const ping = setInterval(() => { void api<SecretFightState>({ action: 'ping', raidId }).then(apply).catch(() => {}) }, RAID_PING_SECONDS * 1000)
    return () => { clearInterval(poll); clearInterval(ping) }
  }, [live, load, raidId, apply])

  const toast = useCallback((who: string, text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-3), { id, who, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  // Canal de la raid
  useEffect(() => {
    let closed = false
    let pending: ReturnType<typeof setTimeout> | null = null
    const reload = () => { if (!pending) pending = setTimeout(() => { pending = null; void load() }, 250) }
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      if (closed) return
      ch.current = openRaidChannel(createClient(), raidTopic(raidId), (ev: RaidEvent) => {
        if (ev.type === 'phrase') toast(ev.username, ev.text)
        if (ev.type === 'hit' && ev.ok && !ev.rescued) setHurt((h) => h + 1)
        if (ev.type === 'item') toast(ev.username, `usó ${ev.itemId}`)
        reload()
      })
    })()
    return () => { closed = true; ch.current?.close(); ch.current = null; if (pending) clearTimeout(pending) }
  }, [raidId, load, toast])

  // Al ganar: el botín ya está en la base; se baja a la copia local (diamantes,
  // XP, sticker y la guarida marcada como vencida)
  useEffect(() => {
    if (status !== 'won') return
    void import('@/lib/storage/cloud-sync').then((m) => m.syncArenaStats())
  }, [status])

  const raid = st?.raid
  const secret = raid ? getSecretBoss(raid.bossId) : undefined
  const me = raid?.members.find((m) => m.id === st?.me)
  const alumnos = raid?.members.filter((m) => m.role === 'alumno') ?? []
  const isLeader = raid?.leaderId === st?.me
  const isTeacher = me?.role === 'docente'
  const myName = me?.username ?? 'Alguien'
  const send = (ev: RaidEvent) => ch.current?.send(ev)

  const challenge: Challenge | null = useMemo(() => st?.challenge ? {
    ...st.challenge, bossId: raid?.bossId ?? '', expectedOutput: '', damage: 0, orderIndex: 0,
  } : null, [st?.challenge, raid?.bossId])
  useEffect(() => { setLastResult(null) }, [challenge?.id])

  const act = async (body: Record<string, unknown>) => {
    setBusy(true)
    try {
      const res = await api<SecretFightState & { correct?: boolean; rescued?: boolean }>({ ...body, raidId })
      apply(res)
      send({ type: 'state' })
      return res
    } catch (e) {
      sfx.denied()
      setError(e instanceof Error ? e.message : 'Error')
      return null
    } finally { setBusy(false) }
  }

  const submit = async (code: string) => {
    if (!challenge || busy) return
    setBusy(true)
    try {
      const res = await executeChallenge(challenge, code)
      if (res.error) {
        setLastResult({ isCorrect: false, output: '', expected: '', error: res.error, sql: res.sql })
        sfx.miss()
        return
      }
      const r = await api<SecretFightState & { correct: boolean; rescued: boolean }>({ action: 'submit', raidId, challengeId: challenge.id, output: res.actualOutput })
      setLastResult({ isCorrect: r.correct, output: res.actualOutput, expected: '', error: null, sql: res.sql })
      apply(r)
      send({ type: 'hit', userId: st!.me, ok: r.correct, rescued: r.rescued })
      if (r.correct) { sfx.hit(); if (!r.rescued) setHurt((h) => h + 1) } else sfx.miss()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar')
    } finally { setBusy(false) }
  }

  const fireItem = async () => {
    const line = invLine.trim()
    if (!line) return
    setInvLine('')
    const p = parseInventoryCommand(line, items)
    if (!p.ok) { sfx.denied(); setInvEcho({ ok: false, text: p.hint ? `${p.error} · ${p.hint}` : p.error }); return }
    const key = p.item.printName ?? ''
    const res = await act({ action: 'item', itemId: key })
    if (!res) { setInvEcho({ ok: false, text: 'No se pudo usar. No se gastó.' }); return }
    consumePerk(p.item.id)
    setItems((list) => { const i = list.findIndex((x) => x.id === p.item.id); return i < 0 ? list : [...list.slice(0, i), ...list.slice(i + 1)] })
    send({ type: 'item', userId: st!.me, username: myName, itemId: p.item.name })
    sfx.potion()
    setInvEcho({ ok: true, text: ITEM_DONE[key] ?? `${p.item.name} usado.` })
  }

  const leave = async () => {
    if (status === 'active' && !isTeacher && !confirmLeave) { setConfirmLeave(true); sfx.warn(); return }
    await act({ action: 'leave' })
    window.location.href = '/raid'
  }

  if (!st || !raid || !secret) {
    return (
      <div className="secret-arena" style={{ ...DARK_VARS, colorScheme: 'dark' }}>
        <p className="secret-dim" style={{ padding: 20 }}>{error ?? 'Entrando a la raid…'}</p>
      </div>
    )
  }

  const rescuingName = me?.rescuing ? raid.members.find((m) => m.id === me.rescuing)?.username : null

  return (
    <div className="secret-arena" style={{ ...DARK_VARS, colorScheme: 'dark' }}>
      <header className="secret-top">
        {live ? (
          <button type="button" className="secret-link" onClick={leave}>
            {confirmLeave ? `¿Seguro? Perdés ${RAID_ABANDON_PENALTY} diamantes y dejás a tu equipo solo · confirmá` : status === 'lobby' ? '← salir' : '← abandonar'}
          </button>
        ) : <a href="/raid" className="secret-link">← raids</a>}
        {confirmLeave && <button type="button" className="secret-link" onClick={() => setConfirmLeave(false)}>no, me quedo</button>}
        <span className="secret-top-spacer" />
        {status === 'active' && !isTeacher && <span className="secret-step">ronda {st.round}</span>}
        {raid.banner && <span className="raid-banner-dot" style={{ background: raid.banner }} title="estandarte del equipo" />}
      </header>

      {error && <p className="pist-err" role="alert">{error}</p>}

      <div className="secret-grid">
        <section className="secret-boss" style={{ ['--phos' as string]: secret.color }}>
          <SecretCanvas art={secret.art} color={secret.color} integrity={status === 'active' && raid.bossHpMax ? raid.bossHp / raid.bossHpMax : status === 'won' ? 0.06 : 1}
            hurtSignal={hurt} label={secret.name} className="secret-canvas" />
          <div className="secret-name"><span>{secret.name}</span><small>raid · {alumnos.length} contra uno</small></div>
          {status === 'active' && <Meter value={raid.bossHp} max={raid.bossHpMax} color={secret.color} label="jefe" />}

          <ul className="raid-team" aria-label="Tu equipo">
            {raid.members.map((m) => (
              <Teammate key={m.id} m={m} me={st.me} leader={raid.leaderId} canRescue={status === 'active' && me?.role === 'alumno' && me.state === 'alive' && !me.rescuing}
                onRescue={() => act({ action: 'rescue', targetId: m.id })} />
            ))}
          </ul>

          {live && (
            <div className="raid-phrases" role="group" aria-label="Frases rápidas">
              {QUICK_PHRASES.map((p) => (
                <button key={p} type="button" onClick={() => { send({ type: 'phrase', userId: st.me, username: myName, text: p }); toast(myName, p) }}>{p}</button>
              ))}
            </div>
          )}
          <div className="raid-toasts" aria-live="polite">
            {toasts.map((t) => <div key={t.id}><b>{t.who}:</b> {t.text}</div>)}
          </div>
        </section>

        <section className="secret-work">
          {status === 'lobby' && (
            <div className="pist-end">
              <div className="pist-end-title" style={{ color: secret.color }}>ARMANDO EQUIPO</div>
              <p>{alumnos.length} de 4 listos. {alumnos.length < RAID_MIN_MEMBERS ? `Hacen falta al menos ${RAID_MIN_MEMBERS}.` : isLeader ? 'Cuando estén todos, arrancá.' : 'Esperando que el líder arranque…'}</p>
              {isLeader && (
                <button type="button" className="secret-go" disabled={busy || alumnos.length < RAID_MIN_MEMBERS} onClick={() => act({ action: 'start' })}>¡a pelear! ▸</button>
              )}
            </div>
          )}

          {status === 'active' && isTeacher && (
            <div className="raid-support">
              <div className="pist-end-title" style={{ color: secret.color }}>APOYO DEL DOCENTE</div>
              <p className="secret-dim">Curas: {raid.support.heals} · rescates: {raid.support.revives}. No resolvés ejercicios: el mérito es de ellos.</p>
              <ul>
                {alumnos.map((m) => (
                  <li key={m.id}>
                    <span>{m.username} · {m.state === 'down' ? 'caído' : `${m.hp} de vida`}</span>
                    {m.state === 'alive' && <button type="button" className="secret-go secret-go--ghost" disabled={busy || raid.support.heals <= 0 || m.hp >= SECRET_PLAYER_HP} onClick={() => act({ action: 'support', kind: 'heal', targetId: m.id })}>curar +{TEACHER_HEAL_HP}</button>}
                    {m.state === 'down' && <button type="button" className="secret-go" disabled={busy || raid.support.revives <= 0} onClick={() => act({ action: 'support', kind: 'revive', targetId: m.id })}>levantar</button>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === 'active' && !isTeacher && me?.state === 'down' && (
            <div className="pist-end">
              <div className="pist-end-title">CAÍSTE</div>
              <p>Tu equipo te puede levantar: un compañero rescata con su próximo acierto, o usa un Botiquín. Gritales «¡Ayuda!».</p>
            </div>
          )}

          {status === 'active' && !isTeacher && me?.state === 'alive' && (
            <>
              <Meter value={me.hp} max={SECRET_PLAYER_HP} color="hsl(var(--tx))" label="tu vida" />
              {rescuingName && <div className="pist-banner-msg" role="status">Tu próximo acierto levanta a {rescuingName}.</div>}
              {challenge ? (
                <BattleConsole boss={secretAsBoss(secret)} challenge={challenge} onSubmit={(c) => void submit(c)} isLoading={busy} lastResult={lastResult}
                  goLabel="atacar" wrongLabel="✗ No es lo que pide · perdiste 20 de vida y el jefe se curó" />
              ) : <p className="secret-dim">Cargando tu ejercicio…</p>}
              <form className="arena-inv" onSubmit={(e) => { e.preventDefault(); void fireItem() }}>
                <label htmlFor="raid-inv">&gt;&gt;&gt;</label>
                <input id="raid-inv" value={invLine} onChange={(e) => setInvLine(e.target.value)} placeholder={items.length ? `print(${items[0].printName})` : 'print(item)'}
                  autoComplete="off" spellCheck={false} aria-label="Usar un ítem: print(nombre)" />
              </form>
              {invEcho && <div className={`arena-inv-echo${invEcho.ok ? '' : ' arena-inv-echo--bad'}`}>{invEcho.text}</div>}
              <div className="secret-dim">{items.length ? `tus ítems de equipo: ${[...new Set(items.map((i) => i.printName))].join(' · ')}` : 'Sin ítems de equipo. El Mercader vende Botiquín, Bandera y Espuelas.'}</div>
            </>
          )}

          {status === 'won' && (
            <div className="pist-end">
              <div className="pist-end-title" style={{ color: secret.color }}>¡LO DERROTARON!</div>
              <p>{secret.win[secret.win.length - 1]}</p>
              {me?.role === 'alumno' && (
                <div className="pist-loot">
                  <span>tu botín</span>
                  {st.loot && st.loot.diamonds > 0 && <Diamonds n={st.loot.diamonds} size={18} sign />}
                  {st.loot && st.loot.xp > 0 && <b>+{st.loot.xp} XP</b>}
                  {(!st.loot || (!st.loot.diamonds && !st.loot.xp)) && <b>la gloria (la revancha de hoy ya la cobraste)</b>}
                  <ChestStickerToy id={raidStickerFor(secret.id)} size={48} bubble="top" />
                </div>
              )}
              <a href="/raid" className="secret-go secret-go--ghost">volver a las raids</a>
            </div>
          )}
          {status === 'lost' && (
            <div className="pist-end">
              <div className="pist-end-title">PERDIERON</div>
              <p>{secret.lose[secret.lose.length - 1]} No se pierde nada: armen otra cuando quieran.</p>
              <a href="/raid" className="secret-go secret-go--ghost">volver a las raids</a>
            </div>
          )}
          {status === 'cancelled' && (
            <div className="pist-end">
              <div className="pist-end-title">SE DESARMÓ</div>
              <p>El líder se fue antes de empezar.</p>
              <a href="/raid" className="secret-go secret-go--ghost">volver a las raids</a>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Meter({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const cells = 20
  const on = max ? Math.round((value / max) * cells) : 0
  return (
    <div>
      <div className="secret-num">{label} · {value}/{max}</div>
      <div className="secret-bar" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        {Array.from({ length: cells }, (_, i) => <span key={i} style={{ borderColor: color, background: i < on ? color : 'transparent' }} />)}
      </div>
    </div>
  )
}

function Teammate({ m, me, leader, canRescue, onRescue }: { m: SecretRaidMember; me: string; leader: string; canRescue: boolean; onRescue: () => void }) {
  const down = m.state === 'down'
  return (
    <li className={`raid-mate ${down ? 'is-down' : ''}`}>
      <div>
        <b>{m.username}{m.id === me ? ' (vos)' : ''}</b>
        {m.title && <small> · {m.title}</small>}
        {m.id === leader && <small> · líder</small>}
        {m.role === 'docente' && <small> · docente</small>}
      </div>
      {m.role === 'alumno' && (
        <span className="raid-mate-stat">
          {down ? 'caído' : `${m.hp} ♥`} · ✔ {m.solved}
          {down && m.id !== me && canRescue && <button type="button" onClick={onRescue}>rescatar</button>}
        </span>
      )}
    </li>
  )
}
