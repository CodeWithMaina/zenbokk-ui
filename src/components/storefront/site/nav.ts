import type { StorefrontConfig, StorefrontNavItem, StorefrontPage } from '../../../lib/api/types'

/**
 * Resolves the header's navigation.
 *
 * When the owner has configured an explicit `header.nav` it is used verbatim
 * (disabled entries dropped, children resolved one level deep); otherwise the
 * menu follows the pages flagged `showInNav`, in their configured order. An
 * internal destination resolves to that page's real storefront route; an external
 * one is only honoured for `http(s)`, `mailto:` and `tel:` URLs, so a stored
 * `javascript:` value can never become a live link.
 */

export type NavLink = {
  label: string
  href: string
  active: boolean
  children: NavLink[]
}

/** Only navigable schemes pass; anything else stays inert. */
export function safeExternalUrl(url: string): string {
  const trimmed = (url ?? '').trim()
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
    return trimmed
  }
  return '#'
}

type ToHref = (page: StorefrontPage) => string
type IsActive = (href: string) => boolean

function fromCustomItem(
  item: StorefrontNavItem,
  pages: StorefrontPage[],
  toHref: ToHref,
  isActive: IsActive,
): NavLink {
  const children = (item.children ?? [])
    .filter((child) => child.enabled !== false && child.label)
    .map((child) => fromCustomItem(child, pages, toHref, isActive))

  let href = '#'
  if (item.destination === 'external') {
    href = safeExternalUrl(item.url)
  } else {
    const page = pages.find((candidate) => candidate.id === item.destination || candidate.slug === item.destination)
    if (page) href = toHref(page)
  }

  return { label: item.label, href, active: isActive(href), children }
}

export function resolveNavigation(
  config: StorefrontConfig,
  toHref: ToHref,
  isActive: IsActive,
): NavLink[] {
  const pages = config.pages ?? []
  const custom = (config.header?.nav ?? []).filter((item) => item.enabled !== false && item.label)
  if (custom.length > 0) {
    return custom.map((item) => fromCustomItem(item, pages, toHref, isActive))
  }
  return pages
    .filter((page) => page.showInNav)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((page) => ({ label: page.title, href: toHref(page), active: isActive(toHref(page)), children: [] }))
}

/** The page a draft's `hero`/`sections` should come from, or null for the home pair. */
export function pageForKind(config: StorefrontConfig, kind: string): StorefrontPage | null {
  const pages = config.pages ?? []
  const match = pages.find((page) => page.kind === kind)
  return match ?? null
}
