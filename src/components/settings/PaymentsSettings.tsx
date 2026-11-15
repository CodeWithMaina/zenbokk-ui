import { Loader2, Smartphone, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Disclosure } from '../ui/disclosure'
import { Field, FieldHint, Input, Select, Textarea } from '../ui/field'
import { MetricGrid } from '../ui/metric-tile'
import { Skeleton } from '../ui/skeleton'
import { Switch } from '../ui/switch'
import { ApiError, errorMessage } from '../../lib/api/client'
import { money } from '../../lib/format'
import { usePaymentConfig, useSavePaymentConfig } from '../../lib/payments/api'
import type { PaymentConfig, PublicPaymentDetails, SavePaymentConfig } from '../../lib/payments/api'
import {
  MANUAL_MPESA,
  MPESA_FIELD,
  formatKenyanPhone,
  normaliseKenyanPhone,
  normaliseMethod,
  validateMpesaDraft,
  type ManualMpesaMethod,
  type MpesaFieldKey,
} from '../../lib/payments/validation'
import { cn } from '../../lib/cn'
import { MpesaInstructions } from '../storefront/booking/MpesaInstructions'

/** A sample bill the fee preview is calculated against. */
const SAMPLE_TOTAL = 2000

const PERCENTAGE_PRESETS = [0, 25, 50, 100] as const

const METHOD_OPTIONS: ReadonlyArray<{ value: ManualMpesaMethod; label: string; helper: string }> = [
  {
    value: MANUAL_MPESA.paybill,
    label: 'PayBill',
    helper: 'Customers pay your business number and an account reference.',
  },
  {
    value: MANUAL_MPESA.till,
    label: 'Till',
    helper: 'Customers pay your till via Buy Goods and Services.',
  },
  {
    value: MANUAL_MPESA.sendMoney,
    label: 'Send Money',
    helper: 'Customers send money to your M-PESA number.',
  },
]

type Draft = {
  cashEnabled: boolean
  manualMpesaEnabled: boolean
  mpesaAccountType: ManualMpesaMethod
  mpesaPaybillNumber: string
  mpesaPaybillAccount: string
  mpesaTillNumber: string
  mpesaPhoneNumber: string
  mpesaPayeeName: string
  mpesaInstructions: string
  bookingFeePercentage: string
  /** Daraja/STK path — optional, and only for businesses with a Safaricom account. */
  mpesaEnabled: boolean
  mpesaShortCode: string
  consumerKey: string
  consumerSecret: string
  passkey: string
  /** Storefront policy: customers may pay during the booking. */
  payUpfrontEnabled: boolean
  /** Storefront policy: customers may book now and settle after the service. */
  payAfterServiceEnabled: boolean
}

/**
 * The method the form should open on. Mirrors the server's resolution so a legacy
 * row (stored "paybill" but collecting on a Till) opens on the method it actually
 * uses, rather than showing an empty PayBill.
 */
function resolveDraftMethod(config: PaymentConfig): ManualMpesaMethod {
  const type = normaliseMethod(config.mpesaAccountType)
  const hasPaybill = Boolean(config.mpesaPaybillNumber && config.mpesaPaybillAccount)
  const hasTill = Boolean(config.mpesaTillNumber)
  const hasPhone = Boolean(config.mpesaPhoneNumber)

  if (type === MANUAL_MPESA.till && hasTill) return MANUAL_MPESA.till
  if (type === MANUAL_MPESA.sendMoney && hasPhone) return MANUAL_MPESA.sendMoney
  if (type === MANUAL_MPESA.paybill && hasPaybill) return MANUAL_MPESA.paybill
  if (hasPaybill) return MANUAL_MPESA.paybill
  if (hasTill) return MANUAL_MPESA.till
  if (hasPhone) return MANUAL_MPESA.sendMoney
  return type
}

function toDraft(config: PaymentConfig): Draft {
  return {
    cashEnabled: config.cashEnabled,
    manualMpesaEnabled: config.manualMpesaEnabled,
    mpesaAccountType: resolveDraftMethod(config),
    mpesaPaybillNumber: config.mpesaPaybillNumber ?? '',
    mpesaPaybillAccount: config.mpesaPaybillAccount ?? '',
    mpesaTillNumber: config.mpesaTillNumber ?? '',
    mpesaPhoneNumber: config.mpesaPhoneNumber ?? '',
    mpesaPayeeName: config.mpesaPayeeName ?? '',
    mpesaInstructions: config.mpesaInstructions ?? '',
    bookingFeePercentage: String(config.bookingFeePercentage ?? 0),
    mpesaEnabled: config.mpesaEnabled,
    mpesaShortCode: config.mpesaShortCode ?? '',
    payUpfrontEnabled: config.payUpfrontEnabled,
    payAfterServiceEnabled: config.payAfterServiceEnabled,
    // Secrets are never returned, so these always start blank: typing one replaces it.
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
  }
}

/** The fields the user actually edits; secrets are excluded from the dirty check. */
function comparable(draft: Draft): string {
  const { consumerKey: _k, consumerSecret: _s, passkey: _p, ...rest } = draft
  return JSON.stringify(rest)
}

/** Read the per-field messages the server returned on `error.fields`. */
function fieldErrorsFrom(error: unknown): Partial<Record<MpesaFieldKey, string>> {
  if (error instanceof ApiError && error.details && typeof error.details === 'object') {
    return error.details as Partial<Record<MpesaFieldKey, string>>
  }
  return {}
}

/**
 * How the business wants to be paid.
 *
 * This is the screen that makes the storefront's M-PESA flow reachable at all: until
 * a method is chosen and completed here the booking page has nothing to show a
 * customer. A single method is chosen (PayBill, Till or Send Money); only that
 * method's fields are shown, and the business can switch methods without losing the
 * other method's saved values. A live preview renders the real storefront component,
 * so the owner sees exactly what a customer sees.
 */
export function PaymentsSettings({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const config = usePaymentConfig()
  const save = useSavePaymentConfig()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [saved, setSaved] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [serverFieldErrors, setServerFieldErrors] = useState<Partial<Record<MpesaFieldKey, string>>>({})

  useEffect(() => {
    if (!config.data) return
    const next = toDraft(config.data)
    setDraft(next)
    setSaved(next)
    setServerFieldErrors({})
  }, [config.data])

  const dirty = Boolean(draft && saved && comparable(draft) !== comparable(saved))

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  const clientErrors = useMemo(
    () => (draft ? validateMpesaDraft(draft) : {}),
    [draft],
  )

  function patch(changes: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...changes } : current))
    setError(null)
    setServerFieldErrors({})
  }

  if (config.isLoading || !draft) {
    return (
      <div className="flex flex-col gap-[0.8rem]">
        <Skeleton className="h-[7rem] rounded-card" />
        <Skeleton className="h-[12rem] rounded-card" />
      </div>
    )
  }

  if (config.isError) {
    return (
      <Alert tone="danger">
        {errorMessage(config.error, 'Could not load your payment settings.')}
      </Alert>
    )
  }

  const percentage = Number(draft.bookingFeePercentage)
  const percentageValid = Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
  const feePreview = percentageValid ? Math.round((SAMPLE_TOTAL * percentage) / 100) : 0

  const fieldErrors = { ...clientErrors, ...serverFieldErrors }
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  /**
   * The one combination the storefront cannot work with. Mirrored from the server, which
   * refuses it outright (a business may not leave customers with no way to book); showing
   * it here means the owner is told before saving rather than by a rejected request.
   */
  const paymentOptionsValid = draft.payUpfrontEnabled || draft.payAfterServiceEnabled
  const canSave =
    !save.isPending && percentageValid && paymentOptionsValid && !hasFieldErrors

  /** Exactly what the storefront would render for the current draft values. */
  const previewDetails: PublicPaymentDetails = {
    businessId: 'preview',
    businessName: '',
    currency: 'KES',
    enabled: draft.manualMpesaEnabled,
    accountType: draft.manualMpesaEnabled ? draft.mpesaAccountType : null,
    paybillNumber: draft.mpesaPaybillNumber.trim() || null,
    paybillAccount: draft.mpesaPaybillAccount.trim() || null,
    tillNumber: draft.mpesaTillNumber.trim() || null,
    phoneNumber: normaliseKenyanPhone(draft.mpesaPhoneNumber),
    payeeName: draft.mpesaPayeeName.trim() || null,
    instructions: draft.mpesaInstructions.trim() || null,
    bookingFeePercentage: percentageValid ? percentage : 0,
    cashEnabled: draft.cashEnabled,
    payUpfrontEnabled: draft.payUpfrontEnabled,
    payAfterServiceEnabled: draft.payAfterServiceEnabled,
    bookingAvailable: paymentOptionsValid,
    offersPaymentChoice: draft.payUpfrontEnabled && draft.payAfterServiceEnabled,
  }

  function submit() {
    if (!draft || !canSave) return
    setError(null)
    setServerFieldErrors({})

    const body: SavePaymentConfig = {
      cashEnabled: draft.cashEnabled,
      mpesaEnabled: draft.mpesaEnabled,
      mpesaAccountType: draft.mpesaAccountType,
      mpesaShortCode: draft.mpesaShortCode.trim() || null,
      manualMpesaEnabled: draft.manualMpesaEnabled,
      mpesaPaybillNumber: draft.mpesaPaybillNumber.trim() || null,
      mpesaPaybillAccount: draft.mpesaPaybillAccount.trim() || null,
      mpesaTillNumber: draft.mpesaTillNumber.trim() || null,
      mpesaPhoneNumber: draft.mpesaPhoneNumber.trim() || null,
      mpesaPayeeName: draft.mpesaPayeeName.trim() || null,
      mpesaInstructions: draft.mpesaInstructions.trim() || null,
      bookingFeePercentage: percentage,
      payUpfrontEnabled: draft.payUpfrontEnabled,
      payAfterServiceEnabled: draft.payAfterServiceEnabled,
      // Secrets are only sent when the owner typed a new one, so an untouched field
      // cannot wipe a working credential.
      consumerKey: draft.consumerKey.trim() || null,
      consumerSecret: draft.consumerSecret.trim() || null,
      passkey: draft.passkey.trim() || null,
    }

    save.mutate(body, {
      onSuccess: (next) => {
        const fresh = toDraft(next)
        setDraft(fresh)
        setSaved(fresh)
        setServerFieldErrors({})
        toast.success('Payment settings saved.')
      },
      onError: (failure) => {
        const fields = fieldErrorsFrom(failure)
        if (Object.keys(fields).length > 0) setServerFieldErrors(fields)
        setError(errorMessage(failure, 'We could not save your payment settings.'))
      },
    })
  }

  return (
    <div className="flex flex-col gap-[1rem]">
      <Card className="p-[1rem]">
        <h2 className="text-label font-semibold">How customers pay</h2>
        <p className="mt-[0.2rem] text-meta text-muted">
          These are the channels your storefront offers at checkout.
        </p>

        <MetricGrid
          className="mt-[0.8rem]"
          items={[
            { value: money(feePreview), label: `Fee on a ${money(SAMPLE_TOTAL)} bill` },
            { value: `${percentageValid ? percentage : 0}%`, label: 'Paid up front' },
            { value: draft.manualMpesaEnabled ? 'On' : 'Off', label: 'M-PESA payments' },
          ]}
        />
      </Card>

      <Card className="p-[1rem]">
        <div className="flex flex-wrap items-start justify-between gap-[0.6rem]">
          <div className="min-w-0">
            <h2 className="text-label font-semibold">M-PESA payments</h2>
            <p className="mt-[0.2rem] text-meta text-muted">
              Customers send the booking fee to your own PayBill, Till or M-PESA number, then paste
              the M-PESA message. You confirm it in your payments queue. No Safaricom account needed.
            </p>
          </div>
          <Switch
            label="Accept M-PESA payments"
            checked={draft.manualMpesaEnabled}
            onCheckedChange={(next) => patch({ manualMpesaEnabled: next })}
          />
        </div>

        {draft.manualMpesaEnabled ? (
          <>
            <div className="mt-[1rem]">
              <span className="label">How customers pay you</span>
              <div
                role="radiogroup"
                aria-label="M-PESA method"
                className="mt-[0.4rem] grid gap-[0.6rem] sm:grid-cols-3"
              >
                {METHOD_OPTIONS.map((option) => {
                  const selected = draft.mpesaAccountType === option.value
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'flex cursor-pointer flex-col gap-[0.2rem] rounded-lg border p-[0.7rem] transition-colors duration-200',
                        selected ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:bg-hover',
                      )}
                    >
                      <input
                        type="radio"
                        name="mpesa-method"
                        value={option.value}
                        checked={selected}
                        onChange={() => patch({ mpesaAccountType: option.value })}
                        className="sr-only"
                      />
                      <span className={cn('text-label font-semibold', selected ? 'text-accent-ink' : 'text-fg')}>
                        {option.label}
                      </span>
                      <span className="text-caption text-muted">{option.helper}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="mt-[1rem] grid gap-[0.9rem] sm:grid-cols-2">
              {draft.mpesaAccountType === MANUAL_MPESA.paybill ? (
                <>
                  <Field
                    label="PayBill number"
                    htmlFor="pay-paybill"
                    error={fieldErrors[MPESA_FIELD.paybillNumber]}
                    hint="The business number customers pay."
                  >
                    <Input
                      id="pay-paybill"
                      inputMode="numeric"
                      value={draft.mpesaPaybillNumber}
                      placeholder="247247"
                      invalid={Boolean(fieldErrors[MPESA_FIELD.paybillNumber])}
                      onChange={(event) => patch({ mpesaPaybillNumber: event.target.value })}
                    />
                  </Field>
                  <Field
                    label="PayBill account number"
                    htmlFor="pay-paybill-account"
                    error={fieldErrors[MPESA_FIELD.paybillAccount]}
                    hint="What the customer types as the account."
                  >
                    <Input
                      id="pay-paybill-account"
                      value={draft.mpesaPaybillAccount}
                      placeholder="AURELIA-1042"
                      invalid={Boolean(fieldErrors[MPESA_FIELD.paybillAccount])}
                      onChange={(event) => patch({ mpesaPaybillAccount: event.target.value })}
                    />
                  </Field>
                </>
              ) : draft.mpesaAccountType === MANUAL_MPESA.till ? (
                <Field
                  label="Till number"
                  htmlFor="pay-till"
                  error={fieldErrors[MPESA_FIELD.tillNumber]}
                  hint="Customers choose Buy Goods and Services."
                >
                  <Input
                    id="pay-till"
                    inputMode="numeric"
                    value={draft.mpesaTillNumber}
                    placeholder="5123456"
                    invalid={Boolean(fieldErrors[MPESA_FIELD.tillNumber])}
                    onChange={(event) => patch({ mpesaTillNumber: event.target.value })}
                  />
                </Field>
              ) : (
                <Field
                  label="M-PESA number"
                  htmlFor="pay-phone"
                  error={fieldErrors[MPESA_FIELD.phoneNumber]}
                  hint="Any format works; we group it as 0712 440 001."
                >
                  <Input
                    id="pay-phone"
                    inputMode="tel"
                    value={draft.mpesaPhoneNumber}
                    placeholder="0712 440 001"
                    invalid={Boolean(fieldErrors[MPESA_FIELD.phoneNumber])}
                    onChange={(event) => patch({ mpesaPhoneNumber: event.target.value })}
                    onBlur={() => {
                      const normalised = normaliseKenyanPhone(draft.mpesaPhoneNumber)
                      if (normalised) patch({ mpesaPhoneNumber: formatKenyanPhone(normalised) })
                    }}
                  />
                </Field>
              )}

              <Field
                label="Name customers will see"
                htmlFor="pay-payee"
                error={fieldErrors[MPESA_FIELD.payeeName]}
                hint="The name customers should see before they confirm."
              >
                <Input
                  id="pay-payee"
                  value={draft.mpesaPayeeName}
                  placeholder="NURU STUDIO"
                  invalid={Boolean(fieldErrors[MPESA_FIELD.payeeName])}
                  onChange={(event) => patch({ mpesaPayeeName: event.target.value })}
                />
              </Field>

              <Field
                className="sm:col-span-2"
                label="Extra instructions"
                htmlFor="pay-instructions"
                optional
                error={fieldErrors[MPESA_FIELD.instructions]}
              >
                <Textarea
                  id="pay-instructions"
                  rows={2}
                  value={draft.mpesaInstructions}
                  placeholder="Send the booking fee, then paste the SMS on this page."
                  invalid={Boolean(fieldErrors[MPESA_FIELD.instructions])}
                  onChange={(event) => patch({ mpesaInstructions: event.target.value })}
                />
              </Field>
            </div>

            <div className="mt-[1rem]">
              <Disclosure summary="Preview what customers see">
                <MpesaInstructions
                  details={previewDetails}
                  amount={feePreview}
                  serviceTotal={SAMPLE_TOTAL}
                />
              </Disclosure>
            </div>

          </>
        ) : null}
      </Card>


      <Card className="p-[1rem]">
        <h2 className="text-label font-semibold">How customers can pay</h2>
        <p className="mt-[0.2rem] text-meta text-muted">
          These two choices decide what your booking page asks for. They are independent —
          switch on one, the other, or both.
        </p>

        <div className="mt-[0.9rem] space-y-[0.8rem]">
          <div className="flex flex-wrap items-start justify-between gap-[0.6rem]">
            <div className="min-w-0">
              <p className="text-label font-semibold">Payment Included</p>
              <p className="mt-[0.15rem] text-meta text-muted">
                Customers pay during the booking, using the details configured below. Until
                a payment is verified it stays pending — nothing is marked paid early.
              </p>
            </div>
            <Switch
              label="Payment Included"
              checked={draft.payUpfrontEnabled}
              onCheckedChange={(next) => patch({ payUpfrontEnabled: next })}
            />
          </div>

          <div className="flex flex-wrap items-start justify-between gap-[0.6rem]">
            <div className="min-w-0">
              <p className="text-label font-semibold">Pay After Service</p>
              <p className="mt-[0.15rem] text-meta text-muted">
                Customers book a slot now and settle after their appointment. Each of these
                bookings appears in Payments straight away with the amount outstanding.
              </p>
            </div>
            <Switch
              label="Pay After Service"
              checked={draft.payAfterServiceEnabled}
              onCheckedChange={(next) => patch({ payAfterServiceEnabled: next })}
            />
          </div>
        </div>

        {paymentOptionsValid ? (
          <FieldHint>
            {draft.payUpfrontEnabled && draft.payAfterServiceEnabled
              ? 'Customers choose how they want to pay.'
              : draft.payUpfrontEnabled
                ? 'Customers pay during booking — they are not asked to choose.'
                : 'Customers book now and pay after the service — they are not asked to choose.'}
          </FieldHint>
        ) : (
          <p className="mt-[0.7rem] text-meta font-semibold text-danger-ink" role="alert">
            Keep at least one option on. With both off, your booking page cannot take
            bookings and customers are told to contact you directly.
          </p>
        )}
      </Card>

      <Card className="p-[1rem]">
        <h2 className="text-label font-semibold">Booking fee</h2>
        <p className="mt-[0.2rem] text-meta text-muted">
          The share of a booking a customer pays when they book; the rest is settled at the
          appointment. 0 collects nothing up front.
        </p>

        <div className="mt-[0.8rem] flex flex-wrap items-end gap-[0.7rem]">
          <Field
            label="Percentage"
            htmlFor="pay-fee"
            error={percentageValid ? null : 'Enter a number between 0 and 100.'}
          >
            <Input
              id="pay-fee"
              className="w-[8rem]"
              inputMode="decimal"
              value={draft.bookingFeePercentage}
              invalid={!percentageValid}
              onChange={(event) => patch({ bookingFeePercentage: event.target.value })}
            />
          </Field>
          <div className="flex flex-wrap gap-[0.35rem]">
            {PERCENTAGE_PRESETS.map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant={percentage === preset ? 'primary' : 'ghost'}
                onClick={() => patch({ bookingFeePercentage: String(preset) })}
              >
                {preset}%
              </Button>
            ))}
          </div>
        </div>
        <FieldHint>
          On a {money(SAMPLE_TOTAL)} booking, customers pay {money(feePreview)} now.
        </FieldHint>
      </Card>

      <Card className="p-[1rem]">
        <div className="flex flex-wrap items-start justify-between gap-[0.6rem]">
          <div className="min-w-0">
            <h2 className="text-label font-semibold">Cash</h2>
            <p className="mt-[0.2rem] text-meta text-muted">
              Customers can settle everything at the appointment instead.
            </p>
          </div>
          <Switch
            label="Accept cash"
            checked={draft.cashEnabled}
            onCheckedChange={(next) => patch({ cashEnabled: next })}
          />
        </div>
      </Card>

      <Card className="p-[1rem]">
        <div className="flex flex-wrap items-start justify-between gap-[0.6rem]">
          <div className="min-w-0">
            <h2 className="flex items-center gap-[0.4rem] text-label font-semibold">
              <Smartphone className="size-4" aria-hidden="true" />
              M-PESA prompt (Safaricom)
            </h2>
            <p className="mt-[0.2rem] text-meta text-muted">
              Only for a business Safaricom has given a shortcode and Daraja credentials to. The
              platform then sends the payment request to the customer’s phone itself.
            </p>
          </div>
          <Switch
            label="Send M-PESA prompts"
            checked={draft.mpesaEnabled}
            onCheckedChange={(next) => patch({ mpesaEnabled: next })}
          />
        </div>

        {draft.mpesaEnabled ? (
          <div className="mt-[1rem] grid gap-[0.9rem] sm:grid-cols-2">
            <Field label="Shortcode type" htmlFor="pay-type">
              <Select
                id="pay-type"
                value={draft.mpesaAccountType === MANUAL_MPESA.sendMoney ? MANUAL_MPESA.paybill : draft.mpesaAccountType}
                onChange={(event) => patch({ mpesaAccountType: normaliseMethod(event.target.value) })}
              >
                <option value="paybill">PayBill</option>
                <option value="till">Till</option>
              </Select>
            </Field>
            <Field label="Shortcode" htmlFor="pay-shortcode">
              <Input
                id="pay-shortcode"
                inputMode="numeric"
                value={draft.mpesaShortCode}
                onChange={(event) => patch({ mpesaShortCode: event.target.value })}
              />
            </Field>
            <Field
              label="Consumer key"
              htmlFor="pay-key"
              optional
              hint={config.data?.hasCredentials ? 'Stored — type a new one to replace it.' : undefined}
            >
              <Input
                id="pay-key"
                autoComplete="off"
                value={draft.consumerKey}
                onChange={(event) => patch({ consumerKey: event.target.value })}
              />
            </Field>
            <Field label="Consumer secret" htmlFor="pay-secret" optional>
              <Input
                id="pay-secret"
                type="password"
                autoComplete="off"
                value={draft.consumerSecret}
                onChange={(event) => patch({ consumerSecret: event.target.value })}
              />
            </Field>
            <Field label="STK passkey" htmlFor="pay-passkey" optional>
              <Input
                id="pay-passkey"
                type="password"
                autoComplete="off"
                value={draft.passkey}
                onChange={(event) => patch({ passkey: event.target.value })}
              />
            </Field>
          </div>
        ) : null}
      </Card>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="flex flex-wrap items-center gap-[0.6rem]">
        <Button variant="primary" onClick={submit} disabled={!canSave}>
          {save.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Wallet className="size-4" aria-hidden="true" />
          )}
          Save payment settings
        </Button>
        <span className="text-meta text-subtle">{dirty ? 'Unsaved changes' : 'Saved'}</span>
      </div>


    </div>
  )
}

