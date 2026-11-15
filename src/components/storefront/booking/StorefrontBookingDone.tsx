import { ArrowRight, CalendarPlus } from 'lucide-react'
import { formatDay, formatDuration, money } from '../../../lib/format'
import type { Appointment, ServiceCatalogItem } from '../../../lib/api/types'
import { storefrontHref } from '../../../lib/tenant'
import { useAppointmentPaymentSummary, usePublicPaymentDetails } from '../../../lib/payments/api'
import { Alert } from '../../ui/alert'
import { StorefrontPaymentPanel } from '../StorefrontPaymentPanel'
import { StorefrontMpesaPanel } from './StorefrontMpesaPanel'
import type { PublicBookingResponse } from '../../../lib/storefront/api'

export type StorefrontBookingDoneProps = {
  appointment: Appointment
  /**
   * Everything the server said about this booking, when it came from the public storefront API.
   *
   * The confirmation's job is to state the appointment AND the money's own state — booked with the
   * payment waiting for the business, part paid, or paid — and that state is the server's, not
   * something this screen infers from what it happens to know.
   */
  booking?: PublicBookingResponse
  services: ServiceCatalogItem[]
  staffName: string | null
  canonicalSlug: string
  /** The business the appointment was booked at — needed to read its payment setup. */
  businessId: string
  /** The visitor's own number, offered as the M-Pesa default. */
  defaultPhone?: string | null
  /** True when the business takes payments through Punched. */
  canPay: boolean
  /**
   * A confirmation the customer pasted during the wizard's payment step.
   *
   * Handed straight to the payment panel, which attaches it to the appointment — the paste is part
   * of the booking flow, not a chore after it.
   */
  autoSubmitMessage?: string | null
  /**
   * The customer chose to pay after the service. Nothing is collected on this screen: the
   * booking already carries the amount as an outstanding payment, and the confirmation
   * must say so rather than showing a payment panel for money nobody is paying yet.
   */
  payAfterService?: boolean
}

/**
 * The booking confirmation.
 *
 * Everything on it is what the server returned: the appointment's own id as the
 * reference, the time it stored, the services it recorded. Nothing is generated
 * in the browser.
 *
 * Two payment paths are offered, and which one appears is decided by the
 * business's own configuration, not by the page:
 *
 *  - **Manual M-PESA** — the business published a PayBill or Till, so the customer
 *    sends the booking fee themselves and pastes the confirmation. The fee shown is
 *    the server's (`GET /v1/payments/appointment/{id}`), computed from the
 *    business's configured percentage.
 *  - **Daraja STK** — the business has a working payment account, so the platform
 *    pushes the prompt to the customer's handset and the provider's callback settles
 *    it.
 *
 * Neither path can be settled by anything the browser does.
 */
export function StorefrontBookingDone({
  appointment,
  booking,
  services,
  staffName,
  canonicalSlug,
  businessId,
  defaultPhone,
  canPay,
  autoSubmitMessage,
  payAfterService = false,
}: StorefrontBookingDoneProps) {
  const scheduled = new Date(appointment.scheduledAt)
  // Prefer what the server recorded over what the page had selected: if the
  // studio edited the appointment on creation, the confirmation must say so.
  // The catalogue carries the service images; the appointment's own snapshots do not,
  // so an image is looked up by service id where one exists.
  const imageById = new Map(services.map((service) => [service.id, service.imageVariants[0]?.url ?? null]))
  const recorded =
    appointment.services.length > 0
      ? appointment.services.map((service) => ({
          key: service.serviceCatalogItemId,
          name: service.name,
          price: service.price,
          durationMinutes: service.durationMinutes,
          imageUrl: imageById.get(service.serviceCatalogItemId) ?? null,
        }))
      : services.map((service) => ({
          key: service.id,
          name: service.name,
          price: service.price,
          durationMinutes: service.durationMinutes,
          imageUrl: service.imageVariants[0]?.url ?? null,
        }))
  const total = recorded.reduce((sum, service) => sum + service.price, 0)
  const duration = recorded.reduce((sum, service) => sum + service.durationMinutes, 0)

  // The business's own payment setup decides which path is offered. The manual
  // channel wins when it is configured, because it is the one the business has
  // explicitly asked customers to use — but it still needs the `payments` module,
  // because every payment endpoint is gated on it.
  const publicDetails = usePublicPaymentDetails(businessId, canPay)
  const manualMpesa = canPay && publicDetails.data?.enabled === true

  // Only fetched when it can be shown: a booking that owes nothing up front must
  // not pay for a request it will not use. A pay-after booking shows what is owed,
  // so it reads the same server-computed summary.
  const summary = useAppointmentPaymentSummary(appointment.id, manualMpesa || payAfterService === true)
  const bookingFee = summary.data?.bookingFee ?? 0
  const serviceTotal = summary.data?.serviceTotal ?? total
  const outstanding = summary.data?.balance ?? total

  return (
    <div className="sf-container py-[clamp(2rem,6vw,4rem)]">
      <div className="sf-done">
        <svg className="sf-ring" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="34" />
          <path d="M27 41l9 9 17-19" />
        </svg>

        <h1 className="sf-heading">You’re booked in</h1>
        <p className="sf-lead mx-auto">
          {/* When the booking came from the storefront API, the money's own state is the server's
              words — booked with the fee waiting for the business, part paid, or paid. */}
          {booking?.message ??
            'The studio has your appointment. Keep this reference — it is what they look up.'}
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
              <span className="flex min-w-0 items-center gap-[0.5rem]">
                {service.imageUrl ? (
                  <img
                    src={service.imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-[1.9rem] shrink-0 rounded-sm object-cover"
                  />
                ) : null}
                <span className="min-w-0 truncate">{service.name}</span>
              </span>
              <span className="shrink-0 tabular">{money(service.price)}</span>
            </div>
          ))}
          <hr />
          <div className="sf-summary-row text-label">
            <b className="text-premium-ink">Total</b>
            <b className="text-premium-ink">{money(total)}</b>
          </div>
        </div>

        {/* Anything the customer must act on — an M-PESA message the server could not read, a
            receipt already used — is stated plainly. The booking stands regardless. */}
        {booking?.warnings?.length ? (
          <div className="space-y-[0.5rem] text-left">
            {booking.warnings.map((warning) => (
              <Alert key={warning} tone="warning">
                {warning}
              </Alert>
            ))}
          </div>
        ) : null}

        {booking?.paymentState === 'pending_verification' ? (
          <Alert tone="info" className="text-left">
            <b>Your payment is being checked.</b> The studio reviews M-PESA confirmations and will
            mark this booking paid as soon as yours is verified — your appointment is confirmed
            either way.
          </Alert>
        ) : booking?.paymentState === 'paid' ? (
          <Alert tone="success" className="text-left">
            <b>Paid.</b> {money(serviceTotal)} is settled on this booking.
          </Alert>
        ) : payAfterService ? (
          <Alert tone="info" className="text-left">
            <b>Nothing to pay now.</b> {money(outstanding)} stays on your booking as outstanding —
            the studio collects it when you come in, in cash or by M-PESA.
          </Alert>
        ) : manualMpesa ? (
          <div className="text-left">
            <StorefrontMpesaPanel
              businessId={businessId}
              appointmentId={appointment.id}
              serviceTotal={serviceTotal}
              bookingFee={bookingFee}
              paymentId={booking?.payment?.id ?? null}
              autoSubmitMessage={autoSubmitMessage}
            />
          </div>
        ) : canPay ? (
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
          {payAfterService ? (
            <li>
              <span className="sf-step-n">3</span>
              <span>
                <b>Pay for your visit</b>
                <span className="mt-[0.15rem] block text-caption text-muted">
                  {money(outstanding)} is owed on this booking; the studio records it when you pay.
                </span>
              </span>
            </li>
          ) : null}
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
