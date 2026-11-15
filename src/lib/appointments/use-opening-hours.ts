import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { appointmentsApi } from './api'

/**
 * The business's opening hours, for the appointments calendar and timeline.
 *
 * This is the scheduling domain's own view of the working week — the same data the
 * availability engine reads — so the band the calendar draws can never advertise a
 * schedule the booking engine would refuse. Hours change rarely, so the result is
 * cached far longer than an appointment page.
 *
 * A failed read is deliberately not fatal: `data` simply stays undefined and the
 * calendar falls back to its default band rather than refusing to render.
 */
export function useBusinessOpeningHours(
  businessId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.businessOpeningHours(businessId ?? ''),
    queryFn: () => appointmentsApi.openingHours(businessId as string),
    enabled: enabled && Boolean(businessId),
    staleTime: 5 * 60_000,
  })
}
