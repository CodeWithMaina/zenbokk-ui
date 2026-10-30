import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Tabs } from './tabs'
import type { TabsProps } from './tabs'

export type DetailTabsProps<T extends string> = Omit<
  TabsProps<T>,
  'variant'
> & {
  children: ReactNode
  panelClassName?: string
}

/**
 * Underline tabs plus the panel below them, as used on the client detail page.
 * The panel is keyed by value so the rise animation replays on each switch.
 */
export function DetailTabs<T extends string>({
  items,
  value,
  onValueChange,
  label,
  sticky,
  className,
  panelClassName,
  children,
}: DetailTabsProps<T>) {
  const active = items.find((item) => item.value === value)
  const activeLabel = typeof active?.label === 'string' ? active.label : undefined

  return (
    <div className={cn('min-w-0', className)}>
      <Tabs
        items={items}
        value={value}
        onValueChange={onValueChange}
        label={label}
        sticky={sticky}
      />
      <div
        key={value}
        role="tabpanel"
        aria-label={activeLabel}
        className={cn('animate-rise pt-[1.1rem]', panelClassName)}
      >
        {children}
      </div>
    </div>
  )
}
