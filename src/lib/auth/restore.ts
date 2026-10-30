import type { TokenResponse } from '../api/types'
import { apiRequest } from '../api/client'
import { getActiveTenantSlug } from '../tenant/tenant-store'
import { authApi } from './api'
import { clearPendingTokens, getSession, setPendingTokens, setSession } from './session'
import type { Session } from './session'

/**
 * First-load hydration.
 *
 * Access tokens are short-lived, so a returning visitor can hold a valid
 * refresh cookie while `sessionStorage`/`localStorage` is empty (a different
 * subdomain, a private window that kept the cookie, a restored tab). Exchanging
 * that cookie is memoised here: route guards and the auth provider both await
 * the same promise, so a page load never fires two refresh requests and never
 * flashes a signed-out shell while the answer is in flight.
 */
let restorePromise: Promise<void> | null = null

async function exchangeCookieForSession(): Promise<void> {
  const tokens = await apiRequest<TokenResponse>('/v1/auth/refresh-token', {
    method: 'POST',
    auth: false,
    body: { businessSlug: getActiveTenantSlug() },
  })
  // Authenticate exactly one request — the profile read that completes the session.
  setPendingTokens(tokens)
  const user = await authApi.profile()
  const session: Session = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    user,
    tenantSlug: getActiveTenantSlug() ?? getSession()?.tenantSlug ?? null,
  }
  setSession(session)
}

/** Resolves once any cookie-based session has been established or ruled out. */
export function ensureSessionRestored(): Promise<void> {
  if (getSession()) return Promise.resolve()
  restorePromise ??= exchangeCookieForSession().catch(() => {
    // No cookie, revoked token, or a business that no longer exists: the
    // visitor is simply anonymous.
    clearPendingTokens()
  })
  return restorePromise
}

/** Test/debug seam — lets a fresh restore run after a hard sign-out. */
export function resetSessionRestore(): void {
  restorePromise = null
}
