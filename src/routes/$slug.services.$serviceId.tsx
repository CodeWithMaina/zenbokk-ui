import { createFileRoute } from '@tanstack/react-router'
import { ServiceDetailPage } from '../components/storefront'

export const Route = createFileRoute('/$slug/services/$serviceId')({
  component: ServiceDetailRoute,
})

/**
 * One service, path-based shape (`/nuru-studio/services/{serviceId}`).
 *
 * The id is read from *this* route and handed to the page as a prop. Reading it
 * inside the page instead would break the hostname twin, which mounts the same
 * component under a different route id.
 */
function ServiceDetailRoute() {
  const { serviceId } = Route.useParams()

  return <ServiceDetailPage serviceId={serviceId} />
}

