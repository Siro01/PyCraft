import UISounds from '@/components/ui/UISounds'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import PixelFXProvider from '@/components/ui/PixelFXProvider'
import PistoleroWatcher from '@/components/game/raid/PistoleroWatcher'
import CloudSyncBoot from '@/components/layout/CloudSyncBoot'
import HalloweenLayer from '@/components/ui/HalloweenLayer'
import { SEASON_BOOT_SCRIPT } from '@/lib/game/season-boot'
import './globals.css'

// Jersey 25 (OFL) servida desde el proyecto: no depende de Google Fonts en desarrollo
const jersey25 = localFont({
  src: './fonts/Jersey25-latin.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-jersey',
  display: 'swap',
})

// JetBrains Mono (OFL, app/fonts/JetBrainsMono-OFL.txt) — la letra de lectura de todo el
// sitio, como en omarchy.org. --font-mono va a tamaño normal; --font-text es la misma
// letra achicada para que entre en los tamaños pensados para VT323 sin rehacerlos.
const jetbrains = localFont({
  src: './fonts/JetBrainsMono-latin.woff2',
  weight: '100 800',
  style: 'normal',
  variable: '--font-mono',
  display: 'swap',
})
const jetbrainsText = localFont({
  src: './fonts/JetBrainsMono-latin.woff2',
  weight: '100 800',
  style: 'normal',
  variable: '--font-text',
  display: 'swap',
  declarations: [{ prop: 'size-adjust', value: '72%' }],
})

export const metadata: Metadata = {
  title: 'PyCraft BOSSRUSH',
  description: 'Aprendé Python y SQLite derrotando 14 jefes con código real',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning className={`${jersey25.variable} ${jetbrains.variable} ${jetbrainsText.variable}`}>
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
        {/* Temporada (Halloween): paleta fija antes de pintar */}
        <script dangerouslySetInnerHTML={{ __html: SEASON_BOOT_SCRIPT }} />
      </head>
      <body><PixelFXProvider>{children}</PixelFXProvider><UISounds /><PistoleroWatcher /><CloudSyncBoot /><HalloweenLayer /></body>
    </html>
  )
}
