import { cn } from '../../lib/cn'

export type SkeletonProps = {
  className?: string
}

/**
 * Shimmering placeholder. Mark the surrounding region `aria-busy="true"` and
 * give it a label; the blocks themselves are hidden from assistive tech.
 */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden="true" />
}

export type SkeletonTextProps = {
  lines?: number
  className?: string
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={cn('skeleton h-3', index === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}
