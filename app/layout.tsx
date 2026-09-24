import UISounds from '@/components/ui/UISounds'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { VT323, Silkscreen } from 'next/font/google'
import PixelFXProvider from '@/components/ui/PixelFXProvider'
import './globals.css'

// Jersey 25 (OFL) servida desde el proyecto: no depende de Google Fonts en desarrollo
const jersey25 = localFont({
  src: './fonts/Jersey25-latin.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-jersey',
  display: 'swap',
})

// VT323 — fuente pixel-art terminal para diálogos de jefes
const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
  display: 'swap',
})

// Silkscreen — pixel-art puro para botones y etiquetas de la landing (CTA, menú)
const silkscreen = Silkscreen({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PyCraft BOSSRUSH',
  description: 'Aprendé Python y SQLite derrotando 14 jefes con código real',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning className={`${jersey25.variable} ${vt323.variable} ${silkscreen.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('theme') || 'dark';
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body><PixelFXProvider>{children}</PixelFXProvider><UISounds /></body>
    </html>
  )
}
