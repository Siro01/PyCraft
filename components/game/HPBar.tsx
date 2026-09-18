'use client'

interface HPBarProps {
  current: number
  max: number
  label?: string
  color?: string
  showNumbers?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

export default function HPBar({ current, max, label, color, showNumbers = true, size = 'md' }: HPBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))

  const barColor = color ?? (pct > 50 ? 'hsl(var(--python))' : pct > 25 ? 'hsl(38 92% 55%)' : 'hsl(var(--danger))')

  return (
    <div className="w-full">
      {(label || showNumbers) && (
        <div className="flex justify-between items-baseline mb-1.5">
          {label && <span className="label-mono">{label}</span>}
          {showNumbers && (
            <span className="font-mono text-xs text-tx3 tabular">
              {current} / {max}
            </span>
          )}
        </div>
      )}
      <div className={`hp-track ${SIZE_MAP[size]}`}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: barColor,
            boxShadow: `0 0 8px ${barColor}55`,
          }}
        />
      </div>
    </div>
  )
}
