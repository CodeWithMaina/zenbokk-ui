import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type DescriptionListProps = {
  children: ReactNode
  className?: string
}

export function DescriptionList({ children, className }: DescriptionListProps) {
  return <dl className={cn('min-w-0', className)}>{children}</dl>
}

export type DescriptionRowProps = {
  label: ReactNode
  /** Secondary line under the label. */
  description?: ReactNode
  /** Right-hand value. `children` takes precedence. */
  value?: ReactNode
  children?: ReactNode
  /** Bold the label, as for a titled detail row. */
  emphasis?: boolean
  align?: 'center' | 'start'
  className?: string
}

/** Label/value row used in detail panels and settings summaries. */
export function DescriptionRow({
  label,
  description,
  value,
  children,
  emphasis = false,
  align = 'center',
  className,
}: DescriptionRowProps) {
  return (
    <div
      className={cn(
        'flex justify-between gap-4 border-b border-line py-[0.7rem] first:pt-0 last:border-0 last:pb-0',
        align === 'center' ? 'items-center' : 'items-start',
        className,
      )}
    >
      <dt className="min-w-0 text-muted">
        <span className={cn('block', emphasis && 'font-semibold text-fg')}>
          {label}
        </span>
        {description ? (
          <span className="mt-[0.1rem] block text-[0.85rem]">{description}</span>
        ) : null}
      </dt>
      <dd className="m-0 min-w-0 text-right font-semibold [overflow-wrap:anywhere]">
        {children ?? value}
      </dd>
    </div>
  )
}
