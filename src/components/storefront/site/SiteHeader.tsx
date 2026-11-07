import { useState } from 'react'
import type { PublicBusinessProfile, StorefrontConfig } from '../../../lib/api/types'
import { normaliseHeaderLayout } from '../../../lib/storefront-builder/catalog'
import { cn } from '../../../lib/cn'
import type { NavLink } from './nav'

/**
 * The storefront header — the prototype's `.nv` system.
 *
 * One component draws all eight layouts (classic / centered / split / minimal /
 * pill / glass / utility / bar) from the owner's header settings: logo and name,
 * the resolved navigation (with dropdowns), link effects, CTA treatment,
 * uppercase links, height, shadow, border, sticky and transparent behaviour, and
 * a mobile drawer that slides in from the configured edge.
 */

export type SiteHeaderProps = {
  config: StorefrontConfig
  business: PublicBusinessProfile
  nav: NavLink[]
  logoUrl?: string | null
  /** Public: the current page's href. Preview: marks the selected destination. */
  activeHref?: string
  onNavigate?: (href: string) => void
  ctaHref: string
}

function linkProps(href: string, onNavigate?: (href: string) => void) {
  if (!onNavigate) return { href }
  return {
    href,
    onClick: (event: React.MouseEvent) => {
      event.preventDefault()
      onNavigate(href)
    },
  }
}

export function SiteHeader({
  config,
  business,
  nav,
  logoUrl,
  activeHref,
  onNavigate,
  ctaHref,
}: SiteHeaderProps) {
  const header = config.header
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const layout = normaliseHeaderLayout(header.variant)
  const base = layout === 'bar' ? 'classic' : layout
  const initial = (business.name || '·').trim().charAt(0).toUpperCase()

  const brand = (
    <span className="sf-lg">
      {logoUrl && header.showLogo ? <img src={logoUrl} alt={business.name} /> : <i aria-hidden="true">{initial}</i>}
      {header.showBusinessName ? <span>{business.name}</span> : null}
    </span>
  )

  const menu = (
    <nav aria-label="Primary">
      {nav.map((link) => (
        <span key={link.label} className={link.children.length > 0 ? 'sf-np' : undefined}>
          <a
            {...linkProps(link.href, onNavigate)}
            className={link.href === activeHref ? 'is-on' : undefined}
            aria-haspopup={link.children.length > 0 ? 'true' : undefined}
          >
            {link.label}
            {link.children.length > 0 ? <span className="sf-ch" aria-hidden="true" /> : null}
          </a>
          {link.children.length > 0 ? (
            <span className="sf-sub">
              {link.children.map((child) => (
                <a key={child.label} {...linkProps(child.href, onNavigate)}>{child.label}</a>
              ))}
            </span>
          ) : null}
        </span>
      ))}
    </nav>
  )

  const cta = header.ctaEnabled ? (
    <a className="sf-nc" {...linkProps(ctaHref, onNavigate)}>{header.ctaLabel}</a>
  ) : null

  const burger = (
    <button
      type="button"
      className="sf-burger"
      aria-label="Open menu"
      aria-expanded={open}
      onClick={() => setOpen(true)}
    >
      <b /><b /><b />
    </button>
  )

  return (
    <>
      {layout === 'bar' ? (
        <div className="sf-ann">{header.announcement || business.name}</div>
      ) : null}

      <header
        className={cn(
          'sf-nv',
          `sf-l-${base}`,
          `sf-fx-${header.linkEffect || 'underline'}`,
          `sf-cta-${header.ctaStyle || 'solid'}`,
          header.uppercaseLinks && 'sf-caps',
          header.shadow && 'is-sh',
          header.border && 'is-bd',
          header.sticky && 'is-sticky',
          header.transparent && 'is-tr',
        )}
        style={{ '--sf-hp': `${header.height ?? 18}px` } as React.CSSProperties}
      >
        {layout === 'utility' ? (
          <span className="sf-uc">
            {header.utilityLeft ? <span>{header.utilityLeft}</span> : null}
            {header.utilityRight ? <span>{header.utilityRight}</span> : null}
          </span>
        ) : null}
        {brand}
        {menu}
        {cta}
        {burger}
      </header>

      <div className={cn('sf-scrim', open && 'is-open')} onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        className={cn('sf-drw', `sf-${header.drawer || 'left'}`, open && 'is-open')}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="sf-dh">
          {brand}
          <button type="button" className="sf-dx" aria-label="Close menu" onClick={() => setOpen(false)}>
            <b /><b />
          </button>
        </div>
        <div className="sf-dn">
          {nav.map((link, index) => (
            <div
              key={link.label}
              className={cn('sf-dl', expanded === link.label && 'is-open')}
              style={{ '--i': index } as React.CSSProperties}
            >
              {link.children.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="sf-dk"
                    aria-expanded={expanded === link.label}
                    onClick={() => setExpanded(expanded === link.label ? null : link.label)}
                  >
                    {link.label}
                    <span className="sf-ch" aria-hidden="true" />
                  </button>
                  <div className="sf-ds">
                    <div>
                      {link.children.map((child) => (
                        <a key={child.label} {...linkProps(child.href, onNavigate)}>{child.label}</a>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <a className="sf-dk" {...linkProps(link.href, onNavigate)}>{link.label}</a>
              )}
            </div>
          ))}
        </div>
        {header.showContactInDrawer ? (
          <div className="sf-df">
            {cta}
            {business.phoneNumber ? <p>{business.phoneNumber}</p> : null}
            {business.location ? <p>{business.location}</p> : null}
          </div>
        ) : null}
      </div>
    </>
  )
}
