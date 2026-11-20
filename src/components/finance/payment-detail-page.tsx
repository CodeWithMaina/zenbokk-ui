import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button, BackLink } from '../ui/button'
import { EntityHeader } from '../ui/page-header'
import { Avatar } from '../ui/avatar'
import { Card } from '../ui/card'
import { DescriptionList, DescriptionRow } from '../ui/description-list'
import { ActivityTimeline, type ActivityEntry } from '../ui/activity-timeline'
import { EmptyState } from '../ui/empty-state'
import { Alert } from '../ui/alert'
import { Skeleton } from '../ui/skeleton'
import { FinanceSummaryPanel } from './summary'
import { displayPhone, financeDate, financeDateTime, financeTime } from '../../lib/finances/format'
import { paymentStatusDisplay, isAwaitingVerification, paymentTypeLabel, paymentMethodLabel } from '../../lib/finances/status'
import { PaymentStatusPill, CopyButton } from './pills'
import { usePaymentStatus, type Payment } from '../../lib/payments/api'
import { useClaimDecisions } from '../../lib/finances/api'
import { useDashboardContext } from '../../lib/dashboard/dashboard-context'
import { MODULE } from '../../lib/entitlements'
import { errorMessage } from '../../lib/api/client'
import { FinanceClaimDialogs } from './claim-dialogs'

/** Timeline entries derived from the server's verification trail. */
function buildTimeline(payment: Payment): ActivityEntry[] {
  const entries: ActivityEntry[] = [{ id: 'created', title: 'Payment created', time: financeDateTime(payment.createdAt) }]
  if (payment.submittedAt) {
    entries.push({
      id: 'submitted',
      title: 'Customer submitted M-Pesa message',
      description: `Sent from ${payment.phoneNumber ? displayPhone(payment.phoneNumber) : 'their phone'}`,
      time: financeDateTime(payment.submittedAt),
      tone: 'warning',
    })
  }
  for (const event of payment.verificationEvents ?? []) {
    const title =
      event.kind === 'verified'
        ? 'Claim verified'
        : event.kind === 'rejected'
          ? 'Claim rejected'
          : event.kind === 'submitted'
            ? 'Claim submitted'
            : event.kind === 'under_review'
              ? 'Marked under review'
              : event.kind === 'expired'
                ? 'Claim expired'
                : event.kind
    entries.push({
      id: event.id,
      title,
      description: event.actorName ? `By ${event.actorName}` : event.reason || undefined,
      time: financeDateTime(event.createdAt),
      tone: event.kind === 'rejected' ? 'danger' : event.kind === 'verified' ? 'success' : 'warning',
    })
  }
  if (payment.completedAt) {
    entries.push({ id: 'completed', title: 'Payment completed', time: financeDateTime(payment.completedAt), tone: 'success' })
  }
  return entries
}

/** One payment, in full. The Verify/Reject pair appears only while the claim is undecided. */
export function PaymentDetailPage({ paymentId }: { paymentId: string }) {
  const navigate = useNavigate()
  const { hasModule, hasPermission } = useDashboardContext()
  const enabled = hasModule(MODULE.financials) && hasPermission('finances.view')
  const canVerify = hasPermission('finances.verify')

  const paymentQuery = usePaymentStatus(paymentId)
  const { verify, reject } = useClaimDecisions()

  const [verifyOpen, setVerifyOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const backToPayments = () => navigate({ to: '/dashboard/finances/payments' })

  const handleVerify = async (id: string, note: string | null, receivedAmount?: number | null) => {
    try {
      await verify.mutateAsync({ paymentId: id, note, receivedAmount })
      toast.success('Claim verified · added to cashbook')
      setVerifyOpen(false)
    } catch (err) {
      toast.error(errorMessage(err, 'Verification failed. Please try again.'))
    }
  }

  const handleReject = async (id: string, reason: string) => {
    if (!reason.trim()) return
    try {
      await reject.mutateAsync({ paymentId: id, reason })
      toast.success('Claim rejected')
      setRejectOpen(false)
      setRejectionReason('')
    } catch (err) {
      toast.error(errorMessage(err, 'Rejection failed. Please try again.'))
    }
  }

  if (!enabled) {
    return (
      <div>
        <BackLink onClick={backToPayments} className="cursor-pointer">
          Payments
        </BackLink>
        <EmptyState
          title="Finance is not available"
          description="This business's plan does not include the financials module, or your role cannot view finances."
        />
      </div>
    )
  }

  if (paymentQuery.isPending) {
    return (
      <div aria-busy="true" aria-label="Loading payment">
        <BackLink onClick={backToPayments} className="cursor-pointer">
          Payments
        </BackLink>
        <div className="grid gap-[1rem] min-[56rem]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Skeleton className="h-[9rem] rounded-panel" />
          <Skeleton className="h-[9rem] rounded-card" />
        </div>
      </div>
    )
  }

  if (paymentQuery.isError || !paymentQuery.data) {
    return (
      <div>
        <BackLink onClick={backToPayments} className="cursor-pointer">
          Payments
        </BackLink>
        <Alert tone="danger" title="Payment could not be loaded">
          <p>{errorMessage(paymentQuery.error, 'This payment may no longer exist.')}</p>
          <Button size="sm" className="mt-2" onClick={() => void paymentQuery.refetch()}>
            Try again
          </Button>
        </Alert>
      </div>
    )
  }

  const payment = paymentQuery.data
  const statusDisplay = paymentStatusDisplay(payment.status)
  const awaiting = isAwaitingVerification(payment.status)
  const timeline = buildTimeline(payment)
  const attemptWithError = (payment.attempts ?? []).find((attempt) => attempt.errorMessage)
  const failureMessage = payment.rejectionReason || attemptWithError?.errorMessage || null


  return (
    <div>
      <BackLink onClick={backToPayments} className="cursor-pointer">
        Payments
      </BackLink>

      <EntityHeader
        avatar={<Avatar name={payment.customerName ?? ''} size="lg" decorative />}
        title={payment.customerName || 'Unknown customer'}
        subtitle={<span className="font-mono">{payment.reference}</span>}
        meta={<PaymentStatusPill status={payment.status} />}
        actions={
          awaiting ? (
            <>
              {canVerify ? (
                <Button variant="danger" onClick={() => setRejectOpen(true)}>
                  <ShieldAlert className="size-4" aria-hidden="true" />
                  Reject
                </Button>
              ) : null}
              {canVerify ? (
                <Button variant="primary" onClick={() => setVerifyOpen(true)}>
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Verify claim
                </Button>
              ) : null}
            </>
          ) : (
            <span className="inline-flex items-center gap-[0.3rem]">
              <span className="font-mono text-meta text-muted">{payment.reference}</span>
              <CopyButton value={payment.reference} label="Copy reference" />
            </span>
          )
        }
      />

      <div className="grid items-start gap-[1rem] min-[56rem]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-[1rem]">
          <FinanceSummaryPanel
            label={paymentTypeLabel(payment.type)}
            amount={payment.amount}
            currency={payment.currency || 'KES'}
            badge={statusDisplay.label}
            legend={[
              { key: 'method', label: 'Method', value: paymentMethodLabel(payment.method) },
              {
                key: 'when',
                label: 'Recorded',
                value: `${financeDate(payment.createdAt)}, ${financeTime(payment.createdAt)}`,
              },
            ]}
          />

          {payment.submittedMessage ? (
            <Card className="p-[1.1rem]">
              <h2 className="text-heading font-bold tracking-snug">Message the customer submitted</h2>
              <div className="mt-[0.6rem] rounded-lg border border-warning-line bg-warning-soft p-[0.8rem_0.9rem] text-label text-warning-ink [overflow-wrap:anywhere]">
                “{payment.submittedMessage}”
              </div>
              <p className="mt-[0.7rem] text-meta text-muted">
                Check the code and amount against your M-Pesa statement, then verify. Verifying records the money in
                your cashbook — once.
              </p>
            </Card>
          ) : null}

          {failureMessage ? (
            <Card className="p-[1.1rem]">
              <h2 className="text-heading font-bold tracking-snug">
                {payment.rejectionReason ? 'Why the claim was rejected' : 'What went wrong'}
              </h2>
              <div className="mt-[0.6rem] rounded-lg border border-danger-line bg-danger-soft p-[0.8rem_0.9rem] text-label text-danger-ink [overflow-wrap:anywhere]">
                {failureMessage}
              </div>
            </Card>
          ) : null}

          <Card className="p-[1.1rem]">
            <h2 className="text-heading font-bold tracking-snug">Timeline</h2>
            <ActivityTimeline className="mt-[0.9rem]" entries={timeline} emptyLabel="No activity recorded." />
          </Card>
        </div>


        <div className="flex flex-col gap-[1rem]">
          <Card className="p-[1.1rem]">
            <h2 className="text-heading font-bold tracking-snug">Details</h2>
            <DescriptionList className="mt-3">
              <DescriptionRow label="Method" value={paymentMethodLabel(payment.method)} />
              {payment.method === 'mpesa' ? (
                <>
                  <DescriptionRow
                    label="M-Pesa code"
                    value={
                      payment.parsedTransactionCode ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono">{payment.parsedTransactionCode}</span>
                          <CopyButton value={payment.parsedTransactionCode} label="Copy M-Pesa code" />
                        </span>
                      ) : (
                        <span className="text-subtle">Not received</span>
                      )
                    }
                  />
                  <DescriptionRow label="Sent from" value={payment.phoneNumber ? displayPhone(payment.phoneNumber) : '—'} />
                </>
              ) : null}
              <DescriptionRow label="Reference" value={<span className="font-mono">{payment.reference}</span>} />
              <DescriptionRow label="Type" value={paymentTypeLabel(payment.type)} />
              <DescriptionRow label="Status" value={statusDisplay.label} />
              <DescriptionRow label="Created" value={financeDateTime(payment.createdAt)} />
              <DescriptionRow label="Completed" value={payment.completedAt ? financeDateTime(payment.completedAt) : '—'} />
              {payment.appointmentId ? (
                <DescriptionRow
                  label="Appointment"
                  value={<span className="font-mono">{payment.appointmentId.slice(0, 8)}…</span>}
                />
              ) : null}
            </DescriptionList>
          </Card>

          <Card className="p-[1.1rem]">
            <h2 className="text-heading font-bold tracking-snug">Cashbook</h2>
            {payment.ledgerReference ? (
              <>
                <DescriptionList className="mt-3">
                  <DescriptionRow label="Entry" value={<span className="font-mono">{payment.ledgerReference}</span>} />
                  <DescriptionRow label="Recorded by" value={payment.ledgerRecordedByName || '—'} />
                </DescriptionList>
                <Button size="sm" className="mt-3" onClick={() => navigate({ to: '/dashboard/finances/cashbook' })}>
                  Open cashbook
                </Button>
              </>
            ) : payment.ledgerProcessingStatus === 'processing' ? (
              // Settlement and bookkeeping are separate states. The money is received; the books are
              // still catching up (the outbox retries automatically), and we never pretend otherwise.
              <div className="mt-3 rounded-lg border border-warning-line bg-warning-soft p-[0.8rem_0.9rem] text-meta text-warning-ink">
                <p className="font-semibold">Payment received — recording it in your books is still processing.</p>
                <p className="mt-1">
                  It will appear in the cashbook automatically. You do not need to record it by hand.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-warning-ink hover:bg-warning-line/20"
                  onClick={() => void paymentQuery.refetch()}
                >
                  Refresh status
                </Button>
              </div>
            ) : payment.ledgerProcessingStatus === 'attention' ? (
              <div className="mt-3 rounded-lg border border-danger-line bg-danger-soft p-[0.8rem_0.9rem] text-meta text-danger-ink">
                <p className="font-semibold">Payment received — recording it needs attention.</p>
                <p className="mt-1">
                  The payment is settled, but it could not be written to the cashbook automatically. Please contact
                  support so we can check it with you.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-danger-ink hover:bg-danger-line/20"
                  onClick={() => void paymentQuery.refetch()}
                >
                  Refresh status
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-meta text-muted">
                {awaiting
                  ? 'Not in your cashbook yet. Verifying adds it as verified income.'
                  : 'No cashbook entry for this payment — only settled money becomes income.'}
              </p>
            )}
          </Card>
        </div>
      </div>

      <FinanceClaimDialogs
        verifyOpen={verifyOpen}
        verifyPending={verify.isPending}
        onVerifyClose={() => setVerifyOpen(false)}
        onVerify={handleVerify}
        rejectOpen={rejectOpen}
        rejectPending={reject.isPending}
        onRejectClose={() => setRejectOpen(false)}
        onReject={handleReject}
        rejectionReason={rejectionReason}
        onRejectionReasonChange={setRejectionReason}
        claim={{
          id: payment.id,
          customerName: payment.customerName,
          amount: payment.amount,
          reference: payment.reference,
          parsedTransactionCode: payment.parsedTransactionCode,
          submittedMessage: payment.submittedMessage,
        }}
      />
    </div>
  )
}

