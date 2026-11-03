import type { ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'

/**
 * The three states every storefront data surface can be in.
 *
 * They exist so no section has to invent its own: a skeleton shaped like the
 * content it replaces (rather than a spinner), an empty state that says what is
 * missing, and an error state with a retry that actually retries. None of them
 * fabricates content to fill the space.
 */

export type StorefrontSkeletonGridProps = {
  /** `services` is the 4/5 card grid; `team` is the 3/4 board. */
  variant?: 'services' | 'team' | 'list'
  count?: number
}

export function StorefrontSkeletonGrid({
  variant = 'services',
  count = 6,
}: StorefrontSkeletonGridProps) {
  if (variant === 'list') {
    return (
      <div className="grid gap-[0.55rem]" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading…</span>
        {Array.from({ length: Math.min(count, 4) }, (_, index) => (
          <Skeleton key={index} className="h-[4.6rem] rounded-card" />
        ))}
      </div>
    )
  }

  return (
    <div
      className={variant === 'team' ? 'sf-board' : 'sf-grid-services'}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          className={variant === 'team' ? 'aspect-3/4 w-full' : 'aspect-4/5 w-full'}
        />
      ))}
    </div>
  )
}

export type StorefrontEmptyStateProps = {
  title: string
  description?: string
  /** A way out of the empty state, e.g. clearing the search. */
  action?: ReactNode
}

export function StorefrontEmptyState({
  title,
  description,
  action,
}: StorefrontEmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-[0.6rem] rounded-panel border border-dashed border-line px-[1.2rem] py-[2.6rem] text-center">
      <p className="sf-heading text-heading">{title}</p>
      {description ? (
        <p className="max-w-[34rem] text-meta text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  )
}

export type StorefrontErrorStateProps = {
  title: string
  description?: string
  onRetry?: () => void
}

export function StorefrontErrorState({
  title,
  description,
  onRetry,
}: StorefrontErrorStateProps) {
  return (
    <div className="grid justify-items-center gap-[0.7rem] rounded-panel border border-line bg-surface px-[1.2rem] py-[2.4rem] text-center">
      <span className="grid size-[2.4rem] place-items-center rounded-round bg-danger-soft text-danger-ink">
        <AlertTriangle className="size-[1.1rem]" aria-hidden="true" />
      </span>
      <p className="text-heading font-bold tracking-snug">{title}</p>
      {description ? (
        <p className="max-w-[34rem] text-meta text-muted">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="ghost" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
