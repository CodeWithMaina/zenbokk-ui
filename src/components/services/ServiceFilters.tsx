import { cn } from '../../lib/cn'
import { DURATION_BUCKETS, SORT_OPTIONS } from '../../lib/services'
import type { ServiceFilters as ServiceFilterState, ServiceVisibilityFilter } from '../../lib/services'
import { Chip, ChipGroup } from '../ui/chip'
import { SegmentedControl } from '../ui/segmented-control'
import { ServicePriceRange } from './ServicePriceRange'

export type ServiceFiltersProps = {
  /** The draft being edited — not the applied filters, so nothing live can shift. */
  filters: ServiceFilterState
  onFiltersChange: (filters: ServiceFilterState) => void
  /** Real catalogue price bounds; the slider cannot exceed them. */
  priceBounds?: { min: number; max: number } | undefined
  className?: string
}

const VISIBILITY_OPTIONS: { value: ServiceVisibilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
]

/**
 * The filter panel's body: price range, duration, storefront visibility and sort.
 *
 * Status is deliberately absent — the three tabs above the grid are the status
 * filter, and repeating it here would let the two disagree. Every control is
 * controlled and side-effect free: the page owns the draft, so the desktop panel
 * and the phone bottom sheet render the same body and neither applies anything
 * until the owner presses Apply.
 */
export function ServiceFilters({ filters, onFiltersChange, priceBounds, className }: ServiceFiltersProps) {
  const durations = filters.durations ?? []

  const toggleDuration = (id: string) => {
    onFiltersChange({
      ...filters,
      durations: durations.includes(id)
        ? durations.filter((entry) => entry !== id)
        : [...durations, id],
    })
  }

  return (
    <div className={cn('flex flex-col gap-[1.1rem]', className)}>
      <section className="flex flex-col gap-[0.35rem]">
        <div>
          <p className="label">Price range</p>
          <p className="text-meta text-muted">Narrow the catalogue by what a service costs.</p>
        </div>
        {priceBounds ? (
          <ServicePriceRange
            boundMin={priceBounds.min}
            boundMax={priceBounds.max}
            min={filters.minPrice ?? priceBounds.min}
            max={filters.maxPrice ?? priceBounds.max}
            onChange={(next) =>
              onFiltersChange({
                ...filters,
                // A range spanning the whole catalogue is the same as no filter, so
                // it is stored as unset and does not raise the active-filter count.
                minPrice: next.min <= priceBounds.min ? null : next.min,
                maxPrice: next.max >= priceBounds.max ? null : next.max,
              })
            }
          />
        ) : (
          <p className="text-meta text-muted">Prices load with your catalogue.</p>
        )}
      </section>

      <section>
        <p className="label">Duration</p>
        <ChipGroup label="Service duration">
          {DURATION_BUCKETS.map((bucket) => (
            <Chip
              key={bucket.id}
              pressed={durations.includes(bucket.id)}
              onPressedChange={() => toggleDuration(bucket.id)}
            >
              {bucket.label}
            </Chip>
          ))}
        </ChipGroup>
      </section>

      <section>
        <p className="label">Storefront</p>
        <SegmentedControl
          label="Storefront visibility"
          options={VISIBILITY_OPTIONS}
          value={filters.visibility ?? 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, visibility: value })}
          className="w-full"
        />
        <p className="mt-[0.35rem] text-meta text-muted">
          Visible services appear on your storefront; hidden ones stay internal.
        </p>
      </section>

      <section>
        <p className="label">Sort by</p>
        <ChipGroup label="Sort services">
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.id}
              pressed={(filters.sort ?? 'newest') === option.id}
              onPressedChange={() => onFiltersChange({ ...filters, sort: option.id })}
            >
              {option.label}
            </Chip>
          ))}
        </ChipGroup>
      </section>
    </div>
  )
}
