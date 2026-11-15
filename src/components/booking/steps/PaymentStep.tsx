import type { PaymentMethod, PaymentPlan } from '../../../lib/booking'
import {
  BOOKING_PERCENT_MAX,
  BOOKING_PERCENT_MIN,
  bookingPercentValid,
  bookingPaymentAmount,
  outstandingBalance,
  paymentPlanLabel,
  recordedAmount,
  validateMpesaCode,
} from '../../../lib/booking'
import { cn } from '../../../lib/cn'
import { money } from '../../../lib/format'
import { Field, Input, Textarea } from '../../ui/field'
import { StepHeading } from './shared'
import type { BookingWizardApi } from '../use-booking-wizard'

const PLANS: { key: PaymentPlan; label: string; hint: string }[] = [
  { key: 'full', label: 'Paid in full', hint: 'The whole amount received now' },
  { key: 'booking', label: 'Booking payment', hint: 'A percentage now, the rest after' },
  { key: 'after', label: 'After service payment', hint: 'Nothing recorded now' },
]

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'mpesa', label: 'M-Pesa' },
  { key: 'cash', label: 'Cash' },
  { key: 'other', label: 'Other' },
]

/**
 * Step 4 — recording what the customer paid.
 *
 * Nothing is pushed to anyone's phone: the customer pays outside the app and the
 * owner records what arrived. The amount is never typed — the server computes it
 * from the booking's services — so the only figures shown are the total due and
 * the balance that follows.
 *
 * "M-Pesa" records a manual M-PESA payment, and is offered only when the
 * business has configured its own M-PESA details; without them the API would
 * send a Daraja prompt to the customer's handset, which is not what this step
 * does. The transaction code is validated here and travels as part of the pasted
 * confirmation — the one thing the API accepts a code from — so a typed code is
 * never presented as settled money on its own.
 */
export function PaymentStep({ wizard }: { wizard: BookingWizardApi }) {
  const { draft } = wizard
  const total = recordedAmount({ ...draft, plan: 'full' })
  const recorded = recordedAmount(draft)
  const balance = outstandingBalance(draft)
  const deposit = bookingPaymentAmount(total, draft.percent)
  const codeIssue = validateMpesaCode(draft.transactionCode)
  const scanned = wizard.scannedConfirmation

  return (
    <div>
      <StepHeading
        title="Record payment"
        hint="The customer pays you directly. Record what you received."
      />

      <div className="mb-[1.2rem] grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface">
        <div className="border-r border-line p-[0.9rem]">
          <p className="eyebrow">Total due</p>
          <b className="text-metric mt-[0.2rem] block tabular">{money(total)}</b>
        </div>
        <div className="p-[0.9rem]">
          <p className="eyebrow">Balance after</p>
          <b className="text-metric mt-[0.2rem] block tabular">{money(balance)}</b>
        </div>
      </div>

      <p className="label">Payment type</p>
      <div className="bkw-choice-grid three" role="radiogroup" aria-label="Payment type">
        {PLANS.map((plan) => (
          <button
            key={plan.key}
            type="button"
            role="radio"
            aria-checked={draft.plan === plan.key}
            className={cn('bkw-choice', draft.plan === plan.key && 'is-on')}
            onClick={() => wizard.setPlan(plan.key)}
          >
            <span className="min-w-0">
              <b className="block font-semibold">{plan.label}</b>
              <small className="block text-meta text-muted">{plan.hint}</small>
            </span>
          </button>
        ))}
      </div>

      {draft.plan === 'after' ? (
        <div className="bkw-note warn mt-[1rem]">
          No payment is recorded now. The full <b className="tabular">{money(total)}</b> is
          collected after the service, and the server records it as outstanding against this
          booking.
        </div>
      ) : (
        <>
          <p className="label mt-[1.2rem]">Payment method</p>
          <div className="bkw-choice-grid three" role="group" aria-label="Payment method">
            {METHODS.map((method) => {
              const unavailable = method.key === 'mpesa' && !wizard.manualMpesaConfigured
              return (
                <button
                  key={method.key}
                  type="button"
                  aria-pressed={draft.method === method.key}
                  disabled={unavailable}
                  className={cn('bkw-choice justify-center', draft.method === method.key && 'is-on')}
                  onClick={() => wizard.setMethod(method.key)}
                >
                  <b>{method.label}</b>
                </button>
              )
            })}
          </div>

          {!wizard.manualMpesaConfigured ? (
            <p className="mt-[0.5rem] text-meta text-muted">
              M-Pesa can be recorded once the business has its PayBill, Till or Send Money details
              set in Settings → Payments.
            </p>
          ) : null}

          <div className="bkw-choice-grid two mt-[1rem]">
            {draft.plan === 'booking' ? (
              <Field
                label="Booking percentage"
                htmlFor="bkw-percent"
                hint={`1 to ${BOOKING_PERCENT_MAX}. The rest is due after the service.`}
                error={
                  bookingPercentValid(draft.percent)
                    ? undefined
                    : `Enter a whole number between ${BOOKING_PERCENT_MIN} and ${BOOKING_PERCENT_MAX}.`
                }
              >
                <Input
                  id="bkw-percent"
                  type="number"
                  inputMode="numeric"
                  min={BOOKING_PERCENT_MIN}
                  max={BOOKING_PERCENT_MAX}
                  value={draft.percent}
                  onChange={(event) => wizard.setPercent(Number(event.target.value))}
                />
              </Field>
            ) : null}

            <Field label="Amount received" htmlFor="bkw-amount">
              <div className="bkw-readonly tabular" id="bkw-amount">
                {money(recorded)}
              </div>
            </Field>

            {draft.method === 'mpesa' ? (
              <>
                <Field
                  label="M-Pesa transaction code"
                  htmlFor="bkw-code"
                  error={draft.transactionCode.length === 10 ? undefined : (codeIssue ?? undefined)}
                  hint="10 characters, letters and digits."
                >
                  <Input
                    id="bkw-code"
                    className="bkw-receipt-mono"
                    maxLength={10}
                    autoComplete="off"
                    autoCapitalize="characters"
                    placeholder="e.g. QGH7X2K9LM"
                    value={draft.transactionCode}
                    onChange={(event) => wizard.setTransactionCode(event.target.value)}
                  />
                </Field>
                <Field label="Payer phone number" htmlFor="bkw-payer">
                  <Input
                    id="bkw-payer"
                    type="tel"
                    inputMode="tel"
                    value={draft.payerPhone}
                    onChange={(event) => wizard.setPayerPhone(event.target.value)}
                  />
                </Field>
              </>
            ) : null}
          </div>
        </>
      )}


      {draft.plan !== 'after' && draft.method === 'mpesa' ? (
        <div className="col-span-full mt-[0.9rem]">
          <Field
            label="M-Pesa confirmation"
            htmlFor="bkw-confirm"
            optional
            hint="Paste the confirmation message and the code above is checked against it. The payment is verified in Payments before it counts as received."
          >
            <Textarea
              id="bkw-confirm"
              rows={2}
              value={draft.confirmation}
              onChange={(event) => wizard.setConfirmation(event.target.value)}
              placeholder="QGH7X2K9LM Confirmed. Ksh1,410.00 sent to AURELIA LUXE on 12/5/26 at 9:31 AM"
            />
          </Field>
          {scanned && draft.confirmation.trim() ? (
            <p
              className={cn(
                'mt-[0.35rem] text-meta',
                scanned.ok ? 'text-success-ink' : 'text-danger-ink',
              )}
              role="status"
            >
              {scanned.ok
                ? `Reads as ${scanned.transactionCode} · ${money(scanned.amount ?? 0)}.`
                : scanned.error}
            </p>
          ) : null}
        </div>
      ) : draft.plan !== 'after' && draft.method === 'other' ? (
        <div className="mt-[0.9rem]">
          <Field label="Reference" htmlFor="bkw-ref" optional>
            <Input
              id="bkw-ref"
              value={draft.reference}
              onChange={(event) => wizard.setReference(event.target.value)}
            />
          </Field>
        </div>
      ) : null}

      <dl className="bkw-note mt-[1rem]">
        <div className="flex justify-between gap-[1rem] py-[0.2rem]">
          <dt className="text-muted">Payment plan</dt>
          <dd className="font-medium">{paymentPlanLabel(draft)}</dd>
        </div>
        {draft.plan === 'booking' ? (
          <div className="flex justify-between gap-[1rem] py-[0.2rem]">
            <dt className="text-muted">
              {draft.percent}% of {money(total)}
            </dt>
            <dd className="tabular font-medium">{money(deposit)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-[1rem] py-[0.2rem]">
          <dt className="text-muted">Recorded now</dt>
          <dd className="tabular font-medium">{money(recorded)}</dd>
        </div>
        <div className="flex justify-between gap-[1rem] py-[0.2rem]">
          <dt className="text-muted">Outstanding</dt>
          <dd className="tabular font-medium">{money(balance)}</dd>
        </div>
      </dl>

      {draft.plan !== 'after' && draft.method === 'mpesa' ? (
        <p className="mt-[0.8rem] text-meta text-muted">
          Nothing is sent to the customer&rsquo;s phone from here. The payment stays pending until
          its confirmation is verified in Payments.
        </p>
      ) : null}
    </div>
  )
}
