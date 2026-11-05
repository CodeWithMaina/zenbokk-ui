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
  /**
   * One service from the public catalogue. A child of `storefrontServices`, so
   * invalidating the list also refreshes any detail page open on it.
   */
  storefrontService: (businessId: string, serviceId: string) =>
    ['storefront', businessId, 'services', serviceId] as const,
  storefrontStaff: (businessId: string, serviceIds: string[]) =>
    ['storefront', businessId, 'staff', serviceIds.join(',')] as const,
  availability: (businessId: string, params: Record<string, unknown>) =>
    ['storefront', businessId, 'availability', params] as const,
  /** The business's published gallery (one request, all images + variants). */
  storefrontGallery: (businessId: string) => ['storefront', businessId, 'gallery'] as const,
  /** The business's opening hours. */
  storefrontHours: (businessId: string) => ['storefront', businessId, 'hours'] as const,
  /**
   * Server-side storefront search. The query + scope are part of the key, so
   * each distinct search is cached independently and a tenant switch cannot
   * reuse another business's results (the business id is in the prefix).
   */
  storefrontSearch: (businessId: string, params: Record<string, unknown>) =>
    ['storefront', businessId, 'search', params] as const,

  /** Owner Storefront Builder state (draft + published + metadata). */
  storefrontBuilder: () => ['storefront-builder'] as const,
  /** One business's published storefront (public read; used by the live preview). */
  storefrontBuilderPublic: (businessId: string) =>
    ['storefront-builder', 'public', businessId] as const,

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
  /** One appointment, with every service line (the detail screen). */
  appointmentDetail: (appointmentId: string) =>
    ['appointments', 'owner', 'detail', appointmentId] as const,
  /** One appointment's persisted status history. */
  appointmentActivity: (appointmentId: string) =>
    ['appointments', 'owner', 'activity', appointmentId] as const,
  /** A whole calendar pane, walked across pages. */
  appointmentRange: (filters: Record<string, unknown>) =>
    ['appointments', 'owner', 'range', filters] as const,
  /** One customer's appointment history within the business. */
  appointmentCustomerHistory: (customerId: string, filters: Record<string, unknown>) =>
    ['appointments', 'owner', 'customer', customerId, filters] as const,
  /** One staff member's day, for the detail screen's schedule strip. */
  appointmentStaffDay: (staffId: string, filters: Record<string, unknown>) =>
    ['appointments', 'owner', 'staff', staffId, filters] as const,
  /** Bookable slots for a service/staff/date combination. */
  appointmentAvailability: (businessId: string, params: Record<string, unknown>) =>
    ['appointments', 'availability', businessId, params] as const,
  ownerServices: () => ['services', 'owner'] as const,
  /** Filtered, sorted, paged service catalogue (`GET /v1/services/me/query`). */
  ownerServicesList: (filters: Record<string, unknown>) =>
    ['services', 'owner', 'list', filters] as const,
  /** One service, by id. */
  ownerService: (serviceId: string) => ['services', 'owner', 'detail', serviceId] as const,
  /** Active/total counters for the Services header. */
  ownerServiceCounts: () => ['services', 'owner', 'counts'] as const,
  ownerStaff: (filters: Record<string, unknown>) => ['staff', 'owner', filters] as const,
  staffOverview: () => ['staff', 'owner', 'overview'] as const,
  staffInvitations: () => ['staff', 'owner', 'invitations'] as const,
  /** One member's management profile (`GET /v1/businesses/me/staff/{id}`). */
  ownerStaffDetail: (staffId: string) => ['staff', 'owner', 'detail', staffId] as const,
  /** The services a member delivers. */
  staffServices: (staffId: string) => ['staff', 'owner', 'detail', staffId, 'services'] as const,
  /** The member's recurring working week plus dated time off. */
  staffAvailability: (staffId: string) => ['staff', 'owner', 'detail', staffId, 'availability'] as const,
  /** Job titles of the caller's business (assignment pickers). */
  staffPositions: () => ['staff', 'owner', 'positions'] as const,
  /** Stamp analytics for one member, per period. */
  staffMemberAnalytics: (staffId: string, period: string) =>
    ['staff', 'owner', 'analytics', staffId, period] as const,
  /** One member's activity timeline. */
  staffMemberActivity: (staffId: string, filters: Record<string, unknown>) =>
    ['staff', 'owner', 'activity', staffId, filters] as const,

  /** Today's clock state for the whole team (attendance module). */
  attendanceOverview: (date: string | null) => ['attendance', 'overview', date] as const,
  /** One member's clock events. */
  attendanceStaffHistory: (staffId: string, filters: Record<string, unknown>) =>
    ['attendance', 'staff', staffId, filters] as const,

  /** Commission balance owed to one member (commissions module). */
  commissionStaffBalance: (staffId: string) =>
    ['commissions', 'balance', staffId] as const,
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

  /** Programs owned by the business (`GET /v1/programs/me`). */
  loyaltyPrograms: () => ['loyalty', 'programs'] as const,
  /** One program, without metrics. */
  loyaltyProgram: (programId: string) => ['loyalty', 'programs', programId] as const,
  /** One program plus live performance metrics. */
  loyaltyProgramDetail: (programId: string) =>
    ['loyalty', 'programs', programId, 'details'] as const,
  /** Card designs this business may choose from (`GET /v1/card-designs/me`). */
  loyaltyCardDesigns: () => ['loyalty', 'card-designs'] as const,
  /** A program's enrolled customers (the business roster filtered by program). */
  loyaltyProgramCustomers: (programId: string, filters: Record<string, unknown>) =>
    ['loyalty', 'programs', programId, 'customers', filters] as const,
  /** A program's stamp activity/audit feed. */
  loyaltyProgramActivity: (programId: string, filters: Record<string, unknown>) =>
    ['loyalty', 'programs', programId, 'activity', filters] as const,

  myAppointments: (filters: Record<string, unknown>) =>
    ['appointments', 'customer', filters] as const,

  adminDashboard: () => ['admin', 'dashboard'] as const,
  adminGrowth: (period: string) => ['admin', 'growth', period] as const,
  adminUsers: (filters: Record<string, unknown>) => ['admin', 'users', filters] as const,
  adminBusinesses: (filters: Record<string, unknown>) => ['admin', 'businesses', filters] as const,
  /** Roll-up counters for the business-management header. */
  adminBusinessStats: () => ['admin', 'businesses', 'stats'] as const,
  /** The business-management list (filtered + paginated). */
  adminManagedBusinesses: (filters: Record<string, unknown>) =>
    ['admin', 'businesses', 'managed', filters] as const,
  /** Full detail for one business. */
  adminBusinessDetail: (businessId: string) =>
    ['admin', 'businesses', 'detail', businessId] as const,
  /** Members of one business. */
  adminBusinessUsers: (businessId: string, filters: Record<string, unknown>) =>
    ['admin', 'businesses', 'users', businessId, filters] as const,
  /** Audit trail for one business. */
  adminBusinessAudit: (businessId: string, filters: Record<string, unknown>) =>
    ['admin', 'businesses', 'audit', businessId, filters] as const,
  /** The subscription-management list. */
  adminSubscriptions: (filters: Record<string, unknown>) =>
    ['admin', 'subscriptions', filters] as const,
  adminSubscriptionStats: () => ['admin', 'subscriptions', 'stats'] as const,
  adminSubscriptionDetail: (businessId: string) =>
    ['admin', 'subscriptions', 'detail', businessId] as const,
  /** The plan (tier) catalogue. */
  adminTiers: () => ['admin', 'tiers'] as const,
  adminTier: (tierId: string) => ['admin', 'tiers', tierId] as const,
  adminTierBusinesses: (tierId: string, filters: Record<string, unknown>) =>
    ['admin', 'tiers', tierId, 'businesses', filters] as const,
  /** The module catalogue with usage counts. */
  adminModuleCatalog: () => ['admin', 'modules', 'catalog'] as const,
  /** The platform-wide audit feed. */
  adminAuditLogs: (filters: Record<string, unknown>) => ['admin', 'audit', filters] as const,

  staffConsoleAppointments: (filters: Record<string, unknown>) =>
    ['appointments', 'staff', 'console', filters] as const,
  staffAnalytics: () => ['staff', 'console', 'analytics'] as const,

  ownerBusiness: () => ['business', 'owner'] as const,
  /** Full owner business record (incl. reminder policy + daily goals). */
  settingsBusiness: () => ['settings', 'business'] as const,
  /** Effective module entitlements for the owner's business. */
  settingsModules: () => ['settings', 'modules'] as const,
  /** Resolved notification preference matrix for the caller. */
  notificationPreferences: (businessId: string | null) =>
    ['notifications', 'preferences', businessId] as const,
  /** Platform support channels (server-configured). */
  supportContact: () => ['support', 'contact'] as const,
  /** One media record by id — resolves avatar/logo/cover variants to a URL. */
  media: (mediaId: string) => ['media', mediaId] as const,
  invitation: (token: string) => ['invitation', token] as const,
}
