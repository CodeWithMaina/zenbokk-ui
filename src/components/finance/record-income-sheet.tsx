import { useCallback, useState } from 'react'
import { Button } from '../ui/button'
import { Drawer } from '../ui/drawer'
import { Alert } from '../ui/alert'
import { Field, Input, Select } from '../ui/field'
import { errorMessage } from '../../lib/api/client'
import type { FinancialPaymentMethod, TransactionSource } from '../../lib/finances/api'

export type RecordIncomeSource = Exclude<TransactionSource, 'punched_booking'>

export type RecordIncomeInput = {
  amount: number
  /** M-Pesa receipt code / bank reference. Required by the API for M-Pesa income. */
  transactionReference?: string

  source: RecordIncomeSource
  paymentMethod: FinancialPaymentMethod
  description: string
  transactionDate?: string
}

export type RecordIncomeSheetProps = {
  open: boolean
  onClose: () => void
  onSave: (input: RecordIncomeInput) => Promise<void>
}

export function RecordIncomeSheet({ open, onClose, onSave }: RecordIncomeSheetProps) {
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')

  const [source, setSource] = useState<RecordIncomeSource>('product_sale')
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
    // The API refuses M-Pesa income without the receipt code (it is the only thing
    // that can be checked against a statement), so the form asks for it up front
    // instead of letting the save fail with a server error.
    if (method !== 'cash' && !reference.trim()) {
      next.reference = 'Enter the M-Pesa code or bank reference for this payment.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }, [amount, description, method, reference])

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
    setTouched(new Set(['amount', 'description', 'reference']))
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSave({
        amount: Number(amount.replace(/,/g, '')),
        source,
        paymentMethod: method,
        transactionReference: reference.trim() || undefined,
        description: description.trim(),
        transactionDate: date,
      })
      onClose()
    } catch (err) {
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
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSave()} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save income'}
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

        <Field label="Amount (KES)" htmlFor="income-amount" hint="Whole shillings or decimals, e.g. 1,250.00" error={touched.has('amount') ? errors.amount : undefined}>
          <Input
            id="income-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => { touch('amount'); clearFieldError('amount'); setAmount(e.target.value) }}
            invalid={touched.has('amount') && Boolean(errors.amount)}
            className="w-full"
          />
        </Field>

        <Field label="Received from" htmlFor="income-source" hint="Where the money came from.">
          <Select id="income-source" value={source} onChange={(e) => setSource(e.target.value as RecordIncomeSource)} className="w-full">
            <option value="product_sale">Product sale</option>
            <option value="walk_in">Walk-in</option>
            <option value="manual_income">Manual income</option>
          </Select>
        </Field>

        <Field label="Description" htmlFor="income-description" hint="e.g. Product sale" error={touched.has('description') ? errors.description : undefined}>
          <Input
            id="income-description"
            value={description}
            onChange={(e) => { touch('description'); clearFieldError('description'); setDescription(e.target.value) }}
            invalid={touched.has('description') && Boolean(errors.description)}
            className="w-full"
          />
        </Field>

        <Field label="Received from" htmlFor="income-payee" hint="Optional sender name.">
          <Input id="income-payee" value={payee} onChange={(e) => setPayee(e.target.value)} className="w-full" />
        </Field>

        <Field label="Method" htmlFor="income-method">
          <Select id="income-method" value={method} onChange={(e) => setMethod(e.target.value as FinancialPaymentMethod)} className="w-full">
            <option value="cash">Cash</option>
            <option value="mpesa_till">M-Pesa</option>
            <option value="bank_transfer">Bank</option>
          </Select>
        </Field>
        <Field
          label={method === 'cash' ? 'Reference (optional)' : 'M-Pesa / bank reference'}
          htmlFor="income-reference"
          hint={
            method === 'cash'
              ? 'A receipt number or note you can look up later.'
              : 'The M-Pesa code or bank reference — the API needs it to prove the payment.'
          }
          error={touched.has('reference') ? errors.reference : undefined}
        >
          <Input
            id="income-reference"
            value={reference}
            onChange={(e) => {
              touch('reference')
              clearFieldError('reference')
              setReference(e.target.value)
            }}
            invalid={touched.has('reference') && Boolean(errors.reference)}
            className="w-full"
          />
        </Field>



        <Field label="Date" htmlFor="income-date">
          <Input id="income-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
        </Field>
      </div>
    </Drawer>
  )
}
