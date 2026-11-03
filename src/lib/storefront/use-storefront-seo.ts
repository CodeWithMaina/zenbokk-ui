import { useEffect } from 'react'
import type { ImageVariant } from '../api/types'
import { tenantUrl, resolveSurface } from '../tenant'
import { useStorefront } from './use-storefront'
import { useStorefrontOpeningHours } from './use-storefront-public'

/**
 * Tenant-specific document metadata for a storefront page.
 *
 * The app is a Vite + React SPA with no server rendering, so there is no
 * per-request `<head>` to fill in. Instead this hook writes the tags the crawler
 * or a social scraper reads once the storefront has resolved its tenant — which
 * is also the earliest moment the data is trustworthy. Before that, the static
 * `index.html` title/description apply and no tenant metadata is emitted, so an
 * unresolved or suspended address is never indexed as a business.
 *
 * Everything comes from data the backend already returned: the business profile,
 * the landing page and (when loaded) the opening hours. Nothing is fabricated —
 * no invented ratings, prices or hours — and a business with no description
 * simply gets a title and a canonical URL.
 */

/** Marks every tag this hook owns, so a re-run replaces rather than duplicates. */
const MARKER = 'data-storefront-seo'

function upsertMeta(kind: 'name' | 'property', key: string, content: string | null) {
  const selector = `meta[${kind}="${key}"][${MARKER}]`
  const existing = document.head.querySelector<HTMLMetaElement>(selector)

  if (!content) {
    existing?.remove()
    return
  }

  const tag = existing ?? document.createElement('meta')
  tag.setAttribute(kind, key)
  tag.setAttribute(MARKER, 'true')
  tag.setAttribute('content', content)
  if (!existing) document.head.appendChild(tag)
}

function upsertLink(rel: string, href: string | null) {
  const selector = `link[rel="${rel}"][${MARKER}]`
  const existing = document.head.querySelector<HTMLLinkElement>(selector)

  if (!href) {
    existing?.remove()
    return
  }

  const tag = existing ?? document.createElement('link')
  tag.setAttribute('rel', rel)
  tag.setAttribute(MARKER, 'true')
  tag.setAttribute('href', href)
  if (!existing) document.head.appendChild(tag)
}

/** The widest variant a social scraper can use, or null when there is no image. */
function largestImage(variants: ImageVariant[] | null | undefined): string | null {
  if (!variants || variants.length === 0) return null
  return [...variants].sort((a, b) => b.width - a.width)[0]?.url ?? null
}

export function useStorefrontSeo(pathname: string) {
  const { businessId, business, landingPage, canonicalSlug, slug } = useStorefront()
  const hours = useStorefrontOpeningHours(businessId)

  useEffect(() => {
    const title = `${landingPage.heroTitle} · ${business.name}`
    const description =
      landingPage.heroDescription ??
      landingPage.heroTagline ??
      business.description ??
      null
    // The canonical is the tenant host, so the path-based fallback
    // (`/nuru-studio/about`) must lose its slug segment first.
    const surface = resolveSurface()
    const relativePath =
      surface.kind === 'tenant'
        ? pathname
        : pathname === `/${slug}` || pathname === `/${slug}/`
          ? '/'
          : pathname.startsWith(`/${slug}/`)
            ? pathname.slice(slug.length + 1)
            : pathname
    const canonical = tenantUrl(canonicalSlug, relativePath)
    const image = largestImage(landingPage.heroBackgroundVariants) ?? largestImage(business.logoVariants)

    document.title = title

    upsertMeta('name', 'description', description)
    // A resolved, active business is indexable; its canonical is the tenant host.
    upsertMeta('name', 'robots', 'index,follow')
    upsertLink('canonical', canonical)

    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:site_name', business.name)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:image', image)

    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)

    // Structured data: only what the backend actually returned.
    const structuredData: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: business.name,
      url: canonical,
    }
    if (description) structuredData.description = description
    if (business.category) structuredData.knowsAbout = business.category
    if (business.phoneNumber) structuredData.telephone = business.phoneNumber
    if (business.email) structuredData.email = business.email
    if (business.location) {
      structuredData.address = { '@type': 'PostalAddress', addressLocality: business.location }
    }
    if (image) structuredData.image = image

    const specification = (hours.data?.days ?? [])
      .filter((day) => !day.isClosed && day.periods.length > 0)
      .map((day) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: day.day.charAt(0).toUpperCase() + day.day.slice(1),
        opens: day.periods[0].opensAt,
        closes: day.periods[day.periods.length - 1].closesAt,
      }))
    if (specification.length > 0) structuredData.openingHoursSpecification = specification

    let script = document.head.querySelector<HTMLScriptElement>(`script[${MARKER}]`)
    if (!script) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute(MARKER, 'true')
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(structuredData)
  }, [business, canonicalSlug, hours.data, landingPage, pathname, slug])
}
