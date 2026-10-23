'use client'

import type { ImgHTMLAttributes } from 'react'
import { useRodolfoSrc } from '@/lib/game/season'

/** El GIF de Rodolfo: el de siempre o, en temporada, disfrazado (lib/game/season.ts). */
export default function RodolfoImg(props: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const src = useRodolfoSrc()
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...props} src={src} />
}
