import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { storefrontApi } from './api'

/**
 * Public storefront reads that are not part of the bootstrap payload: the
 * published gallery, the opening hours and the server-side search.
 *
 * All three are anonymous and business-scoped. Each key starts with
 * `['storefront', businessId, …]`, so switching tenants cannot reuse another
 * business's cached gallery, hours or results, and a plain
 * `invalidateQueries({ queryKey: ['storefront'] })` refreshes all of them.
 */

/** The business's published gallery. */
export function useStorefrontGallery(businessId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.storefrontGallery(businessId),
    queryFn: () => storefrontApi.gallery(businessId),
    enabled: enabled && Boolean(businessId),
  })
}

/** The business's opening hours. */
export function useStorefrontOpeningHours(businessId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.storefrontHours(businessId),
    queryFn: () => storefrontApi.openingHours(businessId),
    enabled: enabled && Boolean(businessId),
    // Opening hours change rarely; a longer stale time keeps the footer from
    // re-fetching on every navigation.
    staleTime: 5 * 60_000,
  })
}

export type StorefrontSearchParams = {
  query: string
  /** `all` | `services` | `team`. */
  type: 'all' | 'services' | 'team'
  page: number
  pageSize?: number
}

/**
 * Server-side search. Disabled until the visitor has typed something, so the
 * page never issues a request for an empty query.
 *
 * `keepPreviousData` keeps the previous page on screen while the next one
 * loads, so paging and re-typing never flash an empty list.
 */
export function useStorefrontSearch(
  businessId: string,
  params: StorefrontSearchParams,
  enabled = true,
) {
  const trimmed = params.query.trim()
  const request = {
    q: trimmed,
    type: params.type,
    page: params.page,
    pageSize: params.pageSize ?? 12,
  }

  return useQuery({
    queryKey: queryKeys.storefrontSearch(businessId, request),
    queryFn: () => storefrontApi.search(businessId, request),
    enabled: enabled && Boolean(businessId) && trimmed.length > 0,
    placeholderData: keepPreviousData,
  })
}
