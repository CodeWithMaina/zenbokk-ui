import { useId } from 'react'
import type { BookingDraft } from '../../lib/booking'
import {
  bookingEndMinutes,
  bookingStartMinutes,
  minutesToClock,
  paymentPlanLabel,
  paymentStatusLabel,
  recordedAmount,
  outstandingBalance,
  serviceTotals,
} from '../../lib/booking'
import { formatDuration, money } from '../../lib/format'
import { cn } from '../../lib/cn'

/**
 * The live receipt: a cream paper slip on the dark premium panel.
 *
 * It is a *view* of the draft, never a source of truth — every figure is read
 * from the same helpers the review step uses, so the receipt can never disagree
 * with the form. The paper palette is deliberately constant in light and dark
 * themes (a receipt is paper), which is why it is declared in `index.css` as
 * `--bkw-paper` and friends rather than read from the theme tokens.
 */

export type ReceiptExtras = {
  /** Shown on the header line, from the business profile. */
  businessName: string
  businessLogoUrl?: string | null
  /** Set once the backend has answered: the appointment's own reference. */
  reference?: string | null
  /** True after a successful create, which flips the stamp to Confirmed. */
  confirmed?: boolean
  /** The instant the draft was finalised, for the receipt's timestamp. */
  confirmedAt?: Date | null
  /** The server's own words for a payment that is not settled yet. */
  paymentNote?: string | null
  className?: string
}

/** Zigzag top/bottom edge, painted in the paper colour the CSS declares. */
function Zigzag({ up }: { up: boolean }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg className="bkw-receipt-zag" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 12 8">
      <defs>
        <pattern id={`bkw-zag-${id}`} width="12" height="8" patternUnits="userSpaceOnUse">
          <path d={up ? 'M0 8 6 0 12 8Z' : 'M0 0H12L6 8Z'} fill="var(--bkw-paper)" />
        </pattern>
      </defs>
      <rect width="12" height="8" fill={`url(#bkw-zag-${id})`} />
    </svg>
  )
}

/** Deterministic bars for the receipt's barcode, seeded by what it prints. */
function barcodeBars(seed: string): { x: number; width: number }[] {
  let state = 0
  for (let index = 0; index < seed.length; index += 1) {
    state = (Math.imul(state, 31) + seed.charCodeAt(index)) >>> 0
  }
  const bars: { x: number; width: number }[] = []
  let cursor = 0
  while (cursor < 118 && bars.length < 70) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0
    const width = 1 + ((state >>> 16) % 3)
    const gap = 1 + ((state >>> 21) % 2)
    bars.push({ x: cursor, width })
    cursor += width + gap
  }
  return bars
}

function ReceiptLine({
  label,
  value,
  caption,
  quiet = false,
}: {
  label: string
  value: string
  caption?: string
  quiet?: boolean
}) {
  return (
    <div className={cn('bkw-receipt-line', quiet && 'quiet')}>
      <span>
        {label}
        {caption ? <small>{caption}</small> : null}
      </span>
      <span className="bkw-receipt-leader" aria-hidden="true" />
      <span>{value}</span>
    </div>
  )
}


export function BookingReceipt({
  draft,
  extras,
  className,
}: {
  draft: BookingDraft
  extras: ReceiptExtras
  className?: string
}) {
  const totals = serviceTotals(draft.services)
  const start = bookingStartMinutes(draft)
  const end = bookingEndMinutes(draft)
  const recorded = recordedAmount(draft)
  const balance = outstandingBalance(draft)
  const seed = extras.reference ?? `${draft.services.map((line) => line.id).join('')}${totals.price}`
  const bars = barcodeBars(seed)
  const stamp = extras.confirmed ? 'Confirmed' : paymentStatusLabel(draft)
  const settled = stamp === 'Paid in full'
  const printedAt = extras.confirmedAt ?? new Date()
  const typeLabel =
    draft.type === null ? null : draft.type === 'walk_in' ? 'Walk-in' : 'Appointment'

  return (
    <div className={cn('bkw-receipt-wrap', className)}>
      <Zigzag up />
      <div className="bkw-receipt">
        <div className="bkw-receipt-head">
          <div className="min-w-0">
            <p className="bkw-receipt-label mb-[0.3rem]">Receipt</p>
            <div className="bkw-receipt-brand">
              {extras.businessLogoUrl ? (
                <img
                  src={extras.businessLogoUrl}
                  alt=""
                  className="size-[1.5rem] rounded-full object-cover"
                />
              ) : null}
              <span className="min-w-0 truncate">{extras.businessName}</span>
            </div>
            <p className="bkw-receipt-meta">
              {printedAt.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              {' · '}
              {minutesToClock(printedAt.getHours() * 60 + printedAt.getMinutes())}
            </p>
          </div>
          <div className="bkw-receipt-pills">
            {typeLabel ? <span className="bkw-receipt-pill">{typeLabel}</span> : null}
            <span className={cn('bkw-receipt-pill', extras.confirmed && 'confirmed')}>
              {extras.confirmed ? 'Confirmed' : 'Draft'}
            </span>
          </div>
        </div>

        <div className="bkw-receipt-cut" />
        <p className="bkw-receipt-label">Customer</p>
        {draft.customer ? (
          <>
            <p className="font-semibold">{draft.customer.fullName}</p>
            <p className="bkw-receipt-meta">{draft.customer.phoneNumber ?? '—'}</p>
          </>
        ) : (
          <p className="bkw-receipt-placeholder">No customer selected</p>
        )}


        <div className="bkw-receipt-cut" />
        <p className="bkw-receipt-label">Services</p>
        {draft.services.length === 0 ? (
          <p className="bkw-receipt-placeholder">No services added</p>
        ) : (
          draft.services.map((service) => (
            <ReceiptLine
              key={service.id}
              label={service.name}
              caption={formatDuration(service.durationMinutes)}
              value={money(service.price)}
            />
          ))
        )}
        <div className="bkw-receipt-total">
          <span>Total</span>
          <span>{money(totals.price)}</span>
        </div>

        <div className="bkw-receipt-cut" />
        <p className="bkw-receipt-label">Appointment</p>
        {draft.type && start != null ? (
          <>
            <ReceiptLine
              label="Date"
              value={draft.type === 'walk_in' ? 'Today' : (draft.date ?? '—')}
              quiet
            />
            <ReceiptLine
              label="Time"
              value={`${minutesToClock(start)}${
                draft.services.length > 0 && end != null ? ` – ${minutesToClock(end)}` : ''
              }`}
              quiet
            />
            <ReceiptLine label="Duration" value={formatDuration(totals.durationMinutes)} quiet />
          </>
        ) : (
          <p className="bkw-receipt-placeholder">Date and time not chosen</p>
        )}

        <div className="bkw-receipt-cut" />
        <p className="bkw-receipt-label">Payment</p>
        {draft.step >= 3 || extras.confirmed ? (
          <>
            <ReceiptLine label="Plan" value={paymentPlanLabel(draft)} quiet />
            {draft.plan === 'after' ? null : (
              <>
                <ReceiptLine
                  label="Method"
                  value={
                    draft.method === 'mpesa' ? 'M-Pesa' : draft.method === 'cash' ? 'Cash' : 'Other'
                  }
                  quiet
                />
                {draft.method === 'mpesa' && draft.transactionCode ? (
                  <ReceiptLine label="Code" value={draft.transactionCode} quiet />
                ) : null}
                {draft.method === 'other' && draft.reference ? (
                  <ReceiptLine label="Reference" value={draft.reference} quiet />
                ) : null}
              </>
            )}
            <ReceiptLine label="Received" value={money(recorded)} quiet />
            <ReceiptLine label="Balance due" value={money(balance)} />
            <span className={cn('bkw-stamp', !settled && 'pending')}>{stamp}</span>
            {extras.paymentNote ? (
              <p className="bkw-receipt-meta mt-[0.6rem]">{extras.paymentNote}</p>
            ) : null}
          </>
        ) : (
          <p className="bkw-receipt-placeholder">Recorded at the payment step</p>
        )}


        <div className="bkw-receipt-cut" />
        <svg
          className="bkw-barcode"
          viewBox="0 0 120 30"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {bars.map((bar) => (
            <rect key={bar.x} x={bar.x} width={bar.width} height="30" fill="var(--bkw-ink)" />
          ))}
        </svg>
        <p className="bkw-barcode-number">{extras.reference ?? 'NO. DRAFT'}</p>
      </div>
      <Zigzag up={false} />
    </div>
  )
}
