import { apiGet, apiRequest } from '../api/client'
import type {
  BusinessModulesResponse,
  BusinessResponse,
  SupportContact,
  UpdateBusinessDailyGoalRequest,
  UpdateBusinessReminderPolicyRequest,
  UpdateBusinessRequest,
} from '../api/types'

/**
 * Owner-scoped settings reads and writes.
 *
 * Every call is resolved from the caller's JWT — the client never names its own
 * business — and each endpoint is gated server-side (owner policy + module
 * entitlement), so callers must check access before asking. The full
 * `BusinessResponse` is the single source for the Business section: it carries
 * the reminder policy, the daily-goal configuration and the media ids, so the
 * section needs one read rather than four.
 */
export const settingsApi = {
  /** The owner's business, including reminder policy and daily-goal config. */
  business(): Promise<BusinessResponse> {
    return apiGet<BusinessResponse>('/v1/businesses/me')
  },

  /** Patch the business profile fields (name, contact, description, logo URL). */
  updateBusiness(payload: UpdateBusinessRequest): Promise<BusinessResponse> {
    return apiRequest<BusinessResponse>('/v1/businesses/me', { method: 'PATCH', body: payload })
  },

  /**
   * Change the storefront address. The backend validates format, reserved names
   * and availability, and archives the previous slug so shared links keep
   * resolving. A taken slug is a 409 `SLUG_TAKEN`.
   */
  updateSlug(slug: string): Promise<BusinessResponse> {
    return apiRequest<BusinessResponse>('/v1/businesses/me/slug', {
      method: 'PUT',
      body: { slug },
    })
  },

  /** Every module with its effective entitlement, source and dependencies. */
  modules(): Promise<BusinessModulesResponse> {
    return apiGet<BusinessModulesResponse>('/v1/businesses/me/modules')
  },

  /** Update the appointment reminder ladder (enabled, offsets, channels). */
  updateReminderPolicy(
    payload: UpdateBusinessReminderPolicyRequest,
  ): Promise<BusinessResponse> {
    return apiRequest<BusinessResponse>('/v1/businesses/me/reminder-policy', {
      method: 'PUT',
      body: payload,
    })
  },

  /** Update the business daily goal (metric + targets). */
  updateDailyGoal(payload: UpdateBusinessDailyGoalRequest): Promise<BusinessResponse> {
    return apiRequest<BusinessResponse>('/v1/businesses/me/daily-goal', {
      method: 'PUT',
      body: payload,
    })
  },
}

/**
 * Platform support channels (`GET /v1/support`), resolved from server
 * configuration. Read-only: there is no support-ticket API, so the client only
 * renders links (mailto / tel / wa.me / help centre).
 */
export const supportApi = {
  contact(): Promise<SupportContact> {
    return apiGet<SupportContact>('/v1/support')
  },
}
