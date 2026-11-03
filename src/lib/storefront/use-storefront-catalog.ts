import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { storefrontApi } from './api'

/**
 * The public catalogue and roster for the business being browsed.
 *
 * Both hooks are deliberately thin: the cache key is the business id, so the
 * home page, the services grid, the search page and the booking wizard all read
 * the *same* entry instead of each firing their own request. A storefront that
 * re-fetched the menu on every screen would be four requests where one is
 * enough, and would let two screens disagree about a price.
 */

/** Active services, ready to render. Archived and paused rows never reach here. */
export function useStorefrontServices(businessId: string, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.storefrontServices(businessId),
    queryFn: () => storefrontApi.services(businessId),
    enabled,
  })

  return {
    ...query,
    services: (query.data ?? []).filter((service) => service.isActive),
  }
}

/**
 * One service. Falls back to the catalogue entry the list already holds, so a
 * service detail page opened from the grid renders instantly and only a cold
 * deep link pays for a request.
 */
export function useStorefrontService(
  businessId: string,
  serviceId: string,
  enabled = true,
) {
  const list = useStorefrontServices(businessId, enabled)
  const fromList = list.services.find((service) => service.id === serviceId) ?? null

  const query = useQuery({
    queryKey: queryKeys.storefrontService(businessId, serviceId),
    queryFn: () => storefrontApi.service(businessId, serviceId),
    enabled: enabled && Boolean(serviceId),
    // The list is the same payload; only fetch when it could not answer.
    initialData: fromList ?? undefined,
    staleTime: 60_000,
  })

  return { ...query, service: query.data ?? fromList }
}

/**
 * The business's public roster.
 *
 * `serviceIds` narrows to the members who can perform *all* of those services
 * (the server applies that rule) — which is exactly what the booking wizard
 * needs, so the same hook serves both the team board and the staff step.
 */
export function useStorefrontTeam(
  businessId: string,
  serviceIds: string[] = [],
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.storefrontStaff(businessId, serviceIds),
    queryFn: () => storefrontApi.eligibleStaff(businessId, serviceIds),
    enabled,
  })
}
