import { apiGet, apiRequest } from '../api/client'
import type { BusinessResponse, CreateBusinessRequest } from '../api/types'

/**
 * Business provisioning and owner-scoped business reads.
 *
 * The server derives the owner from the bearer token and generates the slug
 * itself (`IBusinessSlugGenerator`), so the client never chooses either. A
 * second POST is answered with `BUSINESS_EXISTS` — the onboarding flow treats
 * that as "already provisioned" rather than creating a duplicate.
 */
export const businessApi = {
  create(body: CreateBusinessRequest): Promise<BusinessResponse> {
    return apiRequest<BusinessResponse>('/v1/businesses', { method: 'POST', body })
  },

  /** The business the signed-in owner manages (membership-derived). */
  mine(): Promise<BusinessResponse> {
    return apiGet<BusinessResponse>('/v1/businesses/me')
  },

  /**
   * Read a single business. The backend only answers when the caller holds an
   * active membership of that business; anything else is a 404.
   */
  byId(businessId: string): Promise<BusinessResponse> {
    return apiGet<BusinessResponse>(`/v1/businesses/${businessId}`)
  },
}
