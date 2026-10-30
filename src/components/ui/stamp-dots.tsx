import { cn } from '../../lib/cn'

export type StampDotsProps = {
  /** Number of filled stamps. */
  stamps: number
  goal?: number
  /** Accessible summary; defaults to "3 of 8 stamps collected". */
  label?: string
  className?: string
}

/** Progress dots for a loyalty card, e.g. 3 of 8 stamps. */
export function StampDots({
  stamps,
  goal = 8,
  label,
  className,
}: StampDotsProps) {
  const total = Math.max(0, Math.floor(goal))
  const filled = Math.min(Math.max(0, Math.floor(stamps)), total)

  return (
    <div
      className={cn('flex flex-wrap gap-[0.25rem]', className)}
      role="img"
      aria-label={label ?? `${filled} of ${total} stamps collected`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={cn(
            'size-[0.55rem] rounded-round',
            index < filled ? 'bg-accent' : 'bg-line',
          )}
        />
      ))}
    </div>
  )
}
