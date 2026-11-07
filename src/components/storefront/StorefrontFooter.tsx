import type { ReactNode } from 'react'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { useStorefront } from '../../lib/storefront'
import { resolveNavigation, sectionLabel, sectionPath } from '../../lib/storefront/sections'
import { useStorefrontOpeningHours } from '../../lib/storefront/use-storefront-public'
import { marketingUrl, storefrontHref } from '../../lib/tenant'

/**
 * The storefront footer, shared by every storefront page.
 *
 * Business facts (name, address, phone, email, hours) come from the business
 * profile and the opening-hours endpoint — never duplicated into the config, so
 * they can never drift from the rest of the product. The owner controls the
 * layout variant, which blocks appear, the socials, the legal links and the
 * colours. It renders whether or not the business has a builder configuration,
 * so a single footer design sits under every page of every storefront.
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
  const socials = config?.socials ?? []
  const legalLinks = config?.legalLinks ?? []

  const brand: ReactNode = (
    <div className="sf-footer-brand">
      {config?.showLogo && business.logoUrl ? (
        <img src={business.logoUrl} alt="" className="sf-footer-logo" />
      ) : (
        <span className="sf-footer-mono" aria-hidden="true">
          {(business.name || '·').trim().charAt(0).toUpperCase()}
        </span>
      )}
      <p className="sf-footer-name">{business.name}</p>
      {config?.description || business.description ? (
        <p className="sf-footer-desc">{config?.description ?? business.description}</p>
      ) : null}
    </div>
  )

  const contact: ReactNode = (
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
          <a href={`tel:${business.phoneNumber}`} className="link">
            {business.phoneNumber}
          </a>
        </li>
      ) : null}
      {business.email ? (
        <li>
          <Mail className="sf-footer-icon" aria-hidden="true" />
          <a href={`mailto:${business.email}`} className="link">
            {business.email}
          </a>
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

  const navList: ReactNode =
    showNav && nav.length > 0 ? (
      <nav aria-label="Storefront" className="sf-footer-nav">
        <p className="sf-footer-title">Explore</p>
        <ul className="sf-footer-list">
          {nav.map((item) => (
            <li key={item.key}>
              <a href={item.href} className="link">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    ) : null

  const social: ReactNode =
    showSocial && socials.length > 0 ? (
      <ul className="sf-footer-social">
        {socials.map((entry) => (
          <li key={`${entry.platform}-${entry.url}`}>
            <a href={entry.url} rel="noreferrer noopener" target="_blank">
              {entry.platform || entry.url}
            </a>
          </li>
        ))}
      </ul>
    ) : null

  const legal: ReactNode = (
    <div className="sf-footer-legal">
      <span>{copyright}</span>
      {showLegal && legalLinks.length > 0 ? (
        <ul className="sf-footer-list is-inline">
          {legalLinks.map((entry) => (
            <li key={`${entry.label}-${entry.href}`}>
              <a href={entry.href} className="link">
                {entry.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {!storefront ? (
        <span>
          Built with{' '}
          <a href={marketingUrl('/')} className="link">
            Punched
          </a>
        </span>
      ) : null}
    </div>
  )

  if (variant === 'minimal') {
    return (
      <footer className="sf-footer is-minimal" style={style}>
        <div className="sf-container sf-footer-minimal">
          {brand}
          <div className="sf-footer-minimal-side">
            {social}
            {legal}
          </div>
        </div>
      </footer>
    )
  }

  if (variant === 'centered') {
    return (
      <footer className="sf-footer is-centered" style={style}>
        <div className="sf-container">
          <div className="sf-footer-centered">
            {brand}
            {navList}
            {social}
          </div>
          <div className="sf-footer-bottom is-center">{legal}</div>
        </div>
      </footer>
    )
  }

  if (variant === 'contact') {
    return (
      <footer className="sf-footer is-contact" style={style}>
        <div className="sf-container">
          <div className="sf-footer-grid">
            <div className="sf-footer-col">
              <p className="sf-footer-title">Get in touch</p>
              {showContact ? contact : null}
            </div>
            {navList}
            {brand}
            <div className="sf-footer-bottom">{legal}</div>
          </div>
        </div>
      </footer>
    )
  }

  if (variant === 'editorial') {
    return (
      <footer className="sf-footer is-editorial" style={style}>
        <div className="sf-container">
          {brand}
          <div className="sf-footer-editorial-grid">
            {navList}
            <div className="sf-footer-col">
              <p className="sf-footer-title">Visit</p>
              {contact}
            </div>
            {social}
          </div>
          <div className="sf-footer-bottom">{legal}</div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="sf-footer is-columns" style={style}>
      <div className="sf-container">
        <div className="sf-footer-grid">
          {brand}
          {navList}
          <div className="sf-footer-col">
            <p className="sf-footer-title">Contact</p>
            {showContact ? contact : null}
          </div>
          <div className="sf-footer-bottom">
            {social}
            {legal}
          </div>
        </div>
      </div>
    </footer>
  )
}
