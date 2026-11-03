import { StorefrontBookingTray } from '../StorefrontBookingTray'
import { StorefrontTeamMemberDetail } from '../StorefrontTeamMemberDetail'
import { useLineupToggle } from '../../../lib/storefront'
import { useStartBooking } from '../../../lib/storefront/use-start-booking'

export type TeamMemberPageProps = {
  /** The member to show — a path parameter on both address shapes. */
  staffUserId: string
}

/**
 * One staff member's own page.
 *
 * The id arrives as a prop rather than being read from a route object: the page
 * is rendered by two different routes (`/$slug/team/$staffId` and
 * `/team/$staffId`), and a component that reads its own route's params throws
 * when it is mounted by the other one.
 *
 * The member is looked up in the business's *public* roster rather than fetched
 * by id: that is the only set a customer is allowed to see, so an id belonging
 * to another business — or to a member the business has made private — simply is
 * not found, and the page says so rather than leaking that the person exists.
 */
export function TeamMemberPage({ staffUserId }: TeamMemberPageProps) {
  const startBooking = useStartBooking()
  const { isSelected, toggle } = useLineupToggle()

  return (
    <>
      <StorefrontTeamMemberDetail
        staffUserId={staffUserId}
        onBookWith={(id) => startBooking({ staffId: id })}
        onToggleService={toggle}
        isInLineup={isSelected}
      />
      <StorefrontBookingTray />
    </>
  )
}
