import { createFileRoute } from '@tanstack/react-router'
import { ServicesPage, StorefrontPageHost } from '../components/storefront'
import { StorefrontGate } from '../lib/storefront'
import { tenantStorefrontBeforeLoad } from '../lib/storefront/tenant-route'

/**
 * The service menu on a business hostname (`nuru-studio.zenbokk.com/services`).
 *
 * The slug comes from the host, not the path, so this route exists alongside the
 * path-based `/$slug/services/` rather than instead of it. The page component is
 * shared and takes no props, so the two shapes cannot drift apart.
 */
export const Route = createFileRoute('/services/')({
  beforeLoad: tenantStorefrontBeforeLoad,
  component: HostServicesPage,
})

function HostServicesPage() {
  const { tenantSlug } = Route.useRouteContext()

  return (
    <StorefrontGate slug={tenantSlug}>
      <StorefrontPageHost kind="services">
        <ServicesPage />
      </StorefrontPageHost>
    </StorefrontGate>
  )
}

