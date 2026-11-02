import { formatDuration, money } from '../format'
import { pickVariant } from '../media'
import type { ImageVariant } from '../api/types'
import type {
  Service,
  ServiceDraft,
  ServiceFilters,
  ServiceQuery,
  ServiceSort,
  ServiceStatus,
  ServiceStatusAction,
} from './types'

/**
 * Presentation and query mapping for the Services module.
 *
 * One place that turns the API's rows into labels, tones and query parameters,
 * so the list, the detail page and the form can never disagree about what
 * "paused" looks like or how a price range is sent.
 */

export const SERVICE_STATUSES: readonly ServiceStatus[] = ['active', 'paused', 'archived']

const STATUS_LABELS: Record<ServiceStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
}

export function serviceStatusLabel(status: string): string {
  return STATUS_LABELS[status as ServiceStatus] ?? status
}

/** Statuses the design paints with a semantic pill; unknown values stay neutral. */
export function serviceStatusTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'paused') return 'warning'
  return 'neutral'
}

/** Paused and archived services are dimmed in the grid, exactly as in the design. */
export function isServiceMuted(status: string): boolean {
  return status !== 'active'
}

/** Only an active service can be booked. */
export function isServiceBookable(service: Pick<Service, 'status'>): boolean {
  return service.status === 'active'
}

export type DurationBucket = {
  id: string
  label: string
  min: number
  max: number | null
}

/** The four duration chips from the design, as inclusive server-side bounds. */
export const DURATION_BUCKETS: readonly DurationBucket[] = [
  { id: 'up-to-30', label: 'Up to 30 min', min: 0, max: 30 },
  { id: '31-60', label: '31–60 min', min: 31, max: 60 },
  { id: '61-90', label: '61–90 min', min: 61, max: 90 },
  { id: 'over-90', label: 'Over 90 min', min: 91, max: null },
]

export function durationBucket(id: string): DurationBucket | undefined {
  return DURATION_BUCKETS.find((bucket) => bucket.id === id)
}

export type PricePreset = {
  id: string
  label: string
  min: number | null
  max: number | null
}

/** Quick price ranges, matching the design's presets in KES. */
export const PRICE_PRESETS: readonly PricePreset[] = [
  { id: 'under-2500', label: 'Under 2,500', min: null, max: 2500 },
  { id: '2500-5000', label: '2,500 – 5,000', min: 2500, max: 5000 },
  { id: 'over-5000', label: '5,000 and over', min: 5000, max: null },
]

export type SortOption = { id: ServiceSort; label: string }

export const SORT_OPTIONS: readonly SortOption[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'name', label: 'Name A–Z' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'duration_asc', label: 'Shortest first' },
]

/** Sort id → the `sortBy`/`sortDirection` pair the endpoint expects. */
export function toSortParams(sort: ServiceSort): { sortBy: string; sortDirection: 'asc' | 'desc' } {
  switch (sort) {
    case 'name':
      return { sortBy: 'name', sortDirection: 'asc' }
    case 'price_asc':
      return { sortBy: 'price', sortDirection: 'asc' }
    case 'price_desc':
      return { sortBy: 'price', sortDirection: 'desc' }
    case 'duration_asc':
      return { sortBy: 'duration', sortDirection: 'asc' }
    default:
      return { sortBy: 'newest', sortDirection: 'desc' }
  }
}

export const DEFAULT_SERVICE_FILTERS = {
  statuses: [] as ServiceStatus[],
  durations: [] as string[],
  visibility: 'all' as const,
  sort: 'newest' as ServiceSort,
}

/**
 * Filters → the endpoint's query object.
 *
 * Duration chips are additive (one OR another), so the buckets collapse into the
 * widest selected window, which is the shape a single server-side range takes.
 */
export function toServiceQuery(
  filters: ServiceFilters,
  page: number,
  pageSize: number,
): ServiceQuery {
  const statuses = filters.statuses ?? []
  const buckets = (filters.durations ?? [])
    .map(durationBucket)
    .filter((bucket): bucket is DurationBucket => Boolean(bucket))

  const minDuration = buckets.length > 0 ? Math.min(...buckets.map((bucket) => bucket.min)) : null
  const maxDuration =
    buckets.length > 0 && buckets.every((bucket) => bucket.max !== null)
      ? Math.max(...buckets.map((bucket) => bucket.max ?? 0))
      : null

  const sort = toSortParams(filters.sort ?? 'newest')

  return {
    search: filters.search?.trim() ? filters.search.trim() : null,
    // Comma-separated so a multi-select status filter is still one request; the
    // API reads an unknown value as "no status filter" rather than as empty.
    status: statuses.length > 0 ? statuses.join(',') : null,
    minPrice: filters.minPrice ?? null,
    maxPrice: filters.maxPrice ?? null,
    minDuration,
    maxDuration,
    showcase: filters.visibility === 'all' ? null : filters.visibility === 'visible',
    ...sort,
    page,
    pageSize,
  }
}

export type AppliedServiceFilter = { id: string; label: string }

/** The chips shown above the grid — one per active refinement. */
export function appliedServiceFilters(filters: ServiceFilters): AppliedServiceFilter[] {
  const chips: AppliedServiceFilter[] = []
  const statuses = filters.statuses ?? []

  if (statuses.length > 0) {
    chips.push({
      id: 'status',
      label: `Status: ${statuses.map(serviceStatusLabel).join(', ')}`,
    })
  }

  const min = filters.minPrice ?? null
  const max = filters.maxPrice ?? null
  if (min !== null || max !== null) {
    chips.push({
      id: 'price',
      label: `Price: ${min !== null ? money(min) : 'Any'} – ${max !== null ? money(max) : 'Any'}`,
    })
  }

  for (const id of filters.durations ?? []) {
    const bucket = durationBucket(id)
    if (bucket) chips.push({ id: `duration:${id}`, label: bucket.label })
  }

  if (filters.visibility && filters.visibility !== 'all') {
    chips.push({
      id: 'visibility',
      label: `Storefront: ${filters.visibility === 'visible' ? 'Visible' : 'Hidden'}`,
    })
  }

  return chips
}

export function countActiveFilters(filters: ServiceFilters): number {
  return appliedServiceFilters(filters).length
}

export function hasActiveFilters(filters: ServiceFilters): boolean {
  return countActiveFilters(filters) > 0
}

/** The cover image URL: the first image with a ready URL. */
export function serviceCoverUrl(
  service: Pick<Service, 'images' | 'imageVariants'>,
): string | undefined {
  const cover = service.images.find((image) => Boolean(image.url))
  if (cover?.url) return cover.url
  // No attached cover: fall back to the widest variant of the service's own
  // cover media rather than whichever happened to be last in the array.
  return pickVariant(service.imageVariants ?? [])?.url
}

/**
 * The cover's processed variants, so a card can ship the right width and format
 * instead of downloading the largest file into the smallest slot.
 */
export function serviceCoverVariants(
  service: Pick<Service, 'images' | 'imageVariants'>,
): ImageVariant[] {
  const cover = service.images.find((image) => Boolean(image.url) && image.variants.length > 0)
  if (cover) return cover.variants
  return service.imageVariants ?? []
}

/** Gallery images with a ready URL, in display order, each with its variants. */
export function serviceGalleryImages(
  service: Pick<Service, 'images'>,
): { src: string; variants: ImageVariant[] }[] {
  return service.images
    .filter((image) => Boolean(image.url))
    .map((image) => ({ src: image.url as string, variants: image.variants }))
}

/** `120` → `2h`, `45` → `45 min`. */
export function serviceDurationLabel(minutes: number): string {
  return formatDuration(minutes)
}

/** `5200` → `KES 5,200`; a zero-priced service reads as `Free`. */
export function servicePriceLabel(price: number): string {
  return price > 0 ? money(price) : 'Free'
}

/** The lifecycle actions available from a given status, in menu order. */
export function serviceStatusActions(status: string): ServiceStatusAction[] {
  if (status === 'archived') return ['restore']
  if (status === 'paused') return ['resume', 'archive']
  return ['pause', 'archive']
}

export function serviceStatusActionLabel(action: ServiceStatusAction): string {
  switch (action) {
    case 'pause':
      return 'Pause service'
    case 'resume':
      return 'Resume service'
    case 'archive':
      return 'Archive service'
    default:
      return 'Restore from archive'
  }
}

/** Why a paused or archived service cannot be booked, as the detail page says it. */
export function serviceAvailabilityHint(status: string): string | null {
  if (status === 'paused') return 'Paused services can’t be booked. Resume it to take bookings.'
  if (status === 'archived') {
    return 'Archived services are hidden everywhere. Restore it to take bookings.'
  }
  return null
}

/** A draft from an existing service, so the edit form starts from real values. */
export function serviceToDraft(service: Service): ServiceDraft {
  return {
    name: service.name,
    description: service.description ?? '',
    durationMinutes: service.durationMinutes,
    price: service.price,
    showcase: service.showcase,
    mediaIds: service.images.map((image) => image.mediaId),
  }
}
