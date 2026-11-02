import type { ServiceCatalogItem, ServiceImage } from '../api/types'

/**
 * Domain vocabulary for the Services module.
 *
 * The wire types live in `lib/api/types.ts` (they mirror the DTOs exactly); the
 * names below are what the UI reasons about, so a component never has to know
 * that "paused" is `isActive === false && isArchived === false`.
 */

export type ServiceStatus = 'active' | 'paused' | 'archived'

/** Statuses a filter can select. `all` is the absence of the filter. */
export type ServiceStatusFilter = ServiceStatus

export type Service = ServiceCatalogItem
export type { ServiceImage }

/** Storefront visibility filter. `all` is the absence of the filter. */
export type ServiceVisibilityFilter = 'all' | 'visible' | 'hidden'

/** The list's sort options, in the order the design offers them. */
export type ServiceSort = 'newest' | 'name' | 'price_asc' | 'price_desc' | 'duration_asc'

export type ServiceFilters = {
  search?: string
  /** Empty array means "no status filter", which the API reads as all. */
  statuses?: ServiceStatus[]
  minPrice?: number | null
  maxPrice?: number | null
  /** Duration buckets, by id — see `DURATION_BUCKETS`. */
  durations?: string[]
  visibility?: ServiceVisibilityFilter
  sort?: ServiceSort
}

/** What `GET /v1/services/me/query` receives; built by `toServiceQuery`. */
export type ServiceQuery = {
  search?: string | null
  status?: string | null
  minPrice?: number | null
  maxPrice?: number | null
  minDuration?: number | null
  maxDuration?: number | null
  showcase?: boolean | null
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  page: number
  pageSize: number
}

/** Form payload for create/edit; `images` is the ordered media id list. */
export type ServiceDraft = {
  name: string
  description: string
  durationMinutes: number
  price: number
  showcase: boolean
  /** Ordered media ids — index 0 is the cover. Never more than three. */
  mediaIds: string[]
}

/** Status transitions exposed by the API as dedicated routes. */
export type ServiceStatusAction = 'pause' | 'resume' | 'archive' | 'restore'
