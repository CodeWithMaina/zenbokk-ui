import type { FinancialPaymentMethod } from '../../lib/finances/api'
import { PAYMENT_METHOD_OPTIONS } from '../../lib/finances/labels'
import { money, toDateInputValue } from '../../lib/format'

/**
 * The refund cap, the reason, how the money went back and whether it has gone back yet.
 *
 * The cap is what is LEFT to refund, not the original amount: the server enforces the same rule, and
 * showing it here means the field is never pre-filled with a figure that will be refused.
 */
export function RefundFields({
  amount,
  onAmountChange,
  refundableAmount,
  originalAmount,
  reason,
  onReasonChange,
  method,
  onMethodChange,
  reference,
  onReferenceChange,
  date,
  onDateChange,
  completed,
  onCompletedChange,
  exceeds,
  error,
}: {
  amount: string
  onAmountChange: (value: string) => void
  refundableAmount: number
  originalAmount: number
  reason: string
  onReasonChange: (value: string) => void
  method: FinancialPaymentMethod
  onMethodChange: (value: FinancialPaymentMethod) => void
  reference: string
  onReferenceChange: (value: string) => void
  date: string
  onDateChange: (value: string) => void
  completed: boolean
  onCompletedChange: (value: boolean) => void
  exceeds: boolean
  error: string | null
}) {
  return (
    <>
      <label className="label" htmlFor="refund-amount">
        Amount (KES)
      </label>
      <input
        id="refund-amount"
        className="input"
        inputMode="decimal"
        autoFocus
        value={amount}
        onChange={(event) => onAmountChange(event.target.value.replace(/[^0-9.]/g, ''))}
      />
      <p className="mt-[0.3rem] text-meta text-muted">
        {money(refundableAmount)} of {money(originalAmount)} is left to refund.
      </p>

      <label className="label mt-[0.6rem]" htmlFor="refund-reason">
        Reason (required)
      </label>
      <input
        id="refund-reason"
        className="input"
        value={reason}
        placeholder="e.g. Service not completed as agreed"
        onChange={(event) => onReasonChange(event.target.value)}
      />

      <label className="label mt-[0.6rem]" htmlFor="refund-method">
        Refunded by
      </label>
      <select
        id="refund-method"
        className="select"
        value={method}
        onChange={(event) => onMethodChange(event.target.value as FinancialPaymentMethod)}
      >
        {PAYMENT_METHOD_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      <label className="label mt-[0.6rem]" htmlFor="refund-reference">
        Refund reference (optional)
      </label>
      <input
        id="refund-reference"
        className="input"
        value={reference}
        placeholder="e.g. QJK42NUM09"
        onChange={(event) => onReferenceChange(event.target.value)}
      />

      <label className="label mt-[0.6rem]" htmlFor="refund-date">
        Refund date
      </label>
      <input
        id="refund-date"
        type="date"
        className="input"
        value={date}
        max={toDateInputValue()}
        onChange={(event) => onDateChange(event.target.value)}
      />

      <label className="mt-[0.7rem] flex items-start gap-[0.5rem] text-meta">
        <input type="checkbox" checked={completed} onChange={(event) => onCompletedChange(event.target.checked)} />
        <span>
          The money has already gone back to the customer.
          <span className="block text-muted">
            Leave this unticked for a refund you have agreed but not paid yet — it is recorded as pending and
            does not reduce what you took this period.
          </span>
        </span>
      </label>

      {exceeds ? (
        <p className="mt-[0.5rem] text-meta text-danger-ink" role="alert">
          That is more than the {money(refundableAmount)} still refundable.
        </p>
      ) : null}

      {error ? (
        <p className="mt-[0.5rem] text-meta text-danger-ink" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
