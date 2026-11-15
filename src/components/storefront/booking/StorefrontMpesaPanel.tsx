import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage } from '../../../lib/api/client'
import { usePaymentStatus, usePublicPaymentDetails } from '../../../lib/payments/api'
import type { Payment } from '../../../lib/payments/api'
import { publicBookingApi } from '../../../lib/storefront/api'
import { scanMpesaMessage } from '../../../lib/payments/mpesa-message'
import { Alert } from '../../ui/alert'
import { Button } from '../../ui/button'
import { MpesaInstructions } from './MpesaInstructions'
import { MpesaConfirmationField } from './MpesaConfirmationField'

export type StorefrontMpesaPanelProps = {
  businessId: string
  appointmentId: string
  /** Total the server computed for the appointment's services. */
  serviceTotal: number
  /** Server-computed booking fee (the configured percentage of `serviceTotal`). */
  bookingFee: number
  /**
   * The booking-fee payment the server created as part of the booking, when it reported one.
   *
   * Nothing secret is carried here: the paste is attached to the appointment through the public
   * payment-proof route and the server decides which of the appointment's payments the evidence
   * belongs to. The id only lets the panel follow that payment's verification state live.
   */
  paymentId?: string | null
  /**
   * A confirmation the customer already pasted in the booking wizard.
   *
   * When present the panel submits it without a tap, which is what makes the paste part of the
   * booking flow rather than a chore after it. A failure here never undoes the booking — the
   * appointment stands, the slot is held, and the panel offers the retry with the text still in
   * place.
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
  paymentId,
  autoSubmitMessage,
}: StorefrontMpesaPanelProps) {
  const details = usePublicPaymentDetails(businessId)
  const queryClient = useQueryClient()
  // The payment the booking already carries, plus one a paste itself may have produced (a fee
  // added for an appointment that had none yet) — the panel follows whichever the server names.
  const [pastedPaymentId, setPastedPaymentId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [message, setMessage] = useState(() => autoSubmitMessage?.trim() ?? '')

  // The pasted SMS is scanned as it is typed; only a message that reads like a
  // genuine confirmation can be submitted.
  const scan = useMemo(() => scanMpesaMessage(message), [message])

  const status = usePaymentStatus(paymentId ?? pastedPaymentId ?? null)
  const started = revealed || Boolean(paymentId) || Boolean(pastedPaymentId)

  const submit = useMutation({
    mutationFn: (body: { message: string }) =>
      publicBookingApi.submitPaymentProof(businessId, appointmentId, { message: body.message }),
    onSuccess: (response) => {
      // The server is the authority on which payment the evidence landed on, so the id it
      // returns is the one the status below follows.
      if (response.payment) {
        setPastedPaymentId(response.payment.id)
        queryClient.setQueryData(['payments', 'payment', response.payment.id], response.payment)
      }
      void queryClient.invalidateQueries({
        queryKey: ['payments', 'appointment', appointmentId],
      })
      setMessage('')
    },
  })

  // The wizard already collected the confirmation, so carry it through without asking the
  // customer to paste it a second time. Guarded so a re-render (or StrictMode's double invoke)
  // cannot submit twice; the server treats a repeated paste as evidence for the same payment,
  // never as a second one.
  const carried = useRef(false)
  const handedOver = autoSubmitMessage?.trim() ?? ''
  useEffect(() => {
    if (carried.current || handedOver.length === 0) return
    if (!details.data?.enabled) return
    // Only a message that reads like a genuine confirmation is carried: the wizard
    // already scanned it, and this re-checks in case it was edited. Anything else is
    // left for the customer to paste correctly below.
    if (!scanMpesaMessage(handedOver).ok) return
    carried.current = true

    void (async () => {
      try {
        await submit.mutateAsync({ message: handedOver })
      } catch {
        // Deliberately swallowed: the mutation state below already carries the server's own
        // message, and the booking is untouched. The field is revealed so the text stays in
        // place for the retry.
        setRevealed(true)
      }
    })()
  }, [details.data?.enabled, handedOver, submit])

  const payment: Payment | undefined = status.data
  const awaitingReview = payment?.status === 'submitted' || payment?.status === 'under_review'
  const verified = payment?.status === 'verified' || payment?.status === 'success'
  const rejected = payment?.status === 'rejected'
  const working = submit.isPending

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
    <div className="mt-[0.9rem]">
      <MpesaInstructions
        details={details.data}
        amount={bookingFee}
        serviceTotal={serviceTotal}
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

      {submit.isError ? (
        <Alert tone="danger" className="mt-[0.9rem]">
          {errorMessage(submit.error, 'We could not read that message. Paste the whole SMS.')}
        </Alert>
      ) : null}

      {!verified && !awaitingReview ? (
        <div className="mt-[0.9rem]">
          {!started ? (
            <Button
              variant="primary"
              onClick={() => setRevealed(true)}
              disabled={bookingFee <= 0}
            >
              I have paid — continue
            </Button>
          ) : (
            <>
              <MpesaConfirmationField
                id="sf-mpesa-message"
                label="Paste your M-PESA confirmation message"
                value={message}
                onChange={setMessage}
                rows={4}
              />
              <div className="mt-[0.6rem] flex flex-wrap items-center gap-[0.6rem]">
                <Button
                  variant="primary"
                  onClick={() => submit.mutate({ message: message.trim() })}
                  disabled={submit.isPending || !scan.ok}
                >
                  {submit.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Submit for verification
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}