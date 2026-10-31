import type { ReactNode } from 'react'
import { LoyaltyCard } from '../ui/loyalty-card'
import { rewardLabel } from '../../lib/clients/mappers'
import type { CustomerDetailsLoyaltySummary } from '../../lib/api/types'

export type LoyaltyCardPreviewProps = {
  loyalty: CustomerDetailsLoyaltySummary | null
  memberName: string
  /** Draft stamp count, so the loyalty tab can preview an unsaved adjustment. */
  stamps?: number
  /** Set while an adjustment is pending, to mark the card as a preview. */
  previewNote?: ReactNode
  className?: string
}

/**
 * The client's loyalty card, rendered with the business's own program name,
 * reward wording and stamp threshold from
 * `GET …/customers/{id}/details`.
 *
 * The API also returns `cardDesignHtml`, a server-rendered fragment. It is
 * deliberately not injected into the DOM: the themed `LoyaltyCard` keeps the
 * module inside the shared token system and avoids rendering server HTML. The
 * design's own name is shown underneath so the configured design is still
 * visible.
 */
export function LoyaltyCardPreview({
  loyalty,
  memberName,
  stamps,
  previewNote,
  className,
}: LoyaltyCardPreviewProps) {
  if (!loyalty) {
    return (
      <div className={className}>
        <div className="card p-[1.1rem] text-center">
          <p className="font-semibold">No loyalty card yet</p>
          <p className="mt-[0.2rem] text-meta text-muted">
            This client is enrolled but has not joined a loyalty programme, so
            there is no card to show.
          </p>
        </div>
      </div>
    )
  }

  const goal = Math.max(1, loyalty.stampsRequired)
  const current = Math.min(Math.max(0, stamps ?? loyalty.totalStamps), goal)
  const ready = current >= goal

  return (
    <div className={className}>
      <LoyaltyCard
        programName={loyalty.programName}
        memberName={memberName}
        stamps={current}
        goal={goal}
        reward={rewardLabel(loyalty)}
        badge={
          ready ? (
            <span className="rounded-pill border border-premium-gold/40 px-[0.7rem] py-[0.25rem] text-caption font-semibold whitespace-nowrap text-premium-gold">
              Reward ready
            </span>
          ) : (
            <span className="rounded-pill border border-premium-gold/40 px-[0.7rem] py-[0.25rem] text-caption font-semibold whitespace-nowrap text-premium-gold">
              {current} / {goal}
            </span>
          )
        }
      />

      <p className="mt-[0.5rem] flex flex-wrap items-center justify-between gap-x-[0.8rem] gap-y-[0.2rem] text-caption text-muted">
        <span>
          Card design:{' '}
          <b className="font-semibold text-fg">
            {loyalty.cardDesignName ?? 'Default card'}
            {loyalty.cardDesignIsDefault ? ' (default)' : ''}
          </b>
        </span>
        {previewNote ? <span>{previewNote}</span> : null}
      </p>
    </div>
  )
}
