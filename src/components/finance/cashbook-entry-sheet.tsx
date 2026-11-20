import { ArrowDownLeft, ArrowUpRight, ExternalLink, ShieldAlert } from 'lucide-react'
import { Drawer } from '../ui/drawer'
import { Button } from '../ui/button'
import { Badge, StatusPill } from '../ui/badge'
import { DescriptionList, DescriptionRow } from '../ui/description-list'
import { money } from '../../lib/format'
import { financeDate, financeTime } from '../../lib/finances/format'
import { financeMethodLabel } from '../../lib/finances/status'
import type { CashbookEntry } from '../../lib/finances/api'

export type CashbookEntrySheetProps = {
  open: boolean
  onClose: () => void
  entry: CashbookEntry | null
  /** Only shown when the row produced a payment the reader may open. */
  onOpenPayment?: (paymentId: string) => void
  /** Void is offered only when the row is eligible; the reason is collected by the dialog. */
  onVoid?: () => void
  canVoid?: boolean
}

/**
 * One movement, in full. The cashbook is a register, so a row has to be readable without leaving
 * the page — but a row is also a link back to the payment that produced it, which is why the sheet
 * carries "Open payment" instead of repeating what the payment screen already says.
 */
export function CashbookEntrySheet({ open, onClose, entry, onOpenPayment, onVoid, canVoid }: CashbookEntrySheetProps) {
  if (!entry) {
    return (
      <Drawer open={open} onClose={onClose} title="Entry" description="No entry selected.">
        <p className="text-meta text-muted">Nothing to show.</p>
      </Drawer>
    )
  }

  const incoming = entry.direction === 'incoming'

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={entry.description || entry.reference}
      description={`${financeDate(entry.date)}, ${financeTime(entry.date)}`}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-[0.6rem]">
          <div className="flex flex-wrap items-center gap-[0.5rem]">
            {entry.sourcePaymentId && onOpenPayment ? (
              <Button size="sm" onClick={() => onOpenPayment(entry.sourcePaymentId as string)}>
                <ExternalLink className="size-4" aria-hidden="true" />
                Open payment
              </Button>
            ) : null}
            {canVoid && onVoid && !entry.isVoided ? (
              <Button size="sm" variant="danger" onClick={onVoid}>
                <ShieldAlert className="size-4" aria-hidden="true" />
                Void entry
              </Button>
            ) : null}
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-[1rem]">
        <div className="flex items-center gap-[0.8rem]">
          <span className="grid size-[2.6rem] shrink-0 place-items-center rounded-round bg-sunken text-muted">
            {incoming ? <ArrowDownLeft className="size-4" aria-hidden="true" /> : <ArrowUpRight className="size-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className={`font-display text-[1.7rem] leading-none font-semibold tracking-tight tabular ${incoming ? 'text-success-ink' : 'text-danger-ink'}`}>
              {incoming ? '+' : '−'}
              {money(entry.amount)}
            </p>
            <p className="mt-[0.3rem] flex flex-wrap items-center gap-[0.4rem]">
              <StatusPill tone={entry.isVoided ? 'neutral' : incoming ? 'success' : 'danger'}>
                {entry.isVoided ? 'Voided' : incoming ? 'Income' : 'Expense'}
              </StatusPill>
              <Badge tone="neutral">{financeMethodLabel(entry.paymentMethod)}</Badge>
            </p>
          </div>
        </div>

        <DescriptionList>
          <DescriptionRow label="Reference" value={<span className="font-mono">{entry.reference}</span>} />
          <DescriptionRow label="Customer or payee" value={entry.customerName || '—'} />
          <DescriptionRow label="Date" value={`${financeDate(entry.date)}, ${financeTime(entry.date)}`} />
          <DescriptionRow label="Recorded by" value={entry.recordedByName || '—'} />
          <DescriptionRow label="Balance after" value={<span className="tabular">{money(entry.runningBalance)}</span>} />
          {entry.externalReference ? (
            <DescriptionRow label="External reference" value={<span className="font-mono">{entry.externalReference}</span>} />
          ) : null}
        </DescriptionList>

        <p className="text-caption text-subtle">
          The balance after is the running net of everything recorded in this window — not a bank or M-Pesa balance.
        </p>
      </div>
    </Drawer>
  )
}
