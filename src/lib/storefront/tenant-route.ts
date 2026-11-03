import { requireTenantSurface } from '../auth/guards'
import { setActiveTenantSlug } from '../tenant/tenant-store'

/**
 * `beforeLoad` for a storefront page reached through a business hostname.
 *
 * The storefront has two address shapes and they need different routes:
 *
 *  - `zenbokk.com/nuru-studio/team` — the slug is the first path segment, so the
 *    `$slug` layout route resolves it;
 *  - `nuru-studio.zenbokk.com/team` — the slug is the *hostname*, so the path is
 *    just `/team` and there is no `$slug` segment for the router to bind.
 *
 * This is the second shape. Without a route for it, `/team` would fall through
 * to `/$slug` with `slug = "team"` and the gate would honestly report that no
 * business answers to that name — which is exactly the bug this exists to avoid.
 *
 * The slug is published to the tenant store before anything renders, so a cold
 * deep link carries the right tenant hint on every request the page makes,
 * mirroring what the `$slug` layout does for the path-based shape.
 *
 * A non-tenant host redirects (`/` on the marketing site, `/admin` on the admin
 * host) rather than rendering a business page at a platform address.
 */
export function tenantStorefrontBeforeLoad() {
  const tenantSlug = requireTenantSurface()
  setActiveTenantSlug(tenantSlug)
  return { tenantSlug }
}
