import { Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { toneSoftClass } from '../ui/badge'
import type { Tone } from '../ui/badge'
import { SectionCard } from '../ui/card'
import { Skeleton } from '../ui/skeleton'

export type ActivityEntry = {
  key: string
  icon: ReactNode
  tone: Tone
  title: ReactNode
  detail?: ReactNode
  time: ReactNode
  /** Settled money, printed at the end of the row. */
  amount?: ReactNode
}

export type ActivityPanelProps = {
  entries: readonly ActivityEntry[]
  title?: ReactNode
  icon?: ReactNode
  loading?: boolean
  action?: ReactNode
  emptyLabel?: ReactNode
  className?: string
}

/**
 * The day's recent movement, as a feed.
 *
 * Fed either by the ledger's recent activity or, on plans without the finance
 * module, by the bookings made recently — the caller decides which, because only
 * it knows what the business is entitled to.
 */
export function ActivityPanel({
  entries,
  title = 'Recent activity',
  icon,
  loading = false,
  action,
  emptyLabel = 'Nothing has happened yet today.',
  className,
}: ActivityPanelProps) {
  return (
    <SectionCard
      icon={icon ?? <Clock />}
      iconTone="info"
      title={title}
      titleClassName="font-display font-normal"
      className={cn('p-[clamp(0.65rem,1vw,0.95rem)]', className)}
      contentClassName="mt-[0.6rem]"
      action={action}
    >
      {loading ? (
        <div className="grid gap-[0.5rem]" aria-busy="true" aria-label="Loading recent activity">
          <Skeleton className="h-[2.2rem] rounded-lg" />
          <Skeleton className="h-[2.2rem] rounded-lg" />
          <Skeleton className="h-[2.2rem] rounded-lg" />
        </div>
      ) : entries.length === 0 ? (
        <p className="px-[0.35rem] py-[0.8rem] text-meta text-muted">{emptyLabel}</p>
      ) : (
        <ul className="dash-feed">
          {entries.map((entry) => (
            <li key={entry.key}>
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-[1.9rem] shrink-0 place-items-center rounded-[0.55rem] [&>svg]:size-[1.05rem]',
                  toneSoftClass[entry.tone],
                )}
              >
                {entry.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-meta leading-[1.3]">{entry.title}</p>
                <small className="text-caption text-subtle">
                  {entry.time}
                  {entry.detail ? ` · ${entry.detail}` : ''}
                </small>
              </div>
              {entry.amount ? (
                <span className="ml-auto text-label font-bold whitespace-nowrap">{entry.amount}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
