import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './button'

export type BulkActionBarProps = {
  selectedCount: number
  /** Noun shown after the count, e.g. `selected` or `clients selected`. */
  itemLabel?: string
  onClear: () => void
  clearLabel?: string
  /** Message, export and other actions for the current selection. */
  actions?: ReactNode
  label?: string
  className?: string
}

/**
 * Floating bulk-action dock from the Clients design. Keep it mounted while a
 * selection exists; it renders nothing for an empty selection.
 */
export function BulkActionBar({
  selectedCount,
  itemLabel = 'selected',
  onClear,
  clearLabel = 'Clear selection',
  actions,
  label = 'Bulk actions',
  className,
}: BulkActionBarProps) {
  if (selectedCount <= 0) return null

  return (
    <div
      role="toolbar"
      aria-label={label}
      className={cn(
        'fixed inset-x-0 bottom-[calc(1.2rem+env(safe-area-inset-bottom,0px))] z-20 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-[0.5rem] rounded-xl bg-inverse px-[0.7rem] py-[0.55rem] text-on-inverse shadow-overlay',
        'max-sm:bottom-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:pb-[calc(0.55rem+env(safe-area-inset-bottom,0px))]',
        className,
      )}
    >
      <span className="px-[0.3rem] text-meta whitespace-nowrap">
        <b className="font-semibold tabular">{selectedCount}</b> {itemLabel}
      </span>

      {actions ? (
        <span className="flex min-w-0 flex-wrap items-center gap-[0.35rem]">
          {actions}
        </span>
      ) : null}

      <span className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        aria-label={clearLabel}
        onClick={onClear}
        className="text-on-inverse hover:bg-on-inverse/10 hover:text-on-inverse"
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
