'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import AppWindow, { type WindowMode } from '@/components/ui/AppWindow'
import { ICON_FILE, ICON_FOLDER, ICON_TERMINAL, PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import InventoryApp from '@/components/game/inventory/InventoryApp'
import { ShopGlyph } from '@/components/game/shop/ShopIcons'
import StickerLayer from '@/components/game/stickers/StickerLayer'
import { ACT_MAPS, MAP_PALETTES, MAP_PALETTE_ON_ACCENT, type MapPoint, type MapTheme } from '@/lib/game/act-maps'
import { sfx } from '@/lib/game/architect/sound'
import { DIAMONDS_PER_BOSS, SHOP_UNLOCK_BOSS_ID } from '@/lib/game/shop'
import { diamondsAvailable, getPlaygroundState, playgroundLevel } from '@/lib/storage/local-store'
import ActMap from './map/ActMap'
import ActEmblem from './map/ActEmblem'
import type { AvatarId } from './map/avatars'
import PixelTitle from './map/PixelTitle'
import type { NodeState } from './map/MapNodeIcon'
import QuestLog from './map/QuestLog'
import ResetBossButton from './ResetBossButton'
import type { Boss } from '@/types'

export interface BossProgressEntry {
  hp: number
  defeated: boolean
}

interface BossMapProps {
  bosses: Boss[]
  progress: Record<string, BossProgressEntry>
  enabledIds: Set<string>
  username?: string
  totalDefeated: number
  headerExtra?: React.ReactNode
  notice?: React.ReactNode
  emptyState?: React.ReactNode
  testMode?: boolean
  /** El docente: la tienda del mapa le queda abierta siempre, para poder revisarla. */
  isAdmin?: boolean
  /** Diseño del personaje del mapa (por defecto, el explorador). */
  avatar?: AvatarId
  /** Repasos con Rodolfo habilitados (ids de jefe) — hacen aparecer la Escuelita en el mapa. */
  repasoIds?: string[]
}

const PALETTE_LABEL: Record<MapTheme, string> = { light: 'BLANCO', dark: 'NEGRO', red: 'COLOR' }
const jersey = 'var(--font-jersey), monospace'
const monoLabel = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'hsl(var(--tx3))' }
const DESK_MENU_H = 28
const DESK_TASKBAR_H = 34

type WinId = 'stats' | 'log' | 'controls' | 'inventory'
interface WinState { mode: WindowMode; x: number; y: number; z: number }
const WIN_TITLE: Record<WinId, string> = { stats: 'PROGRESO.TXT', log: 'BITÁCORA.LOG', controls: 'CONTROLES.TXT', inventory: 'INVENTARIO.EXE' }

export default function BossMap({
  bosses, progress, enabledIds, username, totalDefeated, headerExtra, notice, emptyState, testMode, isAdmin = false, avatar, repasoIds,
}: BossMapProps) {
  const firstAvailableId = useMemo(
    () => bosses.find((b) => enabledIds.has(b.id) && !progress[b.id]?.defeated)?.id,
    [bosses, enabledIds, progress]
  )

  const reachedActIndex = useMemo(() => {
    if (firstAvailableId) {
      const idx = ACT_MAPS.findIndex((act) => act.bosses.some((b) => b.id === firstAvailableId))
      if (idx >= 0) return idx
    }
    let idx = 0
    ACT_MAPS.forEach((act, i) => {
      if (act.bosses.some((b) => enabledIds.has(b.id) || progress[b.id]?.defeated)) idx = i
    })
    return idx
  }, [enabledIds, firstAvailableId, progress])

  const bossStates = useMemo(() => {
    const map: Record<string, NodeState> = {}
    for (const b of bosses) {
      const defeated = progress[b.id]?.defeated ?? false
      const available = enabledIds.has(b.id) && !defeated
      map[b.id] = defeated ? 'defeated' : b.id === firstAvailableId ? 'current' : available ? 'available' : 'locked'
    }
    return map
  }, [bosses, enabledIds, firstAvailableId, progress])

  const [actIndex, setActIndex] = useState(reachedActIndex)
  const [turning, setTurning] = useState<'out' | 'in' | null>(null)
  const [paletteOverride, setPaletteOverride] = useState<MapTheme | null>(null)

  // Escritorio del dashboard: el mapa es la única ventana que no se puede
  // cerrar ni minimizar (es el gameplay); el resto son ventanas de verdad
  // que el alumno abre desde los íconos, arrastra, minimiza a la barra de
  // tareas o cierra — así no tiene por qué ver todo junto de entrada.
  const zRef = useRef(3)
  const [activeWin, setActiveWin] = useState<'map' | WinId>('map')
  const [mapMaximized, setMapMaximized] = useState(false)
  // El mapa ahora es una ventana de verdad: se minimiza a la barra de tareas
  // (con un "chupón" de 0.22s antes de desaparecer) y se restaura desde ahí
  // o desde el ícono mapa.exe. El avatar vuelve a donde estaba.
  const [mapMode, setMapMode] = useState<'open' | 'closing' | 'minimized'>('open')
  const posByAct = useRef<Record<string, MapPoint>>({})
  const [arrival, setArrival] = useState<'entry' | 'exit' | 'saved'>('saved')
  // Arrancan un casillero por debajo de la fila de íconos, para no taparla
  // apenas se carga la página.
  const [stats, setStats] = useState<WinState>({ mode: 'normal', x: 16, y: 80, z: 1 })
  const [log, setLog] = useState<WinState>({ mode: 'minimized', x: 48, y: 160, z: 2 })
  // Los controles eran un párrafo fijo dentro del mapa — ahora es su propia
  // ventana, cerrada por defecto, así el mapa queda más limpio de entrada.
  const [controls, setControls] = useState<WinState>({ mode: 'minimized', x: 80, y: 120, z: 0 })
  const [inventory, setInventory] = useState<WinState>({ mode: 'minimized', x: 112, y: 100, z: 0 })

  // Nivel del patio de juegos y diamantes disponibles — vienen de
  // localStorage, así que se leen recién montado (server-safe: 0/1 al
  // principio) para no desincronizar el HTML del servidor con el del cliente.
  const [level, setLevel] = useState(1)
  const [diamonds, setDiamonds] = useState(0)
  useEffect(() => {
    setLevel(playgroundLevel(getPlaygroundState().xp).level)
    setDiamonds(diamondsAvailable(totalDefeated))
  }, [totalDefeated])

  const SETTERS: Record<WinId, React.Dispatch<React.SetStateAction<WinState>>> = { stats: setStats, log: setLog, controls: setControls, inventory: setInventory }

  const bringToFront = (id: WinId) => {
    zRef.current += 1
    setActiveWin(id)
    const z = zRef.current
    SETTERS[id]((s) => ({ ...s, z }))
  }
  const openWin = (id: WinId) => {
    sfx.open()
    bringToFront(id)
    SETTERS[id]((s) => (s.mode === 'minimized' ? { ...s, mode: 'normal' } : s))
  }

  // El sitio tiene su propio <header> arriba de esta página — se mide acá
  // para que "pantalla completa" llene lo que queda debajo sin taparlo.
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const measure = () => document.documentElement.style.setProperty('--dash-header-h', `${header.getBoundingClientRect().height}px`)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(header)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { setActIndex(reachedActIndex) }, [reachedActIndex])

  const act = ACT_MAPS[actIndex]
  const palette = paletteOverride ?? act.palette

  const minimizeMap = () => {
    if (mapMode !== 'open') return
    sfx.minimize()
    setMapMaximized(false)
    setMapMode('closing')
    setTimeout(() => setMapMode('minimized'), 220)
  }
  const restoreMap = () => {
    sfx.open()
    setArrival('saved')
    setMapMode('open')
    setActiveWin('map')
  }
  const selectAct = (i: number) => {
    if (i === actIndex) return
    sfx.tab()
    setArrival('saved')
    setActIndex(i)
    setPaletteOverride(null)
  }

  // Cada acto nuevo que aparece canta su título.
  useEffect(() => { if (mapMode === 'open') sfx.titleReveal() }, [actIndex, mapMode])

  const handleReachEdge = (direction: 'next' | 'prev') => {
    // Doble traba: ActMap ya se bloquea solo apenas agenda un cambio de acto,
    // pero esto queda como respaldo — mientras el giro de página está en
    // curso, un segundo llamado no vuelve a arrancarlo.
    if (turning) return
    const target = direction === 'next' ? actIndex + 1 : actIndex - 1
    if (target < 0 || target >= ACT_MAPS.length) return
    setTurning('out')
    setTimeout(() => {
      setArrival(direction === 'next' ? 'entry' : 'exit')
      setActIndex(target)
      setPaletteOverride(null)
      setTurning('in')
      setTimeout(() => setTurning(null), 420)
    }, 420)
  }

  const totalBosses = bosses.length
  const pct = totalBosses ? Math.round((totalDefeated / totalBosses) * 100) : 0

  const styleVars = { ...MAP_PALETTES[palette], '--on-accent': MAP_PALETTE_ON_ACCENT[palette] } as React.CSSProperties

  const minimized: { id: WinId | 'map'; title: string }[] = [
    ...(mapMode === 'minimized' ? [{ id: 'map' as const, title: 'MAPA_DE_JEFES.EXE' }] : []),
    ...(['stats', 'log', 'controls', 'inventory'] as WinId[])
      .filter((id) => ({ stats, log, controls, inventory }[id].mode === 'minimized'))
      .map((id) => ({ id, title: WIN_TITLE[id] })),
  ]

  const startAt = arrival === 'entry' ? act.entry : arrival === 'exit' ? act.exitApproach ?? act.entry : posByAct.current[act.key]
  const actDefeated = (i: number) => ACT_MAPS[i].bosses.filter((b) => bossStates[b.id] === 'defeated').length

  return (
    <main className="max-w-6xl mx-auto px-4 py-8" style={styleVars}>
      {notice}

      {enabledIds.size === 0 ? emptyState : (
        // El mismo escritorio "PyCraft OS" del cofre y la landing: marco de
        // 2px + sombra dura + fondo punteado, para que se note como una
        // pantalla propia incluso en el tema blanco, donde antes se perdía
        // contra el fondo de la página.
        <div
          className="desk relative"
          style={{
            border: '2px solid hsl(var(--tx))',
            background: 'hsl(var(--bg))',
            backgroundImage: 'radial-gradient(hsl(var(--tx) / 0.18) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
            boxShadow: '6px 6px 0 hsl(var(--tx) / 0.18)',
          }}
        >
          <StickerLayer surface="dashboard" />

          {/* Menú superior — igual al de PycraftOS en la landing */}
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1"
            style={{ minHeight: DESK_MENU_H, background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))' }}
          >
            <span style={{ fontFamily: jersey, fontSize: 18, letterSpacing: '0.08em', color: 'hsl(var(--tx))' }}>PYCRAFT OS</span>
            <span className="hidden sm:block" style={{ flex: 1 }} />
            <div className="flex items-center gap-1" title={`Nivel ${level} — jugá el patio de juegos para subir`}>
              <span className="label-mono" style={{ color: 'hsl(var(--tx3))' }}>NIVEL</span>
              <span style={{ fontFamily: jersey, fontSize: 16, color: 'hsl(var(--accent))' }}>{level}</span>
            </div>
            <div className="flex items-center gap-1.5" style={{ border: '2px solid hsl(var(--tx))', padding: '2px 8px', background: 'hsl(var(--bg))' }} title={`${totalDefeated} jefes × ${DIAMONDS_PER_BOSS} diamantes + los del patio de juegos — gastalos en la tienda del Mercader del Abismo`}>
              <ShopGlyph glyph="crystal" size={13} color="hsl(var(--accent))" />
              <span className="tabular" style={{ fontFamily: jersey, fontSize: 16, color: 'hsl(var(--tx))' }}>{diamonds}</span>
            </div>
            <span className="hidden sm:inline" style={monoLabel}>Abrí los programas · arrastrá las ventanas</span>
          </div>

          <div className="p-3" style={mapMode === 'minimized' ? { minHeight: 520 } : undefined}>
            {/* Íconos para abrir cada ventana — reemplazan a los paneles que
                antes estaban todos visibles a la vez. */}
            <div className="flex items-center gap-2 mb-1 flex-wrap" role="group" aria-label="Programas del escritorio">
              <button type="button" className="desk-icon" onClick={() => (mapMode === 'minimized' ? restoreMap() : setActiveWin('map'))} title="Abrir mapa.exe">
                <span className="flex items-center justify-center" style={{ width: 48, height: 48, border: '2px solid hsl(var(--tx))', background: 'hsl(var(--bg))' }}>
                  <ActEmblem actKey={act.key} size={28} color="hsl(var(--tx))" />
                </span>
                <span className="desk-lbl">mapa.exe</span>
              </button>
              <button type="button" className="desk-icon" onClick={() => openWin('stats')} title="Abrir progreso.txt">
                <PixelBitmap rows={ICON_FILE} scale={4} />
                <span className="desk-lbl">progreso.txt</span>
              </button>
              <button type="button" className="desk-icon" onClick={() => openWin('log')} title="Abrir bitacora.log">
                <PixelBitmap rows={ICON_TERMINAL} scale={4} />
                <span className="desk-lbl">bitacora.log</span>
              </button>
              <button type="button" className="desk-icon" onClick={() => openWin('controls')} title="Abrir controles.txt">
                <PixelBitmap rows={ICON_FILE} scale={4} />
                <span className="desk-lbl">controles.txt</span>
              </button>
              <button type="button" className="desk-icon" onClick={() => openWin('inventory')} title="Abrir inventario.exe">
                <PixelBitmap rows={ICON_FOLDER} scale={4} />
                <span className="desk-lbl">inventario.exe</span>
              </button>
            </div>

          {/* MAPA_DE_JEFES.EXE: ventana del gameplay. Vive en el flujo de la
              página (le da su alto al escritorio), pero ahora se puede
              minimizar a la barra de tareas y poner en pantalla completa. */}
          <div className={mapMode === 'closing' ? 'win-minimizing' : undefined}>
          <AppWindow
            title="MAPA_DE_JEFES.EXE"
            icon={<ActEmblem actKey={act.key} size={14} color={activeWin === 'map' ? 'hsl(var(--bg))' : 'hsl(var(--tx))'} />}
            x={0} y={0} w={0}
            z={mapMaximized ? 60 : 0}
            active={activeWin === 'map'}
            mode={mapMode === 'minimized' ? 'minimized' : mapMaximized ? 'maximized' : 'normal'}
            flow={!mapMaximized}
            onFocus={() => setActiveWin('map')}
            onMinimize={minimizeMap}
            onClose={minimizeMap}
            onToggleMaximize={() => setMapMaximized((m) => !m)}
            bodyStyle={{ padding: mapMaximized ? 10 : 12 }}
          >
          <div className="flex flex-col" style={mapMaximized ? { height: '100%' } : undefined}>
            {/* Pestañas de acto: un ícono por acto, el número y cuántos jefes van. */}
            <div className="flex items-end justify-between gap-2 flex-wrap" style={{ flexShrink: 0 }}>
              <div className="flex items-end gap-1 flex-wrap" role="tablist" aria-label="Actos">
                {ACT_MAPS.map((a, i) => {
                  const on = i === actIndex
                  const reached = i <= reachedActIndex
                  return (
                    <button
                      key={a.key}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      aria-label={`${a.roman}: ${a.title}${reached ? '' : ' (todavía no llegaste)'}`}
                      title={`${a.roman} · ${a.title}`}
                      onClick={() => selectAct(i)}
                      onMouseEnter={() => sfx.hover()}
                      className={`act-tab${on ? ' act-tab--on' : ''}${a.ascii ? ' act-tab--glitch' : ''}`}
                      style={{ opacity: reached || on ? 1 : 0.55 }}
                    >
                      <ActEmblem actKey={a.key} size={18} color={on ? 'hsl(var(--bg))' : 'hsl(var(--tx))'} />
                      <span style={{ fontFamily: jersey, fontSize: 20, lineHeight: 1 }}>{a.roman.replace('ACTO ', '')}</span>
                      <span className="tabular" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 16, lineHeight: 1, opacity: 0.8 }}>
                        {actDefeated(i)}/{a.bosses.length}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Paleta del mapa: tres muestras, el default es el del acto. */}
              <div className="flex items-center gap-1.5 pb-1" role="group" aria-label="Paleta del mapa">
                {(['light', 'dark', 'red'] as MapTheme[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { sfx.theme(); setPaletteOverride(p) }}
                    title={`Paleta ${PALETTE_LABEL[p]}${p === act.palette ? ' (la de este acto)' : ''}`}
                    aria-label={`Paleta ${PALETTE_LABEL[p]}`}
                    aria-pressed={palette === p}
                    className="palette-swatch"
                    style={{
                      background: `hsl(${MAP_PALETTES[p]['--bg']})`,
                      boxShadow: `inset 0 0 0 3px hsl(${MAP_PALETTES[p]['--bg']}), inset 0 0 0 9px hsl(${MAP_PALETTES[p]['--accent']})`,
                      outline: palette === p ? '2px solid hsl(var(--tx))' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* El póster: doble marco, título pixel animado y el mapa. */}
            <div
              className={`map-poster${act.ascii ? ' map-poster--ascii' : ''} ${turning === 'out' ? 'map-page-turn-out' : turning === 'in' ? 'map-page-turn-in' : ''}`}
              style={mapMaximized ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : undefined}
            >
              <header className="flex flex-col items-center" style={{ padding: '14px 12px 8px', flexShrink: 0 }}>
                <PixelTitle text={act.title.toUpperCase()} scale={mapMaximized ? 4 : 5} glitch={act.ascii} playKey={act.key} />
                <div className="label-mono" style={{ color: 'hsl(var(--tx2))', marginTop: 6, fontSize: 12 }}>— {act.roman} —</div>
              </header>

              <div style={mapMaximized ? { flex: 1, minHeight: 0, padding: '0 12px' } : { padding: '0 12px' }}>
                {mapMode !== 'minimized' && (
                  <ActMap
                    key={act.key}
                    act={act}
                    bossStates={bossStates}
                    playgroundReachable={actIndex <= reachedActIndex}
                    shopUnlocked={isAdmin || !!progress[SHOP_UNLOCK_BOSS_ID]?.defeated}
                    onReachEdge={handleReachEdge}
                    fillHeight={mapMaximized}
                    startAt={startAt}
                    onPosChange={(p) => { posByAct.current[act.key] = p }}
                    keyboard={mapMode === 'open'}
                    avatar={avatar}
                    repasoIds={repasoIds}
                  />
                )}
              </div>

              {/* Pie: un casillero por jefe del acto + el emblema en la esquina, como la pokébola del póster. */}
              <footer className="flex items-center justify-between gap-3" style={{ padding: '8px 14px 12px', flexShrink: 0 }}>
                <div className="flex items-center gap-1.5" aria-label={`${actDefeated(actIndex)} de ${act.bosses.length} jefes derrotados en este acto`}>
                  {act.bosses.map((b) => {
                    const st = bossStates[b.id]
                    return (
                      <span
                        key={b.id}
                        title={b.name}
                        style={{
                          width: 12, height: 12, border: '2px solid hsl(var(--tx))',
                          background: st === 'defeated' ? 'hsl(var(--tx))' : st === 'current' ? 'hsl(var(--accent))' : 'transparent',
                          opacity: st === 'locked' ? 0.45 : 1,
                        }}
                      />
                    )
                  })}
                </div>
                <span className="label-mono hidden sm:inline" style={{ color: 'hsl(var(--tx3))' }}>WASD / ↑↓←→ · Enter · o hacé clic</span>
                <span className="map-poster-emblem"><ActEmblem actKey={act.key} size={20} color="hsl(var(--tx))" /></span>
              </footer>
            </div>

            {testMode && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center" style={{ flexShrink: 0 }}>
                {act.bosses.map((b) => (
                  (progress[b.id]?.defeated || (progress[b.id]?.hp ?? b.hpMax) < b.hpMax) && (
                    <ResetBossButton key={b.id} bossId={b.id} />
                  )
                ))}
              </div>
            )}
          </div>
          </AppWindow>
          </div>

          {mapMode === 'minimized' && (
            <button type="button" className="map-minimized-hint" onClick={restoreMap}>
              <ActEmblem actKey={act.key} size={20} color="hsl(var(--tx))" />
              <span>El mapa está minimizado. <u>Abrirlo</u></span>
            </button>
          )}

          {/* PROGRESO.TXT — bienvenida, jefes derrotados y ajustes de dificultad. */}
          <AppWindow
            title="PROGRESO.TXT"
            icon={<PixelBitmap rows={ICON_FILE} scale={2} ink={activeWin === 'stats' ? 'hsl(var(--bg))' : 'hsl(var(--tx))'} />}
            x={stats.x} y={stats.y} w={340} z={stats.z}
            active={activeWin === 'stats'}
            mode={stats.mode}
            onFocus={() => bringToFront('stats')}
            onMove={(x, y) => setStats((s) => ({ ...s, x, y }))}
            onClose={() => setStats((s) => ({ ...s, mode: 'minimized' }))}
            onMinimize={() => setStats((s) => ({ ...s, mode: 'minimized' }))}
            bodyStyle={{ padding: 16 }}
          >
            <h1 className="text-2xl tracking-wide" style={{ color: 'hsl(var(--tx))', lineHeight: 1.05 }}>
              Bienvenido, <span style={{ color: 'hsl(var(--accent))' }}>{username}</span>
            </h1>
            <p className="mt-1 mb-3" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 20, color: 'hsl(var(--tx2))' }}>
              {totalDefeated} / {totalBosses} jefes derrotados
            </p>
            <div className="flex justify-between label-mono mb-1.5">
              <span style={{ color: 'hsl(var(--tx3))' }}>Progreso total</span>
              <span style={{ color: 'hsl(var(--accent))' }}>{pct}%</span>
            </div>
            <div className="hp-track h-3 mb-3">
              <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: 'hsl(var(--accent))' }} />
            </div>
            {headerExtra}
          </AppWindow>

          {/* BITÁCORA.LOG — los 14 jefes con su estado, agrupados por acto. */}
          <AppWindow
            title="BITÁCORA.LOG"
            icon={<PixelBitmap rows={ICON_TERMINAL} scale={2} ink={activeWin === 'log' ? 'hsl(var(--bg))' : 'hsl(var(--tx))'} />}
            x={log.x} y={log.y} w={280} z={log.z}
            active={activeWin === 'log'}
            mode={log.mode}
            onFocus={() => bringToFront('log')}
            onMove={(x, y) => setLog((s) => ({ ...s, x, y }))}
            onClose={() => setLog((s) => ({ ...s, mode: 'minimized' }))}
            onMinimize={() => setLog((s) => ({ ...s, mode: 'minimized' }))}
          >
            <QuestLog
              bossStates={bossStates}
              activeActKey={act.key}
              onSelectAct={(i) => { selectAct(i); if (mapMode === 'minimized') restoreMap() }}
            />
          </AppWindow>

          {/* CONTROLES.TXT — cómo moverse, antes era un párrafo fijo dentro
              del mapa; ahora es opcional, para que el mapa arranque limpio. */}
          <AppWindow
            title="CONTROLES.TXT"
            icon={<PixelBitmap rows={ICON_FILE} scale={2} ink={activeWin === 'controls' ? 'hsl(var(--bg))' : 'hsl(var(--tx))'} />}
            x={controls.x} y={controls.y} w={300} z={controls.z}
            active={activeWin === 'controls'}
            mode={controls.mode}
            onFocus={() => bringToFront('controls')}
            onMove={(x, y) => setControls((s) => ({ ...s, x, y }))}
            onClose={() => setControls((s) => ({ ...s, mode: 'minimized' }))}
            onMinimize={() => setControls((s) => ({ ...s, mode: 'minimized' }))}
            bodyStyle={{ padding: 16 }}
          >
            <ul className="flex flex-col gap-2" style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, color: 'hsl(var(--tx2))', listStyle: 'none', margin: 0, padding: 0 }}>
              <li><strong style={{ color: 'hsl(var(--tx))' }}>← → ↑ ↓</strong> o <strong style={{ color: 'hsl(var(--tx))' }}>WASD</strong> — moverte</li>
              <li><strong style={{ color: 'hsl(var(--tx))' }}>Enter</strong> o <strong style={{ color: 'hsl(var(--tx))' }}>Espacio</strong> — entrar a una puerta</li>
              <li>Pasá el mouse por una puerta para ver el detalle</li>
              <li>Seguí el camino resaltado para cambiar de acto</li>
            </ul>
          </AppWindow>

          {/* INVENTARIO.EXE — amuletos del Mercader Ambulante + ítems y
              stickers del Mercader del Abismo, todos juntos. */}
          <AppWindow
            title="INVENTARIO.EXE"
            icon={<PixelBitmap rows={ICON_FOLDER} scale={2} ink={activeWin === 'inventory' ? 'hsl(var(--bg))' : 'hsl(var(--tx))'} />}
            x={inventory.x} y={inventory.y} w={340} z={inventory.z}
            active={activeWin === 'inventory'}
            mode={inventory.mode}
            onFocus={() => bringToFront('inventory')}
            onMove={(x, y) => setInventory((s) => ({ ...s, x, y }))}
            onClose={() => setInventory((s) => ({ ...s, mode: 'minimized' }))}
            onMinimize={() => setInventory((s) => ({ ...s, mode: 'minimized' }))}
            bodyStyle={{ padding: 16 }}
          >
            <InventoryApp />
          </AppWindow>

          </div>

          {/* Barra de tareas — siempre visible, igual que en PycraftOS de la
              landing: los minimizados se restauran desde acá. Deja lugar a la
              izquierda para el "✦ Decorar" de StickerLayer, que flota encima,
              y se desplaza de costado si no entra todo. */}
          <div
            className="flex items-center gap-2 px-2.5"
            style={{ height: DESK_TASKBAR_H, background: 'hsl(var(--surface))', borderTop: '2px solid hsl(var(--tx))', overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', paddingLeft: 136 }}
            role="group"
            aria-label="Barra de tareas"
          >
            {minimized.length === 0 ? (
              <span style={monoLabel}>Nada minimizado</span>
            ) : minimized.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => (w.id === 'map' ? restoreMap() : openWin(w.id))}
                style={{
                  fontFamily: 'var(--font-vt323), monospace', fontSize: 17, lineHeight: 1, padding: '2px 10px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                  background: 'transparent', color: 'hsl(var(--tx2))', border: '2px solid hsl(var(--tx))',
                }}
              >
                {w.title}
              </button>
            ))}
            <span style={{ flex: 1 }} />
            <span className="hidden sm:inline" style={{ ...monoLabel, whiteSpace: 'nowrap' }}>{minimized.length} minimizada{minimized.length === 1 ? '' : 's'}</span>
          </div>
        </div>
      )}
    </main>
  )
}
