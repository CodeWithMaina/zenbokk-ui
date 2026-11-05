import { apiGet, apiRequest } from '../api/client'
import type {
  AdminBusinessDetail,
  AdminBusinessListItem,
  AdminBusinessStats,
  AdminBusinessSubscriptionDetail,
  AdminBusinessUpdateRequest,
  AdminBusinessUserItem,
  AdminDashboard,
  AdminGrowth,
  AdminModuleCatalogItem,
  AdminModuleCatalogResponse,
  AdminModuleUpdateRequest,
  AdminSubscriptionActionResult,
  AdminSubscriptionListItem,
  AdminSubscriptionStats,
  AdminTierBusinessItem,
  AdminTierCreateRequest,
  AdminTierDetail,
  AdminTierModulesRequest,
  AdminTierModulesResponse,
  AdminTierSummary,
  AdminTierUpdateRequest,
  AdminUserSummary,
  MessageResponse,
  PaginatedResponse,
  SubscriptionAuditLogEntry,
} from '../api/types'

/**
 * Platform administration reads and writes.
 *
 * Every endpoint requires the `PlatformAdmin` policy server-side — an owner or
 * staff token is refused even if the route is reachable in the client. Hiding a
 * control is never the authorization: the API decides.
 */
export const adminApi = {
  dashboard(): Promise<AdminDashboard> {
    return apiGet<AdminDashboard>('/v1/admin/dashboard')
  },

  /** Time series per metric, over the server's default period. */
  growth(period?: '7d' | '30d' | '90d'): Promise<AdminGrowth> {
    return apiGet<AdminGrowth>('/v1/admin/growth', { period: period ?? null })
  },

  /** Legacy read-only list (kept for the compact overview). */
  businesses(
    filters: { category?: string | null; search?: string | null; page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<AdminBusinessListItem>> {
    return apiGet<PaginatedResponse<AdminBusinessListItem>>('/v1/admin/businesses', filters)
  },

  users(
    filters: { search?: string | null; page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<AdminUserSummary>> {
    return apiGet<PaginatedResponse<AdminUserSummary>>('/v1/admin/users', filters)
  },

  // ── Business management ─────────────────────────────────

  businessStats(): Promise<AdminBusinessStats> {
    return apiGet<AdminBusinessStats>('/v1/admin/businesses/stats')
  },

  /** The business-management list with server-side filters, sorting, pagination. */
  managedBusinesses(
    filters: Record<string, unknown> = {},
  ): Promise<PaginatedResponse<AdminBusinessListItem>> {
    return apiGet<PaginatedResponse<AdminBusinessListItem>>(
      '/v1/admin/businesses/managed',
      filters as never,
    )
  },

  businessDetail(businessId: string): Promise<AdminBusinessDetail> {
    return apiGet<AdminBusinessDetail>(`/v1/admin/businesses/${businessId}/profile`)
  },

  updateBusiness(
    businessId: string,
    payload: AdminBusinessUpdateRequest,
  ): Promise<AdminBusinessDetail> {
    return apiRequest<AdminBusinessDetail>(`/v1/admin/businesses/${businessId}`, {
      method: 'PUT',
      body: payload,
    })
  },

  businessUsers(
    businessId: string,
    filters: { role?: string | null; page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<AdminBusinessUserItem>> {
    return apiGet<PaginatedResponse<AdminBusinessUserItem>>(
      `/v1/admin/businesses/${businessId}/users`,
      filters,
    )
  },

  businessAudit(
    businessId: string,
    filters: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<SubscriptionAuditLogEntry>> {
    return apiGet<PaginatedResponse<SubscriptionAuditLogEntry>>(
      `/v1/admin/businesses/${businessId}/audit`,
      filters,
    )
  },

  /** Platform-administration status change: `suspended` | `active` | `deactivated`. */
  setBusinessStatus(
    businessId: string,
    status: 'suspended' | 'active' | 'deactivated',
    reason?: string | null,
  ): Promise<AdminBusinessDetail> {
    const path =
      status === 'suspended' ? 'suspend' : status === 'deactivated' ? 'deactivate' : 'reactivate'
    return apiRequest<AdminBusinessDetail>(`/v1/admin/businesses/${businessId}/${path}`, {
      method: 'POST',
      body: { reason: reason ?? null },
    })
  },

  // ── Subscription management ─────────────────────────────

  subscriptions(
    filters: Record<string, unknown> = {},
  ): Promise<PaginatedResponse<AdminSubscriptionListItem>> {
    return apiGet<PaginatedResponse<AdminSubscriptionListItem>>(
      '/v1/admin/subscriptions',
      filters as never,
    )
  },

  subscriptionStats(): Promise<AdminSubscriptionStats> {
    return apiGet<AdminSubscriptionStats>('/v1/admin/subscriptions/stats')
  },

  subscriptionDetail(businessId: string): Promise<AdminBusinessSubscriptionDetail> {
    return apiGet<AdminBusinessSubscriptionDetail>(`/v1/admin/subscriptions/${businessId}`)
  },

  /** Lifecycle action: pause | resume | cancel | reactivate | deactivate. */
  subscriptionAction(
    businessId: string,
    action: 'pause' | 'resume' | 'cancel' | 'reactivate' | 'deactivate',
    reason?: string | null,
  ): Promise<AdminSubscriptionActionResult> {
    return apiRequest<AdminSubscriptionActionResult>(
      `/v1/admin/subscriptions/${businessId}/${action}`,
      { method: 'POST', body: { reason: reason ?? null } },
    )
  },

  /** Extends the subscription's period end (must be a future instant). */
  extendSubscription(
    businessId: string,
    endsAt: string,
    reason?: string | null,
  ): Promise<AdminSubscriptionActionResult> {
    return apiRequest<AdminSubscriptionActionResult>(
      `/v1/admin/subscriptions/${businessId}/extend`,
      { method: 'POST', body: { endsAt, reason: reason ?? null } },
    )
  },

  /** Upgrade/downgrade: changes the plan by its stable key. */
  changePlan(
    businessId: string,
    planKey: string,
    reason?: string | null,
  ): Promise<AdminSubscriptionActionResult> {
    return apiRequest<AdminSubscriptionActionResult>(
      `/v1/admin/subscriptions/${businessId}/change-plan`,
      { method: 'POST', body: { planKey, reason: reason ?? null } },
    )
  },

  // ── Plan (tier) catalogue ───────────────────────────────

  tiers(): Promise<AdminTierSummary[]> {
    return apiGet<AdminTierSummary[]>('/v1/admin/subscription-tiers')
  },

  tier(tierId: string): Promise<AdminTierDetail> {
    return apiGet<AdminTierDetail>(`/v1/admin/subscription-tiers/${tierId}`)
  },

  createTier(payload: AdminTierCreateRequest): Promise<AdminTierDetail> {
    return apiRequest<AdminTierDetail>('/v1/admin/subscription-tiers', {
      method: 'POST',
      body: payload,
    })
  },

  updateTier(tierId: string, payload: AdminTierUpdateRequest): Promise<AdminTierDetail> {
    return apiRequest<AdminTierDetail>(`/v1/admin/subscription-tiers/${tierId}`, {
      method: 'PUT',
      body: payload,
    })
  },

  duplicateTier(
    tierId: string,
    payload: { key?: string | null; name?: string | null },
  ): Promise<AdminTierDetail> {
    return apiRequest<AdminTierDetail>(`/v1/admin/subscription-tiers/${tierId}/duplicate`, {
      method: 'POST',
      body: payload,
    })
  },

  /** Lifecycle transition: publish | deactivate | archive | unarchive. */
  tierLifecycle(
    tierId: string,
    action: 'publish' | 'deactivate' | 'archive' | 'unarchive',
  ): Promise<AdminTierDetail> {
    return apiRequest<AdminTierDetail>(`/v1/admin/subscription-tiers/${tierId}/${action}`, {
      method: 'POST',
    })
  },

  tierModules(tierId: string): Promise<AdminTierModulesResponse> {
    return apiGet<AdminTierModulesResponse>(`/v1/admin/subscription-tiers/${tierId}/modules`)
  },

  setTierModules(
    tierId: string,
    payload: AdminTierModulesRequest,
  ): Promise<AdminTierModulesResponse> {
    return apiRequest<AdminTierModulesResponse>(`/v1/admin/subscription-tiers/${tierId}/modules`, {
      method: 'PUT',
      body: payload,
    })
  },

  tierBusinesses(
    tierId: string,
    filters: { page?: number; pageSize?: number; search?: string | null } = {},
  ): Promise<PaginatedResponse<AdminTierBusinessItem>> {
    return apiGet<PaginatedResponse<AdminTierBusinessItem>>(
      `/v1/admin/subscription-tiers/${tierId}/businesses`,
      filters,
    )
  },

  // ── Module catalogue ────────────────────────────────────

  moduleCatalog(): Promise<AdminModuleCatalogResponse> {
    return apiGet<AdminModuleCatalogResponse>('/v1/admin/module-catalog')
  },

  updateModule(
    moduleKey: string,
    payload: AdminModuleUpdateRequest,
  ): Promise<AdminModuleCatalogItem> {
    return apiRequest<AdminModuleCatalogItem>(`/v1/admin/modules/${moduleKey}`, {
      method: 'PUT',
      body: payload,
    })
  },

  // ── Business module entitlements ────────────────────────

  /** Force-enable/disable a module for a business (source=ADMIN). */
  setBusinessModule(
    businessId: string,
    moduleKey: string,
    enabled: boolean,
    reason?: string | null,
  ): Promise<MessageResponse> {
    return apiRequest<MessageResponse>(`/v1/admin/businesses/${businessId}/modules/${moduleKey}`, {
      method: 'PUT',
      body: { enabled, reason: reason ?? null },
    })
  },

  /** Remove an override so the module reverts to plan-driven entitlement. */
  removeBusinessModuleOverride(businessId: string, moduleKey: string): Promise<MessageResponse> {
    return apiRequest<MessageResponse>(`/v1/admin/businesses/${businessId}/modules/${moduleKey}`, {
      method: 'DELETE',
    })
  },

  // ── Platform audit feed ─────────────────────────────────

  auditLogs(
    filters: {
      page?: number
      pageSize?: number
      businessId?: string | null
      tierId?: string | null
    } = {},
  ): Promise<PaginatedResponse<SubscriptionAuditLogEntry>> {
    return apiGet<PaginatedResponse<SubscriptionAuditLogEntry>>(
      '/v1/admin/subscription-audit-logs',
      filters,
    )
  },
}

