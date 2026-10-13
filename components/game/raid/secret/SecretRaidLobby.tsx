'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Diamonds } from '@/components/ui/DiamondIcon'
import { MAP_PALETTES } from '@/lib/game/act-maps'
import { SECRET_BOSSES, getSecretBoss } from '@/lib/game/secret/bosses'
import { sfx } from '@/lib/game/architect/sound'
import { aulaTopic, openRaidChannel, type RaidChannel } from '@/lib/game/raid/live'
import {
  RAID_FIRST_DIAMONDS, RAID_FIRST_XP, RAID_MAX_MEMBERS, RAID_MIN_MEMBERS, RAID_REMATCH_XP, RAID_UNLOCK_DEFEATED,
  type SecretLobbyState, type SecretRaidView,
} from '@/lib/game/raid/secret-raid'

// Lobby de raids: armar una contra un jefe secreto (si su guarida está abierta
// para vos) o sumarse a una que esté armando alguien del aula. Las raids viven
// en la base; el canal del aula solo avisa «algo cambió» para releer.

const DARK_VARS = MAP_PALETTES.dark as React.CSSProperties

async function api<T>(body?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/raid/secreto', body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Error de conexión')
  return json as T
}

export default function SecretRaidLobby() {
  const router = useRouter()
  const [st, setSt] = useState<SecretLobbyState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ch = useRef<RaidChannel | null>(null)

  const load = useCallback(async () => {
    try { setSt(await api<SecretLobbyState>()); setError(null) } catch (e) { setError(e instanceof Error ? e.message : 'Error') }
  }, [])
  useEffect(() => { void load(); const id = setInterval(() => void load(), 5000); return () => clearInterval(id) }, [load])

  const aulaId = st?.aulaId ?? null
  useEffect(() => {
    if (!aulaId) return
    let closed = false
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      if (!closed) ch.current = openRaidChannel(createClient(), aulaTopic(aulaId), (ev) => { if (ev.type === 'state') void load() })
    })()
    return () => { closed = true; ch.current?.close(); ch.current = null }
  }, [aulaId, load])

  const go = async (body: Record<string, unknown>, to?: (r: { raidId?: string }) => string) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await api<{ raidId?: string; raid?: SecretRaidView }>(body)
      ch.current?.send({ type: 'state' })
      sfx.open()
      router.push(to ? to(res) : `/raid/${res.raid?.id ?? body.raidId}`)
    } catch (e) {
      sfx.denied()
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const unlocked = !!st && (st.isAdmin || st.defeated >= RAID_UNLOCK_DEFEATED)

  return (
    <div className="secret-arena raid-lobby" style={{ ...DARK_VARS, colorScheme: 'dark' }}>
      <header className="secret-top">
        <a href="/dashboard" className="secret-link">← mapa</a>
        <span className="secret-top-spacer" />
        <span className="secret-step">raid.exe</span>
      </header>

      <div className="raid-wrap">
        <h1 className="raid-h1">RAIDS</h1>
        <p className="raid-lead">
          De {RAID_MIN_MEMBERS} a {RAID_MAX_MEMBERS} contra un jefe secreto. Cada uno resuelve su ejercicio y todos le pegan a la misma
          vida. Si alguien cae, un compañero lo rescata con su próximo acierto.
        </p>
        <p className="raid-rules">
          Primera victoria contra cada jefe: <Diamonds n={RAID_FIRST_DIAMONDS} size={13} sign /> y +{RAID_FIRST_XP} XP · revancha: +{RAID_REMATCH_XP} XP ·
          perder no cuesta nada · irse en medio de la pelea cuesta 5 diamantes.
        </p>

        {error && <p className="pist-err" role="alert">{error}</p>}
        {!st && !error && <p className="secret-dim">Buscando raids…</p>}

        {st && !unlocked && (
          <div className="pist-end">
            <div className="pist-end-title">TODAVÍA NO</div>
            <p>Las raids se abren al derrotar {RAID_UNLOCK_DEFEATED} jefes. Llevás {st.defeated}.</p>
          </div>
        )}

        {st?.mine && (
          <a className="raid-mine" href={`/raid/${st.mine}`}>Estás en una raid · volver ▸</a>
        )}

        {st && unlocked && (
          <>
            <section>
              <h2 className="raid-h2">RAIDS DEL AULA</h2>
              {st.raids.length === 0 && <p className="secret-dim">Nadie está armando una raid. ¡Armá la tuya!</p>}
              <ul className="raid-list">
                {st.raids.map((r) => {
                  const boss = getSecretBoss(r.bossId)
                  const alumnos = r.members.filter((m) => m.role === 'alumno')
                  const leader = r.members.find((m) => m.id === r.leaderId)
                  const inIt = r.members.some((m) => m.id === st.me)
                  const full = alumnos.length >= RAID_MAX_MEMBERS
                  return (
                    <li key={r.id} className="raid-row" style={{ ['--phos' as string]: boss?.color ?? '#fff', borderLeftColor: r.banner ?? boss?.color }}>
                      <div className="raid-row-main">
                        <b style={{ color: boss?.color }}>{boss?.name ?? r.bossId}</b>
                        <span>{r.status === 'lobby' ? 'armando equipo' : 'peleando'} · líder {leader?.username ?? '¿?'}</span>
                        <span className="raid-members">
                          {alumnos.map((m) => <em key={m.id}>{m.username}{m.title ? <small> · {m.title}</small> : null}</em>)}
                          {r.members.some((m) => m.role === 'docente') && <em className="is-teacher">+ docente</em>}
                        </span>
                      </div>
                      <span className="raid-count">{alumnos.length}/{RAID_MAX_MEMBERS}</span>
                      {inIt ? (
                        <a className="secret-go" href={`/raid/${r.id}`}>entrar</a>
                      ) : st.isAdmin ? (
                        <button type="button" className="secret-go secret-go--ghost" disabled={busy} onClick={() => go({ action: 'join', raidId: r.id })}>sumarme como apoyo</button>
                      ) : r.status === 'lobby' && !full && !st.mine ? (
                        <button type="button" className="secret-go" disabled={busy} onClick={() => go({ action: 'join', raidId: r.id })}>unirme</button>
                      ) : (
                        <span className="secret-dim">{full ? 'completa' : r.status === 'active' ? 'en pelea' : ''}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>

            {!st.isAdmin && (
              <section>
                <h2 className="raid-h2">ARMAR UNA RAID</h2>
                <div className="raid-bosses">
                  {SECRET_BOSSES.map((s) => {
                    const can = st.canLead.includes(s.id)
                    const first = !st.firsts.includes(s.id)
                    return (
                      <div key={s.id} className={`raid-boss ${can ? '' : 'is-locked'}`} style={{ ['--phos' as string]: s.color }}>
                        <b>{s.name}</b>
                        <small>{s.epithet}</small>
                        <span className="raid-prize">{first ? <>primera: <Diamonds n={RAID_FIRST_DIAMONDS} size={11} sign /> + {RAID_FIRST_XP} XP</> : <>revancha: +{RAID_REMATCH_XP} XP</>}</span>
                        {can ? (
                          <button type="button" className="secret-go" disabled={busy || !!st.mine} onClick={() => go({ action: 'create', bossId: s.id }, (r) => `/raid/${r.raidId}`)}>armar raid ▸</button>
                        ) : (
                          <span className="secret-dim">para liderarla necesitás su guarida abierta (se puede ir de invitado)</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
