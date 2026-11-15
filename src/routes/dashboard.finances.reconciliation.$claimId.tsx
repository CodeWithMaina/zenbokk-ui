import { createFileRoute, Link } from '@tanstack/react-router'
import { Clock, RefreshCw } from 'lucide-react'
import { MpesaMessage } from '../components/finances/MpesaMessage'
import { Alert } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import { useFinanceClaim } from '../lib/finances/claims'
import { claimEventLabel, claimStatusLabel, claimStatusTone } from '../lib/finances/claim-status'
import { formatDateTime, money } from '../lib/format'

export const Route = createFileRoute('/dashboard/finances/reconciliation/$claimId')({
  component: ClaimDetailPage,
})

/**
 * One payment claim, in full.
 *
 * The pasted M-Pesa message is the evidence, so it leads — exactly as it does in the verification
 * drawer, because this page and that drawer read the same server-built claim. Everything else is
 * context for judging it, plus the two things a claim can lead on to: the appointment it belongs
 * to, and the receipt it became once verified.
 */
function ClaimDetailPage() {
  const { claimId } = Route.useParams()
  const claim = useFinanceClaim(claimId)
  const data = claim.data

  if (claim.isError) {
    return (
      <>
        <PageHeader title="Payment claim" />
        <Card className="p-[0.9rem]">
          <p className="m-0 text-meta text-danger-ink">{errorMessage(claim.error)}</p>
          <div className="mt-[0.7rem] flex flex-wrap gap-[0.5rem]">
            <Button size="sm" onClick={() => void claim.refetch()} disabled={claim.isFetching}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
            <Link to="/dashboard/finances/reconciliation" className="btn btn-sm">
              Back to Reconciliation
            </Link>
          </div>
        </Card>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <PageHeader title="Payment claim" />
        <Card className="grid gap-[0.6rem] p-[0.9rem]" aria-busy="true">
          <Skeleton className="h-[6rem]" />
          <Skeleton className="h-[12rem]" />
        </Card>
      </>
    )
  }


  return (
    <>
      <PageHeader
        title={`Claim ${data.transactionCode ?? data.reference}`}
        description={`${claimStatusLabel(data.status)} · submitted ${
          data.submittedAt ? formatDateTime(data.submittedAt) : 'unknown'
        }`}
        actions={
          <Link to="/dashboard/finances/reconciliation" className="btn btn-sm">
            Decide in Reconciliation
          </Link>
        }
      />

      <div className="grid gap-[0.9rem]">
        <Card className="p-[0.9rem]">
          <div className="flex flex-wrap items-center gap-[0.5rem]">
            <Badge tone={claimStatusTone(data.status)}>{claimStatusLabel(data.status)}</Badge>
            <span className="tabular text-meta font-semibold">
              {money(data.submittedAmount ?? data.expectedAmount, data.currency)}
            </span>
          </div>

          <div className="mt-[0.7rem]">
            <MpesaMessage
              message={data.submittedMessage}
              transactionCode={data.transactionCode}
              amount={data.submittedAmount}
              currency={data.currency}
              transactionAt={data.transactionAt}
              recipient={data.recipient}
              payer={data.payer}
            />
          </div>

          {data.amountMismatch || data.duplicateOfPaymentId ? (
            <Alert tone="warning" title="Worth a second look" className="mt-[0.7rem]">
              {data.amountMismatch
                ? 'The amount in the message does not match what this booking is for. '
                : ''}
              {data.duplicateOfPaymentId
                ? 'This transaction code is already recorded against another payment. '
                : ''}
              Confirm only what your own M-PESA account shows.
            </Alert>
          ) : null}

          <dl className="mt-[0.7rem] grid gap-[0.6rem] text-meta sm:grid-cols-3">
            <Fact label="Punched reference" value={data.reference} mono />
            <Fact label="M-Pesa code" value={data.transactionCode ?? '—'} mono />
            <Fact label="Paid at" value={data.transactionAt ? formatDateTime(data.transactionAt) : '—'} />
            <Fact label="Expected for this payment" value={money(data.expectedAmount, data.currency)} />
            <Fact label="Claimed" value={money(data.submittedAmount ?? 0, data.currency)} />
            <Fact
              label="Balance on the booking"
              value={data.outstandingAmount != null ? money(data.outstandingAmount, data.currency) : '—'}
            />
            {data.verifiedAt ? <Fact label="Verified" value={formatDateTime(data.verifiedAt)} /> : null}
            {data.rejectedAt ? <Fact label="Rejected" value={formatDateTime(data.rejectedAt)} /> : null}
            {data.rejectionReason ? <Fact label="Rejection reason" value={data.rejectionReason} /> : null}
            {data.flagNote ? <Fact label="Flag note" value={data.flagNote} /> : null}
          </dl>
        </Card>

        <Card className="p-[0.9rem]">
          <h2 className="m-0 text-label font-semibold">Customer</h2>
          <dl className="mt-[0.6rem] grid gap-[0.6rem] text-meta sm:grid-cols-3">
            <Fact label="Name" value={data.customerName ?? 'Not provided'} />
            <Fact label="Phone" value={data.customerPhone ?? 'Not provided'} />
            <Fact label="Email" value={data.customerEmail ?? 'Not provided'} />
          </dl>
          {data.customerId ? (
            <p className="mt-[0.6rem] m-0 text-meta">
              <Link
                to="/dashboard/customers/$clientId"
                params={{ clientId: data.customerId }}
                className="link"
              >
                Open the customer
              </Link>
            </p>
          ) : (
            <p className="mt-[0.6rem] m-0 text-caption text-muted">
              Guest checkout — no customer account to open.
            </p>
          )}
        </Card>

        <Card className="p-[0.9rem]">
          <h2 className="m-0 text-label font-semibold">What this claim leads to</h2>
          <ul className="mt-[0.6rem] flex list-none flex-col gap-[0.35rem] p-0 text-meta">
            {data.appointmentId ? (
              <li>
                <Link
                  to="/dashboard/appointments/$appointmentId"
                  params={{ appointmentId: data.appointmentId }}
                  className="link"
                >
                  Open the appointment
                </Link>
                {data.serviceNames.length > 0 ? (
                  <span className="text-muted"> — {data.serviceNames.join(', ')}</span>
                ) : null}
              </li>
            ) : (
              <li className="text-muted">Not attached to an appointment.</li>
            )}

            {data.financialTransactionId ? (
              <li>
                <Link
                  to="/dashboard/finances/transactions/$transactionId"
                  params={{ transactionId: data.financialTransactionId }}
                  className="link"
                >
                  Open the recognised transaction
                </Link>
                <span className="text-muted"> — this claim, as it appears in the books.</span>
              </li>
            ) : (
              <li className="text-muted">
                No financial transaction yet: a claim becomes money only once it has been verified.
              </li>
            )}
          </ul>
        </Card>

        {data.verificationEvents.length > 0 ? (
          <Card className="p-[0.9rem]">
            <h2 className="m-0 text-label font-semibold">Review history</h2>
            <ul className="mt-[0.6rem] flex list-none flex-col gap-[0.4rem] p-0 text-meta">
              {data.verificationEvents.map((event) => (
                <li key={event.id} className="flex items-start gap-[0.4rem] text-muted">
                  <Clock className="mt-[0.15rem] size-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    <b className="font-medium text-fg">{claimEventLabel(event.kind)}</b>
                    {event.actorName ? ` by ${event.actorName}` : ''} · {formatDateTime(event.createdAt)}
                    {event.reason ? ` — ${event.reason}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
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
