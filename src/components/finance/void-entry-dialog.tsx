import { ShieldAlert } from 'lucide-react'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { Field, Input } from '../ui/field'
import { money } from '../../lib/format'

export type VoidEntryDialogProps = {
  open: boolean
  onClose: () => void
  /** What is being voided, so the confirmation names it. */
  subject: { description: string | null; reference: string; amount: number } | null
  kind: 'income' | 'expense'
  reason: string
  onReasonChange: (value: string) => void
  onConfirm: () => void
  pending: boolean
}

/**
 * Voiding is never deleting: the row stays, marked voided with a reason, and stops counting towards
 * every total and running balance. The backend refuses ineligible rows (payment-sourced income,
 * refunds, already-refunded income), and this dialog only opens for rows it has already cleared.
 */
export function VoidEntryDialog({
  open,
  onClose,
  subject,
  kind,
  reason,
  onReasonChange,
  onConfirm,
  pending,
}: VoidEntryDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title={`Void ${kind === 'expense' ? 'expense' : 'income entry'}`}
      description="The entry stays on the books as voided — it never counts towards totals or the running balance again."
      icon={<ShieldAlert className="size-6" aria-hidden="true" />}
      tone="danger"
      confirmLabel={pending ? 'Voiding…' : `Void ${kind}`}
      cancelLabel="Cancel"
      confirmDisabled={!reason.trim() || pending}
      onConfirm={onConfirm}
      onCancel={onClose}
    >
      {subject ? (
        <div className="rounded-md border border-line bg-hover p-[0.7rem]">
          <div className="truncate font-semibold">{subject.description || subject.reference}</div>
          <div className="text-meta text-muted">
            {subject.reference} · {money(subject.amount)}
          </div>
        </div>
      ) : null}
      <Field label="Reason" htmlFor="void-entry-reason" hint="Kept on the row and in the audit trail.">
        <Input
          id="void-entry-reason"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Why is this entry being voided?"
          className="w-full"
        />
      </Field>
    </ConfirmDialog>
  )
}
