import type { CustomerCapabilities } from './api/types'

/**
 * Mirrors `Application/Modules/ModuleCatalog.cs` (module keys) and
 * `CustomerCapabilityCatalog.cs` (customer capability keys).
 *
 * Read entitlements from these helpers — never from hardcoded feature checks —
 * so a plan change, trial, purchase or admin override immediately reaches the
 * UI without a code change.
 */

export const MODULE = {
  customers: 'customers',
  staff: 'staff',
  settings: 'settings',
  appointments: 'appointments',
  stamps: 'stamps',
  notifications: 'notifications',
  serviceCatalog: 'serviceCatalog',
  attendance: 'attendance',
  payments: 'payments',
  loyalty: 'loyalty',
  rewards: 'rewards',
  analytics: 'analytics',
  programs: 'programs',
  referral: 'referral',
  customCardDesign: 'customCardDesign',
  reviews: 'reviews',
  gallery: 'gallery',
  storefront: 'storefront',
} as const

export type ModuleKey = (typeof MODULE)[keyof typeof MODULE]

export const CAPABILITY = {
  services: 'services',
  appointments: 'appointments',
  loyalty: 'loyalty',
  rewards: 'rewards',
  referrals: 'referrals',
  payments: 'payments',
  notifications: 'notifications',
  reviews: 'reviews',
  gallery: 'gallery',
  galleryReviews: 'galleryReviews',
} as const

export type CapabilityKey = (typeof CAPABILITY)[keyof typeof CAPABILITY]

export function hasCapability(
  capabilities: CustomerCapabilities | null | undefined,
  key: CapabilityKey,
): boolean {
  return capabilities?.[key] === true
}

export function hasAnyCapability(
  capabilities: CustomerCapabilities | null | undefined,
  keys: readonly CapabilityKey[],
): boolean {
  return keys.some((key) => hasCapability(capabilities, key))
}

/**
 * Module keys and permission codes arrive from the backend as plain strings, so
 * the gates accept `string` as well as the literal unions — a module added to
 * `ModuleCatalog.cs` must not require a frontend type change to be honoured.
 */
export function hasModule(modules: readonly string[] | null | undefined, key: string): boolean {
  return !!modules?.includes(key)
}

export function hasAnyModule(
  modules: readonly string[] | null | undefined,
  keys: readonly string[],
): boolean {
  return keys.some((key) => hasModule(modules, key))
}

/** `attendance.view`, `customers.manage`, … */
export function can(permissions: readonly string[] | null | undefined, code: string): boolean {
  return !!permissions?.includes(code)
}
