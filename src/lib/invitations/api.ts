import { apiRequest } from '../api/client'
import type {
  AcceptStaffInvitationRequest,
  AuthResponse,
  StaffInvitationValidation,
} from '../api/types'

/**
 * Staff invitation acceptance.
 *
 * The token is the only authority: the business, the role and the invited
 * email are all read from the persisted invitation server-side. The client
 * never supplies a business id, so accepting an invitation cannot place an
 * identity in a business that did not invite it.
 */
export const invitationApi = {
  validate(token: string): Promise<StaffInvitationValidation> {
    return apiRequest<StaffInvitationValidation>(`/v1/invitations/${encodeURIComponent(token)}`, {
      auth: false,
    })
  },

  /** New account: creates the staff identity, membership and session. */
  accept(token: string, body: AcceptStaffInvitationRequest): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(`/v1/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      auth: false,
      body,
    })
  },

  /** Existing identity: the signed-in email must equal the invited email. */
  acceptExisting(token: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(
      `/v1/invitations/${encodeURIComponent(token)}/accept-existing`,
      { method: 'POST' },
    )
  },
}
