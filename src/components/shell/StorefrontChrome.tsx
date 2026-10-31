import { CalendarPlus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { getInitials } from '../../lib/format'
import { useStorefront } from '../../lib/storefront'
import { resolveNavigation, sectionLabel } from '../../lib/storefront/sections'
import { marketingUrl, storefrontHref } from '../../lib/tenant'
import { StorefrontAccountMenu } from './StorefrontAccountMenu'

function Monogram({ name, src }: { name: string; src?: string }) {
  return (
    <span className="grid size-[2.35rem] shrink-0 place-items-center overflow-hidden rounded-round bg-accent-soft text-[0.8rem] font-bold text-accent-ink">
      {src ? <img src={src} alt="" className="size-full object-cover" /> : getInitials(name)}
    </span>
  )
}

/**
 * Storefront frame: the business's own header and footer around its pages.
 *
 * The navigation is the owner's configuration, filtered by the capabilities the
 * business actually has — so a business without a gallery never renders a
 * gallery link, and one that hides its reviews from the dashboard hides them
 * here too. Nothing in this file decides what a business offers.
 */
export function StorefrontChrome({ children }: { children: ReactNode }) {
  const { business, canonicalSlug, landingPage, can } = useStorefront()
  const { isAuthenticated } = useAuth()

  const navClass =
    'rounded-md px-[0.55rem] py-[0.35rem] text-label text-muted no-underline transition-colors hover:bg-hover hover:text-fg'

  const homeHref = storefrontHref(canonicalSlug)
  const bookHref = storefrontHref(canonicalSlug, '/book')
  const accountHref = storefrontHref(canonicalSlug, '/account')

  // `booking` is a route rather than an anchor on the home page, so it stays out
  // of the in-page nav list; every other entry scrolls to its section.
  const navEntries = resolveNavigation(landingPage, can).filter((key) => key !== 'booking')
  const canBook = can('appointments') && landingPage.navigation.booking

  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <header className="sticky top-0 z-(--z-header) border-b border-line bg-surface/92 backdrop-blur">
        <div className="mx-auto flex w-full max-w-(--container-page) items-center gap-[0.9rem] px-gutter py-[0.7rem]">
          <a href={homeHref} className="flex min-w-0 items-center gap-[0.55rem] no-underline">
            <Monogram name={business.name} src={business.logoUrl ?? undefined} />
            <span className="min-w-0">
              <span className="block truncate text-label font-bold tracking-snug text-fg">
                {business.name}
              </span>
              {business.category ? (
                <span className="block truncate text-caption text-muted">{business.category}</span>
              ) : null}
            </span>
          </a>

          <nav
            className="ml-[0.65rem] hidden items-center gap-[0.15rem] md:flex"
            aria-label="Sections"
          >
            <a href={homeHref} className={navClass}>
              Home
            </a>
            {navEntries.map((key) => (
              <a key={key} href={`#${key}`} className={navClass}>
                {sectionLabel(key)}
              </a>
            ))}
            {isAuthenticated ? (
              <a href={accountHref} className={navClass}>
                My bookings
              </a>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-[0.4rem]">
            {canBook ? (
              <a href={bookHref} className="btn btn-primary no-underline">
                <CalendarPlus className="size-[0.95rem]" aria-hidden="true" />
                Book
              </a>
            ) : null}
            {/* One control for both audiences: a log-in link when anonymous, the
                account avatar + menu when signed in. */}
            <StorefrontAccountMenu />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-(--container-page) flex-wrap items-center justify-between gap-3 px-gutter py-[1.2rem] text-caption text-subtle">
          <p>
            {business.name}
            {business.location ? ` · ${business.location}` : ''}
          </p>
          <p className="flex items-center gap-[0.3rem]">
            Built with
            <a href={marketingUrl('/')} className="link">
              Punched
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
