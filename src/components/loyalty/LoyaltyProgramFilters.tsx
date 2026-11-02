import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { ProgramStatusFilter } from '../../lib/loyalty/types'
import { PROGRAM_STATUS_FILTERS, programStatusFilterLabel } from '../../lib/loyalty/mappers'
import { Chip, ChipGroup } from '../ui/chip'

export type LoyaltyProgramFiltersProps = {
  search: string
  onSearchChange: (value: string) => void
  status: ProgramStatusFilter
  onStatusChange: (value: ProgramStatusFilter) => void
  /** Per-status totals from the loaded list, shown as tab counts. */
  counts?: Partial<Record<ProgramStatusFilter, number>>
  className?: string
}

/**
 * Search box and status tabs.
 *
 * The tabs are the backend's own lifecycle states — All, Active, Paused and
 * Draft — so a tab can never offer a filter the API cannot answer. Draft is
 * hidden until there is a draft to show (or it is the active tab), which keeps
 * a business that never drafts free of a dead control.
 *
 * `/` focuses the search box, as in the design.
 */
export function LoyaltyProgramFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  counts,
  className,
}: LoyaltyProgramFiltersProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/') return
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? ''
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const visibleFilters = PROGRAM_STATUS_FILTERS.filter(
    (filter) => filter !== 'draft' || (counts?.draft ?? 0) > 0 || status === 'draft',
  )

  return (
    <div className={cn('mb-[1.1rem] flex flex-wrap items-center justify-between gap-[0.6rem_1rem]', className)}>
      <label className="search max-w-[26rem] flex-1 basis-[13rem]">
        <Search className="size-4" aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search programs"
          aria-label="Search programs"
          autoComplete="off"
        />
        {search ? null : (
          <kbd className="hidden rounded-xs border border-line px-[0.4rem] py-[0.05rem] text-[0.72rem] text-muted sm:inline">
            /
          </kbd>
        )}
      </label>

      <ChipGroup
        label="Program status"
        className="flex-nowrap overflow-x-auto pb-[0.2rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleFilters.map((filter) => (
          <Chip
            key={filter}
            pressed={filter === status}
            onPressedChange={() => onStatusChange(filter)}
            count={counts?.[filter]}
            className="shrink-0"
          >
            {programStatusFilterLabel(filter)}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  )
}
