import { createFileRoute, Outlet } from '@tanstack/react-router'
import { StorefrontGate } from '../lib/storefront'
import { setActiveTenantSlug } from '../lib/tenant/tenant-store'

export const Route = createFileRoute('/$slug')({
  beforeLoad: ({ params }) => {
    // The path names the tenant before any child (or auth detour) runs, so
    // every request from this subtree carries the right tenant hint even on a
    // cold load of a deep link.
    setActiveTenantSlug(params.slug)
  },
  component: StorefrontLayout,
})

/**
 * Path-based storefront (`/nuru-studio`, `/nuru-studio/book`).
 *
 * The same pages are reachable from a business hostname (`/book`); both
 * shapes resolve the tenant through `StorefrontGate`, which loads the
 * persisted business before rendering anything.
 */
function StorefrontLayout() {
  const { slug } = Route.useParams()

  return (
    <StorefrontGate slug={slug}>
      <Outlet />
    </StorefrontGate>
  )
}
