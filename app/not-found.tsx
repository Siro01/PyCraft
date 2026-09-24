import Link from 'next/link'
import type { Metadata } from 'next'
import Win from '@/components/ui/Win'
import SiteFooter from '@/components/layout/SiteFooter'
import { PixelBitmap, ICON_WARN, ICON_FOLDER, CHEST_OPEN } from '@/components/game/architect/desktop/PixelBitmap'

export const metadata: Metadata = { title: '404 · Cofre no encontrado' }

export default function NotFound() {
  return (
    <div className="desk-theme min-h-screen flex flex-col" style={{ background: 'hsl(var(--bg))' }}>
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full" style={{ maxWidth: 520 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span className="chest-bob" style={{ display: 'inline-block' }}><PixelBitmap rows={CHEST_OPEN} scale={5} /></span>
          </div>

          <Win active tone="danger" title="ERROR_404.EXE" bodyStyle={{ padding: '20px 20px 22px' }} style={{ boxShadow: '6px 6px 0 hsl(var(--danger) / 0.35)' }}>
            <div className="flex items-start gap-4">
              <span style={{ flexShrink: 0, marginTop: 4 }}><PixelBitmap rows={ICON_WARN} scale={4} ink="hsl(var(--danger))" /></span>
              <div>
                <h1 style={{ fontSize: 'clamp(2rem, 4.4vw, 2.9rem)', lineHeight: 1, margin: 0, color: 'hsl(var(--danger))', textShadow: '3px 3px 0 hsl(var(--tx) / 0.16)' }}>404</h1>
                <p style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 24, letterSpacing: '0.04em', color: 'hsl(var(--tx))', margin: '8px 0 0', lineHeight: 1.1 }}>
                  Este cofre no existe
                </p>
                <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 21, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: '10px 0 0' }}>
                  La página que buscás no está acá. Puede que el link esté mal escrito, o que el Arquitecto se la haya llevado. Tu progreso está a salvo.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3" style={{ marginTop: 22 }}>
              <Link href="/" className="cta-btn cta-btn--primary" style={{ fontSize: 12, padding: '10px 16px' }}>Volver al inicio</Link>
              <Link href="/dashboard" className="cta-btn" style={{ fontSize: 12, padding: '10px 16px' }}>
                <PixelBitmap rows={ICON_FOLDER} scale={2} ink="currentColor" /> Mapa de jefes
              </Link>
            </div>
          </Win>

          <p style={{ fontFamily: 'var(--font-pixel), monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'hsl(var(--tx3))', textAlign: 'center', marginTop: 20 }}>
            Código de error: 404_NOT_FOUND
          </p>
        </div>
      </main>
      <SiteFooter compact />
    </div>
  )
}
