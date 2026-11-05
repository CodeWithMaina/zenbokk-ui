import { Clock, Loader2 } from 'lucide-react'
import { formatDuration, money } from '../../../lib/format'
import type { ServiceCatalogItem } from '../../../lib/api/types'
import { cn } from '../../../lib/cn'

export type StorefrontBookingSummaryProps = {
  services: ServiceCatalogItem[]
  /** Chosen specialist, or null for "first available". */
  staffName: string | null
  /** Already-formatted appointment date and time, when chosen. */
  when: string | null
  /** For solo businesses, the business name to show instead of staff. */
  businessName?: string
  /** Whether staff exists for this business. */
  hasEligibleStaff?: boolean
  className?: string
}

/**
 * The running booking summary.
 *
 * One component for both places it appears — the desktop aside and the phone
 * drawer — so the two can never disagree about the total. Prices come from the
 * catalogue the visitor is browsing, and the duration is the sum the availability
 * engine will use to find slots, which is why the two are shown together.
 */
export function StorefrontBookingSummary({
  services,
  staffName,
  when,
  businessName,
  hasEligibleStaff = true,
  className,
}: StorefrontBookingSummaryProps) {
  const total = services.reduce((sum, service) => sum + service.price, 0)
  const duration = services.reduce((sum, service) => sum + service.durationMinutes, 0)

  return (
    <div className={cn('sf-summary', className)}>
      <p className="text-caption font-semibold tracking-caps text-premium-gold uppercase">
        Your booking
      </p>

      {services.length === 0 ? (
        <p className="mt-[0.5rem] text-meta text-premium-muted">
          Your choices appear here as you go.
        </p>
      ) : (
        <>
          <ul className="mt-[0.5rem] list-none p-0">
            {services.map((service) => (
              <li key={service.id} className="sf-summary-row">
                <span className="min-w-0 truncate text-premium-ink">{service.name}</span>
                <span className="shrink-0 tabular">{money(service.price)}</span>
              </li>
            ))}
          </ul>

          <hr />

          <div className="sf-summary-row">
            <span>With</span>
            <span className="text-premium-ink">
              {staffName ?? (hasEligibleStaff ? 'First available' : businessName ?? 'Studio')}
            </span>
          </div>

          {when ? (
            <div className="sf-summary-row">
              <span>When</span>
              <span className="text-premium-ink">{when}</span>
            </div>
          ) : null}

          <div className="sf-summary-row">
            <span className="flex items-center gap-[0.3rem]">
              <Clock className="size-[0.8rem]" aria-hidden="true" />
              Duration
            </span>
            <span className="text-premium-ink">{formatDuration(duration)}</span>
          </div>

          <hr />

          <div className="sf-summary-row text-label">
            <b className="text-premium-ink">Total</b>
            <b className="text-premium-ink">{money(total)}</b>
          </div>
        </>
      )}
    </div>
  )
}

export type StorefrontBookingActionBarProps = {
  /** Headline figure, e.g. the running total or "No services yet". */
  headline: string
  /** Secondary line, e.g. `2 services · 1h 30m`. */
  detail: string | null
  /** The primary action. */
  action: React.ReactNode
  /** The step the visitor is on, used to hide the bar once they are done. */
  hidden?: boolean
  expanded: boolean
  onToggleExpanded: () => void
  children: React.ReactNode
}

/**
 * The fixed action bar that owns the bottom of the booking flow.
 *
 * On a phone it is the only thing that does not scroll, so it carries the running
 * total, a drawer holding the full summary, and the step's primary action. On a
 * desktop the summary lives in the aside instead and the bar becomes a slim
 * progress line with the same action.
 */
export function StorefrontBookingActionBar({
  headline,
  detail,
  action,
  hidden = false,
  expanded,
  onToggleExpanded,
  children,
}: StorefrontBookingActionBarProps) {
  return (
    <div className={cn('sf-actionbar', !hidden && 'is-shown', expanded && 'is-open')}>
      <div className="sf-actionbar-drawer">{children}</div>
      <div className="sf-actionbar-inner">
        <button
          type="button"
          className="sf-actionbar-toggle"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label="Show booking summary"
        >
          <span className="min-w-0">
            <b>{headline}</b>
            {detail ? <span className="text-muted"> · {detail}</span> : null}
          </span>
          <svg viewBox="0 0 24 24" className="size-[1.1rem]" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
        <div className="sf-actionbar-actions">{action}</div>
      </div>
    </div>
  )
}

/** A busy button label, used by every step's primary action. */
export function BusyLabel({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {children}
    </>
  )
}
