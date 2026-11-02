import { cn } from '../../lib/cn'
import {
  DURATION_BUCKETS,
  PRICE_PRESETS,
  SERVICE_STATUSES,
  SORT_OPTIONS,
  serviceStatusLabel,
} from '../../lib/services'
import type { ServiceFilters, ServiceStatus, ServiceVisibilityFilter } from '../../lib/services'
import { Chip, ChipGroup } from '../ui/chip'
import { Field, Input } from '../ui/field'
import { QuickChoices } from '../ui/quick-choices'
import { SegmentedControl } from '../ui/segmented-control'

export type ServiceFiltersProps = {
  filters: ServiceFilters
  onFiltersChange: (filters: ServiceFilters) => void
  /** Server counts per status, so a row can say how many it would show. */
  counts?: { active: number; paused: number; archived: number } | undefined
  className?: string
}

const VISIBILITY_OPTIONS: { value: ServiceVisibilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
]

/**
 * The filter panel's contents: status, price, duration, storefront visibility
 * and sort.
 *
 * It is deliberately controlled and side-effect free — the page owns the filter
 * state (and mirrors it into the URL), and this component only renders and
 * reports changes, so the same body works in the desktop panel and the phone
 * sheet without branching.
 */
export function ServiceFilters({ filters, onFiltersChange, counts, className }: ServiceFiltersProps) {
  const statuses = filters.statuses ?? []
  const durations = filters.durations ?? []
  const minPrice = filters.minPrice ?? null
  const maxPrice = filters.maxPrice ?? null

  const toggleStatus = (status: ServiceStatus) => {
    onFiltersChange({
      ...filters,
      statuses: statuses.includes(status)
        ? statuses.filter((entry) => entry !== status)
        : [...statuses, status],
    })
  }

  const toggleDuration = (id: string) => {
    onFiltersChange({
      ...filters,
      durations: durations.includes(id)
        ? durations.filter((entry) => entry !== id)
        : [...durations, id],
    })
  }

  const activePreset = PRICE_PRESETS.find(
    (preset) => preset.min === minPrice && preset.max === maxPrice,
  )

  return (
    <div className={cn('flex flex-col gap-[0.9rem]', className)}>
      <section>
        <p className="label">Status</p>
        <div className="flex flex-col gap-[0.35rem]">
          {SERVICE_STATUSES.map((status) => {
            const count = counts?.[status]
            const selected = statuses.includes(status)

            return (
              <label key={status} className="option cursor-pointer gap-[0.7rem] py-[0.55rem]">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{serviceStatusLabel(status)}</span>
                  {count !== undefined ? (
                    <span className="block text-meta text-muted">
                      {count} {count === 1 ? 'service' : 'services'}
                    </span>
                  ) : null}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selected}
                  onChange={() => toggleStatus(status)}
                />
                <span className="check shrink-0" aria-hidden="true">
                  {selected ? <span className="block size-[0.5rem] rounded-round bg-current" /> : null}
                </span>
              </label>
            )
          })}
        </div>
      </section>

      <section>
        <p className="label">Price (KES)</p>
        <div className="grid grid-cols-2 gap-[0.8rem]">
          <Field label="Min" htmlFor="service-filter-min-price">
            <Input
              id="service-filter-min-price"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              placeholder="0"
              value={minPrice ?? ''}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  minPrice: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            />
          </Field>
          <Field label="Max" htmlFor="service-filter-max-price">
            <Input
              id="service-filter-max-price"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              placeholder="Any"
              value={maxPrice ?? ''}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  maxPrice: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            />
          </Field>
        </div>
        <QuickChoices
          label="Quick price ranges"
          options={PRICE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
          value={activePreset?.id ?? null}
          onChange={(id) => {
            const preset = PRICE_PRESETS.find((entry) => entry.id === id)
            if (!preset) return
            const isActive = activePreset?.id === id
            onFiltersChange({
              ...filters,
              minPrice: isActive ? null : preset.min,
              maxPrice: isActive ? null : preset.max,
            })
          }}
        />
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
