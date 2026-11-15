import { useEffect, useState } from 'react'
import { Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { useExpenseActions } from '../../lib/finances/api'
import type { FinancialTransaction } from '../../lib/finances/api'
import { money } from '../../lib/format'
import { ConfirmDialog } from '../ui/confirm-dialog'

export type VoidExpenseDialogProps = {
  /** The expense being voided; null keeps the dialog closed. */
  expense: FinancialTransaction | null
  onClose: () => void
}

/**
 * Void an expense — the only way to take one out of the totals.
 *
 * Deleting would destroy the evidence that the money was ever recorded, which is precisely
 * what an audit looks for, so Punched voids instead: the row stays visible, stops counting,
 * and demands a reason. The server enforces the same rule; this dialog simply will not send a
 * request it knows will be refused.
 */
export function VoidExpenseDialog({ expense, onClose }: VoidExpenseDialogProps) {
  const { voidExpense } = useExpenseActions()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (expense) setReason('')
  }, [expense])

  const submit = async () => {
    if (!expense) return

    try {
      await voidExpense.mutateAsync({ id: expense.id, reason: reason.trim() })
      toast.success('Expense voided. It stays in the record but no longer counts.')
      onClose()
    } catch (failure) {
      toast.error(errorMessage(failure, 'The expense could not be voided.'))
    }
  }

  return (
    <ConfirmDialog
      open={expense != null}
      tone="danger"
      icon={<Undo2 className="size-5" aria-hidden="true" />}
      title="Void this expense?"
      description={
        expense
          ? `${money(expense.amount)} · ${expense.description ?? expense.categoryLabel ?? 'Expense'}. It stays in the record, stops counting towards your totals, and the reason below is kept.`
          : undefined
      }
      confirmLabel={voidExpense.isPending ? 'Voiding…' : 'Void expense'}
      confirmDisabled={voidExpense.isPending || reason.trim().length === 0}
      onConfirm={() => void submit()}
      onCancel={onClose}
    >
      <label className="label" htmlFor="void-expense-reason">
        Why is it being voided?
      </label>
      <textarea
        id="void-expense-reason"
        className="textarea"
        rows={3}
        value={reason}
        placeholder="e.g. Duplicate entry — the rent was already recorded on the 3rd"
        onChange={(event) => setReason(event.target.value)}
      />
      {reason.trim().length === 0 ? (
        <p className="mt-[0.3rem] text-caption text-subtle">A reason is required.</p>
      ) : null}
    </ConfirmDialog>
  )
}
