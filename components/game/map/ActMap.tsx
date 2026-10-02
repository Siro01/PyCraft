'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sfx } from '@/lib/game/architect/sound'
import { findPath, key, type ActMapDef, type MapPoint } from '@/lib/game/act-maps'
import { SHOP_UNLOCK_BOSS_NUMBER } from '@/lib/game/shop'
import BossTopicIcon from './BossTopicIcon'
import MapArt from './MapArt'
import { BossNode, PlaceNode, SecretNode, type NodeState, type PlaceKind } from './MapNodeIcon'
import NodeDetailPopover from './NodeDetailPopover'
import NodeSplash from './NodeSplash'
import PlayerAvatar, { type Facing } from './PlayerAvatar'
import type { AvatarId } from './avatars'
import RodolfoMapWarning from './RodolfoMapWarning'

// Mapa de un acto: el arte entero se ve de una (sin cámara), escalado al
// ancho de la ventana. El alumno camina casilla por casilla con flechas/WASD,
// o hace clic en cualquier lugar del mapa y el avatar camina solo por el
// camino más corto. Parado sobre una puerta, Enter/Espacio (o el botón de la
// placa) entra.

const MIN_TILE = 22 // por debajo, el mapa se desplaza de costado (celular)
const STEP_MS = 85 // un paso, con teclado o caminando solo
const LOCKED_LINES = [
  '¡Epa! Esa clase todavía no está habilitada.',
  'Todavía no llegamos ahí. ¡Tu docente la va a habilitar pronto!',
  'Esa puerta sigue cerrada por ahora. ¡Seguí practicando mientras tanto!',
]

const STATE_LABEL: Record<NodeState, string> = {
  defeated: 'Derrotado',
  current: 'Siguiente jefe',
  available: 'Disponible',
  locked: 'Bloqueado',
}

type Spot =
  | { kind: 'boss'; p: MapPoint; bossId: string }
  | { kind: PlaceKind; p: MapPoint }
  | { kind: 'secret'; p: MapPoint; tip: string }

interface ActMapProps {
  act: ActMapDef
  bossStates: Record<string, NodeState>
  /** Patio de juegos y de prácticas: visibles en cualquier acto, interactuables
   *  solo en los que el alumno ya llegó a jugar. */
  playgroundReachable: boolean
  onReachEdge: (direction: 'next' | 'prev') => void
  /** Pantalla completa: el mapa entra en el alto disponible, no solo en el ancho. */
  fillHeight?: boolean
  /** La tienda del Mercader abre después de derrotar al jefe #2 (en todos los actos a la vez). */
  shopUnlocked?: boolean
  /** Dónde aparece el avatar (por defecto, la entrada). */
  startAt?: MapPoint
  onPosChange?: (p: MapPoint) => void
  /** Con la ventana minimizada o tapada, el teclado no mueve el avatar. */
  keyboard?: boolean
  /** Diseño del personaje (avatars.ts). */
  avatar?: AvatarId
}

export default function ActMap({
  act, bossStates, playgroundReachable, onReachEdge, fillHeight, shopUnlocked = false, startAt, onPosChange, keyboard = true, avatar,
}: ActMapProps) {
  const router = useRouter()
  const start = startAt && act.links[key(startAt.x, startAt.y)] ? startAt : act.entry
  const [pos, setPos] = useState<MapPoint>(start)
  const posRef = useRef<MapPoint>(start)
  const [facing, setFacing] = useState<Facing>('right')
  const [frame, setFrame] = useState<0 | 1>(0)
  const [warning, setWarning] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [splash, setSplash] = useState<MapPoint | null>(null)
  const [opened, setOpened] = useState(false)
  const [blink, setBlink] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  // Traba mientras hay una transición en curso (entrar a un jefe, pasar de
  // acto) — mantener una tecla apretada no encola varios cambios.
  const busyRef = useRef(false)
  const lastStepRef = useRef(0)
  const lastBumpRef = useRef(0)
  const walkRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Medidas: el mapa entero, escalado al ancho (y al alto en pantalla completa).
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const fit = box.w ? Math.min(box.w / act.width, fillHeight && box.h ? box.h / act.height : Infinity) : 30
  const tile = Math.max(MIN_TILE, Math.floor(fit * 4) / 4)
  const mapW = tile * act.width
  const mapH = tile * act.height

  // ── Lugares del mapa
  const spots = useMemo(() => {
    const list: Spot[] = [
      ...act.nodes.map((n) => ({ kind: 'boss' as const, p: { x: n.x, y: n.y }, bossId: n.bossId })),
      { kind: 'playground', p: act.playground },
      { kind: 'practice', p: act.practice },
      { kind: 'shop', p: act.mercader },
    ]
    if (act.secret) list.push({ kind: 'secret', p: { x: act.secret.x, y: act.secret.y }, tip: act.secret.tip })
    return list
  }, [act])
  const spotAt = useMemo(() => new Map(spots.map((s) => [key(s.p.x, s.p.y), s])), [spots])
  const bossById = useMemo(() => new Map(act.bosses.map((b) => [b.id, b])), [act])

  const placeOpen = useCallback((kind: PlaceKind) => (kind === 'shop' ? shopUnlocked : playgroundReachable), [playgroundReachable, shopUnlocked])

  // ── Acto IV: el Arquitecto parpadea de vez en cuando, y su entrada suena a interferencia.
  useEffect(() => {
    if (!act.ascii) return
    sfx.glitch()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const t = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 170)
    }, 4600)
    return () => clearInterval(t)
  }, [act.ascii])

  const stopWalk = useCallback(() => {
    if (walkRef.current) { clearInterval(walkRef.current); walkRef.current = null }
  }, [])
  useEffect(() => stopWalk, [stopWalk])

  const showWarning = useCallback((message: string, tone: 'denied' | 'notify' = 'denied') => {
    setWarning(message)
    if (tone === 'denied') sfx.denied()
    else sfx.notify()
  }, [])

  // Splash chiquito de pixeles antes de navegar: lo justo para que el clic
  // se sienta respondido antes de que cambie la pantalla.
  const confirmAndGo = useCallback((p: MapPoint, href: string) => {
    if (busyRef.current) return
    busyRef.current = true
    stopWalk()
    sfx.confirm()
    setSplash(p)
    setTimeout(() => router.push(href), 170)
  }, [router, stopWalk])

  const enterSpot = useCallback((s: Spot) => {
    if (s.kind === 'boss') {
      const state = bossStates[s.bossId]
      if (state === 'available' || state === 'current') confirmAndGo(s.p, `/battle/${s.bossId}`)
      else if (state === 'locked') showWarning(LOCKED_LINES[Math.floor(Math.random() * LOCKED_LINES.length)])
      else sfx.select()
      return
    }
    if (s.kind === 'secret') {
      setOpened(true)
      showWarning(s.tip, 'notify')
      return
    }
    if (s.kind === 'shop') {
      if (shopUnlocked) confirmAndGo(s.p, '/mercader')
      else showWarning(`La tienda del Mercader está cerrada. Abre cuando derrotes al jefe ${SHOP_UNLOCK_BOSS_NUMBER}, el Guardián de la Puerta. ¡Ahí ya vas a tener diamantes para gastar!`)
      return
    }
    if (!playgroundReachable) {
      showWarning(`Todavía no llegaste tan lejos. ¡El patio de ${s.kind === 'playground' ? 'juegos' : 'prácticas'} se habilita más adelante!`)
      return
    }
    confirmAndGo(s.p, s.kind === 'playground' ? `/patio-de-juegos?acto=${act.key}` : '/patio-de-practicas')
  }, [act.key, bossStates, confirmAndGo, playgroundReachable, shopUnlocked, showWarning])

  const moveTo = useCallback((next: MapPoint, dir: Facing) => {
    posRef.current = next
    setPos(next)
    setFacing(dir)
    setFrame((f) => (f ? 0 : 1))
    sfx.step()
    onPosChange?.(next)
    if (spotAt.has(key(next.x, next.y))) sfx.mapArrive()
    if (act.exit && next.x === act.exit.x && next.y === act.exit.y) {
      busyRef.current = true
      stopWalk()
      setTimeout(() => { sfx.pageTurn(); onReachEdge('next') }, 200)
    }
  }, [act.exit, onPosChange, onReachEdge, spotAt, stopWalk])

  /** Un paso en una dirección. Devuelve false si no hay camino para ese lado. */
  const tryStep = useCallback((dx: number, dy: number): boolean => {
    if (busyRef.current) return false
    const cur = posRef.current
    const dir: Facing = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up'
    // Volver al acto anterior: desde la entrada, caminando hacia la izquierda.
    if (dx === -1 && act.index > 0 && cur.x === act.entry.x && cur.y === act.entry.y) {
      busyRef.current = true
      stopWalk()
      setFacing('left')
      setTimeout(() => { sfx.pageTurn(); onReachEdge('prev') }, 160)
      return true
    }
    const next = { x: cur.x + dx, y: cur.y + dy }
    if (!(act.links[key(cur.x, cur.y)] ?? []).includes(key(next.x, next.y))) {
      setFacing(dir)
      const now = Date.now()
      if (now - lastBumpRef.current > 260) { lastBumpRef.current = now; sfx.bump() }
      return false
    }
    moveTo(next, dir)
    return true
  }, [act, moveTo, onReachEdge, stopWalk])

  const walkTo = useCallback((target: MapPoint) => {
    if (busyRef.current) return
    const path = findPath(act, posRef.current, target)
    if (!path || path.length === 0) return
    stopWalk()
    let i = 0
    const advance = () => {
      const cur = posRef.current
      const next = path[i++]
      if (!next || busyRef.current) { stopWalk(); return }
      const ok = tryStep(Math.sign(next.x - cur.x), Math.sign(next.y - cur.y))
      if (!ok || i >= path.length) stopWalk()
    }
    advance()
    walkRef.current = setInterval(advance, STEP_MS)
  }, [act, stopWalk, tryStep])

  // ── Teclado
  useEffect(() => {
    if (!keyboard) return
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      let dx = 0, dy = 0
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': dy = -1; break
        case 'ArrowDown': case 's': case 'S': dy = 1; break
        case 'ArrowLeft': case 'a': case 'A': dx = -1; break
        case 'ArrowRight': case 'd': case 'D': dx = 1; break
        case 'Enter': case ' ': case 'Spacebar': {
          const s = spotAt.get(key(posRef.current.x, posRef.current.y))
          if (!s) return
          if (t?.tagName === 'BUTTON' && e.key !== 'Enter') return
          e.preventDefault()
          enterSpot(s)
          return
        }
        default: return
      }
      e.preventDefault()
      stopWalk()
      // Tecla mantenida: un paso cada STEP_MS como mucho, no a la velocidad
      // de repetición del sistema.
      const now = Date.now()
      if (now - lastStepRef.current < STEP_MS) return
      lastStepRef.current = now
      tryStep(dx, dy)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enterSpot, keyboard, spotAt, stopWalk, tryStep])

  // ── En celular el mapa puede ser más ancho que la ventana: sigue al avatar.
  useEffect(() => {
    const el = wrapRef.current
    if (!el || mapW <= el.clientWidth + 1) return
    const ax = (pos.x + 0.5) * tile
    el.scrollTo({ left: Math.max(0, ax - el.clientWidth / 2), behavior: 'smooth' })
  }, [mapW, pos.x, tile])

  // ── Mouse: clic en el mapa → caminar hasta la casilla de ruta más cercana.
  const onMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / tile - 0.5
    const fy = (e.clientY - rect.top) / tile - 0.5
    let best: MapPoint | null = null
    let bestD = 1.6
    for (const k of Object.keys(act.links)) {
      const [x, y] = k.split(',').map(Number)
      const d = Math.hypot(x - fx, y - fy)
      if (d < bestD) { bestD = d; best = { x, y } }
    }
    if (best) walkTo(best)
  }

  const onSpotClick = (s: Spot) => (e: React.MouseEvent) => {
    e.stopPropagation()
    const here = posRef.current
    if (here.x === s.p.x && here.y === s.p.y) enterSpot(s)
    else walkTo(s.p)
  }

  // ── Placa de detalle: la del lugar con el mouse encima, si no la del lugar donde está parado.
  const hereKey = key(pos.x, pos.y)
  const detailKey = hovered ?? (spotAt.has(hereKey) ? hereKey : null)
  const detailSpot = detailKey ? spotAt.get(detailKey) : undefined

  const renderDetail = (s: Spot) => {
    const standing = s.p.x === pos.x && s.p.y === pos.y
    const below = s.p.y <= 4
    const align: 'left' | 'right' | 'center' = s.p.x <= 3 ? 'left' : s.p.x >= act.width - 4 ? 'right' : 'center'
    const ink = 'hsl(var(--bg))'
    if (s.kind === 'boss') {
      const boss = bossById.get(s.bossId)
      if (!boss) return null
      const state = bossStates[s.bossId] ?? 'locked'
      const canEnter = state === 'available' || state === 'current'
      return (
        <NodeDetailPopover
          icon={<BossTopicIcon bossId={boss.id} size={12} color={ink} />}
          title={`${boss.title} · ${boss.name}`}
          body={boss.topic}
          status={STATE_LABEL[state]}
          positive={canEnter}
          onEnter={standing && canEnter ? () => enterSpot(s) : undefined}
          enterLabel="Pelear"
          below={below}
          align={align}
        />
      )
    }
    if (s.kind === 'secret') {
      return (
        <NodeDetailPopover
          title="Cofre escondido"
          status={opened ? 'Abierto' : '¿Qué habrá?'}
          positive
          onEnter={standing ? () => enterSpot(s) : undefined}
          enterLabel="Abrir"
          below={below}
          align={align}
        />
      )
    }
    const open = placeOpen(s.kind)
    const info: Record<PlaceKind, { title: string; body: string; locked: string }> = {
      playground: { title: 'Patio de juegos', body: 'Minijuegos cortos para practicar este acto.', locked: 'Todavía no' },
      practice: { title: 'Patio de prácticas', body: 'Bloc libre para escribir y correr Python.', locked: 'Todavía no' },
      shop: { title: 'Tienda del Mercader', body: 'Stickers e ítems a cambio de diamantes.', locked: `Abre tras el jefe ${SHOP_UNLOCK_BOSS_NUMBER}` },
    }
    return (
      <NodeDetailPopover
        title={info[s.kind].title}
        body={info[s.kind].body}
        status={open ? 'Abierto' : info[s.kind].locked}
        positive={open}
        onEnter={standing && open ? () => enterSpot(s) : undefined}
        below={below}
        align={align}
      />
    )
  }

  const bossSize = Math.round(Math.min(58, Math.max(24, tile * 1.18)))
  const placeSize = Math.round(Math.min(68, Math.max(28, tile * 1.5)))
  const avatarSize = Math.round(Math.min(46, Math.max(20, tile * 1.0)))
  const cx = (x: number) => (x + 0.5) * tile
  const cy = (y: number) => (y + 0.5) * tile

  const here = spotAt.get(hereKey)
  const avatarBottom = here?.kind === 'boss' ? cy(pos.y) - bossSize / 2 + 3 : cy(pos.y) + tile * 0.32

  return (
    <div
      ref={wrapRef}
      className="map-scroll"
      style={{ width: '100%', height: fillHeight ? '100%' : undefined, overflowX: mapW > box.w + 1 ? 'auto' : 'hidden', overflowY: 'hidden' }}
    >
      <div
        className={`map-stage${act.ascii ? ' map-stage--ascii' : ''}`}
        style={{ position: 'relative', width: mapW, height: mapH, margin: '0 auto' }}
        role="application"
        aria-label={`Mapa del ${act.roman.toLowerCase()}, ${act.title}. Flechas o WASD para moverte, Enter para entrar. También podés hacer clic donde quieras ir.`}
        onClick={onMapClick}
        onMouseLeave={() => setHovered(null)}
      >
        <MapArt act={act} blink={blink} />

        {act.ascii && <div className="map-ascii-fx" aria-hidden="true"><span className="map-ascii-tear" /></div>}

        {spots.map((s) => {
          const k = key(s.p.x, s.p.y)
          const focused = k === hereKey
          const common = {
            onClick: onSpotClick(s),
            onMouseEnter: () => { setHovered(k); sfx.hover() },
            onMouseLeave: () => setHovered((cur) => (cur === k ? null : cur)),
          }
          if (s.kind === 'boss') {
            const boss = bossById.get(s.bossId)
            if (!boss) return null
            return (
              <div key={k} {...common} className="map-spot" style={{ left: cx(s.p.x) - bossSize / 2, top: cy(s.p.y) - bossSize / 2, width: bossSize, height: bossSize, zIndex: 3 }}>
                <BossNode boss={boss} state={bossStates[s.bossId] ?? 'locked'} focused={focused} size={bossSize} final={act.ascii} />
              </div>
            )
          }
          if (s.kind === 'secret') {
            const sz = Math.round(placeSize * 0.62)
            return (
              <div key={k} {...common} className="map-spot" style={{ left: cx(s.p.x) - sz / 2, top: cy(s.p.y) - sz * 0.62, width: sz, height: sz, zIndex: 3 }}>
                <SecretNode focused={focused} size={sz} opened={opened} />
              </div>
            )
          }
          return (
            <div key={k} {...common} className="map-spot" style={{ left: cx(s.p.x) - placeSize / 2, top: cy(s.p.y) + tile * 0.3 - placeSize, width: placeSize, height: placeSize, zIndex: 3 }}>
              <PlaceNode kind={s.kind} open={placeOpen(s.kind)} focused={focused} size={placeSize} />
            </div>
          )
        })}

        <div
          className="map-avatar-wrap"
          style={{ left: cx(pos.x) - avatarSize / 2, top: avatarBottom - avatarSize, width: avatarSize, height: avatarSize, zIndex: 5 }}
        >
          <PlayerAvatar facing={facing} frame={frame} size={avatarSize} variant={avatar} />
        </div>

        {detailSpot && (
          <div
            className="absolute"
            style={{
              left: cx(detailSpot.p.x), width: 0,
              top: detailSpot.kind === 'boss' ? cy(detailSpot.p.y) - bossSize / 2 - (detailSpot.p.x === pos.x && detailSpot.p.y === pos.y ? avatarSize - 4 : 0) : cy(detailSpot.p.y) + tile * 0.3 - placeSize,
              height: detailSpot.kind === 'boss' ? bossSize + (detailSpot.p.x === pos.x && detailSpot.p.y === pos.y ? avatarSize - 4 : 0) : placeSize,
              zIndex: 8,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0 }}>
              {renderDetail(detailSpot)}
            </div>
          </div>
        )}

        {splash && <NodeSplash x={cx(splash.x)} y={cy(splash.y)} onDone={() => setSplash(null)} />}
      </div>

      {warning && <RodolfoMapWarning message={warning} onClose={() => setWarning(null)} />}
    </div>
  )
}
