import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../../lib/api/client'
import { paymentsApi, usePaymentStatus, usePublicPaymentDetails } from '../../../lib/payments/api'
import type { Payment } from '../../../lib/payments/api'
import { Alert } from '../../ui/alert'
import { Button } from '../../ui/button'
import { MpesaInstructions } from './MpesaInstructions'

export type StorefrontMpesaPanelProps = {
  businessId: string
  appointmentId: string
  /** Total the server computed for the appointment's services. */
  serviceTotal: number
  /** Server-computed booking fee (the configured percentage of `serviceTotal`). */
  bookingFee: number
  /** Short-lived guest token, when the visitor is booking without an account. */
  guestToken?: string | null
  /**
   * A confirmation the customer already pasted in the booking wizard.
   *
   * When present the panel does the two calls itself, in order and without a tap:
   * create the booking-fee payment, then submit the message. That is what makes the
   * paste part of the booking flow rather than a chore after it. A failure here never
   * undoes the booking — the appointment stands, the slot is held, and the panel
   * offers the retry with the text still in place.
   */
  autoSubmitMessage?: string | null
}

/**
 * Paying a booking fee by M-PESA, the manual way.
 *
 * The customer sends the money themselves using the business's own PayBill or
 * Till, then pastes the confirmation SMS. Three rules shape the whole component:
 *
 *  - **The amount is the server's.** `bookingFee` comes from the appointment's
 *    payment summary, which the API computed from the business's configured
 *    percentage. The browser never sends a money value.
 *  - **A pasted SMS is evidence, not proof.** Submitting moves the payment to
 *    `submitted` and stops there. The copy says so plainly, because a customer who
 *    believes they are already confirmed will not chase the business.
 *  - **Nothing is shown that cannot be followed.** If the business has not
 *    configured a PayBill or Till, the panel renders no numbers at all rather than
 *    a half-instruction.
 */
export function StorefrontMpesaPanel({
  businessId,
  appointmentId,
  serviceTotal,
  bookingFee,
  guestToken,
  autoSubmitMessage,
}: StorefrontMpesaPanelProps) {
  const details = usePublicPaymentDetails(businessId)
  const queryClient = useQueryClient()
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [message, setMessage] = useState(() => autoSubmitMessage?.trim() ?? '')

  const status = usePaymentStatus(paymentId)

  const start = useMutation({
    mutationFn: () =>
      paymentsApi.create(
        {
          appointmentId,
          method: 'mpesa',
          type: 'booking_fee',
          // A manual payment is made from the customer's own handset, so no number is
          // required — the platform never dials anything.
          idempotencyKey: `storefront-manual-${appointmentId}`,
        },
        guestToken,
      ),
    onSuccess: (payment) => setPaymentId(payment.id),
  })

  const submit = useMutation({
    mutationFn: (body: { paymentId: string; message: string }) =>
      paymentsApi.submitMpesaMessage(body.paymentId, body.message, guestToken),
    onSuccess: (payment) => {
      queryClient.setQueryData(['payments', 'payment', payment.id], payment)
      setMessage('')
    },
  })

  // The wizard already collected the confirmation, so carry it through without
  // asking the customer to paste it a second time: create the payment, then submit.
  // Guarded so a re-render (or StrictMode's double invoke) cannot open two payments.
  const carried = useRef(false)
  const handedOver = autoSubmitMessage?.trim() ?? ''
  useEffect(() => {
    if (carried.current || handedOver.length === 0) return
    if (!details.data?.enabled) return
    carried.current = true

    void (async () => {
      try {
        const payment = await start.mutateAsync()
        await submit.mutateAsync({ paymentId: payment.id, message: handedOver })
      } catch {
        // Deliberately swallowed: the mutation state below already carries the
        // server's own message, and the booking itself is untouched.
      }
    })()
  }, [details.data?.enabled, handedOver, start, submit])

  const payment: Payment | undefined = status.data
  const awaitingReview = payment?.status === 'submitted' || payment?.status === 'under_review'
  const verified = payment?.status === 'verified' || payment?.status === 'success'
  const rejected = payment?.status === 'rejected'
  const working = start.isPending || submit.isPending

  if (details.isLoading) {
    return (
      <div className="rounded-card border border-line bg-surface p-[1rem]">
        <span className="flex items-center gap-[0.5rem] text-meta text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Checking how this studio takes M-PESA…
        </span>
      </div>
    )
  }

  if (!details.data?.enabled) {
    return (
      <Alert tone="info" className="mt-[1rem]">
        {details.data?.businessName ?? 'This studio'} does not take M-PESA payments through
        Punched. Settle it directly at the studio — nothing is charged here.
      </Alert>
    )
  }

  return (
    <div className="mt-[0.9rem] rounded-card border border-line bg-surface p-[1rem]">
      <MpesaInstructions
        details={details.data}
        amount={bookingFee}
        serviceTotal={serviceTotal}
        showSteps={false}
      />

      {working ? (
        <Alert tone="info" className="mt-[0.9rem]">
          <span className="flex items-center gap-[0.4rem]">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Sending your confirmation to {details.data.businessName}…
          </span>
        </Alert>
      ) : null}

      {verified ? (
        <Alert tone="success" className="mt-[0.9rem]">
          Payment confirmed. Your booking is confirmed.
        </Alert>
      ) : null}

      {awaitingReview ? (
        <Alert tone="warning" className="mt-[0.9rem]">
          Confirmation received. {details.data.businessName} will check it and confirm your
          booking — you will be told either way.
        </Alert>
      ) : null}

      {rejected ? (
        <Alert tone="danger" className="mt-[0.9rem]">
          {payment?.rejectionReason ?? 'That confirmation could not be verified.'} You can pay
          again and paste the new message.
        </Alert>
      ) : null}

      {start.isError ? (
        <Alert tone="danger" className="mt-[0.9rem]">
          {errorMessage(
            start.error,
            'We could not start that payment. You can still pay at the studio.',
          )}
        </Alert>
      ) : null}

      {submit.isError ? (
        <Alert tone="danger" className="mt-[0.9rem]">
          {errorMessage(submit.error, 'We could not read that message. Paste the whole SMS.')}
        </Alert>
      ) : null}

      {!verified && !awaitingReview ? (
        <div className="mt-[0.9rem]">
          {!paymentId ? (
            <Button
              variant="primary"
              onClick={() => start.mutate()}
              disabled={start.isPending || bookingFee <= 0}
            >
              {start.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              I have paid — continue
            </Button>
          ) : (
            <>
              <label className="label" htmlFor="sf-mpesa-message">
                Paste your M-PESA confirmation message
              </label>
              <textarea
                id="sf-mpesa-message"
                className="input min-h-[6rem] w-full"
                value={message}
                placeholder="QJK42NUM01 Confirmed. Ksh500.00 sent to …"
                onChange={(event) => setMessage(event.target.value)}
              />
              <div className="mt-[0.6rem] flex flex-wrap items-center gap-[0.6rem]">
                <Button
                  variant="primary"
                  onClick={() =>
                    paymentId && submit.mutate({ paymentId, message: message.trim() })
                  }
                  disabled={submit.isPending || message.trim().length === 0}
                >
                  {submit.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Submit for verification
                </Button>
                <span className="text-caption text-subtle">
                  Copy the whole SMS, including the transaction code.
                </span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}