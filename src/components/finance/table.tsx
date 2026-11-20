import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Checkbox } from '../ui/checkbox'
import { EmptyState } from '../ui/empty-state'
import { Menu, type MenuItem } from '../ui/menu'
import { Skeleton } from '../ui/skeleton'

export type FinanceSortGroup = 'date' | 'amount' | 'name'

export type FinanceColumn<T> = {
  id: string
  header: ReactNode
  /** Keep the column visible only from this breakpoint up (Zenbokk folds columns, it does not swap to cards). */
  hideBelow?: 'sm' | 'md' | 'lg'
  align?: 'right'
  render: (row: T) => ReactNode
  /**
   * Makes the header a sort control for this family (`date`, `amount`, `name`). The page owns the
   * direction, so the header only says "order by this" — clicking it again reverses the order.
   */
  sortGroup?: FinanceSortGroup
}

/**
 * One row as the reference's phone/tablet card: a status-coloured left edge, a leading glyph, a
 * title and subtitle, the amount on the right, two ticket fields and a footer.
 */
export type FinanceCardData = {
  /** `ok` / `warning` / `danger` / `neutral`, rendered as the card's left edge. */
  tone: 'ok' | 'warning' | 'danger' | 'neutral'
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  amount?: ReactNode
  /** Small line under the amount (e.g. "in", "out"). */
  amountHint?: ReactNode
  /** The two dashes of the ticket: a code and where it came from. */
  fields?: readonly { label: ReactNode; value: ReactNode }[]
  footer?: ReactNode
}

export type FinanceTableProps<T> = {
  rows: readonly T[]
  rowId: (row: T) => string
  columns: readonly FinanceColumn<T>[]
  selected?: ReadonlySet<string>
  onToggleRow?: (id: string) => void
  onTogglePage?: (selectAll: boolean) => void
  rowMenuItems?: (row: T) => readonly MenuItem[]
  onOpen?: (row: T) => void
  /** Restrict which rows are clickable when onOpen is provided. Defaults to all. */
  isOpenable?: (row: T) => boolean
  isVoided?: (row: T) => boolean
  ariaLabel: string
  empty?: ReactNode
  /** When supplied, rows also render as cards below `52rem` (and always in `cards` view). */
  card?: (row: T) => FinanceCardData
  /** `table` follows the viewport; `cards` is the reader's own choice and wins at every width. */
  view?: 'table' | 'cards'
  /** The order currently applied, so a sorted column can say so. */
  sortGroup?: FinanceSortGroup
  sortDirection?: 'asc' | 'desc'
  onSortGroup?: (group: FinanceSortGroup) => void
}

const hideClass = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const

const toneEdge = {
  ok: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
  neutral: 'border-l-line-strong',
} as const

function SortHeader({
  children,
  active,
  direction,
  align,
  onClick,
}: {
  children: ReactNode
  active: boolean
  direction: 'asc' | 'desc'
  align?: 'right'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-[0.3rem] text-[0.75rem] font-normal tracking-caps uppercase transition-colors hover:text-fg',
        align === 'right' && 'w-full justify-end',
      )}
    >
      {children}
      {active ? (
        direction === 'asc' ? (
          <ArrowUp className="size-[0.75rem]" aria-hidden="true" />
        ) : (
          <ArrowDown className="size-[0.75rem]" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown className="size-[0.75rem] opacity-40" aria-hidden="true" />
      )}
    </button>
  )
}


/** Native Zenbokk table (`.table` recipe) with bulk selection, sortable headers and card rows. */
export function FinanceTable<T>({
  rows,
  rowId,
  columns,
  selected,
  onToggleRow,
  onTogglePage,
  rowMenuItems,
  onOpen,
  isOpenable,
  isVoided = () => false,
  ariaLabel,
  empty,
  card,
  view = 'table',
  sortGroup,
  sortDirection = 'desc',
  onSortGroup,
}: FinanceTableProps<T>) {
  const selectable = Boolean(selected && onToggleRow)
  const allOnPage = selectable && rows.length > 0 && rows.every((row) => selected?.has(rowId(row)))
  const someOnPage = selectable && rows.some((row) => selected?.has(rowId(row)))
  const columnCount = (selectable ? 1 : 0) + columns.length + (rowMenuItems ? 1 : 0)

  const isOpenableRow = (row: T) => Boolean(onOpen) && (isOpenable ? isOpenable(row) : true)

  return (
    <div>
      <div
        className={cn(
          'relative overflow-x-auto',
          card && (view === 'cards' ? 'hidden' : 'max-[52rem]:hidden'),
        )}
      >
        <table className="table" aria-label={ariaLabel}>
          <caption className="sr-only">{ariaLabel}</caption>
          <thead>
            <tr>
              {selectable ? (
                <th scope="col" className="w-[2.4rem]">
                  <Checkbox
                    checked={allOnPage}
                    indeterminate={someOnPage && !allOnPage}
                    onCheckedChange={() => onTogglePage?.(!allOnPage)}
                    label="Select all on this page"
                  />
                </th>
              ) : null}
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={
                    column.sortGroup && sortGroup === column.sortGroup
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className={cn(column.hideBelow && hideClass[column.hideBelow], column.align === 'right' && 'text-right')}
                >
                  {column.sortGroup && onSortGroup ? (
                    <SortHeader
                      active={sortGroup === column.sortGroup}
                      direction={sortDirection}
                      align={column.align}
                      onClick={() => onSortGroup(column.sortGroup as FinanceSortGroup)}
                    >
                      {column.header}
                    </SortHeader>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
              {rowMenuItems ? (
                <th scope="col" className="w-[2.4rem]">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="p-0">
                  {empty ?? <EmptyState title="Nothing to show" description="Try a different filter or date range." />}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = rowId(row)
                const isSelected = selectable && Boolean(selected?.has(id))
                const openable = isOpenableRow(row)
                return (
                  <tr
                    key={id}
                    className={cn(isVoided(row) && 'opacity-60', isSelected && 'bg-selected', openable && 'cursor-pointer hover:bg-hover')}
                    onClick={openable ? () => onOpen?.(row) : undefined}
                  >
                    {selectable ? (
                      <td className="w-[2.4rem]" onClick={(event) => event.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => onToggleRow?.(id)} label="Select row" />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(column.hideBelow && hideClass[column.hideBelow], column.align === 'right' && 'text-right')}
                      >
                        {column.render(row)}
                      </td>
                    ))}
                    {rowMenuItems ? (
                      <td className="w-[2.4rem]" onClick={(event) => event.stopPropagation()}>
                        <Menu items={rowMenuItems(row)} triggerLabel="Actions" />
                      </td>
                    ) : null}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>


      {card ? (
        <div
          className={cn(
            'grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-[0.7rem]',
            view === 'cards' ? '' : 'min-[52rem]:hidden',
          )}
        >
          {rows.length === 0 ? (
            <div className="col-span-full">
              {empty ?? <EmptyState title="Nothing to show" description="Try a different filter or date range." />}
            </div>
          ) : (
            rows.map((row) => {
              const id = rowId(row)
              const data = card(row)
              const isSelected = selectable && Boolean(selected?.has(id))
              const openable = isOpenableRow(row)
              return (
                <article
                  key={id}
                  className={cn(
                    'flex flex-col gap-[0.8rem] rounded-card border border-l-[0.25rem] border-line bg-surface p-[0.9rem]',
                    toneEdge[data.tone],
                    isSelected && 'border-accent bg-selected',
                    isVoided(row) && 'opacity-60',
                    openable && 'cursor-pointer',
                  )}
                  onClick={openable ? () => onOpen?.(row) : undefined}
                >
                  <div className="flex items-start gap-[0.7rem]">
                    {selectable ? (
                      <span onClick={(event) => event.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => onToggleRow?.(id)} label="Select row" />
                      </span>
                    ) : null}
                    {data.leading}
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{data.title}</span>
                      {data.subtitle ? <span className="block truncate text-meta text-muted">{data.subtitle}</span> : null}
                    </div>
                    {data.amount ? (
                      <div className="text-right leading-tight">
                        <span className="font-display text-[1.2rem] font-semibold tabular">{data.amount}</span>
                        {data.amountHint ? <small className="block text-caption text-muted">{data.amountHint}</small> : null}
                      </div>
                    ) : null}
                  </div>

                  {data.fields && data.fields.length > 0 ? (
                    <div className="grid grid-cols-2 overflow-hidden rounded-md border border-dashed border-line-strong bg-hover">
                      {data.fields.slice(0, 2).map((field, index) => (
                        <div
                          key={index}
                          className={cn('min-w-0 p-[0.55rem_0.7rem]', index > 0 && 'border-l border-dashed border-line-strong')}
                        >
                          <small className="block text-caption text-muted">{field.label}</small>
                          <span className="block truncate text-meta font-semibold">{field.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-[0.5rem]">
                    <div className="flex min-w-0 flex-wrap items-center gap-[0.4rem]">{data.footer}</div>
                    {rowMenuItems ? (
                      <span onClick={(event) => event.stopPropagation()}>
                        <Menu items={rowMenuItems(row)} triggerLabel="Actions" />
                      </span>
                    ) : null}
                  </div>
                </article>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}

/** Loading placeholder shaped like the native table. */
export function FinanceTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-[0.8rem] border-b border-line px-[1rem] py-[0.8rem] last:border-b-0">
          <Skeleton className="size-[1.2rem] rounded-xs" />
          <Skeleton className="size-[2.2rem] rounded-round" />
          <div className="flex-1 space-y-[0.35rem]">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-3 w-[4rem]" />
        </div>
      ))}
    </div>
  )
}
