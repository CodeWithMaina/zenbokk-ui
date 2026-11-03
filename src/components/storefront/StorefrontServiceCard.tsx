import { Plus } from 'lucide-react'
import type { ServiceCatalogItem } from '../../lib/api/types'
import { formatDuration, money } from '../../lib/format'
import { ResponsiveImage } from '../ui/responsive-image'

export type StorefrontServiceCardProps = {
  service: ServiceCatalogItem
  /** The service detail route, e.g. `{storefront}/services/{id}`. */
  detailHref: string
  /** Adds the service to the lineup and opens the wizard. */
  onBook: (service: ServiceCatalogItem) => void
  /** Stagger index for the entrance animation. */
  index?: number
}

/**
 * One service, as the design draws it: a 4/5 image with a frosted label carrying
 * the name, the blurb, the real price and duration, and a book action.
 *
 * The card is a link to the service's own page, and the book button sits *inside*
 * it — which is why the button stops propagation rather than the card being a
 * button: two distinct actions in one tile, both reachable by keyboard.
 */
export function StorefrontServiceCard({
  service,
  detailHref,
  onBook,
  index = 0,
}: StorefrontServiceCardProps) {
  const variants = service.images.flatMap((image) => image.variants)
  const cover = variants.length > 0 ? variants : (service.imageVariants ?? [])

  return (
    <a
      href={detailHref}
      className="sf-card-service sf-rise"
      style={{ '--sf-i': index } as React.CSSProperties}
      aria-label={`${service.name}, ${money(service.price)}, ${formatDuration(service.durationMinutes)}`}
    >
      {cover.length > 0 ? (
        <ResponsiveImage
          variants={cover}
          alt=""
          sizes="(min-width: 56rem) 20rem, (min-width: 35rem) 45vw, 50vw"
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        // No photo yet: the card keeps its shape and shows the category, so the
        // grid stays regular instead of collapsing to a text row.
        <span
          aria-hidden="true"
          className="grid size-full place-items-center bg-[linear-gradient(150deg,var(--surface-sunken),var(--hover))]"
        >
          <span className="sf-heading text-[2.4rem] text-subtle">
            {service.name.slice(0, 2).toUpperCase()}
          </span>
        </span>
      )}

      <span className="sf-card-label">
        <b>{service.name}</b>
        {service.description ? <p>{service.description}</p> : null}
        <span className="sf-card-meta">
          <span>
            {money(service.price)} <i>{formatDuration(service.durationMinutes)}</i>
          </span>
          <button
            type="button"
            className="sf-card-book"
            onClick={(event) => {
              // The tile navigates; this action books.
              event.preventDefault()
              event.stopPropagation()
              onBook(service)
            }}
          >
            <Plus className="size-[0.75rem]" aria-hidden="true" />
            Book
          </button>
        </span>
      </span>
    </a>
  )
}
