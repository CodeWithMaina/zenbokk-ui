import { SlidersHorizontal } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { CountBadge } from '../ui/badge'
import { Toolbar } from '../ui/toolbar'
import { ServiceSearch } from './ServiceSearch'

export type ServiceToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  /** Number of applied refinements, shown as the badge on the Filters button. */
  activeFilterCount: number
  onToggleFilters: () => void
  filtersOpen: boolean
  /** Panel the button controls, for `aria-controls`. */
  filtersPanelId?: string
  searching?: boolean
  className?: string
}

/**
 * Search + Filters row above the grid.
 *
 * The count badge is the design's own affordance: it tells the owner how many
 * refinements are narrowing the list before they open the panel.
 */
export function ServiceToolbar({
  search,
  onSearchChange,
  activeFilterCount,
  onToggleFilters,
  filtersOpen,
  filtersPanelId,
  searching = false,
  className,
}: ServiceToolbarProps) {
  return (
    <Toolbar className={cn('flex-nowrap items-stretch', className)}>
      <ServiceSearch
        value={search}
        onValueChange={onSearchChange}
        busy={searching}
        className="min-w-0 flex-[1_1_13rem]"
      />

      <Button
        type="button"
        onClick={onToggleFilters}
        aria-expanded={filtersOpen}
        aria-controls={filtersPanelId}
        className="shrink-0"
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filters
        {activeFilterCount > 0 ? <CountBadge>{activeFilterCount}</CountBadge> : null}
      </Button>
    </Toolbar>
  )
}
