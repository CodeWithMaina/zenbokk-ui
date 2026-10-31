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
 * `gallery` and `businessinfo` are deliberately absent. The public bootstrap
 * exposes `business.galleryMediaIds` without URLs, and there is no bulk public
 * media endpoint, so a gallery cannot be drawn without one request per image.
 * They are reported as unsupported rather than rendered empty.
 */
const RENDERABLE: ReadonlySet<SectionKey> = new Set<SectionKey>([
  'services',
  'loyalty',
  'booking',
  'reviews',
  'about',
  'contact',
])

export function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value.toLowerCase())
}

export function isRenderableSection(key: SectionKey): boolean {
  return RENDERABLE.has(key)
}

/** Section keys the client could not render even though the business enabled them. */
export function unsupportedSections(landingPage: PublicLandingPage): SectionKey[] {
  return landingPage.sections
    .map((section) => section.key.toLowerCase())
    .filter((key): key is SectionKey => isSectionKey(key))
    .filter((key) => !isRenderableSection(key))
}

export type ResolvedSection = {
  key: SectionKey
  title: string | null
  description: string | null
}

/**
 * The sections to draw, in the order the owner configured, with the entitlement
 * gate applied.
 *
 * The by-slug bootstrap filters sections by `enabled` only — unlike the
 * dedicated public landing-page endpoint — so the capability check has to happen
 * here. Without it, a section whose module the business is not entitled to would
 * render and then fail its own request with a 403.
 */
export function resolveSections(
  landingPage: PublicLandingPage,
  can: (key: CapabilityKey) => boolean,
): ResolvedSection[] {
  return [...landingPage.sections]
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key))
    .reduce<ResolvedSection[]>((resolved, section) => {
      const key = section.key.toLowerCase()
      if (!isSectionKey(key) || !isRenderableSection(key)) return resolved

      const capability = SECTION_CAPABILITY[key]
      if (capability && !can(capability)) return resolved

      resolved.push({ key, title: section.title, description: section.description })
      return resolved
    }, [])
}

/**
 * Navigation entries the visitor should see: enabled in the owner's navigation
 * config, entitled, and backed by a section this client can render.
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
