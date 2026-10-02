'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sfx } from '@/lib/game/architect/sound'
import { TILE_SIZE, type ActMapDef, type MapPoint } from '@/lib/game/act-maps'
import { BossNode, PlaygroundNode, PracticeNode, ShopNode, type NodeState } from './MapNodeIcon'
import { SHOP_UNLOCK_BOSS_NUMBER } from '@/lib/game/shop'
import NodeDetailPopover from './NodeDetailPopover'
import NodeSplash from './NodeSplash'
import PlayerAvatar, { type Facing } from './PlayerAvatar'
import RodolfoMapWarning from './RodolfoMapWarning'

// Columnas visibles: se recalculan según el ancho disponible (más grandes
// cuando la bitácora está oculta), entre un piso legible y un techo que evita
// un mapa demasiado ralo en pantallas anchas.
const MIN_COLS = 10
const MAX_COLS = 20
// Filas: fijas en 9 salvo que el mapa esté en pantalla completa (fillHeight)
// — ahí sí se miden contra el alto real disponible, para no dejar una franja
// vacía debajo del mapa como pasaba antes en cualquiera de los 4 actos.
const DEFAULT_ROWS = 9
const MIN_ROWS = 7
const MAX_ROWS = 22

interface ActMapProps {
  act: ActMapDef
  bossStates: Record<string, NodeState>
  /** Comparte el mismo criterio de alcance el patio de juegos y el de
   *  prácticas: visibles en cualquier acto, interactuables solo en los que
   *  el alumno ya llegó a jugar. */
  playgroundReachable: boolean
  onReachEdge: (direction: 'next' | 'prev') => void
  /** Pantalla completa: el mapa ocupa todo el alto disponible, no solo el ancho. */
  fillHeight?: boolean
  /** La tienda del Mercader abre después de derrotar al jefe #2 (en todos los actos a la vez). */
  shopUnlocked?: boolean
}

// Etiqueta de un nodo de utilidad (patio de juegos/prácticas): centrada bajo
// el ícono, pero con el borde izquierdo nunca por debajo de 0 — si no, en los
// actos donde el nodo cae cerca de la columna 0 el texto queda cortado por
// el borde del viewport (`overflow: hidden`), que no puede paneársele detrás
// porque la cámara ya está clampeada a la izquierda.
function UtilityLabel({ x, y, text, widthPx }: { x: number; y: number; text: string; widthPx: number }) {
  const tileCenter = x * TILE_SIZE + TILE_SIZE / 2
  const left = Math.max(0, tileCenter - widthPx / 2)
  return (
    <span
      className="absolute label-mono whitespace-nowrap px-1 pointer-events-none"
      style={{ left, top: y * TILE_SIZE + TILE_SIZE * 0.55, width: widthPx, textAlign: 'center', background: 'hsl(var(--bg) / 0.85)', color: 'hsl(var(--tx2))', fontSize: 9, zIndex: 2 }}
    >
      {text}
    </span>
  )
}

const LOCKED_LINES = [
  '¡Epa! Esa clase todavía no está habilitada.',
  'Todavía no llegamos ahí. ¡Tu docente la va a habilitar pronto!',
  'Esa puerta sigue cerrada por ahora. ¡Seguí practicando mientras tanto!',
]

export default function ActMap({ act, bossStates, playgroundReachable, onReachEdge, fillHeight, shopUnlocked = false }: ActMapProps) {
  const router = useRouter()
  const [pos, setPos] = useState<MapPoint>(act.entry)
  const [facing, setFacing] = useState<Facing>('right')
  const [stepping, setStepping] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [hoveredBossId, setHoveredBossId] = useState<string | null>(null)
  const [splash, setSplash] = useState<MapPoint | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [viewCols, setViewCols] = useState(MIN_COLS)
  const [viewRows, setViewRows] = useState(DEFAULT_ROWS)

  // El mapa llena el ancho que le deja su contenedor (crece al ocultar la
  // bitácora), en pasos de una columna entera para que el camino no quede
  // recortado a la mitad. En pantalla completa (fillHeight) también mide el
  // alto real — si no, quedaba una franja vacía debajo del mapa en los 4
  // actos, porque las filas se quedaban fijas en 9 aunque hubiera lugar de
  // sobra.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const cols = Math.floor(el.clientWidth / TILE_SIZE)
      setViewCols(Math.min(MAX_COLS, Math.max(MIN_COLS, cols)))
      if (fillHeight) {
        const rows = Math.floor(el.clientHeight / TILE_SIZE)
        setViewRows(Math.min(MAX_ROWS, Math.max(MIN_ROWS, rows)))
      } else {
        setViewRows(DEFAULT_ROWS)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fillHeight])
  // Posición "de verdad", actualizada en el mismo tick que setPos — así Enter
  // nunca lee una posición vieja si el alumno teclea muy rápido (tecla
  // mantenida, combo WASD+Enter), sin esperar al re-render de React.
  const posRef = useRef<MapPoint>(act.entry)
  // Traba mientras hay una transición en curso (entrar a un jefe, pasar de
  // acto): sin esto, mantener apretada una tecla en el borde del mapa
  // agenda un sfx.pageTurn() y un onReachEdge() por cada tecla que llega
  // antes de que la pantalla cambie, lo que satura el sonido y puede
  // encolar varios cambios de acto seguidos. Se resetea solo: cada acto
  // nuevo monta un ActMap de cero (key={act.key} en BossMap), y al entrar
  // a un jefe la página entera se va, así que no hace falta destrabarla a
  // mano en ningún otro lado.
  const busyRef = useRef(false)

  // El avatar vuelve al punto de entrada cada vez que se entra a un acto.
  useEffect(() => {
    posRef.current = act.entry
    setPos(act.entry)
    setFacing('right')
  }, [act.key])

  const walkable = useMemo(() => {
    const set = new Set<string>()
    for (const t of act.tiles) if (t.kind === 'path') set.add(`${t.x},${t.y}`)
    return set
  }, [act])

  const nodeAt = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of act.nodes) map.set(`${n.x},${n.y}`, n.bossId)
    return map
  }, [act])

  const bossByIdMap = useMemo(() => new Map(act.bosses.map((b) => [b.id, b])), [act])

  // Rodolfo se queda en pantalla hasta que lo cierran a mano (botón ×), no
  // se apaga solo — si desaparecía antes de que el alumno terminara de leer
  // el aviso, quedaba la sensación de que se perdió algo.
  const showWarning = useCallback((message: string) => {
    setWarning(message)
    sfx.denied()
  }, [])

  // Confirma con un splash chiquito de pixeles antes de navegar — nada de
  // esperar una animación larga, solo lo justo para que el clic se sienta
  // respondido antes de que cambie la pantalla.
  const confirmAndGo = useCallback((p: MapPoint, href: string) => {
    if (busyRef.current) return
    busyRef.current = true
    sfx.confirm()
    setSplash(p)
    setTimeout(() => router.push(href), 160)
  }, [router])

  const enterTile = useCallback((p: MapPoint) => {
    const key = `${p.x},${p.y}`
    const bossId = nodeAt.get(key)
    if (bossId) {
      const state = bossStates[bossId]
      const boss = bossByIdMap.get(bossId)
      if (state === 'available' || state === 'current') {
        confirmAndGo(p, `/battle/${bossId}`)
      } else if (state === 'locked') {
        showWarning(LOCKED_LINES[Math.floor(Math.random() * LOCKED_LINES.length)])
      } else if (state === 'defeated' && boss) {
        sfx.select()
      }
      return
    }
    if (p.x === act.playground.x && p.y === act.playground.y) {
      if (playgroundReachable) {
        confirmAndGo(p, `/patio-de-juegos?acto=${act.key}`)
      } else {
        showWarning('Todavía no llegaste tan lejos. ¡El patio de juegos se habilita más adelante!')
      }
      return
    }
    if (p.x === act.practice.x && p.y === act.practice.y) {
      if (playgroundReachable) {
        confirmAndGo(p, '/patio-de-practicas')
      } else {
        showWarning('Todavía no llegaste tan lejos. ¡El patio de prácticas se habilita más adelante!')
      }
      return
    }
    if (p.x === act.mercader.x && p.y === act.mercader.y) {
      if (shopUnlocked) {
        confirmAndGo(p, '/mercader')
      } else {
        showWarning(`La tienda del Mercader está cerrada. Abre cuando derrotes al jefe ${SHOP_UNLOCK_BOSS_NUMBER}, el Guardián de la Puerta. ¡Ahí ya vas a tener diamantes para gastar!`)
      }
    }
  }, [act.key, act.mercader, act.playground, act.practice, bossByIdMap, bossStates, confirmAndGo, nodeAt, playgroundReachable, shopUnlocked, showWarning])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (busyRef.current) return
      let dx = 0, dy = 0, nextFacing: Facing | null = null
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': dy = -1; nextFacing = 'up'; break
        case 'ArrowDown': case 's': case 'S': dy = 1; nextFacing = 'down'; break
        case 'ArrowLeft': case 'a': case 'A': dx = -1; nextFacing = 'left'; break
        case 'ArrowRight': case 'd': case 'D': dx = 1; nextFacing = 'right'; break
        case 'Enter': case ' ': case 'Spacebar':
          e.preventDefault()
          enterTile(posRef.current)
          return
        default: return
      }
      e.preventDefault()
      if (nextFacing) setFacing(nextFacing)

      setPos((cur) => {
        // El punto de entrada YA es la casilla 0 — el alumno aparece ahí al
        // llegar. Si de entrada aprieta "izquierda" para volver, el chequeo
        // de abajo (que solo mira la casilla de LLEGADA) nunca se cumple,
        // porque x=-1 queda bloqueado antes de llegar a mirarlo. Por eso acá
        // se controla la INTENCIÓN de salir por la izquierda antes del corte
        // de límites, no la llegada.
        if (dx === -1 && cur.x === 0 && cur.y === act.entry.y && act.index > 0) {
          busyRef.current = true
          setTimeout(() => { sfx.pageTurn(); onReachEdge('prev') }, 180)
          return cur
        }

        const next = { x: cur.x + dx, y: cur.y + dy }
        if (next.x < 0 || next.y < 0 || next.x >= act.width || next.y >= act.height) return cur
        if (!walkable.has(`${next.x},${next.y}`)) return cur

        sfx.step()
        setStepping(true)
        setTimeout(() => setStepping(false), 140)

        if (act.exit && next.x === act.exit.x && next.y === act.exit.y) {
          busyRef.current = true
          setTimeout(() => { sfx.pageTurn(); onReachEdge('next') }, 220)
        }
        posRef.current = next
        return next
      })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [act, enterTile, onReachEdge, pos, walkable])

  const viewW = viewCols * TILE_SIZE
  const viewH = viewRows * TILE_SIZE
  const camX = Math.min(Math.max(0, pos.x - Math.floor(viewCols / 2)), Math.max(0, act.width - viewCols))
  const camY = Math.min(Math.max(0, pos.y - Math.floor(viewRows / 2)), Math.max(0, act.height - viewRows))

  const onPlayground = pos.x === act.playground.x && pos.y === act.playground.y
  const onPractice = pos.x === act.practice.x && pos.y === act.practice.y
  const onMercader = pos.x === act.mercader.x && pos.y === act.mercader.y
  const focusedBossId = act.nodes.find((n) => n.x === pos.x && n.y === pos.y)?.bossId ?? null
  const detailBossId = hoveredBossId ?? focusedBossId
  const detailBoss = detailBossId ? bossByIdMap.get(detailBossId) : undefined

  return (
    <div ref={wrapRef} className="w-full" style={fillHeight ? { height: '100%' } : undefined}>
    <div
      className="map-viewport relative overflow-hidden mx-auto"
      style={{ width: viewW, maxWidth: '100%', height: viewH, border: '2px solid hsl(var(--tx))', boxShadow: '4px 4px 0 hsl(var(--tx) / 0.2)' }}
      role="application"
      aria-label={`Mapa de ${act.title}. Usá las flechas o WASD para moverte, Enter o Espacio para entrar.`}
      tabIndex={0}
    >
      {/* Cartucho de título — grande, fijo sobre el mapa, no se mueve con la cámara */}
      <div className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center pointer-events-none" style={{ padding: '10px 12px 6px' }}>
        <div style={{ background: 'hsl(var(--bg) / 0.88)', border: '2px solid hsl(var(--tx))', padding: '4px 18px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 26, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'hsl(var(--tx))', lineHeight: 1 }}>
            {act.title}
          </div>
          <div className="label-mono" style={{ color: 'hsl(var(--tx3))' }}>— {act.roman} —</div>
        </div>
      </div>

      <div
        className="absolute top-0 left-0"
        style={{
          width: act.width * TILE_SIZE,
          height: act.height * TILE_SIZE,
          transform: `translate(${-camX * TILE_SIZE}px, ${-camY * TILE_SIZE}px)`,
          transition: 'transform 0.14s ease-out',
        }}
      >
        {act.tiles.map((t) => {
          if (t.kind !== 'path') {
            return (
              <div
                key={`${t.x},${t.y}`}
                className={`absolute map-tile-${t.kind}`}
                style={{ left: t.x * TILE_SIZE, top: t.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }}
              />
            )
          }
          // Solo dibuja los tramos que conectan con un vecino transitable, para
          // que el camino se lea como una línea (con esquinas rectas en los
          // giros) en vez de una baldosa llena por celda.
          const right = walkable.has(`${t.x + 1},${t.y}`)
          const left = walkable.has(`${t.x - 1},${t.y}`)
          const down = walkable.has(`${t.x},${t.y + 1}`)
          const up = walkable.has(`${t.x},${t.y - 1}`)
          const modifier = t.exit || t.back ? ' map-tile-exit' : t.branch ? ' map-tile-branch' : ''
          return (
            <div key={`${t.x},${t.y}`} className={`absolute${modifier}`} style={{ left: t.x * TILE_SIZE, top: t.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }}>
              <span className="map-road-hub" />
              {right && <span className="map-road map-road-r" />}
              {left && <span className="map-road map-road-l" />}
              {down && <span className="map-road map-road-d" />}
              {up && <span className="map-road map-road-u" />}
            </div>
          )
        })}

        {/* Barrera al final del tramo de salida: marca dónde termina el
            camino de este mapa, como el corte de vía de la referencia. */}
        {act.exit && (
          <div
            className="map-exit-gate pointer-events-none"
            style={{ left: act.exit.x * TILE_SIZE + TILE_SIZE, top: act.exit.y * TILE_SIZE + TILE_SIZE / 2, zIndex: 2 }}
            aria-hidden="true"
          />
        )}
        {/* Misma barrera del lado izquierdo: por la casilla 0 se vuelve al
            acto anterior. Sin esto no había ninguna pista de que ese
            camino llevaba a algún lado. */}
        {act.index > 0 && (
          <div
            className="map-exit-gate map-back-gate pointer-events-none"
            style={{ left: 0, top: act.entry.y * TILE_SIZE + TILE_SIZE / 2, zIndex: 2 }}
            aria-hidden="true"
          />
        )}

        <div
          className="absolute flex items-end justify-center"
          style={{ left: act.playground.x * TILE_SIZE, top: act.playground.y * TILE_SIZE - TILE_SIZE * 0.7, width: TILE_SIZE, height: TILE_SIZE * 1.7, zIndex: 2, cursor: 'pointer' }}
          onMouseEnter={() => setHoveredBossId(null)}
          onClick={() => enterTile(act.playground)}
        >
          <PlaygroundNode reachable={playgroundReachable} focused={onPlayground} />
        </div>
        <UtilityLabel x={act.playground.x} y={act.playground.y} text="Patio de juegos" widthPx={92} />

        <div
          className="absolute flex items-end justify-center"
          style={{ left: act.practice.x * TILE_SIZE, top: act.practice.y * TILE_SIZE - TILE_SIZE * 0.7, width: TILE_SIZE, height: TILE_SIZE * 1.7, zIndex: 2, cursor: 'pointer' }}
          onMouseEnter={() => setHoveredBossId(null)}
          onClick={() => enterTile(act.practice)}
        >
          <PracticeNode reachable={playgroundReachable} focused={onPractice} />
        </div>
        <UtilityLabel x={act.practice.x} y={act.practice.y} text="Patio de prácticas" widthPx={112} />

        <div
          className="absolute flex items-end justify-center"
          style={{ left: act.mercader.x * TILE_SIZE, top: act.mercader.y * TILE_SIZE - TILE_SIZE * 0.7, width: TILE_SIZE, height: TILE_SIZE * 1.7, zIndex: 2, cursor: 'pointer' }}
          onMouseEnter={() => setHoveredBossId(null)}
          onClick={() => enterTile(act.mercader)}
        >
          <ShopNode unlocked={shopUnlocked} focused={onMercader} />
        </div>
        <UtilityLabel
          x={act.mercader.x}
          y={act.mercader.y}
          text={shopUnlocked ? 'Tienda del Mercader' : `Tienda · tras el jefe ${SHOP_UNLOCK_BOSS_NUMBER}`}
          widthPx={shopUnlocked ? 124 : 132}
        />

        {act.nodes.map((n) => {
          const boss = bossByIdMap.get(n.bossId)
          if (!boss) return null
          return (
            <div
              key={n.bossId}
              className="absolute flex items-end justify-center"
              style={{ left: n.x * TILE_SIZE, top: n.y * TILE_SIZE - TILE_SIZE * 0.7, width: TILE_SIZE, height: TILE_SIZE * 1.7, zIndex: 2, cursor: 'pointer' }}
              onMouseEnter={() => setHoveredBossId(n.bossId)}
              onMouseLeave={() => setHoveredBossId((cur) => (cur === n.bossId ? null : cur))}
              onClick={() => enterTile(n)}
            >
              {detailBoss?.id === n.bossId && (
                <NodeDetailPopover boss={detailBoss} state={bossStates[n.bossId] ?? 'locked'} below={n.y <= 3} />
              )}
              <BossNode boss={boss} state={bossStates[n.bossId] ?? 'locked'} focused={pos.x === n.x && pos.y === n.y} />
            </div>
          )
        })}

        <div
          className="absolute flex items-center justify-center"
          style={{ left: pos.x * TILE_SIZE, top: pos.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, zIndex: 3, transition: 'left 0.14s ease-out, top 0.14s ease-out' }}
        >
          <PlayerAvatar facing={facing} stepping={stepping} />
        </div>

        {splash && (
          <NodeSplash
            x={splash.x * TILE_SIZE + TILE_SIZE / 2}
            y={splash.y * TILE_SIZE + TILE_SIZE / 2}
            onDone={() => setSplash(null)}
          />
        )}
      </div>

      {warning && <RodolfoMapWarning message={warning} onClose={() => setWarning(null)} />}
    </div>
    </div>
  )
}
