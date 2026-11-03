import { createFileRoute } from '@tanstack/react-router'
import { ContactPage } from '../components/storefront'
import { StorefrontGate } from '../lib/storefront'
import { tenantStorefrontBeforeLoad } from '../lib/storefront/tenant-route'

/**
 * Contact on a business hostname (`nuru-studio.zenbokk.com/contact`).
 *
 * The enquiry form posts to `POST /v1/businesses/{id}/enquiries`, which records
 * the enquiry against this business and delivers it to its owner — so the
 * success screen is shown only after the server accepted it.
 */
export const Route = createFileRoute('/contact')({
  beforeLoad: tenantStorefrontBeforeLoad,
  component: HostContactPage,
})

function HostContactPage() {
  const { tenantSlug } = Route.useRouteContext()

  return (
    <StorefrontGate slug={tenantSlug}>
      <ContactPage />
    </StorefrontGate>
  )
}
