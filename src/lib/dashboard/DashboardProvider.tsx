import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../auth'
import { can, hasModule } from '../entitlements'
import { NAV_BY_SURFACE, canSeeNavEntry, resolveNavigation } from '../navigation'
import type { BusinessDashboardBootstrap } from './bootstrap'
import { DashboardContext } from './dashboard-context'
import type { DashboardContextValue } from './dashboard-context'

/**
 * Publishes the bootstrapped business context to a console subtree.
 *
 * Mounted by the layout only once bootstrap has succeeded, so children can read
 * `business`, `entitlements`, `permissions` and `nav` unconditionally — and the
 * navigation is resolved here, once, from the backend payload rather than being
 * recomputed (or guessed) per page.
 */
export function DashboardProvider({
  bootstrap,
  children,
}: {
  bootstrap: BusinessDashboardBootstrap
  children: ReactNode
}) {
  const { user } = useAuth()

  const value = useMemo<DashboardContextValue>(() => {
    const { entitlements, permissions, surface, role } = bootstrap
    const nav = resolveNavigation(NAV_BY_SURFACE[surface], {
      surface,
      role,
      entitlements,
      permissions,
    })

    return {
      surface,
      role,
      user,
      business: bootstrap.business,
      entitlements,
      permissions,
      plan: bootstrap.plan,
      nav,
      hasModule: (key) => hasModule(entitlements, key),
      hasPermission: (code) => can(permissions, code),
      canSee: (navKey) => canSeeNavEntry(nav, navKey),
    }
  }, [bootstrap, user])

  return <DashboardContext value={value}>{children}</DashboardContext>
}
