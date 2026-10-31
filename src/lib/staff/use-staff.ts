import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { staffApi } from './api'

/**
 * Staff console reads.
 *
 * The business is never named by the client: `/v1/businesses/staff/*` resolves
 * it from the caller's active membership server-side, so a staff member cannot
 * reach another business by changing a hostname or a query string.
 *
 * Which business the console is acting in is resolved once by
 * `useBusinessDashboard('staff')` — not here — so there is a single answer for
 * the shell and its pages.
 */

export function useStaffAnalytics() {
  return useQuery({
    queryKey: queryKeys.staffAnalytics(),
    queryFn: staffApi.analytics,
    staleTime: 60_000,
    retry: false,
  })
}

export function useStaffConsoleAppointments(
  filters: Parameters<typeof staffApi.appointments>[0],
) {
  return useQuery({
    queryKey: queryKeys.staffConsoleAppointments(filters ?? {}),
    queryFn: () => staffApi.appointments(filters),
    staleTime: 30_000,
  })
}
