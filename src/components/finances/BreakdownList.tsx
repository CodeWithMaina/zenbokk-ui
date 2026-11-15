import { cn } from '../../lib/cn'
import type { FinancialBreakdownItem } from '../../lib/finances/api'
import { money } from '../../lib/format'

export type BreakdownListProps = {
  items: readonly FinancialBreakdownItem[]
  /** Shown when there is nothing in the period. */
  emptyLabel?: string
  className?: string
}

/**
 * A breakdown, as bars.
 *
 * The percentage bar is decoration; the amount is the fact. Slices come back already ordered largest
 * first, so the answer to "where did the money come from" is the first line — not something the reader
 * has to compute by comparing rows.
 */
export function BreakdownList({ items, emptyLabel = 'Nothing recorded for this period.', className }: BreakdownListProps) {
  if (items.length === 0) {
    return <p className={cn('text-meta text-muted', className)}>{emptyLabel}</p>
  }

  return (
    <ul className={cn('flex flex-col gap-[0.7rem]', className)}>
      {items.map((item) => (
        <li key={item.key} className="min-w-0">
          <div className="flex items-baseline justify-between gap-[0.6rem]">
            <span className="truncate text-meta font-medium">{item.label}</span>
            <span className="tabular text-meta font-semibold">{money(item.amount)}</span>
          </div>
          <div className="mt-[0.3rem] flex items-center gap-[0.5rem]">
            <div
              className="h-[0.4rem] flex-1 overflow-hidden rounded-pill bg-sunken"
              role="img"
              aria-label={`${item.label}: ${item.percentage}% of the total`}
            >
              <span
                className="block h-full rounded-pill bg-fg"
                style={{ width: `${Math.max(1, Math.min(100, item.percentage))}%` }}
              />
            </div>
            <span className="tabular text-caption text-muted">{item.percentage}%</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
