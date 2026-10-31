import { apiGet } from '../api/client'
import type {
  AdminBusinessSummary,
  AdminDashboard,
  AdminGrowth,
  AdminUserSummary,
  PaginatedResponse,
} from '../api/types'

/**
 * Platform administration reads. Every endpoint requires the `PlatformAdmin`
 * policy server-side — an owner or staff token is refused even if the route is
 * reachable in the client.
 */
export const adminApi = {
  dashboard(): Promise<AdminDashboard> {
    return apiGet<AdminDashboard>('/v1/admin/dashboard')
  },

  /** Time series per metric, over the server's default period. */
  growth(period?: '7d' | '30d' | '90d'): Promise<AdminGrowth> {
    return apiGet<AdminGrowth>('/v1/admin/growth', { period: period ?? null })
  },

  businesses(
    filters: { category?: string | null; search?: string | null; page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<AdminBusinessSummary>> {
    return apiGet<PaginatedResponse<AdminBusinessSummary>>('/v1/admin/businesses', filters)
  },

  users(
    filters: { search?: string | null; page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<AdminUserSummary>> {
    return apiGet<PaginatedResponse<AdminUserSummary>>('/v1/admin/users', filters)
  },
}
