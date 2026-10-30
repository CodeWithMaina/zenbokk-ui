import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type PermissionItem = {
  id: string
  area: ReactNode
  /** Compact count or level shown on the right, e.g. `(3)` or `Owner`. */
  level?: ReactNode
}

export type PermissionGridProps = {
  permissions: readonly PermissionItem[]
  label?: string
  className?: string
}

/**
 * Two-column permission summary used inside the Settings access disclosure.
 * Collapses to one column on phones.
 */
export function PermissionGrid({
  permissions,
  label = 'Permissions by area',
  className,
}: PermissionGridProps) {
  return (
    <ul
      aria-label={label}
      className={cn(
        'grid grid-cols-2 gap-x-[0.9rem] gap-y-0 text-meta max-sm:grid-cols-1',
        className,
      )}
    >
      {permissions.map((permission) => (
        <li
          key={permission.id}
          className="flex items-center justify-between gap-3 border-b border-line py-[0.35rem] last:border-b-0"
        >
          <span className="min-w-0 truncate">{permission.area}</span>
          {permission.level !== undefined ? (
            <span className="shrink-0 text-muted">{permission.level}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
