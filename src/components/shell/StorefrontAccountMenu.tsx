import { Link, useNavigate } from '@tanstack/react-router'
import {
  LayoutDashboard,
  LogOut,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { destinationForRole } from '../../lib/auth/guards'
import { useStorefront } from '../../lib/storefront'
import { storefrontHref } from '../../lib/tenant'
import { Avatar } from '../ui/avatar'
import { Menu } from '../ui/menu'
import type { MenuItem } from '../ui/menu'

/**
 * Signed-in account menu for a business's storefront header.
 *
 * Authenticated users see:
 * - My Dashboard (navigation to their dashboard)
 * - Log Out (complete logout)
 *
 * Anonymous visitors see a sign-in link.
 */
export function StorefrontAccountMenu() {
  const { user, role, isAuthenticated, signOut } = useAuth()
  const { canonicalSlug } = useStorefront()
  const navigate = useNavigate()

  const accountHref = storefrontHref(canonicalSlug, '/account')

  if (!isAuthenticated) {
    return (
      <Link
        to="/auth/sign-in"
        search={{ redirect: accountHref }}
        className="btn btn-ghost no-underline max-sm:btn-icon"
        aria-label="Log in"
      >
        <UserRound className="size-[1rem]" aria-hidden="true" />
        <span className="max-sm:hidden">Log in</span>
      </Link>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    await navigate({ to: '/auth/sign-in', replace: true })
  }

  const items: MenuItem[] = []

  // Show "My Dashboard" for business owners, staff, and admins
  if (role === 'Business' || role === 'Staff' || role === 'Admin') {
    const landing = destinationForRole(role, true)
    items.push({
      label: 'My Dashboard',
      icon: <LayoutDashboard className="size-4" />,
      onSelect: () => {
        if (landing.kind === 'external') {
          window.location.assign(landing.href)
          return
        }
        void navigate({ to: landing.to })
      },
    })
  } else if (role === 'Customer') {
    // Customers see "My Dashboard" which links to their account/bookings
    items.push({
      label: 'My Dashboard',
      icon: <LayoutDashboard className="size-4" />,
      onSelect: () => {
        window.location.assign(accountHref)
      },
    })
  }

  // Log out — shown for all authenticated users
  items.push({
    label: 'Log Out',
    icon: <LogOut className="size-4" />,
    destructive: true,
    onSelect: () => {
      void handleSignOut()
    },
  })

  return (
    <Menu
      items={items}
      label="Account"
      triggerLabel="Account menu"
      align="end"
      triggerClassName="w-auto rounded-round p-[0.1rem]"
      trigger={
        <Avatar
          name={user?.fullName ?? ''}
          src={user?.avatarUrl ?? undefined}
          size="sm"
          decorative
        />
      }
    />
  )
}
