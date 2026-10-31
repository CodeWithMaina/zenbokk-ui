import { Link, useNavigate } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { ArrowRight, Menu, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../lib/auth'
import { homePathForRole } from '../../lib/auth/guards'
import { getInitials } from '../../lib/format'
import { resolveSurface } from '../../lib/tenant'
import { Button } from '../ui/button'
import { PunchedWordmark } from './PunchedMark'

export type NavItem = {
  label: string
  /** In-page anchor on the page that renders the header (`#platform`). */
  anchor?: string
  /** TanStack Router destination. */
  to?: LinkProps['to']
  /** Absolute or external address, rendered as a plain anchor. */
  href?: string
  active?: boolean
}

export type SiteHeaderProps = {
  nav?: readonly NavItem[]
  /** Replaces the wordmark — a tenant storefront passes its own business logo. */
  brand?: ReactNode
  brandHref?: LinkProps['to']
  /** Replaces the auth-aware right slot entirely. */
  right?: ReactNode
}

/** Smooth-scroll to an in-page anchor, honouring the reduced-motion setting. */
function scrollToAnchor(anchor: string) {
  const target = document.getElementById(anchor.replace(/^#/, ''))
  if (!target) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

/**
 * Shared public-site header: a floating pill over the page, a full-height
 * drawer on phones, and one auth-aware right slot. The consoles deliberately
 * use their own shell instead.
 */
export function SiteHeader({ nav = [], brand, brandHref = '/', right }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const hasMenu = nav.length > 0

  // Close the drawer on Escape (returning focus to the trigger) and on a
  // pointer down outside the header, so it never traps the visitor.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      menuButtonRef.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (headerRef.current?.contains(event.target as Node)) return
      setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  const wordmark = (
    <Link
      to={brandHref}
      aria-label={brand ? undefined : 'Punched home'}
      onClick={() => setMenuOpen(false)}
      className="flex min-w-0 items-center gap-[0.6rem] no-underline"
    >
      {brand ?? <PunchedWordmark />}
    </Link>
  )

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-3 z-(--z-popover) px-3 sm:px-6">
      <div className="mx-auto max-w-[1100px] rounded-[28px] border border-line bg-glass backdrop-blur-md">
        <div className="flex h-14 items-center justify-between pr-2 pl-5">
          {wordmark}

          {hasMenu ? (
            <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
              {nav.map((item) => (
                <HeaderLink key={item.label} item={item} />
              ))}
            </nav>
          ) : null}

          {right ? <div className="hidden items-center gap-2 lg:flex">{right}</div> : null}

          {hasMenu || right ? (
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="site-mobile-drawer"
            >
              {menuOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <div
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
        className={cn(
          'fixed inset-0 z-(--z-scrim) bg-scrim backdrop-blur-[2px] transition-opacity duration-500 lg:hidden',
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* `invisible` + `pointer-events-none` when closed, not just a transform:
          `aria-hidden` alone does not remove the links from the tab order, so a
          keyboard user would tab into a drawer they cannot see. */}
      <aside
        id="site-mobile-drawer"
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        className={cn(
          'fixed inset-y-0 right-0 z-(--z-drawer) flex w-[min(90vw,390px)] flex-col overflow-y-auto bg-sunken px-6 pt-5 pb-8 shadow-overlay transition-transform duration-500 lg:hidden',
          menuOpen ? 'translate-x-0' : 'pointer-events-none invisible translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-dashed border-line pb-5">
          {wordmark}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-[1.2rem]" aria-hidden="true" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col justify-center py-8" aria-label="Mobile">
          {nav.map((item) => (
            <DrawerLink key={item.label} item={item} onNavigate={() => setMenuOpen(false)} />
          ))}
          {!hasMenu && right ? <div className="flex flex-col gap-3">{right}</div> : null}
        </nav>
      </aside>
    </header>
  )
}

function HeaderLink({ item }: { item: NavItem }) {
  const className = cn(
    'text-[14px] no-underline transition-colors',
    item.active ? 'text-fg' : 'text-muted hover:text-fg',
  )

  if (item.anchor) {
    const anchor = item.anchor
    return (
      <a
        href={anchor}
        aria-current={item.active ? 'page' : undefined}
        className={className}
        onClick={(event) => {
          event.preventDefault()
          scrollToAnchor(anchor)
        }}
      >
        {item.label}
      </a>
    )
  }

  if (item.to) {
    return (
      <Link to={item.to} aria-current={item.active ? 'page' : undefined} className={className}>
        {item.label}
      </Link>
    )
  }

  return (
    <a href={item.href ?? '#'} aria-current={item.active ? 'page' : undefined} className={className}>
      {item.label}
    </a>
  )
}

function DrawerLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const className = cn(
    'punch-display group flex items-center justify-between border-b border-dashed border-line py-4 text-[30px] leading-none text-fg no-underline transition-colors duration-500 hover:text-accent',
    !item.active && 'opacity-70',
  )
  const trailing = (
    <ArrowRight
      className="size-[1.1rem] text-line-strong transition-transform group-hover:translate-x-1 group-hover:text-accent"
      aria-hidden="true"
    />
  )

  if (item.anchor) {
    const anchor = item.anchor
    return (
      <a
        href={anchor}
        className={className}
        onClick={(event) => {
          event.preventDefault()
          onNavigate()
          window.setTimeout(() => scrollToAnchor(anchor), 180)
        }}
      >
        {item.label}
        {trailing}
      </a>
    )
  }

  if (item.to) {
    return (
      <Link to={item.to} onClick={onNavigate} className={className}>
        {item.label}
        {trailing}
      </Link>
    )
  }

  return (
    <a href={item.href ?? '#'} onClick={onNavigate} className={className}>
      {item.label}
      {trailing}
    </a>
  )
}

/**
 * The header's right slot, driven by session state: a fixed-width ghost while
 * the shared refresh cookie is being exchanged (so nothing shifts when it
 * resolves), a quiet "Sign in" when signed out, and a link into their own
 * console when signed in.
 */
export function HeaderActions() {
  const { user, role, isAuthenticated, isRestoring } = useAuth()
  const navigate = useNavigate()

  if (isRestoring) {
    return <span aria-hidden="true" className="block h-10 w-[104px] rounded-pill bg-hover" />
  }

  if (isAuthenticated && user) {
    const name = user.fullName?.trim() || user.email?.trim() || ''
    const firstName = name.split(/\s+/)[0] ?? ''
    const to = role ? homePathForRole(role, resolveSurface().kind === 'tenant') : '/'

    return (
      <Link
        to={to}
        aria-label={name ? `${name} — go to your console` : 'Go to your console'}
        title={name || undefined}
        className="group inline-flex items-center gap-[0.5rem] rounded-pill py-1 pr-3 pl-1 no-underline transition-colors"
      >
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-round bg-accent-soft text-[11px] font-semibold text-accent-ink uppercase">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-full object-cover" />
          ) : name ? (
            getInitials(name)
          ) : (
            <UserRound className="size-[0.9rem]" aria-hidden="true" />
          )}
        </span>
        {firstName ? (
          <span className="hidden max-w-[10rem] truncate text-[14px] text-fg sm:block">
            {firstName}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <Button
      variant="ghost"
      onClick={() => {
        void navigate({ to: '/login' })
      }}
    >
      Sign in
    </Button>
  )
}
