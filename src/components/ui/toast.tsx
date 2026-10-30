import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ToastProps = {
  open: boolean
  children: ReactNode
  action?: ReactNode
  className?: string
}

/**
 * Controlled toast. Keep it mounted and toggle `open` so the slide/fade
 * transition can play both ways.
 */
export function Toast({ open, children, action, className }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-hidden={!open || undefined}
      className={cn('toast', open && 'is-on', className)}
    >
      <span className="min-w-0">{children}</span>
      {action ? <span className="shrink-0">{action}</span> : null}
    </div>
  )
}
