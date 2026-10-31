import { useState } from 'react'
import { ChevronDown, Loader2, Wallet } from 'lucide-react'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { errorMessage, ApiError } from '../../lib/api/client'
import { useAppointmentPaymentSummary } from '../../lib/payments/api'
import { cn } from '../../lib/cn'
import { formatDate, money } from '../../lib/format'

export type ClientAppointmentPaymentProps = {
  appointmentId: string
  /** Payments is a paid module; when absent the panel says so instead of failing. */
  enabled: boolean
}

const STATUS_TONE = {
  paid: 'success',
  partially_paid: 'warning',
  unpaid: 'neutral',
} as const

function paymentStatusLabel(status: string): string {
  if (status === 'paid') return 'Paid'
  if (status === 'partially_paid') return 'Partly paid'
  if (status === 'unpaid') return 'Unpaid'
  return status
}

/**
 * Payment information for one appointment, read on demand from
 * `GET /v1/payments/appointment/{id}`. Kept behind a toggle so a page of
 * appointments never turns into a page of payment requests.
 */
export function ClientAppointmentPayment({
  appointmentId,
  enabled,
}: ClientAppointmentPaymentProps) {
  const [open, setOpen] = useState(false)
  const summary = useAppointmentPaymentSummary(appointmentId, open && enabled)

  if (!enabled) return null

  return (
    <div className="mt-[0.6rem]">
      <Button
        size="sm"
        variant="ghost"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="px-0 text-meta"
      >
        <Wallet className="size-3.5" aria-hidden="true" />
        Payment
        <ChevronDown
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </Button>

      {open ? (
        <div className="mt-[0.4rem] rounded-lg border border-line bg-hover p-[0.8rem]">
          {summary.isPending ? (
            <p className="flex items-center gap-[0.4rem] text-meta text-muted">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Loading payment…
            </p>
          ) : null}

          {summary.isError ? (
            <Alert
              tone={summary.error instanceof ApiError && summary.error.isModuleDisabled ? 'info' : 'danger'}
              title={
                summary.error instanceof ApiError && summary.error.isModuleDisabled
                  ? 'Payments isn’t in this plan'
                  : 'Payment could not be loaded'
              }
            >
              {errorMessage(summary.error)}
            </Alert>
          ) : null}

          {summary.data ? (
            <div className="flex flex-col gap-[0.35rem] text-meta">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Status</span>
                <Badge tone={STATUS_TONE[summary.data.paymentStatus as keyof typeof STATUS_TONE] ?? 'neutral'}>
                  {paymentStatusLabel(summary.data.paymentStatus)}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Service total</span>
                <b className="tabular">{money(summary.data.serviceTotal)}</b>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Paid</span>
                <b className="tabular">{money(summary.data.amountPaid)}</b>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Balance</span>
                <b className="tabular">{money(summary.data.balance)}</b>
              </div>

              {summary.data.payments.length > 0 ? (
                <ul className="mt-[0.2rem] list-none border-t border-line p-0">
                  {summary.data.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between gap-3 border-b border-line py-[0.4rem] last:border-b-0"
                    >
                      <span className="min-w-0 text-muted">
                        {payment.method} · {payment.reference}
                        <span className="block text-caption">
                          {formatDate(payment.createdAt)} · {payment.status}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium tabular">
                        {money(payment.amount, payment.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No payment recorded for this appointment.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
