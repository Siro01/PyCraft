'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { BAND_TOKENS } from '@/components/ui/PixelFX'
import { sfx } from '@/lib/game/architect/sound'

// Efectos pixel del fondo de pantalla de la landing:
// - un campo de cuadraditos que titila en los bordes del escritorio;
// - al hacer clic en el fondo, el título se desarma en píxeles que salen
//   empujados desde el clic y vuelven a su lugar;
// - desde el clic se abre una onda de cuadrados de píxeles (el "cuadrado
//   dentro de cuadrado" del mapa) que se apaga a pasos.
// Todo sale de los tokens del tema activo. Con prefers-reduced-motion queda
// solo el campo de cuadraditos, quieto.

const CELL = 14 // mismo paso que el fondo de puntos
const SAMPLE = 5 // tamaño de cada píxel del título desarmado
const RING_PX = 4 // grosor de cada bloque de la onda
// Lo que se toca a propósito no dispara el efecto.
const IGNORE = '.desk-icon, [role="dialog"], a, button, input, textarea, .start-menu'

// hx/hy: su lugar en el título · sx/sy: dónde estaba al último clic · ox/oy: cuánto se aleja · d: retraso propio
interface Particle { hx: number; hy: number; x: number; y: number; sx: number; sy: number; ox: number; oy: number; d: number; c: string }

// Curva del título desarmado: sale despacio y frenando, y vuelve sin rebote.
const OUT_MS = 600
const BACK_MS = 1100
const STAGGER_MS = 140
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
interface Ring { x: number; y: number; t0: number; ink: string }

const token = (root: CSSStyleDeclaration, name: string) => `hsl(${root.getPropertyValue(name).trim()})`

export default function WallpaperFX({ areaRef, titleSelector }: { areaRef: RefObject<HTMLElement>; titleSelector: string }) {
  const ambientRef = useRef<HTMLCanvasElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const area = areaRef.current
    const ambient = ambientRef.current
    const fx = fxRef.current
    if (!area || !ambient || !fx) return
    const actx = ambient.getContext('2d')
    const ctx = fx.getContext('2d')
    if (!actx || !ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let w = 0
    let h = 0

    // ── Campo de cuadraditos en los bordes ──
    let tiles: { x: number; y: number; a: number }[] = []
    const buildTiles = () => {
      tiles = []
      const cols = Math.ceil(w / CELL)
      const rows = Math.ceil(h / CELL)
      const band = Math.max(6, Math.round(rows * 0.28))
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bottom = 1 - (rows - 1 - r) / band
          const top = (1 - r / (band * 0.6)) * 0.7
          const side = (1 - Math.min(c, cols - 1 - c) / (band * 0.8)) * 0.55
          const p = Math.max(bottom, top, side, 0)
          if (Math.random() < p * p * 0.6) tiles.push({ x: c * CELL + 2, y: r * CELL + 2, a: 0.05 + Math.random() * 0.16 })
        }
      }
    }
    const drawAmbient = () => {
      const root = getComputedStyle(document.documentElement)
      const ink = token(root, '--tx')
      actx.setTransform(dpr, 0, 0, dpr, 0, 0)
      actx.clearRect(0, 0, w, h)
      actx.fillStyle = ink
      for (const t of tiles) { actx.globalAlpha = t.a; actx.fillRect(t.x, t.y, CELL - 4, CELL - 4) }
      actx.globalAlpha = 1
    }

    const resize = () => {
      w = area.clientWidth
      h = area.clientHeight
      for (const c of [ambient, fx]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
      buildTiles()
      drawAmbient()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(area)
    // El tema cambia los tokens: se repinta el campo con la tinta nueva.
    const themeObs = new MutationObserver(drawAmbient)
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-season'] })

    // Titileo a pasos (6 por segundo), como frames de sprite.
    const twinkle = reduced ? undefined : setInterval(() => {
      for (let i = 0; i < 8 && tiles.length; i++) {
        const t = tiles[Math.floor(Math.random() * tiles.length)]
        t.a = Math.random() < 0.15 ? 0.28 : 0.04 + Math.random() * 0.14
      }
      drawAmbient()
    }, 160)

    // ── Título desarmado y cofre ──
    let parts: Particle[] | null = null
    let rings: Ring[] = []
    let raf = 0
    let kick = 0
    const title = () => area.querySelector<HTMLElement>(titleSelector)

    const sampleTitle = (): Particle[] => {
      const el = title()
      if (!el) return []
      const ar = area.getBoundingClientRect()
      const root = getComputedStyle(document.documentElement)
      const bands = BAND_TOKENS.map((t) => token(root, t))
      const off = document.createElement('canvas')
      off.width = Math.ceil(w)
      off.height = Math.ceil(h)
      const o = off.getContext('2d', { willReadFrequently: true })
      if (!o) return []
      const out: Particle[] = []
      el.querySelectorAll<HTMLElement>('[data-px]').forEach((word) => {
        const cs = getComputedStyle(word)
        o.clearRect(0, 0, off.width, off.height)
        o.font = `${cs.fontSize} ${cs.fontFamily}`
        o.textBaseline = 'middle'
        o.fillStyle = '#000'
        // Mismo espaciado que el título real, así al volver no salta.
        ;(o as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = cs.letterSpacing
        const rect = word.getBoundingClientRect()
        o.fillText(word.textContent ?? '', rect.left - ar.left, rect.top - ar.top + rect.height / 2)
        const banded = word.dataset.px === 'band'
        const color = banded ? '' : cs.color
        const x0 = Math.max(0, Math.floor(rect.left - ar.left))
        const y0 = Math.max(0, Math.floor(rect.top - ar.top))
        const ww = Math.min(off.width - x0, Math.ceil(rect.width) + 4)
        const hh = Math.min(off.height - y0, Math.ceil(rect.height))
        if (ww <= 0 || hh <= 0) return
        const data = o.getImageData(x0, y0, ww, hh).data
        for (let y = 0; y < hh; y += SAMPLE) {
          for (let x = 0; x < ww; x += SAMPLE) {
            const i = ((y + (SAMPLE >> 1)) * ww + x + (SAMPLE >> 1)) * 4 + 3
            if ((data[i] ?? 0) < 120) continue
            const c = banded ? bands[Math.min(bands.length - 1, Math.floor((y / hh) * bands.length))] : color
            out.push({ hx: x0 + x, hy: y0 + y, x: x0 + x, y: y0 + y, sx: x0 + x, sy: y0 + y, ox: 0, oy: 0, d: 0, c })
          }
        }
      })
      return out
    }

    const ringAt = (x: number, y: number): Ring => ({ x, y, t0: performance.now(), ink: token(getComputedStyle(document.documentElement), '--tx') })

    // Contorno cuadrado hecho de bloques sueltos, con un hueco cada tanto: se lee como píxeles, no como línea.
    const square = (cx: number, cy: number, half: number) => {
      const step = RING_PX * 2
      const x0 = Math.round((cx - half) / RING_PX) * RING_PX
      const y0 = Math.round((cy - half) / RING_PX) * RING_PX
      const n = Math.max(1, Math.round((half * 2) / step))
      for (let i = 0; i <= n; i++) {
        const o = i * step
        ctx.fillRect(x0 + o, y0, RING_PX, RING_PX)
        ctx.fillRect(x0 + o, y0 + n * step, RING_PX, RING_PX)
        ctx.fillRect(x0, y0 + o, RING_PX, RING_PX)
        ctx.fillRect(x0 + n * step, y0 + o, RING_PX, RING_PX)
      }
    }

    const frame = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      let busy = false

      if (parts) {
        const since = now - kick
        for (const p of parts) {
          const t = since - p.d
          const peakX = p.hx + p.ox
          const peakY = p.hy + p.oy
          if (t > 0 && t < OUT_MS) {
            const e = easeOut(t / OUT_MS)
            p.x = p.sx + (peakX - p.sx) * e
            p.y = p.sy + (peakY - p.sy) * e
          } else if (t >= OUT_MS) {
            const e = easeInOut(Math.min(1, (t - OUT_MS) / BACK_MS))
            p.x = peakX + (p.hx - peakX) * e
            p.y = peakY + (p.hy - peakY) * e
          }
          ctx.fillStyle = p.c
          // A pasos de píxel: nada de posiciones con decimales.
          ctx.fillRect(Math.round(p.x), Math.round(p.y), SAMPLE - 1, SAMPLE - 1)
        }
        if (since > OUT_MS + BACK_MS + STAGGER_MS) {
          parts = null
          title()?.removeAttribute('data-fx')
        }
        // Un cuadro más después de terminar, para dejar el canvas limpio sobre el título real.
        busy = true
      }

      rings = rings.filter((r) => {
        const t = now - r.t0
        if (t > 760) return false
        ctx.fillStyle = r.ink
        // Tres cuadrados que salen uno detrás del otro; crecen y se apagan a pasos de 80 ms.
        for (let k = 0; k < 3; k++) {
          const tk = t - k * 110
          if (tk < 0 || tk > 520) continue
          const step = Math.floor(tk / 80)
          ctx.globalAlpha = Math.max(0, 1 - step / 7) * (k === 0 ? 1 : 0.6)
          square(r.x, r.y, 8 + step * 18)
        }
        ctx.globalAlpha = 1
        return true
      })
      if (rings.length) busy = true

      raf = busy ? requestAnimationFrame(frame) : 0
    }

    const onDown = (e: PointerEvent) => {
      if (reduced || e.button > 0) return
      const target = e.target as HTMLElement | null
      if (target?.closest(IGNORE)) return
      const ar = area.getBoundingClientRect()
      const cx = e.clientX - ar.left
      const cy = e.clientY - ar.top
      if (!parts) {
        parts = sampleTitle()
        if (parts.length) title()?.setAttribute('data-fx', 'on')
        else parts = null
      }
      if (parts) {
        kick = performance.now()
        for (const p of parts) {
          const dx = p.x - cx
          const dy = p.y - cy
          const d = Math.hypot(dx, dy) || 1
          // Cerca del clic se aleja más; lejos apenas se mueve. Nunca más de ~50px.
          const fall = Math.max(0, 1 - d / 650)
          const amount = fall * fall * 44 + 4
          p.sx = p.x
          p.sy = p.y
          p.ox = (dx / d) * amount + (Math.random() - 0.5) * 6
          p.oy = (dy / d) * amount + (Math.random() - 0.5) * 6
          p.d = Math.random() * STAGGER_MS
        }
      }
      rings.push(ringAt(cx, cy))
      if (rings.length > 4) rings.shift()
      sfx.glitch()
      if (!raf) raf = requestAnimationFrame(frame)
    }
    area.addEventListener('pointerdown', onDown)

    return () => {
      ro.disconnect()
      themeObs.disconnect()
      if (twinkle) clearInterval(twinkle)
      cancelAnimationFrame(raf)
      area.removeEventListener('pointerdown', onDown)
      title()?.removeAttribute('data-fx')
    }
  }, [areaRef, titleSelector])

  return (
    <>
      <canvas ref={ambientRef} aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 0 }} />
      <canvas ref={fxRef} aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 4 }} />
    </>
  )
}
