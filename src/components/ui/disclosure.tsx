import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type DisclosureProps = {
  summary: ReactNode
  children: ReactNode
  /** Start expanded. */
  defaultOpen?: boolean
  className?: string
  contentClassName?: string
}

/**
 * Native `<details>` disclosure — no JS state, keyboard accessible by default.
 * Used for advanced options inside drawers.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
  contentClassName,
}: DisclosureProps) {
  return (
    <details className={cn('group', className)} open={defaultOpen}>
      <summary className="flex min-h-[2.4rem] cursor-pointer list-none items-center gap-[0.3rem] text-[0.9rem] font-semibold text-link [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-200 group-open:rotate-90"
        >
          ▸
        </span>
        {summary}
      </summary>
      <div className={cn('pt-[0.6rem]', contentClassName)}>{children}</div>
    </details>
  )
}
