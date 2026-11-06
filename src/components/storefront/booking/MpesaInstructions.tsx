import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { money } from '../../../lib/format'
import type { PublicPaymentDetails } from '../../../lib/payments/api'

/**
 * One payment detail with a copy button.
 *
 * The copy button is the point of this component existing at all: the numbers are
 * long, they are typed into a phone keypad, and a mistyped PayBill number sends
 * money to a stranger. It reports success in place rather than with a toast, so the
 * confirmation cannot be missed while the customer is looking at the number.
 */
export function CopyableValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied (insecure context, denied permission); the
      // value is on screen either way, so this is not an error worth surfacing.
      setCopied(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-[0.35rem]">
      <b className="font-mono">{value}</b>
      <button
        type="button"
        className="link inline-flex items-center gap-[0.2rem] text-caption"
        onClick={() => void copy()}
        aria-label={`Copy ${label}`}
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  )
}

export type MpesaInstructionsProps = {
  details: PublicPaymentDetails
  /** The amount to send right now. Always the server's figure. */
  amount: number
  /** The full booking total, shown only when it differs from `amount`. */
  serviceTotal?: number
  /** Render the two numbered steps. Off when the caller explains them itself. */
  showSteps?: boolean
}

/**
 * How to pay this business by M-PESA, with nothing that cannot be followed.
 *
 * Rendered both inside the booking wizard (before the appointment exists) and on
 * the confirmation screen (after it does), so the instructions a customer reads are
 * literally the same component in both places — a divergence between "what I was
 * told to pay" and "what I am told to pay" is the kind of bug that costs a customer
 * money.
 */
export function MpesaInstructions({
  details,
  amount,
  serviceTotal,
  showSteps = true,
}: MpesaInstructionsProps) {
  const paybill = details.accountType === 'paybill'
  const lines: Array<{ label: string; value: string }> = paybill
    ? [
        { label: 'PayBill number', value: details.paybillNumber ?? '' },
        { label: 'Account number', value: details.paybillAccount ?? '' },
      ]
    : [{ label: 'Till number', value: details.tillNumber ?? '' }]

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-[0.6rem]">
        <span className="text-meta text-muted">Booking fee to pay now</span>
        <b className="text-title">{money(amount)}</b>
      </div>

      {serviceTotal !== undefined && serviceTotal !== amount ? (
        <p className="mt-[0.4rem] text-caption text-subtle">
          {money(amount)} of the {money(serviceTotal)} total ({details.bookingFeePercentage}%). The
          balance is settled at your appointment.
        </p>
      ) : null}

      {details.instructions ? (
        <p className="mt-[0.6rem] text-meta text-body">{details.instructions}</p>
      ) : null}

      <ol className="mt-[0.9rem] flex flex-col gap-[0.5rem]">
        {showSteps ? (
          <li className="text-meta text-body">
            1. On your phone, choose <b>M-PESA</b> → <b>Lipa na M-PESA</b> →{' '}
            <b>{paybill ? 'Pay Bill' : 'Buy Goods and Services'}</b>.
          </li>
        ) : null}
        {lines.map((line) => (
          <li key={line.label} className="text-meta text-body">
            <span className="text-subtle">{line.label}:</span>{' '}
            <CopyableValue label={line.label} value={line.value} />
          </li>
        ))}
        <li className="text-meta text-body">
          <span className="text-subtle">Amount:</span>{' '}
          <CopyableValue label="Amount" value={String(amount)} />
          {details.payeeName ? (
            <span className="text-subtle"> — you should see “{details.payeeName}”.</span>
          ) : null}
        </li>
        <li className="text-meta text-body">
          {showSteps ? '2. ' : ''}Paste the M-PESA confirmation message you receive below.
        </li>
      </ol>
    </>
  )
}