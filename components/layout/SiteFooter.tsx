import Link from 'next/link'
import { SITE } from '@/lib/site-config'
import { PixelBitmap, CHEST_CLOSED } from '@/components/game/architect/desktop/PixelBitmap'

const pixel = 'var(--font-pixel), monospace'
const linkStyle = { fontFamily: 'var(--font-vt323), monospace', fontSize: 18, color: 'hsl(var(--tx2))', display: 'inline-block', padding: '3px 0' } as const

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-[150px]">
      <h2 style={{ fontFamily: pixel, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--tx))', margin: '0 0 6px', fontWeight: 700 }}>{title}</h2>
      {children}
    </div>
  )
}

export default function SiteFooter({ compact = false }: { compact?: boolean }) {
  const year = new Date().getFullYear()
  return (
    <footer style={{ background: 'hsl(var(--surface))', borderTop: '2px solid hsl(var(--tx))' }}>
      {!compact && (
        <div className="max-w-6xl mx-auto px-5 py-8 grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="flex flex-col gap-3" style={{ maxWidth: 320 }}>
            <div className="flex items-center gap-3">
              <PixelBitmap rows={CHEST_CLOSED} scale={2} />
              <span style={{ fontFamily: 'var(--font-jersey), monospace', fontSize: 22, letterSpacing: '0.06em', color: 'hsl(var(--tx))', lineHeight: 1 }}>
                <span style={{ color: 'hsl(var(--python))' }}>PY</span>CRAFT BOSSRUSH
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 19, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: 0 }}>
              Plataforma web educativa de acceso restringido, destinada a talleres de introducción a la programación en Python y SQL para niñas y niños de 10 a 13 años.
            </p>
          </div>

          <Col title="Proyecto">
            {SITE.inscripcionesUrl && <a href={SITE.inscripcionesUrl} target="_blank" rel="noopener noreferrer" style={linkStyle} className="hover:text-tx">Inscripciones</a>}
            <a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer" style={linkStyle} className="hover:text-tx">Código en GitHub</a>
            <Link href="/demo" style={linkStyle} className="hover:text-tx">Probar la demo</Link>
            <Link href="/login" style={linkStyle} className="hover:text-tx">Entrar al taller</Link>
          </Col>

          <Col title="Legal">
            <Link href="/privacidad" style={linkStyle} className="hover:text-tx">Política de privacidad</Link>
            <Link href="/cookies" style={linkStyle} className="hover:text-tx">Política de cookies</Link>
            {SITE.contactEmail && <a href={`mailto:${SITE.contactEmail}`} style={linkStyle} className="hover:text-tx">Contacto</a>}
          </Col>

          <Col title="Tus datos">
            <p style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 18, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: 0 }}>
              Esta plataforma no recopila datos personales sensibles ni información identificatoria de menores. Solo se utiliza un alias y, para la entrega del proyecto final, el correo electrónico del tutor responsable.
            </p>
          </Col>
        </div>
      )}

      <div style={{ borderTop: compact ? undefined : '2px solid hsl(var(--border2))' }}>
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between flex-wrap gap-x-6 gap-y-1"
          style={{ fontFamily: 'var(--font-vt323), monospace', fontSize: 17, color: 'hsl(var(--tx3))' }}>
          <span>© {year} {SITE.name}. Todos los derechos reservados · Desarrollado por <a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(var(--tx2))', textDecoration: 'underline' }}>{SITE.author}</a></span>
          {compact && (
            <span className="flex gap-4">
              <Link href="/privacidad" style={{ textDecoration: 'underline' }}>Privacidad</Link>
              <Link href="/cookies" style={{ textDecoration: 'underline' }}>Cookies</Link>
            </span>
          )}
          <span>Proyecto educativo sin fines comerciales, independiente y sin vinculación con Mojang AB ni Microsoft. Minecraft es una marca registrada de sus respectivos titulares.</span>
        </div>
      </div>
    </footer>
  )
}
