// Efectos de sonido sintetizados con Web Audio — sin archivos de audio.
// El AudioContext se crea de forma perezosa en el primer sonido (siempre después
// de un gesto del usuario, que es lo que exigen los navegadores).

const MUTE_KEY = 'pysql:sfx-muted'

export function isMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
}

export function setMuted(muted: boolean): void {
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch { /* modo privado */ }
}

let ctx: AudioContext | null = null
let noiseBuf: AudioBuffer | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || isMuted()) return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try { ctx = new Ctor() } catch { return null }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, opts: { to?: number; at?: number } = {}) {
  const c = audio()
  if (!c) return
  const t0 = c.currentTime + (opts.at ?? 0)
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur)
  gain.gain.setValueAtTime(vol, t0)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noise(dur: number, vol: number, opts: { at?: number; highpass?: number } = {}) {
  const c = audio()
  if (!c) return
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t0 = c.currentTime + (opts.at ?? 0)
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const gain = c.createGain()
  gain.gain.setValueAtTime(vol, t0)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  let node: AudioNode = src
  if (opts.highpass) {
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = opts.highpass
    src.connect(hp)
    node = hp
  }
  node.connect(gain).connect(c.destination)
  src.start(t0)
  src.stop(t0 + dur + 0.02)
}

const jitter = (base: number, spread: number) => base + (Math.random() - 0.5) * spread

export const sfx = {
  /** Tecleo por letra. 'machine' = terminal grave · 'cat' = tic agudo y suave. */
  type(voice: 'machine' | 'cat' = 'machine') {
    if (voice === 'cat') tone(jitter(760, 260), 0.05, 'triangle', 0.07)
    else tone(jitter(210, 90), 0.04, 'square', 0.045)
  },
  /** Mover el cursor de un menú. */
  select() { tone(660, 0.05, 'square', 0.05) },
  /** Confirmar una opción. */
  confirm() {
    tone(523, 0.07, 'square', 0.06)
    tone(784, 0.11, 'square', 0.06, { at: 0.07 })
  },
  /** Golpe recibido por el jefe. */
  hit() {
    noise(0.12, 0.14, { highpass: 900 })
    tone(150, 0.16, 'sawtooth', 0.08, { to: 55 })
  },
  /** Ráfaga corta de interferencia. */
  glitch() {
    for (let i = 0; i < 3; i++) noise(0.04 + Math.random() * 0.05, 0.1, { at: i * 0.06, highpass: 1500 })
    tone(jitter(900, 500), 0.06, 'square', 0.03, { at: 0.03 })
  },
  /** El Arquitecto I se apaga. */
  powerdown() { tone(440, 0.7, 'sawtooth', 0.07, { to: 40 }) },
  /** Crash de pantalla completa (landing). */
  crash() {
    noise(0.55, 0.22)
    tone(320, 0.5, 'sawtooth', 0.09, { to: 30 })
    for (let i = 0; i < 4; i++) tone(jitter(1200, 900), 0.05, 'square', 0.04, { at: 0.12 * i })
  },
  /** Miau sintético (subida y bajada de tono). */
  meow() {
    tone(520, 0.22, 'triangle', 0.09, { to: 980 })
    tone(980, 0.3, 'triangle', 0.08, { to: 560, at: 0.2 })
  },
  /** Aparece una respuesta guardada / final feliz. */
  jingle() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.05, { at: i * 0.09 }))
  },
  /** El jugador presiona Atacar — golpe de espada. */
  attack() {
    tone(880, 0.06, 'square', 0.07, { to: 440 })
    noise(0.05, 0.07, { highpass: 2000, at: 0.01 })
  },
  /** Respuesta incorrecta — buzz descendente. */
  miss() {
    tone(280, 0.28, 'sawtooth', 0.06, { to: 110 })
    noise(0.08, 0.04, { highpass: 500, at: 0.0 })
  },
  /** El jugador recibe daño (TRAINEE). */
  damage() {
    noise(0.18, 0.13, { highpass: 700 })
    tone(200, 0.22, 'sawtooth', 0.07, { to: 70 })
  },
  /** Jefe derrotado — fanfare ascendente. */
  victory() {
    ;[523, 659, 784, 880, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.06, { at: i * 0.08 }))
    tone(1047, 0.45, 'triangle', 0.05, { at: 0.45 })
  },
  /** El Mercader aparece — tintineo de monedas. */
  mercader() {
    ;[1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.10, 'triangle', 0.06, { at: i * 0.055 }))
    noise(0.06, 0.03, { highpass: 3500, at: 0.01 })
  },
  /** Poción de vida usada — tono suave ascendente. */
  potion() {
    ;[523, 659, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.06, { at: i * 0.1 }))
    tone(1047, 0.25, 'triangle', 0.04, { at: 0.3 })
  },
}
