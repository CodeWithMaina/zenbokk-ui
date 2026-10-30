import { redirect } from '@tanstack/react-router'
import type { UserRole } from '../api/types'
import { adminUrl, isLocalHost, marketingUrl, resolveSurface } from '../tenant/host'
import { ensureSessionRestored } from './restore'
import { getSession } from './session'
import type { Session } from './session'

/**
 * Route guards live outside React so they can run in `beforeLoad`, before a
 * protected shell renders. They never decide authorization — the API does that
 * from the caller's memberships. A guard only avoids showing a shell that is
 * guaranteed to 401, and only ever routes by the role the server reported.
 *
 * Host guards are the second axis: a business host owns the storefront, the
 * marketing host owns registration/owner entry points, and the admin host owns
 * platform administration. Guards never *grant* access from a host — the
 * backend resolves the tenant and the membership on every request.
 */

/** Console each role belongs to after signing in. */
export type HomePath = '/' | '/dashboard' | '/staff' | '/admin' | '/account'

/**
 * Where a signed-in user of each role belongs by default.
 *
 * Platform administration is a separate surface (`admin.zenbokk.com`); the
 * caller must still reach it through its own host, which
 * `destinationForRole` handles. A customer lands on the storefront account
 * when a tenant is active, and on the marketing site otherwise.
 */
export function homePathForRole(role: UserRole, tenantActive = false): HomePath {
  switch (role) {
    case 'Admin':
      return '/admin'
    case 'Business':
      return '/dashboard'
    case 'Staff':
      return '/staff'
    case 'Customer':
      return tenantActive ? '/account' : '/'
  }
}

export type Landing =
  | { kind: 'internal'; to: HomePath }
  | { kind: 'external'; href: string }

/**
 * Post-authentication destination, including the host a role must be on.
 * Used by every sign-in entry point so there is one redirect strategy.
 */
export function destinationForRole(role: UserRole, tenantActive = false): Landing {
  if (role === 'Admin') return { kind: 'external', href: adminUrl('/admin') }
  return { kind: 'internal', to: homePathForRole(role, tenantActive) }
}

function signInPathFor(roles: readonly UserRole[]): '/login' | '/auth/sign-in' {
  const consoleRole = roles.some((role) => role === 'Business' || role === 'Staff' || role === 'Admin')
  return consoleRole ? '/login' : '/auth/sign-in'
}

/**
 * Require one of `roles` (empty = any signed-in user).
 *
 * `href` is the address to return to after signing in — pass the full current
 * href so a deep link (and an in-flight booking draft) survives the detour.
 */
export async function requireSession(
  roles: readonly UserRole[],
  href: string,
): Promise<Session> {
  await ensureSessionRestored()
  const session = getSession()

  if (!session) {
    throw redirect({ to: signInPathFor(roles), search: { redirect: href } })
  }
  if (roles.length > 0 && !roles.includes(session.user.role)) {
    throw redirect({ to: homePathForRole(session.user.role, resolveSurface().kind === 'tenant') })
  }
  return session
}

/** Sign-in / sign-up pages: bounce an already-signed-in visitor to their home. */
export async function requireAnonymous(): Promise<void> {
  await ensureSessionRestored()
  const session = getSession()
  if (!session) return

  const landing = destinationForRole(session.user.role, resolveSurface().kind === 'tenant')
  throw landing.kind === 'external'
    ? redirect({ href: landing.href })
    : redirect({ to: landing.to })
}

/**
 * Routes that only exist inside a business storefront (`/`, `/book`,
 * `/account` on a business host).
 */
export function requireTenantSurface(): string {
  const surface = resolveSurface()

  if (surface.kind === 'tenant') return surface.slug
  if (surface.kind === 'admin') throw redirect({ to: '/admin' })
  throw redirect({ to: '/' })
}

/**
 * The marketing site owns registration and the owner entry point. A business
 * host that receives those paths sends the visitor to the canonical marketing
 * address instead of rendering platform marketing inside a tenant.
 */
export function requireMarketingSurface(path = '/'): void {
  const surface = resolveSurface()
  const onDevHost = isLocalHost()
  if (surface.kind === 'marketing' || onDevHost) return

  if (surface.kind === 'admin') throw redirect({ to: '/admin' })
  throw redirect({ href: marketingUrl(path) })
}

/**
 * Platform administration lives on its own hostname. Local development runs
 * it on `localhost` (and `admin.localhost`) so the same route is reachable
 * without DNS wildcards.
 */
export function requireAdminSurface(): void {
  const surface = resolveSurface()
  if (surface.kind === 'admin' || isLocalHost()) return

  const path =
    typeof window === 'undefined'
      ? '/admin'
      : `${window.location.pathname}${window.location.search}`
  throw redirect({ href: adminUrl(path) })
}
