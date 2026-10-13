// Sonidos del viejo Oeste para el Pistolero, sintetizados con Web Audio (sin
// archivos, como el resto del juego). Respetan el silencio general del juego
// (isMuted de lib/game/architect/sound.ts).

import { isMuted } from '@/lib/game/architect/sound'

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

function noiseSrc(c: AudioContext): AudioBufferSourceNode {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  return src
}

/** Ruido filtrado con envolvente: la base de casi todo (polvo, pólvora, ramitas). */
function burst(dur: number, vol: number, filter: BiquadFilterType, freq: number, opts: { at?: number; q?: number; toFreq?: number } = {}) {
  const c = audio()
  if (!c) return
  const t0 = c.currentTime + (opts.at ?? 0)
  const src = noiseSrc(c)
  const f = c.createBiquadFilter()
  f.type = filter
  f.frequency.setValueAtTime(freq, t0)
  if (opts.toFreq) f.frequency.exponentialRampToValueAtTime(opts.toFreq, t0 + dur)
  f.Q.value = opts.q ?? 1
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f).connect(g).connect(c.destination)
  src.start(t0, Math.random() * 0.5)
  src.stop(t0 + dur + 0.02)
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, opts: { at?: number; to?: number } = {}) {
  const c = audio()
  if (!c) return
  const t0 = c.currentTime + (opts.at ?? 0)
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur)
  g.gain.setValueAtTime(vol, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

const j = (base: number, spread: number) => base + (Math.random() - 0.5) * spread

export const westernSfx = {
  /** La planta rodadora escribe: ramitas secas que crujen sobre la arena. */
  rustle() {
    burst(j(0.045, 0.02), 0.05, 'bandpass', j(3200, 1600), { q: 2.5 })
  },
  /** Un tiro: estampido grave, chasquido de pólvora y la cola del eco del cañón. */
  shot() {
    burst(0.06, 0.5, 'highpass', 1800)
    burst(0.35, 0.35, 'lowpass', 1400, { toFreq: 180 })
    tone(140, 0.22, 'sine', 0.45, { to: 38 })
    burst(0.6, 0.05, 'bandpass', 900, { at: 0.12, q: 0.7 })
  },
  /** Bala que rebota en una piedra: el «piuuu» de las películas. */
  ricochet() {
    tone(j(2600, 400), 0.38, 'sine', 0.06, { at: 0.05, to: 700 })
  },
  /** Grito: golpe seco sobre la mesa del saloon. */
  slam() {
    tone(95, 0.18, 'square', 0.18, { to: 45 })
    burst(0.12, 0.25, 'lowpass', 700)
  },
  /** Espuelas: dos campanitas de metal. */
  spurs() {
    tone(j(3400, 200), 0.16, 'triangle', 0.05)
    tone(j(4300, 200), 0.2, 'triangle', 0.04, { at: 0.07 })
  },
  /** Martillo del revólver amartillándose (clic-clac). */
  cock() {
    burst(0.02, 0.3, 'highpass', 3000)
    burst(0.025, 0.35, 'bandpass', 1800, { at: 0.09, q: 3 })
  },
}
