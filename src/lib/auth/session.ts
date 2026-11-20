import type { UserProfile } from '../api/types'

/**
 * Single owner of the persisted session.
 *
 * Only the short-lived access token, the profile and the tenant are written to
 * `localStorage`. The refresh token is deliberately kept **in memory only**: the
 * API already issues it as an HttpOnly session cookie scoped to the registrable
 * domain, so every refresh this app performs can — and does — omit the token
 * from the request body and let the cookie authenticate it. Persisting it would
 * hand any XSS payload a long-lived credential it can exfiltrate, for no benefit.
 *
 * Components must read the session through `useAuth()`, not from storage.
 */

const STORAGE_KEY = 'punched.session'
/** Treat a token as expired slightly early so a request never races the clock. */
const EXPIRY_SKEW_MS = 30_000

export type Session = {
  accessToken: string
  /** In-memory only; never written to storage. */
  refreshToken: string | null
  /** Epoch millis at which `accessToken` stops being usable. */
  expiresAt: number
  user: UserProfile
  /** Tenant the session was established against (sent on every request). */
  tenantSlug: string | null
}

/** The shape that is written to `localStorage` — everything except the refresh token. */
type StoredSession = Omit<Session, 'refreshToken'>

type Listener = () => void

const listeners = new Set<Listener>()
let current: Session | null = null

/**
 * Tokens obtained from a cookie-only refresh before the profile call lands.
 * They authenticate exactly one request (fetching the user) and are promoted
 * into a real session — or dropped — immediately after.
 */
let pendingTokens: { accessToken: string; refreshToken: string; expiresAt: number } | null = null


function parse(raw: string | null): Session | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const candidate = parsed as Partial<StoredSession> & { refreshToken?: unknown }
    if (typeof candidate.accessToken !== 'string' || typeof candidate.expiresAt !== 'number') {
      return null
    }
    if (!candidate.user || typeof candidate.user.id !== 'string') return null

    return {
      accessToken: candidate.accessToken,
      // A legacy entry may still carry a refresh token: it is dropped on read,
      // and the next write persists the token-free shape.
      refreshToken: null,
      expiresAt: candidate.expiresAt,
      user: candidate.user,
      tenantSlug: candidate.tenantSlug ?? null,
    }
  } catch {
    return null
  }
}

function readFromStorage(): Session | null {
  if (typeof window === 'undefined') return null
  return parse(window.localStorage.getItem(STORAGE_KEY))
}

function writeToStorage(session: Session): void {
  if (typeof window === 'undefined') return
  const stored: StoredSession = {
    accessToken: session.accessToken,
    expiresAt: session.expiresAt,
    user: session.user,
    tenantSlug: session.tenantSlug,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

function notify() {
  for (const listener of listeners) listener()
}

/** Hydrate once at module load so the first render already has a session. */
current = readFromStorage()

export function getSession(): Session | null {
  return current
}

export function getAccessToken(): string | null {
  const now = Date.now()
  if (current && current.expiresAt - EXPIRY_SKEW_MS > now) return current.accessToken
  if (pendingTokens && pendingTokens.expiresAt - EXPIRY_SKEW_MS > now) return pendingTokens.accessToken
  return null
}

export function getRefreshToken(): string | null {
  return current?.refreshToken ?? pendingTokens?.refreshToken ?? null
}

/** Stage a token pair while the profile request that completes the session runs. */
export function setPendingTokens(tokens: {
  accessToken: string
  refreshToken: string
  expiresIn: number
}): void {
  pendingTokens = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  }
}

export function clearPendingTokens(): void {
  pendingTokens = null
}

export function setSession(session: Session): void {
  pendingTokens = null
  current = session
  writeToStorage(session)
  notify()
}

/** Keeps the user/tenant while swapping the token pair after a refresh. */
export function setSessionTokens(
  tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  fallback?: Pick<Session, 'user' | 'tenantSlug'>,
): Session | null {
  const base = current ?? fallback
  if (!base) return null

  const next: Session = {
    ...base,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  }
  setSession(next)
  return next
}

export function patchSessionUser(user: UserProfile): void {
  if (!current) return
  setSession({ ...current, user })
}

export function clearSession(): void {
  current = null
  pendingTokens = null
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
  }
  notify()
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Keep tabs in agreement: another tab signing in/out rewrites storage, which
 * fires here so this tab re-reads instead of holding a dead access token.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    const next = parse(event.newValue)
    const changed = next?.accessToken !== current?.accessToken
    current = next
    if (changed) notify()
  })
}
