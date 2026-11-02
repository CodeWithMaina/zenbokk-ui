/**
 * Settings module: business profile, storefront address, module entitlements,
 * daily goal, appointment reminders and platform support.
 *
 * The notification matrix lives in `lib/notifications` (it is a user-scoped
 * preference, not a business setting).
 */
export { settingsApi, supportApi } from './api'
export {
  useSettingsBusiness,
  useSettingsModules,
  useSupportContact,
  useUpdateBusiness,
  useUpdateDailyGoal,
  useUpdateReminderPolicy,
  useUpdateSlug,
} from './use-settings'
export {
  NOTIFICATION_CATEGORY_DESCRIPTIONS,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
  REMINDER_OFFSET_OPTIONS,
  categoryLabel,
  channelLabel,
  groupPermissionsByArea,
  humanizeKey,
  offsetLabel,
  roleLabel,
  splitModules,
} from './catalog'
export type { ModuleAvailability, PermissionArea } from './catalog'
export {
  SETTINGS_SECTIONS,
  SETTINGS_SECTION_IDS,
  isSettingsSection,
  settingsSectionLabel,
} from './sections'
export type { SettingsSectionId } from './sections'
