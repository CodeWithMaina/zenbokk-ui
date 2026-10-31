import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarPlus, Mail, MapPin, Phone } from 'lucide-react'
import { queryKeys } from '../../lib/api/query-client'
import { storefrontApi, useStorefront } from '../../lib/storefront'
import { storefrontHref } from '../../lib/tenant'
import { cn } from '../../lib/cn'

/**
 * The storefront hero.
 *
 * Every string comes from the owner's landing-page configuration (resolved
 * server-side, so `heroTitle` already falls back to the business name).
 *
 * The background needs one extra request in one specific case. The by-slug
 * bootstrap carries `heroBackgroundMediaId` but returns an empty
 * `heroBackgroundVariants` list — it does not resolve the media into URLs, while
 * `GET /v1/businesses/public/{id}/landing-page` does. So the second request is
 * made only when the owner has actually configured a hero image and the
 * bootstrap could not describe it; a business without one never pays for it, and
 * a failure (the storefront module is off) falls back to the canvas treatment
 * instead of a broken frame.
 */
export function StorefrontHero() {
  const { business, businessId, landingPage, canonicalSlug, can } = useStorefront()

  const bootstrapImage = landingPage.heroBackgroundVariants?.[0]?.url ?? null
  const needsResolvedHero = !bootstrapImage && Boolean(landingPage.heroBackgroundMediaId)

  const resolved = useQuery({
    queryKey: [...queryKeys.storefront(businessId), 'landing-page'] as const,
    queryFn: () => storefrontApi.landingPage(businessId),
    enabled: needsResolvedHero,
    retry: false,
  })

  const heroImage = bootstrapImage ?? resolved.data?.heroBackgroundVariants?.[0]?.url ?? null
  const canBook = can('appointments')
  const showsServices = can('services')
  const bookHref = storefrontHref(canonicalSlug, '/book')

  return (
    <section className="bg-surface">
      <div className="mx-auto grid w-full max-w-(--container-page) items-center gap-[clamp(1.5rem,4vw,3rem)] px-gutter py-[clamp(2rem,6vw,4rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div>
          {landingPage.showLogo && business.logoUrl ? (
            <img
              src={business.logoUrl}
              alt=""
              className="mb-[0.9rem] size-[3.4rem] rounded-md border border-line object-cover"
            />
          ) : null}

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
            {canBook && landingPage.primaryCta.enabled ? (
              <a href={bookHref} className="btn btn-primary btn-xl no-underline">
                <CalendarPlus className="size-[1rem]" aria-hidden="true" />
                {landingPage.primaryCta.label || 'Book an appointment'}
              </a>
            ) : null}

            {landingPage.secondaryCta.enabled ? (
              <a
                href={secondaryHref(landingPage.secondaryCta.type, canonicalSlug)}
                className="btn btn-ghost btn-xl no-underline"
              >
                {landingPage.secondaryCta.label || 'Find out more'}
                <ArrowRight className="size-[0.9rem]" aria-hidden="true" />
              </a>
            ) : showsServices ? (
              <a href="#services" className="btn btn-ghost btn-xl no-underline">
                See services
              </a>
            ) : null}
          </div>

          <ul className="mt-[1.4rem] list-none space-y-[0.4rem] p-0 text-meta text-muted">
            {business.location ? (
              <li className="flex items-start gap-[0.45rem]">
                <MapPin className="mt-[0.15rem] size-[0.95rem] shrink-0 text-accent" aria-hidden="true" />
                {business.location}
              </li>
            ) : null}
            {business.phoneNumber ? (
              <li className="flex items-start gap-[0.45rem]">
                <Phone className="mt-[0.15rem] size-[0.95rem] shrink-0 text-accent" aria-hidden="true" />
                <a href={`tel:${business.phoneNumber}`} className="link">
                  {business.phoneNumber}
                </a>
              </li>
            ) : null}
            {business.email ? (
              <li className="flex items-start gap-[0.45rem]">
                <Mail className="mt-[0.15rem] size-[0.95rem] shrink-0 text-accent" aria-hidden="true" />
                <a href={`mailto:${business.email}`} className="link">
                  {business.email}
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div
          className={cn(
            'relative aspect-[4/3] overflow-hidden rounded-panel border border-line bg-sunken',
          )}
        >
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
              <span className="display text-[clamp(2rem,7vw,3.5rem)] text-subtle">
                {business.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Where a configured CTA points.
 *
 * The CTA's `type` is presentation, so an unrecognised type falls back to the
 * business's own page rather than being treated as a URL.
 */
function secondaryHref(type: string, slug: string): string {
  switch (type) {
    case 'book':
      return storefrontHref(slug, '/book')
    case 'loyalty':
      return '#loyalty'
    case 'contact':
      return '#contact'
    case 'reviews':
      return '#reviews'
    case 'services':
      return '#services'
    default:
      return '#about'
  }
}
