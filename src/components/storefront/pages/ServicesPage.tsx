import { useCallback, useEffect, useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { ServiceCatalogItem } from '../../../lib/api/types'
import { useMediaQuery } from '../../../lib/hooks/use-media-query'
import {
  DURATION_BUCKETS,
  PRICE_PRESETS,
  SORT_OPTIONS,
  appliedServiceFilters,
  durationBucket,
} from '../../../lib/services'
import type { ServiceFilters } from '../../../lib/services'
import { useStorefront } from '../../../lib/storefront'
import { matchesQuery, serviceCategories } from '../../../lib/storefront/search'
import { sectionContent } from '../../../lib/storefront/sections'
import { useStartBooking } from '../../../lib/storefront/use-start-booking'
import { useStorefrontServices } from '../../../lib/storefront/use-storefront-catalog'
import { storefrontHref } from '../../../lib/tenant'
import { CountBadge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Chip, ChipGroup } from '../../ui/chip'
import { Field, Input } from '../../ui/field'
import { PaginationBar } from '../../ui/pagination-bar'
import { QuickChoices } from '../../ui/quick-choices'
import { SearchField } from '../../ui/search-field'
import { ServiceFilterChips, ServiceFilterDrawer } from '../../services'
import { StorefrontPage, StorefrontPageUnavailable } from '../StorefrontPage'
import { StorefrontServiceCard } from '../StorefrontServiceCard'
import {
  StorefrontEmptyState,
  StorefrontErrorState,
  StorefrontSkeletonGrid,
} from '../StorefrontStates'

/** Services shown per page of the public menu. */
const PAGE_SIZE = 12

/** The unfiltered refinement set — price, duration and sort are the visitor's. */
const EMPTY_FILTERS: ServiceFilters = {
  statuses: [],
  durations: [],
  minPrice: null,
  maxPrice: null,
  visibility: 'all',
  sort: 'newest',
}

type ServiceFilterPanelProps = {
  filters: ServiceFilters
  categories: string[]
  category: string | null
  onCategoryChange: (category: string | null) => void
  onFiltersChange: (filters: ServiceFilters) => void
}

/**
 * The public catalogue's refinements.
 *
 * It is the Services module's own filter vocabulary — the very `Chip`, `Field`,
 * `QuickChoices` and controls the owner console uses — restricted to what a
 * visitor can act on: category, price, duration and sort. Status and storefront
 * visibility are deliberately absent: the public endpoint only ever returns
 * published, visible services, so offering those controls would be a lie.
 */
function ServiceFilterPanel({
  filters,
  categories,
  category,
  onCategoryChange,
  onFiltersChange,
}: ServiceFilterPanelProps) {
  const durations = filters.durations ?? []
  const minPrice = filters.minPrice ?? null
  const maxPrice = filters.maxPrice ?? null
  const activePreset = PRICE_PRESETS.find(
    (preset) => preset.min === minPrice && preset.max === maxPrice,
  )

  const toggleDuration = (id: string) =>
    onFiltersChange({
      ...filters,
      durations: durations.includes(id)
        ? durations.filter((entry) => entry !== id)
        : [...durations, id],
    })

  return (
    <div className="flex flex-col gap-[0.9rem]">
      {categories.length > 0 ? (
        <section>
          <p className="label">Category</p>
          <ChipGroup label="Service categories">
            <Chip pressed={category === null} onPressedChange={() => onCategoryChange(null)}>
              All
            </Chip>
            {categories.map((name) => (
              <Chip
                key={name}
                pressed={category === name}
                onPressedChange={() => onCategoryChange(category === name ? null : name)}
              >
                {name}
              </Chip>
            ))}
          </ChipGroup>
        </section>
      ) : null}

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

/**
 * The public service menu.
 *
 * Takes no props: it reads the tenant from context and does its own navigation,
 * so both address shapes (`/nuru-studio/services` and
 * `nuru-studio.zenbokk.com/services`) render this one component unchanged.
 *
 * The layout is deliberately flat. The search box and the Filters control sit
 * beside the page heading, not inside a card; refinements live in the Services
 * module's responsive filter panel — an inline column on wide screens, the same
 * overlay drawer the owner console uses below the design's 900px breakpoint —
 * and the results are paged with the shared `PaginationBar`. Filtering, sorting
 * and paging are client-side: the public catalogue endpoint returns the whole
 * published set in one call and offers no filter parameters, so doing it here is
 * the correct implementation and typing never issues a request.
 */
export function ServicesPage() {
  const { businessId, canonicalSlug, landingPage, can } = useStorefront()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [filters, setFilters] = useState<ServiceFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const startBooking = useStartBooking()

  // The panel is part of the layout on wide screens and an overlay below the
  // design's 900px breakpoint, so it only opens by default where there is room
  // to show it without covering the list.
  const wide = useMediaQuery('(min-width: 56.25rem)')
  const [filtersOpen, setFiltersOpen] = useState(wide)
  useEffect(() => {
    if (wide) setFiltersOpen(true)
  }, [wide])

  const { title, description } = sectionContent(landingPage, 'services')
  const services = useStorefrontServices(businessId, can('services'))
  const catalogue = services.services

  const categories = useMemo(
    () => serviceCategories(catalogue.map((service) => service.categoryName)),
    [catalogue],
  )

  const filtered = useMemo(() => {
    const min = filters.minPrice ?? null
    const max = filters.maxPrice ?? null
    const durations = filters.durations ?? []

    return catalogue.filter((service) => {
      if (category && service.categoryName !== category) return false
      if (!matchesQuery(query, service.name, service.description, service.categoryName)) return false
      if (min !== null && service.price < min) return false
      if (max !== null && service.price > max) return false
      if (durations.length > 0) {
        const inWindow = durations.some((id) => {
          const bucket = durationBucket(id)
          return bucket
            ? service.durationMinutes >= bucket.min &&
                (bucket.max === null || service.durationMinutes <= bucket.max)
            : false
        })
        if (!inWindow) return false
      }
      return true
    })
  }, [catalogue, category, query, filters.minPrice, filters.maxPrice, filters.durations])

  const sorted = useMemo(() => {
    const items = [...filtered]

    switch (filters.sort) {
      case 'name':
        return items.sort((a, b) => a.name.localeCompare(b.name))
      case 'price_asc':
        return items.sort((a, b) => a.price - b.price)
      case 'price_desc':
        return items.sort((a, b) => b.price - a.price)
      case 'duration_asc':
        return items.sort((a, b) => a.durationMinutes - b.durationMinutes)
      case 'newest':
      default:
        return items.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
    }
  }, [filtered, filters.sort])

  // Any refinement returns the visitor to the first page — adjusted during
  // render (React's documented "reset state when an input changes" pattern), so
  // there is no extra pass and no stale page after a filter change.
  const refinementKey = `${query}\u0000${category ?? ''}\u0000${filters.minPrice ?? ''}\u0000${filters.maxPrice ?? ''}\u0000${(filters.durations ?? []).join(',')}\u0000${filters.sort}`
  const [lastRefinementKey, setLastRefinementKey] = useState(refinementKey)
  if (lastRefinementKey !== refinementKey) {
    setLastRefinementKey(refinementKey)
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const clearEverything = useCallback(() => {
    setQuery('')
    setCategory(null)
    setFilters(EMPTY_FILTERS)
  }, [])

  if (!can('services')) {
    return (
      <StorefrontPageUnavailable
        title="This business doesn't publish a service menu"
        description="There is no catalogue on this plan, so there is nothing to browse here. Call the studio and they'll help you directly."
      />
    )
  }

  function book(service: ServiceCatalogItem) {
    startBooking({ serviceIds: [service.id] })
  }

  const activeFilterCount = appliedServiceFilters(filters).length + (category ? 1 : 0)
  const hasRefinements = activeFilterCount > 0 || query.trim().length > 0
  const showControls = !services.isPending && !services.isError && catalogue.length > 0

  return (
    <StorefrontPage
      eyebrow="Browse our offerings"
      title={title || 'Our Services'}
      description={
        description ??
        'Discover our complete range of services. Each offers quality, care, and attention to detail.'
      }
      action={
        showControls ? (
          <div className="flex w-full flex-wrap items-center gap-[0.6rem] sm:w-auto sm:flex-nowrap">
            <SearchField
              label="Search services"
              placeholder="Search services"
              value={query}
              autoComplete="off"
              className="min-w-[11rem] flex-1"
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="storefront-service-filters"
              className="shrink-0"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filters
              {activeFilterCount > 0 ? <CountBadge>{activeFilterCount}</CountBadge> : null}
            </Button>
          </div>
        ) : null
      }
    >
      {services.isPending ? (
        <StorefrontSkeletonGrid variant="services" />
      ) : services.isError ? (
        <StorefrontErrorState
          title="The service menu didn't load"
          description="Refresh the page to try again."
          onRetry={() => void services.refetch()}
        />
      ) : catalogue.length === 0 ? (
        <StorefrontEmptyState
          title="No services available yet"
          description="This business hasn't published its service offerings yet. Please check back soon."
        />
      ) : (
        <div className="flex items-start">
          <div className="min-w-0 flex-1">
            <ServiceFilterChips
              filters={filters}
              onFiltersChange={setFilters}
              onClearAll={clearEverything}
              clearSearchToo
              summary={
                hasRefinements
                  ? `Showing ${sorted.length} of ${catalogue.length} service${catalogue.length === 1 ? '' : 's'}`
                  : undefined
              }
              className="mb-[0.9rem]"
            />

            {sorted.length === 0 ? (
              <StorefrontEmptyState
                title="No services match your search"
                description="Try adjusting your filters or search term to discover more."
                action={
                  <Button variant="ghost" onClick={clearEverything}>
                    Clear search and filters
                  </Button>
                }
              />
            ) : (
              <>
                <div className="sf-grid-services">
                  {paged.map((service, index) => (
                    <StorefrontServiceCard
                      key={service.id}
                      service={service}
                      index={index}
                      detailHref={storefrontHref(canonicalSlug, `/services/${service.id}`)}
                      onBook={book}
                    />
                  ))}
                </div>

                {pageCount > 1 ? (
                  <div className="mt-[1.1rem]">
                    <PaginationBar
                      page={currentPage}
                      pageCount={pageCount}
                      onPageChange={setPage}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>

          <ServiceFilterDrawer
            panelId="storefront-service-filters"
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            onReset={clearEverything}
            applyLabel={`Show ${sorted.length} service${sorted.length === 1 ? '' : 's'}`}
          >
            <ServiceFilterPanel
              filters={filters}
              categories={categories}
              category={category}
              onCategoryChange={setCategory}
              onFiltersChange={setFilters}
            />
          </ServiceFilterDrawer>
        </div>
      )}
    </StorefrontPage>
  )
}
