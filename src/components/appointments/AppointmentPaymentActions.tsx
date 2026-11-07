import { Banknote, CheckCircle2, Clock, RefreshCw, Smartphone } from 'lucide-react'
import { useState } from 'react'
import type { AppointmentPaymentSummary } from '../../lib/api/types'
import { errorMessage } from '../../lib/api/client'
import { formatDate, formatTime, money } from '../../lib/format'
import {
  useAppointmentPayments,
  usePaymentConfig,
  usePaymentStatus,
  usePublicPaymentDetails,
} from '../../lib/payments/api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Field, Input, Textarea } from '../ui/field'

/**
 * Collecting money against an appointment.
 *
 * The figures are the server's (`GET /v1/payments/appointment/{id}`); this panel
 * only decides *which* collection actions make sense, and every write goes through
 * the shared payment API. Nothing here can mark a payment settled: a cash row is
 * only paid once it is confirmed, and an M-PESA row stays pending until M-PESA
 * itself says otherwise.
 */

/** A payment status that is still in flight (never counted as money received). */
const PENDING_STATUSES = new Set([
  'created',
  'awaiting_customer',
  'processing',
  'submitted',
  'under_review',
])

const STATUS_LABELS: Record<string, string> = {
  created: 'Awaiting payment',
  awaiting_customer: 'Pending on customer',
  processing: 'Processing',
  submitted: 'Submitted for review',
  under_review: 'Under review',
  verified: 'Verified',
  success: 'Paid',
  failed: 'Failed',
  expired: 'Expired',
  cancelled: 'Cancelled',
  reversed: 'Reversed',
  refunded: 'Refunded',
  rejected: 'Rejected',
}

const STATUS_TONES: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  created: 'warning',
  awaiting_customer: 'warning',
  processing: 'info',
  submitted: 'info',
  under_review: 'info',
  verified: 'success',
  success: 'success',
  failed: 'danger',
  expired: 'neutral',
  cancelled: 'neutral',
  reversed: 'danger',
  refunded: 'neutral',
  rejected: 'danger',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  return STATUS_TONES[status] ?? 'neutral'
}

const TYPE_LABELS: Record<string, string> = {
  booking_fee: 'Booking fee',
  full_payment: 'Full payment',
  balance_payment: 'Balance',
}

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

function methodLabel(method: string): string {
  return method.toLowerCase() === 'mpesa' ? 'M-PESA' : 'Cash'
}

export type AppointmentPaymentActionsProps = {
  appointmentId: string
  businessId: string
  summary: AppointmentPaymentSummary
  /** The appointment can still take money (not cancelled or written off). */
  collectable: boolean
  /** The caller may create a payment (`payments.create`). */
  canInitiate: boolean
  /** The caller may confirm physical cash (`payments.confirm_cash`). */
  canConfirmCash: boolean
}

export function AppointmentPaymentActions({
  appointmentId,
  businessId,
  summary,
  collectable,
  canInitiate,
  canConfirmCash,
}: AppointmentPaymentActionsProps) {
  const [cashOpen, setCashOpen] = useState(false)
  const [mpesaOpen, setMpesaOpen] = useState(false)

  // The owner config names the M-PESA channel; it is owner-only, so a staff caller
  // falls back to the public details rather than being shown a 403 or a hidden action.
  const config = usePaymentConfig()
  const publicDetails = usePublicPaymentDetails(businessId)
  const cashEnabled = config.data?.cashEnabled ?? publicDetails.data?.cashEnabled ?? true
  const mpesaEnabled =
    (config.data?.mpesaEnabled ?? false) ||
    (config.data?.manualMpesaEnabled ?? false) ||
    Boolean(publicDetails.data?.enabled)

  const outstanding = summary.balance
  const fullyPaid = outstanding <= 0

  // A pending M-PESA attempt already on the row: shown, and not duplicated.
  const pendingAttempt = summary.payments.find(
    (payment) => payment.method.toLowerCase() === 'mpesa' && PENDING_STATUSES.has(payment.status),
  )

  const canCollectCash = collectable && !fullyPaid && canInitiate && cashEnabled
  const canCollectMpesa = collectable && !fullyPaid && canInitiate && mpesaEnabled && !pendingAttempt

  return (
    <div className="mt-[0.9rem] border-t border-line pt-[0.9rem]">
      {fullyPaid ? (
        <p className="flex items-center gap-[0.4rem] text-meta font-semibold text-success-ink">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Fully paid — nothing outstanding.
        </p>
      ) : (
        <p className="text-meta">
          <span className="text-muted">Outstanding </span>
          <b className="text-label tabular">{money(outstanding)}</b>
          {summary.paymentStatus === 'partially_paid' ? (
            <span className="text-muted"> · {money(summary.amountPaid)} already received</span>
          ) : null}
        </p>
      )}

      {pendingAttempt ? (
        <p className="mt-[0.5rem] flex flex-wrap items-center gap-[0.4rem] text-meta text-muted">
          <Clock className="size-3.5" aria-hidden="true" />
          {methodLabel(pendingAttempt.method)} {typeLabel(pendingAttempt.type).toLowerCase()} is{' '}
          <Badge tone={statusTone(pendingAttempt.status)}>{statusLabel(pendingAttempt.status)}</Badge>
          — it is not counted as received yet.
        </p>
      ) : null}

      {canCollectCash || canCollectMpesa ? (
        <div className="mt-[0.7rem] flex flex-wrap gap-[0.5rem]">
          {canCollectCash ? (
            <Button size="sm" variant="primary" onClick={() => setCashOpen(true)}>
              <Banknote className="size-4" aria-hidden="true" />
              Record cash payment
            </Button>
          ) : null}
          {canCollectMpesa ? (
            <Button size="sm" onClick={() => setMpesaOpen(true)}>
              <Smartphone className="size-4" aria-hidden="true" />
              Collect balance via M-PESA
            </Button>
          ) : null}
        </div>
      ) : null}

      {!collectable && !fullyPaid ? (
        <p className="mt-[0.5rem] text-meta text-muted">
          This appointment is closed, so no further payment is collected against it.
        </p>
      ) : null}

      {summary.payments.length > 0 ? (
        <ul className="mt-[0.8rem]">
          {summary.payments.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-[0.7rem] border-t border-line py-[0.55rem] text-meta"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">
                  {methodLabel(entry.method)} · {typeLabel(entry.type)}
                </span>
                <span className="block truncate text-caption text-muted tabular">
                  {entry.reference} · {formatDate(entry.createdAt)}, {formatTime(entry.createdAt)}
                </span>
                <span className="mt-[0.25rem] inline-flex items-center gap-[0.35rem]">
                  <Badge tone={statusTone(entry.status)}>{statusLabel(entry.status)}</Badge>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-semibold tabular">
                  {money(entry.amount, entry.currency)}
                </span>
                {entry.completedAt ? (
                  <span className="block text-caption text-muted tabular">
                    {formatDate(entry.completedAt)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-[0.8rem] text-meta text-muted">
          No payment has been recorded against this appointment.
        </p>
      )}

      {/* Mounted only while open, so each opening starts from a clean form. */}
      {cashOpen ? (
        <RecordCashPaymentDialog
          onClose={() => setCashOpen(false)}
          appointmentId={appointmentId}
          summary={summary}
          canConfirmCash={canConfirmCash}
        />
      ) : null}

      {mpesaOpen ? (
        <CollectBalanceDialog
          onClose={() => setMpesaOpen(false)}
          appointmentId={appointmentId}
          outstanding={outstanding}
          manualMpesa={Boolean(publicDetails.data?.enabled)}
          paybill={publicDetails.data?.paybillNumber ?? publicDetails.data?.tillNumber ?? null}
        />
      ) : null}
    </div>
  )
}

/**
 * Recording cash the business physically received.
 *
 * The operator states how much was taken — a part payment is allowed — and the
 * server validates that figure against the balance it computed. Where the caller
 * may confirm cash the row settles immediately; otherwise it is recorded and left
 * for whoever is allowed to confirm it. Either way this dialog never decides that
 * money arrived.
 */
export function RecordCashPaymentDialog({
  onClose,
  appointmentId,
  summary,
  canConfirmCash,
}: {
  onClose: () => void
  appointmentId: string
  summary: AppointmentPaymentSummary
  canConfirmCash: boolean
}) {
  const payments = useAppointmentPayments()
  const [amount, setAmount] = useState(String(summary.balance))
  const [note, setNote] = useState('')

  const outstanding = summary.balance
  const parsed = Number(amount)
  const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= outstanding
  const busy = payments.create.isPending || payments.confirmCash.isPending
  const error = payments.create.isError
    ? errorMessage(payments.create.error)
    : payments.confirmCash.isError
      ? errorMessage(payments.confirmCash.error)
      : null

  async function submit() {
    if (!valid || busy) return
    try {
      const payment = await payments.create.mutateAsync({
        appointmentId,
        method: 'cash',
        type: 'balance_payment',
        amount: parsed,
      })
      if (canConfirmCash) {
        await payments.confirmCash.mutateAsync({
          paymentId: payment.id,
          appointmentId,
          note: note.trim() || 'Cash received at the business',
        })
      }
      onClose()
    } catch {
      // Rendered below; the drawer stays open so the operator can correct it.
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Record cash payment"
      description="Cash is only counted once it has been recorded — and confirmed."
      footer={
        <div className="flex w-full items-center justify-end gap-[0.6rem]">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!valid || busy}>
            {busy ? 'Recording…' : canConfirmCash ? 'Record payment' : 'Record for confirmation'}
          </Button>
        </div>
      }
    >
      <div className="space-y-[0.9rem]">
        <dl className="grid grid-cols-2 gap-y-[0.35rem] text-meta">
          <dt className="text-muted">Service total</dt>
          <dd className="text-right tabular">{money(summary.serviceTotal)}</dd>
          <dt className="text-muted">Already received</dt>
          <dd className="text-right tabular">{money(summary.amountPaid)}</dd>
          <dt className="text-muted">Outstanding</dt>
          <dd className="text-right font-semibold tabular">{money(outstanding)}</dd>
        </dl>

        <Field
          label="Cash received"
          htmlFor="cash-payment-amount"
          hint={
            valid
              ? 'Enter less than the outstanding amount for a part payment.'
              : `Enter an amount greater than zero and no more than ${money(outstanding)}.`
          }
          error={amount.trim().length > 0 && !valid ? 'That amount cannot be recorded.' : undefined}
        >
          <Input
            id="cash-payment-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>

        <Field label="Note" htmlFor="cash-payment-note" optional>
          <Textarea
            id="cash-payment-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Who took the cash, where it was received…"
          />
        </Field>

        {!canConfirmCash ? (
          <p className="text-meta text-muted">
            You can record the cash, but it will stay awaiting confirmation until someone with the
            confirm permission approves it.
          </p>
        ) : null}

        {error ? (
          <p className="text-meta font-semibold text-danger-ink" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Drawer>
  )
}

/**
 * Collecting the outstanding balance by M-PESA.
 *
 * Creating the row is what raises the request; the balance stays outstanding until
 * the payment module confirms the money. This dialog never marks anything as
 * received — it reports whatever the server last said and offers a refresh, so the
 * operator sees the provider's answer rather than a guess.
 */
export function CollectBalanceDialog({
  onClose,
  appointmentId,
  outstanding,
  manualMpesa,
  paybill,
}: {
  onClose: () => void
  appointmentId: string
  outstanding: number
  manualMpesa: boolean
  paybill: string | null
}) {
  const payments = useAppointmentPayments()
  const [phone, setPhone] = useState('')
  const [createdId, setCreatedId] = useState<string | null>(null)
  const status = usePaymentStatus(createdId)

  const busy = payments.create.isPending
  const error = payments.create.isError ? errorMessage(payments.create.error) : null
  // A manual M-PESA payment is made from the customer's own handset, so a number is
  // not required to raise it; a platform-driven STK prompt cannot be sent without one.
  const valid = manualMpesa ? true : phone.trim().length >= 9

  async function submit() {
    if (!valid || busy || createdId) return
    try {
      const payment = await payments.create.mutateAsync({
        appointmentId,
        method: 'mpesa',
        type: 'balance_payment',
        phoneNumber: phone.trim() || null,
      })
      setCreatedId(payment.id)
    } catch {
      // Rendered below; the drawer stays open so the number can be corrected.
    }
  }

  const tracked = status.data

  return (
    <Drawer
      open
      onClose={onClose}
      title="Collect balance via M-PESA"
      description={`${money(outstanding)} outstanding on this appointment.`}
      footer={
        <div className="flex w-full items-center justify-end gap-[0.6rem]">
          {createdId ? (
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => void submit()} disabled={!valid || busy}>
                {busy ? 'Sending…' : manualMpesa ? 'Record M-PESA request' : 'Send M-PESA request'}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-[0.9rem]">
        <dl className="grid grid-cols-2 gap-y-[0.35rem] text-meta">
          <dt className="text-muted">Amount requested</dt>
          <dd className="text-right font-semibold tabular">{money(outstanding)}</dd>
        </dl>

        {createdId ? (
          <>
            <p className="flex flex-wrap items-center gap-[0.4rem] text-meta">
              <span className="text-muted">Status</span>
              <Badge tone={statusTone(tracked?.status ?? 'created')}>
                {statusLabel(tracked?.status ?? 'created')}
              </Badge>
            </p>
            <p className="text-meta text-muted">
              {tracked?.reference ? `Reference ${tracked.reference}. ` : ''}
              The customer completes the payment on their phone. The balance stays outstanding until
              M-PESA confirms it — this screen never marks it paid.
            </p>
            <Button
              size="sm"
              onClick={() => void status.refetch()}
              disabled={status.isFetching}
            >
              <RefreshCw
                className={status.isFetching ? 'size-4 animate-spin' : 'size-4'}
                aria-hidden="true"
              />
              Check status
            </Button>
          </>
        ) : (
          <>
            {manualMpesa ? (
              <>
                <p className="text-meta">
                  A pending M-PESA payment is created for this balance. The customer sends{' '}
                  <b className="tabular">{money(outstanding)}</b> to your{' '}
                  {paybill ? <b>{paybill}</b> : 'PayBill/Till'} and pastes the confirmation SMS; it
                  then appears in Payments for you to verify.
                </p>
                <Field label="Customer phone" htmlFor="mpesa-balance-phone" optional>
                  <Input
                    id="mpesa-balance-phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="0712 345 678"
                  />
                </Field>
              </>
            ) : (
              <>
                <p className="text-meta">
                  An M-PESA request for <b className="tabular">{money(outstanding)}</b> is sent to the
                  customer&rsquo;s phone. It stays pending until M-PESA confirms the payment.
                </p>
                <Field
                  label="Customer phone"
                  htmlFor="mpesa-balance-phone"
                  hint="A Kenyan number (07XX / 01XX / 2547XX)."
                >
                  <Input
                    id="mpesa-balance-phone"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="0712 345 678"
                  />
                </Field>
              </>
            )}
          </>
        )}

        {error ? (
          <p className="text-meta font-semibold text-danger-ink" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Drawer>
  )
}
