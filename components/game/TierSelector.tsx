'use client'

import { useRouter } from 'next/navigation'
import { TIER_COOKIE, TIER_META } from '@/lib/game/tiers'
import type { ChallengeTier } from '@/types'

interface TierSelectorProps {
  enabled: ChallengeTier[]
  current: ChallengeTier
}

export default function TierSelector({ enabled, current }: TierSelectorProps) {
  const router = useRouter()

  const choose = (tier: ChallengeTier) => {
    document.cookie = `${TIER_COOKIE}=${tier}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  return (
    <div className="flex gap-1 self-end">
      {enabled.map((t) => {
        const color = `hsl(var(${TIER_META[t].colorVar}))`
        const active = t === current
        return (
          <button
            key={t}
            onClick={() => choose(t)}
            title={TIER_META[t].desc}
            className="font-mono text-[10px] px-2 py-1 pixel-corners-sm border transition-all"
            style={{
              borderColor: active ? color : 'hsl(var(--border2))',
              color: active ? color : 'hsl(var(--tx3))',
              background: active ? 'hsl(var(--surface2))' : 'transparent',
            }}
          >
            {TIER_META[t].label}
          </button>
        )
      })}
    </div>
  )
}
