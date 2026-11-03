import { createFileRoute } from '@tanstack/react-router'
import { StorefrontSearchPage } from '../components/storefront'
import { StorefrontGate } from '../lib/storefront'
import { tenantStorefrontBeforeLoad } from '../lib/storefront/tenant-route'

/**
 * Search on a business hostname (`nuru-studio.zenbokk.com/search`).
 *
 * A real route rather than an overlay, so a search is linkable, works with the
 * browser's back button, and does not disturb the page the visitor came from.
 */
export const Route = createFileRoute('/search')({
  beforeLoad: tenantStorefrontBeforeLoad,
  component: HostSearchPage,
})

function HostSearchPage() {
  const { tenantSlug } = Route.useRouteContext()

  return (
    <StorefrontGate slug={tenantSlug}>
      <StorefrontSearchPage />
    </StorefrontGate>
  )
}
