import type { CapabilityKey } from '../entitlements'
import { CAPABILITY } from '../entitlements'
import type { PublicLandingPage } from '../api/types'

/**
 * The storefront section vocabulary.
 *
 * Mirrors `LandingPageDefaults.SectionKeys` and
 * `LandingPageService.CapabilityAllows` on the server, so the two can be read
 * side by side. Keeping the vocabulary here rather than inline in a component is
 * what lets the owner's configuration drive the page instead of the page
 * hardcoding its own sections.
 */
export type SectionKey =
  | 'services'
  | 'loyalty'
  | 'booking'
  | 'reviews'
  | 'gallery'
  | 'about'
  | 'contact'
  | 'businessinfo'

const SECTION_KEYS: readonly SectionKey[] = [
  'services',
  'loyalty',
  'booking',
  'reviews',
  'gallery',
  'about',
  'contact',
  'businessinfo',
]

/** The customer capability that gates each section (`null` = always allowed). */
const SECTION_CAPABILITY: Record<SectionKey, CapabilityKey | null> = {
  services: CAPABILITY.services,
  loyalty: CAPABILITY.loyalty,
  booking: CAPABILITY.appointments,
  reviews: CAPABILITY.galleryReviews,
  gallery: CAPABILITY.gallery,
  about: null,
  contact: null,
  businessinfo: null,
}

/**
 * Sections this client can render.
 *
 * `businessinfo` and `loyalty` are deliberately absent:
 *
 *  - `businessinfo`: the storefront surfaces the same facts through its own
 *    About and Contact pages, so a separate "details" section would be a second
 *    presentation of the same data;
 *  - `loyalty`: switched off for the storefront by product decision. The
 *    business still runs its programme and the dashboard still manages it — the
 *    customer-facing page simply does not offer it, and `resolveNavigation`
 *    therefore never shows a link to it.
 *
 * `gallery` IS renderable now: the public gallery endpoint resolves the
 * business's ordered media into ready variants, so the page can be drawn from
 * one request instead of one per image.
 *
 * They are absent from the renderable set rather than deleted from the
 * vocabulary, so the server's section keys and this client's stay readable side
 * by side.
 */
const RENDERABLE: ReadonlySet<SectionKey> = new Set<SectionKey>([
  'services',
  'booking',
  'reviews',
  'gallery',
  'about',
  'contact',
])

export function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value.toLowerCase())
}

export function isRenderableSection(key: SectionKey): boolean {
  return RENDERABLE.has(key)
}

/**
 * Navigation entries the visitor should see: enabled in the owner's navigation
 * config, entitled, and backed by a page this client can render.
 */
export function resolveNavigation(
  landingPage: PublicLandingPage,
  can: (key: CapabilityKey) => boolean,
): SectionKey[] {
  return SECTION_KEYS.filter((key) => {
    if (!landingPage.navigation[key]) return false
    if (!isRenderableSection(key)) return false
    const capability = SECTION_CAPABILITY[key]
    return capability ? can(capability) : true
  })
}

/** Human label for a section, falling back to a sensible default. */
export function sectionLabel(key: SectionKey): string {
  switch (key) {
    case 'services':
      return 'Services'
    case 'loyalty':
      return 'Loyalty'
    case 'booking':
      return 'Book'
    case 'reviews':
      return 'Reviews'
    case 'gallery':
      return 'Gallery'
    case 'about':
      return 'About'
    case 'contact':
      return 'Contact'
    case 'businessinfo':
      return 'Details'
  }
}

/**
 * The page a configured section lives at.
 *
 * Sections are pages, not anchors: the owner still decides what appears in the
 * navigation and in what order, but each entry resolves to its own route rather
 * than scrolling to a block on the home page — which is now the hero alone.
 *
 * `businessinfo` and `loyalty` return null because this client does not render
 * them at all (see `RENDERABLE` above), so there is no page to point at.
 * Returning null is what keeps a configured-but-unavailable section out of the
 * navigation instead of linking to a 404.
 */
export function sectionPath(key: SectionKey): string | null {
  switch (key) {
    case 'services':
      return '/services'
    case 'booking':
      return '/book'
    case 'reviews':
      return '/reviews'
    case 'gallery':
      return '/gallery'
    case 'about':
      return '/about'
    case 'contact':
      return '/contact'
    case 'loyalty':
    case 'businessinfo':
      return null
  }
}

/** The owner's title/description overrides for one section, if it is configured. */
export function sectionContent(
  landingPage: PublicLandingPage,
  key: SectionKey,
): { title: string | null; description: string | null } {
  const section = landingPage.sections.find(
    (entry) => entry.key.toLowerCase() === key,
  )
  return { title: section?.title ?? null, description: section?.description ?? null }
}
