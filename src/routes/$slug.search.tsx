import { createFileRoute } from '@tanstack/react-router'
import { StorefrontSearchPage } from '../components/storefront'

export const Route = createFileRoute('/$slug/search')({
  component: StorefrontSearchPage,
})

/**
 * Search across the business's published services and its roster.
 *
 * A real route rather than an in-page overlay, so a search is linkable, works
 * with the browser's back button, and does not disturb the page the visitor came
 * from. Matching runs on the server
 * (`GET /v1/businesses/{id}/search`), scoped to this business, so the page does
 * not download the whole catalogue and roster to filter them locally.
 */
