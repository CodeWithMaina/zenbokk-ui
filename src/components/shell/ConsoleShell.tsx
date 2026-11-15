import { Link, useNavigate } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { LogOut, Menu } from 'lucide-react'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../lib/auth'
import type { NavSection } from '../../lib/navigation'
import { ThemeControl } from '../../theme'
import { Avatar } from '../ui/avatar'
import { Button } from '../ui/button'
import { ConsoleNavList } from './ConsoleNavList'
import { NavDrawer } from './NavDrawer'

export type ConsoleShellProps = {
  brand: string
  brandCaption?: string
  homeTo: LinkProps['to']
  /**
   * Sidebar for the current caller, already resolved against the business's
   * module entitlements and the caller's permissions (see `lib/navigation`).
   * The shell never decides what to show.
   */
  nav: readonly NavSection[]
  /** Rendered above the page content — plan notices, impersonation banners… */
  banner?: ReactNode
  /**
   * Optional actions for the phone header (a notification bell, a profile
   * shortcut…), placed to the left of the menu button. Desktop ignores them:
   * the persistent sidebar already carries the account block.
   */
  actions?: ReactNode
  children: ReactNode
}

function Brand({
  name,
  caption,
  to,
  className,
}: {
  name: string
  caption?: string
  to: LinkProps['to']
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn('flex min-w-0 items-center gap-[0.55rem] no-underline', className)}
    >
      <span
        className="grid size-[1.85rem] shrink-0 place-items-center rounded-md bg-inverse font-display text-[0.95rem] leading-none text-on-inverse"
        aria-hidden="true"
      >
        P
      </span>
      <span className="min-w-0">
        <span className="block truncate text-label font-bold tracking-snug text-fg">{name}</span>
        {caption ? <span className="block truncate text-caption text-muted">{caption}</span> : null}
      </span>
    </Link>
  )
}

function AccountBlock() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    await navigate({ to: '/auth/sign-in', replace: true })
  }

  return (
    <div className="mt-auto border-t border-line pt-[0.7rem]">
      <div className="flex items-center gap-[0.55rem] px-[0.2rem]">
        <Avatar name={user?.fullName ?? ''} src={user?.avatarUrl ?? undefined} size="sm" decorative />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label font-semibold">{user?.fullName ?? 'Signed in'}</p>
          <p className="truncate text-caption text-muted">{user?.email}</p>
        </div>
      </div>
      <ThemeControl className="mt-[0.6rem]" />
      <Button
        variant="ghost"
        size="sm"
        className="mt-[0.4rem] w-full justify-start"
        onClick={() => void handleSignOut()}
      >
        <LogOut className="size-[0.95rem]" aria-hidden="true" />
        Sign out
      </Button>
    </div>
  )
}

/**
 * Console frame for the signed-in shells (owner, staff, admin): a persistent
 * sidebar from `lg` up, a right-side navigation drawer on phones, and one
 * account block.
 *
 * On phones the header leads with the business — its name and caption — so the
 * workspace is always identifiable; the menu button sits on the right, opening a
 * drawer that slides in from the same edge.
 */
export function ConsoleShell({
  brand,
  brandCaption,
  homeTo,
  nav,
  banner,
  actions,
  children,
}: ConsoleShellProps) {
  const [navOpen, setNavOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="min-h-svh bg-bg">
      <div className="flex w-full">
        <aside className="sticky top-0 hidden h-svh w-[15rem] shrink-0 flex-col gap-[1.1rem] overflow-y-auto border-r border-line bg-surface px-[0.8rem] py-[1rem] lg:flex">
          <Brand name={brand} caption={brandCaption} to={homeTo} />
          <ConsoleNavList sections={nav} />
          <AccountBlock />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-(--z-header) flex items-center gap-3 border-b border-line bg-surface/95 px-3 py-[0.55rem] backdrop-blur lg:hidden">
            <Brand
              name={brand}
              caption={brandCaption}
              to={homeTo}
              className="min-w-0 flex-1"
            />
            <div className="flex shrink-0 items-center gap-[0.35rem]">
              {actions}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                aria-haspopup="dialog"
                aria-expanded={navOpen}
                aria-controls={panelId}
                onClick={() => setNavOpen(true)}
              >
                <Menu className="size-[1.25rem]" aria-hidden="true" />
              </Button>
            </div>
          </header>

          {banner}
          <main className="page page-wide">{children}</main>
        </div>
      </div>

      <NavDrawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title={brand}
        description={brandCaption}
        closeLabel="Close menu"
        id={panelId}
        bodyClassName="flex flex-col"
      >
        <ConsoleNavList sections={nav} onNavigate={() => setNavOpen(false)} />
        <AccountBlock />
      </NavDrawer>
    </div>
  )
}
