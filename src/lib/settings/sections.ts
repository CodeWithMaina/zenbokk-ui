import { Bell, Building2, LifeBuoy, Settings2, ShieldCheck, UserRound, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The Settings sections, as data.
 *
 * Same idea as `lib/navigation/config.ts`: the tab list is declared once and
 * the shell renders it, so adding a section is one entry here plus its panel in
 * the route — never a second hardcoded list inside a component.
 */
export type SettingsSectionId =
  | 'profile'
  | 'business'
  | 'payments'
  | 'preferences'
  | 'notifications'
  | 'security'
  | 'support'

export const SETTINGS_SECTIONS: readonly {
  id: SettingsSectionId
  label: string
  icon: LucideIcon
}[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'business', label: 'Business', icon: Building2 },
  // Payments sits with the business settings because it is business configuration —
  // the PayBill/Till a customer sends to, and the share of a booking collected up
  // front. Nothing here is a personal preference.
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'support', label: 'Support', icon: LifeBuoy },
]

export const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = SETTINGS_SECTIONS.map(
  (section) => section.id,
)

/** Narrows a URL search value to a real section id. */
export function isSettingsSection(value: unknown): value is SettingsSectionId {
  return (
    typeof value === 'string' &&
    (SETTINGS_SECTION_IDS as readonly string[]).includes(value)
  )
}

/** Human label for a section, for the tab panel's accessible name. */
export function settingsSectionLabel(id: SettingsSectionId): string {
  return SETTINGS_SECTIONS.find((section) => section.id === id)?.label ?? id
}
