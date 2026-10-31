import { useRouter } from '@tanstack/react-router'
import { Alert } from '../ui/alert'
import { emptyDraft, useStorefront, writeBookingDraft } from '../../lib/storefront'
import { resolveSections, unsupportedSections } from '../../lib/storefront/sections'
import { storefrontHref } from '../../lib/tenant'
import { StorefrontHero } from './StorefrontHero'
import { AboutSection, ContactSection } from './sections/AboutContactSections'
import { BookingSection } from './sections/BookingSection'
import { LoyaltySection } from './sections/LoyaltySection'
import { ReviewsSection } from './sections/ReviewsSection'
import { ServicesSection } from './sections/ServicesSection'

/**
 * A business's storefront home.
 *
 * The page is not a fixed layout: the hero comes from the owner's landing-page
 * configuration and everything below it is the configured section list, in the
 * owner's order, filtered by the capabilities the business actually has. Adding
 * a section to the configuration is therefore a change in the dashboard, not in
 * this file — which is the whole point of the multi-business storefront.
 */
export function StorefrontHome() {
  const { businessId, canonicalSlug, landingPage, can } = useStorefront()
  const router = useRouter()

  const sections = resolveSections(landingPage, can)
  const unsupported = unsupportedSections(landingPage)

  function startBooking(serviceId?: string) {
    writeBookingDraft(businessId, {
      ...emptyDraft,
      serviceIds: serviceId ? [serviceId] : [],
      step: 'services',
    })
    void router.history.push(storefrontHref(canonicalSlug, '/book'))
  }

  return (
    <div>
      <StorefrontHero />

      {sections.map((section) => {
        switch (section.key) {
          case 'services':
            return (
              <ServicesSection
                key={section.key}
                title={section.title}
                description={section.description}
                onBook={startBooking}
              />
            )
          case 'loyalty':
            return (
              <LoyaltySection
                key={section.key}
                title={section.title}
                description={section.description}
              />
            )
          case 'booking':
            return (
              <BookingSection
                key={section.key}
                title={section.title}
                description={section.description}
              />
            )
          case 'reviews':
            return (
              <ReviewsSection
                key={section.key}
                title={section.title}
                description={section.description}
              />
            )
          case 'about':
            return (
              <AboutSection
                key={section.key}
                title={section.title}
                description={section.description}
              />
            )
          case 'contact':
            return (
              <ContactSection
                key={section.key}
                title={section.title}
                description={section.description}
              />
            )
          default:
            return null
        }
      })}

      {sections.length === 0 ? (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-(--container-page) px-gutter py-[clamp(1.75rem,5vw,3rem)]">
            <Alert tone="info">
              This business has not published any sections on its page yet. Contact them directly,
              or check back soon.
            </Alert>
          </div>
        </section>
      ) : null}

      {unsupported.length > 0 ? (
        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-(--container-page) px-gutter py-[1.2rem]">
            <Alert tone="neutral">
              This business has enabled {unsupported.join(', ')} on its page. That part of the
              storefront is not available in this build yet.
            </Alert>
          </div>
        </section>
      ) : null}
    </div>
  )
}
