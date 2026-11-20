import { useCallback, useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Alert } from '../ui/alert'
import { Field, Input, Select } from '../ui/field'
import { errorMessage } from '../../lib/api/client'
import { fieldErrorsFrom } from '../../lib/finances/form-errors'
import { toDateInputValue } from '../../lib/format'
import { type ExpenseCategory, type FinancialPaymentMethod } from '../../lib/finances/api'

export type RecordExpenseInput = {
  amount: number
  category: string
  paymentMethod: FinancialPaymentMethod
  description: string
  /** Who was paid. Optional, but it is what makes a receipt findable later. */
  payee?: string
  transactionReference?: string
  transactionDate?: string
}

export type RecordExpenseSheetProps = {
  open: boolean
  onClose: () => void
  categories: readonly ExpenseCategory[]
  onSave: (input: RecordExpenseInput) => Promise<void>
}

const blank = () => ({
  amount: '',
  category: '',
  description: '',
  payee: '',
  reference: '',
  method: 'cash' as FinancialPaymentMethod,
  date: toDateInputValue(),
})

export function RecordExpenseSheet({ open, onClose, categories, onSave }: RecordExpenseSheetProps) {
  const [form, setForm] = useState(blank)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm({ ...blank(), category: categories[0]?.key ?? '' })
    setTouched(new Set())
    setErrors({})
    setServerError(null)
    setSubmitting(false)
  }, [open, categories])

  const validate = useCallback(() => {
    const next: Record<string, string> = {}
    const amountNum = Number(form.amount.replace(/,/g, ''))
    if (!form.amount || !Number.isFinite(amountNum) || amountNum <= 0) next.amount = 'Enter an amount greater than 0.'
    if (!form.description.trim()) next.description = 'Add a short description.'
    if (!form.category) next.category = 'Choose a category.'
    if (!form.date) next.transactionDate = 'Choose the date the money was spent.'
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
    setTouched(new Set(['amount', 'category', 'description', 'transactionDate']))
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSave({
        amount: Number(form.amount.replace(/,/g, '')),
        category: form.category,
        paymentMethod: form.method,
        description: form.description.trim(),
        payee: form.payee.trim() || undefined,
        transactionReference: form.reference.trim() || undefined,
        transactionDate: form.date,
      })
      onClose()
    } catch (err) {
      const fields = fieldErrorsFrom(err)
      if (Object.keys(fields).length > 0) setErrors(fields)
      setServerError(errorMessage(err, 'Could not record the expense. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="Record expense"
      description="Money the business spent. It appears in the cashbook immediately."
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save expense'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[1.1rem]">
        {serverError ? (
          <Alert tone="danger" title="Could not save the expense" onDismiss={() => setServerError(null)}>
            {serverError}
          </Alert>
        ) : null}

        <Field
          label="Amount (KES)"
          htmlFor="expense-amount"
          hint="Whole shillings or decimals, e.g. 1,250.00"
          error={touched.has('amount') ? errors.amount : undefined}
        >
          <Input
            id="expense-amount"
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => set('amount', event.target.value)}
            invalid={Boolean(errors.amount)}
            className="w-full"
          />
        </Field>

        <Field
          label="Category"
          htmlFor="expense-category"
          hint="Choose the expense type."
          error={touched.has('category') ? errors.category : undefined}
        >
          <Select
            id="expense-category"
            value={form.category}
            onChange={(event) => set('category', event.target.value)}
            invalid={Boolean(errors.category)}
            className="w-full"
          >
            {categories.length === 0 ? <option value="">Loading categories…</option> : null}
            {categories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Description"
          htmlFor="expense-description"
          hint="e.g. November shop rent"
          error={touched.has('description') ? errors.description : undefined}
        >
          <Input
            id="expense-description"
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            invalid={Boolean(errors.description)}
            className="w-full"
          />
        </Field>

        <Field label="Paid to" htmlFor="expense-payee" hint="Optional supplier or payee.">
          <Input id="expense-payee" value={form.payee} onChange={(event) => set('payee', event.target.value)} className="w-full" />
        </Field>

        <Field label="Method" htmlFor="expense-method">
          <Select
            id="expense-method"
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

        <Field label="Reference (optional)" htmlFor="expense-reference" hint="Receipt or bank reference.">
          <Input
            id="expense-reference"
            value={form.reference}
            onChange={(event) => set('reference', event.target.value)}
            className="w-full"
          />
        </Field>

        <Field label="Date" htmlFor="expense-date" error={errors.transactionDate}>
          <Input
            id="expense-date"
            type="date"
            value={form.date}
            onChange={(event) => set('date', event.target.value)}
            invalid={Boolean(errors.transactionDate)}
            className="w-full"
          />
        </Field>
      </div>
    </Drawer>
  )
}

