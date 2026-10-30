import { createFileRoute } from '@tanstack/react-router'
import { requireSession, requireTenantSurface } from '../lib/auth/guards'
import { setActiveTenantSlug } from '../lib/tenant/tenant-store'
import { StorefrontGate } from '../lib/storefront'
import { AccountPage } from './$slug.account'

/**
 * Customer account on a business hostname (`nuru-studio.zenbokk.com/account`).
 *
 * The tenant is resolved from the host before authorization, so the sign-in
 * detour happens inside the same business context and returns here.
 */
export const Route = createFileRoute('/account')({
  beforeLoad: async ({ location }) => {
    const tenantSlug = requireTenantSurface()
    setActiveTenantSlug(tenantSlug)
    await requireSession([], location.href)
    return { tenantSlug }
  },
  component: HostAccountPage,
})

function HostAccountPage() {
  const { tenantSlug } = Route.useRouteContext()

  return (
    <StorefrontGate slug={tenantSlug}>
      <AccountPage />
    </StorefrontGate>
  )
}
