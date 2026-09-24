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
        const active = t === current
        return (
          <button
            key={t}
            onClick={() => choose(t)}
            title={TIER_META[t].desc}
            className="transition-all"
            style={{
              fontFamily: 'var(--font-jersey), monospace', fontSize: 15, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '2px 10px',
              border: `2px solid ${active ? 'hsl(var(--tx))' : 'hsl(var(--border2))'}`,
              color: active ? 'hsl(var(--bg))' : 'hsl(var(--tx3))',
              background: active ? 'hsl(var(--tx))' : 'transparent',
            }}
          >
            {TIER_META[t].label}
          </button>
        )
      })}
    </div>
  )
}
