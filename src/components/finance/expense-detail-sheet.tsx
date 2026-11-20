import { Receipt, ShieldAlert } from 'lucide-react'
import { Drawer } from '../ui/drawer'
import { Button } from '../ui/button'
import { Badge, StatusPill } from '../ui/badge'
import { DescriptionList, DescriptionRow } from '../ui/description-list'
import { money } from '../../lib/format'
import { financeDate, financeTime } from '../../lib/finances/format'
import { financeMethodLabel } from '../../lib/finances/status'
import { sourceLabel } from '../../lib/finances/labels'
import type { FinancialTransaction } from '../../lib/finances/api'

export type ExpenseDetailSheetProps = {
  open: boolean
  onClose: () => void
  expense: FinancialTransaction | null
  onVoid?: () => void
  canVoid?: boolean
}

/** One operating cost, in full — the register row plus everything the detail row knows. */
export function ExpenseDetailSheet({ open, onClose, expense, onVoid, canVoid }: ExpenseDetailSheetProps) {
  if (!expense) {
    return (
      <Drawer open={open} onClose={onClose} title="Expense" description="No expense selected.">
        <p className="text-meta text-muted">Nothing to show.</p>
      </Drawer>
    )
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={expense.description || expense.reference}
      description={expense.categoryLabel || expense.category || 'Expense'}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-[0.6rem]">
          {canVoid && onVoid && !expense.isVoided ? (
            <Button size="sm" variant="danger" onClick={onVoid}>
              <ShieldAlert className="size-4" aria-hidden="true" />
              Void expense
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[1rem]">
        <div className="flex items-center gap-[0.8rem]">
          <span className="grid size-[2.6rem] shrink-0 place-items-center rounded-round bg-avatar-3 text-avatar-3-ink">
            <Receipt className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[1.7rem] leading-none font-semibold tracking-tight text-danger-ink tabular">
              {money(expense.amount)}
            </p>
            <p className="mt-[0.3rem] flex flex-wrap items-center gap-[0.4rem]">
              <StatusPill tone={expense.isVoided ? 'neutral' : 'danger'}>{expense.isVoided ? 'Voided' : 'Expense'}</StatusPill>
              <Badge tone="neutral">{financeMethodLabel(expense.paymentMethod)}</Badge>
            </p>
          </div>
        </div>

        <DescriptionList>
          <DescriptionRow label="Reference" value={<span className="font-mono">{expense.reference}</span>} />
          <DescriptionRow label="Category" value={expense.categoryLabel || expense.category || '—'} />
          <DescriptionRow label="Paid to" value={expense.customerName || '—'} />
          <DescriptionRow label="Date" value={`${financeDate(expense.transactionDate)}, ${financeTime(expense.transactionDate)}`} />
          <DescriptionRow label="Recorded by" value={expense.createdByName || '—'} />
          <DescriptionRow label="Source" value={sourceLabel(expense.source)} />
          {expense.externalReference ? (
            <DescriptionRow label="Receipt / reference" value={<span className="font-mono">{expense.externalReference}</span>} />
          ) : null}
          {expense.isVoided && expense.voidReason ? <DescriptionRow label="Void reason" value={expense.voidReason} /> : null}
        </DescriptionList>

        <p className="text-caption text-subtle">
          This expense is part of the cashbook: voiding it removes it from every total and running balance without deleting the record.
        </p>
      </div>
    </Drawer>
  )
}
