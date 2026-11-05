import { useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useStorefront } from '../../lib/storefront'
import { useStorefrontSeo } from '../../lib/storefront/use-storefront-seo'
import { marketingUrl } from '../../lib/tenant'
import { StorefrontNav } from '../storefront/StorefrontNav'
import { StorefrontFooter } from '../storefront/StorefrontFooter'
import { StorefrontThemeStyle } from '../storefront/StorefrontThemeStyle'
import { StorefrontBookingTray } from '../storefront/StorefrontBookingTray'

/**
 * Storefront frame: the business's own header and footer around its pages.
 *
 * The navigation is the owner's configuration, filtered by the capabilities the
 * business actually has — so a business without a gallery never renders a
 * gallery link, and one that hides its reviews from the dashboard hides them
 * here too. Nothing in this file decides what a business offers.
 *
 * The booking tray is suppressed on the booking route itself, where the wizard
 * owns the bottom of the screen with its own action bar.
 */
export function StorefrontChrome({ children }: { children: ReactNode }) {
  const { business, storefront } = useStorefront()
  const pathname = useLocation({ select: (location) => location.pathname })
  const onBookingRoute = /\/book$/.test(pathname)

  // Tenant-specific titles, meta, canonical, Open Graph and structured data.
  useStorefrontSeo(pathname)

  const shell = (
    <div className="flex min-h-svh flex-col bg-bg">
      <StorefrontNav />

      <main className="flex-1">{children}</main>

      {storefront ? (
        <StorefrontFooter />
      ) : (
        <footer className="border-t border-line bg-surface">
          <div className="sf-container grid gap-[1.4rem] py-[1.6rem] sm:grid-cols-[1.2fr_1fr]">
            <div className="grid content-start gap-[0.5rem] text-caption text-muted">
              <p className="eyebrow">Find us</p>
              <span>
                © {business.name}
                {business.location ? ` · ${business.location}` : ''}
              </span>
              {business.phoneNumber ? (
                <a href={`tel:${business.phoneNumber}`} className="link">
                  {business.phoneNumber}
                </a>
              ) : null}
              {business.email ? (
                <a href={`mailto:${business.email}`} className="link">
                  {business.email}
                </a>
              ) : null}
              <span className="flex items-center gap-[0.3rem]">
                Built with
                <a href={marketingUrl('/')} className="link">
                  Punched
                </a>
              </span>
            </div>
          </div>
        </footer>
      )}

      {onBookingRoute ? null : <StorefrontBookingTray />}
    </div>
  )

  // The builder's design tokens are applied to the whole storefront (header and
  // footer included) so a colour or font change restyles every surface at once.
  if (!storefront) return shell
  return <StorefrontThemeStyle theme={storefront.theme}>{shell}</StorefrontThemeStyle>
}

