import { createContext, use } from 'react'
import type { CallerPlanInfo, DashboardBusiness, UserProfile, UserRole } from '../api/types'
import type { NavSection, NavSurface } from '../navigation/types'

/**
 * What a console knows about itself once bootstrap has resolved: the business
 * being acted in, its effective entitlements, the caller's permissions, the
 * plan, and the sidebar that follows from them.
 *
 * Pages read module and permission checks from here rather than deciding
 * business access themselves, so a plan change, a trial ending or an admin
 * module override reaches every screen without a code change.
 */
export type DashboardContextValue = {
  surface: NavSurface
  role: UserRole
  user: UserProfile | null
  business: DashboardBusiness
  entitlements: readonly string[]
  permissions: readonly string[]
  plan: CallerPlanInfo | null
  /** Sidebar for this caller, already filtered by module access + permissions. */
  nav: readonly NavSection[]
  /** Is the business entitled to this module? */
  hasModule: (key: string) => boolean
  /** Does the caller's role hold this permission code? */
  hasPermission: (code: string) => boolean
  /** Is this navigation entry (by key) part of the resolved sidebar? */
  canSee: (navKey: string) => boolean
}

export const DashboardContext = createContext<DashboardContextValue | null>(null)

export function useDashboardContext(): DashboardContextValue {
  const value = use(DashboardContext)
  if (!value) {
    throw new Error('useDashboardContext must be used inside a dashboard layout')
  }
  return value
}
