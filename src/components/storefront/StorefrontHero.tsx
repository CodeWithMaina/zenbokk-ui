import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarPlus, Phone } from 'lucide-react'
import { queryKeys } from '../../lib/api/query-client'
import { pickVariant } from '../../lib/media'
import { storefrontApi, useStorefront } from '../../lib/storefront'
import { heroFacts, heroHeadline } from '../../lib/storefront/hero'
import { storefrontHref } from '../../lib/tenant'
import { ResponsiveImage } from '../ui/responsive-image'
import { StorefrontHeroCanvas } from './StorefrontHeroCanvas'

/**
 * The storefront hero.
 *
 * Full-bleed, premium and image-backed: the background is the *business's own*
 * uploaded storefront image, never an asset shipped with the storefront. When no
 * image has been uploaded the hero paints the token-driven canvas instead, so a
 * brand-new business still has a finished front page.
 *
 * The background needs one extra request in one specific case. The by-slug
 * bootstrap carries `heroBackgroundMediaId` but returns an empty
 * `heroBackgroundVariants` list — it does not resolve the media into URLs, while
 * `GET /v1/businesses/public/{id}/landing-page` does. So the second request is
 * made only when the owner has actually configured a hero image and the bootstrap
 * could not describe it; a business without one never pays for it, and a failure
 * (the storefront module is off) falls back to the canvas rather than a broken
 * frame.
 *
 * Every string comes from the owner's landing-page configuration (resolved
 * server-side, so `heroTitle` already falls back to the business name).
 */
export function StorefrontHero() {
  const { business, businessId, landingPage, canonicalSlug, can } = useStorefront()

  const bootstrapVariants = landingPage.heroBackgroundVariants ?? []
  const needsResolvedHero =
    bootstrapVariants.length === 0 && Boolean(landingPage.heroBackgroundMediaId)

  const resolved = useQuery({
    queryKey: [...queryKeys.storefront(businessId), 'landing-page'] as const,
    queryFn: () => storefrontApi.landingPage(businessId),
    enabled: needsResolvedHero,
    retry: false,
  })

  // The hero is the largest image on the page, so it renders from the full
  // variant set (widest WebP, JPEG fallback) rather than one hard-picked URL.
  const heroVariants =
    bootstrapVariants.length > 0 ? bootstrapVariants : (resolved.data?.heroBackgroundVariants ?? [])
  const heroImage = pickVariant(heroVariants)

  const canBook = can('appointments')
  const showsServices = can('services')
  const bookHref = storefrontHref(canonicalSlug, '/book')
  const servicesHref = storefrontHref(canonicalSlug, '/services')

  const headline = heroHeadline(landingPage.heroTitle || business.name)
  const facts = heroFacts([
    business.location,
    business.category,
    canBook ? 'Book online in under a minute' : null,
    business.phoneNumber,
  ])

  return (
    <section className="sf-hero min-h-svh">
      {heroImage ? (
        <ResponsiveImage
          variants={heroVariants}
          src={heroImage.url}
          alt=""
          sizes="100vw"
          loading="eager"
          fetchPriority="high"
          className="sf-hero-media"
        />
      ) : (
        <StorefrontHeroCanvas />
      )}
      <div className="sf-hero-scrim" aria-hidden="true" />

      <div className="sf-container sf-hero-body">
        {landingPage.showLogo && business.logoUrl ? (
          <img
            src={business.logoUrl}
            alt=""
            className="mb-[1.2rem] size-[3.6rem] rounded-round border border-[var(--premium-line)] object-cover"
          />
        ) : null}

        <p className="sf-hero-kicker">{business.category || 'Welcome'}</p>

        <h1 className="sf-hero-title">
          {headline.lead}
          {headline.emphasis ? (
            <>
              {' '}
              <em>{headline.emphasis}</em>
            </>
          ) : null}
        </h1>

        {landingPage.heroTagline ? (
          <p className="sf-hero-lead">{landingPage.heroTagline}</p>
        ) : landingPage.heroDescription ? (
          <p className="sf-hero-lead">{landingPage.heroDescription}</p>
        ) : null}

        <div className="sf-hero-actions">
          {canBook && landingPage.primaryCta.enabled ? (
            <a href={bookHref} className="sf-hero-btn">
              <CalendarPlus className="size-[1.05rem]" aria-hidden="true" />
              {landingPage.primaryCta.label || 'Book an appointment'}
            </a>
          ) : null}

          {showsServices ? (
            <a href={servicesHref} className="sf-hero-btn is-outline">
              Explore services
              <ArrowRight className="size-[1.05rem]" aria-hidden="true" />
            </a>
          ) : null}

          {!canBook && business.phoneNumber ? (
            <a href={`tel:${business.phoneNumber}`} className="sf-hero-btn">
              <Phone className="size-[1.05rem]" aria-hidden="true" />
              Call {business.phoneNumber}
            </a>
          ) : null}
        </div>
      </div>

      {facts.length > 0 ? (
        <div className="sf-hero-facts">
          <div className="sf-container">
            <ul>
              {facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  )
}
