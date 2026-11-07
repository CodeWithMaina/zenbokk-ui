import { createFileRoute } from '@tanstack/react-router'
import { AboutPage, StorefrontPageHost } from '../components/storefront'
import { StorefrontGate } from '../lib/storefront'
import { tenantStorefrontBeforeLoad } from '../lib/storefront/tenant-route'

/**
 * About the business on a business hostname (`nuru-studio.zenbokk.com/about`).
 *
 * The copy is the business's own description plus counts read from its real
 * records; nothing is written here on its behalf.
 */
export const Route = createFileRoute('/about')({
  beforeLoad: tenantStorefrontBeforeLoad,
  component: HostAboutPage,
})

function HostAboutPage() {
  const { tenantSlug } = Route.useRouteContext()

  return (
    <StorefrontGate slug={tenantSlug}>
      <StorefrontPageHost kind="about">
        <AboutPage />
      </StorefrontPageHost>
    </StorefrontGate>
  )
}
