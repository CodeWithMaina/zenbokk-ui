import { createFileRoute } from '@tanstack/react-router'
import { ReviewsPage } from '../components/storefront'

export const Route = createFileRoute('/$slug/reviews')({
  component: ReviewsPage,
})

/**
 * Published reviews, at their own address.
 *
 * The endpoint is anonymous and returns published reviews only, with the
 * reviewer's display name and nothing that identifies the customer behind it.
 */
