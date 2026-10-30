import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { ownerApi } from './api'

/** Owner shell identity: business, entitlements, permissions, plan. */
export function useOwnerBootstrap() {
  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: ownerApi.bootstrap,
    staleTime: 5 * 60_000,
    // A failed bootstrap is a membership/role problem, not a flaky network.
    retry: false,
  })
}

/** Card/stamp counters. Analytics is a paid module, so the caller gates this. */
export function useOwnerStats(enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.dashboard(), 'stats'] as const,
    queryFn: ownerApi.stats,
    enabled,
    staleTime: 60_000,
  })
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
