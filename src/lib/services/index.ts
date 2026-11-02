/**
 * Services module: the owner-facing service catalogue.
 *
 * `api.ts` is the only place that talks to the service endpoints, `service.utils.ts`
 * owns every label/query mapping, and the hooks own the query keys — so the pages
 * and components stay presentational.
 */
export { servicesApi } from './api'
export type { ServiceCounts } from './api'
export {
  DEFAULT_SERVICE_FILTERS,
  DURATION_BUCKETS,
  PRICE_PRESETS,
  SERVICE_STATUSES,
  SORT_OPTIONS,
  appliedServiceFilters,
  countActiveFilters,
  durationBucket,
  hasActiveFilters,
  isServiceBookable,
  isServiceMuted,
  serviceAvailabilityHint,
  serviceCoverUrl,
  serviceCoverVariants,
  serviceDurationLabel,
  serviceGalleryImages,
  servicePriceLabel,
  serviceStatusActionLabel,
  serviceStatusActions,
  serviceStatusLabel,
  serviceStatusTone,
  serviceToDraft,
  toServiceQuery,
  toSortParams,
} from './service.utils'
export type { AppliedServiceFilter, DurationBucket, PricePreset, SortOption } from './service.utils'
export { useService, useServiceCounts, useServiceMutations, useServices } from './use-services'
export type {
  Service,
  ServiceDraft,
  ServiceFilters,
  ServiceImage,
  ServiceQuery,
  ServiceSort,
  ServiceStatus,
  ServiceStatusAction,
  ServiceVisibilityFilter,
} from './types'
