import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type EmptyStateProps = {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** Centered placeholder for empty tables, lists and galleries. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? (
        <div
          className="mb-3 grid size-11 place-items-center rounded-round bg-sunken text-muted"
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <p className="font-semibold">{title}</p>
      {description ? (
        <p className="mt-[0.2rem] max-w-[30rem] text-meta text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
