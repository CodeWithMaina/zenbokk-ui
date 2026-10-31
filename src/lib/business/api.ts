import { apiGet, apiRequest } from '../api/client'
import type {
  BusinessResponse,
  CreateBusinessRequest,
  CustomerAssociatedBusiness,
} from '../api/types'

/**
 * Business provisioning and owner-scoped business reads.
 *
 * There is no combined "register owner + business" endpoint. Public
 * registration creates **customer** accounts only
 * (`RegisterRequestValidator` enforces `role === Customer`), and an owner is
 * made by creating a business:
 *
 *   1. `POST /v1/auth/register` + `POST /v1/auth/verify-email` → signed in as a
 *      Customer;
 *   2. `POST /v1/businesses` → the business is created and the caller is
 *      promoted to Owner in one transaction (`EnsureOwnerAsync`);
 *   3. refresh the session (`POST /v1/auth/refresh-token`) to receive a
 *      Business-role token — `useAuth().syncSession()` does exactly that.
 *
 * The server derives the owner from the bearer token and generates the slug
 * itself (`IBusinessSlugGenerator`), so the client never chooses either. A
 * second POST is answered with `BUSINESS_EXISTS` (409) — the onboarding flow
 * treats that as "already provisioned" rather than creating a duplicate.
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

  /**
   * The businesses a signed-in **customer** is attached to (loyalty card,
   * appointment, referral or enrollment). Owner/staff identities are refused —
   * they act in exactly one business, resolved server-side.
   *
   * The payload carries no slug: `byId()` resolves the address when the client
   * needs to open one of these businesses.
   */
  associated(): Promise<CustomerAssociatedBusiness[]> {
    return apiGet<CustomerAssociatedBusiness[]>('/v1/businesses/me/associated')
  },
}
