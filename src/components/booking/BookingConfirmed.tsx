import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { appointmentStatusLabel } from '../../lib/appointments'
import {
  bookingStartMinutes,
  longDate,
  minutesToClock,
  outstandingBalance,
  serviceTotals,
} from '../../lib/booking'
import { formatDuration, money } from '../../lib/format'
import { Button } from '../ui/button'
import { BookingReceipt } from './BookingReceipt'
import type { BookingWizardApi } from './use-booking-wizard'

/**
 * What the owner sees once the backend has answered.
 *
 * The heading, the stamp and the note are derived from what the server actually
 * returned — the appointment's own status, its reference and the money still
 * outstanding — never from what the browser hoped would happen. Nothing here
 * renders before the create call succeeds.
 */
export function BookingConfirmed({
  wizard,
  businessName,
  businessLogoUrl,
  onClose,
  onViewAppointment,
}: {
  wizard: BookingWizardApi
  businessName: string
  businessLogoUrl?: string | null
  onClose: () => void
  onViewAppointment?: (appointmentId: string) => void
}) {
  const [copied, setCopied] = useState<'reference' | 'receipt' | null>(null)
  const outcome = wizard.outcome
  const { draft } = wizard
  if (!outcome) return null

  const totals = serviceTotals(draft.services)
  const balance = outstandingBalance(draft)
  const start = bookingStartMinutes(draft)
  const when =
    draft.type === 'walk_in'
      ? `Today at ${minutesToClock(start)}`
      : `${longDate(draft.date)} at ${minutesToClock(start)}`
  const statusLabel = appointmentStatusLabel(outcome.appointment.status)
  // Only a booking the backend actually holds is announced as confirmed.
  const held = outcome.appointment.status !== 'pending_payment'
  const note =
    balance > 0
      ? `${money(balance)} is due after the service. ` +
        (draft.type === 'walk_in'
          ? 'Start the service when the customer is ready.'
          : `The customer is expected on ${longDate(draft.date)}.`)
      : `Nothing outstanding; this booking is fully paid. ${
          draft.type === 'walk_in'
            ? 'Start the service when the customer is ready.'
            : `The customer is expected on ${longDate(draft.date)}.`
        }`

  async function copy(value: string, kind: 'reference' | 'receipt') {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      // Clipboard access can be refused; the value stays visible to copy by hand.
    }
  }

  const share = async () => {
    if (!outcome) return
    const text = [
      `Booking ${outcome.reference}`,
      draft.customer?.fullName ?? '',
      when,
      `Total ${money(totals.price)}`,
      `Status ${statusLabel}`,
    ]
      .filter(Boolean)
      .join('\n')
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `Booking ${outcome.reference}`, text })
        return
      } catch {
        // A dismissed share sheet is not a failure worth reporting.
      }
    }
    await copy(text, 'receipt')
  }

  return (
    <div className="bkw-confirm">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-[0.6rem] right-[0.7rem]"
        aria-label="Close"
        onClick={onClose}
      >
        <X className="size-[1.1rem]" aria-hidden="true" />
      </Button>

      <div className="mx-auto grid max-w-[58rem] gap-[1.5rem] pt-[1.2rem] min-[56rem]:grid-cols-[minmax(0,1fr)_21rem] min-[56rem]:items-center min-[56rem]:gap-[2.5rem]">
        <div className="text-center min-[56rem]:text-left">
          <div className="bkw-ring" aria-hidden="true">
            <Check className="size-[1.8rem]" />
          </div>
          <p className="eyebrow text-premium-gold">
            {outcome.paymentFailed ? 'Check the payment' : 'All done'}
          </p>
          <h2 className="font-display mt-[0.35rem] text-title text-premium-ink">
            {held ? 'Appointment confirmed' : 'Booking held — payment pending'}
          </h2>
          <p className="mt-[0.2rem] mb-[1rem] text-premium-muted">
            {draft.customer?.fullName ?? 'Customer'} · {when}
          </p>

          <div className="bkw-refchip">
            <span>Reference</span>
            <b>{outcome.reference}</b>
            <Button
              size="sm"
              variant="ghost"
              className="text-premium-ink"
              onClick={() => void copy(outcome.reference, 'reference')}
            >
              {copied === 'reference' ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <dl className="mt-[1.2rem] border-t border-[color:var(--premium-ink-line)]">
            {(
              [
                ['Customer', draft.customer?.fullName ?? '—'],
                ['When', when],
                ['Services', `${draft.services.length} · ${formatDuration(totals.durationMinutes)}`],
                ['Total', money(totals.price)],
                ['Payment', statusLabel],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-[1rem] border-b border-[color:var(--premium-ink-line)] py-[0.65rem]"
              >
                <dt className="text-premium-muted">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-[1rem] rounded-lg border border-[color:var(--premium-ink-line)] bg-[color:var(--premium-ink-wash)] px-[0.95rem] py-[0.8rem] text-left text-meta">
            {note}
            {outcome.paymentNote ? ` ${outcome.paymentNote}` : ''}
          </p>
        </div>

        <div className="mx-auto w-full max-w-[24rem]">
          <BookingReceipt
            draft={{ ...draft, step: 4 }}
            extras={{
              businessName,
              businessLogoUrl,
              reference: outcome.reference,
              confirmed: held,
              confirmedAt: new Date(),
              paymentNote: outcome.paymentNote,
            }}
          />
          <div className="mt-[0.6rem] flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              className="text-premium-ink"
              onClick={() => void share()}
            >
              {copied === 'receipt' ? 'Copied' : 'Share receipt'}
            </Button>
          </div>
        </div>
      </div>

      <div className="bkw-confirm-actions mt-[1.4rem]">
        {outcome.paymentFailed ? (
          <Button
            variant="accent"
            disabled={wizard.attempting}
            onClick={() => void wizard.retryPayment()}
          >
            {wizard.attempting ? 'Recording…' : 'Record the payment again'}
          </Button>
        ) : null}
        {onViewAppointment ? (
          <Button variant="primary" onClick={() => onViewAppointment(outcome.appointment.id)}>
            View appointment
          </Button>
        ) : null}
        <Button variant="ghost" className="text-premium-ink" onClick={wizard.startAnother}>
          Create another
        </Button>
        <Button variant="ghost" className="text-premium-ink" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
