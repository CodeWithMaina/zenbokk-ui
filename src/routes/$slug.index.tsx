import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react'
import { ServiceCard } from '../components/ui/service-card'
import { Skeleton } from '../components/ui/skeleton'
import { queryKeys } from '../lib/api/query-client'
import { CAPABILITY } from '../lib/entitlements'
import {
  emptyDraft,
  storefrontApi,
  useStorefront,
  writeBookingDraft,
} from '../lib/storefront'
import { storefrontHref } from '../lib/tenant'

export const Route = createFileRoute('/$slug/')({
  component: StorefrontHomePage,
})

export function StorefrontHomePage() {
  const { business, landingPage, businessId, canonicalSlug, can } = useStorefront()
  const router = useRouter()
  const booksServices = can(CAPABILITY.services)

  const services = useQuery({
    queryKey: queryKeys.storefrontServices(businessId),
    queryFn: () => storefrontApi.services(businessId),
    enabled: booksServices,
  })

  const heroImage = landingPage.heroBackgroundVariants?.[0]?.url ?? null
  const available = (services.data ?? []).filter((service) => service.isActive)

  function startWith(serviceId?: string) {
    writeBookingDraft(businessId, {
      ...emptyDraft,
      serviceIds: serviceId ? [serviceId] : [],
      step: 'services',
    })
    void router.history.push(storefrontHref(canonicalSlug, '/book'))
  }

  return (
    <div>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid w-full max-w-(--container-page) items-center gap-[clamp(1.5rem,4vw,3rem)] px-gutter py-[clamp(2rem,6vw,4rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <p className="eyebrow">{business.category || 'Welcome'}</p>
            <h1 className="display mt-[0.5rem] text-display">
              {landingPage.heroTitle || business.name}
            </h1>
            {landingPage.heroTagline ? (
              <p className="mt-[0.75rem] text-lead text-muted">{landingPage.heroTagline}</p>
            ) : null}
            {landingPage.heroDescription ? (
              <p className="mt-[0.75rem] max-w-[34rem] text-meta text-muted">
                {landingPage.heroDescription}
              </p>
            ) : null}

            <div className="mt-[1.4rem] flex flex-wrap items-center gap-[0.6rem]">
              {can(CAPABILITY.appointments) ? (
                <button type="button" className="btn btn-primary btn-xl" onClick={() => startWith()}>
                  {landingPage.primaryCta?.label || 'Book an appointment'}
                </button>
              ) : null}
              {booksServices ? (
                <a href="#services" className="btn btn-ghost btn-xl no-underline">
                  See services
                </a>
              ) : null}
            </div>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-panel border border-line bg-sunken">
            {heroImage ? (
              <img
                src={heroImage}
                alt={`${business.name} interior`}
                className="size-full object-cover"
                loading="eager"
              />
            ) : (
              <div
                aria-hidden="true"
                className="grid size-full place-items-center bg-[linear-gradient(150deg,var(--surface-sunken),var(--hover))]"
              >
                <span className="display px-4 text-center text-[clamp(2rem,5vw,3.5rem)] text-subtle">
                  {business.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {booksServices ? (
        <section
          id="services"
          className="mx-auto w-full max-w-(--container-page) px-gutter py-[clamp(1.75rem,5vw,3.25rem)]"
        >
          <div className="flex flex-wrap items-end justify-between gap-[0.75rem]">
            <div>
              <p className="eyebrow">The menu</p>
              <h2 className="display mt-[0.35rem] text-title">Services</h2>
            </div>
            <p className="max-w-[26rem] text-meta text-muted">
              Prices and durations are set by the business. Pick a service to start a
              booking.
            </p>
          </div>

          {services.isPending ? (
            <div
              className="mt-[1.2rem] grid gap-[0.9rem] sm:grid-cols-2 lg:grid-cols-3"
              aria-busy="true"
            >
              <Skeleton className="aspect-[4/5] rounded-card" />
              <Skeleton className="aspect-[4/5] rounded-card" />
              <Skeleton className="aspect-[4/5] rounded-card" />
            </div>
          ) : services.isError ? (
            <p className="mt-[1.2rem] text-meta text-muted">
              The service list didn’t load.{' '}
              <button
                type="button"
                className="link font-semibold"
                onClick={() => void services.refetch()}
              >
                Try again
              </button>
            </p>
          ) : available.length === 0 ? (
            <p className="mt-[1.2rem] text-meta text-muted">
              This business hasn’t published its service menu yet.
            </p>
          ) : (
            <ul className="mt-[1.2rem] grid list-none grid-cols-1 gap-[0.9rem] p-0 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((service) => (
                <li key={service.id}>
                  <ServiceCard
                    service={{
                      id: service.id,
                      name: service.name,
                      duration: service.durationMinutes,
                      price: service.price,
                      image: service.imageVariants?.[0]?.url,
                    }}
                    onOpen={() => startWith(service.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          {can(CAPABILITY.appointments) && available.length > 0 ? (
            <div className="mt-[1.1rem]">
              <button
                type="button"
                className="link inline-flex items-center gap-[0.3rem] text-label font-semibold"
                onClick={() => startWith()}
              >
                Book without picking a service
                <ArrowRight className="size-[0.85rem]" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section id="visit" className="border-t border-line bg-surface">
        <div className="mx-auto grid w-full max-w-(--container-page) gap-[1.5rem] px-gutter py-[clamp(1.75rem,5vw,3rem)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <p className="eyebrow">Visit</p>
            <h2 className="display mt-[0.35rem] text-title">Find us</h2>
            <p className="mt-[0.65rem] max-w-[30rem] text-meta text-muted">
              {business.description ||
                `${business.name} is listed on Punched. Call ahead and we’ll look after the rest.`}
            </p>
          </div>
          <ul className="list-none space-y-[0.55rem] p-0 text-meta">
            {business.location ? (
              <li className="flex items-start gap-[0.5rem]">
                <MapPin className="mt-[0.15rem] size-[1rem] shrink-0 text-accent" aria-hidden="true" />
                <span>{business.location}</span>
              </li>
            ) : null}
            {business.phoneNumber ? (
              <li className="flex items-start gap-[0.5rem]">
                <Phone className="mt-[0.15rem] size-[1rem] shrink-0 text-accent" aria-hidden="true" />
                <a href={`tel:${business.phoneNumber}`} className="link">
                  {business.phoneNumber}
                </a>
              </li>
            ) : null}
            {business.email ? (
              <li className="flex items-start gap-[0.5rem]">
                <Mail className="mt-[0.15rem] size-[1rem] shrink-0 text-accent" aria-hidden="true" />
                <a href={`mailto:${business.email}`} className="link">
                  {business.email}
                </a>
              </li>
            ) : null}
            {can(CAPABILITY.appointments) ? (
              <li className="flex items-start gap-[0.5rem]">
                <ArrowRight className="mt-[0.15rem] size-[1rem] shrink-0 text-accent" aria-hidden="true" />
                <a href={storefrontHref(canonicalSlug, '/book')} className="link">
                  Book online, any time
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  )
}
