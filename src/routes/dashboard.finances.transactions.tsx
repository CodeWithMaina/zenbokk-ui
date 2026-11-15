import { createFileRoute } from '@tanstack/react-router'
import { BadgeCheck, Ban, ChevronDown, Loader2, Plus, Scale } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AddIncomeDialog } from '../components/finances/AddIncomeDialog'
import { ReconciliationBadge, VerificationBadge } from '../components/finances/badges'
import { RefundDialog } from '../components/finances/RefundDialog'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import { PaginationBar } from '../components/ui/pagination-bar'
import { SearchField } from '../components/ui/search-field'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage, isModuleUnavailable } from '../lib/api/client'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'
import {
  useFinancialAuditTrail,
  useFinancialTransactions,
  useTransactionDecisions,
  type FinancialFilters,
  type FinancialTransaction,
} from '../lib/finances/api'
import {
  PAYMENT_METHOD_OPTIONS,
  RECORDABLE_SOURCES,
  paymentMethodLabel,
  reconciliationLabel,
  sourceLabel,
  transactionTypeLabel,
} from '../lib/finances/labels'
import { formatDate, formatDateTime, money } from '../lib/format'

export const Route = createFileRoute('/dashboard/finances/transactions')({
  component: TransactionsPage,
})

const PAGE_SIZE = 25

type Filters = {
  search: string
  type: string
  source: string
  paymentMethod: string
  verificationStatus: string
  reconciliationStatus: string
  minAmount: string
  maxAmount: string
  from: string
  to: string
}

const EMPTY_FILTERS: Filters = {
  search: '',
  type: '',
  source: '',
  paymentMethod: '',
  // Recognised receipts by default: this page answers "what money has the business received?",
  // and a claim nobody has verified is not money received yet. A claim is still reachable — pick
  // a pending status in the filter, or verify it in Reconciliation, which is where a money
  // decision belongs.
  verificationStatus: 'verified',
  reconciliationStatus: '',
  minAmount: '',
  maxAmount: '',
  from: '',
  to: '',
}

/**
 * The transactions page: the whole ledger, filtered server-side.
 *
 * Two things it deliberately will NOT do: edit a settled amount, or let a filter change what the
 * totals underneath mean. Filtering and totalling read the same rows on the server, so the sums always
 * describe exactly the list the owner is looking at.
 */
function TransactionsPage() {
  const { hasModule, hasPermission } = useDashboardContext()
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState<FinancialTransaction | null>(null)

  const enabled = hasModule(MODULE.financials)
  const query: FinancialFilters = useMemo(
    () => ({
      search: filters.search || undefined,
      type: filters.type || undefined,
      source: filters.source || undefined,
      paymentMethod: filters.paymentMethod || undefined,
      verificationStatus: filters.verificationStatus || undefined,
      reconciliationStatus: filters.reconciliationStatus || undefined,
      minAmount: filters.minAmount ? Number(filters.minAmount) : undefined,
      maxAmount: filters.maxAmount ? Number(filters.maxAmount) : undefined,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(`${filters.to}T23:59:59.999`).toISOString() : undefined,
      page,
      pageSize: PAGE_SIZE,
      sort: 'date',
      direction: 'desc',
    }),
    [filters, page],
  )

  const transactions = useFinancialTransactions(query, enabled)
  const decisions = useTransactionDecisions()

  if (!enabled) {
    return <ModulePlaceholder navKey="finances-transactions" />
  }

  const data = transactions.data
  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / (data.pageSize || PAGE_SIZE))) : 1
  const canRecord = hasPermission('finances.record_income')
  const canVerify = hasPermission('finances.verify')
  const canRefund = hasPermission('finances.refund')

  const decide = async (action: 'verify' | 'reject' | 'reconcile', entry: FinancialTransaction, reason?: string) => {
    try {
      if (action === 'verify') {
        await decisions.verify.mutateAsync({ id: entry.id })
        toast.success(`${entry.reference} verified.`)
      } else if (action === 'reject') {
        await decisions.reject.mutateAsync({ id: entry.id, reason: reason ?? 'Not recognised' })
        toast.success(`${entry.reference} rejected.`)
      } else {
        await decisions.reconcile.mutateAsync({ id: entry.id, status: 'matched' })
        toast.success(`${entry.reference} marked as reconciled.`)
      }
    } catch (failure) {
      toast.error(errorMessage(failure, 'The decision could not be saved.'))
    }
  }
  return (
    <>
      <PageHeader
        title="Transactions"
        description="Money recognised as received — verified M-Pesa claims, owner-recorded income, refunds. Claims still waiting on a decision live in Reconciliation."
        actions={
          canRecord ? (
            <Button variant="primary" onClick={() => setIncomeOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Record income
            </Button>
          ) : undefined
        }
      />

      <Card className="p-[0.8rem]">
        <div className="grid gap-[0.6rem] lg:grid-cols-[2fr_repeat(3,1fr)]">
          <SearchField
            label="Search transactions"
            value={filters.search}
            placeholder="Reference, M-Pesa code, customer or description"
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, search: event.target.value }))
            }}
          />
          <select
            className="select"
            aria-label="Transaction type"
            value={filters.type}
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, type: event.target.value }))
            }}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="refund">Refund</option>
            <option value="adjustment">Adjustment</option>
          </select>
          <select
            className="select"
            aria-label="Verification status"
            value={filters.verificationStatus}
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, verificationStatus: event.target.value }))
            }}
          >
            <option value="">Any verification</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            className="select"
            aria-label="Reconciliation status"
            value={filters.reconciliationStatus}
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, reconciliationStatus: event.target.value }))
            }}
          >
            <option value="">Any reconciliation</option>
            <option value="unreconciled">Not reconciled</option>
            <option value="matched">Matched</option>
            <option value="discrepancy">Discrepancy</option>
            <option value="excluded">Excluded</option>
          </select>
        </div>

        <div className="mt-[0.6rem] grid gap-[0.6rem] lg:grid-cols-6">
          <input
            className="input"
            type="number"
            min="0"
            inputMode="decimal"
            aria-label="Minimum amount"
            placeholder="Min amount (KES)"
            value={filters.minAmount}
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, minAmount: event.target.value }))
            }}
          />
          <input
            className="input"
            type="number"
            min="0"
            inputMode="decimal"
            aria-label="Maximum amount"
            placeholder="Max amount (KES)"
            value={filters.maxAmount}
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, maxAmount: event.target.value }))
            }}
          />
          <select
            className="select"
            aria-label="Income source"
            value={filters.source}
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, source: event.target.value }))
            }}
          >
            <option value="">Any source</option>
            <option value="punched_booking">Punched appointment</option>
            {RECORDABLE_SOURCES.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="select"
            aria-label="Payment method"
            value={filters.paymentMethod}
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, paymentMethod: event.target.value }))
            }}
          >
            <option value="">Any payment method</option>
            {PAYMENT_METHOD_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input"
            aria-label="From date"
            value={filters.from}
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, from: event.target.value }))
            }}
          />
          <input
            type="date"
            className="input"
            aria-label="To date"
            value={filters.to}
            onChange={(event) => {
              setPage(1)
              setFilters((current) => ({ ...current, to: event.target.value }))
            }}
          />
        </div>

        <div className="mt-[0.6rem] flex flex-wrap items-center justify-between gap-[0.6rem]">
          <p className="text-meta text-muted">
            {data ? `${data.totalCount} transaction(s)` : 'Loading…'} · verified income{' '}
            <b className="font-semibold text-fg">{money(data?.verifiedIncomeTotal ?? 0)}</b> · expenses{' '}
            <b className="font-semibold text-fg">{money(data?.expenseTotal ?? 0)}</b> · refunds{' '}
            <b className="font-semibold text-fg">{money(data?.refundTotal ?? 0)}</b>
          </p>
          <Button size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear filters
          </Button>
        </div>
      </Card>

      {transactions.isError ? (
        <div className="mt-4">
          <Alert tone={isModuleUnavailable(transactions.error) ? 'warning' : 'danger'}>
            {isModuleUnavailable(transactions.error)
              ? 'Finances is not part of your current plan.'
              : errorMessage(transactions.error, 'The transactions could not be loaded.')}
          </Alert>
        </div>
      ) : null}

      <div className="mt-4">
        {transactions.isLoading && !data ? (
          <div className="grid gap-[0.5rem]">
            <Skeleton className="h-[3rem]" />
            <Skeleton className="h-[3rem]" />
            <Skeleton className="h-[3rem]" />
          </div>
        ) : null}

        {data && data.items.length === 0 ? (
          <Card>
            <EmptyState
              title="No transactions match these filters"
              description="Record income from outside Punched, or clear the filters to see the whole ledger."
              action={
                <Button onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>
              }
            />
          </Card>
        ) : null}

        {data && data.items.length > 0 ? (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {data.items.map((entry) => (
                <TransactionRow
                  key={entry.id}
                  entry={entry}
                  expanded={expanded === entry.id}
                  onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  canVerify={canVerify}
                  canRefund={canRefund}
                  busy={
                    decisions.verify.isPending || decisions.reject.isPending || decisions.reconcile.isPending
                  }
                  onVerify={() => void decide('verify', entry)}
                  onReject={() => void decide('reject', entry)}
                  onReconcile={() => void decide('reconcile', entry)}
                  onRefund={() => setRefundTarget(entry)}
                />
              ))}
            </ul>
          </Card>
        ) : null}

        {data && data.totalCount > PAGE_SIZE ? (
          <PaginationBar
            className="mt-4"
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <AddIncomeDialog open={incomeOpen} onClose={() => setIncomeOpen(false)} />
      <RefundDialog target={refundTarget} onClose={() => setRefundTarget(null)} />
    </>
  )
}

/**
 * One ledger row. Collapsed it shows what the owner scans for (what, when, how much, and the two
 * states); expanded it shows the reference trail, the recorded evidence and the decisions available.
 */
function TransactionRow({
  entry,
  expanded,
  onToggle,
  canVerify,
  canRefund,
  busy,
  onVerify,
  onReject,
  onReconcile,
  onRefund,
}: {
  entry: FinancialTransaction
  expanded: boolean
  onToggle: () => void
  canVerify: boolean
  canRefund: boolean
  busy: boolean
  onVerify: () => void
  onReject: () => void
  onReconcile: () => void
  onRefund: () => void
}) {
  const audit = useFinancialAuditTrail(expanded ? entry.id : null)
  const isIncome = entry.type === 'income'
  const canVerifyNow = canVerify && isIncome && entry.verificationStatus === 'pending' && !entry.isVoided
  const canRefundNow = canRefund && entry.refundableAmount > 0

  return (
    <li className="px-[0.8rem] py-[0.6rem]">
      <div className="flex flex-wrap items-start justify-between gap-[0.6rem]">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <span className="flex items-center gap-[0.35rem]">
            <ChevronDown
              className={expanded ? 'size-4 rotate-180 transition-transform' : 'size-4 transition-transform'}
              aria-hidden="true"
            />
            <span className="truncate text-meta font-semibold">{entry.reference}</span>
            {entry.isVoided ? <span className="text-caption text-muted">(voided)</span> : null}
          </span>
          <span className="mt-[0.15rem] block truncate text-meta text-muted">
            {formatDate(entry.transactionDate)} · {transactionTypeLabel(entry.type)} ·{' '}
            {sourceLabel(entry.source)} · {paymentMethodLabel(entry.paymentMethod)}
            {entry.customerName ? ` · ${entry.customerName}` : ''}
          </span>
          <span className="mt-[0.15rem] block truncate text-caption text-muted">
            {entry.description ?? entry.categoryLabel ?? '—'}
            {entry.externalReference ? ` · ${entry.externalReference}` : ''}
          </span>
        </button>

        <div className="flex flex-col items-end gap-[0.3rem]">
          <span
            className={
              entry.signedAmount < 0 ? 'tabular text-label font-semibold text-danger-ink' : 'tabular text-label font-semibold'
            }
          >
            {entry.signedAmount < 0 ? '-' : '+'}
            {money(Math.abs(entry.signedAmount))}
          </span>
          <span className="flex flex-wrap items-center justify-end gap-[0.3rem]">
            <VerificationBadge status={entry.verificationStatus} />
            <ReconciliationBadge status={entry.reconciliationStatus} />
          </span>
        </div>
      </div>

      {expanded ? (
        <div className="mt-[0.7rem] rounded-md bg-sunken p-[0.7rem]">
          <dl className="grid gap-[0.4rem] text-meta sm:grid-cols-2">
            <div>
              <dt className="text-muted">Recorded</dt>
              <dd>{formatDateTime(entry.recordedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted">Verified</dt>
              <dd>{entry.verifiedAt ? formatDateTime(entry.verifiedAt) : 'Not yet'}</dd>
            </div>
            <div>
              <dt className="text-muted">Reconciled</dt>
              <dd>
                {reconciliationLabel(entry.reconciliationStatus)}
                {entry.reconciledAt ? ` · ${formatDateTime(entry.reconciledAt)}` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Refundable</dt>
              <dd className="tabular">{money(entry.refundableAmount)}</dd>
            </div>
            {entry.description ? (
              <div className="sm:col-span-2">
                <dt className="text-muted">Description</dt>
                <dd>{entry.description}</dd>
              </div>
            ) : null}
            {entry.rejectionReason ? (
              <div className="sm:col-span-2">
                <dt className="text-muted">Rejection reason</dt>
                <dd>{entry.rejectionReason}</dd>
              </div>
            ) : null}
            {entry.reconciliationNote ? (
              <div className="sm:col-span-2">
                <dt className="text-muted">Reconciliation note</dt>
                <dd>{entry.reconciliationNote}</dd>
              </div>
            ) : null}
            {entry.voidReason ? (
              <div className="sm:col-span-2">
                <dt className="text-muted">Void reason</dt>
                <dd>{entry.voidReason}</dd>
              </div>
            ) : null}
          </dl>

          {entry.isOwnerRecorded && entry.verificationStatus === 'pending' ? (
            <p className="mt-[0.5rem] text-meta text-muted">
              You recorded this yourself, so it counts as income only once you verify it.
            </p>
          ) : null}

          <div className="mt-[0.6rem] flex flex-wrap gap-[0.4rem]">
            {canVerifyNow ? (
              <>
                <Button size="sm" variant="primary" disabled={busy} onClick={onVerify}>
                  <BadgeCheck className="size-4" aria-hidden="true" />
                  Verify
                </Button>
                <Button size="sm" variant="danger" disabled={busy} onClick={onReject}>
                  <Ban className="size-4" aria-hidden="true" />
                  Reject
                </Button>
              </>
            ) : null}
            {canRefundNow ? (
              <Button size="sm" disabled={busy} onClick={onRefund}>
                Record refund
              </Button>
            ) : null}
            {entry.reconciliationStatus === 'unreconciled' && entry.verificationStatus === 'verified' ? (
              <Button size="sm" disabled={busy} onClick={onReconcile}>
                <Scale className="size-4" aria-hidden="true" />
                Mark as reconciled
              </Button>
            ) : null}
            {busy ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden="true" /> : null}
          </div>

          <div className="mt-[0.7rem]">
            <h3 className="text-meta font-semibold">Audit history</h3>
            {audit.isLoading ? <p className="text-meta text-muted">Loading…</p> : null}
            {audit.data && audit.data.length === 0 ? (
              <p className="text-meta text-muted">No changes recorded.</p>
            ) : null}
            {audit.data && audit.data.length > 0 ? (
              <ul className="mt-[0.3rem] flex flex-col gap-[0.3rem] text-meta">
                {audit.data.map((log) => (
                  <li key={log.id}>
                    <b className="font-medium">{log.action}</b>
                    {log.actorName ? ` by ${log.actorName}` : ''} · {formatDateTime(log.createdAt)}
                    {log.note ? ` — ${log.note}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}
