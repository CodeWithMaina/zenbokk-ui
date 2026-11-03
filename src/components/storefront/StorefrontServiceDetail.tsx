import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useState } from 'react'
import { formatDuration, money } from '../../lib/format'
import { useStorefront } from '../../lib/storefront'
import {
  useStorefrontService,
  useStorefrontServices,
  useStorefrontTeam,
} from '../../lib/storefront/use-storefront-catalog'
import { storefrontHref } from '../../lib/tenant'
import { cn } from '../../lib/cn'
import { ResponsiveImage } from '../ui/responsive-image'
import { StorefrontServiceCard } from './StorefrontServiceCard'
import {
  StorefrontEmptyState,
  StorefrontErrorState,
  StorefrontSkeletonGrid,
} from './StorefrontStates'

export type StorefrontServiceDetailProps = {
  serviceId: string
  /** Opens the wizard with this service in the lineup. */
  onBook: (serviceId: string) => void
  /** Adds or removes the service from the lineup. */
  onToggle: (serviceId: string) => void
  inLineup: boolean
}

/**
 * One service, in full.
 *
 * The gallery renders whatever images the business attached, in its own order,
 * and falls back to a monogram panel when it attached none — never to a
 * generated stand-in. "Offered by" is resolved from the roster the backend
 * publishes, so a service is never attributed to someone who cannot perform it.
 *
 * There is no "what's included" list: the platform has no such field on a
 * service, and inventing bullet points from the description would be fiction.
 */
export function StorefrontServiceDetail({
  serviceId,
  onBook,
  onToggle,
  inLineup,
}: StorefrontServiceDetailProps) {
  const { businessId, canonicalSlug, can } = useStorefront()
  const [activeImage, setActiveImage] = useState(0)

  const query = useStorefrontService(businessId, serviceId)
  const team = useStorefrontTeam(businessId, [serviceId])
  const related = useStorefrontServices(businessId, can('services'))

  const service = query.service

  if (query.isError) {
    return (
      <div className="sf-container py-[clamp(2rem,5vw,3.5rem)]">
        <StorefrontErrorState
          title="We couldn’t open that service"
          description="It may have been unpublished. Browse the full menu instead."
          onRetry={() => void query.refetch()}
        />
      </div>
    )
  }

  if (!service) {
    return (
      <div className="sf-container py-[clamp(2rem,5vw,3.5rem)]">
        <StorefrontSkeletonGrid variant="services" count={2} />
      </div>
    )
  }

  if (!service.isActive) {
    return (
      <div className="sf-container py-[clamp(2rem,5vw,3.5rem)]">
        <StorefrontEmptyState
          title="This service is not available"
          description="The business has taken it off its menu."
          action={
            <a href={storefrontHref(canonicalSlug, '/search')} className="btn btn-ghost no-underline">
              Search the menu
            </a>
          }
        />
      </div>
    )
  }

  const images = service.images
  const offeredBy = team.data ?? []
  const others = related.services
    .filter((entry) => entry.id !== service.id)
    .sort((left, right) => {
      const sameLeft = left.categoryId === service.categoryId ? 0 : 1
      const sameRight = right.categoryId === service.categoryId ? 0 : 1
      return sameLeft - sameRight
    })
    .slice(0, 3)

  return (
    <div className="sf-container py-[clamp(1.5rem,4vw,3rem)]">
      <a href={storefrontHref(canonicalSlug, '/services')} className="sf-back">
        <ArrowLeft className="size-[1rem]" aria-hidden="true" />
        All services
      </a>

      <div className="sf-detail">
        <div className="sf-rise">
          <div className="sf-frame relative" style={{ aspectRatio: '4 / 5' }}>
            {images.length > 0 ? (
              images.map((image, index) => (
                <ResponsiveImage
                  key={image.id}
                  variants={image.variants}
                  alt={index === 0 ? service.name : ''}
                  sizes="(min-width: 45rem) 42vw, 100vw"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className={cn(
                    'absolute inset-0 size-full object-cover transition-opacity duration-500',
                    index === activeImage ? 'opacity-100' : 'opacity-0',
                  )}
                />
              ))
            ) : (
              <span
                aria-hidden="true"
                className="grid size-full place-items-center bg-[linear-gradient(150deg,var(--surface-sunken),var(--hover))]"
              >
                <span className="sf-heading text-[clamp(3rem,10vw,5rem)] text-subtle">
                  {service.name.slice(0, 2).toUpperCase()}
                </span>
              </span>
            )}
          </div>

          {images.length > 1 ? (
            <div className="mt-[0.55rem] flex gap-[0.55rem]">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`Photo ${index + 1}`}
                  aria-pressed={index === activeImage}
                  onClick={() => setActiveImage(index)}
                  className={cn(
                    'sf-frame flex-1 overflow-hidden p-0 transition-opacity',
                    index === activeImage ? 'opacity-100' : 'opacity-60',
                  )}
                  style={{ aspectRatio: '4 / 3' }}
                >
                  <ResponsiveImage
                    variants={image.variants}
                    alt=""
                    sizes="10rem"
                    maxWidth={320}
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="sf-rise" style={{ '--sf-i': 2 } as React.CSSProperties}>
          <p className="sf-eyebrow">{service.categoryName ?? 'Service'}</p>
          <h1 className="sf-heading">{service.name}</h1>

          <p className="sf-price">
            <b>{money(service.price)}</b>
            <span className="sf-muted">{formatDuration(service.durationMinutes)}</span>
          </p>

          {service.description ? (
            <p className="text-body leading-relaxed text-muted">{service.description}</p>
          ) : null}

          <dl className="sf-facts">
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(service.durationMinutes)}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>{money(service.price)}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{service.categoryName ?? 'Uncategorised'}</dd>
            </div>
          </dl>

          {offeredBy.length > 0 ? (
            <>
              <p className="sf-eyebrow mt-[1.2rem]">Offered by</p>
              <div className="sf-chips">
                {offeredBy.map((member) => (
                  <a
                    key={member.userId}
                    href={storefrontHref(canonicalSlug, `/team/${member.userId}`)}
                    className="sf-chip"
                  >
                    {member.fullName}
                  </a>
                ))}
              </div>
            </>
          ) : null}

          {can('appointments') ? (
            <div className="mt-[1.4rem] flex flex-wrap gap-[0.6rem]">
              <button
                type="button"
                className="btn btn-primary btn-xl"
                onClick={() => onBook(service.id)}
              >
                Book now
                <ArrowRight className="size-[0.95rem]" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-xl"
                aria-pressed={inLineup}
                onClick={() => onToggle(service.id)}
              >
                {inLineup ? (
                  <>
                    <Check className="size-[0.95rem]" aria-hidden="true" />
                    In your lineup
                  </>
                ) : (
                  'Add to lineup'
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {others.length > 0 ? (
        <section className="sf-band">
          <div className="sf-head">
            <h2 className="sf-heading">You might also like</h2>
          </div>
          <div className="sf-grid-services">
            {others.map((entry, index) => (
              <StorefrontServiceCard
                key={entry.id}
                service={entry}
                index={index}
                detailHref={storefrontHref(canonicalSlug, `/services/${entry.id}`)}
                onBook={(picked) => onBook(picked.id)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

