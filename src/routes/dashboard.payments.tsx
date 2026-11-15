import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronDown, Loader2, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { Skeleton } from '../components/ui/skeleton'
import { Tabs } from '../components/ui/tabs'
import { errorMessage } from '../lib/api/client'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import { formatDate, formatDateTime, money } from '../lib/format'
import { useAppointmentPaymentSummary, usePayments, usePaymentsDashboard } from '../lib/payments/api'
import type { Payment, PaymentListFilters } from '../lib/payments/api'

export const Route = createFileRoute('/dashboard/payments')({
  component: PaymentsPage,
})

const PAGE_SIZE = 25

type TypeTab = 'all' | 'booking_fee' | 'full_payment' | 'balance_payment'

const TYPE_TABS: readonly { value: TypeTab; label: string }[] = [
  { value: 'all', label: 'All payments' },
  { value: 'booking_fee', label: 'Booking fees' },
  { value: 'full_payment', label: 'Full payments' },
  { value: 'balance_payment', label: 'Balance payments' },
]

const TYPE_LABELS: Record<string, string> = {
  booking_fee: 'Booking fee',
  full_payment: 'Full payment',
  balance_payment: 'Balance payment',
}

const STATUS_LABELS: Record<string, string> = {
  created: 'Awaiting payment',
  awaiting_customer: 'Awaiting payment',
  processing: 'Processing',
  submitted: 'Awaiting verification',
  under_review: 'Awaiting verification',
  flagged: 'Flagged for review',
  verified: 'Verified',
  success: 'Paid',
  rejected: 'Rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
  failed: 'Failed',
  reversed: 'Reversed',
  refunded: 'Refunded',
}

const STATUS_TONES: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  created: 'neutral',
  awaiting_customer: 'neutral',
  processing: 'info',
  submitted: 'warning',
  under_review: 'info',
  flagged: 'warning',
  verified: 'success',
  success: 'success',
  rejected: 'danger',
  expired: 'neutral',
  cancelled: 'neutral',
  failed: 'danger',
  reversed: 'warning',
  refunded: 'info',
}

/** The statuses a person actually looks for, as single-value filters the API can honour. */
const STATUS_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Any status' },
  { value: 'awaiting_customer', label: 'Awaiting payment' },
  { value: 'submitted', label: 'Awaiting verification' },
  { value: 'under_review', label: 'Under review' },
  { value: 'verified', label: 'Verified' },
  { value: 'success', label: 'Paid (provider-confirmed)' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
]

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  return STATUS_TONES[status] ?? 'neutral'
}

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

/** A payment the business is still waiting on a person to decide. */
function isAwaitingDecision(status: string): boolean {
  return status === 'submitted' || status === 'under_review' || status === 'flagged'
}

/**
 * Payments — appointment payment management.
 *
 * Finance answers "what money has the business received and spent?". Payments answers a
 * different operational question: "what is happening with payments on appointments?" — who
 * owes what, which booking fees and balances have been collected, and which claims are still
 * waiting on a decision.
 *
 * The two views are deliberately not copies of one another. A verified payment shows up here as
 * an appointment obligation that has been met, and in Finance as exactly one recognised
 * transaction: the same money, one financial record. Verification itself belongs to
 * Finance → Reconciliation, and this page links straight to it rather than offering a second
 * door onto a money decision.
 */
function PaymentsPage() {
  const { hasModule } = useDashboardContext()
  const [type, setType] = useState<TypeTab>('all')
  const [status, setStatus] = useState('')
  const [dates, setDates] = useState({ from: '', to: '' })
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  const enabled = hasModule(MODULE.payments)

  const filters: PaymentListFilters = useMemo(
    () => ({
      type: type === 'all' ? undefined : type,
      status: status || undefined,
      from: dates.from ? new Date(dates.from).toISOString() : undefined,
      to: dates.to ? new Date(`${dates.to}T23:59:59.999`).toISOString() : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [type, status, dates, page],
  )

  const dashboard = usePaymentsDashboard(enabled)
  const payments = usePayments(filters, enabled)

  if (!enabled) {
    return <ModulePlaceholder navKey="payments" />
  }

  const data = payments.data
  const overview = dashboard.data
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / (data.pageSize || PAGE_SIZE))) : 1


  return (
    <>
      <PageHeader
        title="Payments"
        description="What customers owe against appointments, and where each payment has got to. The books themselves live under Finance."
        actions={
          <Link to="/dashboard/finances/reconciliation" className="btn btn-sm">
            <Wallet className="size-4" aria-hidden="true" />
            Verify payment claims
          </Link>
        }
      />

      {payments.isError ? (
        <Alert tone="danger" title="The payments could not be loaded" className="mb-4">
          <p>{errorMessage(payments.error)}</p>
        </Alert>
      ) : null}

      {dashboard.isPending ? (
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-[0.7rem]"
          aria-busy="true"
          aria-label="Loading payment summary"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[4.6rem] rounded-card" />
          ))}
        </div>
      ) : overview ? (
        <MetricGrid
          items={[
            {
              value: money(overview.todayCollected),
              label: `Collected today (${overview.todayCount})`,
            },
            {
              value: money(overview.monthCollected),
              label: `Collected this month (${overview.monthCount})`,
            },
            {
              value: money(overview.awaitingVerificationAmount),
              label: `${overview.awaitingVerificationCount} awaiting verification`,
            },
            {
              value: `${overview.failedCount}`,
              label: 'Failed or expired',
            },
          ]}
        />
      ) : null}

      {overview && overview.awaitingVerificationCount > 0 ? (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-[0.6rem] p-[0.9rem]">
          <div className="min-w-0">
            <h2 className="text-label font-semibold">
              {overview.awaitingVerificationCount} claim
              {overview.awaitingVerificationCount === 1 ? '' : 's'} waiting on you
            </h2>
            <p className="m-0 text-caption text-muted">
              {money(overview.awaitingVerificationAmount)} of customer-submitted M-PESA messages have
              not been checked yet. They are not counted as money received until you verify them.
            </p>
          </div>
          <Link to="/dashboard/finances/reconciliation" className="btn btn-sm btn-primary">
            Open Reconciliation
          </Link>
        </Card>
      ) : null}

      <div className="mt-4">
        <Tabs
          label="Filter payments by what they are for"
          items={TYPE_TABS.map((tab) => ({ value: tab.value, label: tab.label }))}
          value={type}
          onValueChange={(value) => {
            setPage(1)
            setType(value)
          }}
        />
      </div>

      <Card className="mt-[0.8rem] p-[0.9rem]">
        <div className="flex flex-wrap items-end gap-[0.6rem]">
          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            Status
            <select
              className="select h-control-sm min-h-0 text-meta"
              value={status}
              onChange={(event) => {
                setPage(1)
                setStatus(event.target.value)
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'any'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            From
            <input
              type="date"
              className="input h-control-sm min-h-0 text-meta"
              value={dates.from}
              onChange={(event) => {
                setPage(1)
                setDates((current) => ({ ...current, from: event.target.value }))
              }}
            />
          </label>

          <label className="flex flex-col gap-[0.2rem] text-caption text-muted">
            To
            <input
              type="date"
              className="input h-control-sm min-h-0 text-meta"
              value={dates.to}
              onChange={(event) => {
                setPage(1)
                setDates((current) => ({ ...current, to: event.target.value }))
              }}
            />
          </label>

          {status || dates.from || dates.to || type !== 'all' ? (
            <Button
              size="sm"
              onClick={() => {
                setPage(1)
                setType('all')
                setStatus('')
                setDates({ from: '', to: '' })
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        {payments.isLoading && !data ? (
          <div className="grid gap-[0.5rem] p-[0.8rem]" aria-busy="true">
            <Skeleton className="h-[2.6rem]" />
            <Skeleton className="h-[2.6rem]" />
            <Skeleton className="h-[2.6rem]" />
          </div>
        ) : null}

        {data && data.items.length === 0 ? (
          <EmptyState
            title="No payments in this view"
            description="Appointment booking fees, full payments and balances appear here as soon as they are started."
          />
        ) : null}

        {data && data.items.length > 0 ? (
          <ul className="divide-y divide-line">
            {data.items.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                expanded={expanded === payment.id}
                onToggle={() => setExpanded((current) => (current === payment.id ? null : payment.id))}
              />
            ))}
          </ul>
        ) : null}

        {data && data.totalCount > PAGE_SIZE ? (
          <div className="border-t border-line p-[0.6rem]">
            <PaginationBar page={page} pageCount={pageCount} onPageChange={setPage} />
          </div>
        ) : null}
      </Card>

      <p className="mt-4 text-caption text-muted">
        Payments is the operational view: obligations, claims and balances attached to appointments.
        Recognition is Finance's job — a verified payment becomes exactly one transaction there, and
        only that transaction reaches the Cashbook. Nothing shown on this page is added to financial
        totals.
      </p>
    </>
  )
}
/**
 * One payment in the register.
 *
 * The row is a link into the two places the same payment legitimately lives: the appointment it
 * belongs to, and — when it is a customer claim or a recognised receipt — the Finance screen that
 * owns the money decision. Expanding it loads the appointment's whole payment picture (service
 * total, booking fee, paid so far and what is still owed), which is the question an owner is
 * actually asking when they open a row.
 */
function PaymentRow({
  payment,
  expanded,
  onToggle,
}: {
  payment: Payment
  expanded: boolean
  onToggle: () => void
}) {
  const summary = useAppointmentPaymentSummary(
    payment.appointmentId ?? '',
    expanded && Boolean(payment.appointmentId),
  )

  return (
    <li className="px-[0.8rem] py-[0.65rem]">
      <div className="flex flex-wrap items-start justify-between gap-[0.5rem]">
        <div className="min-w-0">
          <p className="truncate text-meta font-medium">
            {payment.customerName ?? 'Customer'} · {typeLabel(payment.type)}
          </p>
          <p className="text-caption text-muted">
            {formatDate(payment.createdAt)} · {payment.method} · {payment.reference}
            {payment.parsedTransactionCode ? ` · ${payment.parsedTransactionCode}` : ''}
          </p>
          {payment.rejectedAt && payment.rejectionReason ? (
            <p className="text-caption text-danger-ink">Rejected: {payment.rejectionReason}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-[0.5rem]">
          <Badge tone={statusTone(payment.status)}>{statusLabel(payment.status)}</Badge>
          <span className="tabular text-meta font-semibold">{money(payment.amount)}</span>

          {payment.appointmentId ? (
            <Link
              to="/dashboard/appointments/$appointmentId"
              params={{ appointmentId: payment.appointmentId }}
              className="link text-meta"
            >
              Appointment
            </Link>
          ) : null}

          {isAwaitingDecision(payment.status) ? (
            <Link to="/dashboard/finances/reconciliation" className="link text-meta">
              Verify in Finance
            </Link>
          ) : payment.status === 'verified' || payment.status === 'success' ? (
            <Link to="/dashboard/finances/transactions" className="link text-meta">
              View in Finance
            </Link>
          ) : null}

          {payment.appointmentId ? (
            <Button size="sm" onClick={onToggle} aria-expanded={expanded}>
              <ChevronDown
                className={expanded ? 'size-3.5 rotate-180' : 'size-3.5'}
                aria-hidden="true"
              />
              Balance
            </Button>
          ) : null}
        </div>
      </div>

      {expanded && payment.appointmentId ? (
        <div className="mt-[0.5rem] rounded-md bg-sunken p-[0.6rem]">
          {summary.isLoading ? (
            <p className="inline-flex items-center gap-[0.4rem] text-caption text-muted">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Loading this
              appointment’s payments…
            </p>
          ) : null}

          {summary.data ? (
            <>
              <dl className="grid gap-[0.4rem] text-caption sm:grid-cols-4">
                <div>
                  <dt className="text-muted">Services</dt>
                  <dd className="tabular font-medium">{money(summary.data.serviceTotal)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Booking fee</dt>
                  <dd className="tabular font-medium">{money(summary.data.bookingFee)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Paid so far</dt>
                  <dd className="tabular font-medium">{money(summary.data.amountPaid)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Balance</dt>
                  <dd className="tabular font-medium">{money(summary.data.balance)}</dd>
                </div>
              </dl>

              <p className="mt-[0.4rem] text-caption text-muted">
                {summary.data.paymentStatus === 'paid'
                  ? 'Fully paid.'
                  : summary.data.paymentStatus === 'partially_paid'
                    ? 'Partially paid.'
                    : 'Nothing collected yet.'}{' '}
                Only verified payments count towards “Paid so far”.
              </p>

              {summary.data.payments.length > 0 ? (
                <ul className="mt-[0.4rem] flex list-none flex-col gap-[0.25rem] p-0 text-caption">
                  {summary.data.payments.map((row) => (
                    <li key={row.id}>
                      {typeLabel(row.type)} · {money(row.amount)} · {statusLabel(row.status)}
                      {row.completedAt ? ` · settled ${formatDateTime(row.completedAt)}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

