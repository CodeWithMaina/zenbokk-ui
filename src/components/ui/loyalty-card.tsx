import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { StampGrid } from './stamp-grid'

export type LoyaltyCardProps = {
  programName?: ReactNode
  memberName: ReactNode
  stamps: number
  goal?: number
  /** Reward copy shown on the right, e.g. \"KES 1,800 credit\". */
  reward: ReactNode
  /** Optional top-right pill, usually \"Reward ready\". */
  badge?: ReactNode
  className?: string
}

/** Dark premium loyalty card from the client overview. */
export function LoyaltyCard({
  programName = 'The Aurelia Circle',
  memberName,
  stamps,
  goal = 8,
  reward,
  badge,
  className,
}: LoyaltyCardProps) {
  return (
    <div className={cn('premium flex flex-col gap-[1.2rem]', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption tracking-caps text-premium-muted uppercase">
            {programName}
          </p>
          <p className="mt-[0.2rem] truncate text-sheet font-semibold text-premium-ink">
            {memberName}
          </p>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      <StampGrid stamps={stamps} goal={goal} />

      <div className="flex items-end justify-between gap-4 border-t border-premium-gold/20 pt-[0.9rem]">
        <div>
          <p className="text-caption tracking-caps text-premium-muted uppercase">
            Member
          </p>
          <p className="mt-[0.15rem] truncate font-semibold text-premium-ink">
            {memberName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-caption tracking-caps text-premium-muted uppercase">
            Reward
          </p>
          <p className="mt-[0.15rem] font-semibold whitespace-nowrap text-premium-gold">
            {reward}
          </p>
        </div>
      </div>
    </div>
  )
}
