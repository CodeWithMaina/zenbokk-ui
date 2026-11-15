import { Link } from '@tanstack/react-router'
import { Clock, Flag, Inbox, Loader2, RefreshCw, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { cn } from '../../lib/cn'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import {
  useClaimDecisions,
  useFinanceClaim,
  useFinanceClaims,
  type FinanceClaimFilters,
} from '../../lib/finances/claims'
import {
  CLAIM_LENSES,
  claimEventLabel,
  claimIsOpen,
  claimStatusLabel,
  claimStatusTone,
  type ClaimLens,
} from '../../lib/finances/claim-status'
import { formatDateTime, money } from '../../lib/format'
import type { PaymentVerificationItem } from '../../lib/payments/api'
import { Alert } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Drawer } from '../ui/drawer'
import { EmptyState } from '../ui/empty-state'
import { Field, Input } from '../ui/field'
import { MetricGrid } from '../ui/metric-tile'
import { PageHeader } from '../ui/page-header'
import { PaginationBar } from '../ui/pagination-bar'
import { SearchField } from '../ui/search-field'
import { Skeleton } from '../ui/skeleton'
import { Tabs } from '../ui/tabs'
import {
  FlagClaimDialog,
  RejectClaimDialog,
  VerifyClaimDialog,
  type VerifyClaimPayload,
} from './ClaimDialogs'
import { MpesaMessage } from './MpesaMessage'

const PAGE_SIZE = 20

type DialogMode = 'verify' | 'reject' | 'flag' | null

/**
 * The M-PESA reconciliation board.
 *
 * The operational half of Finance: the queue of M-PESA confirmations customers pasted, each
 * shown as the message it is, each waiting on one decision only the owner can make — did this
 * money actually arrive? Nothing here settles a payment by itself; the three actions are
 * requests the server validates, runs in a transaction and audits.
 */
export function ClaimsBoard() {
  const { hasPermission } = useDashboardContext()
  const canDecide = hasPermission('finances.verify')

  const [lens, setLens] = useState<ClaimLens>('awaiting')
  const [search, setSearch] = useState('')
  const [amounts, setAmounts] = useState({ min: '', max: '' })
  const [dates, setDates] = useState({ from: '', to: '', txFrom: '', txTo: '' })
  const [page, setPage] = useState(1)

  const [openClaimId, setOpenClaimId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [dialogTarget, setDialogTarget] = useState<PaymentVerificationItem | null>(null)

  const filters: FinanceClaimFilters = useMemo(
    () => ({
      status: lens,
      search: search || undefined,
      from: dates.from ? new Date(dates.from).toISOString() : undefined,
      to: dates.to ? new Date(`${dates.to}T23:59:59.999`).toISOString() : undefined,
      transactionFrom: dates.txFrom ? new Date(dates.txFrom).toISOString() : undefined,
      transactionTo: dates.txTo ? new Date(`${dates.txTo}T23:59:59.999`).toISOString() : undefined,
      minAmount: amounts.min ? Number(amounts.min) : undefined,
      maxAmount: amounts.max ? Number(amounts.max) : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [lens, search, dates, amounts, page],
  )

  const queue = useFinanceClaims(filters)
  const detail = useFinanceClaim(openClaimId)
  const decisions = useClaimDecisions()

  const data = queue.data
  const counts: Record<ClaimLens, number> = {
    awaiting: data?.awaitingCount ?? 0,
    attention: (data?.flaggedCount ?? 0) + (data?.underReviewCount ?? 0),
    verified: data?.verifiedCount ?? 0,
    rejected: data?.rejectedCount ?? 0,
    all:
      (data?.submittedCount ?? 0) +
      (data?.underReviewCount ?? 0) +
      (data?.flaggedCount ?? 0) +
      (data?.verifiedCount ?? 0) +
      (data?.rejectedCount ?? 0),
  }

  const pageCount = data
    ? Math.max(1, Math.ceil(data.totalCount / (data.pageSize || PAGE_SIZE)))
    : 1
  const hasFilters =
    Boolean(search) || Boolean(amounts.min) || Boolean(amounts.max) || Object.values(dates).some(Boolean)

  const openDialog = (mode: Exclude<DialogMode, null>, claim: PaymentVerificationItem) => {
    setDialogTarget(claim)
    setDialog(mode)
  }

  const closeDialog = () => {
    setDialog(null)
    setDialogTarget(null)
  }

  const verify = async (payload: VerifyClaimPayload) => {
    if (!dialogTarget) return
    try {
      await decisions.verify.mutateAsync({ paymentId: dialogTarget.paymentId, ...payload })
      toast.success('Payment confirmed and recorded in the Cashbook.')
      closeDialog()
    } catch (failure) {
      toast.error(errorMessage(failure, 'The payment could not be confirmed.'))
    }
  }

  const reject = async (reason: string) => {
    if (!dialogTarget) return
    try {
      await decisions.reject.mutateAsync({ paymentId: dialogTarget.paymentId, reason })
      toast.success('Claim rejected. The customer can submit a new confirmation.')
      closeDialog()
    } catch (failure) {
      toast.error(errorMessage(failure, 'The claim could not be rejected.'))
    }
  }

  const flag = async (note: string) => {
    if (!dialogTarget) return
    try {
      await decisions.flag.mutateAsync({ paymentId: dialogTarget.paymentId, note })
      toast.success('Claim flagged for review. It stays in your queue.')
      closeDialog()
    } catch (failure) {
      toast.error(errorMessage(failure, 'The claim could not be flagged.'))
    }
  }

  const clearFlag = async (claim: PaymentVerificationItem) => {
    try {
      await decisions.clearFlag.mutateAsync(claim.paymentId)
      toast.success('Flag cleared — the claim is back to an ordinary review.')
    } catch (failure) {
      toast.error(errorMessage(failure, 'The flag could not be cleared.'))
    }
  }

  const busy =
    decisions.verify.isPending ||
    decisions.reject.isPending ||
    decisions.flag.isPending ||
    decisions.clearFlag.isPending

  return (
    <>
      <PageHeader
        title="Reconciliation"
        description="Confirm the M-PESA payments customers say they made. Nothing here counts as received until you say it does."
        actions={
          <Button onClick={() => void queue.refetch()} disabled={queue.isFetching}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <MetricGrid
        items={[
          { value: counts.awaiting, label: 'Awaiting verification' },
          { value: counts.verified, label: 'Verified' },
          { value: counts.rejected, label: 'Rejected' },
          {
            value: data ? money(data.awaitingAmount) : '—',
            label: 'Total pending amount',
          },
          { value: counts.attention, label: 'Requires attention' },
        ]}
      />

      <Card className="mt-[0.9rem] p-[0.9rem]">
        <div className="grid gap-[0.7rem] lg:grid-cols-[1.4fr_1fr_1fr]">
          <SearchField
            label="Search claims"
            value={search}
            placeholder="Transaction code, customer, phone or reference"
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />

          <Field label="Amount claimed (KES)" htmlFor="claim-amount-min">
            <div className="flex items-center gap-[0.4rem]">
              <Input
                id="claim-amount-min"
                inputMode="decimal"
                placeholder="Min"
                value={amounts.min}
                onChange={(event) => {
                  setAmounts((prev) => ({ ...prev, min: event.target.value }))
                  setPage(1)
                }}
              />
              <Input
                inputMode="decimal"
                aria-label="Maximum amount"
                placeholder="Max"
                value={amounts.max}
                onChange={(event) => {
                  setAmounts((prev) => ({ ...prev, max: event.target.value }))
                  setPage(1)
                }}
              />
            </div>
          </Field>

          <Field label="Submitted between" htmlFor="claim-from">
            <div className="flex items-center gap-[0.4rem]">
              <Input
                id="claim-from"
                type="date"
                value={dates.from}
                onChange={(event) => {
                  setDates((prev) => ({ ...prev, from: event.target.value }))
                  setPage(1)
                }}
              />
              <Input
                type="date"
                aria-label="Submitted to"
                value={dates.to}
                onChange={(event) => {
                  setDates((prev) => ({ ...prev, to: event.target.value }))
                  setPage(1)
                }}
              />
            </div>
          </Field>
        </div>

        <div className="mt-[0.7rem] grid gap-[0.7rem] lg:grid-cols-[1.4fr_1fr_auto]">
          <Field label="Transaction date between" htmlFor="claim-tx-from">
            <div className="flex items-center gap-[0.4rem]">
              <Input
                id="claim-tx-from"
                type="date"
                value={dates.txFrom}
                onChange={(event) => {
                  setDates((prev) => ({ ...prev, txFrom: event.target.value }))
                  setPage(1)
                }}
              />
              <Input
                type="date"
                aria-label="Transaction date to"
                value={dates.txTo}
                onChange={(event) => {
                  setDates((prev) => ({ ...prev, txTo: event.target.value }))
                  setPage(1)
                }}
              />
            </div>
          </Field>

          <div className="flex items-end">
            {hasFilters ? (
              <Button
                onClick={() => {
                  setSearch('')
                  setAmounts({ min: '', max: '' })
                  setDates({ from: '', to: '', txFrom: '', txTo: '' })
                  setPage(1)
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="mt-[1rem]">
        <Tabs
          label="Claim views"
          items={CLAIM_LENSES.map((option) => ({
            value: option.key,
            label: option.label,
            badge: counts[option.key],
          }))}
          value={lens}
          onValueChange={(next) => {
            setLens(next as ClaimLens)
            setPage(1)
          }}
        />
      </div>

      <ClaimsList
        queue={queue}
        lens={lens}
        canDecide={canDecide}
        onOpen={(claim) => setOpenClaimId(claim.paymentId)}
        onVerify={(claim) => openDialog('verify', claim)}
        onReject={(claim) => openDialog('reject', claim)}
        onFlag={(claim) => openDialog('flag', claim)}
        onClearFlag={(claim) => void clearFlag(claim)}
      />

      {pageCount > 1 ? (
        <div className="mt-[1.1rem]">
          <PaginationBar page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      ) : null}

      <VerifyClaimDialog
        key={`verify-${dialogTarget?.paymentId ?? 'none'}`}
        claim={dialog === 'verify' ? dialogTarget : null}
        pending={decisions.verify.isPending}
        onCancel={closeDialog}
        onConfirm={(payload) => void verify(payload)}
      />
      <RejectClaimDialog
        key={`reject-${dialogTarget?.paymentId ?? 'none'}`}
        claim={dialog === 'reject' ? dialogTarget : null}
        pending={decisions.reject.isPending}
        onCancel={closeDialog}
        onConfirm={(reason) => void reject(reason)}
      />
      <FlagClaimDialog
        key={`flag-${dialogTarget?.paymentId ?? 'none'}`}
        claim={dialog === 'flag' ? dialogTarget : null}
        pending={decisions.flag.isPending}
        onCancel={closeDialog}
        onConfirm={(note) => void flag(note)}
      />

      <ClaimWorkspace
        open={openClaimId != null}
        claim={detail.data ?? null}
        // `isFetching`, not `isPending`: with no claim selected this query is disabled, and a
        // disabled query reports isPending === true forever — which is what used to pin the
        // drawer open on "Loading claim…".
        loading={detail.isFetching}
        error={detail.isError ? detail.error : null}
        onRetry={() => void detail.refetch()}
        canDecide={canDecide}
        busy={busy}
        onClose={() => setOpenClaimId(null)}
        onVerify={(claim) => openDialog('verify', claim)}
        onReject={(claim) => openDialog('reject', claim)}
        onFlag={(claim) => openDialog('flag', claim)}
        onClearFlag={(claim) => void clearFlag(claim)}
      />
    </>
  )
}

type QueueResult = {
  isPending: boolean
  isError: boolean
  isFetching: boolean
  error: unknown
  data: { items: PaymentVerificationItem[] } | undefined
  refetch: () => unknown
}

/**
 * The list itself: loading, error, empty and populated, in that order of concern. The empty
 * copy is lens-aware — "nothing awaiting" is good news, "nothing flagged" is unremarkable —
 * so an empty screen never reads as a fault.
 */
function ClaimsList({
  queue,
  lens,
  canDecide,
  onOpen,
  onVerify,
  onReject,
  onFlag,
  onClearFlag,
}: {
  queue: QueueResult
  lens: ClaimLens
  canDecide: boolean
  onOpen: (claim: PaymentVerificationItem) => void
  onVerify: (claim: PaymentVerificationItem) => void
  onReject: (claim: PaymentVerificationItem) => void
  onFlag: (claim: PaymentVerificationItem) => void
  onClearFlag: (claim: PaymentVerificationItem) => void
}) {
  if (queue.isPending) {
    return (
      <div className="mt-[0.9rem] flex flex-col gap-[0.7rem]" aria-busy="true" aria-label="Loading claims">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[13rem] rounded-card" />
        ))}
      </div>
    )
  }

  if (queue.isError) {
    return (
      <Alert tone="danger" title="Claims could not be loaded" className="mt-[0.9rem]">
        <p>{errorMessage(queue.error)}</p>
        <Button className="mt-[0.6rem]" size="sm" onClick={() => void queue.refetch()} disabled={queue.isFetching}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      </Alert>
    )
  }

  const items = queue.data?.items ?? []

  if (items.length === 0) {
    return (
      <Card className="mt-[0.9rem]">
        <EmptyState
          icon={<Inbox className="size-5" aria-hidden="true" />}
          title="Nothing here"
          description={
            lens === 'awaiting'
              ? 'Every submitted M-PESA claim has been decided. New claims appear here the moment a customer submits one.'
              : lens === 'attention'
                ? 'No claim is flagged or open for review.'
                : 'No claims match this view yet.'
          }
        />
      </Card>
    )
  }

  return (
    <ul className="mt-[0.9rem] flex list-none flex-col gap-[0.9rem] p-0">
      {items.map((claim) => (
        <ClaimCard
          key={claim.paymentId}
          claim={claim}
          canDecide={canDecide}
          onOpen={onOpen}
          onVerify={onVerify}
          onReject={onReject}
          onFlag={onFlag}
          onClearFlag={onClearFlag}
        />
      ))}
    </ul>
  )
}

/**
 * One claim, presented around the message the customer sent.
 *
 * The message is the evidence, so it leads. Everything else on the card is context for judging
 * it: who sent it, what the booking is worth, and whether anything about it is already wrong
 * (an amount that does not match, a code another claim is using). The warnings are shown, never
 * resolved automatically — a person still has to decide.
 */
function ClaimCard({
  claim,
  canDecide,
  onOpen,
  onVerify,
  onReject,
  onFlag,
  onClearFlag,
}: {
  claim: PaymentVerificationItem
  canDecide: boolean
  onOpen: (claim: PaymentVerificationItem) => void
  onVerify: (claim: PaymentVerificationItem) => void
  onReject: (claim: PaymentVerificationItem) => void
  onFlag: (claim: PaymentVerificationItem) => void
  onClearFlag: (claim: PaymentVerificationItem) => void
}) {
  const decidable = canDecide && claimIsOpen(claim.status)

  return (
    <li>
      <Card className="p-[0.9rem]">
        <div className="flex flex-wrap items-start justify-between gap-[0.6rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-[0.45rem]">
              <Badge tone={claimStatusTone(claim.status)}>{claimStatusLabel(claim.status)}</Badge>
              <span className="font-mono text-meta tracking-wide text-fg">
                {claim.transactionCode ?? 'No code read'}
              </span>
              {claim.submittedAt ? (
                <span className="inline-flex items-center gap-[0.25rem] text-caption text-muted">
                  <Clock className="size-3" aria-hidden="true" />
                  submitted {formatDateTime(claim.submittedAt)}
                </span>
              ) : null}
            </div>

            <p className="mt-[0.35rem] text-label font-semibold text-fg">
              {claim.customerName ?? 'Customer'}
              {!claim.isRegisteredCustomer ? (
                <span className="ml-[0.35rem] font-normal text-muted">guest</span>
              ) : null}
            </p>
            <p className="text-caption text-muted">
              {claim.customerPhone ?? 'No phone on file'}
              {claim.serviceNames.length > 0 ? ` · ${claim.serviceNames.join(', ')}` : ''}
              {claim.assignedStaffName ? ` · ${claim.assignedStaffName}` : ''}
              {claim.appointmentId ? ` · ${claim.reference}` : ''}
            </p>
          </div>

          <div className="text-right">
            <p className="tabular text-label font-bold text-fg">
              {claim.submittedAmount != null ? money(claim.submittedAmount, claim.currency) : '—'}
            </p>
            <p className="text-caption text-muted">
              claimed · {money(claim.expectedAmount, claim.currency)} expected
            </p>
          </div>
        </div>

        {claim.amountMismatch || claim.duplicateOfPaymentId || claim.flagNote ? (
          <div className="mt-[0.6rem] flex flex-wrap items-center gap-[0.4rem]">
            {claim.amountMismatch ? (
              <Badge tone="warning">
                <TriangleAlert className="mr-[0.25rem] size-3" aria-hidden="true" />
                Amount differs from the booking
              </Badge>
            ) : null}
            {claim.duplicateOfPaymentId ? (
              <Badge tone="danger">
                <ShieldAlert className="mr-[0.25rem] size-3" aria-hidden="true" />
                Code used on another payment
              </Badge>
            ) : null}
            {claim.flagNote ? <Badge tone="danger">Flagged: {claim.flagNote}</Badge> : null}
          </div>
        ) : null}

        <div className="mt-[0.8rem]">
          <MpesaMessage
            message={claim.submittedMessage}
            transactionCode={claim.transactionCode}
            amount={claim.submittedAmount}
            currency={claim.currency}
            transactionAt={claim.transactionAt}
            recipient={claim.recipient}
            payer={claim.payer}
          />
        </div>

        <div className="mt-[0.8rem] flex flex-wrap items-center gap-[0.5rem]">
          <Button size="sm" onClick={() => onOpen(claim)}>
            Open workspace
          </Button>
          {decidable ? (
            <>
              <Button size="sm" variant="primary" onClick={() => onVerify(claim)}>
                Verify payment
              </Button>
              <Button size="sm" variant="danger" onClick={() => onReject(claim)}>
                Reject
              </Button>
              {claim.status === 'flagged' ? (
                <Button size="sm" variant="ghost" onClick={() => onClearFlag(claim)}>
                  Clear flag
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => onFlag(claim)}>
                  <Flag className="size-3.5" aria-hidden="true" />
                  Flag for review
                </Button>
              )}
            </>
          ) : (
            <span className="text-caption text-muted">
              {canDecide
                ? 'This claim has been decided.'
                : 'Only an owner can verify, reject or flag a claim.'}
            </span>
          )}
        </div>
      </Card>
    </li>
  )
}

/**
 * The verification workspace: everything about one claim in one place, and the three decisions.
 *
 * The layout answers the owner's questions in the order they ask them — who is this, what was the
 * booking, what exactly did they send, and is there anything already suspicious — before it offers a
 * button. The audit trail sits at the bottom so the history is available without being in the way.
 */
function ClaimWorkspace({
  open,
  claim,
  loading,
  error,
  onRetry,
  canDecide,
  busy,
  onClose,
  onVerify,
  onReject,
  onFlag,
  onClearFlag,
}: {
  /**
   * Whether a claim is selected. Deliberately NOT derived from the data or a loading flag: a
   * query that is disabled because nothing is selected reports `isPending`, which would leave
   * this drawer pinned open with no claim to show.
   */
  open: boolean
  claim: PaymentVerificationItem | null
  /** True only while a request is genuinely in flight. */
  loading: boolean
  /** A failed load. Shown with a retry — never a spinner that never ends. */
  error: unknown
  onRetry: () => void
  canDecide: boolean
  busy: boolean
  onClose: () => void
  onVerify: (claim: PaymentVerificationItem) => void
  onReject: (claim: PaymentVerificationItem) => void
  onFlag: (claim: PaymentVerificationItem) => void
  onClearFlag: (claim: PaymentVerificationItem) => void
}) {
  const decidable = canDecide && claimIsOpen(claim?.status)
  const failed = error != null

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={claim ? `Claim ${claim.transactionCode ?? claim.reference}` : failed ? 'Claim unavailable' : 'Loading claim…'}
      description={claim ? claimStatusLabel(claim.status) : undefined}
    >
      {failed && !claim ? (
        <Alert tone="danger" title="This claim could not be loaded">
          <p>{errorMessage(error, 'The claim could not be loaded.')}</p>
          <p className="mt-[0.3rem] text-caption">
            It may have been removed, or belong to another business. Nothing has changed on the
            claim itself.
          </p>
          <Button className="mt-[0.6rem]" size="sm" onClick={onRetry} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
            Try again
          </Button>
        </Alert>
      ) : loading && !claim ? (
        <div className="flex flex-col gap-[0.7rem]" aria-busy="true">
          <Skeleton className="h-[6rem]" />
          <Skeleton className="h-[14rem]" />
        </div>
      ) : claim ? (
        <div className="flex flex-col gap-[1.1rem]">
          {claim.amountMismatch || claim.duplicateOfPaymentId ? (
            <Alert tone="warning" title="Worth a second look before you confirm">
              {claim.amountMismatch
                ? 'The amount in the message does not match what this booking is for. '
                : ''}
              {claim.duplicateOfPaymentId
                ? 'This transaction code is already recorded against another payment. '
                : ''}
              Confirm only what your own M-PESA account shows.
            </Alert>
          ) : null}

          <section>
            <h3 className="eyebrow m-0">Customer</h3>
            <dl className="m-0 mt-[0.5rem] grid grid-cols-2 gap-[0.6rem] text-meta max-sm:grid-cols-1">
              <Fact label="Name" value={claim.customerName ?? 'Not provided'} />
              <Fact label="Phone" value={claim.customerPhone ?? 'Not provided'} />
              <Fact label="Email" value={claim.customerEmail ?? 'Not provided'} />
              <Fact
                label="Account"
                value={claim.isRegisteredCustomer ? 'Registered customer' : 'Guest checkout'}
              />
            </dl>
          </section>

          <section>
            <h3 className="eyebrow m-0">Appointment</h3>
            {claim.appointmentId ? (
              <dl className="m-0 mt-[0.5rem] grid grid-cols-2 gap-[0.6rem] text-meta max-sm:grid-cols-1">
                <Fact label="Reference" value={claim.reference} mono />
                <Fact
                  label="Service"
                  value={claim.serviceNames.length > 0 ? claim.serviceNames.join(', ') : 'Not recorded'}
                />
                <Fact label="Staff" value={claim.assignedStaffName ?? 'Unassigned'} />
                <Fact
                  label="Scheduled"
                  value={claim.scheduledAt ? formatDateTime(claim.scheduledAt) : 'Not scheduled'}
                />
                <Fact label="Booking value" value={money(claim.bookingAmount ?? 0, claim.currency)} />
                <Fact
                  label="Expected for this payment"
                  value={money(claim.expectedAmount, claim.currency)}
                />
                <Fact
                  label="Balance on the booking"
                  value={money(claim.outstandingAmount ?? 0, claim.currency)}
                />
                <div className="flex items-end">
                  <Link
                    to="/dashboard/appointments/$appointmentId"
                    params={{ appointmentId: claim.appointmentId }}
                    className="link text-meta"
                  >
                    Open the appointment
                  </Link>
                </div>
              </dl>
            ) : (
              <p className="mt-[0.5rem] m-0 text-meta text-muted">
                This claim is not attached to an appointment.
              </p>
            )}
          </section>

          <section>
            <h3 className="eyebrow m-0">Submitted M-PESA message</h3>
            <div className="mt-[0.6rem]">
              <MpesaMessage
                message={claim.submittedMessage}
                transactionCode={claim.transactionCode}
                amount={claim.submittedAmount}
                currency={claim.currency}
                transactionAt={claim.transactionAt}
                recipient={claim.recipient}
                payer={claim.payer}
              />
            </div>
          </section>

          {claim.verificationEvents.length > 0 ? (
            <section>
              <h3 className="eyebrow m-0">Audit history</h3>
              <ul className="m-0 mt-[0.5rem] flex list-none flex-col gap-[0.5rem] p-0">
                {claim.verificationEvents.map((event) => (
                  <li key={event.id} className="flex items-start gap-[0.45rem] text-caption text-muted">
                    <Clock className="mt-[0.15rem] size-3.5 shrink-0" aria-hidden="true" />
                    <span>
                      <b className="font-medium text-fg">{claimEventLabel(event.kind)}</b>
                      {event.actorName ? ` by ${event.actorName}` : ''} ·{' '}
                      {formatDateTime(event.createdAt)}
                      {event.reason ? ` — ${event.reason}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-[0.5rem]">
            {decidable ? (
              <>
                <Button variant="primary" onClick={() => onVerify(claim)} disabled={busy}>
                  Verify payment
                </Button>
                <Button variant="danger" onClick={() => onReject(claim)} disabled={busy}>
                  Reject
                </Button>
                {claim.status === 'flagged' ? (
                  <Button variant="ghost" onClick={() => onClearFlag(claim)} disabled={busy}>
                    Clear flag
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={() => onFlag(claim)} disabled={busy}>
                    Flag for review
                  </Button>
                )}
                <Link
                  to="/dashboard/finances/reconciliation/$claimId"
                  params={{ claimId: claim.paymentId }}
                  className="link text-meta"
                >
                  Full details
                </Link>
                {busy ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden="true" /> : null}
              </>
            ) : (
              <p className="m-0 text-meta text-muted">
                {canDecide
                  ? `This claim is ${claimStatusLabel(claim.status).toLowerCase()} — there is nothing left to decide.`
                  : 'Only an owner can verify, reject or flag a claim.'}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}

/** One labelled value in the workspace. */
function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-subtle">{label}</dt>
      <dd className={cn('m-0 font-medium break-words text-fg', mono && 'font-mono')}>{value}</dd>
    </div>
  )
}
