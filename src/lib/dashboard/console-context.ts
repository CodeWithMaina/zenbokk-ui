import { createContext, use } from 'react'
import type { DashboardBootstrap, DashboardBusiness } from '../api/types'

/**
 * What the owner shell knows about itself once bootstrap has resolved:
 * the business, its effective entitlements, the caller's permissions and the
 * plan. Pages read entitlements from here rather than hardcoding features, so a
 * plan change reaches every screen without a code change.
 */
export type OwnerConsoleValue = {
  bootstrap: DashboardBootstrap
  business: DashboardBusiness
  entitlements: readonly string[]
  permissions: readonly string[]
  plan: DashboardBootstrap['plan']
  hasModule: (key: string) => boolean
  hasPermission: (code: string) => boolean
}

export const OwnerConsoleContext = createContext<OwnerConsoleValue | null>(null)

export function useOwnerConsole(): OwnerConsoleValue {
  const value = use(OwnerConsoleContext)
  if (!value) {
    throw new Error('useOwnerConsole must be used inside the /dashboard layout')
  }
  return value
}
