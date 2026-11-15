import type { ReactNode } from 'react'
import {
  bookingEndMinutes,
  bookingStartMinutes,
  longDate,
  minutesToClock,
  outstandingBalance,
  paymentPlanLabel,
  recordedAmount,
  serviceTotals,
} from '../../../lib/booking'
import { formatDuration, money } from '../../../lib/format'
import { formatKenyanPhone } from '../../../lib/validation/contact'
import { LinkButton } from '../../ui/button'
import { FigureRow, StepHeading } from './shared'
import type { BookingWizardApi } from '../use-booking-wizard'

/**
 * Step 5 — the last look before the server is asked to create anything.
 *
 * Every section points back at the step that owns its data, and going back
 * changes nothing: the draft is one object, so an Edit is a jump, not a save.
 */
export function ReviewStep({ wizard }: { wizard: BookingWizardApi }) {
  const { draft } = wizard
  const totals = serviceTotals(draft.services)
  const start = bookingStartMinutes(draft)
  const end = bookingEndMinutes(draft)
  const recorded = recordedAmount(draft)
  const balance = outstandingBalance(draft)

  function Section({
    title,
    step,
    children,
  }: {
    title: string
    step: number
    children: ReactNode
  }) {
    return (
      <section className="bkw-review">
        <header>
          <b className="text-heading font-semibold">{title}</b>
          <LinkButton onClick={() => wizard.goTo(step)}>Edit</LinkButton>
        </header>
        <dl className="text-meta">{children}</dl>
      </section>
    )
  }

  return (
    <div>
      <StepHeading title="Review booking" hint="Check everything before you confirm." />

      <Section title="Customer" step={0}>
        <FigureRow label="Name">{draft.customer?.fullName ?? '—'}</FigureRow>
        <FigureRow label="Phone">
          {draft.customer?.phoneNumber ? formatKenyanPhone(draft.customer.phoneNumber) : '—'}
        </FigureRow>
        <FigureRow label="Email">{draft.customer?.email ?? '—'}</FigureRow>
        <FigureRow label="Booking type">
          {draft.type === 'walk_in' ? 'Walk-in' : 'Appointment'}
        </FigureRow>
      </Section>

      <Section title="Services" step={1}>
        {draft.services.map((service) => (
          <FigureRow key={service.id} label={formatDuration(service.durationMinutes)}>
            {service.name} · {money(service.price)}
          </FigureRow>
        ))}
        <FigureRow label="Total">{money(totals.price)}</FigureRow>
        <FigureRow label="Duration">{formatDuration(totals.durationMinutes)}</FigureRow>
      </Section>

      <Section title="Date and time" step={2}>
        <FigureRow label="Date">{draft.type === 'walk_in' ? 'Today' : longDate(draft.date)}</FigureRow>
        <FigureRow label="Start">{minutesToClock(start)}</FigureRow>
        <FigureRow label="Expected end">{minutesToClock(end)}</FigureRow>
      </Section>

      <Section title="Payment" step={3}>
        <FigureRow label="Plan">{paymentPlanLabel(draft)}</FigureRow>
        <FigureRow label="Total">{money(totals.price)}</FigureRow>
        {draft.plan === 'after' ? null : (
          <>
            <FigureRow label="Method">
              {draft.method === 'mpesa' ? 'M-Pesa' : draft.method === 'cash' ? 'Cash' : 'Other'}
            </FigureRow>
            {draft.method === 'mpesa' ? (
              <>
                <FigureRow label="Transaction code">
                  <span className="bkw-receipt-mono">{draft.transactionCode}</span>
                </FigureRow>
                <FigureRow label="Phone">
                  {draft.payerPhone.trim() ? formatKenyanPhone(draft.payerPhone) : '—'}
                </FigureRow>
              </>
            ) : draft.method === 'other' && draft.reference.trim() ? (
              <FigureRow label="Reference">{draft.reference}</FigureRow>
            ) : null}
          </>
        )}
        <FigureRow label="Recorded">{money(recorded)}</FigureRow>
        <FigureRow label="Balance">{money(balance)}</FigureRow>
      </Section>

      <p className="text-meta text-muted">
        Creating the booking asks the server to check the times again. If the slot has gone in the
        meantime, you are returned to the date and time step rather than given a booking that does
        not hold.
      </p>
    </div>
  )
}
