import { createFileRoute } from '@tanstack/react-router'
import { GalleryManager } from '../components/settings/GalleryManager'

/** Gallery — the owner's photos, captions, order and publication state. */
export const Route = createFileRoute('/dashboard/gallery')({
  component: GalleryManager,
})

