import { useMemo, useState } from 'react'
import type { ServiceCatalogItem } from '../../../lib/api/types'
import { storefrontHref } from '../../../lib/tenant'
import { useStorefront } from '../../../lib/storefront'
import { matchesQuery, serviceCategories } from '../../../lib/storefront/search'
import { sectionContent } from '../../../lib/storefront/sections'
import { useStartBooking } from '../../../lib/storefront/use-start-booking'
import { useStorefrontServices } from '../../../lib/storefront/use-storefront-catalog'
import { StorefrontFilters } from '../StorefrontFilters'
import { StorefrontPage, StorefrontPageUnavailable } from '../StorefrontPage'
import { StorefrontServiceCard } from '../StorefrontServiceCard'
import {
  StorefrontEmptyState,
  StorefrontErrorState,
  StorefrontSkeletonGrid,
} from '../StorefrontStates'

/**
 * The service menu, straight from the public catalogue.
 *
 * Takes no props: it reads the tenant from context and does its own navigation,
 * so both address shapes (`/nuru-studio/services` and
 * `nuru-studio.zenbokk.com/services`) render this one component unchanged.
 *
 * A service is bookable only when the business also has the appointments
 * capability — the page itself is gated on the service catalog, so the two are
 * checked separately rather than assuming one implies the other.
 *
 * Search and category filtering are local: the public catalogue endpoint returns
 * the business's whole published set and offers no filter parameters, so this is
 * the correct implementation rather than a shortcut, and typing never issues a
 * request.
 */
export function ServicesPage() {
  const { businessId, canonicalSlug, landingPage, can } = useStorefront()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const startBooking = useStartBooking()

  const canBook = can('appointments')
  const { title, description } = sectionContent(landingPage, 'services')
  const services = useStorefrontServices(businessId, can('services'))

  const categories = useMemo(
    () => serviceCategories(services.services.map((service) => service.categoryName)),
    [services.services],
  )

  const visible = useMemo(
    () =>
      services.services.filter(
        (service) =>
          (!category || service.categoryName === category) &&
          matchesQuery(query, service.name, service.description, service.categoryName),
      ),
    [services.services, category, query],
  )

  if (!can('services')) {
    return (
      <StorefrontPageUnavailable
        title="This business doesn’t publish a service menu"
        description="There is no catalogue on this plan, so there is nothing to browse here. Call the studio and they’ll help you directly."
      />
    )
  }

  function book(service: ServiceCatalogItem) {
    startBooking({ serviceIds: [service.id] })
  }

  return (
    <StorefrontPage
      eyebrow="What we do"
      title={title || 'Services'}
      description={description ?? 'Every service, with the time it takes and what it costs.'}
      action={
        canBook ? (
          <button type="button" className="btn btn-primary" onClick={() => startBooking()}>
            Book without picking a service
          </button>
        ) : null
      }
    >
      {services.isPending ? (
        <StorefrontSkeletonGrid variant="services" />
      ) : services.isError ? (
        <StorefrontErrorState
          title="The service menu didn’t load"
          description="Refresh the page to try again."
          onRetry={() => void services.refetch()}
        />
      ) : services.services.length === 0 ? (
        <StorefrontEmptyState
          title="Nothing published yet"
          description="This business hasn’t published its service menu yet."
        />
      ) : (
        <>
          <StorefrontFilters
            placeholder="Search services"
            search={query}
            onSearchChange={setQuery}
            options={categories}
            active={category}
            onActiveChange={setCategory}
            label="Service categories"
          />

          {visible.length === 0 ? (
            <StorefrontEmptyState
              title="Nothing matches that"
              description="Try a different word, or clear the filters to see the whole menu."
              action={
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setQuery('')
                    setCategory(null)
                  }}
                >
                  Clear search and filters
                </button>
              }
            />
          ) : (
            <div className="sf-grid-services">
              {visible.map((service, index) => (
                <StorefrontServiceCard
                  key={service.id}
                  service={service}
                  index={index}
                  detailHref={storefrontHref(canonicalSlug, `/services/${service.id}`)}
                  onBook={book}
                />
              ))}
            </div>
          )}
        </>
      )}

    </StorefrontPage>
  )
}
