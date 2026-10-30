import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button, LinkButton } from './button'
import { Chip } from './chip'
import { Drawer } from './drawer'

export type AppliedFilter = {
  id: string
  label: ReactNode
  onRemove?: () => void
}

export type FilterDrawerProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: ReactNode
  description?: ReactNode
  onReset?: () => void
  resetLabel?: string
  /** Usually the result count, e.g. `Show 4 services`. */
  applyLabel?: ReactNode
  onApply?: () => void
  applyDisabled?: boolean
  className?: string
  bodyClassName?: string
}

/**
 * Right-hand filter panel that becomes a bottom sheet on phones. Filters are
 * controlled by the page; this component owns the drawer chrome and footer.
 */
export function FilterDrawer({
  open,
  onClose,
  children,
  title = 'Filters',
  description = 'Narrow down the list.',
  onReset,
  resetLabel = 'Reset',
  applyLabel = 'Show results',
  onApply,
  applyDisabled = false,
  className,
  bodyClassName,
}: FilterDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      className={className}
      bodyClassName={bodyClassName}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <LinkButton
            onClick={onReset}
            disabled={!onReset}
            className="px-[0.2rem] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {resetLabel}
          </LinkButton>
          <Button
            variant="primary"
            disabled={applyDisabled}
            onClick={() => {
              onApply?.()
              onClose()
            }}
          >
            {applyLabel}
          </Button>
        </div>
      }
    >
      {children}
    </Drawer>
  )
}

export type FilterSummaryProps = {
  filters: readonly AppliedFilter[]
  onClearAll?: () => void
  clearLabel?: string
  /** Result count or other supporting copy shown below the chips. */
  summary?: ReactNode
  className?: string
}

/** Applied-filter chips and result count shown above a filtered list. */
export function FilterSummary({
  filters,
  onClearAll,
  clearLabel = 'Clear all',
  summary,
  className,
}: FilterSummaryProps) {
  if (filters.length === 0 && !summary) return null

  return (
    <div className={cn('flex flex-col gap-[0.45rem]', className)}>
      {filters.length > 0 ? (
        <div
          role="group"
          aria-label="Applied filters"
          className="flex flex-wrap items-center gap-[0.45rem]"
        >
          {filters.map((filter) => (
            <Chip
              key={filter.id}
              onRemove={filter.onRemove}
              removeLabel={`Remove filter ${String(filter.label)}`}
            >
              {filter.label}
            </Chip>
          ))}
          {onClearAll ? (
            <LinkButton
              onClick={onClearAll}
              className="py-[0.2rem] text-[0.85rem]"
            >
              {clearLabel}
            </LinkButton>
          ) : null}
        </div>
      ) : null}

      {summary ? (
        <p className="text-meta text-muted tabular">{summary}</p>
      ) : null}
    </div>
  )
}
