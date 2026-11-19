import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Checkbox } from '../ui/checkbox'
import { EmptyState } from '../ui/empty-state'
import { Menu, type MenuItem } from '../ui/menu'
import { Skeleton } from '../ui/skeleton'

export type FinanceColumn<T> = {
  id: string
  header: ReactNode
  /** Keep the column visible only from this breakpoint up (Zenbokk folds columns, it does not swap to cards). */
  hideBelow?: 'sm' | 'md' | 'lg'
  align?: 'right'
  render: (row: T) => ReactNode
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
}

const hideClass = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const

/** Native Zenbokk table (`.table` recipe) with optional bulk selection and row actions. */
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
}: FinanceTableProps<T>) {
  const selectable = Boolean(selected && onToggleRow)
  const allOnPage = selectable && rows.length > 0 && rows.every((row) => selected?.has(rowId(row)))
  const someOnPage = selectable && rows.some((row) => selected?.has(rowId(row)))
  const columnCount = (selectable ? 1 : 0) + columns.length + (rowMenuItems ? 1 : 0)

  return (
    <div className="relative overflow-x-auto">
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
                className={cn(column.hideBelow && hideClass[column.hideBelow], column.align === 'right' && 'text-right')}
              >
                {column.header}
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
              const openable = Boolean(onOpen) && (isOpenable ? isOpenable(row) : true)
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
