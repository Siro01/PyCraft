'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PistoleroStage, { type StageCue } from './PistoleroStage'
import BattleConsole, { type BattleResult } from '@/components/game/arena/BattleConsole'
import { Diamonds } from '@/components/ui/DiamondIcon'
import ChestStickerToy from '@/components/game/stickers/ChestStickerToy'
import PistoleroSay from './PistoleroSay'
import WesternText from './WesternText'
import { SE_BUSCA_ID } from '@/lib/game/chest-stickers'
import { MAP_PALETTES } from '@/lib/game/act-maps'
import { BOSSES } from '@/lib/game/bosses'
import { executeChallenge, preloadPyodide, preloadSqlJs } from '@/lib/game/executor'
import { sfx } from '@/lib/game/architect/sound'
import {
  ATTACK_BY_ID, BANDERA_HEAL, DUEL_ITEMS, PISTOLERO_LINES, PISTOLERO_REWARD_DIAMONDS, PISTOLERO_REWARD_XP, pickLine,
} from '@/lib/game/raid/pistolero'
import { parseInventoryCommand } from '@/components/game/items/InventoryConsole'
import { ownedPerkItems } from '@/lib/game/perk-effects'
import { SHOP_CATALOG } from '@/lib/game/shop'
import { consumePerk, getShopOwned } from '@/lib/storage/local-store'
import { PISTOLERO_PALETTE } from '@/lib/game/raid/pistolero-art'
import { callRaid, getRaid, openRaidChannel, raidTopic, type RaidChannel, type RaidEvent } from '@/lib/game/raid/live'
import type { StudentRaidState } from '@/lib/game/raid/types'
import type { Boss, Challenge, ShopItem } from '@/types'

// La pantalla del alumno en el duelo contra el Pistolero.
// Izquierda: el Pistolero (lo mismo que ve todo el aula), su vida y la del
// equipo. Derecha: el ejercicio de este alumno. Al enviar, el código va al
// docente, que decide ✔ o ✘; mientras tanto se espera «bajo el sol».
// Los ataques llegan por el canal en tiempo real: congelar el editor, tapar la
// consigna, cambiar el ejercicio… La base manda: ante cualquier aviso se relee.

const DARK_VARS = MAP_PALETTES.dark as React.CSSProperties
const RELOAD_MS = 5000
// BattleConsole pide un jefe para el color del editor: uno «de mentira» con la tinta brasa
const PIST_BOSS: Boss = { ...BOSSES[0], id: 'pistolero', name: 'El Pistolero', color: PISTOLERO_PALETTE[1] }
const isDuelItem = (i: ShopItem) => (DUEL_ITEMS as readonly string[]).includes(i.printName ?? '')
const ITEM_DONE: Record<string, string> = {
  bandera: `¡La bandera flamea! +${BANDERA_HEAL} de vida para todo el equipo.`,
  chaleco: 'Chaleco puesto. La próxima Desenfundada contra vos rebota.',
  espuelas: 'Espuelas puestas: tu próximo acierto pega el doble.',
  bengala: '¡Bengala al cielo! Por 30 s todos ven una pista de su ejercicio.',
}

/** `preview` = vitrina sin base ni canales (/demo/pistolero/alumno). */
export default function StudentPistolero({ preview }: { preview?: StudentRaidState } = {}) {
  const [st, setSt] = useState<StudentRaidState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cue, setCue] = useState<StageCue | null>(null)
  const [hurt, setHurt] = useState(0)
  const [line, setLine] = useState<string | null>(null)
  const [frozenUntil, setFrozenUntil] = useState(0)
  const [dustUntil, setDustUntil] = useState(0)
  const [flash, setFlash] = useState<{ ok: boolean; n: number } | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [runError, setRunError] = useState<BattleResult | null>(null)
  const [sentOutput, setSentOutput] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const ch = useRef<RaidChannel | null>(null)
  const lineTimer = useRef<ReturnType<typeof setTimeout>>()
  const joining = useRef(false)
  const [items, setItems] = useState<ShopItem[]>([])
  const [invLine, setInvLine] = useState('')
  const [invEcho, setInvEcho] = useState<{ ok: boolean; text: string } | null>(null)
  const [vest, setVest] = useState(false)
  const vestRef = useRef(false)
  useEffect(() => { vestRef.current = vest }, [vest])
  useEffect(() => {
    // En la vitrina se muestran los cuatro para probar
    setItems(preview ? SHOP_CATALOG.filter(isDuelItem) : ownedPerkItems(getShopOwned()).filter(isDuelItem))
  }, [preview])

  const say = useCallback((text: string) => {
    setLine(text)
    clearTimeout(lineTimer.current)
    lineTimer.current = setTimeout(() => setLine(null), 6000)
  }, [])

  const load = useCallback(async () => {
    if (preview) { setSt((cur) => cur ?? preview); return }
    try {
      const s = await getRaid<StudentRaidState>()
      setSt(s)
      setError(null)
      // Llegó al duelo y todavía no está adentro: entra solo
      if (s.raid && (s.raid.status === 'lobby' || s.raid.status === 'active') && !s.joined && !joining.current) {
        joining.current = true
        try {
          setSt(await callRaid<StudentRaidState>({ action: 'join' }))
          ch.current?.send({ type: 'joined', userId: s.me })
        } finally { joining.current = false }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo hablar con el servidor')
    }
  }, [preview])

  useEffect(() => { void load(); preloadPyodide(); preloadSqlJs() }, [load])
  useEffect(() => { if (preview) setSt(preview) }, [preview])

  // Canal de la pelea
  const raidId = st?.raid?.id ?? null
  const meId = st?.me ?? ''
  const live = st?.raid && (st.raid.status === 'lobby' || st.raid.status === 'active')
  useEffect(() => {
    if (!raidId || preview) return
    let pending: ReturnType<typeof setTimeout> | null = null
    const reload = () => { if (!pending) pending = setTimeout(() => { pending = null; void load() }, 300) }
    let closed = false
    ;(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      if (closed) return
      ch.current = openRaidChannel(createClient(), raidTopic(raidId), (ev: RaidEvent) => {
        switch (ev.type) {
          case 'attack': {
            const a = ATTACK_BY_ID[ev.attackId]
            setCue({ n: Date.now(), poses: a.poses, fx: a.fx })
            const mine = ev.targetId === meId
            say(mine ? `${ev.line} ¡Te apunta a vos!` : ev.line)
            if (a.id === 'desenfundada' && mine) {
              if (vestRef.current) { setVest(false); setBanner('¡El chaleco paró la bala! No te congelaste.') }
              else { setFrozenUntil(Date.now() + a.seconds * 1000); sfx.miss() }
            }
            if (a.id === 'polvareda') setDustUntil(Date.now() + a.seconds * 1000)
            if (a.id === 'ruleta' && mine) setBanner('¡Gira el tambor! Te tocó otro ejercicio.')
            reload()
            break
          }
          case 'line': say(ev.text); break
          case 'item': {
            const it = SHOP_CATALOG.find((i) => i.printName === ev.itemId)
            if (ev.userId !== meId && it) setBanner(`${ev.username} usó ${it.name}.`)
            reload()
            break
          }
          case 'judged':
            if (ev.ok) setHurt((h) => h + 1)
            if (ev.userId === meId) {
              setFlash({ ok: ev.ok, n: Date.now() })
              say(pickLine(ev.ok ? PISTOLERO_LINES.hurt : PISTOLERO_LINES.miss))
              if (ev.ok) sfx.hit(); else sfx.miss()
              setSentOutput(null)
            }
            reload()
            break
          case 'end':
            if (ev.result === 'lost') setCue({ n: Date.now(), poses: ['giro', 'saludo'] })
            reload()
            break
          default: reload()
        }
      })
    })()
    return () => { closed = true; ch.current?.close(); ch.current = null; if (pending) clearTimeout(pending) }
  }, [raidId, meId, load, say, preview])

  // Por si se pierde un aviso
  useEffect(() => {
    if (!live || preview) return
    const id = setInterval(() => void load(), RELOAD_MS)
    return () => clearInterval(id)
  }, [live, load, preview])

  // Reloj para congelado / polvareda / carteles
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 4000); return () => clearTimeout(t) }, [banner])
  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(null), 1800); return () => clearTimeout(t) }, [flash])

  // Al ganar: el botín ya está en la base → actualizar la copia local de diamantes y XP
  const status = st?.raid?.status
  useEffect(() => {
    if (status !== 'won' || preview) return
    void import('@/lib/storage/cloud-sync').then((m) => m.syncArenaStats())
  }, [status, preview])

  // Congelado: el teclado no escribe (como en la Arena)
  const frozen = now < frozenUntil
  useEffect(() => {
    if (!frozen) return
    const stop = (e: Event) => { e.preventDefault(); e.stopPropagation() }
    window.addEventListener('keydown', stop, true)
    window.addEventListener('beforeinput', stop, true)
    window.addEventListener('paste', stop, true)
    return () => {
      window.removeEventListener('keydown', stop, true)
      window.removeEventListener('beforeinput', stop, true)
      window.removeEventListener('paste', stop, true)
    }
  }, [frozen])

  // «escribiendo…» para la Mesa: como mucho un aviso cada 3 s
  const lastTyping = useRef(0)
  const lastCode = useRef('')
  const onCodeChange = useCallback((c: string) => {
    const changed = lastCode.current !== '' && c !== lastCode.current
    lastCode.current = c
    if (!changed || Date.now() - lastTyping.current < 3000) return
    lastTyping.current = Date.now()
    ch.current?.send({ type: 'typing', userId: meId })
  }, [meId])

  const task = st?.task ?? null
  const challenge: Challenge | null = useMemo(() => task ? {
    id: `${task.id}`, bossId: 'pistolero', title: task.exercise.title, description: task.exercise.description,
    type: task.exercise.type, tier: task.exercise.tier, expectedOutput: '', initialCode: task.exercise.initialCode,
    seedSQL: task.exercise.seedSQL, damage: 0, orderIndex: 0,
  } : null, [task])
  useEffect(() => { setRunError(null); lastCode.current = '' }, [task?.id])

  const submit = async (code: string) => {
    if (!task || !challenge || busy || frozen || task.status !== 'asignado') return
    setBusy(true)
    try {
      const res = await executeChallenge(challenge, code)
      if (res.error) {
        // Un error no se manda: se arregla primero (el Pistolero no corrige errores de tipeo)
        setRunError({ isCorrect: false, output: '', expected: '', error: res.error, sql: res.sql })
        sfx.miss()
        return
      }
      setRunError(null)
      if (preview) { setSt((cur) => cur && cur.task ? { ...cur, task: { ...cur.task, status: 'enviado' } } : cur); setSentOutput(res.actualOutput); return }
      setSt(await callRaid<StudentRaidState>({ action: 'submit', taskId: task.id, code, output: res.actualOutput }))
      setSentOutput(res.actualOutput)
      ch.current?.send({ type: 'submitted', userId: meId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar')
    } finally {
      setBusy(false)
    }
  }

  // ─── Ítems: print(nombre) en la línea >>> ───────────────────────────────────
  const fireItem = async () => {
    const line = invLine.trim()
    if (!line) return
    setInvLine('')
    if (st?.raid?.status !== 'active') { setInvEcho({ ok: false, text: 'Los ítems se usan durante el duelo.' }); return }
    const p = parseInventoryCommand(line, items)
    if (!p.ok) { sfx.denied(); setInvEcho({ ok: false, text: p.hint ? `${p.error} · ${p.hint}` : p.error }); return }
    const key = p.item.printName ?? ''
    if (key === 'chaleco' && vest) { setInvEcho({ ok: false, text: 'Ya tenés el chaleco puesto.' }); return }
    try {
      if (key === 'chaleco') setVest(true)
      else if (!preview) setSt(await callRaid<StudentRaidState>({ action: 'item', itemId: key }))
      else if (key === 'bengala' && st) setSt({ ...st, hint: 'Vista previa: acá aparece la pista de tu ejercicio.', bengalaUntil: Date.now() + 30_000 })
      if (!preview) {
        consumePerk(p.item.id)
        setItems((list) => { const i = list.findIndex((x) => x.id === p.item.id); return i < 0 ? list : [...list.slice(0, i), ...list.slice(i + 1)] })
        ch.current?.send({ type: 'item', userId: meId, username: st?.raid?.members.find((m) => m.id === meId)?.username ?? 'Alguien', itemId: key })
        ch.current?.send({ type: 'state' })
      }
      sfx.potion()
      setInvEcho({ ok: true, text: ITEM_DONE[key] ?? `${p.item.name} usado.` })
    } catch (e) {
      sfx.denied()
      setInvEcho({ ok: false, text: e instanceof Error ? `${e.message} No se gastó.` : 'No se pudo usar. No se gastó.' })
    }
  }

  // ─── Pantalla ──────────────────────────────────────────────────────────────
  const raid = st?.raid ?? null
  const me = raid?.members.find((m) => m.id === meId)
  const alumnos = raid?.members.filter((m) => m.role === 'alumno' && m.state !== 'left') ?? []
  const dusty = now < dustUntil

  return (
    <div className="secret-arena pist-view" style={{ ...DARK_VARS, colorScheme: 'dark' }}>
      {flash && <div key={flash.n} className={`pist-verdict ${flash.ok ? 'is-ok' : 'is-bad'}`} aria-live="assertive">{flash.ok ? '¡LE DISTE!' : 'ERRASTE EL TIRO'}</div>}

      <header className="secret-top">
        <a href="/dashboard" className="secret-link">← mapa</a>
        <span className="secret-top-spacer" />
        {raid && <span className="secret-step">{alumnos.length} en el duelo · tus aciertos: {me?.solved ?? 0}</span>}
      </header>

      {error && <p className="pist-err" role="alert">{error}</p>}

      <div className="secret-grid">
        <section className="secret-boss">
          <PistoleroStage cue={cue} hurtSignal={hurt} line={line} retired={status === 'won'}
            integrity={status === 'active' && raid?.bossHpMax ? Math.max(0.15, raid.bossHp / raid.bossHpMax) : 1} className="secret-canvas" />
          <div className="secret-name"><WesternText text="El Pistolero" px={3} /><small>evento sorpresa · todo el aula contra él</small></div>
          {raid && status !== 'cancelled' && raid.bossHpMax > 0 && (
            <>
              <Meter label="pistolero" value={raid.bossHp} max={raid.bossHpMax} color={PISTOLERO_PALETTE[1]} />
              {raid.teamHpMax !== null && <Meter label="equipo" value={raid.teamHp ?? 0} max={raid.teamHpMax} color={PISTOLERO_PALETTE[0]} />}
            </>
          )}
        </section>

        <section className="secret-work">
          {!st && !error && <p className="secret-dim">Buscando al Pistolero…</p>}

          {st && (!raid || status === 'cancelled') && (
            <End title="PUEBLO TRANQUILO" body="Ahora no hay ningún duelo. Cuando el Pistolero aparezca, te vas a enterar." />
          )}

          {status === 'lobby' && (
            <End title="A LA ESPERA" body={`Ya estás adentro. Somos ${alumnos.length}. El duelo arranca cuando el Pistolero dé la señal…`} />
          )}

          {status === 'active' && (
            <>
              {banner && <div className="pist-banner-msg" role="status">{banner}</div>}
              {st?.hint && task?.status === 'asignado' && (
                <div className="pist-hint" role="status"><span>bengala</span> {st.hint}</div>
              )}
              {challenge && task?.status === 'asignado' && (
                <div className={`duel-console${frozen ? ' duel-console--frozen' : ''}`} style={{ position: 'relative' }}>
                  <BattleConsole
                    boss={PIST_BOSS}
                    challenge={challenge}
                    onSubmit={(c) => void submit(c)}
                    isLoading={busy}
                    lastResult={runError}
                    onCodeChange={onCodeChange}
                    taskHidden={dusty}
                    goLabel="disparar"
                    wrongLabel="✗ Revisá el error antes de disparar"
                  />
                  {frozen && (
                    <div className="duel-freeze pist-freeze" role="status">
                      <span>¡te desenfundaron!</span>
                      <strong>{Math.ceil((frozenUntil - now) / 1000)}</strong>
                    </div>
                  )}
                </div>
              )}
              {task?.status === 'enviado' && (
                <div className="pist-wait">
                  <div className="pist-wait-title">DISPARO ENVIADO</div>
                  <p>El Pistolero está mirando tu código… no te muevas.</p>
                  {sentOutput !== null && <><h4>tu salida</h4><pre className="secret-out">{sentOutput || '(vacío)'}</pre></>}
                </div>
              )}
              {!task && <p className="secret-dim">Cargando tu ejercicio…</p>}

              <form className="arena-inv" onSubmit={(e) => { e.preventDefault(); void fireItem() }}>
                <label htmlFor="pist-inv">&gt;&gt;&gt;</label>
                <input id="pist-inv" value={invLine} onChange={(e) => setInvLine(e.target.value)}
                  placeholder={items.length ? `print(${items[0].printName})` : 'print(item)'}
                  autoComplete="off" spellCheck={false} aria-label="Usar un ítem: print(nombre)" />
              </form>
              {invEcho && <div className={`arena-inv-echo${invEcho.ok ? '' : ' arena-inv-echo--bad'}`}>{invEcho.text}</div>}
              <div className="secret-dim">
                {items.length ? `tus ítems para el duelo: ${[...new Set(items.map((i) => i.printName))].join(' · ')}` : 'Sin ítems para el duelo. El Mercader vende Bandera, Chaleco, Espuelas y Bengala.'}
                {vest && ' · chaleco puesto'}
              </div>
            </>
          )}

          {status === 'won' && (
            <End title="¡LE GANARON!" says={PISTOLERO_LINES.defeat}>
              {(me?.solved ?? 0) > 0 ? (
                <div className="pist-loot">
                  <span>tu botín</span>
                  <Diamonds n={PISTOLERO_REWARD_DIAMONDS} size={18} sign />
                  <b>+{PISTOLERO_REWARD_XP} XP</b>
                  <span>+ el cartel</span>
                  <ChestStickerToy id={SE_BUSCA_ID} size={48} bubble="top" demo={!!preview} />
                </div>
              ) : (
                <p className="secret-dim">Esta vez no llegaste a acertar, así que no hay botín. ¡La próxima!</p>
              )}
            </End>
          )}

          {status === 'lost' && (
            <End title="GANÓ EL PISTOLERO" says={PISTOLERO_LINES.victory} body="No perdiste nada: era un evento sorpresa." />
          )}
        </section>
      </div>
    </div>
  )
}

function Meter({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
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

function End({ title, body, says, children }: { title: string; body?: string; says?: string[]; children?: React.ReactNode }) {
  // Lo que dice el Pistolero va con su voz (planta rodadora, gritos, disparos);
  // la explicación del juego, quieta y aparte.
  const [spoken, setSpoken] = useState(!says)
  return (
    <div className="pist-end">
      <WesternText text={title} px={4} className="pist-end-title" />
      {says && <PistoleroSay lines={says} onDone={() => setSpoken(true)} className="pist-end-say" />}
      {body && <p>{body}</p>}
      {spoken && children}
      <a href="/dashboard" className="secret-go secret-go--ghost">volver al mapa</a>
    </div>
  )
}
