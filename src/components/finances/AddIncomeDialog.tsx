import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { Portal } from '../ui/portal'
import { errorMessage } from '../../lib/api/client'
import { useClients } from '../../lib/clients'
import { useRecordIncome } from '../../lib/finances/api'
import type { FinancialPaymentMethod, RecordIncomeInput } from '../../lib/finances/api'
import { RECORDABLE_SOURCES, requiresMpesaReference } from '../../lib/finances/labels'
import { money, toDateInputValue } from '../../lib/format'
import { CustomerPicker, IncomeFields } from './AddIncomeFields'

export type AddIncomeDialogProps = {
  open: boolean
  onClose: () => void
  onRecorded?: () => void
}

/**
 * Record money that arrived outside Punched.
 *
 * The decisions that matter, in order:
 *
 *  1. **No appointment and no customer is required.** A walk-in who paid cash is a complete
 *     transaction; forcing either would mean the money simply never gets recorded.
 *  2. **M-Pesa needs a receipt code.** An M-Pesa claim with nothing to check it against is not
 *     evidence, so the code is required on the three M-Pesa routes and optional on the rest.
 *  3. **M-Pesa rows start pending.** What the owner typed is a claim; a person confirming it is what
 *     turns it into revenue — so nobody is surprised it is not counted yet.
 */
export function AddIncomeDialog({ open, onClose, onRecorded }: AddIncomeDialogProps) {
  const recordIncome = useRecordIncome()

  const [amount, setAmount] = useState('')
  const [source, setSource] = useState<string>(RECORDABLE_SOURCES[0].key)
  const [paymentMethod, setPaymentMethod] = useState<FinancialPaymentMethod>('mpesa_till')
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [transactionDate, setTransactionDate] = useState(toDateInputValue())
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Searched only once the owner types two characters, so opening the dialog costs no request.
  const search = customerQuery.trim()
  const clients = useClients({ search, pageSize: 6 }, !customerId && search.length >= 2)
  const results = (clients.data?.items ?? []).map((client) => ({
    id: client.userId,
    name: client.fullName,
  }))

  useEffect(() => {
    if (!open) {
      setAmount('')
      setReference('')
      setDescription('')
      setCustomerId(null)
      setCustomerQuery('')
      setError(null)
    }
  }, [open])

  const parsedAmount = Number(amount)
  const needsReference = requiresMpesaReference(paymentMethod)
  const valid =
    Number.isFinite(parsedAmount) && parsedAmount > 0 && (!needsReference || reference.trim().length > 0)

  const submit = async () => {
    setError(null)

    const payload: RecordIncomeInput = {
      amount: parsedAmount,
      source: source as RecordIncomeInput['source'],
      paymentMethod,
      transactionReference: reference.trim() ? reference.trim() : null,
      customerId,
      description: description.trim() ? description.trim() : null,
      transactionDate: new Date(transactionDate).toISOString(),
    }

    try {
      const recorded = await recordIncome.mutateAsync(payload)
      toast.success(
        recorded.verificationStatus === 'pending'
          ? `${money(recorded.amount)} recorded — it counts once you verify it.`
          : `${money(recorded.amount)} recorded.`,
      )
      onRecorded?.()
      onClose()
    } catch (failure) {
      setError(errorMessage(failure, 'The income could not be recorded.'))
    }
  }

  if (!open) return null

  return (
    <Portal>
      <button type="button" className="scrim" aria-label="Cancel" tabIndex={-1} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-income-title"
        className="dialog max-w-[34rem] overflow-y-auto"
      >
        <h2 id="add-income-title" className="text-heading font-bold tracking-snug">
          Record income
        </h2>
        <p className="mt-[0.2rem] text-meta text-muted">
          For money that did not come through a Punched booking — a walk-in, a product sale, a direct
          M-Pesa payment or cash.
        </p>

        <IncomeFields
          amount={amount}
          onAmountChange={setAmount}
          source={source}
          onSourceChange={setSource}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          reference={reference}
          onReferenceChange={setReference}
          needsReference={needsReference}
        />

        <CustomerPicker
          query={customerQuery}
          selectedId={customerId}
          results={results}
          searching={clients.isFetching}
          onQueryChange={(value) => {
            setCustomerId(null)
            setCustomerQuery(value)
          }}
          onSelect={(client) => {
            setCustomerId(client.id)
            setCustomerQuery(client.name)
          }}
        />

        <div className="mt-[0.8rem] grid gap-[0.8rem]">
          <label className="label" htmlFor="add-income-description">
            Description (optional)
          </label>
          <textarea
            id="add-income-description"
            className="textarea"
            rows={2}
            value={description}
            placeholder="e.g. Haircut and beard trim"
            onChange={(event) => setDescription(event.target.value)}
          />

          <label className="label" htmlFor="add-income-date">
            Transaction date
          </label>
          <input
            id="add-income-date"
            type="date"
            className="input"
            value={transactionDate}
            max={toDateInputValue()}
            onChange={(event) => setTransactionDate(event.target.value)}
          />
        </div>

        <p className="mt-[0.6rem] text-meta text-muted">
          {needsReference
            ? 'M-Pesa income is recorded as pending until you verify it, so a typed receipt code never counts as confirmed revenue on its own.'
            : 'Cash, bank and card income is recorded as verified, because you had the money in hand.'}
        </p>

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
            disabled={!valid || recordIncome.isPending}
            onClick={() => void submit()}
            className="max-sm:flex-1"
          >
            {recordIncome.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Record income
          </Button>
        </div>
      </div>
    </Portal>
  )
}
