import Link from 'next/link'
import BossSprite from '@/components/game/BossSprite'
import { IconCheck } from '@/components/ui/PixelIcons'
import { PixelDust } from '@/components/ui/PixelFX'
import { getBossById } from '@/lib/game/bosses'

export const metadata = { title: 'Victoria · PySQLBossRush' }

export default function VictoryPage() {
  const architect = getBossById('el-arquitecto')!

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(var(--bg))',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Grilla de píxeles — mismo patrón que el hero de la landing */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.6) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      {/* Polvo de píxeles disperso */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <PixelDust />
      </div>

      {/* Glow — color del jefe final, El Arquitecto */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 60% 55% at 50% 45%, ${architect.color}1A, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '24px',
        padding: '0 24px', textAlign: 'center',
        maxWidth: '480px',
      }}>

        {/* Defeated sprite */}
        <BossSprite boss={architect} size="lg" defeated={true} />

        {/* Title */}
        <div>
          <div className="label-mono" style={{ marginBottom: '8px' }}>
            Sistema completado
          </div>
          <h1
            className="font-jersey"
            style={{
              fontSize: '40px',
              color: architect.color,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            EL ARQUITECTO<br />DERROTADO
          </h1>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: '1px', background: `${architect.color}26` }} />

        {/* Message */}
        <p className="font-mono" style={{ fontSize: '14px', color: 'hsl(var(--tx3))', lineHeight: 1.7, margin: 0 }}>
          Dominaste Python, SQL y la integración entre ambos.<br />
          El sistema es tuyo — ahora creá una cuenta y guardá tu progreso.
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Python', 'SQLite', 'sqlite3', 'BOSS-14'].map((tag) => (
            <span
              key={tag}
              className="font-mono inline-flex items-center gap-1.5 pixel-corners-sm"
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                background: `${architect.color}1A`,
                border: `1px solid ${architect.color}40`,
                color: architect.color,
              }}
            >
              <IconCheck size={9} color={architect.color} />
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/login" className="btn-primary font-mono">
            Crear cuenta →
          </Link>
          <Link href="/demo" className="btn-ghost font-mono">
            ← Volver al demo
          </Link>
        </div>

        {/* Footer */}
        <div className="font-mono" style={{ marginTop: '8px', fontSize: '10px', color: 'hsl(var(--tx3))', letterSpacing: '0.1em' }}>
          PYCRAFT + SQL = BOSSRUSH · Taller de programación
        </div>
      </div>
    </div>
  )
}
