import { CalendarX2, RefreshCw, SearchX, ShieldAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiError, errorMessage } from '../../lib/api/client'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'

export type AppointmentEmptyStateProps = {
  /** True when a search term or filter is narrowing the list. */
  filtered: boolean
  onReset?: () => void
  onNewBooking?: () => void
  className?: string
}

/** Nothing matched — distinguishes "no appointments yet" from "no results". */
export function AppointmentEmptyState({
  filtered,
  onReset,
  onNewBooking,
  className,
}: AppointmentEmptyStateProps) {
  if (filtered) {
    return (
      <EmptyState
        className={className}
        icon={<SearchX className="size-5" aria-hidden="true" />}
        title="Nothing found"
        description="No appointments match the current search and filters."
        action={
          onReset ? (
            <Button onClick={onReset} size="sm">
              Clear filters and search
            </Button>
          ) : null
        }
      />
    )
  }

  return (
    <EmptyState
      className={className}
      icon={<CalendarX2 className="size-5" aria-hidden="true" />}
      title="No appointments yet"
      description="Bookings made online, by your team or from the storefront will appear here."
      action={
        onNewBooking ? (
          <Button variant="primary" size="sm" onClick={onNewBooking}>
            New booking
          </Button>
        ) : null
      }
    />
  )
}

export type AppointmentErrorStateProps = {
  error: unknown
  onRetry?: () => void
  className?: string
}

/**
 * A failed read, reported in the API's own words.
 *
 * `MODULE_DISABLED` and 403 are called out explicitly because they are not
 * transient: retrying will never help, and the operator needs to know whether to
 * change the plan or their role.
 */
export function AppointmentErrorState({ error, onRetry, className }: AppointmentErrorStateProps) {
  const apiError = error instanceof ApiError ? error : null
  const moduleDisabled = apiError?.isModuleDisabled === true
  const forbidden = apiError?.isForbidden === true

  let description: ReactNode = errorMessage(error)
  if (moduleDisabled) {
    description =
      'Appointments are not included in this business’s current plan. Enable the module to see bookings.'
  } else if (forbidden) {
    description = 'Your role does not include appointments access. Ask the business owner for it.'
  }

  return (
    <EmptyState
      className={className}
      icon={<ShieldAlert className="size-5" aria-hidden="true" />}
      title={moduleDisabled ? 'Appointments are unavailable' : 'Could not load appointments'}
      description={description}
      action={
        onRetry && !moduleDisabled && !forbidden ? (
          <Button size="sm" onClick={onRetry}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Try again
          </Button>
        ) : null
      }
    />
  )
}
