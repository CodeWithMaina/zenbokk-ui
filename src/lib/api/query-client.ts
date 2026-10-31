import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'
import { apiConfig } from './config'

/**
 * Retry policy: never retry a decision the server already made. Only transient
 * failures (network, 5xx) are worth a second attempt.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (apiConfig.noRetryStatuses.includes(error.status)) return false
    if (error.status >= 400 && error.status < 500) return false
  }
  return failureCount < 2
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: { retry: 0 },
  },
})

/**
 * Central query key factory. Hierarchical so invalidating `['appointments']`
 * clears every variant, and predictable so callers can read the cache directly
 * (e.g. the booking wizard reusing a service it already fetched).
 */
export const queryKeys = {
  storefront: (slug: string) => ['storefront', slug] as const,
  storefrontServices: (businessId: string) => ['storefront', businessId, 'services'] as const,
  storefrontStaff: (businessId: string, serviceIds: string[]) =>
    ['storefront', businessId, 'staff', serviceIds.join(',')] as const,
  availability: (businessId: string, params: Record<string, unknown>) =>
    ['storefront', businessId, 'availability', params] as const,

  dashboard: () => ['dashboard', 'bootstrap'] as const,
  /**
   * One key per dashboard surface, under the `['dashboard','bootstrap']`
   * prefix: invalidating `queryKeys.dashboard()` refreshes whichever shell the
   * caller is in, without the caller knowing which one that is.
   */
  businessDashboard: (surface: string) => ['dashboard', 'bootstrap', surface] as const,
  /** Effective modules + permissions for the caller (`GET /v1/me/modules`). */
  myModules: () => ['modules', 'me'] as const,
  /** Businesses a signed-in customer is attached to. */
  associatedBusinesses: () => ['business', 'associated'] as const,
  ownerAppointments: (filters: Record<string, unknown>) =>
    ['appointments', 'owner', filters] as const,
  staffAppointments: (filters: Record<string, unknown>) =>
    ['appointments', 'staff', filters] as const,
  ownerServices: () => ['services', 'owner'] as const,
  ownerStaff: (filters: Record<string, unknown>) => ['staff', 'owner', filters] as const,
  staffOverview: () => ['staff', 'owner', 'overview'] as const,
  staffInvitations: () => ['staff', 'owner', 'invitations'] as const,
  ownerCustomers: (filters: Record<string, unknown>) => ['customers', 'owner', filters] as const,
  customerOverview: () => ['customers', 'owner', 'overview'] as const,
  /** Per-status roster counts for the Clients filter chips. */
  clientStatusCounts: () => ['customers', 'owner', 'counts'] as const,
  clientDetails: (customerId: string) => ['customers', 'owner', 'details', customerId] as const,
  clientActivity: (customerId: string, filters: Record<string, unknown>) =>
    ['customers', 'owner', 'activity', customerId, filters] as const,
  clientLoyaltyLedger: (customerId: string, filters: Record<string, unknown>) =>
    ['customers', 'owner', 'ledger', customerId, filters] as const,
  /** Lazily read payment summary for one appointment. */
  appointmentPayment: (appointmentId: string) =>
    ['payments', 'appointment', appointmentId] as const,

  myAppointments: (filters: Record<string, unknown>) =>
    ['appointments', 'customer', filters] as const,

  adminDashboard: () => ['admin', 'dashboard'] as const,
  adminGrowth: (period: string) => ['admin', 'growth', period] as const,
  adminUsers: (filters: Record<string, unknown>) => ['admin', 'users', filters] as const,
  adminBusinesses: (filters: Record<string, unknown>) => ['admin', 'businesses', filters] as const,

  staffConsoleAppointments: (filters: Record<string, unknown>) =>
    ['appointments', 'staff', 'console', filters] as const,
  staffAnalytics: () => ['staff', 'console', 'analytics'] as const,

  ownerBusiness: () => ['business', 'owner'] as const,
  invitation: (token: string) => ['invitation', token] as const,
}
