import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getSession,
  setSessionTokens,
} from '../auth/session'
import { getActiveTenantSlug } from '../tenant/tenant-store'
import type { ApiEnvelope, TokenResponse } from './types'

/**
 * The only place that talks HTTP.
 *
 * Responsibilities kept in one file on purpose:
 *  - unwrap the `{ success, data, error }` envelope into plain data,
 *  - attach the bearer token and the tenant header,
 *  - refresh once (single-flight) and retry after a 401,
 *  - normalise every failure into `ApiError` so callers branch on `code`.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'
const TENANT_HEADER = 'X-Punched-Tenant'
const REFRESH_PATH = '/v1/auth/refresh-token'

export class ApiError extends Error {
  /** Machine-readable code from the envelope, or `HTTP_<status>` / `NETWORK_ERROR`. */
  readonly code: string
  readonly status: number
  readonly details: unknown

  constructor(code: string, message: string, status = 0, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  /** The business's plan does not include the module backing this endpoint. */
  get isModuleDisabled() {
    return this.code === 'MODULE_DISABLED' || this.code === 'MODULE_NOT_ENABLED'
  }

  get isNotFound() {
    return this.status === 404
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Explicit tenant slug; defaults to the active tenant for the page. */
  tenantSlug?: string | null
  /** Send the bearer token (default true). Public endpoints for a signed-in user still benefit. */
  auth?: boolean
  signal?: AbortSignal
  headers?: Record<string, string>
}

function buildUrl(path: string, search?: URLSearchParams): string {
  const suffix = search && search.size > 0 ? `?${search.toString()}` : ''
  return `${API_BASE}${path}${suffix}`
}

function buildHeaders(options: RequestOptions, hasBody: boolean): Headers {
  const headers = new Headers({ Accept: 'application/json' })
  if (hasBody) headers.set('Content-Type', 'application/json')

  const tenant = options.tenantSlug ?? getActiveTenantSlug()
  if (tenant) headers.set(TENANT_HEADER, tenant)

  if (options.auth !== false) {
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  for (const [key, value] of Object.entries(options.headers ?? {})) {
    headers.set(key, value)
  }
  return headers
}

let refreshInFlight: Promise<boolean> | null = null

/** One refresh at a time: every 401 in a burst waits on the same promise. */
function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  const refreshToken = getRefreshToken()
  const session = getSession()
  if (!refreshToken && !session) return Promise.resolve(false)

  refreshInFlight = (async () => {
    try {
      const response = await fetch(buildUrl(REFRESH_PATH), {
        method: 'POST',
        credentials: 'include',
        headers: buildHeaders({ method: 'POST', auth: false }, true),
        body: JSON.stringify({
          refreshToken: refreshToken ?? '',
          businessSlug: session?.tenantSlug ?? getActiveTenantSlug(),
        }),
      })

      const envelope = (await response.json().catch(() => null)) as ApiEnvelope<TokenResponse> | null
      if (!response.ok || !envelope?.success || !envelope.data) return false

      return setSessionTokens(envelope.data) !== null
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T> | null> {
  if (response.status === 204) return null
  return (await response.json().catch(() => null)) as ApiEnvelope<T> | null
}

async function execute<T>(
  path: string,
  search: URLSearchParams | undefined,
  options: RequestOptions,
): Promise<T> {
  const hasBody = options.body !== undefined
  const send = () =>
    fetch(buildUrl(path, search), {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: buildHeaders(options, hasBody),
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })

  let response: Response
  try {
    response = await send()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('NETWORK_ERROR', 'Could not reach Punched. Check your connection and try again.')
  }

  if (response.status === 401 && options.auth !== false && !path.startsWith('/v1/auth/')) {
    const refreshed = await refreshSession()
    if (refreshed) {
      response = await send()
    } else {
      clearSession()
    }
  }

  const envelope = await readEnvelope<T>(response)

  if (response.ok && envelope?.success) {
    return envelope.data as T
  }

  if (envelope?.error) {
    throw new ApiError(envelope.error.code, envelope.error.message, response.status)
  }

  throw new ApiError(
    `HTTP_${response.status}`,
    response.status === 403
      ? 'You do not have access to this part of Punched.'
      : 'Something went wrong. Please try again.',
    response.status,
  )
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return execute<T>(path, undefined, options)
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number)[]

/** GET helper that turns a params object into a query string, skipping empties. */
export async function apiGet<T>(
  path: string,
  params: Record<string, QueryValue> = {},
  options: RequestOptions = {},
): Promise<T> {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      // Repeated keys bind cleanly to `Guid[]` / `int[]` parameters.
      for (const entry of value) search.append(key, String(entry))
      continue
    }
    search.set(key, String(value))
  }
  return execute<T>(path, search, { ...options, method: 'GET' })
}

export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

