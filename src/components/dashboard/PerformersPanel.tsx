import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { SectionCard } from '../ui/card'
import { Progress } from '../ui/progress'
import { Skeleton } from '../ui/skeleton'

export type PerformerRow = {
  key: string
  label: ReactNode
  value: ReactNode
  /** 0–100, already resolved by whoever supplied the row. */
  percent: number
}

export type PerformersPanelProps = {
  rows: readonly PerformerRow[]
  description?: ReactNode
  loading?: boolean
  emptyLabel?: ReactNode
  className?: string
}

/**
 * "Top performers": a ranked list whose bars compare each row with the leader.
 *
 * The percentages arrive pre-computed — from the ledger's per-staff revenue
 * breakdown, or from the roster's own booking counts — so the panel never does
 * arithmetic the API already did.
 */
export function PerformersPanel({
  rows,
  description = 'This month',
  loading = false,
  emptyLabel = 'Not enough activity to rank anyone yet.',
  className,
}: PerformersPanelProps) {
  return (
    <SectionCard
      icon={<Star />}
      iconTone="warning"
      title="Top performers"
      description={description}
      titleClassName="font-display font-normal"
      className={cn('p-[clamp(0.65rem,1vw,0.95rem)]', className)}
      contentClassName="mt-[0.6rem]"
    >
      {loading ? (
        <div className="grid gap-[0.7rem]" aria-busy="true" aria-label="Loading top performers">
          <Skeleton className="h-[1.6rem] rounded-md" />
          <Skeleton className="h-[1.6rem] rounded-md" />
          <Skeleton className="h-[1.6rem] rounded-md" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-meta text-muted">{emptyLabel}</p>
      ) : (
        <div className="grid gap-[0.6rem]">
          {rows.map((row) => (
            <div key={row.key} className="dash-rank">
              <span className="truncate text-meta text-muted">{row.label}</span>
              <b className="text-meta font-bold tabular">{row.value}</b>
              <Progress
                value={row.percent}
                ariaLabel={typeof row.label === 'string' ? row.label : row.key}
                className="col-span-2 [&>div]:h-[0.25rem] [&>div]:bg-sunken"
              />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
