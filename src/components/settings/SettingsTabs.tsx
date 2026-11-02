import { SETTINGS_SECTIONS } from '../../lib/settings/sections'
import type { SettingsSectionId } from '../../lib/settings/sections'
import { Tabs } from '../ui/tabs'

export type SettingsTabsProps = {
  active: SettingsSectionId
  onSelect: (id: SettingsSectionId) => void
}

/**
 * Settings section tabs: a sticky, horizontally scrollable underline bar on
 * every breakpoint (the reference design's treatment), with arrow-key
 * navigation from the shared `Tabs` primitive. Icons collapse on very narrow
 * phones so the labels stay readable without scrolling past the active tab.
 */
export function SettingsTabs({ active, onSelect }: SettingsTabsProps) {
  return (
    <Tabs
      variant="underline"
      sticky
      label="Settings sections"
      value={active}
      onValueChange={onSelect}
      items={SETTINGS_SECTIONS.map((section) => {
        const Icon = section.icon
        return {
          value: section.id,
          label: section.label,
          icon: (
            <span className="hidden shrink-0 sm:inline-flex" aria-hidden="true">
              <Icon className="size-[1.15rem]" />
            </span>
          ),
        }
      })}
    />
  )
}

