import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../components/shell/ModulePlaceholder'

/** Reviews — placeholder (`reviews` module, `reviews.view`). */
export const Route = createFileRoute('/dashboard/reviews')({
  component: ReviewsPlaceholder,
})

function ReviewsPlaceholder() {
  return <ModulePlaceholder navKey="reviews" />
}
