// Saca las capturas de pantalla que usa el manual de marca (/demo/manual) y las
// deja en public/manual/shots/. Maneja Edge o Chrome sin ventana por el
// protocolo de DevTools: entra en modo local como un alumno de prueba (sin
// cuenta real) y recorre cada pantalla.
//
// Uso (con el servidor local corriendo: launch "PySQLBossRush-local", puerto 3010):
//   node scripts/capture-manual-shots.mjs
//   node scripts/capture-manual-shots.mjs mapa tienda   → solo esas

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const BASE = process.env.MANUAL_BASE ?? 'http://localhost:3010'
const OUT = resolve('public/manual/shots')
const W = 1440
const H = 900

// Alumno de prueba del modo local: nombre inventado, progreso a mitad del taller.
const SEED = {
  'pysql:user': { name: 'Alumno TEST', role: 'student' },
  'pysql:enabled': ['creeper-formulario', 'guardian-puerta', 'golem-infinito', 'mercader-abismo', 'maestro-craftero', 'archivista', 'constructor-vacio'],
  'pysql:progress': {
    'creeper-formulario': { hp: 0, defeated: true },
    'guardian-puerta': { hp: 0, defeated: true },
    'golem-infinito': { hp: 0, defeated: true },
  },
}

// nombre → ruta, más un paso opcional dentro de la página (JS en el navegador),
// alto de pantalla `h` y recorte `clip` [x, y, ancho, alto] para quedarse con la ventana.
const SHOTS = {
  landing: { path: '/' },
  login: { path: '/login', fresh: true },
  demo: { path: '/demo' },
  // Pantalla alta para que entre el mapa entero; el manual recorta la ventana.
  mapa: { path: '/dashboard', h: 1500, clip: [174, 330, 1092, 682], step: `document.querySelector('.desk-icon[title="Abrir mapa.exe"]')?.click(); setTimeout(() => document.querySelectorAll('.map-rodolfo-in').forEach((e) => e.closest('.fixed')?.remove()), 1500)` },
  escritorio: { path: '/dashboard' },
  tienda: { path: '/mercader' },
  biblioteca: { path: '/biblioteca' },
  escuelita: { path: '/repaso' },
  arena: { path: '/demo/arena', step: `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'duelo de prueba')?.click()` },
  'patio-juegos': { path: '/patio-de-juegos', clip: [288, 76, 864, 658] },
  'patio-practicas': { path: '/patio-de-practicas', clip: [288, 76, 864, 576] },
  reino: { path: '/reino' },
  batalla: { path: '/battle/guardian-puerta' },
  cofre: { path: '/finale/proyecto' },
  inventario: { path: '/demo/inventario', clip: [16, 68, 832, 532] },
  stickers: { path: '/demo/stickers' },
  // Vista previa del panel docente con datos inventados (solo en desarrollo): se abre jefes.exe.
  'panel-docente': { path: '/dev/admin-os', step: `[...document.querySelectorAll('.desk-icon')].find((b) => b.querySelector('.desk-lbl')?.textContent === 'jefes.exe')?.click()` },
}

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
]
const browserPath = BROWSERS.find((p) => existsSync(p))
if (!browserPath) { console.error('No encontré Edge ni Chrome.'); process.exit(1) }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'manual-shots-'))
const port = 9300 + Math.floor(Math.random() * 400)
const proc = spawn(browserPath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' })

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await sleep(200)
  }
  throw new Error('El navegador no abrió el puerto de DevTools.')
}

const ws = new WebSocket(await target())
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let seq = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
})
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })) })
const evaluate = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true })

await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
await send('Page.enable')

async function go(path, wait = 3500) {
  await send('Page.navigate', { url: BASE + path })
  await sleep(wait)
}

async function seed(fresh) {
  const sets = fresh ? `localStorage.clear()` : Object.entries(SEED).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(JSON.stringify(v))})`).join(';')
  await evaluate(`${sets}; localStorage.setItem('theme', 'dark'); true`)
}

mkdirSync(OUT, { recursive: true })
const only = process.argv.slice(2)
await go('/login', 2500)

for (const [name, shot] of Object.entries(SHOTS)) {
  if (only.length && !only.includes(name)) continue
  await go('/login', 1200)
  await seed(shot.fresh)
  const h = shot.h ?? H
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: 1, mobile: false })
  await go(shot.path, 6000)
  if (shot.step) { await evaluate(shot.step); await sleep(2500) }
  const { result } = await send('Page.captureScreenshot', { format: 'png', clip: shot.clip ? { x: shot.clip[0], y: shot.clip[1], width: shot.clip[2], height: shot.clip[3], scale: 1 } : { x: 0, y: 0, width: W, height: h, scale: 1 } })
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(result.data, 'base64'))
  console.log(`✔ ${name}`)
}

ws.close()
proc.kill()
await sleep(500)
try { rmSync(profile, { recursive: true, force: true }) } catch {}
