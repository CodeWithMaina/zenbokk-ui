import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import {
  BusinessSettings,
  NotificationSettings,
  PaymentsSettings,
  PreferencesSettings,
  ProfileSettings,
  SecuritySettings,
  SettingsTabs,
  SupportSettings,
} from '../components/settings'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import { PageHeader } from '../components/ui/page-header'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import { isSettingsSection, settingsSectionLabel } from '../lib/settings'
import type { SettingsSectionId } from '../lib/settings'

/**
 * Settings — the six-section module (Profile, Business, Preferences,
 * Notifications, Security, Support).
 *
 * The route owns only what is genuinely page-level: the active section (in the
 * URL, so a refresh or a shared link keeps it) and the unsaved-changes guard.
 * Each section owns its own draft, validation and save boundary, so editing the
 * business profile can never persist a notification preference.
 */
/**
 * The active section lives in the URL so a refresh or a shared link keeps it.
 * The key is optional: an absent value renders Profile, so links elsewhere in
 * the console can point at `/dashboard/settings` without naming a section.
 */
type SettingsSearch = {
  section?: SettingsSectionId
}

function validateSearch(search: Record<string, unknown>): SettingsSearch {
  return isSettingsSection(search.section) ? { section: search.section } : {}
}

export const Route = createFileRoute('/dashboard/settings')({
  validateSearch,
  component: SettingsPage,
})

function SettingsPage() {
  const search = Route.useSearch()
  const section: SettingsSectionId = search.section ?? 'profile'
  const navigate = useNavigate()
  const { business } = useDashboardContext()

  const [dirty, setDirty] = useState(false)
  const [pendingSection, setPendingSection] = useState<SettingsSectionId | null>(null)

  // Sections report their own dirty state; the route only reacts to it.
  const handleDirtyChange = useCallback((next: boolean) => setDirty(next), [])

  // A dirty form should not be lost to a refresh, a tab close or a back-navigation.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const goTo = useCallback(
    (next: SettingsSectionId) => {
      void navigate({ to: '/dashboard/settings', search: { section: next }, replace: true })
    },
    [navigate],
  )

  // Switching sections unmounts the current one, which discards its draft — so a
  // dirty section is confirmed first instead of being thrown away silently.
  const select = useCallback(
    (next: SettingsSectionId) => {
      if (next === section) return
      if (dirty) {
        setPendingSection(next)
        return
      }
      goTo(next)
    },
    [dirty, goTo, section],
  )

  const openSupport = useCallback(() => select('support'), [select])

  const discardAndGo = () => {
    const next = pendingSection
    setPendingSection(null)
    setDirty(false)
    if (next) goTo(next)
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description={`Manage your profile, ${business.name}, and how Punched works for you.`}
      />

      <SettingsTabs active={section} onSelect={select} />

      <div
        id="settings-panel"
        role="tabpanel"
        aria-label={settingsSectionLabel(section)}
        className="mt-[1.3rem] min-w-0"
      >
        {section === 'profile' ? <ProfileSettings onDirtyChange={handleDirtyChange} /> : null}
        {section === 'business' ? (
          <BusinessSettings onOpenSupport={openSupport} onDirtyChange={handleDirtyChange} />
        ) : null}
        {section === 'payments' ? (
          <PaymentsSettings onDirtyChange={handleDirtyChange} />
        ) : null}
        {section === 'preferences' ? <PreferencesSettings /> : null}
        {section === 'notifications' ? (
          <NotificationSettings onDirtyChange={handleDirtyChange} />
        ) : null}
        {section === 'security' ? <SecuritySettings /> : null}
        {section === 'support' ? <SupportSettings /> : null}
      </div>

      <ConfirmDialog
        open={pendingSection !== null}
        title="Discard unsaved changes?"
        description="You have unsaved changes in this section. Moving on will discard them."
        confirmLabel="Discard changes"
        onConfirm={discardAndGo}
        onCancel={() => setPendingSection(null)}
      />
    </div>
  )
}
