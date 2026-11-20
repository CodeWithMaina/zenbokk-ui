import { CircleCheck, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { SectionCard } from '../ui/card'
import { toneSoftClass } from '../ui/badge'
import type { Tone } from '../ui/badge'

export type AttentionItem = {
  key: string
  icon: ReactNode
  tone: Tone
  title: ReactNode
  detail: ReactNode
  /** The verb printed on the right ("Review", "Verify"…). */
  cta: ReactNode
}

export type AttentionPanelProps = {
  items: readonly AttentionItem[]
  /** Where a row leads. Rows are buttons, so nothing is clickable-but-inert. */
  onSelect: (key: string) => void
  className?: string
}

const columnClass: Record<number, string> = {
  1: '',
  2: 'min-[34rem]:grid-cols-2',
  3: 'min-[34rem]:grid-cols-3',
}
/**
 * "Needs your attention": the three queues that cost money if nobody looks at
 * them — unpaid balances, bookings still to confirm, payments waiting for
 * verification. A queue that is empty is simply absent; when all three are empty
 * the card says so instead of disappearing, so the dashboard never looks broken.
 */
export function AttentionPanel({ items, onSelect, className }: AttentionPanelProps) {
  return (
    <SectionCard
      icon={<TriangleAlert />}
      iconTone="warning"
      title="Needs your attention"
      titleClassName="font-display font-normal"
      className={cn('p-[clamp(0.65rem,1vw,0.95rem)]', className)}
      contentClassName="mt-[0.6rem]"
    >
      {items.length === 0 ? (
        <div className="flex items-center gap-[0.6rem] rounded-lg px-[0.55rem] py-[0.5rem]">
          <span
            aria-hidden="true"
            className="grid size-[1.9rem] shrink-0 place-items-center rounded-[0.55rem] bg-success-soft text-success-ink"
          >
            <CircleCheck className="size-[1.05rem]" />
          </span>
          <div className="min-w-0">
            <b className="block text-label">Nothing needs you right now</b>
            <span className="text-meta text-muted">
              Balances, confirmations and payments are all clear.
            </span>
          </div>
        </div>
      ) : (
        <div className={cn('dash-attention grid gap-[0.2rem]', columnClass[items.length] ?? columnClass[3])}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className="dash-attention-row"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-[1.9rem] shrink-0 place-items-center rounded-[0.55rem] [&>svg]:size-[1.05rem]',
                  toneSoftClass[item.tone],
                )}
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-label">{item.title}</b>
                <span className="block text-meta text-muted">{item.detail}</span>
              </span>
              <em className="shrink-0 text-meta font-semibold whitespace-nowrap text-accent not-italic">
                {item.cta} →
              </em>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
