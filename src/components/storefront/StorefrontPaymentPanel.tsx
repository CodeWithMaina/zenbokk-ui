import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, Loader2, Smartphone, XCircle } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../../lib/api/client'
import { money } from '../../lib/format'
import { paymentsApi, usePaymentStatus } from '../../lib/payments/api'
import { normaliseKenyanPhone } from '../../lib/validation/contact'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'

export type StorefrontPaymentPanelProps = {
  appointmentId: string
  /** Total the server computed for the appointment's services. */
  total: number
  /** The customer's own number, offered as the M-Pesa default. */
  defaultPhone?: string | null
}

/**
 * Paying for a confirmed appointment.
 *
 * This is the platform's real payment path, not a facsimile of one:
 * `POST /v1/payments` computes the amount server-side and, for `mpesa`, asks
 * Daraja to push an STK prompt to the customer's handset. The browser then polls
 * `GET /v1/payments/{id}` and reports whatever the server says.
 *
 * Three things it deliberately does *not* do:
 *
 *  - it never shows a till or paybill number, because a business's collection
 *    details live in its own (owner-only) payment configuration;
 *  - it never treats anything the customer types as proof of payment — the
 *    Daraja callback is the only thing that can settle a payment;
 *  - it never opens a second attempt for the same booking: the idempotency key
 *    is derived from the appointment, so a double tap cannot fire two prompts.
 */
export function StorefrontPaymentPanel({
  appointmentId,
  total,
  defaultPhone,
}: StorefrontPaymentPanelProps) {
  const queryClient = useQueryClient()
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [phone, setPhone] = useState(defaultPhone ?? '')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [cashRecorded, setCashRecorded] = useState(false)

  const status = usePaymentStatus(paymentId)

  const start = useMutation({
    mutationFn: (method: 'mpesa' | 'cash') =>
      paymentsApi.create({
        appointmentId,
        method,
        type: 'full_payment',
        phoneNumber: method === 'mpesa' ? (normaliseKenyanPhone(phone) ?? phone) : null,
        idempotencyKey: `storefront-${appointmentId}-${method}`,
      }),
    onSuccess: (payment, method) => {
      setPaymentId(payment.id)
      if (method === 'cash') setCashRecorded(true)
      void queryClient.invalidateQueries({
        queryKey: ['payments', 'appointment', appointmentId],
      })
    },
  })

  function payWithMpesa() {
    if (normaliseKenyanPhone(phone) === null) {
      setPhoneError('Use a Kenyan number, for example 0712 345 678.')
      return
    }
    setPhoneError(null)
    start.mutate('mpesa')
  }

  const payment = status.data
  const settled = payment?.status === 'completed'
  const failed = payment?.status === 'failed' || payment?.status === 'cancelled'

  return (
    <div className="mt-[0.9rem]">
      <div className="rounded-card border border-line bg-surface p-[1rem]">
        <div className="flex flex-wrap items-baseline justify-between gap-[0.6rem]">
          <span className="text-meta text-muted">Amount due</span>
          <b className="text-title">{money(total)}</b>
        </div>
        <p className="mt-[0.4rem] text-caption text-subtle">
          Calculated from the services in this booking — the amount is set by the server, not by
          this page.
        </p>

        {settled ? (
          <Alert tone="success" className="mt-[0.8rem]">
            <span className="flex items-center gap-[0.4rem]">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Payment confirmed by {payment?.provider || 'the provider'}
              {payment?.externalReference ? ` — reference ${payment.externalReference}` : ''}.
            </span>
          </Alert>
        ) : null}

        {failed ? (
          <Alert tone="danger" className="mt-[0.8rem]">
            <span className="flex items-center gap-[0.4rem]">
              <XCircle className="size-4" aria-hidden="true" />
              {payment?.attempts.at(-1)?.errorMessage ||
                'That payment did not go through. You can try again.'}
            </span>
          </Alert>
        ) : null}

        {payment?.status === 'pending' ? (
          <Alert tone="warning" className="mt-[0.8rem]">
            <span className="flex items-center gap-[0.4rem]">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Waiting for you to approve the M-Pesa request on {payment.phoneNumber}. This page
              updates on its own.
            </span>
          </Alert>
        ) : null}

        {start.isError ? (
          <Alert tone="danger" className="mt-[0.8rem]">
            {errorMessage(
              start.error,
              'We could not start that payment. You can still pay at the studio.',
            )}
          </Alert>
        ) : null}

        {!settled && !payment ? (
          <div className="mt-[0.9rem]">
            <label className="label" htmlFor="sf-pay-phone">
              M-Pesa phone number
            </label>
            <div className="flex flex-wrap gap-[0.5rem]">
              <input
                id="sf-pay-phone"
                className="input flex-1"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                placeholder="07XX XXX XXX"
                aria-invalid={Boolean(phoneError)}
                onChange={(event) => setPhone(event.target.value)}
              />
              <Button
                variant="primary"
                onClick={payWithMpesa}
                disabled={start.isPending || total <= 0}
              >
                {start.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Smartphone className="size-4" aria-hidden="true" />
                )}
                Pay {money(total)}
              </Button>
            </div>
            {phoneError ? <p className="field-error">{phoneError}</p> : null}
            <p className="mt-[0.4rem] text-caption text-subtle">
              A payment request is sent to your handset. Nothing is charged until you approve it.
            </p>
          </div>
        ) : null}

        {!settled && !cashRecorded ? (
          <div className="mt-[0.9rem] flex flex-wrap items-center gap-[0.6rem] border-t border-line pt-[0.9rem]">
            <Button
              variant="ghost"
              onClick={() => start.mutate('cash')}
              disabled={start.isPending}
            >
              <Clock className="size-4" aria-hidden="true" />
              Pay at the studio instead
            </Button>
            <span className="text-caption text-subtle">
              The studio marks it paid when you arrive.
            </span>
          </div>
        ) : null}

        {cashRecorded ? (
          <Alert tone="info" className="mt-[0.8rem]">
            <span className="flex items-center gap-[0.4rem]">
              <Clock className="size-4" aria-hidden="true" />
              The studio will confirm {money(total)} as paid when you arrive.
            </span>
          </Alert>
        ) : null}
      </div>
    </div>
  )
}

