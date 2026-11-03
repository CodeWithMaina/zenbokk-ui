import { createFileRoute } from '@tanstack/react-router'
import { TeamMemberPage } from '../components/storefront'

export const Route = createFileRoute('/$slug/team/$staffId')({
  component: TeamMemberRoute,
})

/**
 * One staff member, path-based shape (`/nuru-studio/team/{staffId}`).
 *
 * The id is read from *this* route and handed to the page as a prop. Reading it
 * inside the page instead would break the hostname twin, which mounts the same
 * component under a different route id.
 */
function TeamMemberRoute() {
  const { staffId } = Route.useParams()

  return <TeamMemberPage staffUserId={staffId} />
}

