import { StorefrontBookingTray } from '../StorefrontBookingTray'
import { StorefrontServiceDetail } from '../StorefrontServiceDetail'
import { useLineupToggle } from '../../../lib/storefront'
import { useStartBooking } from '../../../lib/storefront/use-start-booking'

export type ServiceDetailPageProps = {
  /** The service to show — a path parameter on both address shapes. */
  serviceId: string
}

/**
 * One service's own page.
 *
 * The id arrives as a prop rather than being read from a route object: the page
 * is rendered by two different routes (`/$slug/services/$serviceId` and
 * `/services/$serviceId`), and a component that reads its own route's params
 * throws when it is mounted by the other one.
 *
 * The id alone never grants access to anything — the API scopes the lookup to
 * the business it is asked about.
 */
export function ServiceDetailPage({ serviceId }: ServiceDetailPageProps) {
  const startBooking = useStartBooking()
  const { isSelected, toggle } = useLineupToggle()

  return (
    <>
      <StorefrontServiceDetail
        serviceId={serviceId}
        onBook={(id) => startBooking({ serviceIds: [id] })}
        onToggle={toggle}
        inLineup={isSelected(serviceId)}
      />
      <StorefrontBookingTray />
    </>
  )
}
