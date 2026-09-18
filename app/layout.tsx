import type { Metadata } from 'next'
import { Jersey_25 } from 'next/font/google'
import PixelFXProvider from '@/components/ui/PixelFXProvider'
import './globals.css'

const jersey25 = Jersey_25({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-jersey',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PyCraft BOSSRUSH',
  description: 'Aprendé Python y SQLite derrotando 14 jefes con código real',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning className={jersey25.variable}>
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
      <body><PixelFXProvider>{children}</PixelFXProvider></body>
    </html>
  )
}
