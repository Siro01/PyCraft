'use client'

import { useEffect, useRef, useState } from 'react'

// HUD del alumno TEST: mide en la PC real cuánto rinde el juego (FPS, latencia, carga de WASM)
// y arma un reporte de texto para copiar. Solo se monta para sesiones de prueba.

const PING_EVERY_MS = 5000
const MAX_SAMPLES = 60

interface Stats {
  fps: number
  minFps: number
  jankFrames: number   // frames de más de 50 ms
  longTasks: number
  appPing: number | null
  dbPing: number | null
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
const max = (xs: number[]) => (xs.length ? Math.round(Math.max(...xs)) : null)
const fmt = (n: number | null, unit = 'ms') => (n === null ? '—' : `${n} ${unit}`)

function deviceInfo(): string[] {
  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { effectiveType?: string; downlink?: number; rtt?: number }
  }
  const c = nav.connection
  return [
    `Navegador: ${nav.userAgent}`,
    `CPU: ${nav.hardwareConcurrency ?? '?'} núcleos · RAM: ${nav.deviceMemory ? `~${nav.deviceMemory} GB` : '?'}`,
    `Pantalla: ${screen.width}x${screen.height} @${window.devicePixelRatio}x`,
    `Red: ${c?.effectiveType ?? '?'} · ${c?.downlink ?? '?'} Mbps · rtt ${c?.rtt ?? '?'} ms`,
  ]
}

function wasmLoads(): string[] {
  return performance
    .getEntriesByType('resource')
    .filter((r) => /pyodide|sql-wasm/.test(r.name))
    .map((r) => {
      const e = r as PerformanceResourceTiming
      const kb = e.transferSize ? `${Math.round(e.transferSize / 1024)} KB` : 'caché'
      return `${e.name.split('/').pop()}: ${Math.round(e.duration)} ms (${kb})`
    })
}

export default function TestHud() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState<Stats>({ fps: 0, minFps: 0, jankFrames: 0, longTasks: 0, appPing: null, dbPing: null })

  const appPings = useRef<number[]>([])
  const dbPings = useRef<number[]>([])
  const fpsLog = useRef<number[]>([])
  const jank = useRef(0)
  const longTasks = useRef(0)
  const startedAt = useRef(Date.now())

  // FPS y frames lentos
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let windowStart = last
    let frames = 0
    const tick = (now: number) => {
      if (now - last > 50) jank.current++
      last = now
      frames++
      if (now - windowStart >= 1000) {
        const fps = Math.round((frames * 1000) / (now - windowStart))
        fpsLog.current.push(fps)
        if (fpsLog.current.length > 600) fpsLog.current.shift()
        frames = 0
        windowStart = now
        setStats((s) => ({
          ...s,
          fps,
          minFps: Math.min(...fpsLog.current),
          jankFrames: jank.current,
          longTasks: longTasks.current,
        }))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Tareas largas del hilo principal (Pyodide compilando, animaciones pesadas…)
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return
    try {
      const obs = new PerformanceObserver((list) => { longTasks.current += list.getEntries().length })
      obs.observe({ entryTypes: ['longtask'] })
      return () => obs.disconnect()
    } catch { /* longtask no soportado */ }
  }, [])

  // Latencia: app (Vercel + middleware) y base de datos (navegador → Supabase)
  useEffect(() => {
    let alive = true
    const push = (arr: number[], v: number) => { arr.push(v); if (arr.length > MAX_SAMPLES) arr.shift() }

    const ping = async () => {
      let t = performance.now()
      try {
        await fetch('/api/test-ping', { cache: 'no-store' })
        push(appPings.current, performance.now() - t)
      } catch { /* sin red: no suma muestra */ }

      try {
        const { createClient } = await import('@/lib/supabase/client')
        t = performance.now()
        await createClient().from('profiles').select('id').limit(1)
        push(dbPings.current, performance.now() - t)
      } catch { /* idem */ }

      if (alive) {
        setStats((s) => ({
          ...s,
          appPing: appPings.current.at(-1) !== undefined ? Math.round(appPings.current.at(-1)!) : null,
          dbPing: dbPings.current.at(-1) !== undefined ? Math.round(dbPings.current.at(-1)!) : null,
        }))
      }
    }

    ping()
    const id = setInterval(ping, PING_EVERY_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const report = () => {
    const mins = Math.round((Date.now() - startedAt.current) / 60000)
    return [
      `── Reporte TEST · ${new Date().toLocaleString('es-AR')} · ${location.pathname} ──`,
      ...deviceInfo(),
      `Sesión medida: ${mins} min`,
      `FPS: promedio ${fmt(avg(fpsLog.current), 'fps')} · mínimo ${fmt(fpsLog.current.length ? Math.min(...fpsLog.current) : null, 'fps')}`,
      `Frames lentos (>50 ms): ${jank.current} · tareas largas: ${longTasks.current}`,
      `Latencia app: prom ${fmt(avg(appPings.current))} · máx ${fmt(max(appPings.current))}`,
      `Latencia base de datos: prom ${fmt(avg(dbPings.current))} · máx ${fmt(max(dbPings.current))}`,
      ...(wasmLoads().length ? ['Carga de motores:', ...wasmLoads().map((l) => `  ${l}`)] : []),
    ].join('\n')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copiá el reporte:', report())
    }
  }

  const fpsColor = stats.fps >= 50 ? 'hsl(var(--python))' : stats.fps >= 30 ? '#FFB800' : 'hsl(var(--danger))'
  const pingColor = (ms: number | null) =>
    ms === null ? 'hsl(var(--tx3))' : ms < 300 ? 'hsl(var(--python))' : ms < 800 ? '#FFB800' : 'hsl(var(--danger))'

  return (
    <div
      className="font-mono"
      style={{
        position: 'fixed', left: 12, bottom: 12, zIndex: 60, fontSize: 11,
        background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border2))',
        padding: '6px 10px', maxWidth: 300, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left' }}
        aria-expanded={open}
      >
        <span style={{ color: 'hsl(var(--accent))' }}>TEST</span>{' '}
        <span style={{ color: fpsColor }}>{stats.fps} fps</span>{' · '}
        <span style={{ color: pingColor(stats.dbPing) }}>db {fmt(stats.dbPing)}</span>{' '}
        {open ? '▾' : '▸'}
      </button>

      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3, color: 'hsl(var(--tx2))' }}>
          <div>FPS: <span style={{ color: fpsColor }}>{stats.fps}</span> · mín {fpsLog.current.length ? stats.minFps : '—'}</div>
          <div>Frames lentos: {stats.jankFrames} · tareas largas: {stats.longTasks}</div>
          <div>App: <span style={{ color: pingColor(stats.appPing) }}>{fmt(stats.appPing)}</span> · prom {fmt(avg(appPings.current))}</div>
          <div>Base: <span style={{ color: pingColor(stats.dbPing) }}>{fmt(stats.dbPing)}</span> · prom {fmt(avg(dbPings.current))} · máx {fmt(max(dbPings.current))}</div>
          <button
            onClick={copy}
            className="pixel-corners-sm"
            style={{
              marginTop: 4, padding: '4px 8px', cursor: 'pointer', font: 'inherit',
              border: '1px solid hsl(var(--accent) / 0.6)', color: 'hsl(var(--accent))', background: 'transparent',
            }}
          >
            {copied ? '✓ Copiado' : 'Copiar reporte de esta PC'}
          </button>
        </div>
      )}
    </div>
  )
}
