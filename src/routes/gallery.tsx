import { createFileRoute } from '@tanstack/react-router'
import { GalleryPage, StorefrontPageHost } from '../components/storefront'
import { StorefrontGate } from '../lib/storefront'
import { tenantStorefrontBeforeLoad } from '../lib/storefront/tenant-route'

/**
 * The gallery on a business hostname (`nuru-studio.zenbokk.com/gallery`).
 *
 * Exists alongside the path-based `/$slug/gallery` because the slug is the
 * hostname on this surface, so there is no `$slug` segment for the router to
 * bind.
 */
export const Route = createFileRoute('/gallery')({
  beforeLoad: tenantStorefrontBeforeLoad,
  component: HostGalleryPage,
})

function HostGalleryPage() {
  const { tenantSlug } = Route.useRouteContext()

  return (
    <StorefrontGate slug={tenantSlug}>
      <StorefrontPageHost kind="gallery">
        <GalleryPage />
      </StorefrontPageHost>
    </StorefrontGate>
  )
}
