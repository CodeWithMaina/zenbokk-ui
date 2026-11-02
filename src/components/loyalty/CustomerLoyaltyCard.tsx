import { errorMessage } from '../../lib/api/client'
import { rewardLabel } from '../../lib/clients/mappers'
import { useClientDetails } from '../../lib/clients/use-clients'
import { Alert } from '../ui/alert'
import { EmptyState } from '../ui/empty-state'
import { Skeleton } from '../ui/skeleton'
import { LoyaltyCardRenderer } from './LoyaltyCardRenderer'

export type CustomerLoyaltyCardProps = {
  customerId: string
  /** Fetch only when the card is actually on screen (e.g. an expanded row). */
  enabled?: boolean
  className?: string
}

/**
 * A customer's real loyalty card.
 *
 * The markup comes from `GET …/customers/{id}/details`, which renders the
 * business's selected design with **this customer's** stamp balance and
 * enrollment — the same pipeline that produces the card in the customer app.
 * Nothing here is fabricated: no card is drawn until the API answers.
 */
export function CustomerLoyaltyCard({
  customerId,
  enabled = true,
  className,
}: CustomerLoyaltyCardProps) {
  const details = useClientDetails(customerId, enabled)

  if (details.isPending) {
    return <Skeleton className={className ? `${className} h-[13rem] rounded-card` : 'h-[13rem] rounded-card'} />
  }

  if (details.isError) {
    return (
      <Alert tone="danger" title="Card could not be loaded" className={className}>
        {errorMessage(details.error)}
      </Alert>
    )
  }

  const loyalty = details.data?.loyalty ?? null

  if (!loyalty) {
    return (
      <EmptyState
        className={className}
        title="No loyalty card"
        description="This customer is enrolled but has not joined this program, so there is no card to show."
      />
    )
  }

  return (
    <div className={className}>
      <div className="max-w-[380px]">
        <LoyaltyCardRenderer
          html={loyalty.cardDesignHtml}
          designName={loyalty.cardDesignName}
          label={`${details.data?.customer.fullName ?? 'Customer'} loyalty card`}
          values={{
            customerName: details.data?.customer.fullName,
            programName: loyalty.programName,
            rewardName: rewardLabel(loyalty),
            stampsRequired: loyalty.stampsRequired,
            stampsCollected: loyalty.totalStamps,
            enrolledYear: details.data?.customer.enrolledAt
              ? new Date(details.data.customer.enrolledAt).getFullYear()
              : undefined,
          }}
        />
      </div>
      <p className="mt-[0.5rem] flex flex-wrap items-center gap-x-[0.8rem] gap-y-[0.2rem] text-caption text-muted">
        <span>
          {loyalty.totalStamps} of {loyalty.stampsRequired} stamps
        </span>
        <span>
          Design: <b className="font-semibold text-fg">{loyalty.cardDesignName ?? 'Default card'}</b>
        </span>
      </p>
    </div>
  )
}
