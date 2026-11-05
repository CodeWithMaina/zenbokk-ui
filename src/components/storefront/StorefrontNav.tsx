import { useLocation } from '@tanstack/react-router'
import { CalendarPlus, Search, ShoppingBag, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { getInitials } from '../../lib/format'
import { useStorefront } from '../../lib/storefront'
import { resolveNavigation, sectionLabel, sectionPath } from '../../lib/storefront/sections'
import { useBookingTray } from '../../lib/storefront/use-booking-tray'
import { useStorefrontTeam } from '../../lib/storefront/use-storefront-catalog'
import { storefrontHref } from '../../lib/tenant'
import { cn } from '../../lib/cn'
import { StorefrontAccountMenu } from '../shell/StorefrontAccountMenu'
import { StorefrontThemeToggle } from './StorefrontThemeToggle'

/**
 * The storefront's own header, and its full-screen phone menu.
 *
 * Every entry is a real route, not an anchor: services, the team, about and
 * contact are pages, so the navigation is the site map and each destination is
 * linkable, shareable and reachable with the browser's back button. What appears
 * is still the owner's configuration — filtered by the capabilities the business
 * actually has — plus the roster, which is only offered when the business
 * actually publishes one.
 *
 * The lineup badge reads the shared booking draft rather than its own state, so
 * it agrees with the wizard and the tray at all times.
 */
export function StorefrontNav() {
  const { business, canonicalSlug, landingPage, can, businessId, storefront } = useStorefront()
  const pathname = useLocation({ select: (location) => location.pathname })
  const { count } = useBookingTray(businessId)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuId = useId()

  const homeHref = storefrontHref(canonicalSlug)

  // Only the home page has a hero for the header to float over. Every other
  // address is a page with its own header, so the bar stays opaque there.
  const isHome = pathname === homeHref || pathname === `${homeHref}/`

  // The roster decides whether "Team" is a real destination. One cached request,
  // shared with the team page and the booking wizard.
  const team = useStorefrontTeam(businessId)
  const hasTeam = (team.data ?? []).length > 0

  const bookHref = storefrontHref(canonicalSlug, '/book')
  const searchHref = storefrontHref(canonicalSlug, '/search')

  const canBook = can('appointments') && landingPage.navigation.booking

  const configured = resolveNavigation(landingPage, can).filter((key) => key !== 'booking')
  const links: { key: string; href: string; label: string }[] = [
    { key: 'home', href: homeHref, label: 'Home' },
    ...configured.flatMap((key) => {
      const path = sectionPath(key)
      if (!path) return []
      return [{ key, href: storefrontHref(canonicalSlug, path), label: sectionLabel(key) }]
    }),
  ]

  // The roster is a page but not a configured section, so it is spliced in
  // straight after Services — where a visitor asking "who does this?" looks.
  if (hasTeam) {
    const servicesIndex = links.findIndex((link) => link.key === 'services')
    links.splice(servicesIndex >= 0 ? servicesIndex + 1 : 1, 0, {
      key: 'team',
      href: storefrontHref(canonicalSlug, '/team'),
      label: 'Team',
    })
  }

  /**
   * Lock the page behind the menu, and let Escape close it.
   *
   * The menu is closed by the links themselves rather than by watching the
   * address: an anchor navigation on the same page does not always change the
   * path, so an effect on `pathname` would leave the menu open over the section
   * the visitor just asked for.
   */
  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const overlay = isHome && !scrolled && !menuOpen

  // The header is the owner's configuration when the builder has published one:
  // its variant, transparency, stickiness, brand visibility and CTA all come from
  // there. A business still on the legacy page keeps the platform header.
  const header = storefront?.header ?? null
  const headerVariant = header?.variant ?? 'minimal'
  const showBrandName = header?.showBusinessName ?? true
  const ctaEnabled = header?.ctaEnabled ?? true
  const ctaLabel = header?.ctaLabel ?? landingPage.primaryCta.label ?? 'Book an appointment'

  return (
    <>
      <header
        className={cn('sf-header', `is-${headerVariant}`, overlay ? 'is-overlay' : 'is-solid')}
        data-sf-header={headerVariant}
        style={header ? { background: overlay && header.transparent ? 'transparent' : header.background, color: header.textColor } : undefined}
      >
        <div className="sf-container">
          <div className="sf-header-inner">
            <a href={homeHref} className="sf-brand" aria-label={`${business.name} home`}>
              <span className="sf-brand-mark">
                {business.logoUrl ? (
                  <img src={business.logoUrl} alt="" className="size-full object-cover" />
                ) : (
                  getInitials(business.name).slice(0, 1)
                )}
              </span>
              {showBrandName ? (
                <span className="sf-brand-name">
                  {business.name}
                  {business.category ? <small>{business.category}</small> : null}
                </span>
              ) : null}
            </a>

            <nav className="sf-nav" aria-label="Storefront">
              {links.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  className="sf-nav-link"
                  aria-current={
                    link.href === pathname || (link.key === 'home' && isHome)
                      ? 'page'
                      : undefined
                  }
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="sf-header-actions">
              <a href={searchHref} className="sf-icon-btn" aria-label="Search services and team">
                <Search className="size-[1.05rem]" aria-hidden="true" />
              </a>

              <a
                href={bookHref}
                className="sf-icon-btn"
                aria-label={
                  count > 0
                    ? `Your lineup, ${count} service${count === 1 ? '' : 's'} selected`
                    : 'Your lineup'
                }
              >
                <ShoppingBag className="size-[1.05rem]" aria-hidden="true" />
                <span className={cn('sf-count', count > 0 && 'is-on')} aria-hidden="true">
                  {count}
                </span>
              </a>

              <StorefrontThemeToggle />
              <StorefrontAccountMenu />

              {canBook && ctaEnabled ? (
                <a href={bookHref} className="btn btn-primary sf-header-book no-underline">
                  <CalendarPlus className="size-[0.95rem]" aria-hidden="true" />
                  {ctaLabel}
                </a>
              ) : null}

              <button
                type="button"
                className="sf-icon-btn sf-burger"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? (
                  <X className="size-[1.1rem]" aria-hidden="true" />
                ) : (
                  <>
                    <span />
                    <span />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div id={menuId} className={cn('sf-menu', menuOpen && 'is-open')}>
        {links.map((link) => (
          <a
            key={link.key}
            href={link.href}
            className="sf-menu-link"
            aria-current={link.href === pathname ? 'page' : undefined}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <a href={searchHref} className="sf-menu-link" onClick={() => setMenuOpen(false)}>
          Search
        </a>

        <div className="sf-menu-foot">
          {canBook ? (
            <a
              href={bookHref}
              className="btn btn-primary btn-xl w-full no-underline"
              onClick={() => setMenuOpen(false)}
            >
              <CalendarPlus className="size-[1rem]" aria-hidden="true" />
              {landingPage.primaryCta.label || ctaLabel}
            </a>
          ) : null}
          <p className="mt-[1rem]">
            {business.location}
            {business.phoneNumber ? (
              <>
                <br />
                <a href={`tel:${business.phoneNumber}`} className="link">
                  {business.phoneNumber}
                </a>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </>
  )
}
