import { ListFilter, Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { CountBadge, StatusPill } from '../ui/badge'
import { Button } from '../ui/button'
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
  /** The line above the status pills: how many rows, and what is being shown. */
  summary: ReactNode
  statusCounts: readonly AppointmentStatusCount[]
  busy?: boolean
}

/**
 * The secondary controls: search, filters and the status counts.
 *
 * Date navigation moved up into the header's period bar, so this row is only about
 * narrowing what is on screen — which is what keeps the top of the page calm. The
 * status pills are counts of the rows the server returned for the current query,
 * so they always add up to the summary beside them.
 */
export function AppointmentsToolbar({
  search,
  onSearchChange,
  filterCount,
  onOpenFilters,
  summary,
  statusCounts,
  busy = false,
}: AppointmentsToolbarProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  // `/` focuses the search box, as in the reference design.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/') return
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? ''
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return
      if (document.querySelector('[role="dialog"]')) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="mb-[0.9rem]">
      <Toolbar>
        <label className="search max-w-[30rem] flex-[1_1_16rem]">
          <Search className="size-4" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search customer, phone, service or staff"
            aria-label="Search appointments"
            autoComplete="off"
          />
          {search ? null : (
            <kbd className="hidden rounded-xs border border-line px-[0.4rem] py-[0.05rem] text-[0.72rem] text-muted sm:inline">
              /
            </kbd>
          )}
        </label>

        <Button onClick={onOpenFilters} className="gap-[0.45rem]" aria-busy={busy || undefined}>
          <ListFilter className="size-4" aria-hidden="true" />
          Filters
          {filterCount > 0 ? <CountBadge>{filterCount}</CountBadge> : null}
        </Button>

        <ToolbarSpacer />
      </Toolbar>

      <div className="mt-[0.7rem] flex flex-wrap items-center gap-x-[0.7rem] gap-y-[0.4rem]">
        <span className="text-meta text-muted tabular">{summary}</span>
        {statusCounts.map((entry) => (
          <StatusPill key={entry.status} status={entry.status} className={cn('tabular')}>
            {entry.count} {entry.label.toLowerCase()}
          </StatusPill>
        ))}
      </div>
    </div>
  )
}
