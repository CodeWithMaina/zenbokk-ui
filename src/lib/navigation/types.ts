import type { LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '../api/types'
import type { ModuleKey } from '../entitlements'

/**
 * Navigation is *data*, not JSX scattered through shells.
 *
 * A `NavEntry` declares what a menu item needs in order to exist — the module
 * the business must be entitled to, the permission the caller's role must hold,
 * and which console it belongs to. The resolver (`resolve.ts`) applies those
 * gates to the payload the backend returned; the shells only render the result.
 *
 * Consequence: adding a module to the product is one entry here plus one route
 * file, and switching a module off for a business removes its menu item with no
 * frontend change at all.
 */

/** Console a navigation entry belongs to. */
export type NavSurface = 'dashboard' | 'staff' | 'admin'

/** Logical grouping inside a sidebar. */
export type NavSectionKey = 'overview' | 'operations' | 'growth' | 'workspace' | 'platform'

export type NavEntry = {
  /** Stable identity — also the key placeholder pages look themselves up by. */
  key: string
  label: string
  icon: LucideIcon
  /**
   * Route the entry points at. A *group* (an entry whose only purpose is to
   * hold children) leaves this out and renders as a disclosure instead of a
   * link.
   */
  to?: LinkProps['to']
  surface: NavSurface
  section: NavSectionKey
  /** Business must hold this module entitlement (`ModuleCatalog` key). */
  module?: ModuleKey
  /** Caller's role must hold this permission code (`PermissionMatrix`). */
  permission?: string
  /** Restrict to these personas. Omitted = any role that reaches the surface. */
  roles?: readonly UserRole[]
  /** Match the address exactly (for an index route), instead of by prefix. */
  exact?: boolean
  /** Nested items, revealed under the parent. */
  children?: readonly NavEntry[]
}

/** One rendered group of entries. */
export type NavSection = {
  key: NavSectionKey
  label: string
  items: NavEntry[]
}

/** Everything the resolver needs to decide what the caller may see. */
export type NavAccess = {
  surface: NavSurface
  role: UserRole
  /** Effective module keys from the backend. */
  entitlements: readonly string[]
  /** Permission codes for the caller's role from the backend. */
  permissions: readonly string[]
}
