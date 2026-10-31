import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import { adminApi } from './api'

/**
 * Platform administration reads.
 *
 * `retry: false` on every one of these: a 401/403 from `/v1/admin/*` means the
 * caller is not a platform administrator, which is a decision, not a flaky
 * network. Retrying it would only delay the error state the UI has to show.
 */
export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.adminDashboard(),
    queryFn: adminApi.dashboard,
    staleTime: 60_000,
    retry: false,
  })
}

export function useAdminGrowth(period: '7d' | '30d' | '90d') {
  return useQuery({
    queryKey: queryKeys.adminGrowth(period),
    queryFn: () => adminApi.growth(period),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

export function useAdminBusinesses(filters: Parameters<typeof adminApi.businesses>[0]) {
  return useQuery({
    queryKey: queryKeys.adminBusinesses(filters ?? {}),
    queryFn: () => adminApi.businesses(filters),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminUsers(filters: Parameters<typeof adminApi.users>[0]) {
  return useQuery({
    queryKey: queryKeys.adminUsers(filters ?? {}),
    queryFn: () => adminApi.users(filters),
    staleTime: 30_000,
    retry: false,
  })
}
