import { createFileRoute, Link } from '@tanstack/react-router'
import { BadgeCheck, Ban, Clock, Loader2, RefreshCw, Settings2, ShieldAlert, Wallet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { EmptyState } from '../components/ui/empty-state'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import { formatDay, money } from '../lib/format'
import {
  usePaymentConfig,
  usePaymentVerificationActions,
  usePaymentVerificationQueue,
} from '../lib/payments/api'
import type { PaymentVerificationItem } from '../lib/payments/api'

export const Route = createFileRoute('/dashboard/payments')({
  component: PaymentVerificationPage,
})

const LENSES = [
  { key: 'awaiting', label: 'Awaiting review' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const

type Lens = (typeof LENSES)[number]['key']

/** How a payment status reads on screen. */
const STATUS_LABELS: Record<string, string> = {
  created: 'Awaiting payment',
  awaiting_customer: 'Awaiting payment',
  submitted: 'Submitted',
  under_review: 'Under review',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

const STATUS_TONES: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  created: 'neutral',
  awaiting_customer: 'neutral',
  submitted: 'warning',
  under_review: 'info',
  verified: 'success',
  rejected: 'danger',
  expired: 'neutral',
  cancelled: 'neutral',
  failed: 'danger',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  return STATUS_TONES[status] ?? 'neutral'
}

/** The reasons the design offers, mapped to what the customer is told. */
const REJECTION_REASONS = [
  'The amount does not match the booking fee',
  'We cannot find that transaction on our statement',
  'That transaction code has already been used',
  'The payment went to a different account',
  'Other',
] as const

/**
 * Payment verification.
 *
 * The business's queue of pasted M-PESA confirmations. The whole screen exists to
 * support one decision, made by a person: did this money actually arrive? So every
 * row shows what the customer claims (the message, verbatim) next to what the system
 * derived from it (the parsed code and amount) and what is actually owed — and the
 * two buttons are the only way a payment can become `verified`.
 *
 * A row never auto-approves. Nothing here can settle a payment on its own.
 */
function PaymentVerificationPage() {
  const [lens, setLens] = useState<Lens>('awaiting')
  const [rejecting, setRejecting] = useState<PaymentVerificationItem | null>(null)

  const queue = usePaymentVerificationQueue({ status: lens, pageSize: 50 })
  const { approve, reject, markUnderReview } = usePaymentVerificationActions()
  // The queue is empty until customers can actually pay, so the screen says why and
  // points at the one screen that fixes it rather than looking broken.
  const config = usePaymentConfig()
  const needsSetup = config.isSuccess && !config.data.hasManualMpesaDetails

  const data = queue.data
  const items = data?.items ?? []

  function approveRow(item: PaymentVerificationItem) {
    approve.mutate(
      { paymentId: item.paymentId },
      {
        onSuccess: () =>
          toast.success(
            `Confirmed ${money(item.submittedAmount ?? item.expectedAmount)} received.`,
          ),
        onError: (error) => toast.error(errorMessage(error, 'Could not confirm that payment.')),
      },
    )
  }

  function confirmReject(reason: string) {
    if (!rejecting) return
    reject.mutate(
      { paymentId: rejecting.paymentId, reason },
      {
        onSuccess: () => {
          toast.success('Payment rejected. The customer can submit a new confirmation.')
          setRejecting(null)
        },
        onError: (error) => toast.error(errorMessage(error, 'Could not reject that payment.')),
      },
    )
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Confirm the M-PESA payments customers say they have made. Nothing is marked paid until you confirm it."
        actions={
          <Button variant="ghost" onClick={() => void queue.refetch()} disabled={queue.isFetching}>
            {queue.isFetching ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            Refresh
          </Button>
        }
      />

      <MetricGrid
        items={[
          { value: data?.awaitingCount ?? 0, label: 'Awaiting review' },
          { value: money(data?.awaitingAmount ?? 0), label: 'Awaiting value' },
          { value: data?.verifiedCount ?? 0, label: 'Verified' },
          { value: data?.rejectedCount ?? 0, label: 'Rejected' },
        ]}
      />

      <div className="mt-4 flex flex-wrap gap-[0.4rem]">
        {LENSES.map((option) => (
          <Button
            key={option.key}
            variant={lens === option.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setLens(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {needsSetup ? (
        <Alert tone="warning" className="mt-4" title="Customers cannot pay by M-PESA yet">
          <div className="mt-[0.4rem]">
            Add the PayBill or Till your customers should send to, and the booking fee you collect
            up front. Until then your booking page offers cash only and nothing lands in this queue.
          </div>
          <Link
            to="/dashboard/settings"
            search={{ section: 'payments' }}
            className="link mt-[0.5rem] inline-flex items-center gap-[0.3rem] font-semibold no-underline"
          >
            <Settings2 className="size-4" aria-hidden="true" />
            Set up M-PESA payments
          </Link>
        </Alert>
      ) : null}

      {queue.isError ? (
        <Alert tone="danger" className="mt-4">
          {errorMessage(queue.error, 'Could not load the payment queue.')}
        </Alert>
      ) : null}

      {queue.isLoading ? (
        <div className="mt-4 flex flex-col gap-[0.7rem]">
          <Skeleton className="h-[7rem] w-full" />
          <Skeleton className="h-[7rem] w-full" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Wallet className="size-5" aria-hidden="true" />}
          title={lens === 'awaiting' ? 'Nothing waiting on you' : 'Nothing here yet'}
          description={
            lens === 'awaiting'
              ? 'When a customer pastes their M-PESA confirmation, it lands here for you to check.'
              : 'Payments you have decided on appear here.'
          }
        />
      ) : (
        <ul className="mt-4 flex list-none flex-col gap-[0.7rem] p-0">
          {items.map((item) => (
            <PaymentRow
              key={item.paymentId}
              item={item}
              busy={
                (approve.isPending && approve.variables?.paymentId === item.paymentId) ||
                (reject.isPending && reject.variables?.paymentId === item.paymentId) ||
                (markUnderReview.isPending && markUnderReview.variables === item.paymentId)
              }
              onApprove={() => approveRow(item)}
              onReject={() => setRejecting(item)}
              onReview={() => markUnderReview.mutate(item.paymentId)}
            />
          ))}
        </ul>
      )}

      <RejectDialog
        item={rejecting}
        pending={reject.isPending}
        onCancel={() => setRejecting(null)}
        onConfirm={confirmReject}
      />
    </div>
  )
}

type PaymentRowProps = {
  item: PaymentVerificationItem
  busy: boolean
  onApprove: () => void
  onReject: () => void
  onReview: () => void
}

/**
 * One submitted payment.
 *
 * The row leads with the two numbers that decide it — what is owed and what the
 * message says was paid — because that comparison is the whole job. The raw SMS is
 * shown verbatim underneath, never paraphrased: the owner is checking a receipt
 * against their own statement, and a summary would hide the detail they need.
 */
function PaymentRow({ item, busy, onApprove, onReject, onReview }: PaymentRowProps) {
  const decidable = item.status === 'submitted' || item.status === 'under_review'

  return (
    <li className="rounded-card border border-line bg-surface p-[0.9rem]">
      <div className="flex flex-wrap items-start justify-between gap-[0.8rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[0.5rem]">
            <b className="text-label">{item.customerName ?? 'Unknown customer'}</b>
            <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
            {item.amountMismatch ? (
              <Badge tone="danger">
                <ShieldAlert className="mr-[0.2rem] size-3.5" aria-hidden="true" />
                Amount mismatch
              </Badge>
            ) : null}
            {item.duplicateOfPaymentId ? (
              <Badge tone="danger">
                <ShieldAlert className="mr-[0.2rem] size-3.5" aria-hidden="true" />
                Code already used
              </Badge>
            ) : null}
          </div>
          <p className="mt-[0.15rem] text-caption text-subtle">
            {item.serviceNames.length > 0 ? item.serviceNames.join(', ') : 'Service not recorded'}
            {item.scheduledAt ? ` · ${formatDay(item.scheduledAt)}` : ''}
            {item.customerPhone ? ` · ${item.customerPhone}` : ''}
          </p>
        </div>

        <div className="text-right">
          <b className="block text-label tabular">{money(item.expectedAmount, item.currency)}</b>
          <span className="text-caption text-subtle">
            Submitted{' '}
            {item.submittedAmount === null ? '—' : money(item.submittedAmount, item.currency)}
          </span>
        </div>
      </div>

      <dl className="mt-[0.7rem] grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-[0.5rem] text-caption">
        <div>
          <dt className="text-subtle">M-PESA code</dt>
          <dd className="font-mono">{item.transactionCode ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-subtle">Paid to</dt>
          <dd>{item.recipient ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-subtle">Reference</dt>
          <dd className="font-mono">{item.reference}</dd>
        </div>
        <div>
          <dt className="text-subtle">Submitted</dt>
          <dd>{item.submittedAt ? formatDay(item.submittedAt) : '—'}</dd>
        </div>
      </dl>

      {item.submittedMessage ? (
        <blockquote className="mt-[0.7rem] rounded-inset border border-line bg-sunken p-[0.7rem] text-caption whitespace-pre-wrap">
          {item.submittedMessage}
        </blockquote>
      ) : null}

      {item.verificationEvents.length > 0 ? (
        <ul className="mt-[0.7rem] flex list-none flex-col gap-[0.25rem] p-0 text-caption text-subtle">
          {item.verificationEvents.map((event) => (
            <li key={event.id} className="flex items-start gap-[0.35rem]">
              <Clock className="mt-[0.15rem] size-3.5 shrink-0" aria-hidden="true" />
              <span>
                <b className="font-medium">{statusLabel(event.kind)}</b>
                {event.actorName ? ` by ${event.actorName}` : ''} · {formatDay(event.createdAt)}
                {event.reason ? ` — ${event.reason}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {decidable ? (
        <div className="mt-[0.8rem] flex flex-wrap items-center gap-[0.5rem]">
          <Button variant="primary" size="sm" onClick={onApprove} disabled={busy}>
            <BadgeCheck className="size-4" aria-hidden="true" />
            Confirm payment
          </Button>
          <Button variant="danger" size="sm" onClick={onReject} disabled={busy}>
            <Ban className="size-4" aria-hidden="true" />
            Reject
          </Button>
          {item.status === 'submitted' ? (
            <Button variant="ghost" size="sm" onClick={onReview} disabled={busy}>
              Mark as being reviewed
            </Button>
          ) : null}
          {busy ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden="true" /> : null}
        </div>
      ) : null}
    </li>
  )
}

type RejectDialogProps = {
  item: PaymentVerificationItem | null
  pending: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}

/**
 * Rejection is a reason, not a button.
 *
 * The reason is mandatory server-side and is shown to the customer, so the dialog
 * offers the common causes and lets the owner add detail. "No" without a why leaves
 * the customer with money paid and no way forward.
 */
function RejectDialog({ item, pending, onCancel, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0])
  const [detail, setDetail] = useState('')

  const resolved =
    reason === 'Other' ? detail.trim() : detail.trim() ? `${reason}: ${detail.trim()}` : reason

  return (
    <ConfirmDialog
      open={Boolean(item)}
      tone="danger"
      icon={<Ban className="size-5" aria-hidden="true" />}
      title="Reject this payment?"
      description={
        item
          ? `The customer will be told why. ${item.customerName ?? 'They'} can pay again and submit a new confirmation.`
          : undefined
      }
      confirmLabel={pending ? 'Rejecting…' : 'Reject payment'}
      onCancel={onCancel}
      onConfirm={() => onConfirm(resolved)}
    >
      <label className="label" htmlFor="reject-reason">
        Reason
      </label>
      <select
        id="reject-reason"
        className="select"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      >
        {REJECTION_REASONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <label className="label mt-[0.6rem]" htmlFor="reject-detail">
        Add detail <span className="text-subtle">(optional)</span>
      </label>
      <textarea
        id="reject-detail"
        className="textarea"
        rows={3}
        value={detail}
        placeholder="Anything else the customer should know."
        onChange={(event) => setDetail(event.target.value)}
      />
    </ConfirmDialog>
  )
}

