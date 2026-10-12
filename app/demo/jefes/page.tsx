'use client'

import Header from '@/components/layout/Header'
import BossSprite from '@/components/game/BossSprite'
import { BOSSES } from '@/lib/game/bosses'

// Vitrina de los jefes dibujados a mano en GIF (scripts/sprites/import_gifs.py),
// junto a dos de los rediseñados en tiras para comparar escala y estilo.
const IDS = ['guardian-puerta', 'golem-infinito', 'constructor-vacio', 'contador-almas', 'la-hydra', 'dragon-rojo']

export default function JefesPage() {
  const bosses = IDS.map((id) => BOSSES.find((b) => b.id === id)!).filter(Boolean)
  return (
    <div className="min-h-screen desk-theme">
      <Header />
      <main className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        <h1 style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 32 }}>Jefes nuevos: batalla · chico · derrotado</h1>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}>
          {bosses.map((boss) => (
            <section key={boss.id} className="flex flex-col gap-3 p-4" style={{ border: '2px solid hsl(var(--border2))', background: 'hsl(var(--surface))' }}>
              <div className="label-mono">{boss.title} · {boss.name}</div>
              <div className="flex items-end gap-4" style={{ minHeight: 150 }}>
                <BossSprite boss={boss} size="lg" animated />
                <BossSprite boss={boss} size="sm" animated />
                <BossSprite boss={boss} size="sm" defeated />
              </div>
            </section>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="label-mono">Ícono de la landing:</span>
          <img src="/bossicons/dragon-rojo.gif" alt="Dragón Rojo" width={48} height={48} style={{ imageRendering: 'pixelated' }} />
        </div>
      </main>
    </div>
  )
}
