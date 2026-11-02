import Link from 'next/link'
import { SITE } from '@/lib/site-config'

// acerca_de.txt: lo que antes era el footer de la landing (qué es la
// plataforma, tus datos, aviso legal), como "Propiedades del sistema".

const jersey = 'var(--font-jersey), monospace'
const vt = 'var(--font-vt323), monospace'
const head = { fontFamily: jersey, fontSize: 18, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'hsl(var(--tx))', margin: '0 0 4px' }
const body = { fontFamily: vt, fontSize: 19, lineHeight: 1.2, color: 'hsl(var(--tx2))', margin: 0 }
const link = { color: 'hsl(var(--tx))', textDecoration: 'underline', textUnderlineOffset: 3 }

export default function AcercaDeWindow() {
  const year = new Date().getFullYear()
  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <section>
        <h2 style={head}>PyCraft BossRush</h2>
        <p style={body}>
          Plataforma web educativa de acceso restringido, destinada a talleres de introducción a la programación en Python y SQL para niñas y niños de 10 a 13 años.
        </p>
      </section>
      <section style={{ borderTop: '2px solid hsl(var(--border2))', paddingTop: 12 }}>
        <h2 style={head}>Tus datos</h2>
        <p style={body}>
          Esta plataforma no recopila datos personales sensibles ni información identificatoria de menores. Solo se utiliza un alias y, para la entrega del proyecto final, el correo electrónico del tutor responsable.
        </p>
        <p style={{ ...body, marginTop: 8 }} className="flex flex-wrap gap-x-4">
          <Link href="/privacidad" style={link}>Política de privacidad</Link>
          <Link href="/cookies" style={link}>Política de cookies</Link>
          {SITE.contactEmail && <a href={`mailto:${SITE.contactEmail}`} style={link}>Contacto</a>}
        </p>
      </section>
      <section style={{ borderTop: '2px solid hsl(var(--border2))', paddingTop: 12 }}>
        <p style={body}>
          © {year} {SITE.name}. Todos los derechos reservados · Desarrollado por{' '}
          <a href={SITE.githubUrl} target="_blank" rel="noopener noreferrer" style={link}>{SITE.author}</a>
        </p>
        <p style={{ ...body, marginTop: 8, color: 'hsl(var(--tx3))' }}>
          Proyecto educativo sin fines comerciales, independiente y sin vinculación con Mojang AB ni Microsoft. Minecraft es una marca registrada de sus respectivos titulares.
        </p>
      </section>
    </div>
  )
}
