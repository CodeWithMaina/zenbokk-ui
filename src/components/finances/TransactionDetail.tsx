import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../lib/api/client'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import {
  useFinancialAuditTrail,
  useFinancialTransaction,
  useFinancialTransactions,
} from '../../lib/finances/api'
import {
  paymentMethodLabel,
  reconciliationLabel,
  reconciliationTone,
  sourceLabel,
  transactionTypeLabel,
  verificationLabel,
  verificationTone,
} from '../../lib/finances/labels'
import { formatDate, formatDateTime, money } from '../../lib/format'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { PageHeader } from '../ui/page-header'
import { Skeleton } from '../ui/skeleton'
import { RecordExpenseDialog } from './RecordExpenseDialog'
import { RefundDialog } from './RefundDialog'
import { VoidExpenseDialog } from './VoidExpenseDialog'

export type TransactionDetailProps = {
  /** The ledger row id — the same row whether it is read as a transaction or as an expense. */
  transactionId: string
  /**
   * `transaction` is the general ledger view; `expense` is the same record read as money the
   * business spent, with the expense actions (edit, void) and the expense vocabulary.
   */
  mode: 'transaction' | 'expense'
}

/**
 * One financial record, in full.
 *
 * The ledger row is the single source of truth for both routes, so an expense opened from the
 * Expenses register and the same row opened from the Cashbook are the same page with a different
 * heading — there is no second financial record behind a second URL.
 *
 * Every relationship shown here is one that genuinely exists on the row. Services and the assigned
 * professional are properties of the APPOINTMENT, not of the ledger row, so they are reached by
 * following the appointment rather than being invented on this page.
 */
export function TransactionDetail({ transactionId, mode }: TransactionDetailProps) {
  const navigate = useNavigate()
  const { hasPermission } = useDashboardContext()
  const [refundOpen, setRefundOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)

  const record = useFinancialTransaction(transactionId)
  const audit = useFinancialAuditTrail(transactionId)
  // Refunds that point back at this receipt. A refund's own row links to the original, so the
  // check below is a comparison on the row — not a second source of truth.
  const refundCandidates = useFinancialTransactions(
    { search: record.data?.reference ?? '', pageSize: 25 },
    Boolean(record.data?.reference),
  )

  const entry = record.data
  const isExpense = mode === 'expense'
  const incoming = entry?.direction === 'incoming'
  const canRefund = hasPermission('finances.refund')
  const canManageExpenses = hasPermission('finances.manage_expenses')
  const refundable = entry?.refundableAmount ?? 0
  const linkedRefunds = (refundCandidates.data?.items ?? []).filter(
    (row) => row.type === 'refund' && row.refundOfTransactionId === entry?.id,
  )

  if (record.isError) {
    return (
      <>
        <PageHeader title={isExpense ? 'Expense' : 'Transaction'} />
        <Card className="p-[0.9rem]">
          <p className="m-0 text-meta text-danger-ink">{errorMessage(record.error)}</p>
          <p className="mt-[0.3rem] text-caption text-muted">
            It may have been removed, or belong to another business.
          </p>
          <div className="mt-[0.7rem] flex flex-wrap gap-[0.5rem]">
            <Button size="sm" onClick={() => void record.refetch()} disabled={record.isFetching}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
            <Link
              to={isExpense ? '/dashboard/finances/expenses' : '/dashboard/finances/transactions'}
              className="btn btn-sm"
            >
              Back to the register
            </Link>
          </div>
        </Card>
      </>
    )
  }

  if (!entry) {
    return (
      <>
        <PageHeader title={isExpense ? 'Expense' : 'Transaction'} />
        <Card className="grid gap-[0.6rem] p-[0.9rem]" aria-busy="true">
          <Skeleton className="h-[2rem]" />
          <Skeleton className="h-[8rem]" />
          <Skeleton className="h-[6rem]" />
        </Card>
      </>
    )
  }


  return (
    <>
      <PageHeader
        title={isExpense ? 'Expense' : 'Transaction'}
        description={`${entry.reference} · ${incoming ? 'Money in' : 'Money out'}`}
        actions={
          <div className="flex flex-wrap gap-[0.5rem]">
            {!isExpense && incoming && refundable > 0 && canRefund ? (
              <Button variant="primary" onClick={() => setRefundOpen(true)}>
                Record a refund
              </Button>
            ) : null}
            {isExpense && canManageExpenses && !entry.isVoided ? (
              <>
                <Button onClick={() => setEditOpen(true)}>Edit</Button>
                <Button variant="danger" onClick={() => setVoidOpen(true)}>
                  Void
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-[0.9rem]">
        <Card className="p-[0.9rem]">
          <div className="flex flex-wrap items-center gap-[0.5rem]">
            <Badge tone={incoming ? 'success' : 'warning'}>{incoming ? 'Money in' : 'Money out'}</Badge>
            <Badge tone={verificationTone(entry.verificationStatus)}>
              {verificationLabel(entry.verificationStatus)}
            </Badge>
            <Badge tone={reconciliationTone(entry.reconciliationStatus)}>
              {reconciliationLabel(entry.reconciliationStatus)}
            </Badge>
            {entry.isVoided ? <Badge tone="neutral">Voided</Badge> : null}
          </div>

          <p className={`mt-[0.6rem] m-0 tabular text-metric font-bold ${incoming ? '' : 'text-danger-ink'}`}>
            {incoming ? '+' : '−'}
            {money(entry.amount, entry.currency)}
          </p>

          <dl className="mt-[0.8rem] grid gap-[0.6rem] text-meta sm:grid-cols-3">
            <Fact label="Reference" value={entry.reference} mono />
            <Fact label="External reference" value={entry.externalReference ?? '—'} mono />
            <Fact label="Type" value={transactionTypeLabel(entry.type)} />
            <Fact label="Category" value={entry.categoryLabel ?? '—'} />
            <Fact label="Source" value={sourceLabel(entry.source)} />
            <Fact label="Payment method" value={paymentMethodLabel(entry.paymentMethod)} />
            <Fact label="Transaction date" value={formatDate(entry.transactionDate)} />
            <Fact label="Recorded" value={formatDateTime(entry.recordedAt)} />
            <Fact label="Recorded by" value={entry.createdByName ?? 'Punched'} />
            {entry.description ? <Fact label="Description" value={entry.description} /> : null}
            {entry.voidedAt ? <Fact label="Voided" value={formatDateTime(entry.voidedAt)} /> : null}
            {entry.voidReason ? <Fact label="Void reason" value={entry.voidReason} /> : null}
            {entry.rejectionReason ? <Fact label="Rejection reason" value={entry.rejectionReason} /> : null}
            <Fact label="Still refundable" value={money(refundable, entry.currency)} />
          </dl>
        </Card>

        <Card className="p-[0.9rem]">
          <h2 className="m-0 text-label font-semibold">Where this came from</h2>
          <ul className="mt-[0.6rem] flex list-none flex-col gap-[0.35rem] p-0 text-meta">
            {entry.appointmentId ? (
              <li>
                <Link
                  to="/dashboard/appointments/$appointmentId"
                  params={{ appointmentId: entry.appointmentId }}
                  className="link"
                >
                  Open the appointment
                </Link>
                <span className="text-muted"> — its services, professional and receipt live there.</span>
              </li>
            ) : (
              <li className="text-muted">Not attached to an appointment.</li>
            )}

            {entry.customerId ? (
              <li>
                <Link
                  to="/dashboard/customers/$clientId"
                  params={{ clientId: entry.customerId }}
                  className="link"
                >
                  Open the customer
                </Link>
                {entry.customerName ? <span className="text-muted"> — {entry.customerName}</span> : null}
              </li>
            ) : (
              <li className="text-muted">
                {entry.customerName ? `Customer: ${entry.customerName}` : 'No customer attached.'}
              </li>
            )}

            {entry.sourcePaymentId ? (
              <li>
                <Link
                  to="/dashboard/finances/reconciliation/$claimId"
                  params={{ claimId: entry.sourcePaymentId }}
                  className="link"
                >
                  Open the payment claim
                </Link>
                <span className="text-muted"> — the pasted M-Pesa message this receipt came from.</span>
              </li>
            ) : null}

            {entry.refundOfTransactionId ? (
              <li>
                <Link
                  to="/dashboard/finances/transactions/$transactionId"
                  params={{ transactionId: entry.refundOfTransactionId }}
                  className="link"
                >
                  Open the original receipt
                </Link>
                {entry.refundReason ? <span className="text-muted"> — {entry.refundReason}</span> : null}
              </li>
            ) : null}
          </ul>
        </Card>

        {linkedRefunds.length > 0 ? (
          <Card className="p-[0.9rem]">
            <h2 className="m-0 text-label font-semibold">Refunds against this receipt</h2>
            <ul className="mt-[0.6rem] flex list-none flex-col gap-[0.3rem] p-0 text-meta">
              {linkedRefunds.map((refund) => (
                <li key={refund.id} className="flex flex-wrap items-center gap-[0.4rem]">
                  <Badge tone={refund.verificationStatus === 'verified' ? 'success' : 'warning'}>
                    {refund.verificationStatus === 'verified' ? 'Refunded' : 'Refund requested'}
                  </Badge>
                  <span className="tabular font-semibold">{money(refund.amount, refund.currency)}</span>
                  <span className="text-muted">{formatDate(refund.transactionDate)}</span>
                  <Link
                    to="/dashboard/finances/transactions/$transactionId"
                    params={{ transactionId: refund.id }}
                    className="link"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-[0.5rem] m-0 text-caption text-muted">
              The original receipt is never rewritten — the refund is its own movement, which is why
              both sides stay provable.
            </p>
          </Card>
        ) : null}

        <Card className="p-[0.9rem]">
          <h2 className="m-0 text-label font-semibold">Audit history</h2>
          {audit.isFetching && !audit.data ? (
            <p className="mt-[0.4rem] inline-flex items-center gap-[0.4rem] text-meta text-muted">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Loading…
            </p>
          ) : null}
          {audit.data && audit.data.length === 0 ? (
            <p className="mt-[0.4rem] text-meta text-muted">No changes recorded.</p>
          ) : null}
          {audit.data && audit.data.length > 0 ? (
            <ul className="mt-[0.4rem] flex list-none flex-col gap-[0.3rem] p-0 text-meta">
              {audit.data.map((log) => (
                <li key={log.id}>
                  <b className="font-medium">{log.action}</b>
                  {log.actorName ? ` by ${log.actorName}` : ''} · {formatDateTime(log.createdAt)}
                  {log.note ? ` — ${log.note}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>

      <RecordExpenseDialog
        open={editOpen}
        expense={{
          id: entry.id,
          amount: entry.amount,
          category: entry.category,
          paymentMethod: entry.paymentMethod,
          description: entry.description,
          externalReference: entry.externalReference,
          reconciled: entry.reconciledAt != null,
        }}
        onClose={() => {
          setEditOpen(false)
          void record.refetch()
        }}
      />

      <VoidExpenseDialog
        expense={voidOpen ? entry : null}
        onClose={() => {
          setVoidOpen(false)
          navigate({ to: '/dashboard/finances/expenses' })
        }}
      />

      <RefundDialog
        target={refundOpen ? entry : null}
        onClose={() => {
          setRefundOpen(false)
          void record.refetch()
        }}
      />
    </>
  )
}

/** One labelled fact. `mono` for references, which are read character by character. */
function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-subtle">{label}</dt>
      <dd className={`m-0 font-medium break-words ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}
