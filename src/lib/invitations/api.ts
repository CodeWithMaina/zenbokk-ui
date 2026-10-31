import { apiRequest } from '../api/client'
import type {
  AcceptStaffInvitationRequest,
  AuthResponse,
  StaffInvitationValidation,
} from '../api/types'

/**
 * Staff invitation acceptance.
 *
 * The token is the only authority: the business, the role and the invited email
 * are all read from the persisted invitation server-side. The client never
 * supplies a business id, so accepting an invitation cannot place an identity in
 * a business that did not invite it.
 *
 * `InvitationsController` exposes exactly two actions — validate and accept —
 * and `accept` *creates* the staff identity. There is deliberately no
 * "join with my existing account" endpoint, so an address that already has an
 * account is refused with `EMAIL_IN_USE` rather than silently linked.
 */
export const invitationApi = {
  validate(token: string): Promise<StaffInvitationValidation> {
    return apiRequest<StaffInvitationValidation>(`/v1/invitations/${encodeURIComponent(token)}`, {
      auth: false,
    })
  },

  /** Creates the staff identity, membership and session in one call. */
  accept(token: string, body: AcceptStaffInvitationRequest): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(`/v1/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      auth: false,
      body,
    })
  },

  /**
   * Join an inviting business with the identity already signed in.
   *
   * `InvitationAcceptanceController` is `[Authorize]` on purpose: the signed-in
   * email must equal the invited email, which is the ownership proof the public
   * token-only endpoint cannot provide. A mismatch is a 403, and a conflicting
   * tenant persona is a 409.
   */
  acceptExisting(token: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>(
      `/v1/invitations/${encodeURIComponent(token)}/accept-existing`,
      { method: 'POST' },
    )
  },
}
