import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { Tone } from './badge'

export type ActivityEntry = {
  id: string
  title: ReactNode
  description?: ReactNode
  time: ReactNode
  tone?: Tone
}

export type ActivityTimelineProps = {
  entries: readonly ActivityEntry[]
  emptyLabel?: ReactNode
  className?: string
}

/** Dotted activity feed from the client detail page. */
export function ActivityTimeline({
  entries,
  emptyLabel = 'No activity yet.',
  className,
}: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className={cn('py-6 text-center text-meta text-muted', className)}>
        {emptyLabel}
      </p>
    )
  }

  return (
    <ul className={cn('min-w-0', className)}>
      {entries.map((entry, index) => {
        const last = index === entries.length - 1

        return (
          <li
            key={entry.id}
            className={cn('relative flex gap-[0.8rem]', !last && 'pb-[1.2rem]')}
          >
            {!last ? (
              <span
                aria-hidden="true"
                className="absolute top-[1.1rem] bottom-0 left-[0.34rem] w-px bg-line"
              />
            ) : null}

            <span
              aria-hidden="true"
              data-status={entry.tone ?? 'neutral'}
              className="relative mt-[0.3rem] size-[0.7rem] shrink-0 rounded-round bg-st-solid ring-4 ring-surface"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-[0.15rem]">
                <p className="font-semibold">{entry.title}</p>
                <span className="text-caption whitespace-nowrap text-muted">
                  {entry.time}
                </span>
              </div>
              {entry.description ? (
                <p className="mt-[0.1rem] text-meta text-muted">
                  {entry.description}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
