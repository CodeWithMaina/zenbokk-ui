import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Portal } from '../ui/portal'
import { errorMessage } from '../../lib/api/client'
import { useExpenseActions, useExpenseCategories } from '../../lib/finances/api'
import type { ExpenseInput, FinancialPaymentMethod } from '../../lib/finances/api'
import { money, toDateInputValue } from '../../lib/format'
import { ExpenseFields } from './ExpenseFields'

export type RecordExpenseDialogProps = {
  open: boolean
  /** When set, the dialog edits this expense instead of creating one. */
  expense?: {
    id: string
    amount: number
    category: string | null
    paymentMethod: FinancialPaymentMethod
    description: string | null
    externalReference: string | null
    reconciled: boolean
  } | null
  onClose: () => void
}

/**
 * Record or edit money the business spent.
 *
 * Two rules the dialog enforces out loud:
 *
 *  - **The category must be one of the known ones.** A free-text category would not be filterable and
 *    the expense report would slowly fill with near-duplicates.
 *  - **A reconciled expense cannot be edited.** Once it has been checked against a bank or M-Pesa
 *    statement it is a settled fact; the dialog says so rather than offering a button that fails.
 */
export function RecordExpenseDialog({ open, expense = null, onClose }: RecordExpenseDialogProps) {
  const categories = useExpenseCategories(open)
  const { create, update } = useExpenseActions()

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<FinancialPaymentMethod>('cash')
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [transactionDate, setTransactionDate] = useState(toDateInputValue())
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setAmount(expense ? String(expense.amount) : '')
    setCategory(expense?.category ?? categories.data?.[0]?.key ?? 'other')
    setPaymentMethod(expense?.paymentMethod ?? 'cash')
    setDescription(expense?.description ?? '')
    setReference(expense?.externalReference ?? '')
    setReason('')
    setTransactionDate(toDateInputValue())
    setError(null)
  }, [open, expense, categories.data])

  const editing = Boolean(expense)
  const locked = Boolean(expense?.reconciled)
  const parsedAmount = Number(amount)
  const valid =
    Number.isFinite(parsedAmount) && parsedAmount > 0 && Boolean(category) && description.trim().length > 0
  const pending = create.isPending || update.isPending

  const submit = async () => {
    setError(null)

    const body: ExpenseInput = {
      amount: parsedAmount,
      category,
      paymentMethod,
      description: description.trim(),
      transactionReference: reference.trim() ? reference.trim() : null,
      transactionDate: new Date(transactionDate).toISOString(),
    }

    try {
      if (editing && expense) {
        await update.mutateAsync({ id: expense.id, body: { ...body, reason: reason.trim() || null } })
        toast.success('Expense updated — the change is recorded in its history.')
      } else {
        await create.mutateAsync(body)
        toast.success(`${money(parsedAmount)} expense recorded.`)
      }

      onClose()
    } catch (failure) {
      setError(errorMessage(failure, 'The expense could not be saved.'))
    }
  }

  if (!open) return null

  return (
    <Portal>
      <button type="button" className="scrim" aria-label="Cancel" tabIndex={-1} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-title"
        className="dialog max-w-[32rem] overflow-y-auto"
      >
        <h2 id="expense-title" className="text-heading font-bold tracking-snug">
          {editing ? 'Edit expense' : 'Record an expense'}
        </h2>
        <p className="mt-[0.2rem] text-meta text-muted">
          {editing
            ? 'Every change is kept in the expense’s history, so the original figure never disappears.'
            : 'Money the business spent: rent, stock, transport, utilities and the rest.'}
        </p>

        {locked ? (
          <p className="mt-[0.8rem] rounded-md bg-warning-soft p-[0.6rem] text-meta text-warning-ink">
            This expense has been reconciled against a statement, so it can no longer be edited.
          </p>
        ) : null}

        <ExpenseFields
          locked={locked}
          amount={amount}
          onAmountChange={setAmount}
          category={category}
          onCategoryChange={setCategory}
          categories={categories.data ?? []}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          description={description}
          onDescriptionChange={setDescription}
          reference={reference}
          onReferenceChange={setReference}
          transactionDate={transactionDate}
          onTransactionDateChange={setTransactionDate}
        />

        {editing && !locked ? (
          <div className="mt-[0.8rem] grid gap-[0.8rem]">
            <label className="label" htmlFor="expense-reason">
              Why is it changing? (kept in the history)
            </label>
            <input
              id="expense-reason"
              className="input"
              value={reason}
              placeholder="e.g. Landlord added the service charge"
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        ) : null}

        {error ? (
          <p className="mt-[0.6rem] text-meta text-danger-ink" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-[0.6rem]">
          <Button onClick={onClose} className="max-sm:flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={locked || !valid || pending}
            onClick={() => void submit()}
            className="max-sm:flex-1"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {editing ? 'Save changes' : 'Record expense'}
          </Button>
        </div>
      </div>
    </Portal>
  )
}
