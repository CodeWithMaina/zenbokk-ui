import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '../api/query-client'
import type {
  AdminBusinessUpdateRequest,
  AdminModuleUpdateRequest,
  AdminTierCreateRequest,
  AdminTierUpdateRequest,
} from '../api/types'
import { adminApi } from './api'

/**
 * Platform administration reads and writes.
 *
 * `retry: false` on every read: a 401/403 from `/v1/admin/*` means the caller is
 * not a platform administrator, which is a decision, not a flaky network.
 * Retrying it would only delay the error state the UI has to show.
 *
 * Every mutation invalidates the `['admin', ...]` subtree it can affect, so the
 * header counters, the lists and the open detail page never disagree.
 */

/** Refresh every admin surface a business or subscription write can change. */
function refreshBusinessAdmin(queryClient: QueryClient, businessId?: string) {
  void queryClient.invalidateQueries({ queryKey: ['admin'] })
  if (businessId) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminBusinessDetail(businessId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminSubscriptionDetail(businessId) })
  }
}

/** Refresh the plan catalogue surfaces. */
function refreshTiers(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminTiers() })
  void queryClient.invalidateQueries({ queryKey: ['admin'] })
}

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

// ── Business management ───────────────────────────────────

export function useAdminBusinessStats() {
  return useQuery({
    queryKey: queryKeys.adminBusinessStats(),
    queryFn: adminApi.businessStats,
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminManagedBusinesses(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.adminManagedBusinesses(filters),
    queryFn: () => adminApi.managedBusinesses(filters),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminBusinessDetail(businessId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminBusinessDetail(businessId ?? ''),
    queryFn: () => adminApi.businessDetail(businessId as string),
    enabled: Boolean(businessId),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminBusinessUsers(
  businessId: string | undefined,
  filters: Record<string, unknown> = {},
) {
  return useQuery({
    queryKey: queryKeys.adminBusinessUsers(businessId ?? '', filters),
    queryFn: () => adminApi.businessUsers(businessId as string, filters as never),
    enabled: Boolean(businessId),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminBusinessAudit(
  businessId: string | undefined,
  filters: Record<string, unknown> = {},
) {
  return useQuery({
    queryKey: queryKeys.adminBusinessAudit(businessId ?? '', filters),
    queryFn: () => adminApi.businessAudit(businessId as string, filters as never),
    enabled: Boolean(businessId),
    staleTime: 15_000,
    retry: false,
  })
}

/** Edit the supported business profile fields. */
export function useUpdateAdminBusiness(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminBusinessUpdateRequest) => adminApi.updateBusiness(businessId, payload),
    onSuccess: () => refreshBusinessAdmin(queryClient, businessId),
  })
}

/** Suspend / reactivate / deactivate a business. */
export function useSetBusinessStatus(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      status,
      reason,
    }: {
      status: 'suspended' | 'active' | 'deactivated'
      reason?: string | null
    }) => adminApi.setBusinessStatus(businessId, status, reason),
    onSuccess: () => refreshBusinessAdmin(queryClient, businessId),
  })
}

// ── Subscription management ───────────────────────────────

export function useAdminSubscriptionStats() {
  return useQuery({
    queryKey: queryKeys.adminSubscriptionStats(),
    queryFn: adminApi.subscriptionStats,
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminSubscriptions(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.adminSubscriptions(filters),
    queryFn: () => adminApi.subscriptions(filters),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminSubscriptionDetail(businessId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminSubscriptionDetail(businessId ?? ''),
    queryFn: () => adminApi.subscriptionDetail(businessId as string),
    enabled: Boolean(businessId),
    staleTime: 30_000,
    retry: false,
  })
}

/** Pause / resume / cancel / reactivate / deactivate a subscription. */
export function useSubscriptionAction(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      action,
      reason,
    }: {
      action: 'pause' | 'resume' | 'cancel' | 'reactivate' | 'deactivate'
      reason?: string | null
    }) => adminApi.subscriptionAction(businessId, action, reason),
    onSuccess: () => refreshBusinessAdmin(queryClient, businessId),
  })
}

/** Extend the subscription's period end. */
export function useExtendSubscription(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ endsAt, reason }: { endsAt: string; reason?: string | null }) =>
      adminApi.extendSubscription(businessId, endsAt, reason),
    onSuccess: () => refreshBusinessAdmin(queryClient, businessId),
  })
}

/** Upgrade/downgrade the subscription plan. */
export function useChangePlan(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ planKey, reason }: { planKey: string; reason?: string | null }) =>
      adminApi.changePlan(businessId, planKey, reason),
    onSuccess: () => refreshBusinessAdmin(queryClient, businessId),
  })
}

// ── Plan (tier) catalogue ─────────────────────────────────

export function useAdminTiers() {
  return useQuery({
    queryKey: queryKeys.adminTiers(),
    queryFn: adminApi.tiers,
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminTier(tierId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminTier(tierId ?? ''),
    queryFn: () => adminApi.tier(tierId as string),
    enabled: Boolean(tierId),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAdminTierBusinesses(tierId: string | undefined, filters: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.adminTierBusinesses(tierId ?? '', filters),
    queryFn: () => adminApi.tierBusinesses(tierId as string, filters as never),
    enabled: Boolean(tierId),
    staleTime: 30_000,
    retry: false,
  })
}

export function useCreateTier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminTierCreateRequest) => adminApi.createTier(payload),
    onSuccess: () => refreshTiers(queryClient),
  })
}

export function useUpdateTier(tierId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminTierUpdateRequest) => adminApi.updateTier(tierId, payload),
    onSuccess: () => refreshTiers(queryClient),
  })
}

export function useDuplicateTier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      tierId,
      key,
      name,
    }: {
      tierId: string
      key?: string | null
      name?: string | null
    }) => adminApi.duplicateTier(tierId, { key, name }),
    onSuccess: () => refreshTiers(queryClient),
  })
}

export function useTierLifecycle(tierId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: 'publish' | 'deactivate' | 'archive' | 'unarchive') =>
      adminApi.tierLifecycle(tierId, action),
    onSuccess: () => refreshTiers(queryClient),
  })
}

export function useSetTierModules(tierId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (moduleKeys: string[]) => adminApi.setTierModules(tierId, { moduleKeys }),
    onSuccess: () => refreshTiers(queryClient),
  })
}

// ── Module catalogue ──────────────────────────────────────

export function useAdminModuleCatalog() {
  return useQuery({
    queryKey: queryKeys.adminModuleCatalog(),
    queryFn: adminApi.moduleCatalog,
    staleTime: 60_000,
    retry: false,
  })
}

export function useUpdateModule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      moduleKey,
      payload,
    }: {
      moduleKey: string
      payload: AdminModuleUpdateRequest
    }) => adminApi.updateModule(moduleKey, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminModuleCatalog() })
    },
  })
}

// ── Business module entitlements ──────────────────────────

export function useSetBusinessModule(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      moduleKey,
      enabled,
      reason,
    }: {
      moduleKey: string
      enabled: boolean
      reason?: string | null
    }) => adminApi.setBusinessModule(businessId, moduleKey, enabled, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminSubscriptionDetail(businessId),
      })
    },
  })
}

export function useRemoveBusinessModuleOverride(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (moduleKey: string) => adminApi.removeBusinessModuleOverride(businessId, moduleKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.adminSubscriptionDetail(businessId),
      })
    },
  })
}

// ── Platform audit feed ───────────────────────────────────

export function useAdminAuditLogs(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.adminAuditLogs(filters),
    queryFn: () => adminApi.auditLogs(filters as never),
    staleTime: 15_000,
    retry: false,
  })
}

