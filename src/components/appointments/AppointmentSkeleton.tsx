import { cn } from '../../lib/cn'
import { Skeleton } from '../ui/skeleton'

export type AppointmentSkeletonProps = {
  rows?: number
  /** Day columns in the calendar placeholder. */
  columns?: number
  className?: string
}

/**
 * List placeholder. The wrapper is `aria-busy` and labelled, so a screen reader
 * announces a loading region instead of a set of empty blocks.
 */
export function AppointmentSkeleton({ rows = 6, className }: AppointmentSkeletonProps) {
  return (
    <div
      className={cn('card divide-y divide-line', className)}
      aria-busy="true"
      aria-label="Loading appointments"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-[0.9rem] p-[1rem]">
          <Skeleton className="size-[2.9rem] rounded-round" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-[38%]" />
            <Skeleton className="h-3 w-[62%]" />
          </div>
          <Skeleton className="h-5 w-[4.5rem] rounded-pill" />
        </div>
      ))}
    </div>
  )
}

/** Calendar placeholder: a header row plus the day columns. */
export function AppointmentCalendarSkeleton({ columns = 7, className }: AppointmentSkeletonProps) {
  return (
    <div
      className={cn('card overflow-hidden', className)}
      aria-busy="true"
      aria-label="Loading calendar"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-px bg-line">
        {Array.from({ length: columns }, (_, index) => (
          <div key={index} className="bg-surface p-[0.8rem]">
            <Skeleton className="h-3 w-[70%]" />
          </div>
        ))}
      </div>
      <div className="space-y-3 p-[1rem]">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full rounded-md" />
        ))}
      </div>
    </div>
  )
}
