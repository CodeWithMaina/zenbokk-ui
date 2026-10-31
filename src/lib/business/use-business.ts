import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { businessApi } from './api'

/**
 * Businesses a signed-in customer is attached to.
 *
 * Customer-only on the server (owner/staff identities get a 403), so callers
 * pass `enabled` for the role they are rendering for. Cached for a few minutes:
 * the relationships only change when the customer books or joins somewhere.
 */
export function useAssociatedBusinesses(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.associatedBusinesses(),
    queryFn: businessApi.associated,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
