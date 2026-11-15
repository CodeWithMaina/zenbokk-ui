import { useMemo } from 'react'
import { usePublicPaymentDetails } from '../../../lib/payments/api'
import { useStorefront } from '../../../lib/storefront'
import { serviceCategories } from '../../../lib/storefront/search'
import { useStorefrontServices } from '../../../lib/storefront/use-storefront-catalog'
import { storefrontHref } from '../../../lib/tenant'
import { AboutCard, AboutCardSkeleton } from '../about/AboutCard'
import { AboutIdentity } from '../about/AboutIdentity'
import { AboutRules } from '../about/AboutRules'
import { parseBusinessRules } from '../about/parseBusinessRules'

/**
 * About the business — the compact editorial page.
 *
 * Everything on it is the business's own: the tagline is the title, the
 * description the body, the catalogue the service tags, the section copy the
 * rules, and the location the pill. Nothing is written on its behalf, and it
 * carries no contact details (phone, email, address, opening hours) — those
 * belong to the contact page.
 *
 * The rules come from the `about` / `booking` section sentences while the body
 * comes from `business.description`, so the two cannot duplicate; any sentence
 * that a rule was read from is still stripped from the body defensively.
 */

/**
 * Service tags for the card.
 *
 * Prefer the catalogue's real categories; fall back to its service names. Only
 * when the catalogue is empty is a legacy description like "Styling, braiding,
 * treatments" split on commas.
 *
 * TODO: drop the description split once the services API is always populated.
 */
function serviceTags(
  services: { categoryName: string | null; name: string }[],
  description: string | null,
): string[] {
  const categories = serviceCategories(services.map((service) => service.categoryName))
  if (categories.length > 0) return categories.slice(0, 6)

  const names = serviceCategories(services.map((service) => service.name))
  if (names.length > 0) return names.slice(0, 6)

  return (description ?? '')
    .split(/[,;\u00b7|]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part.split(/\s+/).length <= 4)
    .slice(0, 6)
}

export function AboutPage() {
  const { business, businessId, landingPage, can, canonicalSlug } = useStorefront()

  const services = useStorefrontServices(businessId, can('services'))
  // The business's public currency lives on its payment details; used only to
  // decide whether the price note is worded "Prices in KES".
  const paymentDetails = usePublicPaymentDetails(businessId)

  const name = business.name.trim()
  const title = (landingPage.heroTagline || '').trim() || name
  const location = (business.location || '').trim() || null

  const rules = useMemo(() => parseBusinessRules(landingPage.sections), [landingPage.sections])

  const description = useMemo(() => {
    const raw = (business.description || '').trim()
    if (!raw) return null
    if (rules.length === 0) return raw
    const read = new Set(rules.map((rule) => rule.body))
    const kept = raw
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0 && !read.has(sentence))
    return kept.join(' ') || null
  }, [business.description, rules])

  const servicesSection = landingPage.sections.find(
    (section) => section.key.toLowerCase() === 'services',
  )
  const tags = useMemo(
    () => serviceTags(services.services, servicesSection?.description ?? null),
    [services.services, servicesSection?.description],
  )

  const currency = paymentDetails.data?.currency ?? null
  const note = currency === 'KES' ? `Prices in ${currency}` : null

  const bookingEnabled = can('appointments') && landingPage.navigation.booking === true
  const ctaLabel = landingPage.primaryCta.enabled
    ? landingPage.primaryCta.label.trim() || null
    : null
  const ctaHref = bookingEnabled ? storefrontHref(canonicalSlug, '/book') : null

  return (
    <div className="ab-page">
      <div className="ab">
        <AboutIdentity location={location} />
        {services.isLoading ? (
          <AboutCardSkeleton />
        ) : (
          <AboutCard
            title={title}
            description={description}
            tags={tags}
            note={note}
            ctaLabel={ctaLabel}
            ctaHref={ctaHref}
          />
        )}
        <AboutRules rules={rules} />
      </div>
    </div>
  )
}
