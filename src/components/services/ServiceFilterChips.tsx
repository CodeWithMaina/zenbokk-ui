import { appliedServiceFilters } from '../../lib/services'
import type { ServiceFilters } from '../../lib/services'
import { FilterSummary } from '../ui/filter-drawer'
import { LinkButton } from '../ui/button'
export type ServiceFilterChipsProps = {
  filters: ServiceFilters
  onFiltersChange: (filters: ServiceFilters) => void
  /** Result count, e.g. `6 of 12 services`. */
  summary?: string
  onClearAll?: () => void
  /** Also clears the search term, which the chips do not represent. */
  clearSearchToo?: boolean
  className?: string
}

/**
 * Applied refinements as removable chips.
 *
 * Removing a chip removes exactly that refinement: a status chip clears the
 * status selection, a price chip the range, a duration chip just that bucket.
 * That is why each chip carries its own id rather than the panel being re-derived.
 */
export function ServiceFilterChips({
  filters,
  onFiltersChange,
  summary,
  onClearAll,
  clearSearchToo = false,
  className,
}: ServiceFilterChipsProps) {
  const chips = appliedServiceFilters(filters)

  const remove = (id: string) => {
    if (id === 'status') {
      onFiltersChange({ ...filters, statuses: [] })
      return
    }
    if (id === 'price') {
      onFiltersChange({ ...filters, minPrice: null, maxPrice: null })
      return
    }
    if (id === 'visibility') {
      onFiltersChange({ ...filters, visibility: 'all' })
      return
    }
    if (id.startsWith('duration:')) {
      const bucketId = id.slice('duration:'.length)
      onFiltersChange({
        ...filters,
        durations: (filters.durations ?? []).filter((entry) => entry !== bucketId),
      })
    }
  }

  return (
    <FilterSummary
      className={className}
      filters={chips.map((chip) => ({
        id: chip.id,
        label: chip.label,
        onRemove: () => remove(chip.id),
      }))}
      summary={summary}
      onClearAll={
        onClearAll ??
        (() => {
          onFiltersChange({ ...filters, statuses: [], durations: [], minPrice: null, maxPrice: null, visibility: 'all' })
        })
      }
      clearLabel={clearSearchToo ? 'Clear search and filters' : 'Clear all'}
    />
  )
}

export type ServiceFilterEmptyHintProps = {
  onClearAll: () => void
  label?: string
  className?: string
}

/** Inline escape hatch shown when a search or filter set matches nothing. */
export function ServiceFilterEmptyHint({
  onClearAll,
  label = 'Clear search and filters',
  className,
}: ServiceFilterEmptyHintProps) {
  return (
    <LinkButton onClick={onClearAll} className={className}>
      {label}
    </LinkButton>
  )
}
