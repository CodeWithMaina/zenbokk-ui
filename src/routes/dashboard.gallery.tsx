import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/** Gallery — placeholder (`gallery` module, `gallery.view`). */
export const Route = createFileRoute('/dashboard/gallery')({
  component: GalleryPlaceholder,
})

function GalleryPlaceholder() {
  return <ModulePlaceholder navKey="gallery" />
}
