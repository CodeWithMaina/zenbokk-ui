import type { ReactNode } from 'react'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useStorefront } from '../../lib/storefront'
import { resolveNavigation, sectionLabel, sectionPath } from '../../lib/storefront/sections'
import { useStorefrontOpeningHours } from '../../lib/storefront/use-storefront-public'
import { storefrontHref } from '../../lib/tenant'

/**
 * The storefront footer, driven by the owner's footer configuration.
 *
 * Business facts (name, address, phone, email, hours) come from the business
 * profile and the opening-hours endpoint — never duplicated into the config, so
 * they can never drift from the rest of the product. The owner controls the
 * layout variant, which blocks appear, the socials, the legal links and the
 * colours. Falls back to the platform footer when the business has no builder
 * configuration yet.
 */

type NavItem = { key: string; href: string; label: string }

function useFooterNav(): NavItem[] {
  const { canonicalSlug, landingPage, storefront, can } = useStorefront()

  if (storefront) {
    return [...storefront.pages]
      .filter((page) => page.showInNav && page.kind !== 'home')
      .sort((a, b) => a.order - b.order)
      .map((page) => ({
        key: page.id,
        href: storefrontHref(canonicalSlug, page.slug ? `/${page.slug}` : ''),
        label: page.title,
      }))
  }

  return resolveNavigation(landingPage, can).flatMap((key) => {
    const path = sectionPath(key)
    if (!path) return []
    return [{ key, href: storefrontHref(canonicalSlug, path), label: sectionLabel(key) }]
  })
}

function SocialRow() {
  const { storefront } = useStorefront()
  const socials = storefront?.footer.socials ?? []
  if (socials.length === 0) return null
  return (
    <ul className="sf-footer-list is-inline">
      {socials.map((social) => (
        <li key={`${social.platform}-${social.url}`}>
          <a href={social.url} rel="noreferrer noopener" target="_blank" className="link">
            {social.platform || social.url}
          </a>
        </li>
      ))}
    </ul>
  )
}

export function StorefrontFooter() {
  const { business, storefront } = useStorefront()
  const hours = useStorefrontOpeningHours(business.id)
  const nav = useFooterNav()

  const config = storefront?.footer ?? null
  const variant = config?.variant ?? 'columns'
  const showContact = config?.showContact ?? true
  const showAddress = config?.showAddress ?? true
  const showHours = config?.showHours ?? true
  const showNav = config?.showNav ?? true
  const showSocial = config?.showSocial ?? true
  const showLegal = config?.showLegal ?? true
  const copyright =
    config?.copyright ?? `© ${new Date().getFullYear()} ${business.name}. All rights reserved.`

  const style = config
    ? ({ background: config.backgroundColor, color: config.textColor } as const)
    : undefined

  const openToday = hours.data?.days.find((day) => !day.isClosed && day.periods.length > 0)

  const contact = (
    <ul className="sf-footer-list">
      {showAddress && business.location ? (
        <li>
          <MapPin className="sf-footer-icon" aria-hidden="true" />
          <span>{business.location}</span>
        </li>
      ) : null}
      {business.phoneNumber ? (
        <li>
          <Phone className="sf-footer-icon" aria-hidden="true" />
          <a href={`tel:${business.phoneNumber}`} className="link">{business.phoneNumber}</a>
        </li>
      ) : null}
      {business.email ? (
        <li>
          <Mail className="sf-footer-icon" aria-hidden="true" />
          <a href={`mailto:${business.email}`} className="link">{business.email}</a>
        </li>
      ) : null}
      {showHours && openToday ? (
        <li>
          <Clock className="sf-footer-icon" aria-hidden="true" />
          <span>
            {openToday.day} {openToday.periods[0].opensAt}–
            {openToday.periods[openToday.periods.length - 1].closesAt}
          </span>
        </li>
      ) : null}
    </ul>
  )

  const brand: ReactNode = (
    <div className="sf-footer-brand">
      {config?.showLogo && business.logoUrl ? (
        <img src={business.logoUrl} alt="" className="sf-footer-logo" />
      ) : null}
      <p className="sf-footer-name">{business.name}</p>
      {config?.description || business.description ? (
        <p className="sf-footer-desc">{config?.description ?? business.description}</p>
      ) : null}
    </div>
  )

  const navList =
    showNav && nav.length > 0 ? (
      <nav aria-label="Storefront" className="sf-footer-nav">
        <p className="sf-footer-title">Explore</p>
        <ul className="sf-footer-list">
          {nav.map((item) => (
            <li key={item.key}>
              <a href={item.href} className="link">{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    ) : null

  const legal = showLegal ? (
    <div className="sf-footer-legal">
      <span>{copyright}</span>
      {config?.legalLinks.length ? (
        <ul className="sf-footer-list is-inline">
          {config.legalLinks.map((link) => (
            <li key={`${link.label}-${link.href}`}>
              <a href={link.href} className="link">{link.label}</a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  ) : null

  return (
    <footer className={cn('sf-footer', `is-${variant}`)} style={style}>
      <div className="sf-container">
        {variant === 'minimal' ? (
          <div className="sf-footer-minimal">
            {brand}
            <div className="sf-footer-minimal-side">
              {showSocial ? <SocialRow /> : null}
              <span className="sf-footer-copy">{copyright}</span>
            </div>
          </div>
        ) : variant === 'centered' ? (
          <div className="sf-footer-centered">
            {brand}
            {navList}
            {showSocial ? <SocialRow /> : null}
            {legal}
          </div>
        ) : variant === 'contact' ? (
          <div className="sf-footer-grid is-contact">
            <div>
              <p className="sf-footer-title">Get in touch</p>
              {showContact ? contact : null}
            </div>
            {navList}
            {brand}
            {legal}
          </div>
        ) : variant === 'editorial' ? (
          <div className="sf-footer-editorial">
            {brand}
            <div className="sf-footer-editorial-grid">
              {navList}
              <div>
                <p className="sf-footer-title">Visit</p>
                {contact}
              </div>
              {showSocial ? <SocialRow /> : null}
            </div>
            {legal}
          </div>
        ) : (
          <div className="sf-footer-grid">
            {brand}
            {navList}
            <div>
              <p className="sf-footer-title">Contact</p>
              {showContact ? contact : null}
            </div>
            <div className="sf-footer-grid-foot">
              {showSocial ? <SocialRow /> : null}
              {legal}
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
