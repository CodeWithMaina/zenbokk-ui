import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clamp } from '../../lib/format'
import { cn } from '../../lib/cn'
import { Button } from './button'

export type PageItem = number | 'gap'

/**
 * Page numbers with ellipses, e.g. `1 2 … 5 6 7 … 12`.
 * Exported so tables and custom pagers can share the same sequence.
 */
export function getPageItems(page: number, pageCount: number): PageItem[] {
  const total = Math.max(1, Math.floor(pageCount))
  const current = clamp(Math.floor(page), 1, total)

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const items: PageItem[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) items.push('gap')
  for (let value = start; value <= end; value += 1) items.push(value)
  if (end < total - 1) items.push('gap')
  items.push(total)

  return items
}

export type PaginationBarProps = {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** Enables the rows-per-page control when both size props are supplied. */
  pageSize?: number
  pageSizeOptions?: readonly number[]
  onPageSizeChange?: (pageSize: number) => void
  className?: string
}

/** Rows-per-page control, page numbers and "Page 1 of 4" summary. */
export function PaginationBar({
  page,
  pageCount,
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 25, 50],
  onPageSizeChange,
  className,
}: PaginationBarProps) {
  const total = Math.max(1, Math.floor(pageCount))
  const current = clamp(Math.floor(page), 1, total)
  const items = getPageItems(current, total)
  const showSizes =
    pageSize !== undefined &&
    pageSizeOptions.length > 0 &&
    onPageSizeChange !== undefined

  const goTo = (next: number) => {
    const safe = clamp(next, 1, total)
    if (safe !== current) onPageChange(safe)
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-[0.8rem]',
        'max-sm:flex-col max-sm:items-stretch',
        className,
      )}
    >
      {showSizes ? (
        <label className="flex items-center gap-[0.6rem] text-meta text-muted">
          Rows
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Rows per page"
            className="h-control-sm min-h-0 rounded-md border border-line bg-surface px-[0.6rem] text-meta text-fg"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span />
      )}

      <nav
        aria-label="Pagination"
        className="flex items-center gap-[0.2rem] rounded-lg border border-line bg-surface p-[0.25rem] max-sm:justify-center"
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous page"
          disabled={current <= 1}
          onClick={() => goTo(current - 1)}
          className="size-[2.3rem] rounded-sm"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>

        {items.map((item, index) =>
          item === 'gap' ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-[0.2rem] text-meta text-muted"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === current ? 'page' : undefined}
              onClick={() => goTo(item)}
              className={cn(
                'inline-flex h-[2.3rem] min-w-[2.3rem] items-center justify-center rounded-sm px-[0.4rem] text-meta font-semibold transition-colors',
                item === current
                  ? 'bg-inverse text-on-inverse'
                  : 'text-muted hover:bg-hover hover:text-fg',
              )}
            >
              {item}
            </button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon"
          aria-label="Next page"
          disabled={current >= total}
          onClick={() => goTo(current + 1)}
          className="size-[2.3rem] rounded-sm"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </nav>

      <p className="text-meta text-muted max-sm:text-center">
        Page <b className="font-semibold text-fg">{current}</b> of {total}
      </p>
    </div>
  )
}
