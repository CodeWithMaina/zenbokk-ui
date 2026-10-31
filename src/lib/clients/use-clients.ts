import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import type {
  ManualStampRequest,
  ManualStampResponse,
  StampAdjustmentRequest,
  StampAdjustmentResponse,
} from '../api/types'
import { clientsApi } from './api'
import type { ClientRosterFilters } from './api'

/**
 * Clients module data access.
 *
 * Reads are keyed under the existing `['customers', …]` prefix, so a single
 * `invalidateQueries({ queryKey: ['customers'] })` after a mutation refreshes
 * the roster, the counts, the details payload and the ledger together.
 */

/** Paged roster. Search, status, sort and pagination are all server-side. */
export function useClients(filters: ClientRosterFilters, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ownerCustomers(filters as Record<string, unknown>),
    queryFn: () => clientsApi.list(filters),
    enabled,
    staleTime: 30_000,
  })
}

/** Counts for the header and the filter chips. */
export function useClientCounts(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.clientStatusCounts(),
    queryFn: clientsApi.statusCounts,
    enabled,
    staleTime: 60_000,
  })
}

/** Aggregated details payload for one client. */
export function useClientDetails(customerId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.clientDetails(customerId),
    queryFn: () => clientsApi.details(customerId),
    enabled: enabled && customerId.length > 0,
    staleTime: 30_000,
  })
}

/** Paginated stamp + redemption feed for one client. */
export function useClientActivity(
  customerId: string,
  filters: { page: number; pageSize: number },
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.clientActivity(customerId, filters),
    queryFn: () => clientsApi.activity(customerId, filters.page, filters.pageSize),
    enabled: enabled && customerId.length > 0,
    staleTime: 30_000,
  })
}

/**
 * The loyalty ledger filtered to one client — the audit trail that records
 * manual stamp adjustments with their reason and actor.
 */
export function useClientLoyaltyLedger(
  customerId: string,
  filters: { page: number; pageSize: number },
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.clientLoyaltyLedger(customerId, filters),
    queryFn: () => clientsApi.loyaltyLedger(customerId, filters.page, filters.pageSize),
    enabled: enabled && customerId.length > 0,
    staleTime: 30_000,
  })
}

/**
 * Manual stamp adjustment. Two backend contracts exist; the caller picks the
 * one its entitlements allow:
 *  - `loyalty` module → `POST /v1/loyalty/stamps/manual` (ledger entry, reason
 *    required, appears in the loyalty audit log)
 *  - `stamps` module  → `POST /v1/stamps/adjust` (reason code + optional note)
 */
export function useAdjustStamps() {
  const queryClient = useQueryClient()

  return useMutation<
    ManualStampResponse | StampAdjustmentResponse,
    Error,
    ManualStampRequest | StampAdjustmentRequest
  >({
    mutationFn: (input) =>
      'amount' in input
        ? clientsApi.awardManualStamps(input)
        : clientsApi.adjustStamps(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
