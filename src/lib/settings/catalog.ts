import type { BusinessModuleDetail } from '../api/types'

/**
 * Presentation-only catalogs and pure derivations for the Settings module.
 *
 * Everything that can change at runtime — which modules exist, which
 * categories/channels the notification matrix shows, whether a channel is
 * available — comes from the API. This file only holds *labels* for the
 * code-defined keys the backend declares (`NotificationCategory`,
 * `NotificationChannel`, `ModuleCatalog`) plus the reminder offsets the design
 * offers. An unknown key always falls back to a humanised form, so a new
 * category or channel added to the backend renders without a frontend change.
 */

/** `in_app` → `In-app`, `APPOINTMENT` → `Appointment`, `customCardDesign` → `Custom Card Design`. */
export function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Reminder offsets the design offers, in minutes before the appointment. */
export const REMINDER_OFFSET_OPTIONS = [
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 180, label: '3 hours before' },
  { value: 1440, label: '1 day before' },
] as const

/** Channel labels, mirroring `NotificationChannel` on the server. */
export const NOTIFICATION_CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-app',
  email: 'Email',
  sms: 'SMS',
  push: 'Push',
}

/** Category labels, mirroring `NotificationCategory` on the server. */
export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  APPOINTMENT: 'Appointments',
  LOYALTY: 'Loyalty',
  PAYMENT: 'Payments',
  SECURITY: 'Security',
  MARKETING: 'Marketing',
  SYSTEM: 'System',
}

/** One-line explanation per category, shown under the row title. */
export const NOTIFICATION_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  APPOINTMENT: 'Bookings, changes and cancellations',
  LOYALTY: 'Stamps earned and rewards redeemed',
  PAYMENT: 'Payments received and reversed',
  SECURITY: 'Sign-ins and password changes',
  MARKETING: 'News and product tips',
  SYSTEM: 'Service updates from Punched',
}

export function channelLabel(channel: string): string {
  return NOTIFICATION_CHANNEL_LABELS[channel] ?? humanizeKey(channel)
}

export function categoryLabel(category: string): string {
  return NOTIFICATION_CATEGORY_LABELS[category] ?? humanizeKey(category)
}

/** `8` → `8 hours before`; used when an offset is not one of the presets. */
export function offsetLabel(minutes: number): string {
  const preset = REMINDER_OFFSET_OPTIONS.find((option) => option.value === minutes)
  if (preset) return preset.label
  if (minutes % 1440 === 0) {
    const days = minutes / 1440
    return `${days} ${days === 1 ? 'day' : 'days'} before`
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} before`
  }
  return `${minutes} minutes before`
}

export type ModuleAvailability = {
  enabled: BusinessModuleDetail[]
  /** Entitled but not covered by an active subscription, or explicitly off. */
  disabled: BusinessModuleDetail[]
  /** Convenience: the enabled module keys. */
  enabledKeys: string[]
}

/**
 * Split the module catalog into what the business can use and what it cannot.
 * `hasAccess` is the effective flag (enabled AND covered by an active
 * subscription), which is what a "can I open this screen?" question needs.
 */
export function splitModules(modules: readonly BusinessModuleDetail[]): ModuleAvailability {
  const enabled: BusinessModuleDetail[] = []
  const disabled: BusinessModuleDetail[] = []

  for (const module of modules) {
    if (module.hasAccess) enabled.push(module)
    else disabled.push(module)
  }

  return { enabled, disabled, enabledKeys: enabled.map((module) => module.key) }
}

export type PermissionArea = {
  id: string
  area: string
  count: number
}

/**
 * Group permission codes (`customers.view`) by their module prefix, using the
 * module names the API returned so the label matches the rest of the console.
 */
export function groupPermissionsByArea(
  permissions: readonly string[],
  moduleNames: ReadonlyMap<string, string>,
): PermissionArea[] {
  const counts = new Map<string, number>()

  for (const code of permissions) {
    const dot = code.indexOf('.')
    const area = dot > 0 ? code.slice(0, dot) : code
    counts.set(area, (counts.get(area) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([key, count]) => ({
      id: key,
      area: moduleNames.get(key) ?? humanizeKey(key),
      count,
    }))
    .sort((left, right) => left.area.localeCompare(right.area))
}

/**
 * Human label for the backend persona. The `Business` persona *is* the
 * business owner — the console labels it "Owner" so the access summary reads
 * the way the person thinks about themselves. The value itself always comes
 * from the server; only its presentation is decided here.
 */
export function roleLabel(role: string): string {
  return role === 'Business' ? 'Owner' : role
}
