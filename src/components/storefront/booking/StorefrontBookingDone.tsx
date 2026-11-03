import { ArrowRight, CalendarPlus } from 'lucide-react'
import { formatDay, formatDuration, money } from '../../../lib/format'
import type { Appointment, ServiceCatalogItem } from '../../../lib/api/types'
import { storefrontHref } from '../../../lib/tenant'
import { StorefrontPaymentPanel } from '../StorefrontPaymentPanel'

export type StorefrontBookingDoneProps = {
  appointment: Appointment
  services: ServiceCatalogItem[]
  staffName: string | null
  canonicalSlug: string
  /** The visitor's own number, offered as the M-Pesa default. */
  defaultPhone?: string | null
  /** True when the business takes payments through Punched. */
  canPay: boolean
}

/**
 * The booking confirmation.
 *
 * Everything on it is what the server returned: the appointment's own id as the
 * reference, the time it stored, the services it recorded. Nothing is generated
 * in the browser, and the payment panel is the real payment path — it says
 * "awaiting confirmation" until the provider's callback says otherwise.
 */
export function StorefrontBookingDone({
  appointment,
  services,
  staffName,
  canonicalSlug,
  defaultPhone,
  canPay,
}: StorefrontBookingDoneProps) {
  const scheduled = new Date(appointment.scheduledAt)
  // Prefer what the server recorded over what the page had selected: if the
  // studio edited the appointment on creation, the confirmation must say so.
  const recorded =
    appointment.services.length > 0
      ? appointment.services.map((service) => ({
          key: service.serviceCatalogItemId,
          name: service.name,
          price: service.price,
          durationMinutes: service.durationMinutes,
        }))
      : services.map((service) => ({
          key: service.id,
          name: service.name,
          price: service.price,
          durationMinutes: service.durationMinutes,
        }))
  const total = recorded.reduce((sum, service) => sum + service.price, 0)
  const duration = recorded.reduce((sum, service) => sum + service.durationMinutes, 0)

  return (
    <div className="sf-container py-[clamp(2rem,6vw,4rem)]">
      <div className="sf-done">
        <svg className="sf-ring" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="34" />
          <path d="M27 41l9 9 17-19" />
        </svg>

        <h1 className="sf-heading">You’re booked in</h1>
        <p className="sf-lead mx-auto">
          The studio has your appointment. Keep this reference — it is what they look up.
        </p>

        <p className="sf-ref">{appointment.id}</p>

        <div className="sf-summary text-left">
          <div className="sf-summary-row">
            <span>When</span>
            <span className="text-premium-ink">
              {formatDay(scheduled)} ·{' '}
              {scheduled.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="sf-summary-row">
            <span>With</span>
            <span className="text-premium-ink">{staffName ?? 'First available specialist'}</span>
          </div>
          <div className="sf-summary-row">
            <span>Duration</span>
            <span className="text-premium-ink">{formatDuration(duration)}</span>
          </div>
          <hr />
          {recorded.map((service) => (
            <div key={service.key} className="sf-summary-row">
              <span className="min-w-0 truncate">{service.name}</span>
              <span className="shrink-0 tabular">{money(service.price)}</span>
            </div>
          ))}
          <hr />
          <div className="sf-summary-row text-label">
            <b className="text-premium-ink">Total</b>
            <b className="text-premium-ink">{money(total)}</b>
          </div>
        </div>

        {canPay ? (
          <div className="text-left">
            <StorefrontPaymentPanel
              appointmentId={appointment.id}
              total={total}
              defaultPhone={defaultPhone}
            />
          </div>
        ) : (
          <p className="mt-[1rem] text-meta text-muted">
            This business settles payment directly at the studio. Nothing was charged here.
          </p>
        )}

        <ol className="sf-timeline">
          <li>
            <span className="sf-step-n">1</span>
            <span>
              <b>The studio confirms your slot</b>
              <span className="mt-[0.15rem] block text-caption text-muted">
                You’ll get a reminder before your visit.
              </span>
            </span>
          </li>
          <li>
            <span className="sf-step-n">2</span>
            <span>
              <b>Come in at your time</b>
              <span className="mt-[0.15rem] block text-caption text-muted">
                Your services are booked for {formatDuration(duration)} in total.
              </span>
            </span>
          </li>
        </ol>

        <div className="mt-[1.4rem] flex flex-wrap justify-center gap-[0.6rem]">
          <a href={storefrontHref(canonicalSlug)} className="btn btn-primary no-underline">
            Back to the storefront
          </a>
          <a
            href={storefrontHref(canonicalSlug, '/book')}
            className="btn btn-ghost no-underline"
          >
            <CalendarPlus className="size-[0.95rem]" aria-hidden="true" />
            Book another
            <ArrowRight className="size-[0.95rem]" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  )
}
