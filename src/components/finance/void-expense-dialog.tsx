import { ShieldAlert } from 'lucide-react'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Field, Input } from '../ui/field'
import { money } from '../../lib/format'
import type { FinancialTransaction } from '../../lib/finances/api'

export type VoidExpenseDialogProps = {
  open: boolean
  onClose: () => void
  expenseId: string | null
  /** The expense row being voided, so the confirmation names it. */
  expense?: Pick<
    FinancialTransaction,
    'description' | 'reference' | 'amount' | 'categoryLabel' | 'isVoided'
  > | null
  reason: string
  onReasonChange: (value: string) => void
  onVoid: (id: string) => void
  pending: boolean
}

/**
 * Voiding is not deleting: the expense stays on the books, marked voided, and
 * stops counting towards totals. The audit trail keeps the reason.
 */
export function VoidExpenseDialog({
  open,
  onClose,
  expenseId,
  expense,
  reason,
  onReasonChange,
  onVoid,
  pending,
}: VoidExpenseDialogProps) {
  const alreadyVoided = expense?.isVoided === true
  return (
    <ConfirmDialog
      open={open}
      title="Void expense"
      description="The expense stays on the books as voided — it never counts towards totals again."
      icon={<ShieldAlert className="size-6" aria-hidden="true" />}
      tone="danger"
      confirmLabel="Void expense"
      cancelLabel="Cancel"
      confirmDisabled={!reason.trim() || pending || alreadyVoided}
      onConfirm={() => {
        if (expenseId && !alreadyVoided) void onVoid(expenseId)
      }}
      onCancel={onClose}
    >
      {expense ? (
        <div className="rounded-md border border-line bg-hover p-[0.7rem]">
          <div className="truncate font-semibold">{expense.description || expense.reference}</div>
          <div className="text-meta text-muted">
            {expense.reference}
            {expense.categoryLabel ? ` · ${expense.categoryLabel}` : ''} · {money(expense.amount)}
          </div>
        </div>
      ) : null}
      {alreadyVoided ? (
        <p className="text-meta text-danger-ink">This expense has already been voided.</p>
      ) : null}
      <Field label="Reason" htmlFor="void-reason">
        <Input
          id="void-reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Why is this expense being voided?"
          className="w-full"
        />
      </Field>
      <p className="text-meta text-muted">
        Voided rows appear only when “Voided entries: Show” is switched on.
      </p>
    </ConfirmDialog>
  )
}

