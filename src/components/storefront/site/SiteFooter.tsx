import type { PublicBusinessProfile, StorefrontConfig } from '../../../lib/api/types'
import { normaliseFooterLayout } from '../../../lib/storefront-builder/catalog'
import type { NavLink } from './nav'

/**
 * The storefront footer — the prototype's `.ftr` system.
 *
 * Six layouts: `columns`, `newsletter`, `centered`, `minimal`, `wordmark` and
 * `split`. Every column is built from real records (the business profile's
 * contact details, the resolved navigation, the owner's socials) — never
 * hardcoded copy.
 *
 * The newsletter block is deliberately non-submitting: there is no newsletter
 * backend, so it renders the design (a static field + label) and never claims a
 * subscription happened.
 */

export type SiteFooterProps = {
  config: StorefrontConfig
  business: PublicBusinessProfile
  nav: NavLink[]
  logoUrl?: string | null
  socials?: { platform: string; url: string }[]
  hours?: { label: string; value: string }[]
  legal?: { label: string; href: string }[]
  onNavigate?: (href: string) => void
}

export function SiteFooter({
  config,
  business,
  nav,
  logoUrl,
  socials = [],
  hours = [],
  legal = [],
  onNavigate,
}: SiteFooterProps) {
  const footer = config.footer
  const layout = normaliseFooterLayout(footer.variant)
  const year = new Date().getFullYear()
  const initial = (business.name || '·').trim().charAt(0).toUpperCase()

  const href = (target: string) =>
    onNavigate
      ? { href: target, onClick: (event: React.MouseEvent) => { event.preventDefault(); onNavigate(target) } }
      : { href: target }

  const brand = (
    <span className="sf-lg">
      {logoUrl && footer.showLogo ? <img src={logoUrl} alt={business.name} /> : <i aria-hidden="true">{initial}</i>}
      <span>{business.name}</span>
    </span>
  )

  const contact = (
    <>
      {footer.showContact && business.phoneNumber ? <a href={`tel:${business.phoneNumber}`}>{business.phoneNumber}</a> : null}
      {footer.showContact && business.email ? <a href={`mailto:${business.email}`}>{business.email}</a> : null}
      {footer.showAddress && business.location ? <p>{business.location}</p> : null}
    </>
  )

  const navColumn = footer.showNav ? (
    <div>
      <h3>Explore</h3>
      {nav.map((link) => (
        <a key={link.label} {...href(link.href)}>{link.label}</a>
      ))}
    </div>
  ) : null

  const socialsRow = footer.showSocial && socials.length > 0 ? (
    <div className="sf-soc">
      {socials.map((social) => (
        <a key={social.platform} href={social.url} target="_blank" rel="noreferrer" aria-label={social.platform}>
          {social.platform.slice(0, 2).toUpperCase()}
        </a>
      ))}
    </div>
  ) : null

  const copyright = (
    <span>{footer.copyright || `© ${year} ${business.name}. All rights reserved.`}</span>
  )
  const legalLinks = footer.showLegal && legal.length > 0 ? (
    <span>
      {legal.map((link) => (
        <a key={link.label} {...href(link.href)}>{link.label}</a>
      ))}
    </span>
  ) : null

  const style = {
    '--sf-fp': `${footer.padding ?? 72}px`,
  } as React.CSSProperties

  // A static, non-submitting signup: there is no newsletter backend, so this is
  // the design only — no form, no handler, no success message.
  const newsletterBlock = (
    <div className="sf-nb">
      <h2>{footer.newsletterHeadline || 'Stay in the loop'}</h2>
      <span className="sf-nf" role="group" aria-label="Newsletter signup — not connected yet">
        <span>{footer.newsletterPlaceholder || 'Your email'}</span>
        <b>{footer.newsletterButtonLabel || 'Subscribe'}</b>
      </span>
    </div>
  )

  const wordmark = footer.showWordmark ? <div className="sf-wm" aria-hidden="true">{business.name}</div> : null

  if (layout === 'minimal') {
    return (
      <footer className="sf-ftr" style={style} data-sf-footer="minimal">
        <div className="sf-fm">
          {brand}
          {copyright}
        </div>
      </footer>
    )
  }

  if (layout === 'centered') {
    return (
      <footer className="sf-ftr" style={style} data-sf-footer="centered">
        <div className="sf-ftc">
          {brand}
          {footer.description ? <p>{footer.description}</p> : null}
          {navColumn}
          {socialsRow}
        </div>
        <div className="sf-fb">
          {copyright}
          {legalLinks}
        </div>
      </footer>
    )
  }

  if (layout === 'wordmark') {
    return (
      <footer className="sf-ftr" style={style} data-sf-footer="wordmark">
        <div className="sf-fm">
          {brand}
          {socialsRow}
        </div>
        {wordmark}
        <div className="sf-fb">
          {copyright}
          {legalLinks}
        </div>
      </footer>
    )
  }

  if (layout === 'split') {
    return (
      <footer className="sf-ftr" style={style} data-sf-footer="split">
        {newsletterBlock}
        <div className="sf-fs">
          <div>
            {brand}
            {footer.description ? <p>{footer.description}</p> : null}
            {socialsRow}
          </div>
          <div className="sf-card2">
            {navColumn}
            <div>
              <h3>Contact</h3>
              {contact}
            </div>
          </div>
        </div>
        <div className="sf-fb">
          {copyright}
          {legalLinks}
        </div>
      </footer>
    )
  }

  // newsletter and columns share the four-column grid.
  return (
    <footer className="sf-ftr" style={style} data-sf-footer={layout}>
      {layout === 'newsletter' ? newsletterBlock : null}
      <div className="sf-fg">
        <div>
          {brand}
          {footer.description ? <p>{footer.description}</p> : null}
          {socialsRow}
        </div>
        {navColumn}
        {footer.showHours && hours.length > 0 ? (
          <div>
            <h3>Opening hours</h3>
            {hours.map((entry) => (
              <span className="sf-hr2" key={entry.label}>
                <span>{entry.label}</span>
                <span>{entry.value}</span>
              </span>
            ))}
          </div>
        ) : null}
        <div>
          <h3>Contact</h3>
          {contact}
        </div>
      </div>
      <div className="sf-fb">
        {copyright}
        {legalLinks}
      </div>
    </footer>
  )
}
