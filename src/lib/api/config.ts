/**
 * Central API configuration for `PunchedAPI`.
 *
 * Everything the HTTP layer needs that is *configuration* rather than
 * behaviour lives here: the base URL, the tenant header name, the refresh
 * endpoint, the credential policy and the default headers. `client.ts` is the
 * only consumer — no feature module builds a URL or sets a header itself.
 *
 * Only `VITE_*` variables are visible to the browser bundle (see
 * `.env.example`). Never put a secret in this file.
 */

const env = import.meta.env

/** Header the API uses to narrow a request to the business whose page it came from. */
export const TENANT_HEADER = 'X-Punched-Tenant'

/** Cookie-based refresh lives here; the client also calls it after a 401. */
export const REFRESH_PATH = '/v1/auth/refresh-token'

/** Sign-in/refresh are the only endpoints that must never trigger a refresh retry. */
export const AUTH_PATH_PREFIX = '/v1/auth/'

export type ApiConfig = {
  /**
   * Base URL every request is prefixed with.
   *
   * Defaults to the same-origin `/api` proxy so the shared session cookie and
   * the tenant header behave exactly as they do in production. Set
   * `VITE_API_BASE_URL` only when the API is on a different origin that is in
   * the backend's CORS allow-list.
   */
  baseUrl: string
  tenantHeader: string
  refreshPath: string
  /** Sent with every request so the HttpOnly refresh cookie is always offered. */
  credentials: RequestCredentials
  /** Headers applied to every request before per-call overrides. */
  defaultHeaders: Readonly<Record<string, string>>
  /** Treat an access token as stale this long before its real expiry. */
  tokenExpirySkewMs: number
  /** Status codes that must never be retried automatically. */
  noRetryStatuses: readonly number[]
}

function readBaseUrl(): string {
  const configured = typeof env.VITE_API_BASE_URL === 'string' ? env.VITE_API_BASE_URL.trim() : ''
  // A trailing slash would produce `//v1/...` once a path is appended.
  return configured ? configured.replace(/\/+$/, '') : '/api'
}

export const apiConfig: ApiConfig = {
  baseUrl: readBaseUrl(),
  tenantHeader: TENANT_HEADER,
  refreshPath: REFRESH_PATH,
  credentials: 'include',
  defaultHeaders: { Accept: 'application/json' },
  tokenExpirySkewMs: 30_000,
  noRetryStatuses: [400, 401, 403, 404, 409, 422],
}

/**
 * Absolute (or proxy-relative) URL for an API path.
 *
 * `path` is always the backend route as written in the controller — `/v1/...` —
 * never a full URL, so swapping the base URL cannot silently break a caller.
 */
export function buildApiUrl(path: string, search?: URLSearchParams): string {
  const suffix = search && search.size > 0 ? `?${search.toString()}` : ''
  return `${apiConfig.baseUrl}${path}${suffix}`
}
