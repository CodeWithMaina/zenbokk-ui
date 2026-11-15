import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { SectionCard } from '../ui/card'
import { CustomerTypeBadge } from '../ui/customer-type-badge'
import { DescriptionList, DescriptionRow } from '../ui/description-list'
import { MetricGrid } from '../ui/metric-tile'
import { LoyaltyCardPreview } from './LoyaltyCardPreview'
import { clientStatusLabel } from '../../lib/clients/mappers'
import type { CustomerDetailsResponse } from '../../lib/api/types'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { formatDate, formatNumber, money } from '../../lib/format'

export type ClientOverviewTabProps = {
  details: CustomerDetailsResponse
  customerId: string
}

/**
 * Overview tab: the loyalty card preview, the client's real metrics and the
 * profile rows the API actually holds. Missing values show an explicit empty
 * state instead of an invented placeholder.
 *
 * Loyalty is its own module. When the business is not entitled to it, nothing
 * loyalty-shaped may render here — not the card, its metrics or its rows — even
 * though the endpoint still returns the fields.
 */
export function ClientOverviewTab({ details, customerId }: ClientOverviewTabProps) {
  const { hasModule } = useDashboardContext()
  const { customer, metrics, loyalty, status } = details
  const loyaltyEnabled = hasModule(MODULE.loyalty)
  const lastVisit = metrics.lastVisitAt ? formatDate(metrics.lastVisitAt) : null

  const metricItems = [
    ...(loyaltyEnabled
      ? [{ value: formatNumber(metrics.lifetimeStamps), label: 'Lifetime stamps' }]
      : []),
    { value: formatNumber(metrics.totalVisits), label: 'Total visits' },
    ...(loyaltyEnabled
      ? [{ value: formatNumber(metrics.totalRedemptions), label: 'Redemptions' }]
      : []),
    { value: lastVisit ?? '—', label: 'Last visit' },
  ]

  return (
    <div className="grid items-start gap-[1.1rem] min-[900px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-[1rem]">
        {loyaltyEnabled ? (
          <section>
            <div className="mb-[0.4rem] flex flex-wrap items-center justify-between gap-[0.6rem]">
              <h2>Loyalty card</h2>
              {loyalty ? (
                <Link
                  to="/dashboard/customers/$clientId"
                  params={{ clientId: customerId }}
                  search={{ tab: 'loyalty' }}
                  className="link inline-flex items-center gap-[0.2rem]"
                >
                  Manage stamps
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            <LoyaltyCardPreview loyalty={loyalty} memberName={customer.fullName} />
          </section>
        ) : null}

        <MetricGrid items={metricItems} />
      </div>

      <SectionCard title="Details">
        <DescriptionList>
          <DescriptionRow
            label="Phone"
            value={customer.phoneNumber ?? <span className="text-muted">Not provided</span>}
          />
          <DescriptionRow
            label="Email"
            value={<span className="[overflow-wrap:anywhere]">{customer.email}</span>}
          />
          <DescriptionRow label="Member since" value={formatDate(customer.enrolledAt)} />
          {loyaltyEnabled ? (
            <>
              <DescriptionRow
                label="Card design"
                value={
                  loyalty
                    ? `${loyalty.cardDesignName ?? 'Default card'}${loyalty.cardDesignIsDefault ? ' (default)' : ''}`
                    : <span className="text-muted">No card</span>
                }
              />
              <DescriptionRow
                label="Reward"
                value={
                  loyalty ? (
                    <>
                      {loyalty.rewardValue > 0 ? `${money(loyalty.rewardValue)} credit` : 'Programme reward'}
                      {loyalty.rewardExpirationHours > 0
                        ? ` · ${loyalty.rewardExpirationHours}h validity`
                        : ''}
                    </>
                  ) : (
                    <span className="text-muted">Not enrolled</span>
                  )
                }
              />
            </>
          ) : null}
          <DescriptionRow
            label="Status"
            value={clientStatusLabel(status.enrollmentStatus)}
          />
          <DescriptionRow
            label="Type"
            value={<CustomerTypeBadge type={status.customerType} />}
          />
        </DescriptionList>

        {loyaltyEnabled && !status.hasLoyaltyCard ? (
          <p className="mt-[0.9rem] text-meta text-muted">
            This client has not joined a loyalty programme yet, so stamp and visit
            figures stay at zero until they do.
          </p>
        ) : null}
      </SectionCard>
    </div>
  )
}
