// Exporta el manual de marca (/demo/manual) a PDF con Edge o Chrome sin ventana.
//
// Uso (con el servidor local corriendo: launch "PySQLBossRush-local", puerto 3010):
//   node scripts/export-manual.mjs                 → docs/manual-de-marca.pdf
//   node scripts/export-manual.mjs --theme light   → docs/manual-de-marca-light.pdf
//   node scripts/export-manual.mjs --url http://localhost:3010/demo/manual
//
// En modo local la ruta no pide sesión; contra el servidor normal hace falta
// la cookie de admin, que el navegador sin ventana no tiene.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const theme = opt('theme', 'dark')
const base = opt('url', 'http://localhost:3010/demo/manual')
const out = resolve(opt('out', `docs/manual-de-marca${theme === 'dark' ? '' : `-${theme}`}.pdf`))
const url = `${base}${base.includes('?') ? '&' : '?'}theme=${encodeURIComponent(theme)}`

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]
const browser = BROWSERS.find((p) => existsSync(p))
if (!browser) {
  console.error('No encontré Edge ni Chrome instalados.')
  process.exit(1)
}

mkdirSync(resolve(out, '..'), { recursive: true })
execFileSync(browser, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-pdf-header-footer',
  '--run-all-compositor-stages-before-draw',
  // Tiempo para que carguen fuentes y sprites y terminen las animaciones de entrada.
  '--virtual-time-budget=20000',
  `--print-to-pdf=${out}`,
  url,
], { stdio: 'inherit' })

console.log(`PDF listo: ${out} (${Math.round(statSync(out).size / 1024)} KB)`)
