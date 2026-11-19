import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ShieldAlert, ShieldCheck, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { EntityHeader } from '../ui/page-header'
import { Avatar } from '../ui/avatar'
import { Card } from '../ui/card'
import { DescriptionList, DescriptionRow } from '../ui/description-list'
import { ActivityTimeline, type ActivityEntry } from '../ui/activity-timeline'
import { MetricTile } from '../ui/metric-tile'
import { EmptyState } from '../ui/empty-state'
import { Alert } from '../ui/alert'
import { Skeleton } from '../ui/skeleton'
import { displayPhone, financeDateTime, money } from '../../lib/format'
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
    entries.push({ id: 'submitted', title: 'Customer submitted M-Pesa message', time: financeDateTime(payment.submittedAt) })
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
      description: event.actorName ? `By ${event.actorName}` : undefined,
      time: financeDateTime(event.createdAt),
      tone: event.kind === 'rejected' ? 'danger' : event.kind === 'verified' ? 'success' : 'warning',
    })
  }
  if (payment.completedAt) {
    entries.push({ id: 'completed', title: 'Payment completed', time: financeDateTime(payment.completedAt), tone: 'success' })
  }
  return entries
}

/** One payment, in full. Verify/Reject appear only while the claim is awaiting verification. */
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
      toast.success('Claim verified \u00b7 added to cashbook')
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

  const payment = paymentQuery.data

  if (!enabled) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-[0.6rem]" onClick={backToPayments}><ChevronLeft className="size-4" aria-hidden="true" />Payments</Button>
        <EmptyState title="Finance is not available" description="This business\u2019s plan does not include the financials module." />
      </div>
    )
  }

  if (paymentQuery.isPending) {
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-[0.6rem]" onClick={backToPayments}><ChevronLeft className="size-4" aria-hidden="true" />Payments</Button>
        <div className="mt-4 grid gap-[0.6rem]">
          <Skeleton className="h-[4rem]" />
          <Skeleton className="h-[10rem]" />
          <Skeleton className="h-[8rem]" />
        </div>
      </div>
    )
  }

  if (paymentQuery.isError || !payment) {
    const err = paymentQuery.error
    const forbidden = typeof err === 'object' && err !== null && 'status' in err && (err as { status?: number }).status === 403
    const notFound = typeof err === 'object' && err !== null && 'status' in err && (err as { status?: number }).status === 404
    return (
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-[0.6rem]" onClick={backToPayments}><ChevronLeft className="size-4" aria-hidden="true" />Payments</Button>
        <Alert tone={forbidden ? 'warning' : 'danger'} title={forbidden ? 'You do not have access' : notFound ? 'Payment not found' : 'Payment could not be loaded'} className="mt-2">
          <p>{forbidden ? 'Your role cannot view this payment. Ask the owner for access.' : notFound ? 'This payment may have been removed, or the link is wrong.' : errorMessage(err, 'Something went wrong. Please try again.')}</p>
          {!forbidden && !notFound ? <Button size="sm" className="mt-2" onClick={() => paymentQuery.refetch()}>Try again</Button> : null}
        </Alert>
      </div>
    )
  }

  const statusDisplay = paymentStatusDisplay(payment.status)
  const awaiting = isAwaitingVerification(payment.status)
  const timeline = buildTimeline(payment)
  const showActions = awaiting && canVerify
  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2 -ml-[0.6rem]" onClick={backToPayments}>
        <ChevronLeft className="size-4" aria-hidden="true" />
        Payments
      </Button>

      <EntityHeader
        avatar={<Avatar name={payment.customerName ?? ''} size="lg" decorative />}
        title={payment.customerName || 'Unknown customer'}
        subtitle={<PaymentStatusPill status={payment.status} />}
        meta={<span className="font-mono">{payment.reference}</span>}
        actions={
          showActions ? (
            <>
              <Button variant="ghost" onClick={() => setRejectOpen(true)}>
                <ShieldAlert className="size-4" aria-hidden="true" />
                Reject
              </Button>
              <Button variant="primary" onClick={() => setVerifyOpen(true)}>
                <ShieldCheck className="size-4" aria-hidden="true" />
                Verify claim
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => void navigator.clipboard.writeText(payment.reference)}>
              <Copy className="size-4" aria-hidden="true" />
              Copy reference
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <MetricTile value={money(payment.amount, payment.currency || 'KES')} label={paymentTypeLabel(payment.type)} />

          {payment.submittedMessage ? (
            <Card className="p-[1.1rem]">
              <h2 className="text-heading font-bold tracking-snug">Message the customer submitted</h2>
              <p className="mt-3 rounded-md bg-warning-soft p-[0.8rem] text-meta text-warning-ink whitespace-pre-wrap [overflow-wrap:anywhere]">{payment.submittedMessage}</p>
              <p className="mt-3 text-meta text-muted">Check the code and amount against your M-Pesa statement, then verify. Verifying records the money in your cashbook.</p>
            </Card>
          ) : null}

          {payment.rejectionReason ? (
            <Card className="p-[1.1rem]">
              <h2 className="text-heading font-bold tracking-snug">Claim rejected</h2>
              <p className="mt-3 rounded-md bg-danger-soft p-[0.8rem] text-meta text-danger-ink whitespace-pre-wrap [overflow-wrap:anywhere]">{payment.rejectionReason}</p>
            </Card>
          ) : null}

          <Card className="p-[1.1rem]">
            <h2 className="text-heading font-bold tracking-snug">Timeline</h2>
            <ActivityTimeline className="mt-4" entries={timeline} emptyLabel="No activity recorded." />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
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
                          <CopyButton value={payment.parsedTransactionCode} />
                        </span>
                      ) : (
                        <span className="text-subtle">Not received</span>
                      )
                    }
                  />
                  <DescriptionRow label="Sent from" value={payment.phoneNumber ? displayPhone(payment.phoneNumber) : '\u2014'} />
                </>
              ) : null}
              <DescriptionRow label="Reference" value={<span className="font-mono">{payment.reference}</span>} />
              <DescriptionRow label="Type" value={paymentTypeLabel(payment.type)} />
              <DescriptionRow label="Status" value={statusDisplay.label} />
              <DescriptionRow label="Created" value={financeDateTime(payment.createdAt)} />
              <DescriptionRow label="Completed" value={payment.completedAt ? financeDateTime(payment.completedAt) : '\u2014'} />
              {payment.appointmentId ? <DescriptionRow label="Appointment" value={<span className="font-mono">{payment.appointmentId.slice(0, 8)}\u2026</span>} /> : null}
            </DescriptionList>
          </Card>

          <Card className="p-[1.1rem]">
            <h2 className="text-heading font-bold tracking-snug">Cashbook</h2>
            {statusDisplay.group === 'paid' ? (
              <>
                <DescriptionList className="mt-3"><DescriptionRow label="Recorded" value="Yes \u00b7 verified income" /></DescriptionList>
                <Button size="sm" className="mt-3" onClick={() => navigate({ to: '/dashboard/finances/cashbook' })}>Open cashbook</Button>
              </>
            ) : (
              <p className="mt-2 text-meta text-muted">{awaiting ? 'Not in your cashbook yet. Verifying adds it as income.' : 'No cashbook entry for this payment.'}</p>
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
        claim={{ id: payment.id, customerName: payment.customerName, amount: payment.amount, reference: payment.reference, parsedTransactionCode: payment.parsedTransactionCode }}
      />
    </div>
  )
}
