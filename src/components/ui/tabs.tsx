import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type TabItem<T extends string> = {
  value: T
  label: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  disabled?: boolean
}

export type TabsVariant = 'underline' | 'sidebar'

export type TabsProps<T extends string> = {
  items: readonly TabItem<T>[]
  value: T
  onValueChange: (value: T) => void
  variant?: TabsVariant
  /** Accessible name for the tab list. */
  label?: string
  /** Keep an underline tab bar pinned while the page scrolls. */
  sticky?: boolean
  className?: string
}

/**
 * Two tab treatments from the designs:
 * - `underline`: the client detail tab bar (scrolls horizontally)
 * - `sidebar`: the settings navigation (vertical on desktop, scrolls on mobile)
 *
 * Arrow keys, Home and End move and activate tabs.
 */
export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  variant = 'underline',
  label,
  sticky = false,
  className,
}: TabsProps<T>) {
  const isSidebar = variant === 'sidebar'

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = isSidebar
      ? ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
      : ['ArrowLeft', 'ArrowRight', 'Home', 'End']

    if (!keys.includes(event.key)) return

    const current = (event.target as HTMLElement).closest<HTMLButtonElement>(
      '[role="tab"]',
    )
    if (!current) return

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)',
      ),
    )
    if (tabs.length === 0) return

    const index = tabs.indexOf(current)
    if (index === -1) return

    event.preventDefault()

    let nextIndex = index
    if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = tabs.length - 1
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % tabs.length
    } else {
      nextIndex = (index - 1 + tabs.length) % tabs.length
    }

    const nextTab = tabs[nextIndex]
    nextTab.focus()
    const nextValue = nextTab.dataset.value
    if (nextValue) onValueChange(nextValue as T)
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        isSidebar
          ? 'flex flex-col gap-[0.2rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-lg:sticky max-lg:top-[env(safe-area-inset-top)] max-lg:z-[5] max-lg:flex-row max-lg:overflow-x-auto max-lg:border-b max-lg:border-line max-lg:bg-bg max-lg:py-[0.5rem] lg:sticky lg:top-[calc(1.5rem+env(safe-area-inset-top))]'
          : 'flex gap-[1.4rem] overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        !isSidebar && sticky && 'sticky top-[env(safe-area-inset-top)] z-[5] bg-bg',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={undefined}
            tabIndex={active ? 0 : -1}
            data-value={item.value}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            className={cn(
              'focus-visible:shadow-ring focus-visible:outline-none',
              isSidebar
                ? 'flex min-h-[2.7rem] items-center gap-[0.8rem] whitespace-nowrap rounded-md px-[0.9rem] text-left font-semibold text-muted transition-colors hover:bg-hover hover:text-fg disabled:cursor-not-allowed disabled:opacity-40'
                : '-mb-px inline-flex min-h-[2.7rem] items-center gap-[0.4rem] whitespace-nowrap border-b-2 border-transparent font-semibold text-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-40',
              active &&
                (isSidebar
                  ? 'bg-avatar-1 text-avatar-1-ink hover:bg-avatar-1 hover:text-avatar-1-ink'
                  : 'border-fg text-fg'),
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined ? (
              <span className="inline-flex h-[1.3rem] min-w-[1.3rem] items-center justify-center rounded-pill bg-neutral-soft px-[0.45rem] text-[0.75rem] font-normal">
                {item.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
