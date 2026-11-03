const PREFIX = 'punched.guest-booking.'

/**
 * A verified guest's short-lived customer token.
 *
 * Held in `sessionStorage`, per business, and deliberately **not** written into
 * the app's session store: a guest has no profile to hydrate one with, and
 * pretending they are signed in would break every signed-in surface. The token
 * authenticates the booking calls it exists for and expires on its own.
 */
export type GuestSession = {
  /** Customer access token scoped to the business. */
  token: string
  /** Epoch millis at which it stops being usable. */
  expiresAt: number
  /** Who was verified, so the confirmation can address them. */
  fullName: string
  phoneNumber: string
}

function key(businessId: string) {
  return `${PREFIX}${businessId}`
}

function parse(raw: string | null): GuestSession | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<GuestSession>
    if (
      typeof value.token !== 'string' ||
      typeof value.expiresAt !== 'number' ||
      typeof value.fullName !== 'string' ||
      typeof value.phoneNumber !== 'string'
    ) {
      return null
    }
    return {
      token: value.token,
      expiresAt: value.expiresAt,
      fullName: value.fullName,
      phoneNumber: value.phoneNumber,
    }
  } catch {
    return null
  }
}

export function readGuestSession(businessId: string): GuestSession | null {
  if (typeof window === 'undefined') return null
  return parse(window.sessionStorage.getItem(key(businessId)))
}

export function writeGuestSession(businessId: string, session: GuestSession): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(key(businessId), JSON.stringify(session))
}

export function clearGuestSession(businessId: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(key(businessId))
}

/**
 * The token if it is still valid, otherwise null — and an expired record is
 * dropped rather than left behind to fail the next request.
 */
export function guestTokenFor(businessId: string): string | null {
  const session = readGuestSession(businessId)
  if (!session) return null
  if (session.expiresAt <= Date.now()) {
    clearGuestSession(businessId)
    return null
  }
  return session.token
}
