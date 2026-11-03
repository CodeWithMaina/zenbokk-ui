import { createFileRoute } from '@tanstack/react-router'
import { TeamMemberPage } from '../components/storefront'
import { StorefrontGate } from '../lib/storefront'
import { tenantStorefrontBeforeLoad } from '../lib/storefront/tenant-route'

/**
 * One staff member on a business hostname
 * (`nuru-studio.zenbokk.com/team/{staffId}`).
 *
 * This route reads its own parameter and passes it down, so the shared page never
 * has to know which route mounted it.
 */
export const Route = createFileRoute('/team/$staffId')({
  beforeLoad: tenantStorefrontBeforeLoad,
  component: HostTeamMemberPage,
})

function HostTeamMemberPage() {
  const { tenantSlug } = Route.useRouteContext()
  const { staffId } = Route.useParams()

  return (
    <StorefrontGate slug={tenantSlug}>
      <TeamMemberPage staffUserId={staffId} />
    </StorefrontGate>
  )
}

