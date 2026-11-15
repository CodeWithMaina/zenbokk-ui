import { Link } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import type { StorefrontSocialLink } from '../../lib/api/types'
import { useStorefront } from '../../lib/storefront'
import { marketingUrl } from '../../lib/tenant'
import { resolveSocialGlyph, SocialIcon } from './SocialIcon'

/**
 * The storefront footer — one minimal block, shared by every storefront page.
 *
 * A single copyright line, a platform credit, the three legal links and the
 * networks the business actually publishes. There is no navigation, no columns
 * and no brand block: the header already carries the site map, so the footer
 * stays out of its way.
 *
 * Colours come from the owner's tokens where the builder set them (`--sf-*` and
 * the configured footer colours) and fall back to the app's own, so both light
 * and dark read correctly without a hardcoded colour anywhere.
 */

/** The platform's legal pages, always linked (never a dead `#`). */
const LEGAL = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Legal', to: '/legal' },
] as const

/** WhatsApp runs off the business's own phone number, as digits only. */
function whatsappHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 8 ? `https://wa.me/${digits}` : null
}

/** The configured URL for one network, matched loosely by platform or host. */
function socialUrl(socials: StorefrontSocialLink[], key: string): string | null {
  const match = socials.find((entry) => resolveSocialGlyph(entry.platform, entry.url) === key)
  return match?.url?.trim() || null
}

export function StorefrontFooter() {
  const { business, storefront } = useStorefront()
  const year = new Date().getFullYear()

  const socials = (storefront?.footer?.socials ?? []).filter((entry) => entry.url?.trim())
  const networks = [
    { key: 'instagram', label: 'Instagram', url: socialUrl(socials, 'instagram') },
    { key: 'facebook', label: 'Facebook', url: socialUrl(socials, 'facebook') },
    { key: 'tiktok', label: 'TikTok', url: socialUrl(socials, 'tiktok') },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      url: socialUrl(socials, 'whatsapp') ?? whatsappHref(business.phoneNumber),
    },
  ].filter(
    (network): network is { key: string; label: string; url: string } => Boolean(network.url),
  )

  const footer = storefront?.footer
  const style = footer
    ? ({
        '--sf-foot-bg': footer.backgroundColor,
        '--sf-foot-ink': footer.textColor,
      } as CSSProperties)
    : undefined

  return (
    <footer className="sf-foot" style={style}>
      <div className="sf-foot-inner">
        <p className="sf-foot-brandline">
          <span className="sf-foot-copy">
            © {year} {business.name}. All rights reserved.
          </span>
          <span className="sf-foot-power">
            Powered by <a href={marketingUrl('/')}>Zenbokk</a>
          </span>
        </p>

        <ul className="sf-foot-legal">
          {LEGAL.map((link) => (
            <li key={link.to}>
              <Link to={link.to}>{link.label}</Link>
            </li>
          ))}
        </ul>

        {networks.length > 0 ? (
          <ul className="sf-foot-social">
            {networks.map((network) => (
              <li key={network.key}>
                <a
                  href={network.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={network.label}
                >
                  <SocialIcon
                    platform={network.key}
                    url={network.url}
                    className="size-[0.95rem]"
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </footer>
  )
}
