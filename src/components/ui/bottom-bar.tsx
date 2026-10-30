import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BottomBarProps = {
  children: ReactNode
  /** Accessible name for the bar; omit for plain actions. */
  label?: string
  className?: string
}

/**
 * Phone-only fixed action bar (safe-area aware). Hidden from `md` up, where
 * the same actions live in the page header or a sidebar. The `.page` recipe
 * leaves enough bottom padding for it.
 */
export function BottomBar({ children, label, className }: BottomBarProps) {
  return (
    <div
      {...(label ? { role: 'navigation', 'aria-label': label } : {})}
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden',
        className,
      )}
    >
      <div className="flex items-center gap-[0.5rem] px-4 py-[0.55rem]">
        {children}
      </div>
    </div>
  )
}
