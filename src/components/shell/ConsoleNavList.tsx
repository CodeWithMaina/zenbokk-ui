import { Link, useRouterState } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export type ConsoleNavItem = {
  to: LinkProps['to']
  label: string
  icon: LucideIcon
  /** Hide the entry entirely (e.g. the business is not entitled to the module). */
  hidden?: boolean
  /** Matches nested addresses too — off for "overview", on everywhere else. */
  exact?: boolean
}

export type ConsoleNavListProps = {
  items: readonly ConsoleNavItem[]
  /** Called after a navigation, so the phone drawer can close. */
  onNavigate?: () => void
  className?: string
}

/** Sidebar / drawer navigation shared by the owner, staff and admin consoles. */
export function ConsoleNavList({ items, onNavigate, className }: ConsoleNavListProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <nav className={cn('flex flex-col gap-[0.15rem]', className)}>
      {items
        .filter((item) => !item.hidden)
        .map((item) => {
          const href = String(item.to)
          const active = item.exact ? pathname === href : pathname.startsWith(href)

          return (
            <Link
              key={href}
              to={item.to}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-[0.65rem] rounded-md px-[0.7rem] py-[0.55rem] text-label no-underline transition-colors',
                'text-muted hover:bg-hover hover:text-fg',
                'focus-visible:outline-none focus-visible:shadow-ring',
                active && 'bg-selected font-semibold text-fg',
              )}
            >
              <item.icon
                className={cn('size-[1.05rem] shrink-0', active ? 'text-accent' : 'text-subtle')}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate">{item.label}</span>
            </Link>
          )
        })}
    </nav>
  )
}
