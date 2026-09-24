import Link from 'next/link'
import Win from '@/components/ui/Win'
import SiteFooter from '@/components/layout/SiteFooter'
import { SITE } from '@/lib/site-config'
import { PixelBitmap, CHEST_CLOSED } from '@/components/game/architect/desktop/PixelBitmap'

export function LegalSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 24, letterSpacing: '0.04em', color: 'hsl(var(--tx))', lineHeight: 1.1, margin: '0 0 10px' }}>
        <span style={{ color: 'hsl(var(--accent))' }}>{String(n).padStart(2, '0')}</span> {title}
      </h2>
      <div className="legal-body flex flex-col gap-3">{children}</div>
    </section>
  )
}

export default function LegalPage({ file, title, intro, children }: { file: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="desk-theme min-h-screen flex flex-col" style={{ background: 'hsl(var(--bg))' }}>
      <header style={{ background: 'hsl(var(--surface))', borderBottom: '2px solid hsl(var(--tx))' }}>
        <div className="max-w-3xl mx-auto px-5 flex items-center justify-between" style={{ minHeight: 48 }}>
          <Link href="/" className="flex items-center gap-3" style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 20, letterSpacing: '0.06em', color: 'hsl(var(--tx))' }}>
            <PixelBitmap rows={CHEST_CLOSED} scale={2} />
            <span><span style={{ color: 'hsl(var(--python))' }}>PY</span>CRAFT BOSSRUSH</span>
          </Link>
          <Link href="/" style={{ fontFamily: 'var(--font-pixel), monospace', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(var(--tx2))', padding: '8px 0' }}>Volver</Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-5 py-10">
        <Win active title={file} bodyStyle={{ padding: '24px 22px 32px' }} style={{ boxShadow: '6px 6px 0 hsl(var(--tx) / 0.2)' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', lineHeight: 1, color: 'hsl(var(--tx))', margin: 0 }}>{title}</h1>
          <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 22, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: '12px 0 0' }}>{intro}</p>
          <p className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--tx3))', letterSpacing: '0.08em', margin: '10px 0 0' }}>Última actualización: {SITE.legalUpdated}</p>
          {children}
        </Win>
      </main>
      <SiteFooter compact />
    </div>
  )
}
