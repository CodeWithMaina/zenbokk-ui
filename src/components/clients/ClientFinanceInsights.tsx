import { Receipt, Sparkles, TrendingUp } from 'lucide-react'
import type { CustomerDetailsFinanceBlock } from '../../lib/api/types'
import { formatDate, formatNumber, money } from '../../lib/format'
import { cn } from '../../lib/cn'
import { SectionCard } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

export type ClientFinanceInsightsProps = {
  /** The server-aggregated block. Absent only while an older payload is in play. */
  finance?: CustomerDetailsFinanceBlock
  className?: string
}

/** One labelled figure inside the insight card. */
function Figure({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-caption font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-[0.15rem] text-label font-semibold tabular">{value}</p>
      {hint ? <p className="text-caption text-subtle">{hint}</p> : null}
    </div>
  )
}

/**
 * Customer → Overview: what this customer is worth to the business.
 *
 * Every figure is computed server-side from this business's own ledger and its
 * completed appointments (verified income minus verified refunds), so the card can
 * never disagree with the finance module it summarises. A customer with no history
 * gets an explanation, not a row of zeros pretending to be insight.
 */
export function ClientFinanceInsights({ finance, className }: ClientFinanceInsightsProps) {
  if (!finance) {
    return (
      <SectionCard title="Financial overview" className={className}>
        <div className="space-y-[0.6rem]" aria-busy="true" aria-label="Loading spend figures">
          <Skeleton className="h-[2.2rem] w-[10rem]" />
          <Skeleton className="h-[1rem] w-full max-w-[16rem]" />
          <Skeleton className="h-[1rem] w-full max-w-[12rem]" />
        </div>
      </SectionCard>
    )
  }

  const currency = finance.currency || 'KES'
  const hasPayments = finance.paidTransactions > 0
  const net = money(finance.totalSpent, currency)

  return (
    <SectionCard
      title="Financial overview"
      description="Recognised spend at this business — settled payments less refunds."
      className={className}
    >
      {finance.hasHistory ? (
        <div className="space-y-[1rem]">
          <div className="flex flex-wrap items-end justify-between gap-[0.8rem]">
            <div className="min-w-0">
              <p className="text-caption font-semibold tracking-wide text-muted uppercase">
                Total spent
              </p>
              <p className="text-metric leading-[1.1] font-bold tracking-tight tabular">
                {net}
              </p>
              <p className="mt-[0.1rem] text-meta text-muted">
                {hasPayments
                  ? `${formatNumber(finance.paidTransactions)} payment${finance.paidTransactions === 1 ? '' : 's'}`
                  : 'No settled payments yet'}
                {finance.refundedAmount > 0
                  ? ` · ${money(finance.refundedAmount, currency)} refunded`
                  : ''}
              </p>
            </div>

            {finance.topService ? (
              <div className="flex min-w-0 items-start gap-[0.6rem] rounded-card bg-sunken px-[0.75rem] py-[0.6rem]">
                <span className="grid size-[1.7rem] shrink-0 place-items-center rounded-round bg-surface text-muted">
                  <Sparkles className="size-[0.95rem]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-caption font-semibold tracking-wide text-muted uppercase">
                    Most booked service
                  </p>
                  <p className="truncate text-label font-semibold">
                    {finance.topService.serviceName}
                  </p>
                  <p className="text-caption text-subtle tabular">
                    {formatNumber(finance.topService.timesServed)}{' '}
                    {finance.topService.timesServed === 1 ? 'visit' : 'visits'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-x-[1rem] gap-y-[0.8rem] border-t border-line/60 pt-[0.9rem] sm:grid-cols-3">
            <Figure
              label="Completed visits"
              value={formatNumber(finance.completedAppointments)}
              hint="Cancelled & no-shows excluded"
            />
            <Figure
              label="Average spend"
              value={hasPayments ? money(finance.averageSpend, currency) : '—'}
              hint="Per settled payment"
            />
            <Figure
              label="Last payment"
              value={finance.lastPaymentAt ? formatDate(finance.lastPaymentAt) : '—'}
              hint={finance.lastPaymentAt ? undefined : 'None recorded'}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-[0.7rem] rounded-card bg-sunken px-[0.85rem] py-[0.8rem]">
          <span className="grid size-[1.9rem] shrink-0 place-items-center rounded-round bg-surface text-muted">
            <TrendingUp className="size-[1rem]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-label font-semibold">No spend yet</p>
            <p className="mt-[0.1rem] text-meta text-muted">
              Once this client pays for a service, their spend, average and most-booked
              service appear here — calculated from your own payments and completed visits.
            </p>
          </div>
        </div>
      )}

      <p
        className={cn(
          'mt-[0.9rem] flex items-center gap-[0.35rem] text-caption text-subtle',
          !finance.hasHistory && 'hidden',
        )}
      >
        <Receipt className="size-[0.85rem]" aria-hidden="true" />
        Totals include only money your books have confirmed.
      </p>
    </SectionCard>
  )
}
