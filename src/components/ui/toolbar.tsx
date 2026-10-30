import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ToolbarProps = {
  children: ReactNode
  className?: string
}

/** Horizontal group for search, filters and view switches. */
export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-[0.6rem]', className)}>
      {children}
    </div>
  )
}

export type ToolbarSpacerProps = {
  className?: string
}

/** Pushes the remaining toolbar items to the right. */
export function ToolbarSpacer({ className }: ToolbarSpacerProps) {
  return <span className={cn('flex-1', className)} aria-hidden="true" />
}
