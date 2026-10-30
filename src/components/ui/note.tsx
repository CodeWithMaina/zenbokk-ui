import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type NoteProps = {
  children: ReactNode
  className?: string
}

/** Dashed informational note, e.g. "Stamps are shared across all services". */
export function Note({ children, className }: NoteProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-line px-[1.1rem] py-[0.9rem] text-meta text-muted',
        className,
      )}
    >
      {children}
    </div>
  )
}
