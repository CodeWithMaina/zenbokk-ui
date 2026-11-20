import { useCallback, useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Alert } from '../ui/alert'
import { Field, Input, Select } from '../ui/field'
import { errorMessage } from '../../lib/api/client'
import { fieldErrorsFrom } from '../../lib/finances/form-errors'
import { toDateInputValue } from '../../lib/format'
import type { FinancialPaymentMethod, TransactionSource } from '../../lib/finances/api'

export type RecordIncomeSource = Exclude<TransactionSource, 'punched_booking'>

export type RecordIncomeInput = {
  amount: number
  /** M-Pesa receipt code / bank reference. Required by the API for M-Pesa income. */
  transactionReference?: string
  source: RecordIncomeSource
  paymentMethod: FinancialPaymentMethod
  description: string
  /** Who paid, when they are not a registered customer. Optional. */
  customerName?: string
  transactionDate?: string
}

export type RecordIncomeSheetProps = {
  open: boolean
  onClose: () => void
  onSave: (input: RecordIncomeInput) => Promise<void>
}

/** A blank form, so a reopened drawer never shows the last entry's numbers. */
const blank = () => ({
  amount: '',
  reference: '',
  source: 'product_sale' as RecordIncomeSource,
  description: '',
  payer: '',
  method: 'cash' as FinancialPaymentMethod,
  date: toDateInputValue(),
})

export function RecordIncomeSheet({ open, onClose, onSave }: RecordIncomeSheetProps) {
  const [form, setForm] = useState(blank)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(blank())
    setTouched(new Set())
    setErrors({})
    setServerError(null)
    setSubmitting(false)
  }, [open])

  const validate = useCallback(() => {
    const next: Record<string, string> = {}
    const amountNum = Number(form.amount.replace(/,/g, ''))
    if (!form.amount || !Number.isFinite(amountNum) || amountNum <= 0) next.amount = 'Enter an amount greater than 0.'
    if (!form.description.trim()) next.description = 'Add a short description.'
    if (!form.date) next.transactionDate = 'Choose the date the money arrived.'
    // The API refuses M-Pesa income without the receipt code (it is the only thing that can be
    // checked against a statement), so the form asks up front instead of letting the save fail.
    if (form.method !== 'cash' && !form.reference.trim()) {
      next.transactionReference = 'Enter the M-Pesa code or bank reference for this payment.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }, [form])

  const set = <K extends keyof ReturnType<typeof blank>>(key: K, value: ReturnType<typeof blank>[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleSave = async () => {
    if (submitting) return
    setServerError(null)
    setTouched(new Set(['amount', 'description', 'transactionReference', 'transactionDate']))
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSave({
        amount: Number(form.amount.replace(/,/g, '')),
        source: form.source,
        paymentMethod: form.method,
        transactionReference: form.reference.trim() || undefined,
        description: form.description.trim(),
        customerName: form.payer.trim() || undefined,
        transactionDate: form.date,
      })
      onClose()
    } catch (err) {
      // Field-level messages land next to the field that caused them; anything else goes in the
      // alert. The server is the authority on both.
      const fields = fieldErrorsFrom(err)
      if (Object.keys(fields).length > 0) setErrors(fields)
      setServerError(errorMessage(err, 'Could not record the income. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="Record income"
      description="Money the business received."
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save income'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[1.1rem]">
        {serverError ? (
          <Alert tone="danger" title="Could not save the income" onDismiss={() => setServerError(null)}>
            {serverError}
          </Alert>
        ) : null}

        <Field
          label="Amount (KES)"
          htmlFor="income-amount"
          hint="Whole shillings or decimals, e.g. 1,250.00"
          error={touched.has('amount') ? errors.amount : undefined}
        >
          <Input
            id="income-amount"
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => set('amount', event.target.value)}
            invalid={Boolean(errors.amount)}
            className="w-full"
          />
        </Field>

        <Field label="Where it came from" htmlFor="income-source">
          <Select
            id="income-source"
            value={form.source}
            onChange={(event) => set('source', event.target.value as RecordIncomeSource)}
            className="w-full"
          >
            <option value="walk_in">Walk-in</option>
            <option value="product_sale">Product sale</option>
            <option value="manual_income">Other business income</option>
            <option value="other">Other</option>
          </Select>
        </Field>

        <Field
          label="Description"
          htmlFor="income-description"
          hint="e.g. Product sale"
          error={touched.has('description') ? errors.description : undefined}
        >
          <Input
            id="income-description"
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            invalid={Boolean(errors.description)}
            className="w-full"
          />
        </Field>

        <Field label="Received from" htmlFor="income-payer" hint="Optional — a name you can look up later.">
          <Input id="income-payer" value={form.payer} onChange={(event) => set('payer', event.target.value)} className="w-full" />
        </Field>

        <Field label="Method" htmlFor="income-method">
          <Select
            id="income-method"
            value={form.method}
            onChange={(event) => set('method', event.target.value as FinancialPaymentMethod)}
            className="w-full"
          >
            <option value="cash">Cash</option>
            <option value="mpesa_till">M-Pesa</option>
            <option value="bank_transfer">Bank</option>
            <option value="card">Card</option>
          </Select>
        </Field>

        <Field
          label={form.method === 'cash' ? 'Reference (optional)' : 'M-Pesa / bank reference'}
          htmlFor="income-reference"
          hint={
            form.method === 'cash'
              ? 'A receipt number or note you can look up later.'
              : 'The M-Pesa code or bank reference — the API needs it to prove the payment.'
          }
          error={errors.transactionReference}
        >
          <Input
            id="income-reference"
            value={form.reference}
            onChange={(event) => set('reference', event.target.value)}
            invalid={Boolean(errors.transactionReference)}
            className="w-full"
          />
        </Field>

        <Field label="Date" htmlFor="income-date" error={errors.transactionDate}>
          <Input
            id="income-date"
            type="date"
            value={form.date}
            onChange={(event) => set('date', event.target.value)}
            invalid={Boolean(errors.transactionDate)}
            className="w-full"
          />
        </Field>

        {form.method !== 'cash' ? (
          <p className="text-caption text-subtle">
            M-Pesa income is recorded as awaiting verification and enters the cashbook once it is verified.
          </p>
        ) : null}
      </div>
    </Drawer>
  )
}

