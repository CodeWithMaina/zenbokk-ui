import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Scissors } from 'lucide-react'
import { queryKeys } from '../../../lib/api/query-client'
import { formatDuration, money } from '../../../lib/format'
import { storefrontApi, useStorefront } from '../../../lib/storefront'
import { Card } from '../../ui/card'
import { EmptyState } from '../../ui/empty-state'
import { Skeleton } from '../../ui/skeleton'
import { StorefrontSection } from '../StorefrontSection'

export type ServicesSectionProps = {
  title: string | null
  description: string | null
  /** Opens the booking wizard, optionally with a service already chosen. */
  onBook: (serviceId?: string) => void
}

/**
 * The service menu, straight from the public catalogue.
 *
 * A service is bookable only when the business also has the appointments
 * capability — the section itself is gated on the service catalog, so the two
 * are checked separately rather than assuming one implies the other.
 */
export function ServicesSection({ title, description, onBook }: ServicesSectionProps) {
  const { businessId, can } = useStorefront()
  const canBook = can('appointments')

  const services = useQuery({
    queryKey: queryKeys.storefrontServices(businessId),
    queryFn: () => storefrontApi.services(businessId),
  })

  const available = (services.data ?? []).filter((service) => service.isActive)

  return (
    <StorefrontSection
      id="services"
      eyebrow="What we do"
      title={title}
      description={description}
      defaultTitle="Services"
      defaultDescription="Every service, with the time it takes and what it costs."
    >
      {services.isPending ? (
        <ul className="grid list-none grid-cols-1 gap-[0.9rem] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <li key={index}>
              <Skeleton className="h-[7rem] rounded-card" />
            </li>
          ))}
        </ul>
      ) : services.isError ? (
        <EmptyState
          icon={<Scissors className="size-5" />}
          title="The service menu didn’t load"
          description="Refresh the page to try again."
          action={
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void services.refetch()}
            >
              Try again
            </button>
          }
        />
      ) : available.length === 0 ? (
        <EmptyState
          icon={<Scissors className="size-5" />}
          title="Nothing published yet"
          description="This business hasn’t published its service menu yet."
        />
      ) : (
        <>
          <ul className="grid list-none grid-cols-1 gap-[0.9rem] p-0 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((service) => {
              const image = service.imageVariants?.[0]?.url

              return (
                <li key={service.id}>
                  <Card className="flex h-full flex-col overflow-hidden p-0">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        className="aspect-[16/10] w-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="flex min-w-0 flex-1 flex-col p-[1rem]">
                      <p className="text-heading font-bold tracking-snug">{service.name}</p>
                      {service.description ? (
                        <p className="mt-[0.25rem] line-clamp-3 text-meta text-muted">
                          {service.description}
                        </p>
                      ) : null}

                      <p className="mt-[0.6rem] text-meta text-muted">
                        {formatDuration(service.durationMinutes)} · {money(service.price)}
                      </p>

                      {canBook ? (
                        <button
                          type="button"
                          className="link mt-[0.7rem] inline-flex items-center gap-[0.3rem] self-start text-label font-semibold"
                          onClick={() => onBook(service.id)}
                        >
                          Book this
                          <ArrowRight className="size-[0.85rem]" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>

          {canBook && available.length > 0 ? (
            <div className="mt-[1.1rem]">
              <button
                type="button"
                className="link inline-flex items-center gap-[0.3rem] text-label font-semibold"
                onClick={() => onBook()}
              >
                Book without picking a service
                <ArrowRight className="size-[0.85rem]" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </>
      )}
    </StorefrontSection>
  )
}
