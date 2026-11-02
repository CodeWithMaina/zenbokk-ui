import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { servicesApi } from './api'
import type { ServiceFilters, ServiceStatusAction } from './types'

/**
 * Services module data access.
 *
 * Reads are keyed under the existing `['services', …]` prefix, so one
 * `invalidateQueries({ queryKey: ['services'] })` after a mutation refreshes the
 * list, the counts, the detail page and the images together — and also the
 * appointment screens that read the owner's catalogue.
 */

/** Paged, filtered catalogue. Every refinement is applied server-side. */
export function useServices(
  filters: ServiceFilters,
  page: number,
  pageSize: number,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.ownerServicesList({ filters, page, pageSize }),
    queryFn: () => servicesApi.list(filters, page, pageSize),
    enabled,
    staleTime: 30_000,
  })
}

/** One service, by id. */
export function useService(serviceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.ownerService(serviceId),
    queryFn: () => servicesApi.get(serviceId),
    enabled: enabled && serviceId.length > 0,
    staleTime: 30_000,
  })
}

/**
 * Header and filter-panel counts for the Services list.
 *
 * Each count is the endpoint's own `totalCount` for a one-row page, so the
 * summary can never disagree with the list it opens.
 */
export function useServiceCounts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ownerServiceCounts(),
    queryFn: servicesApi.statusCounts,
    enabled,
    staleTime: 60_000,
  })
}

/**
 * Lifecycle, delete and image writes, with the cache invalidated once per
 * mutation so every surface reading the catalogue stays in step.
 */
export function useServiceMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['services'] })

  const setStatus = useMutation({
    mutationFn: (input: { serviceId: string; action: ServiceStatusAction }) =>
      servicesApi.setStatus(input.serviceId, input.action),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (serviceId: string) => servicesApi.remove(serviceId),
    onSuccess: invalidate,
  })

  const setImages = useMutation({
    mutationFn: (input: { serviceId: string; mediaIds: string[] }) =>
      servicesApi.setImages(input.serviceId, input.mediaIds),
    onSuccess: invalidate,
  })

  return { setStatus, remove, setImages }
}
