'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Header from '@/components/layout/Header'
import Win from '@/components/ui/Win'
import BossSprite from '@/components/game/BossSprite'
import StripSprite from '@/components/game/StripSprite'
import AsciiArtCanvas from '@/components/game/ascii/AsciiArtCanvas'
import HandAsciiCanvas from '@/components/game/ascii/HandAsciiCanvas'
import type { HandArt } from '@/lib/game/ascii/hand/kit'
import { DRAGON_ART } from '@/lib/game/ascii/hand/dragon'
import { RODOLFO_ART } from '@/lib/game/ascii/hand/rodolfo'
import { MercaderPortrait } from '@/components/game/shop/MercaderPortrait'
import { MercaderAmbulantePortrait } from '@/components/game/shop/MercaderAmbulantePortrait'
import { PixelGrid } from '@/components/game/items/ItemSprites'
import { ICON_ARROW_RIGHT, PixelBitmap } from '@/components/game/architect/desktop/PixelBitmap'
import { avatarRows, type AvatarId } from '@/components/game/map/avatars'
import { getBossById } from '@/lib/game/bosses'
import { ACTIVE_GUARDIAN, GUARDIAN_FRAMES, guardianSrc } from '@/lib/game/guardian-sprite'
import { ACTIVE_GOLEM, GOLEM_FRAMES, golemSrc } from '@/lib/game/golem-sprite'
import { ACTIVE_CRAFTERO, CRAFTERO_FRAMES, crafteroSrc } from '@/lib/game/craftero-sprite'
import { ACTIVE_ARCHIVISTA, ARCHIVISTA_FRAMES, archivistaSrc } from '@/lib/game/archivista-sprite'
import { ACTIVE_ORACULO, ORACULO_FRAMES, oraculoSrc } from '@/lib/game/oraculo-sprite'
import { ACTIVE_MERCADER_V3, MERCADER_V3_FRAMES, mercaderV3Src } from '@/lib/game/mercader-v3-sprite'
import {
  canvasToRaster, loadRaster, rasterToAscii, svgToRaster, type AsciiArt, type AsciiStyle, type Raster,
} from '@/lib/game/ascii/sprite-ascii'

// Laboratorio (solo docente): cada jefe y personaje que todavía no tenía arte
// ASCII, uno por uno, al lado de su pixel art. El ASCII se calcula del sprite
// real, así los dos son siempre el mismo dibujo. Los que ya tienen su versión
// dibujada a mano (lib/game/ascii/hand/) la muestran primero, como "A mano".

const HAND: Record<string, HandArt> = { 'dragon-rojo': DRAGON_ART, rodolfo: RODOLFO_ART }
type LabStyle = AsciiStyle | 'mano'

type Source =
  | { kind: 'image'; src: string; frame?: { w: number; h: number } }
  | { kind: 'dom' } // se lee del <svg>/<canvas> que dibuja el pixel art en pantalla

interface Entry {
  id: string
  name: string
  group: 'Jefe' | 'Personaje'
  file: string
  color: string
  source: Source
  pixel: ReactNode
}

const PIXEL_PX = 256
const PIXEL_FIT = 460 // lado máximo del pixel art en la ventana
const PIXEL_FIT_SIDE = 300 // con el dibujo a mano, el pixel art queda de referencia al costado
const ASCII_BODY_H = 640
const boss = (id: string) => getBossById(id)!
const bossPixel = (id: string) => <BossSprite boss={boss(id)} size="lg" animated />
const strip = (src: string, frames: number, label: string) => <StripSprite src={src} frames={frames} frameMs={200} px={PIXEL_PX} label={label} />
const avatar = (id: AvatarId) => <PixelGrid rows={avatarRows(id, 'down', 0)} size={PIXEL_PX} />

const ENTRIES: Entry[] = [
  { id: 'creeper-formulario', name: 'Creeper Formulario', group: 'Jefe', file: 'CREEPER', color: boss('creeper-formulario').color, source: { kind: 'image', src: '/sprites/creeper-formulario.gif' }, pixel: bossPixel('creeper-formulario') },
  { id: 'guardian-puerta', name: 'Guardián de la Puerta', group: 'Jefe', file: 'GUARDIAN', color: boss('guardian-puerta').color, source: { kind: 'image', src: guardianSrc(ACTIVE_GUARDIAN), frame: { w: 64, h: 64 } }, pixel: strip(guardianSrc(ACTIVE_GUARDIAN), GUARDIAN_FRAMES, 'Guardián') },
  { id: 'golem-infinito', name: 'Golem Infinito', group: 'Jefe', file: 'GOLEM', color: boss('golem-infinito').color, source: { kind: 'image', src: golemSrc(ACTIVE_GOLEM), frame: { w: 64, h: 64 } }, pixel: strip(golemSrc(ACTIVE_GOLEM), GOLEM_FRAMES, 'Golem') },
  { id: 'mercader-abismo', name: 'Mercader del Abismo', group: 'Jefe', file: 'MERCADER', color: boss('mercader-abismo').color, source: { kind: 'image', src: mercaderV3Src(ACTIVE_MERCADER_V3), frame: { w: 64, h: 64 } }, pixel: <MercaderPortrait scale={4} /> },
  { id: 'maestro-craftero', name: 'Maestro Craftero', group: 'Jefe', file: 'CRAFTERO', color: boss('maestro-craftero').color, source: { kind: 'image', src: crafteroSrc(ACTIVE_CRAFTERO), frame: { w: 64, h: 64 } }, pixel: strip(crafteroSrc(ACTIVE_CRAFTERO), CRAFTERO_FRAMES, 'Craftero') },
  { id: 'archivista', name: 'El Archivista', group: 'Jefe', file: 'ARCHIVISTA', color: boss('archivista').color, source: { kind: 'image', src: archivistaSrc(ACTIVE_ARCHIVISTA), frame: { w: 64, h: 64 } }, pixel: strip(archivistaSrc(ACTIVE_ARCHIVISTA), ARCHIVISTA_FRAMES, 'Archivista') },
  { id: 'constructor-vacio', name: 'Constructor del Vacío', group: 'Jefe', file: 'CONSTRUCTOR', color: boss('constructor-vacio').color, source: { kind: 'image', src: '/sprites/constructor-vacio.gif' }, pixel: bossPixel('constructor-vacio') },
  { id: 'oraculo-oscuro', name: 'Oráculo Oscuro', group: 'Jefe', file: 'ORACULO', color: boss('oraculo-oscuro').color, source: { kind: 'image', src: oraculoSrc(ACTIVE_ORACULO), frame: { w: 64, h: 64 } }, pixel: strip(oraculoSrc(ACTIVE_ORACULO), ORACULO_FRAMES, 'Oráculo') },
  { id: 'contador-almas', name: 'Contador de Almas', group: 'Jefe', file: 'CONTADOR', color: boss('contador-almas').color, source: { kind: 'image', src: '/sprites/contador-almas.gif' }, pixel: bossPixel('contador-almas') },
  { id: 'falsificador', name: 'El Falsificador', group: 'Jefe', file: 'FALSIFICADOR', color: boss('falsificador').color, source: { kind: 'dom' }, pixel: bossPixel('falsificador') },
  { id: 'la-hydra', name: 'La Hydra', group: 'Jefe', file: 'HYDRA', color: boss('la-hydra').color, source: { kind: 'image', src: '/sprites/la-hydra.gif' }, pixel: bossPixel('la-hydra') },
  { id: 'dragon-rojo', name: 'Dragón Rojo', group: 'Jefe', file: 'DRAGON', color: boss('dragon-rojo').color, source: { kind: 'image', src: '/sprites/dragon-rojo.gif' }, pixel: bossPixel('dragon-rojo') },
  { id: 'explorador', name: 'Alumno · Explorador', group: 'Personaje', file: 'EXPLORADOR', color: '#F5F5F5', source: { kind: 'dom' }, pixel: avatar('explorador') },
  { id: 'minero', name: 'Alumno · Minero', group: 'Personaje', file: 'MINERO', color: '#F5F5F5', source: { kind: 'dom' }, pixel: avatar('minero') },
  { id: 'bot', name: 'Alumno · Bot', group: 'Personaje', file: 'BOT', color: '#F5F5F5', source: { kind: 'dom' }, pixel: avatar('bot') },
  { id: 'rodolfo', name: 'Rodolfo', group: 'Personaje', file: 'RODOLFO', color: '#F4A3A8', source: { kind: 'image', src: '/manual/rodolfo.png' }, pixel: <img src="/manual/rodolfo.png" alt="Rodolfo" width={PIXEL_PX} height={PIXEL_PX} style={{ imageRendering: 'pixelated' }} /> },
  { id: 'ambulante', name: 'Mercader Ambulante', group: 'Personaje', file: 'AMBULANTE', color: '#7DD3FC', source: { kind: 'dom' }, pixel: <MercaderAmbulantePortrait scale={4} /> },
]

const STYLES: { id: LabStyle; label: string }[] = [
  { id: 'mano', label: 'A mano' },
  { id: 'fosforo', label: 'Fósforo' },
  { id: 'color', label: 'Color' },
  { id: 'contorno', label: 'Contorno' },
]
const DETAIL = [70, 100, 130]

function Toggle<T extends string | number>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="ascii-toggle" role="group">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>{o.label}</button>
      ))}
    </div>
  )
}

export default function AsciiLab() {
  const [idx, setIdx] = useState(0)
  const [style, setStyle] = useState<LabStyle>('mano')
  const [cols, setCols] = useState(100)
  const [raster, setRaster] = useState<Raster | null>(null)
  const [art, setArt] = useState<AsciiArt | null>(null)
  const [zoom, setZoom] = useState(1)
  const [paneW, setPaneW] = useState(560)
  const pixelRef = useRef<HTMLDivElement>(null)
  const asciiPane = useRef<HTMLDivElement>(null)
  const entry = ENTRIES[idx]
  const hand = HAND[entry.id]
  // "A mano" solo existe para los dibujados; el resto cae en Color.
  const shown: LabStyle = style === 'mano' && !hand ? 'color' : style
  const styleOptions = STYLES.filter((o) => o.id !== 'mano' || hand)

  // ?c=<id>&s=<estilo>&d=<columnas> abre directo un personaje (para compartir o capturar).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const i = ENTRIES.findIndex((e) => e.id === q.get('c'))
    if (i >= 0) setIdx(i)
    const st = q.get('s')
    if (st === 'mano' || st === 'fosforo' || st === 'color' || st === 'contorno') setStyle(st)
    const d = Number(q.get('d'))
    if (DETAIL.includes(d)) setCols(d)
  }, [])

  const go = useCallback((d: number) => setIdx((i) => (i + d + ENTRIES.length) % ENTRIES.length), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  // Raster del personaje: de la imagen, o de lo que dibujó el pixel art en pantalla.
  useEffect(() => {
    let alive = true
    setRaster(null)
    const src = entry.source
    if (src.kind === 'image') {
      loadRaster(src.src, src.frame).then((r) => { if (alive) setRaster(r) }).catch(() => {})
    } else {
      const t = setTimeout(() => {
        const root = pixelRef.current
        const cv = root?.querySelector('canvas')
        const svg = root?.querySelector('svg')
        if (cv) setRaster(canvasToRaster(cv))
        else if (svg) setRaster(svgToRaster(svg))
      }, 700)
      return () => { alive = false; clearTimeout(t) }
    }
    return () => { alive = false }
  }, [entry])

  useEffect(() => { setArt(raster && shown !== 'mano' ? rasterToAscii(raster, cols, shown) : null) }, [raster, cols, shown])

  // El pixel art se agranda a escala entera hasta llenar la ventana (píxeles nítidos).
  useEffect(() => {
    setZoom(1)
    const t = setTimeout(() => {
      const el = pixelRef.current?.firstElementChild as HTMLElement | null
      if (!el) return
      const side = Math.max(el.offsetWidth, el.offsetHeight)
      const fit = shown === 'mano' ? PIXEL_FIT_SIDE : PIXEL_FIT
      if (side > 0) setZoom(Math.max(1, Math.floor(fit / side)))
    }, 300)
    return () => clearTimeout(t)
  }, [entry, shown])

  // Ancho real de la ventana del ASCII (el dibujo a mano la llena).
  useEffect(() => {
    const el = asciiPane.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setPaneW(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="ascii-lab">
        <header className="ascii-lab-head">
          <div>
            <h1 className="ascii-lab-title">{entry.name}</h1>
            <p className="ascii-lab-sub">{entry.group} · {idx + 1} de {ENTRIES.length}</p>
          </div>
          <div className="ascii-lab-nav">
            <button type="button" className="ascii-arrow" onClick={() => go(-1)} aria-label="Anterior">
              <PixelBitmap rows={ICON_ARROW_RIGHT} scale={3} ink="currentColor" style={{ transform: 'scaleX(-1)' }} />
            </button>
            <button type="button" className="ascii-arrow" onClick={() => go(1)} aria-label="Siguiente">
              <PixelBitmap rows={ICON_ARROW_RIGHT} scale={3} ink="currentColor" />
            </button>
          </div>
        </header>

        <div className={shown === 'mano' ? 'ascii-lab-pair ascii-lab-pair--hand' : 'ascii-lab-pair'}>
          <Win title={`${entry.file}.SPR`} bodyStyle={{ display: 'grid', placeItems: 'center', padding: 24, height: ASCII_BODY_H, overflow: 'hidden', background: 'hsl(var(--bg))' }}>
            <div ref={pixelRef} key={entry.id} className="ascii-pixel" style={{ transform: `scale(${zoom})` }}>{entry.pixel}</div>
          </Win>
          <Win title={`${entry.file}.TXT`} active bodyStyle={{ padding: 0, height: ASCII_BODY_H, overflow: 'hidden', background: '#000' }}>
            <div ref={asciiPane} className="ascii-pane">
            {shown === 'mano' && hand
              ? <HandAsciiCanvas art={hand} width={paneW} height={ASCII_BODY_H - 40} label={`${entry.name} en ASCII, dibujado a mano`} />
              : art ? <AsciiArtCanvas art={art} style={shown as AsciiStyle} color={entry.color} width={520} height={520} label={`${entry.name} en ASCII`} /> : <span className="ascii-loading">Cargando…</span>}
            </div>
          </Win>
        </div>

        <div className="ascii-lab-controls">
          <Toggle value={shown} options={styleOptions} onChange={setStyle} />
          {shown !== 'mano' && <Toggle value={cols} options={DETAIL.map((d) => ({ id: d, label: `${d} col` }))} onChange={setCols} />}
        </div>

        <nav className="ascii-lab-list" aria-label="Personajes">
          {ENTRIES.map((e, i) => (
            <button key={e.id} type="button" aria-current={i === idx} onClick={() => setIdx(i)}>{e.name}</button>
          ))}
        </nav>
      </main>
    </div>
  )
}
