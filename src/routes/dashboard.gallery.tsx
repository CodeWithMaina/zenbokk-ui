import { createFileRoute } from '@tanstack/react-router'
import { GalleryManager } from '../components/settings/GalleryManager'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { MODULE } from '../lib/entitlements'

/** Gallery — the owner's photos, captions, order and publication state. */
export const Route = createFileRoute('/dashboard/gallery')({
  component: GalleryPage,
})

function GalleryPage() {
  const { hasModule } = useDashboardContext()

  // Gallery is its own module. A direct link while it is off is answered like
  // every other gated route, so the media screens stay hidden.
  if (!hasModule(MODULE.gallery)) return <ModulePlaceholder navKey="gallery" />

  return <GalleryManager />
}

