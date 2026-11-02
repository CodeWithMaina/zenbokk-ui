import { ThemeControl } from '../../theme'
import { SectionCard } from '../ui/card'
import { Note } from '../ui/note'

/**
 * Appearance preferences.
 *
 * The theme is owned by the app-wide `ThemeProvider`: changing it here applies
 * immediately and is persisted on the device (`zb-theme`), exactly as the shell
 * switcher does. No second theme implementation is introduced, and regional
 * preferences are shown as unavailable rather than as controls that do nothing —
 * the backend stores no locale, timezone, currency or date-format preference.
 */
export function PreferencesSettings() {
  return (
    <div className="flex flex-col gap-[1rem]">
      <SectionCard
        title="Appearance"
        description="Theme changes apply immediately and are saved on this device."
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-semibold">Theme</p>
            <p className="mt-[0.1rem] text-meta text-muted">Match your device or pick one</p>
          </div>
          <ThemeControl />
        </div>
      </SectionCard>

      <Note>
        Regional and date-format preferences aren’t available yet. Your theme choice is remembered
        on this device, and follows your system setting while “Device” is selected.
      </Note>
    </div>
  )
}
