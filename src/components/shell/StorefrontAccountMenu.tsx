import { Link, useNavigate } from '@tanstack/react-router'
import {
  Building2,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '../../lib/api/client'
import { useAuth } from '../../lib/auth'
import { destinationForRole } from '../../lib/auth/guards'
import { businessApi } from '../../lib/business/api'
import { useAssociatedBusinesses } from '../../lib/business/use-business'
import { useStorefront } from '../../lib/storefront'
import { storefrontHref, tenantUrl } from '../../lib/tenant'
import { Avatar } from '../ui/avatar'
import { Menu } from '../ui/menu'
import type { MenuItem } from '../ui/menu'

/**
 * Signed-in account menu for a business's storefront header.
 *
 * Two audiences, one control:
 *  - an anonymous visitor gets a sign-in link that returns to this page;
 *  - a signed-in visitor gets their avatar, and a menu built from what their
 *    role can actually reach — an owner sees the business dashboard and its
 *    settings, a staff member sees their console, a customer sees their
 *    bookings and the businesses they belong to.
 *
 * Nothing here decides access: the destination per role comes from
 * `destinationForRole`, and the dashboard itself re-resolves entitlements and
 * permissions server-side on load.
 */
export function StorefrontAccountMenu() {
  const { user, role, isAuthenticated, signOut } = useAuth()
  const { canonicalSlug, businessId } = useStorefront()
  const navigate = useNavigate()
  const [switching, setSwitching] = useState<string | null>(null)

  // Customer-only endpoint; owners and staff act in exactly one business.
  const associated = useAssociatedBusinesses(isAuthenticated && role === 'Customer')

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

  /**
   * Move the customer to another business they belong to.
   *
   * The associated-businesses payload has no slug, so the address is resolved
   * from the business id first and then opened on its canonical host — the same
   * hand-off a renamed storefront uses.
   */
  const switchTo = async (businessId: string) => {
    setSwitching(businessId)
    try {
      const business = await businessApi.byId(businessId)
      if (!business.slug) {
        toast.error('That business has no public address yet.')
        return
      }
      window.location.assign(tenantUrl(business.slug))
    } catch (error) {
      toast.error(errorMessage(error, 'We could not open that business.'))
    } finally {
      setSwitching(null)
    }
  }

  const items: MenuItem[] = []

  if (role === 'Business' || role === 'Staff' || role === 'Admin') {
    const landing = destinationForRole(role, true)
    items.push({
      label: 'My dashboard',
      icon: <LayoutDashboard className="size-4" />,
      onSelect: () => {
        if (landing.kind === 'external') {
          window.location.assign(landing.href)
          return
        }
        void navigate({ to: landing.to })
      },
    })
  }

  items.push({
    label: role === 'Customer' ? 'My bookings' : 'My account',
    icon: <CalendarCheck className="size-4" />,
    onSelect: () => {
      window.location.assign(accountHref)
    },
  })

  // Only an owner role can open the workspace settings screen.
  if (role === 'Business') {
    items.push({
      label: 'Settings',
      icon: <Settings className="size-4" />,
      onSelect: () => {
        void navigate({ to: '/dashboard/settings' })
      },
    })
  }

  // Other businesses this customer belongs to (the one being viewed is the
  // current context, so it is never offered as a switch target).
  const others = (associated.data ?? []).filter((entry) => entry.id !== businessId)
  if (role === 'Customer' && others.length > 0) {
    for (const entry of others) {
      items.push({
        label: switching === entry.id ? `Opening ${entry.name}…` : `Switch to ${entry.name}`,
        icon: <Building2 className="size-4" />,
        disabled: switching !== null,
        onSelect: () => {
          void switchTo(entry.id)
        },
      })
    }
  }

  items.push({
    label: 'Log out',
    icon: <LogOut className="size-4" />,
    destructive: true,
    separatorBefore: true,
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
