import { ShieldCheck } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { formatDateTime, money } from '../../../lib/format'
import { scanMpesaMessage } from '../../../lib/payments/mpesa-message'
import { Alert } from '../../ui/alert'

export type MpesaConfirmationFieldProps = {
  id: string
  label: string
  /** Small inline hint beside the label (e.g. "(you can do this later)"). */
  labelHint?: ReactNode
  value: string
  onChange: (value: string) => void
  rows?: number
  disabled?: boolean
  /** Shown under the field while it is empty. */
  emptyHint?: ReactNode
}

/**
 * The M-PESA confirmation paste box, with the message scanned as it is typed.
 *
 * A pasted SMS is customer-supplied text — the one input in the payment flow an
 * attacker fully controls — so it is checked against the M-PESA construction rules
 * (receipt code, amount, transaction time) the moment it changes. A message that
 * reads like a genuine confirmation is echoed back field by field so the customer
 * can see it was understood; anything else is refused with the reason, and the caller
 * can disable submission until it is valid.
 *
 * One component for both places it appears — the booking wizard and the confirmation
 * screen — so the rule never diverges between them.
 */
export function MpesaConfirmationField({
  id,
  label,
  labelHint,
  value,
  onChange,
  rows = 3,
  disabled = false,
  emptyHint,
}: MpesaConfirmationFieldProps) {
  const scan = useMemo(() => scanMpesaMessage(value), [value])
  const hasText = value.trim().length > 0
  const describedBy = `${id}-scan`

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label} {labelHint}
      </label>
      <textarea
        id={id}
        className="textarea"
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder="QJK42NUM01 Confirmed. Ksh500.00 sent to …"
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />

      <div id={describedBy} aria-live="polite">
        {!hasText ? (
          <p className="mt-[0.4rem] text-caption text-subtle">
            {emptyHint ?? 'Copy the whole SMS, including the transaction code.'}
          </p>
        ) : scan.ok ? (
          <div className="mt-[0.5rem] rounded-lg border border-line bg-success-soft p-[0.7rem]">
            <p className="flex items-center gap-[0.35rem] text-caption font-semibold text-success-ink">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Looks like a genuine M-PESA confirmation
            </p>
            <dl className="m-0 mt-[0.5rem] grid grid-cols-2 gap-x-[0.8rem] gap-y-[0.5rem] sm:grid-cols-3">
              <ScanStat label="Transaction code" value={scan.transactionCode!} />
              <ScanStat label="Amount" value={money(scan.amount!)} />
              {scan.transactionAt ? (
                <ScanStat label="Time" value={formatDateTime(scan.transactionAt)} />
              ) : null}
              {scan.recipient ? <ScanStat label="Paid to" value={scan.recipient} /> : null}
              {scan.payer ? <ScanStat label="Paid by" value={scan.payer} /> : null}
            </dl>
          </div>
        ) : (
          <Alert tone="danger" className="mt-[0.5rem]">
            {scan.error}
          </Alert>
        )}
      </div>
    </div>
  )
}

/** One scanned field (label above, value below), so the grid reads as a summary. */
function ScanStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-muted">{label}</dt>
      <dd className="m-0 truncate font-semibold tabular">{value}</dd>
    </div>
  )
}
