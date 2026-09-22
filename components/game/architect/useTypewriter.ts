'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from '@/lib/game/architect/sound'

const PAUSE_CHARS = /[.,?!…:]/

/** Escribe `text` letra por letra con un sonido de tecleo por carácter. */
export function useTypewriter(text: string, voice: 'machine' | 'cat' = 'machine', speed = 34) {
  const [count, setCount] = useState(0)
  const skipped = useRef(false)

  useEffect(() => {
    skipped.current = false
    setCount(0)
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (skipped.current) return
      i++
      setCount(i)
      const ch = text[i - 1]
      if (ch && ch !== ' ') sfx.type(voice)
      if (i < text.length) timer = setTimeout(tick, PAUSE_CHARS.test(ch) ? speed * 6 : speed)
    }
    timer = setTimeout(tick, speed * 3)
    return () => clearTimeout(timer)
  }, [text, voice, speed])

  const skip = useCallback(() => {
    skipped.current = true
    setCount(text.length)
  }, [text])

  return { shown: text.slice(0, count), done: count >= text.length, skip }
}
