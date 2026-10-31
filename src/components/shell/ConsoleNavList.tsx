import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/cn'
import type { NavEntry, NavSection } from '../../lib/navigation'

/**
 * Sidebar / drawer navigation for every console.
 *
 * The list renders what the resolver produced — it holds no menu definitions and
 * makes no access decisions. `sections` is already filtered down to the modules
 * the business is entitled to and the permissions the caller holds, so hiding a
 * module in the backend removes it here with no frontend change.
 */

export type ConsoleNavListProps = {
  sections: readonly NavSection[]
  /** Called after a navigation, so the phone drawer can close. */
  onNavigate?: () => void
  className?: string
}

/** Does this entry own the current address? */
function isEntryActive(pathname: string, entry: NavEntry): boolean {
  if (!entry.to) return false
  const href = String(entry.to)
  return entry.exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

const rowClass = (active: boolean) =>
  cn(
    'flex min-w-0 flex-1 items-center gap-[0.65rem] rounded-md px-[0.7rem] py-[0.55rem] text-label no-underline transition-colors',
    'text-muted hover:bg-hover hover:text-fg',
    'focus-visible:outline-none focus-visible:shadow-ring',
    active && 'bg-selected font-semibold text-fg',
  )

function NavLink({
  entry,
  active,
  nested = false,
  onNavigate,
}: {
  entry: NavEntry
  active: boolean
  nested?: boolean
  onNavigate?: () => void
}) {
  const Icon = entry.icon

  return (
    <Link
      to={entry.to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={rowClass(active)}
    >
      <Icon
        className={cn(
          nested ? 'size-[0.95rem]' : 'size-[1.05rem]',
          'shrink-0',
          active ? 'text-accent' : 'text-subtle',
        )}
        aria-hidden="true"
      />
      <span className="min-w-0 truncate">{entry.label}</span>
    </Link>
  )
}

/**
 * One entry, plus its nested items when it has any.
 *
 * The parent stays a real link (it has its own page); the chevron is a separate
 * control, so expanding a group never navigates. A group whose child matches the
 * current address opens itself.
 */
function NavRow({
  entry,
  pathname,
  onNavigate,
}: {
  entry: NavEntry
  pathname: string
  onNavigate?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const children = entry.children ?? []
  const childActive = children.some((child) => isEntryActive(pathname, child))
  const showChildren = expanded || childActive
  const active = isEntryActive(pathname, entry)

  if (children.length === 0) {
    return <NavLink entry={entry} active={active} onNavigate={onNavigate} />
  }

  return (
    <div>
      <div className="flex items-center gap-[0.1rem]">
        {entry.to ? (
          <NavLink entry={entry} active={active} onNavigate={onNavigate} />
        ) : (
          // A pure group: it exists only to hold its children, so it renders as
          // a label rather than a link to nowhere.
          <span className="flex min-w-0 flex-1 items-center gap-[0.65rem] px-[0.7rem] py-[0.55rem] text-label text-muted">
            <entry.icon className="size-[1.05rem] shrink-0 text-subtle" aria-hidden="true" />
            <span className="min-w-0 truncate">{entry.label}</span>
          </span>
        )}
        <button
          type="button"
          aria-expanded={showChildren}
          aria-label={`${showChildren ? 'Hide' : 'Show'} ${entry.label} items`}
          onClick={() => setExpanded((value) => !value)}
          className="grid size-[1.9rem] shrink-0 place-items-center rounded-md text-subtle transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:shadow-ring"
        >
          <ChevronRight
            className={cn('size-[0.9rem] transition-transform', showChildren && 'rotate-90')}
            aria-hidden="true"
          />
        </button>
      </div>

      {showChildren ? (
        <ul className="m-0 mt-[0.1rem] ml-[1.35rem] flex list-none flex-col gap-[0.1rem] border-l border-line p-0 pl-[0.4rem]">
          {children.map((child) => (
            <li key={child.key}>
              <NavLink
                entry={child}
                active={isEntryActive(pathname, child)}
                nested
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function ConsoleNavList({ sections, onNavigate, className }: ConsoleNavListProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <nav className={cn('flex flex-col gap-[0.9rem]', className)} aria-label="Console">
      {sections.map((section) => (
        <div key={section.key} className="flex flex-col gap-[0.15rem]">
          <p className="px-[0.7rem] pb-[0.2rem] text-caption font-semibold uppercase tracking-wide text-subtle">
            {section.label}
          </p>
          {section.items.map((item) => (
            <NavRow key={item.key} entry={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  )
}
