import type { ReactNode } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { FilterDrawer, FilterSummary } from '../../components/ui/filter-drawer'
import type { AppliedFilter } from '../../components/ui/filter-drawer'
import { SearchField } from '../../components/ui/search-field'

export type FinanceFilterBarProps = {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  /**
   * How many filters are set INSIDE the drawer (the search box is separate, because it is always
   * visible). Shown on the trigger so nobody has to open the drawer to find out why the numbers
   * look wrong.
   */
  activeCount: number
  drawerOpen: boolean
  onDrawerOpenChange: (open: boolean) => void
  /** Clears every filter, including the search box. */
  onClear: () => void
  /** The applied filters, rendered as removable chips next to the table. */
  chips: readonly AppliedFilter[]
  /** Extra toolbar controls (a direction switch, a period picker, …). */
  extra?: ReactNode
  /** The controls inside the drawer. */
  children: ReactNode
  resultSummary?: ReactNode
  drawerTitle?: string
  drawerDescription?: string
  className?: string
}

/**
 * The one filter toolbar every Finance register uses.
 *
 * Filters live in a drawer (a bottom sheet on phones, courtesy of the shared `Drawer`) rather than
 * in a permanent row above the table, so the default view is the money and nothing else. What IS
 * permanent is the small set of applied-filter chips under the toolbar: a filter nobody can see is
 * a filter that makes the figures look wrong.
 */
export function FinanceFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  activeCount,
  drawerOpen,
  onDrawerOpenChange,
  onClear,
  chips,
  extra,
  children,
  resultSummary,
  drawerTitle = 'Filters',
  drawerDescription = 'Narrow the register down. Everything is applied on the server.',
  className,
}: FinanceFilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-[0.7rem]', className)}>
      <Card className="p-[0.8rem]">
        <div className="flex flex-wrap items-center gap-[0.6rem]">
          <SearchField
            label={searchPlaceholder}
            value={search}
            placeholder={searchPlaceholder}
            onChange={(event) => onSearchChange(event.target.value)}
            className="min-w-[12rem] flex-1"
          />

          {extra}

          <Button
            onClick={() => onDrawerOpenChange(true)}
            aria-haspopup="dialog"
            className="shrink-0"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
            {activeCount > 0 ? (
              <span className="ml-[0.3rem] inline-flex h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-pill bg-inverse px-[0.4rem] text-[0.75rem] font-semibold text-on-inverse">
                {activeCount}
              </span>
            ) : null}
          </Button>
        </div>
      </Card>

      <FilterSummary filters={chips} onClearAll={onClear} summary={resultSummary} />

      <FilterDrawer
        open={drawerOpen}
        onClose={() => onDrawerOpenChange(false)}
        title={drawerTitle}
        description={drawerDescription}
        onReset={onClear}
        resetLabel="Clear filters"
        applyLabel="Show results"
      >
        {children}
      </FilterDrawer>
    </div>
  )
}
