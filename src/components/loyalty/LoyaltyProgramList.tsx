import type { ReactNode } from 'react'
import { Award, RefreshCw, SearchX } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { LoyaltyProgram } from '../../lib/loyalty/types'
import { errorMessage } from '../../lib/api/client'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import { Skeleton } from '../ui/skeleton'
import { LoyaltyProgramCard } from './LoyaltyProgramCard'

export type LoyaltyProgramListProps = {
  programs: readonly LoyaltyProgram[]
  onOpen: (program: LoyaltyProgram) => void
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  /** True when a search term or a non-All status tab is narrowing the list. */
  filtered?: boolean
  onClearFilters?: () => void
  /** Shown in the truly-empty state. */
  onCreate?: () => void
  className?: string
}

const GRID_CLASS =
  'grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),24rem))] gap-x-[1.5rem] gap-y-[2rem] justify-start'

/**
 * The program list.
 *
 * One responsive surface: a wrapping gallery of cards on phones and tablets,
 * and a single bordered panel of rows from 900px — the switch the design makes.
 * Loading, failure and both kinds of empty state (nothing yet vs. no matches)
 * are handled here so the page stays a thin composition.
 */
export function LoyaltyProgramList({
  programs,
  onOpen,
  loading = false,
  error,
  onRetry,
  filtered = false,
  onClearFilters,
  onCreate,
  className,
}: LoyaltyProgramListProps) {
  if (loading) {
    return (
      <div className={className} aria-busy="true" aria-label="Loading programs">
        <div className={cn(GRID_CLASS, 'min-[900px]:block min-[900px]:rounded-card min-[900px]:border min-[900px]:border-line min-[900px]:bg-surface')}>
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="min-[900px]:flex min-[900px]:items-center min-[900px]:gap-[1.6rem] min-[900px]:border-b min-[900px]:border-line min-[900px]:px-[1.2rem] min-[900px]:py-[1rem] min-[900px]:last:border-b-0"
            >
              <Skeleton className="h-[11rem] w-full rounded-card min-[900px]:h-[7.75rem] min-[900px]:w-[12.5rem]" />
              <div className="mt-[0.8rem] w-full min-w-0 space-y-2 min-[900px]:mt-0">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <Alert tone="danger" title="Programs could not be loaded">
          <p>{errorMessage(error)}</p>
          {onRetry ? (
            <Button size="sm" className="mt-[0.6rem]" onClick={onRetry}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
          ) : null}
        </Alert>
      </div>
    )
  }

  if (programs.length === 0) {
    const empty: ReactNode = filtered ? (
      <EmptyState
        icon={<SearchX className="size-5" />}
        title="No programs found"
        description="Try a different search, or switch back to the All tab."
        action={
          onClearFilters ? (
            <Button onClick={onClearFilters}>Clear filters</Button>
          ) : undefined
        }
      />
    ) : (
      <EmptyState
        icon={<Award className="size-5" />}
        title="No loyalty programs yet"
        description="Create a program so customers can collect stamps and earn rewards."
        action={onCreate ? <Button onClick={onCreate}>New program</Button> : undefined}
      />
    )

    return <div className={cn('card', className)}>{empty}</div>
  }

  return (
    <div
      className={cn(
        GRID_CLASS,
        'min-[900px]:block min-[900px]:gap-0 min-[900px]:overflow-hidden min-[900px]:rounded-card min-[900px]:border min-[900px]:border-line min-[900px]:bg-surface',
        className,
      )}
      aria-label="Loyalty programs"
    >
      {programs.map((program, index) => (
        <div
          key={program.id}
          className="animate-rise"
          style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
        >
          <LoyaltyProgramCard program={program} onOpen={onOpen} />
        </div>
      ))}
    </div>
  )
}
