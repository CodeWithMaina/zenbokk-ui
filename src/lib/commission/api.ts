import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../api/client'
import { queryKeys } from '../api/query-client'
import type { CommissionStaffBalance } from '../api/types'

/**
 * Commission module client (`CommissionController`).
 *
 * Only the per-member balance the Staff module needs. Every route is gated
 * server-side by the `commissions` module *and* a `commissions.view`
 * permission, so callers check the entitlement before asking rather than
 * treating a refusal as an empty balance.
 */
export const commissionApi = {
  /** Amounts owed to (or held from) one member. */
  balance(staffId: string): Promise<CommissionStaffBalance> {
    return apiGet<CommissionStaffBalance>(`/v1/commissions/balances/${staffId}`)
  },
}

export function useCommissionBalance(staffId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.commissionStaffBalance(staffId),
    queryFn: () => commissionApi.balance(staffId),
    enabled: enabled && staffId.length > 0,
    staleTime: 60_000,
  })
}
