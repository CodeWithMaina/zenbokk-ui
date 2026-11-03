import { createFileRoute } from '@tanstack/react-router'
import { ServiceDetailPage } from '../components/storefront'
import { StorefrontGate } from '../lib/storefront'
import { tenantStorefrontBeforeLoad } from '../lib/storefront/tenant-route'

/**
 * One service on a business hostname
 * (`nuru-studio.zenbokk.com/services/{serviceId}`).
 *
 * The service id is still a path parameter; only the business comes from the
 * host. This route reads its own parameter and passes it down, so the shared page
 * never has to know which route mounted it.
 */
export const Route = createFileRoute('/services/$serviceId')({
  beforeLoad: tenantStorefrontBeforeLoad,
  component: HostServiceDetailPage,
})

function HostServiceDetailPage() {
  const { tenantSlug } = Route.useRouteContext()
  const { serviceId } = Route.useParams()

  return (
    <StorefrontGate slug={tenantSlug}>
      <ServiceDetailPage serviceId={serviceId} />
    </StorefrontGate>
  )
}

