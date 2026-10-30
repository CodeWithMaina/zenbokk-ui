import { createFileRoute } from '@tanstack/react-router'
import { requireTenantSurface } from '../lib/auth/guards'
import { setActiveTenantSlug } from '../lib/tenant/tenant-store'
import { StorefrontGate } from '../lib/storefront'
import { BookingWizardPage } from './$slug.book'

/**
 * Booking wizard on a business hostname (`nuru-studio.zenbokk.com/book`).
 *
 * The route only exists inside a tenant; the marketing domain uses
 * `/nuru-studio/book` instead. `signInHref` inside the wizard therefore stays
 * on the same host, preserving the in-progress draft through authentication.
 */
export const Route = createFileRoute('/book')({
  beforeLoad: () => {
    const tenantSlug = requireTenantSurface()
    setActiveTenantSlug(tenantSlug)
    return { tenantSlug }
  },
  component: HostBookingPage,
})

function HostBookingPage() {
  const { tenantSlug } = Route.useRouteContext()

  return (
    <StorefrontGate slug={tenantSlug}>
      <BookingWizardPage />
    </StorefrontGate>
  )
}
