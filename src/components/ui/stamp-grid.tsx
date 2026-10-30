import { Check, Gift } from 'lucide-react'
import { cn } from '../../lib/cn'

export type StampGridProps = {
  /** Number of filled stamps. */
  stamps: number
  goal?: number
  /** Show a gift icon in the last empty slot (the reward). */
  showGift?: boolean
  size?: 'sm' | 'md'
  /** Accessible summary; defaults to \"3 of 8 stamps collected\". */
  label?: string
  className?: string
}

const sizeClass = {
  sm: 'size-[1.55rem]',
  md: 'size-[2rem]',
} as const

const iconClass = {
  sm: 'size-[0.8rem]',
  md: 'size-[0.95rem]',
} as const

/** Full-size loyalty stamp row for the premium card. */
export function StampGrid({
  stamps,
  goal = 8,
  showGift = true,
  size = 'md',
  label,
  className,
}: StampGridProps) {
  const total = Math.max(1, Math.floor(goal))
  const filled = Math.min(Math.max(0, Math.floor(stamps)), total)

  return (
    <div
      className={cn('grid gap-[0.45rem]', className)}
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      role="img"
      aria-label={label ?? `${filled} of ${total} stamps collected`}
    >
      {Array.from({ length: total }, (_, index) => {
        const active = index < filled
        const isReward = showGift && index === total - 1

        return (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              'grid aspect-square place-items-center rounded-round border transition-colors',
              sizeClass[size],
              active
                ? 'border-premium-gold bg-premium-gold text-premium'
                : 'border-premium-gold/35 text-premium-muted',
            )}
          >
            {active ? (
              <Check className={iconClass[size]} strokeWidth={3} />
            ) : isReward ? (
              <Gift className={iconClass[size]} />
            ) : null}
          </span>
        )
      })}
    </div>
  )
}
