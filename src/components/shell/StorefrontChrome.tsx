import { Link } from '@tanstack/react-router'
import { CalendarPlus, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { useStorefront } from '../../lib/storefront'
import { getInitials } from '../../lib/format'
import { marketingUrl, storefrontHref } from '../../lib/tenant'

function Monogram({ name, src }: { name: string; src?: string }) {
  return (
    <span className="grid size-[2.35rem] shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft text-[0.8rem] font-bold text-accent-ink">
      {src ? <img src={src} alt="" className="size-full object-cover" /> : getInitials(name)}
    </span>
  )
}

/**
 * Storefront frame: the business's own header and footer around its pages.
 * Everything shown here is already entitlement-filtered by bootstrap, so a
 * business without a gallery simply never renders a gallery link.
 */
export function StorefrontChrome({ children }: { children: ReactNode }) {
  const { business, canonicalSlug, can } = useStorefront()
  const { isAuthenticated } = useAuth()

  const navClass =
    'rounded-md px-[0.55rem] py-[0.35rem] text-label text-muted no-underline transition-colors hover:bg-hover hover:text-fg'

  const homeHref = storefrontHref(canonicalSlug)
  const bookHref = storefrontHref(canonicalSlug, '/book')
  const accountHref = storefrontHref(canonicalSlug, '/account')

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

          <nav className="ml-[0.65rem] hidden items-center gap-[0.15rem] md:flex" aria-label="Sections">
            <a href={homeHref} className={navClass}>
              Home
            </a>
            {can('services') ? (
              <a href={bookHref} className={navClass}>
                Services
              </a>
            ) : null}
            {isAuthenticated ? (
              <a href={accountHref} className={navClass}>
                My bookings
              </a>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-[0.4rem]">
            {can('appointments') ? (
              <a href={bookHref} className="btn btn-primary no-underline">
                <CalendarPlus className="size-[0.95rem]" aria-hidden="true" />
                Book
              </a>
            ) : null}
            {isAuthenticated ? (
              <a
                href={accountHref}
                className="btn btn-ghost no-underline max-sm:btn-icon"
                aria-label="My bookings"
              >
                <UserRound className="size-[1rem]" aria-hidden="true" />
                <span className="max-sm:hidden">My bookings</span>
              </a>
            ) : (
              <Link
                to="/auth/sign-in"
                search={{ redirect: accountHref }}
                className="btn btn-ghost no-underline max-sm:btn-icon"
                aria-label="Sign in"
              >
                <UserRound className="size-[1rem]" aria-hidden="true" />
                <span className="max-sm:hidden">Sign in</span>
              </Link>
            )}
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
              Zenbokk
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}

/** Hero action pair reused by storefront pages. */
export function StorefrontCta({
  slug,
  children,
}: {
  slug: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-[0.6rem]">
      <a href={storefrontHref(slug, '/book')} className="btn btn-primary btn-xl no-underline">
        {children ?? 'Book an appointment'}
      </a>
      <a href="#services" className="btn btn-ghost btn-xl hidden no-underline sm:inline-flex">
        See services
      </a>
    </div>
  )
}
