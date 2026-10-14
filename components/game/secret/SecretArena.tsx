'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import SecretCanvas from './SecretCanvas'
import { Diamonds } from '@/components/ui/DiamondIcon'
import Speech from './Speech'
import PatoDebugWindow from '@/components/game/items/PatoDebugWindow'
import CompuHackeadaWindow from '@/components/game/items/CompuHackeadaWindow'
import { parseInventoryCommand } from '@/components/game/items/InventoryConsole'
import { executeChallenge, preloadPyodide, preloadSqlJs, isPyodideLoaded } from '@/lib/game/executor'
import { getSeedTables, type TableSnapshot } from '@/lib/game/executor/sql-runner'
import { CHALLENGES } from '@/lib/game/challenges'
import { BATTLE_ITEMS } from '@/lib/game/shop'
import { MAP_PALETTES } from '@/lib/game/act-maps'
import { sfx } from '@/lib/game/architect/sound'
import { autoFixCode, type CodeFix } from '@/lib/game/items/auto-fix'
import {
  applyItem, broccoliDamage, hasKeyItem, ownedPerkItems, rollBossHeal, BROCCOLI_HITS, PERK_SLOT_LIMIT,
} from '@/lib/game/perk-effects'
import {
  buildSecretSeries, nextRemate, secretAsBoss, secretHitDamage, seededRng,
  CROWN_START_RATIO, SECRET_HEAL_RATIO, SECRET_LOSS_PENALTY, SECRET_PLAYER_HP, SECRET_SERIES_LEN,
  SECRET_WIN_REWARD, SECRET_WRONG_DAMAGE, type SecretBoss,
} from '@/lib/game/secret/bosses'
import {
  addArmor, clearSecretRun, consumePerk, getAmulets, getArmor, getEquippedPerks, getSecretRun, getShopOwned,
  recordSecretLoss, recordSecretWin, removeAmulet, saveSecretRun, secretDefeated, setEquippedPerks, spendArmor,
  type SecretRun,
} from '@/lib/storage/local-store'
import type { Amulet, AmuletType, Challenge, ChallengeTier, ShopItem } from '@/types'

const CodeMirrorEditor = dynamic(() => import('@/components/game/CodeMirrorEditor'), {
  ssr: false,
  loading: () => <div style={{ minHeight: 200, background: '#000' }} />,
})

// La arena de un jefe secreto. Siempre en modo oscuro (paleta dark fija, sin
// importar el tema del sitio) y sin ayuda: ni Rodolfo, ni apuntes, ni errores
// traducidos, ni la salida esperada. Solo la consigna, la consola, la vida del
// jefe y la del alumno. Los ítems y amuletos se usan escribiendo print(nombre)
// en la línea de abajo de todo.

const DARK_VARS = MAP_PALETTES.dark as React.CSSProperties

/** Amuletos del Mercader Ambulante, con el nombre que se escribe en el print(). */
const AMULET_PRINT: Record<string, AmuletType> = {
  pocion_vida: 'health-potion',
  capa_escape: 'escape',
  debilidad: 'boss-hp-reduction',
  teletransportador: 'skip-boss',
}
const AMULET_LABEL: Record<AmuletType, string> = {
  'health-potion': 'Poción de Vida', escape: 'Capa de Escape', 'boss-hp-reduction': 'Amuleto de Debilidad', 'skip-boss': 'Teletransportador',
}
const POTION_HEAL = 50
const ESCAPE_MAX_HP = 30
const DEBILIDAD_RATIO = 0.4

type Phase = 'loading' | 'intro' | 'deal' | 'fight' | 'won' | 'lost' | 'fled'

interface Outcome {
  ok: boolean
  output: string
  error: string | null
  rows?: { columns: string[]; rows: string[][] }
  note?: string
}

interface Props {
  secret: SecretBoss
  /** Jefes normales que el alumno ya derrotó (arma la serie y la cuenta de diamantes). */
  defeatedIds: string[]
  /** Nivel en el que juega el alumno: la serie nunca le pone ejercicios más difíciles que eso. */
  tier: ChallengeTier
  /** Sin premios ni castigos ni guardado (vistas de prueba). */
  sandbox?: boolean
  /** Docente en vista admin: botones para simular aciertos y fallos. */
  adminTools?: boolean
  exitHref?: string
}

const byId = new Map(CHALLENGES.map((c) => [c.id, c]))

export default function SecretArena({ secret, defeatedIds, tier, sandbox = false, adminTools = false, exitHref = '/dashboard' }: Props) {
  const router = useRouter()
  const boss = useMemo(() => secretAsBoss(secret), [secret])
  const hit = secretHitDamage(secret)

  const [phase, setPhase] = useState<Phase>('loading')
  const [run, setRun] = useState<SecretRun | null>(null)
  const runRef = useRef<SecretRun | null>(null)
  /** Ya lo venció antes: revancha sin premio ni castigo. */
  const [rematch, setRematch] = useState(false)
  const stakes = !sandbox && !rematch

  const [code, setCode] = useState('')
  const codeRef = useRef('')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [hurt, setHurt] = useState(0)
  const [playerHurt, setPlayerHurt] = useState(false)
  const [diamondDelta, setDiamondDelta] = useState<number | null>(null)
  const [confirmFlee, setConfirmFlee] = useState(false)
  const [engineReady, setEngineReady] = useState(true)
  const [seed, setSeed] = useState<{ id: string; tables: TableSnapshot[] } | null>(null)

  // Ítems y amuletos
  const [items, setItems] = useState<ShopItem[]>([])
  const [equipped, setEquipped] = useState<string[]>([])
  const [amulets, setAmulets] = useState<Amulet[]>([])
  const [armor, setArmor] = useState(0)
  const [broccoli, setBroccoli] = useState(0)
  const [zonda, setZonda] = useState(false)
  const [duck, setDuck] = useState<'off' | 'open' | 'hidden'>('off')
  const [compuFix, setCompuFix] = useState<{ fixes: CodeFix[]; hasBlanks: boolean } | null>(null)
  const [invLine, setInvLine] = useState('')
  const [invEcho, setInvEcho] = useState<{ text: string; ok: boolean } | null>(null)
  const [keyOffer, setKeyOffer] = useState(false)

  const update = useCallback((patch: Partial<SecretRun>) => {
    const cur = runRef.current
    if (!cur) return
    const next = { ...cur, ...patch }
    runRef.current = next
    setRun(next)
    if (!sandbox) saveSecretRun(next)
  }, [sandbox])

  const freshRun = useCallback((): SecretRun => {
    const s = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0
    const series = buildSecretSeries(secret, defeatedIds, tier, seededRng(s)).map((c) => c.id)
    return { bossId: secret.id, seed: s, series, idx: 0, bossHp: secret.hpMax, playerHp: SECRET_PLAYER_HP, engaged: false }
  }, [defeatedIds, tier, secret])

  // ── Arranque: partida guardada o una nueva
  useEffect(() => {
    const done = !sandbox && secretDefeated(secret.id)
    setRematch(done)
    const saved = sandbox ? null : getSecretRun(secret.id)
    const r = saved && saved.series.every((id) => byId.has(id)) ? saved : freshRun()
    runRef.current = r
    setRun(r)
    if (!sandbox) saveSecretRun(r)
    setItems(sandbox ? BATTLE_ITEMS : ownedPerkItems(getShopOwned()))
    setEquipped(getEquippedPerks())
    setAmulets(getAmulets())
    setArmor(getArmor())
    setPhase(saved?.engaged ? 'fight' : 'intro')
    sfx.glitch()
  }, [secret.id, sandbox, freshRun])

  const challenge: Challenge | undefined = run ? byId.get(run.series[run.idx]) : undefined
  const penguin = equipped.includes('item-pinguino')
  const clover = equipped.includes('item-trebol')

  // Motores
  useEffect(() => {
    if (!challenge) return
    if (challenge.type === 'python') {
      preloadPyodide()
      if (!isPyodideLoaded()) {
        setEngineReady(false)
        const id = setInterval(() => { if (isPyodideLoaded()) { setEngineReady(true); clearInterval(id) } }, 300)
        return () => clearInterval(id)
      }
    } else preloadSqlJs()
    setEngineReady(true)
  }, [challenge])

  // Código inicial y tablas de cada ejercicio
  useEffect(() => {
    if (!challenge) return
    setCode(challenge.initialCode)
    codeRef.current = challenge.initialCode
    setOutcome(null)
    let alive = true
    if (challenge.type === 'sql') getSeedTables(challenge.seedSQL).then((tables) => { if (alive) setSeed({ id: challenge.id, tables }) })
    else setSeed(null)
    return () => { alive = false }
  }, [challenge])

  const onCode = useCallback((c: string) => { setCode(c); codeRef.current = c }, [])

  // ── Fin de la pelea
  const finishWin = useCallback(() => {
    sfx.powerdown()
    setPhase('won')
    if (!sandbox) clearSecretRun()
    if (stakes) setDiamondDelta(recordSecretWin(secret.id, SECRET_WIN_REWARD))
    else setDiamondDelta(0)
  }, [sandbox, stakes, secret.id])

  const finishLoss = useCallback((fled = false) => {
    sfx.crash()
    setPhase(fled ? 'fled' : 'lost')
    if (!sandbox) clearSecretRun()
    setDiamondDelta(stakes ? -recordSecretLoss(secret.id, SECRET_LOSS_PENALTY, defeatedIds.length) : 0)
  }, [sandbox, stakes, secret.id, defeatedIds.length])

  const damageBoss = useCallback((amount: number) => {
    const cur = runRef.current
    if (!cur) return 0
    const next = Math.max(0, cur.bossHp - amount)
    update({ bossHp: next })
    setHurt((h) => h + 1)
    return next
  }, [update])

  /** El jefe sigue vivo pero se acabaron los ejercicios (se curó): suma un remate. */
  const advance = useCallback(() => {
    const cur = runRef.current
    if (!cur) return
    const nextIdx = cur.idx + 1
    if (nextIdx < cur.series.length) { update({ idx: nextIdx }); return }
    const current = cur.series.map((id) => byId.get(id)).filter(Boolean) as Challenge[]
    const extra = nextRemate(secret, defeatedIds, tier, cur.seed, current)
    if (extra) update({ series: [...cur.series, extra.id], idx: nextIdx })
  }, [secret, defeatedIds, tier, update])

  const takeHit = useCallback((): string => {
    const cur = runRef.current
    if (!cur) return ''
    const notes: string[] = []
    // Armadura de la Mandarina: se gasta antes que la vida.
    if (!sandbox && spendArmor()) {
      setArmor(getArmor())
      notes.push('La armadura absorbió el golpe.')
      sfx.denied()
    } else if (sandbox && armor > 0) {
      setArmor((a) => a - 1)
      notes.push('La armadura absorbió el golpe.')
    } else {
      const hp = Math.max(0, cur.playerHp - SECRET_WRONG_DAMAGE)
      update({ playerHp: hp })
      sfx.damage()
      setPlayerHurt(true)
      setTimeout(() => setPlayerHurt(false), 380)
      notes.push(`−${SECRET_WRONG_DAMAGE} de vida.`)
      if (hp <= 0) { setTimeout(() => finishLoss(), 700); return notes.join(' ') }
    }
    // El jefe se cura (el Trébol puede frenarlo).
    if (rollBossHeal(clover).blocked) {
      notes.push('Quiso curarse y el Trébol no lo dejó.')
    } else {
      const latest = runRef.current!
      const healed = Math.min(secret.hpMax, latest.bossHp + Math.round(secret.hpMax * SECRET_HEAL_RATIO))
      if (healed > latest.bossHp) {
        notes.push(`${secret.name} +${healed - latest.bossHp}.`)
        update({ bossHp: healed })
      }
    }
    return notes.join(' ')
  }, [sandbox, armor, clover, secret.hpMax, secret.name, update, finishLoss])

  // ── Atacar
  const submit = useCallback(async (simulate?: 'hit' | 'miss') => {
    const cur = runRef.current
    if (!cur || !challenge || busy || phase !== 'fight') return
    setBusy(true)
    sfx.attack()
    try {
      const src = codeRef.current
      const res = simulate
        ? { isCorrect: simulate === 'hit', actualOutput: simulate === 'hit' ? challenge.expectedOutput : '', expectedOutput: challenge.expectedOutput, error: null }
        : await executeChallenge(challenge, src)
      const zondaHit = zonda && !simulate && !res.isCorrect && !res.error && src.replace(/(#|--).*$/gm, '').trim().length > 0 && !/_{3,}/.test(src)
      const ok = res.isCorrect || zondaHit
      if (zonda && ok) setZonda(false)
      if (!cur.engaged) update({ engaged: true })
      const rows = 'sql' in res && res.sql ? { columns: res.sql.columns, rows: res.sql.rows } : undefined

      if (ok) {
        const remaining = cur.series.length - cur.idx
        const isLast = remaining <= 1
        const boosted = broccoli > 0
        const dmg = boosted ? broccoliDamage(hit, cur.bossHp, isLast) : hit
        if (boosted) setBroccoli((n) => n - 1)
        const left = damageBoss(dmg)
        setOutcome({ ok: true, output: res.actualOutput, error: null, rows, note: `−${dmg}${zondaHit ? ' · el Zonda barrió la consigna' : ''}` })
        if (left <= 0) { setTimeout(finishWin, 500); return }
        sfx.hit()
        setTimeout(advance, 1100)
      } else {
        sfx.miss()
        const note = takeHit()
        setOutcome({ ok: false, output: res.actualOutput, error: res.error, rows, note })
      }
    } finally {
      setBusy(false)
    }
  }, [challenge, busy, phase, zonda, broccoli, hit, update, damageBoss, finishWin, advance, takeHit])

  // ── Ítems (print(nombre)) y amuletos
  const applyAmulet = useCallback((type: AmuletType): { ok: boolean; text: string } => {
    const a = amulets.find((x) => x.type === type)
    if (!a) return { ok: false, text: `No tenés ${AMULET_LABEL[type]}. Se consigue con el Mercader Ambulante.` }
    const cur = runRef.current!
    const spend = () => {
      if (!sandbox) removeAmulet(a.id)
      setAmulets((list) => list.filter((x) => x.id !== a.id))
    }
    if (type === 'health-potion') {
      if (cur.playerHp >= SECRET_PLAYER_HP) return { ok: false, text: 'Tenés la vida llena. Guardala.' }
      spend(); sfx.potion()
      update({ playerHp: Math.min(SECRET_PLAYER_HP, cur.playerHp + POTION_HEAL) })
      return { ok: true, text: `+${POTION_HEAL} de vida.` }
    }
    if (type === 'escape') {
      if (cur.playerHp > ESCAPE_MAX_HP) return { ok: false, text: `La capa solo funciona con ${ESCAPE_MAX_HP} de vida o menos.` }
      spend()
      if (!sandbox) clearSecretRun()
      setDiamondDelta(0)
      setPhase('fled')
      sfx.close()
      return { ok: true, text: 'Te envolviste en la capa y desapareciste.' }
    }
    if (type === 'boss-hp-reduction') {
      if (cur.bossHp <= 1) return { ok: false, text: 'Está en las últimas. Terminalo con código.' }
      spend()
      damageBoss(Math.min(cur.bossHp - 1, Math.round(secret.hpMax * DEBILIDAD_RATIO)))
      sfx.hit()
      return { ok: true, text: `${secret.name} se debilita.` }
    }
    // Teletransportador: saltea el ejercicio actual como si lo hubiera resuelto, salvo el golpe final.
    if (cur.bossHp <= hit) return { ok: false, text: 'El último golpe no se puede saltear.' }
    spend()
    damageBoss(hit)
    sfx.pageTurn()
    setTimeout(advance, 400)
    return { ok: true, text: 'El ejercicio se desvaneció. Siguiente.' }
  }, [amulets, sandbox, update, damageBoss, secret.hpMax, secret.name, hit, advance])

  const applyShopItem = useCallback((item: ShopItem): { ok: boolean; text: string } => {
    const cur = runRef.current!
    const r = applyItem(item, {
      battle: challenge ? {
        boss: { ...boss, hpMax: secret.hpMax },
        bossHp: cur.bossHp,
        damageBoss: (amount) => { damageBoss(amount); sfx.hit() },
        hasPlayerHp: true,
        playerHp: cur.playerHp,
        maxPlayerHp: SECRET_PLAYER_HP,
        healPlayer: (amount) => { update({ playerHp: Math.min(SECRET_PLAYER_HP, cur.playerHp + amount) }); sfx.potion() },
        addArmor: () => { const n = sandbox ? armor + 1 : addArmor(1); setArmor(n); return n },
        openDuck: () => setDuck('open'),
        duckActive: duck !== 'off',
        runAutoFix: () => {
          const fx = autoFixCode(codeRef.current, challenge.type)
          if (!fx.fixes.length) return { fixes: 0 }
          onCode(fx.code)
          setCompuFix({ fixes: fx.fixes, hasBlanks: fx.hasBlanks })
          return { fixes: fx.fixes.length }
        },
        broccoliHitsLeft: broccoli,
        armBroccoli: () => setBroccoli(BROCCOLI_HITS),
        zondaArmed: zonda,
        armZonda: () => setZonda(true),
      } : null,
      show67: () => sfx.jingle(),
      activateCoupon: () => false,
      togglePassive: (it) => {
        const on = equipped.includes(it.id)
        if (!on && equipped.length >= PERK_SLOT_LIMIT) return { ok: false, equipped: false }
        const next = on ? equipped.filter((id) => id !== it.id) : [...equipped, it.id]
        setEquipped(next)
        if (!sandbox) setEquippedPerks(next)
        sfx.equip(!on)
        return { ok: true, equipped: !on }
      },
    })
    if (r.status === 'used') {
      sfx.perkUse()
      if (!sandbox) { consumePerk(item.id); setItems((list) => list.filter((i) => i.id !== item.id)) }
    }
    return { ok: r.status !== 'rejected', text: r.message }
  }, [challenge, boss, secret.hpMax, damageBoss, update, sandbox, armor, duck, onCode, broccoli, zonda, equipped])

  const runInventory = useCallback(() => {
    const line = invLine.trim()
    if (!line) return
    setInvLine('')
    const m = line.match(/^print\s*\(\s*(\w+)\s*\)\s*$/)
    const amulet = m ? AMULET_PRINT[m[1]] : undefined
    const res = amulet
      ? applyAmulet(amulet)
      : (() => {
          const p = parseInventoryCommand(line, items)
          return p.ok ? applyShopItem(p.item) : { ok: false, text: p.hint ? `${p.error} · ${p.hint}` : p.error }
        })()
    if (!res.ok) sfx.denied()
    setInvEcho(res)
  }, [invLine, items, applyAmulet, applyShopItem])

  // ── Objetos de historia (Corona / Esmeraldas)
  const owned = useMemo(() => (phase === 'loading' ? [] : getShopOwned()), [phase])
  const hasKey = !!secret.keyItem && (sandbox || hasKeyItem(owned, secret.keyItem.id))

  const afterIntro = useCallback(() => {
    const cur = runRef.current
    if (secret.keyItem && hasKey && cur && !cur.keyDone && !cur.engaged) {
      setPhase('deal')
      setKeyOffer(true)
      return
    }
    setPhase('fight')
  }, [hasKey, secret.keyItem])

  const resolveKey = useCallback((accept: boolean) => {
    const cur = runRef.current
    if (!cur || !secret.keyItem) return
    setKeyOffer(false)
    if (accept && secret.keyItem.effect === 'crown') {
      update({ keyDone: true, bossHp: Math.round(secret.hpMax * CROWN_START_RATIO) })
      setHurt((h) => h + 1)
    } else if (accept && secret.keyItem.effect === 'deal') {
      if (!sandbox) consumePerk(secret.keyItem.id)
      update({ keyDone: true, bossHp: Math.max(1, cur.bossHp - hit), idx: Math.min(cur.idx + 1, cur.series.length - 1) })
      setHurt((h) => h + 1)
      sfx.hit()
    } else {
      update({ keyDone: true })
    }
    setPhase('fight')
  }, [secret.keyItem, secret.hpMax, sandbox, update, hit])

  const restart = useCallback(() => {
    const r = freshRun()
    runRef.current = r
    setRun(r)
    if (!sandbox) saveSecretRun(r)
    setOutcome(null); setDiamondDelta(null); setBroccoli(0); setZonda(false); setDuck('off'); setInvEcho(null); setConfirmFlee(false)
    setPhase('intro')
  }, [freshRun, sandbox])

  const flee = useCallback(() => {
    const cur = runRef.current
    if (phase === 'fight' && cur?.engaged && stakes && !confirmFlee) { setConfirmFlee(true); sfx.warn(); return }
    if (phase === 'fight' && cur?.engaged && stakes) { finishLoss(true); return }
    if (!sandbox && !cur?.engaged) clearSecretRun()
    router.push(exitHref)
  }, [phase, stakes, confirmFlee, finishLoss, sandbox, router, exitHref])

  // ── Render
  const bossHp = run?.bossHp ?? secret.hpMax
  const playerHp = run?.playerHp ?? SECRET_PLAYER_HP
  const ratio = bossHp / secret.hpMax
  const total = run?.series.length ?? SECRET_SERIES_LEN
  const step = (run?.idx ?? 0) + 1
  const seedTables = seed && challenge && seed.id === challenge.id ? seed.tables : []
  const over = phase === 'won' || phase === 'lost' || phase === 'fled'

  return (
    <div className="secret-arena" style={{ ...DARK_VARS, colorScheme: 'dark' }} data-phase={phase}>
      {playerHurt && <div className="secret-hurt" aria-hidden />}
      {duck === 'open' && challenge && (
        <PatoDebugWindow boss={boss} challenge={challenge} getCode={() => codeRef.current} onClose={() => setDuck('hidden')} />
      )}
      {compuFix && <CompuHackeadaWindow fixes={compuFix.fixes} hasBlanks={compuFix.hasBlanks} onClose={() => setCompuFix(null)} />}

      <header className="secret-top">
        <button type="button" className="secret-link" onClick={flee}>
          {confirmFlee ? <>¿Huir? Cuesta <Diamonds n={SECRET_LOSS_PENALTY} size={12} /> · confirmá</> : over ? '← mapa' : '← huir'}
        </button>
        {confirmFlee && <button type="button" className="secret-link" onClick={() => setConfirmFlee(false)}>no, me quedo</button>}
        <span className="secret-top-spacer" />
        {phase === 'fight' && <span className="secret-step">{step > SECRET_SERIES_LEN ? `remate ${step - SECRET_SERIES_LEN}` : `${step}/${SECRET_SERIES_LEN}`}</span>}
        {rematch && <span className="secret-step">revancha · sin premio ni castigo</span>}
      </header>

      <div className="secret-grid">
        {/* ── El jefe ───────────────────────────────────────────── */}
        <section className="secret-boss" style={{ ['--phos' as string]: secret.color }}>
          <div className="secret-canvas">
            <SecretCanvas
              art={secret.art}
              integrity={phase === 'won' ? 0.06 : Math.max(0.12, ratio)}
              color={secret.color}
              animate={phase !== 'won'}
              hurtSignal={hurt}
              label={secret.name}
            />
          </div>
          <div className="secret-name">
            <span>{secret.name}</span>
            <small>{secret.epithet}</small>
          </div>
          <Bar value={bossHp} max={secret.hpMax} color={secret.color} label={`Vida de ${secret.name}`} />
          <div className="secret-num">{bossHp} / {secret.hpMax}</div>

          <div className={`secret-player${playerHurt ? ' secret-player--hurt' : ''}`}>
            <span className="secret-label">vos</span>
            <Bar value={playerHp} max={SECRET_PLAYER_HP} color="hsl(0 0% 92%)" label="Tu vida" small />
            <span className="secret-num">{playerHp}</span>
          </div>
          {(armor > 0 || broccoli > 0 || zonda || penguin || clover || duck === 'hidden') && (
            <div className="secret-status">
              {armor > 0 && <span>armadura {armor}</span>}
              {broccoli > 0 && <span>brócoli ×{broccoli}</span>}
              {zonda && <span>zonda</span>}
              {penguin && <span>pingüino</span>}
              {clover && <span>trébol</span>}
              {duck === 'hidden' && <button type="button" className="secret-link" onClick={() => setDuck('open')}>pato</button>}
            </div>
          )}
        </section>

        {/* ── Consigna + consola ───────────────────────────────── */}
        <section className="secret-work">
          {phase === 'loading' && <p className="secret-dim">…</p>}

          {phase === 'intro' && <Speech lines={secret.intro} color={secret.color} onDone={afterIntro} cta="pelear" />}

          {phase === 'deal' && keyOffer && secret.keyItem && (
            <Speech
              lines={secret.keyItem.lines}
              color={secret.color}
              onDone={() => undefined}
              choices={secret.keyItem.effect === 'deal'
                ? [{ label: 'darle las esmeraldas', onPick: () => resolveKey(true) }, { label: 'no', onPick: () => resolveKey(false) }]
                : [{ label: 'seguir', onPick: () => resolveKey(true) }]}
            />
          )}

          {phase === 'fight' && challenge && (
            <>
              <div className="secret-task">
                <h2>{challenge.title}</h2>
                <p>{withCode(challenge.description)}</p>
                {seedTables.map((t) => <MiniTable key={t.name} name={t.name} columns={t.columns} rows={t.rows} />)}
              </div>

              <div className="secret-console">
                <div className="secret-console-bar">
                  <span>{challenge.type === 'python' ? 'python' : 'sqlite'}</span>
                  <span className="secret-dim">ctrl+enter</span>
                </div>
                <CodeMirrorEditor
                  key={challenge.id}
                  value={code}
                  onChange={onCode}
                  language={challenge.type}
                  onCtrlEnter={() => submit()}
                  accentColor={secret.color}
                  penguin={penguin}
                />
                <div className="secret-run">
                  <button type="button" className="secret-go" onClick={() => submit()} disabled={busy || !engineReady}>
                    {busy ? 'ejecutando…' : !engineReady ? 'cargando python…' : 'ejecutar ▸'}
                  </button>
                  {outcome && (
                    <span className={outcome.ok ? 'secret-ok' : 'secret-bad'}>
                      {outcome.ok ? '✓' : '✗'} {outcome.note}
                    </span>
                  )}
                </div>
                {outcome && <Output o={outcome} />}
              </div>

              {adminTools && (
                <div className="secret-admin">
                  <span>docente</span>
                  <button type="button" onClick={() => submit('hit')}>acierto</button>
                  <button type="button" onClick={() => submit('miss')}>fallo</button>
                  <button type="button" onClick={() => { damageBoss(bossHp); setTimeout(finishWin, 300) }}>derrotar</button>
                  <button type="button" onClick={() => { update({ playerHp: 0 }); finishLoss() }}>perder</button>
                </div>
              )}

              <form className="secret-inv" onSubmit={(e) => { e.preventDefault(); runInventory() }}>
                <label htmlFor="secret-inv-input" className="secret-dim">&gt;&gt;&gt;</label>
                <input
                  id="secret-inv-input"
                  value={invLine}
                  onChange={(e) => setInvLine(e.target.value)}
                  placeholder="print(item)"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Usar un ítem o amuleto: print(nombre)"
                />
              </form>
              {invEcho && <div className={invEcho.ok ? 'secret-inv-echo' : 'secret-inv-echo secret-bad'}>{invEcho.text}</div>}
            </>
          )}

          {over && (
            <End
              phase={phase}
              lines={phase === 'won' ? secret.win : phase === 'lost' ? secret.lose : ['Te fuiste.']}
              color={secret.color}
              delta={diamondDelta}
              onRetry={phase === 'won' ? undefined : restart}
              exitHref={exitHref}
            />
          )}
        </section>
      </div>
    </div>
  )
}

// ─── Piezas ────────────────────────────────────────────────────────────────

function Bar({ value, max, color, label, small = false }: { value: number; max: number; color: string; label: string; small?: boolean }) {
  const segs = small ? 20 : 30
  const on = Math.ceil((Math.max(0, value) / max) * segs)
  return (
    <div className={`secret-bar${small ? ' secret-bar--sm' : ''}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      {Array.from({ length: segs }, (_, i) => (
        <span key={i} style={{ background: i < on ? color : 'transparent', borderColor: i < on ? color : 'hsl(0 0% 22%)' }} />
      ))}
    </div>
  )
}

function End({ phase, lines, color, delta, onRetry, exitHref }: {
  phase: Phase; lines: string[]; color: string; delta: number | null; onRetry?: () => void; exitHref: string
}) {
  return (
    <div className="secret-end">
      <div className="secret-end-title" style={{ color: phase === 'won' ? color : 'hsl(0 0% 96%)' }}>
        {phase === 'won' ? 'DERROTADO' : phase === 'lost' ? 'PERDISTE' : 'HUISTE'}
      </div>
      {lines.map((l) => <p key={l} style={{ color }}>{l}</p>)}
      {delta !== null && delta !== 0 && (
        <div className="secret-delta"><Diamonds n={delta} sign size={22} /></div>
      )}
      {delta === 0 && phase !== 'won' && <div className="secret-dim">sin diamantes en juego</div>}
      <div className="secret-choices">
        {onRetry && <button type="button" className="secret-go" onClick={onRetry}>otra vez</button>}
        <a href={exitHref} className="secret-go secret-go--ghost">volver al mapa</a>
      </div>
    </div>
  )
}

function Output({ o }: { o: Outcome }) {
  if (o.error) return <>{o.output && <pre className="secret-out">{o.output}</pre>}<pre className="secret-out secret-bad">{o.error}</pre></>
  if (o.rows && o.rows.columns.length) return <MiniTable columns={o.rows.columns} rows={o.rows.rows} />
  return <pre className="secret-out">{o.output || '(sin salida)'}</pre>
}

function MiniTable({ name, columns, rows }: { name?: string; columns: string[]; rows: string[][] }) {
  return (
    <div className="secret-table">
      {name && <div className="secret-dim">{name}</div>}
      <table>
        <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 12).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
      </table>
      {rows.length > 12 && <div className="secret-dim">… {rows.length - 12} filas más</div>}
    </div>
  )
}

function withCode(text: string): React.ReactNode {
  const parts = text.split('`')
  if (parts.length < 3) return text
  return parts.map((p, i) => (i % 2 === 1 ? <code key={i}>{p}</code> : p))
}
