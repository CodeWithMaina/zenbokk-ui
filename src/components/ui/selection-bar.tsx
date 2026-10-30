import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { LinkButton } from './button'

export type SelectionBarProps = {
  selectedCount: number
  /** Plural noun, e.g. `clients`. */
  itemLabel?: string
  onClear?: () => void
  clearLabel?: string
  actions?: ReactNode
  className?: string
}

/** Inline \"3 clients selected\" strip that sits above a table or card grid. */
export function SelectionBar({
  selectedCount,
  itemLabel = 'selected',
  onClear,
  clearLabel = 'Clear',
  actions,
  className,
}: SelectionBarProps) {
  return (
    <div
      role="status"
      className={cn(
        'mb-[0.6rem] flex min-h-[2.4rem] flex-wrap items-center gap-x-[0.7rem] gap-y-[0.4rem] px-[0.3rem] text-meta text-muted',
        className,
      )}
    >
      <span>
        <b className="font-semibold text-fg tabular">{selectedCount}</b>{' '}
        {itemLabel}
      </span>
      {onClear ? (
        <LinkButton
          onClick={onClear}
          className="py-[0.2rem] text-[0.85rem]"
        >
          {clearLabel}
        </LinkButton>
      ) : null}
      <span className="flex-1" />
      {actions}
    </div>
  )
}
