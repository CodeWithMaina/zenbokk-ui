import { apiGet, apiRequest } from '../api/client'
import type {
  ResolvedNotificationPreference,
  UpdateNotificationPreferencesRequest,
} from '../api/types'

/**
 * Notification preference client (`UserController`, `/v1/users`).
 *
 * The read returns the RESOLVED matrix — every (category × channel) pair with
 * its effective value, whether this deployment ships a sender for the channel,
 * and which level decided it — so the client never re-implements the business
 * kill-switch → user-business → user-global → default precedence. Writes are
 * sparse upserts: only the cells the user actually changed need to be sent.
 */
export const notificationsApi = {
  preferences(businessId?: string | null): Promise<ResolvedNotificationPreference[]> {
    return apiGet<ResolvedNotificationPreference[]>('/v1/users/me/notification-preferences', {
      businessId: businessId ?? undefined,
    })
  },

  updatePreferences(
    payload: UpdateNotificationPreferencesRequest,
  ): Promise<ResolvedNotificationPreference[]> {
    return apiRequest<ResolvedNotificationPreference[]>(
      '/v1/users/me/notification-preferences',
      { method: 'PUT', body: payload },
    )
  },
}
