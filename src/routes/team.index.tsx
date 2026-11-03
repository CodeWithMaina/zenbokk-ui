import { createFileRoute } from '@tanstack/react-router'
import { TeamPage } from '../components/storefront'
import { StorefrontGate } from '../lib/storefront'
import { tenantStorefrontBeforeLoad } from '../lib/storefront/tenant-route'

/**
 * The roster on a business hostname (`nuru-studio.zenbokk.com/team`).
 *
 * Exists alongside the path-based `/$slug/team` because the slug is the hostname
 * on this surface, so there is no `$slug` segment for the router to bind.
 */
export const Route = createFileRoute('/team/')({
  beforeLoad: tenantStorefrontBeforeLoad,
  component: HostTeamPage,
})

function HostTeamPage() {
  const { tenantSlug } = Route.useRouteContext()

  return (
    <StorefrontGate slug={tenantSlug}>
      <TeamPage />
    </StorefrontGate>
  )
}

