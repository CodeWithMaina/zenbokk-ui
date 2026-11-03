import { createFileRoute } from '@tanstack/react-router'
import { GalleryPage } from '../components/storefront'

export const Route = createFileRoute('/$slug/gallery')({
  component: GalleryPage,
})

/**
 * The published gallery, path-based shape (`/nuru-studio/gallery`).
 *
 * The business hostname shape (`nuru-studio.zenbokk.com/gallery`) renders the
 * same page through `src/routes/gallery.tsx`.
 */
