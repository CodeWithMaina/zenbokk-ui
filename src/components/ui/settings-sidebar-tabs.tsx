import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export type SettingsTabItem = {
  id: string
  label: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  /** Shown as a count on the right of the label. */
  count?: number
  disabled?: boolean
}

export type SettingsSidebarTabsProps = {
  tabs: readonly SettingsTabItem[]
  activeId: string
  onSelect: (id: string) => void
  /** Accessible name for the tab list. */
  label?: string
  /** Shared panel id, e.g. `settings-panel`. */
  panelId?: string
  className?: string
}

/**
 * Settings section tabs: vertical on desktop, a scrollable row on phones.
 * Pair with a panel that has `id={panelId}` and `aria-labelledby`.
 */
export function SettingsSidebarTabs({
  tabs,
  activeId,
  onSelect,
  label = 'Settings sections',
  panelId,
  className,
}: SettingsSidebarTabsProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        '-mx-4 flex gap-[0.25rem] overflow-x-auto border-b border-line px-4 pb-[0.5rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'md:mx-0 md:flex-col md:gap-[0.15rem] md:border-0 md:px-0 md:pb-0',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            type="button"
            aria-current={active ? 'page' : undefined}
            aria-controls={panelId}
            disabled={tab.disabled}
            onClick={() => onSelect(tab.id)}
            className={cn(
              'flex shrink-0 items-center gap-[0.55rem] rounded-md px-[0.65rem] py-[0.55rem] text-left text-meta font-medium transition-colors',
              'focus-visible:shadow-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35',
              'md:w-full md:items-start',
              active
                ? 'bg-selected text-fg'
                : 'text-muted hover:bg-hover hover:text-fg',
            )}
          >
            {Icon ? (
              <Icon
                className={cn(
                  'mt-[0.1rem] size-[1rem] shrink-0',
                  active ? 'text-fg' : 'text-muted',
                )}
                aria-hidden="true"
              />
            ) : null}

            <span className="min-w-0 flex-1">
              <span className="block truncate whitespace-nowrap md:whitespace-normal">
                {tab.label}
              </span>
              {tab.description ? (
                <span className="mt-[0.1rem] hidden text-caption leading-snug text-muted md:block">
                  {tab.description}
                </span>
              ) : null}
            </span>

            {tab.count !== undefined ? (
              <span className="ml-auto hidden text-caption text-muted tabular md:block">
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}
