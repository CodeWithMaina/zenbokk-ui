import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { queryKeys } from '../../../lib/api/query-client'
import { formatDate, formatNumber, pluralize } from '../../../lib/format'
import { storefrontApi, useStorefront } from '../../../lib/storefront'
import { Card } from '../../ui/card'
import { EmptyState } from '../../ui/empty-state'
import { Skeleton } from '../../ui/skeleton'
import { StorefrontSection } from '../StorefrontSection'

export type ReviewsSectionProps = {
  title: string | null
  description: string | null
}

/** Five stars, filled to `rating`. Purely decorative — the number is beside it. */
function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((step) => (
        <Star
          key={step}
          className={step <= Math.round(rating) ? 'size-[0.85rem] fill-current' : 'size-[0.85rem]'}
        />
      ))}
    </span>
  )
}

/**
 * Published reviews for this business.
 *
 * `GET /v1/reviews/businesses/{id}/reviews` is anonymous and returns published
 * reviews only, with the reviewer's display name and nothing that identifies the
 * customer behind it.
 */
export function ReviewsSection({ title, description }: ReviewsSectionProps) {
  const { businessId, business } = useStorefront()

  const summary = useQuery({
    queryKey: [...queryKeys.storefront(businessId), 'reviews', 'summary'],
    queryFn: () => storefrontApi.reviewSummary(businessId),
  })

  const reviews = useQuery({
    queryKey: [...queryKeys.storefront(businessId), 'reviews', 'list'],
    queryFn: () => storefrontApi.reviews(businessId),
  })

  const items = reviews.data?.items ?? []
  const average = summary.data?.averageRating ?? 0
  const total = summary.data?.totalCount ?? 0

  return (
    <StorefrontSection
      id="reviews"
      eyebrow="What customers say"
      title={title}
      description={description}
      defaultTitle="Reviews"
    >
      {reviews.isPending ? (
        <div className="grid gap-[0.9rem] sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          <Skeleton className="h-[9rem] rounded-card" />
          <Skeleton className="h-[9rem] rounded-card" />
          <Skeleton className="h-[9rem] rounded-card" />
        </div>
      ) : reviews.isError ? (
        <EmptyState
          icon={<Star className="size-5" />}
          title="Reviews didn’t load"
          description="Refresh the page to try again."
          action={
            <button type="button" className="btn btn-ghost" onClick={() => void reviews.refetch()}>
              Try again
            </button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Star className="size-5" />}
          title="No reviews yet"
          description={`Be the first to review ${business.name} after your next visit.`}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-[0.6rem] text-meta">
            <Stars rating={average} className="flex items-center gap-[0.1rem] text-accent" />
            <b className="font-semibold tabular">{average.toFixed(1)}</b>
            <span className="text-muted">
              from {pluralize(total, 'review')}
            </span>
          </div>

          <ul className="mt-[1.1rem] grid list-none grid-cols-1 gap-[0.9rem] p-0 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((review) => (
              <li key={review.id}>
                <Card className="flex h-full flex-col p-[1rem]">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={review.rating} className="flex items-center gap-[0.1rem] text-accent" />
                    <span className="text-caption text-subtle">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  {review.comment ? (
                    <p className="mt-[0.6rem] flex-1 text-meta leading-relaxed text-muted">
                      {review.comment}
                    </p>
                  ) : null}

                  <p className="mt-[0.8rem] flex items-center gap-[0.5rem] text-label font-semibold">
                    {review.reviewerAvatar ? (
                      <img
                        src={review.reviewerAvatar}
                        alt=""
                        className="size-[1.7rem] rounded-round object-cover"
                      />
                    ) : (
                      <span className="grid size-[1.7rem] place-items-center rounded-round bg-accent-soft text-caption font-bold text-accent-ink">
                        {(review.reviewerDisplayName ?? '?').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    {review.reviewerDisplayName || 'A customer'}
                  </p>
                </Card>
              </li>
            ))}
          </ul>

          {items.length < total ? (
            <p className="mt-[0.9rem] text-caption text-subtle">
              Showing {formatNumber(items.length)} of {formatNumber(total)} reviews.
            </p>
          ) : null}
        </>
      )}
    </StorefrontSection>
  )
}
