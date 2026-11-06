import { Loader2, Smartphone, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Field, FieldHint, Input, Select, Textarea } from '../ui/field'
import { MetricGrid } from '../ui/metric-tile'
import { Skeleton } from '../ui/skeleton'
import { Switch } from '../ui/switch'
import { errorMessage } from '../../lib/api/client'
import { money } from '../../lib/format'
import { usePaymentConfig, useSavePaymentConfig } from '../../lib/payments/api'
import type { PaymentConfig, SavePaymentConfig } from '../../lib/payments/api'

/** A sample bill the fee preview is calculated against. */
const SAMPLE_TOTAL = 2000

const PERCENTAGE_PRESETS = [0, 25, 50, 100] as const

type Draft = {
  cashEnabled: boolean
  manualMpesaEnabled: boolean
  mpesaPaybillNumber: string
  mpesaPaybillAccount: string
  mpesaTillNumber: string
  mpesaPayeeName: string
  mpesaInstructions: string
  bookingFeePercentage: string
  /** Daraja/STK path — optional, and only for businesses with a Safaricom account. */
  mpesaEnabled: boolean
  mpesaAccountType: string
  mpesaShortCode: string
  consumerKey: string
  consumerSecret: string
  passkey: string
}

function toDraft(config: PaymentConfig): Draft {
  return {
    cashEnabled: config.cashEnabled,
    manualMpesaEnabled: config.manualMpesaEnabled,
    mpesaPaybillNumber: config.mpesaPaybillNumber ?? '',
    mpesaPaybillAccount: config.mpesaPaybillAccount ?? '',
    mpesaTillNumber: config.mpesaTillNumber ?? '',
    mpesaPayeeName: config.mpesaPayeeName ?? '',
    mpesaInstructions: config.mpesaInstructions ?? '',
    bookingFeePercentage: String(config.bookingFeePercentage ?? 0),
    mpesaEnabled: config.mpesaEnabled,
    mpesaAccountType: config.mpesaAccountType || 'paybill',
    mpesaShortCode: config.mpesaShortCode ?? '',
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

/**
 * How the business wants to be paid.
 *
 * This is the screen that makes the storefront's M-PESA flow reachable at all: until
 * a PayBill or Till is entered here the booking page has nothing to show a customer
 * and falls back to the platform's other channels. Two independent M-PESA channels
 * are offered and the copy says which is which, because choosing the wrong one is the
 * difference between a customer pasting a confirmation and the platform trying to push
 * a prompt it has no account for.
 */
export function PaymentsSettings({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) {
  const config = usePaymentConfig()
  const save = useSavePaymentConfig()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [saved, setSaved] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!config.data) return
    const next = toDraft(config.data)
    setDraft(next)
    setSaved(next)
  }, [config.data])

  const dirty = Boolean(draft && saved && comparable(draft) !== comparable(saved))

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  function patch(changes: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...changes } : current))
    setError(null)
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

  // A half-configured account is not payable, so the storefront would show nothing.
  // Refuse locally rather than saving a state that looks on but silently does nothing.
  const hasPaybill = draft.mpesaPaybillNumber.trim().length > 0
  const hasTill = draft.mpesaTillNumber.trim().length > 0
  const manualIncomplete = !draft.manualMpesaEnabled
    ? null
    : !hasPaybill && !hasTill
      ? 'Add a PayBill or Till number for customers to send to.'
      : hasPaybill && draft.mpesaPaybillAccount.trim().length === 0
        ? 'A PayBill needs an account number as well as the number itself.'
        : null

  const canSave = !save.isPending && percentageValid && !manualIncomplete

  function submit() {
    if (!draft || !canSave) return
    setError(null)

    const body: SavePaymentConfig = {
      cashEnabled: draft.cashEnabled,
      mpesaEnabled: draft.mpesaEnabled,
      mpesaAccountType: draft.mpesaAccountType,
      mpesaShortCode: draft.mpesaShortCode.trim() || null,
      manualMpesaEnabled: draft.manualMpesaEnabled,
      mpesaPaybillNumber: draft.mpesaPaybillNumber.trim() || null,
      mpesaPaybillAccount: draft.mpesaPaybillAccount.trim() || null,
      mpesaTillNumber: draft.mpesaTillNumber.trim() || null,
      mpesaPayeeName: draft.mpesaPayeeName.trim() || null,
      mpesaInstructions: draft.mpesaInstructions.trim() || null,
      bookingFeePercentage: percentage,
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
        toast.success('Payment settings saved.')
      },
      onError: (failure) =>
        setError(errorMessage(failure, 'We could not save your payment settings.')),
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
            { value: draft.manualMpesaEnabled ? 'On' : 'Off', label: 'M-PESA confirmations' },
          ]}
        />
      </Card>

      <Card className="p-[1rem]">
        <div className="flex flex-wrap items-start justify-between gap-[0.6rem]">
          <div className="min-w-0">
            <h2 className="text-label font-semibold">M-PESA confirmation</h2>
            <p className="mt-[0.2rem] text-meta text-muted">
              Customers send the booking fee to your own PayBill or Till, then paste the M-PESA
              message. You confirm it in your payments queue. No Safaricom account needed.
            </p>
          </div>
          <Switch
            label="Accept M-PESA confirmations"
            checked={draft.manualMpesaEnabled}
            onCheckedChange={(next) => patch({ manualMpesaEnabled: next })}
          />
        </div>

        {draft.manualMpesaEnabled ? (
          <div className="mt-[1rem] grid gap-[0.9rem] sm:grid-cols-2">
            <Field
              label="PayBill number"
              htmlFor="pay-paybill"
              hint="Customers choose Pay Bill. Leave blank to use a Till instead."
            >
              <Input
                id="pay-paybill"
                inputMode="numeric"
                value={draft.mpesaPaybillNumber}
                placeholder="247247"
                onChange={(event) => patch({ mpesaPaybillNumber: event.target.value })}
              />
            </Field>

            <Field
              label="PayBill account number"
              htmlFor="pay-paybill-account"
              hint="What the customer types as the account."
            >
              <Input
                id="pay-paybill-account"
                value={draft.mpesaPaybillAccount}
                placeholder="12345"
                onChange={(event) => patch({ mpesaPaybillAccount: event.target.value })}
              />
            </Field>

            <Field
              label="Till number"
              htmlFor="pay-till"
              hint="Customers choose Buy Goods. Leave blank if you use a PayBill."
            >
              <Input
                id="pay-till"
                inputMode="numeric"
                value={draft.mpesaTillNumber}
                placeholder="556677"
                onChange={(event) => patch({ mpesaTillNumber: event.target.value })}
              />
            </Field>

            <Field
              label="Name customers will see"
              htmlFor="pay-payee"
              hint="They check this against their M-PESA message."
            >
              <Input
                id="pay-payee"
                value={draft.mpesaPayeeName}
                placeholder="NURU STUDIO"
                onChange={(event) => patch({ mpesaPayeeName: event.target.value })}
              />
            </Field>

            <Field
              className="sm:col-span-2"
              label="Extra instructions"
              htmlFor="pay-instructions"
              optional
            >
              <Textarea
                id="pay-instructions"
                rows={2}
                value={draft.mpesaInstructions}
                placeholder="Send the booking fee, then paste the SMS on this page."
                onChange={(event) => patch({ mpesaInstructions: event.target.value })}
              />
            </Field>
          </div>
        ) : null}
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
                value={draft.mpesaAccountType}
                onChange={(event) => patch({ mpesaAccountType: event.target.value })}
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
              hint={
                config.data?.hasCredentials ? 'Stored — type a new one to replace it.' : undefined
              }
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

      {manualIncomplete ? <Alert tone="warning">{manualIncomplete}</Alert> : null}
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
