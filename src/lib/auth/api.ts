import { apiRequest } from '../api/client'
import type {
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  RegisterResponse,
  RequestEmailVerification,
  ResetPasswordRequest,
  TokenResponse,
  UserProfile,
  VerifyEmailRequest,
} from '../api/types'
import { getActiveTenantSlug } from '../tenant/tenant-store'

/**
 * Thin, typed wrappers over `/v1/auth`. No state lives here — `AuthProvider`
 * decides what to do with the result.
 */

function tenantSlug(): string | null {
  return getActiveTenantSlug()
}

export const authApi = {
  login(body: LoginRequest): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/v1/auth/login', {
      method: 'POST',
      auth: false,
      body: { ...body, businessSlug: body.businessSlug ?? tenantSlug() },
    })
  },

  register(body: RegisterRequest): Promise<RegisterResponse> {
    return apiRequest<RegisterResponse>('/v1/auth/register', {
      method: 'POST',
      auth: false,
      // The tenant hint enrols the customer in the business they signed up on;
      // the server re-resolves and validates it before writing membership.
      body: { ...body, businessSlug: body.businessSlug ?? tenantSlug() },
    })
  },

  /** Verifying also signs the user in — the server returns a full token pair. */
  verifyEmail(body: VerifyEmailRequest): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/v1/auth/verify-email', {
      method: 'POST',
      auth: false,
      body: { ...body, businessSlug: body.businessSlug ?? tenantSlug() },
    })
  },

  requestEmailVerification(body: RequestEmailVerification): Promise<MessageResponse> {
    return apiRequest<MessageResponse>('/v1/auth/request-email', {
      method: 'POST',
      auth: false,
      body,
    })
  },

  forgotPassword(body: ForgotPasswordRequest): Promise<MessageResponse> {
    return apiRequest<MessageResponse>('/v1/auth/forgot-password', {
      method: 'POST',
      auth: false,
      body,
    })
  },

  resetPassword(body: ResetPasswordRequest): Promise<MessageResponse> {
    return apiRequest<MessageResponse>('/v1/auth/reset-password', {
      method: 'POST',
      auth: false,
      body,
    })
  },

  changePassword(body: ChangePasswordRequest): Promise<MessageResponse> {
    return apiRequest<MessageResponse>('/v1/auth/change-password', { method: 'POST', body })
  },

  logout(): Promise<MessageResponse> {
    return apiRequest<MessageResponse>('/v1/auth/logout', { method: 'POST' })
  },

  profile(): Promise<UserProfile> {
    return apiRequest<UserProfile>('/v1/users/profile')
  },

  /**
   * Exchange the current refresh token (or the shared HttpOnly cookie) for a
   * fresh pair, optionally rebinding the session to a tenant. Used after a
   * business is created, because the owner's persona and `biz` claims only
   * exist on tokens minted *after* the membership was written.
   */
  refresh(refreshToken: string | null, businessSlug?: string | null): Promise<TokenResponse> {
    return apiRequest<TokenResponse>('/v1/auth/refresh-token', {
      method: 'POST',
      auth: false,
      body: { refreshToken: refreshToken ?? '', businessSlug: businessSlug ?? tenantSlug() },
      tenantSlug: businessSlug ?? tenantSlug(),
    })
  },
}
