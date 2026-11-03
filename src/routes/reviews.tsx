import { createFileRoute } from '@tanstack/react-router'
import { ReviewsPage } from '../components/storefront'
import { StorefrontGate } from '../lib/storefront'
import { tenantStorefrontBeforeLoad } from '../lib/storefront/tenant-route'

/**
 * Published reviews on a business hostname (`nuru-studio.zenbokk.com/reviews`).
 *
 * The endpoint is anonymous and returns published reviews only, with the
 * reviewer's display name and nothing that identifies the customer behind it.
 */
export const Route = createFileRoute('/reviews')({
  beforeLoad: tenantStorefrontBeforeLoad,
  component: HostReviewsPage,
})

function HostReviewsPage() {
  const { tenantSlug } = Route.useRouteContext()

  return (
    <StorefrontGate slug={tenantSlug}>
      <ReviewsPage />
    </StorefrontGate>
  )
}
