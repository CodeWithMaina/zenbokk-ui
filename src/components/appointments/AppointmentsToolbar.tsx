import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { CountBadge, StatusPill } from '../ui/badge'
import { Button } from '../ui/button'
import { SearchField } from '../ui/search-field'
import { Toolbar, ToolbarSpacer } from '../ui/toolbar'

export type AppointmentStatusCount = {
  status: string
  label: string
  count: number
}

export type AppointmentsToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  filterCount: number
  onOpenFilters: () => void
  /** Calendar pane navigation. Hidden in the table and cards views. */
  navigation?: {
    label: string
    onPrevious: () => void
    onNext: () => void
    onToday: () => void
  }
  /** The line above the status pills: how many rows, and what is being shown. */
  summary: ReactNode
  statusCounts: readonly AppointmentStatusCount[]
  busy?: boolean
}

/**
 * Search, filters and the view-specific navigation.
 *
 * The status pills are counts of the rows the server returned for the current
 * query — the same rows the list is rendering — so they always add up to the
 * summary beside them.
 */
export function AppointmentsToolbar({
  search,
  onSearchChange,
  filterCount,
  onOpenFilters,
  navigation,
  summary,
  statusCounts,
  busy = false,
}: AppointmentsToolbarProps) {
  return (
    <div className="mb-[0.9rem]">
      <Toolbar>
        <SearchField
          label="Search appointments"
          placeholder="Search customer, phone, service or staff"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="flex-[1_1_16rem] max-w-[30rem]"
        />

        <Button onClick={onOpenFilters} className="gap-[0.45rem]">
          <ListFilter className="size-4" aria-hidden="true" />
          Filters
          {filterCount > 0 ? <CountBadge>{filterCount}</CountBadge> : null}
        </Button>

        <ToolbarSpacer />

        {navigation ? (
          <div className="flex items-center gap-[0.4rem]">
            <Button
              size="icon"
              aria-label="Previous period"
              onClick={navigation.onPrevious}
              disabled={busy}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              aria-label="Next period"
              onClick={navigation.onNext}
              disabled={busy}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
            <Button onClick={navigation.onToday} disabled={busy}>
              Today
            </Button>
            <p className="ml-[0.3rem] text-label font-semibold tabular">{navigation.label}</p>
          </div>
        ) : null}
      </Toolbar>

      <div className="mt-[0.7rem] flex flex-wrap items-center gap-x-[0.7rem] gap-y-[0.4rem]">
        <span className="text-meta text-muted tabular">{summary}</span>
        {statusCounts.map((entry) => (
          <StatusPill
            key={entry.status}
            status={entry.status}
            className={cn('tabular')}
          >
            {entry.count} {entry.label.toLowerCase()}
          </StatusPill>
        ))}
      </div>
    </div>
  )
}
