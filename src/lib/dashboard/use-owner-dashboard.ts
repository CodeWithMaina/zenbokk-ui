import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { useFinancialAnalytics, useFinancialOverview } from '../finances/api'
import { ownerApi } from './api'

/**
 * Owner console reads beyond the bootstrap.
 *
 * Identity/business/module access is *not* resolved here — that is the job of
 * `useBusinessDashboard()` plus `DashboardProvider`, so a page can never end up
 * deciding business access on its own.
 */

/** Card/stamp counters. Analytics is a paid module, so the caller gates this. */
export function useOwnerStats(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.dashboard(), 'stats'] as const,
    queryFn: ownerApi.stats,
    enabled,
    staleTime: 60_000,
  })
}

/**
 * The owner's money, read exactly the way the Cashbook reads it.
 *
 * Four windows of the same financial overview the finance screens use, plus one
 * month of analytics for the average ticket and the per-staff breakdown. Nothing
 * here adds anything up itself: a figure the ledger did not compute has no
 * business on a dashboard.
 *
 * Callers gate the whole group — the finance routes are server-gated by the
 * `financials` module and the `finances.view` permission — and the query keys are
 * shared with the Cashbook, so opening Finance afterwards is already warm.
 */
export function useOwnerMoney(enabled: boolean) {
  const today = useFinancialOverview('today', null, null, enabled)
  const yesterday = useFinancialOverview('yesterday', null, null, enabled)
  const week = useFinancialOverview('last_7_days', null, null, enabled)
  const month = useFinancialOverview('this_month', null, null, enabled)
  const analytics = useFinancialAnalytics('this_month', null, null, enabled)

  return { today, yesterday, week, month, analytics }
}

export function useOwnerAppointments(
  filters: Parameters<typeof ownerApi.appointments>[0],
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.ownerAppointments(filters ?? {}),
    queryFn: () => ownerApi.appointments(filters),
    enabled,
    staleTime: 30_000,
  })
}

export function useOwnerServices(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ownerServices(),
    queryFn: ownerApi.services,
    enabled,
    staleTime: 60_000,
  })
}

export function useOwnerCustomers(
  filters: Parameters<typeof ownerApi.customers>[0],
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.ownerCustomers(filters ?? {}),
    queryFn: () => ownerApi.customers(filters),
    enabled,
    staleTime: 30_000,
  })
}

export function useOwnerStaff(
  filters: Parameters<typeof ownerApi.staff>[0],
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.ownerStaff(filters ?? {}),
    queryFn: () => ownerApi.staff(filters),
    enabled,
    staleTime: 30_000,
  })
}

export function useStaffOverview(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.staffOverview(),
    queryFn: ownerApi.staffOverview,
    enabled,
    staleTime: 60_000,
  })
}

export function useStaffInvitations(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.staffInvitations(),
    queryFn: ownerApi.invitations,
    enabled,
    staleTime: 30_000,
  })
}

export function useCustomerOverview(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.customerOverview(),
    queryFn: ownerApi.customerOverview,
    enabled,
    staleTime: 60_000,
  })
}
