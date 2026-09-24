'use client'

import { useState } from 'react'
import { sfx, isMuted, setMuted } from '@/lib/game/architect/sound'
import Win from '@/components/ui/Win'

// Catálogo de sonidos retro: escuchá cada uno y decidí dónde va.
type Item = { name: string; when: string; play: () => void }
const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'CURSOR Y VENTANAS', items: [
    { name: 'click', when: 'Cualquier botón, link o pestaña (automático)', play: () => sfx.click() },
    { name: 'hover', when: 'Pasar el mouse por los iconos del escritorio', play: () => sfx.hover() },
    { name: 'open', when: 'Abrir una ventana o carpeta', play: () => sfx.open() },
    { name: 'close', when: 'Cerrar ventana (botón X, automático)', play: () => sfx.close() },
    { name: 'pick', when: 'Agarrar una ventana para arrastrar', play: () => sfx.pick() },
    { name: 'drop', when: 'Soltar la ventana', play: () => sfx.drop() },
    { name: 'tab', when: 'Cambiar de pestaña', play: () => sfx.tab() },
    { name: 'toggle on', when: 'Interruptor encendido', play: () => sfx.toggle(true) },
    { name: 'toggle off', when: 'Interruptor apagado', play: () => sfx.toggle(false) },
    { name: 'theme', when: 'Cambiar de tema (BOSSRUSH / RD)', play: () => sfx.theme() },
  ] },
  { title: 'ERRORES Y AVISOS', items: [
    { name: 'error', when: 'Ventana de error, login incorrecto (automático con role="alert")', play: () => sfx.error() },
    { name: 'warn', when: 'Advertencia', play: () => sfx.warn() },
    { name: 'denied', when: 'Botón desactivado', play: () => sfx.denied() },
    { name: 'trash', when: 'Tirar una ventana a la papelera', play: () => sfx.trash() },
    { name: 'glitch', when: 'El Arquitecto interfiere', play: () => sfx.glitch() },
    { name: 'crash', when: 'Pantalla se rompe', play: () => sfx.crash() },
  ] },
  { title: 'JUEGO', items: [
    { name: 'confirm', when: 'Confirmar una opción', play: () => sfx.confirm() },
    { name: 'attack', when: 'Atacar', play: () => sfx.attack() },
    { name: 'hit', when: 'El jefe recibe el golpe', play: () => sfx.hit() },
    { name: 'miss', when: 'Respuesta incorrecta', play: () => sfx.miss() },
    { name: 'damage', when: 'El jugador recibe daño', play: () => sfx.damage() },
    { name: 'victory', when: 'Jefe derrotado', play: () => sfx.victory() },
    { name: 'jingle', when: 'Respuesta guardada / final feliz', play: () => sfx.jingle() },
    { name: 'potion', when: 'Poción de vida', play: () => sfx.potion() },
    { name: 'mercader', when: 'Aparece el Mercader', play: () => sfx.mercader() },
    { name: 'notify', when: 'Rodolfo avisa algo', play: () => sfx.notify() },
    { name: 'meow', when: 'El gato del escritorio', play: () => sfx.meow() },
    { name: 'type', when: 'Tecleo (al escribir)', play: () => sfx.type() },
  ] },
]

export default function SonidosPage() {
  const [muted, setM] = useState(() => isMuted())
  return (
    <div className="min-h-screen desk-theme" style={{ background: 'hsl(var(--bg))', padding: 24 }}>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <Win active title="SONIDOS.EXE" right={
          <button type="button" data-sfx="none" onClick={() => { setMuted(!muted); setM(!muted) }}
            style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 14, color: 'hsl(var(--bg))', background: 'transparent', border: '1px solid hsl(var(--bg))', padding: '0 8px' }}>
            {muted ? 'SONIDO: APAGADO' : 'SONIDO: ENCENDIDO'}
          </button>
        } bodyStyle={{ padding: 16 }}>
          <h1 style={{ fontSize: 28, lineHeight: 1, color: 'hsl(var(--tx))' }}>Sonidos retro</h1>
          <p className="font-mono" style={{ fontSize: 12, color: 'hsl(var(--tx2))', marginTop: 8 }}>
            Todo se genera en el navegador con ondas cuadradas y ruido, sin archivos. Tocá cada botón para escucharlo.
          </p>
        </Win>
        {GROUPS.map(g => (
          <Win key={g.title} title={g.title} bodyStyle={{ padding: 12 }}>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.items.map(it => (
                <button key={it.name} type="button" data-sfx="none" onClick={it.play} className="text-left"
                  style={{ border: '2px solid hsl(var(--border2))', background: 'hsl(var(--surface))', padding: '8px 10px', minHeight: 48 }}>
                  <div style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 18, color: 'hsl(var(--accent))', lineHeight: 1 }}>{it.name}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--tx2))', marginTop: 4 }}>{it.when}</div>
                </button>
              ))}
            </div>
          </Win>
        ))}
      </div>
    </div>
  )
}
