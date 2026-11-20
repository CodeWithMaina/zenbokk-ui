import { AlertTriangle, Check, Loader2, Lock } from 'lucide-react'
import { cn } from '../../../lib/cn'

/** The stages a booking really goes through, in the order the server performs them. */
export type BookingProgressStage = 'details' | 'availability' | 'appointment' | 'payment' | 'done'

export type BookingProgressProps = {
  /**
   * `submitting` while the single booking request is in flight, `confirmed` once the
   * server has returned a booking, `conflict` when the slot was taken, `failed` for
   * anything else. There is deliberately no "success by timer" state.
   */
  state: 'submitting' | 'confirmed' | 'conflict' | 'failed'
  /** Whether this booking takes a payment up front. */
  paysUpfront: boolean
  /** The server's own word on the money, once it has answered. */
  paymentState?: 'not_due' | 'unpaid' | 'pending_verification' | 'partially_paid' | 'paid'
  /** What went wrong, when `state` is not `submitting`/`confirmed`. */
  message?: string | null
  /** Dismisses a failed or conflicted run. */
  onDismiss?: () => void
}

type RowState = 'done' | 'active' | 'pending' | 'warning'

type Row = { key: BookingProgressStage; label: string; detail: string; state: RowState }

/**
 * Builds the stage list from what is actually known.
 *
 * The rules that matter:
 * - a booking is only "Secured" when the server returned one;
 * - payment is never "confirmed" just because the booking exists — a pasted M-PESA
 *   message leaves it *awaiting verification*, which is what the row says;
 * - a conflict stops the run at availability, and says so.
 */
export function bookingProgressRows({
  state,
  paysUpfront,
  paymentState,
}: Pick<BookingProgressProps, 'state' | 'paysUpfront' | 'paymentState'>): Row[] {
  const rows: Row[] = [
    {
      key: 'details',
      label: 'Confirming your details',
      detail: 'Name, mobile number and selected services.',
      state: 'done',
    },
  ]

  if (state === 'conflict') {
    rows.push(
      {
        key: 'availability',
        label: 'Checking availability',
        detail: 'That time was taken while you were booking.',
        state: 'warning',
      },
      {
        key: 'appointment',
        label: 'Securing your appointment',
        detail: 'Nothing has been booked — choose another time.',
        state: 'pending',
      },
    )
    return rows
  }

  if (state === 'failed') {
    rows.push(
      {
        key: 'availability',
        label: 'Checking availability',
        detail: 'The availability check did not complete.',
        state: 'warning',
      },
      {
        key: 'appointment',
        label: 'Securing your appointment',
        detail: 'The booking was not created.',
        state: 'pending',
      },
    )
    return rows
  }

  const confirmed = state === 'confirmed'

  rows.push(
    {
      key: 'availability',
      label: 'Checking availability',
      detail: confirmed
        ? 'Every selected service fits in one continuous booking.'
        : 'Verifying the whole booking interval with the studio.',
      state: confirmed ? 'done' : 'active',
    },
    {
      key: 'appointment',
      label: 'Securing your appointment',
      detail: confirmed ? 'Your slot is held.' : 'Reserving the slot on the studio diary.',
      state: confirmed ? 'done' : 'pending',
    },
  )

  if (paysUpfront) {
    rows.push(
      confirmed
        ? paymentState === 'pending_verification'
          ? {
              key: 'payment',
              label: 'Payment awaiting verification',
              detail: 'Your M-PESA confirmation was sent to the studio to check.',
              state: 'active',
            }
          : paymentState === 'paid'
            ? {
                key: 'payment',
                label: 'Payment confirmed',
                detail: 'The studio has verified your payment.',
                state: 'done',
              }
            : paymentState === 'partially_paid'
              ? {
                  key: 'payment',
                  label: 'Part payment recorded',
                  detail: 'A balance is still to settle.',
                  state: 'active',
                }
              : {
                  key: 'payment',
                  label: 'Payment due at the studio',
                  detail: 'The booking is held; nothing has been charged online.',
                  state: 'pending',
                }
        : {
            key: 'payment',
            label: 'Payment',
            detail: 'Handled once the appointment is secured.',
            state: 'pending',
          },
    )
  }

  rows.push({
    key: 'done',
    label: 'Booking confirmed',
    detail: confirmed ? 'You are booked in.' : 'Appears once the server confirms the booking.',
    state: confirmed ? 'done' : 'pending',
  })

  return rows
}

/**
 * The progress panel shown while a booking is being submitted.
 *
 * Deliberately restrained: a line of stages, a drawn check for what has completed,
 * and a quiet pulse on the one in progress. No percentages (we do not know them), no
 * bouncing, and it stops the moment the server answers. Motion is suppressed for
 * `prefers-reduced-motion` in CSS.
 */
export function BookingProgress({ state, paysUpfront, paymentState, message, onDismiss }: BookingProgressProps) {
  const rows = bookingProgressRows({ state, paysUpfront, paymentState })
  const failed = state === "conflict" || state === "failed"

  return (
    <div className={cn("sf-progress", failed && "is-warning")} role="status" aria-live="polite">
      <div className="sf-progress-head">
        <span className={cn("sf-progress-mark", failed && "is-warning")} aria-hidden="true">
          {failed ? <AlertTriangle className="size-4" /> : <Lock className="size-4" />}
        </span>
        <div className="sf-progress-copy">
          <b>
            {failed
              ? "We could not secure that time"
              : state === "confirmed"
                ? "Booking confirmed"
                : "Securing your booking"}
          </b>
          <p className="text-caption text-subtle">
            {failed
              ? message ?? "Please choose another time."
              : "This usually takes a moment. Please keep this page open."}
          </p>
        </div>
        {failed && onDismiss ? (
          <button type="button" className="sf-progress-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>

      <ol className="sf-progress-rows" role="list">
        {rows.map((row) => (
          <li key={row.key} className={cn("sf-progress-row", `is-${row.state}`)}>
            <span className="sf-progress-dot" aria-hidden="true">
              {row.state === "done" ? (
                <Check className="size-3" />
              ) : row.state === "active" ? (
                <Loader2 className="size-3 sf-spin" />
              ) : row.state === "warning" ? (
                <AlertTriangle className="size-3" />
              ) : null}
            </span>
            <span className="sf-progress-body">
              <b>{row.label}</b>
              <span>{row.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
