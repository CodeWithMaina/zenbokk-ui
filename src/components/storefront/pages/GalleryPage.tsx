import { StorefrontGallery } from '../StorefrontGallery'

/**
 * The gallery page, path-based shape (`/nuru-studio/gallery`) and host shape
 * (`nuru-studio.zenbokk.com/gallery`).
 *
 * The rendering lives in `StorefrontGallery` because the same component is also
 * used directly; this file exists so the page has a home alongside the other
 * pages, matching `ServicesPage` / `TeamPage`.
 */
export function GalleryPage() {
  return <StorefrontGallery />
}
