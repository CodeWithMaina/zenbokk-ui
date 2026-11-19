import { useCallback, useState } from 'react'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Alert } from '../ui/alert'
import { Field, Input, Select } from '../ui/field'
import { errorMessage } from '../../lib/api/client'
import { type ExpenseCategory, type FinancialPaymentMethod } from '../../lib/finances/api'

export type RecordExpenseInput = {
  amount: number
  category: string
  paymentMethod: FinancialPaymentMethod
  description: string
  transactionDate?: string
}

export type RecordExpenseSheetProps = {
  open: boolean
  onClose: () => void
  categories: readonly ExpenseCategory[]
  onSave: (input: RecordExpenseInput) => Promise<void>
}

export function RecordExpenseSheet({ open, onClose, categories, onSave }: RecordExpenseSheetProps) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(categories[0]?.key ?? '')
  const [description, setDescription] = useState('')
  const [payee, setPayee] = useState('')
  const [method, setMethod] = useState<FinancialPaymentMethod>('cash')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const validate = useCallback(() => {
    const next: Record<string, string> = {}
    const amountNum = Number(amount.replace(/,/g, ''))
    if (!amount || !Number.isFinite(amountNum) || amountNum <= 0) next.amount = 'Enter an amount greater than 0.'
    if (!description.trim()) next.description = 'Add a short description.'
    if (!category) next.category = 'Choose a category.'
    setErrors(next)
    return Object.keys(next).length === 0
  }, [amount, description, category])

  const touch = (field: string) => setTouched((prev) => new Set([...prev, field]))
  const clearFieldError = (field: string) =>
    setErrors((prev) => {
      if (!(field in prev)) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })

  const handleSave = async () => {
    if (submitting) return
    setServerError(null)
    setTouched(new Set(['amount', 'category', 'description']))
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSave({
        amount: Number(amount.replace(/,/g, '')),
        category,
        paymentMethod: method,
        description: description.trim(),
        transactionDate: date,
      })
      onClose()
    } catch (err) {
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
      description="Money the business spent."
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save expense'}
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

        <Field label="Amount (KES)" htmlFor="expense-amount" hint="Whole shillings or decimals, e.g. 1,250.00" error={touched.has('amount') ? errors.amount : undefined}>
          <Input
            id="expense-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => { touch('amount'); clearFieldError('amount'); setAmount(e.target.value) }}
            invalid={touched.has('amount') && Boolean(errors.amount)}
            className="w-full"
          />
        </Field>

        <Field label="Category" htmlFor="expense-category" hint="Choose the expense type." error={touched.has('category') ? errors.category : undefined}>
          <Select
            id="expense-category"
            value={category}
            onChange={(e) => { touch('category'); clearFieldError('category'); setCategory(e.target.value) }}
            invalid={touched.has('category') && Boolean(errors.category)}
            className="w-full"
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Description" htmlFor="expense-description" hint="e.g. November shop rent" error={touched.has('description') ? errors.description : undefined}>
          <Input
            id="expense-description"
            value={description}
            onChange={(e) => { touch('description'); clearFieldError('description'); setDescription(e.target.value) }}
            invalid={touched.has('description') && Boolean(errors.description)}
            className="w-full"
          />
        </Field>

        <Field label="Paid to" htmlFor="expense-payee" hint="Optional supplier or payee.">
          <Input id="expense-payee" value={payee} onChange={(e) => setPayee(e.target.value)} className="w-full" />
        </Field>

        <Field label="Method" htmlFor="expense-method">
          <Select id="expense-method" value={method} onChange={(e) => setMethod(e.target.value as FinancialPaymentMethod)} className="w-full">
            <option value="cash">Cash</option>
            <option value="mpesa_till">M-Pesa</option>
            <option value="bank_transfer">Bank</option>
          </Select>
        </Field>

        <Field label="Date" htmlFor="expense-date">
          <Input id="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
        </Field>
      </div>
    </Drawer>
  )
}
