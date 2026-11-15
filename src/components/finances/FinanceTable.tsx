import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/api/client'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/ui/empty-state'
import { Skeleton } from '../../components/ui/skeleton'

export type FinanceColumn = {
  key: string
  label: ReactNode
  /**
   * Responsive hiding and width, using the SAME utilities the Customers table uses
   * (`hidden md:table-cell`, `hidden lg:table-cell`, …). Columns fold away from the least
   * important end as the viewport narrows — the table is never simply shrunk or scrolled
   * sideways.
   */
  className?: string
  align?: 'left' | 'right'
}

export type FinanceTableProps<T> = {
  rows: readonly T[]
  columns: readonly FinanceColumn[]
  /** The `<td>`s for one row, in the same order as `columns`. */
  renderRow: (row: T, index: number) => ReactNode
  rowKey: (row: T) => string
  /** Accessible table name. */
  label: string
  onOpen?: (row: T) => void
  rowClassName?: (row: T) => string | undefined
  loading?: boolean
  empty?: ReactNode
  error?: unknown
  onRetry?: () => void
  /** Rows per skeleton row while loading. */
  skeletonRows?: number
  className?: string
}

/**
 * The shared Finance register.
 *
 * It is the Customers table (`ClientTable` / the `.table` recipe) adapted to money: the same
 * header treatment, row spacing, borders, hover state, empty state and loading skeleton, and the
 * same responsive strategy — secondary columns carry `hidden md:table-cell` and fall away as the
 * screen narrows rather than forcing a horizontal scroll. Every Finance table renders through this
 * component so a column added to the cashbook cannot invent a second visual language for the
 * ledger.
 *
 * The primary cell is always a link or button supplied by the caller, so a row is reachable by
 * keyboard; `onOpen` only adds the pointer affordance on top.
 */
export function FinanceTable<T>({
  rows,
  columns,
  renderRow,
  rowKey,
  label,
  onOpen,
  rowClassName,
  loading = false,
  empty,
  error,
  onRetry,
  skeletonRows = 5,
  className,
}: FinanceTableProps<T>) {
  if (error != null) {
    return (
      <Alert tone="danger" title="This register could not be loaded" className={className}>
        <p>{errorMessage(error)}</p>
        {onRetry ? (
          <Button className="mt-[0.6rem]" size="sm" onClick={onRetry}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Try again
          </Button>
        ) : null}
      </Alert>
    )
  }

  const cellClass = (column: FinanceColumn) =>
    cn(column.className, column.align === 'right' && 'text-right')

  return (
    <table className={cn('table', className)} aria-label={label}>
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className={cellClass(column)}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading && rows.length === 0 ? (
          Array.from({ length: skeletonRows }, (_, row) => (
            <tr key={`skeleton-${row}`}>
              {columns.map((column) => (
                <td key={column.key} className={cellClass(column)}>
                  <Skeleton className="h-[1rem] w-full max-w-[9rem]" />
                </td>
              ))}
            </tr>
          ))
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="p-0">
              {empty ?? (
                <EmptyState title="Nothing recorded yet" description="Movements appear here as soon as money moves." />
              )}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr
              key={rowKey(row)}
              className={cn(onOpen && 'cursor-pointer', rowClassName?.(row))}
              onClick={onOpen ? () => onOpen(row) : undefined}
            >
              {renderRow(row, index)}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

/** A cell that hides below a breakpoint, so column lists stay readable in the page. */
export function cellClass(hiddenFrom: 'never' | 'sm' | 'md' | 'lg' | 'xl', align?: 'right'): string {
  const hidden = hiddenFrom === 'never' ? '' : `hidden ${hiddenFrom}:table-cell`
  return cn(hidden, align === 'right' && 'text-right')
}
