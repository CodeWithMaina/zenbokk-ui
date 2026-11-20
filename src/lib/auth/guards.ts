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
export type HomePath = '/' | '/dashboard' | '/staff' | '/admin'

/**
 * Where a signed-in user of each role belongs by default.
 *
 * Platform administration is a separate surface (`admin.zenbokk.com`); the
 * caller must still reach it through its own host, which
 * `destinationForRole` handles. A customer's home is the storefront, which is
 * the same address (`/`) on a business host and on the marketing site.
 */
export function homePathForRole(role: UserRole): HomePath {
  switch (role) {
    case 'Admin':
      return '/admin'
    case 'Business':
      return '/dashboard'
    case 'Staff':
      return '/staff'
    case 'Customer':
      return '/'
  }
}

export type Landing =
  | { kind: 'internal'; to: HomePath }
  | { kind: 'external'; href: string }

/**
 * Post-authentication destination, including the host a role must be on.
 * Used by every sign-in entry point so there is one redirect strategy.
 */
export function destinationForRole(role: UserRole): Landing {
  if (role === 'Admin') return { kind: 'external', href: adminUrl('/admin') }
  return { kind: 'internal', to: homePathForRole(role) }
}

/**
 * A post-sign-in destination: a role's own console, another host, or a deep
 * link the visitor asked for (a booking draft, a console screen).
 */
export type SignInLanding = Landing | { kind: 'deep-link'; href: string }

/** The console each role owns; only its own screens are worth returning to. */
const CONSOLE_PATH: Record<Exclude<UserRole, 'Customer'>, HomePath> = {
  Business: '/dashboard',
  Staff: '/staff',
  Admin: '/admin',
}

/**
 * Whether a sign-in should return to `href` for this role.
 *
 * A customer is always returned to what they asked for — the booking draft they
 * were composing, or the shop they signed in from. A console role (owner,
 * staff, admin) is only returned to a screen inside its own console: a
 * storefront address belongs to the customer side, and following it would leave
 * an owner on a shop page instead of their dashboard.
 */
function shouldReturnTo(role: UserRole, href: string): boolean {
  if (role === 'Customer') return true

  const path = href.split(/[?#]/)[0] ?? ''
  const consolePath = CONSOLE_PATH[role]
  return path === consolePath || path.startsWith(`${consolePath}/`)
}

/**
 * Where a sign-in entry point should send the visitor once the session exists.
 *
 * One strategy for every door: honour a deep link the visitor can actually
 * use, otherwise send them to the home their role owns.
 */
export function postSignInDestination(role: UserRole, redirect?: string): SignInLanding {
  if (redirect && shouldReturnTo(role, redirect)) {
    return { kind: 'deep-link', href: redirect }
  }
  return destinationForRole(role)
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
    throw redirect({ to: homePathForRole(session.user.role) })
  }
  return session
}

/** Sign-in / sign-up pages: bounce an already-signed-in visitor to their home. */
export async function requireAnonymous(): Promise<void> {
  await ensureSessionRestored()
  const session = getSession()
  if (!session) return

  const landing = destinationForRole(session.user.role)
  throw landing.kind === 'external'
    ? redirect({ href: landing.href })
    : redirect({ to: landing.to })
}

/**
 * Routes that only exist inside a business storefront (`/`, `/book` on a
 * business host).
 */
export function requireTenantSurface(): string {
  const surface = resolveSurface()

  if (surface.kind === 'tenant') return surface.slug
  if (surface.kind === 'admin') throw redirect({ to: '/admin' })
  throw redirect({ to: '/' })
}

/**
 * The console entry point exists on the platform surfaces (the marketing site
 * and the administration host) but never inside a business storefront: a tenant
 * host that receives it sends the visitor to the platform address rather than
 * rendering platform sign-in inside a business's page.
 */
export function requirePlatformSurface(path = '/'): void {
  const surface = resolveSurface()
  if (surface.kind !== 'tenant') return
  throw redirect({ href: marketingUrl(path) })
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
