import { LayoutGrid, List, RefreshCw } from 'lucide-react'
import { Button } from '../ui/button'
import { SegmentedControl } from '../ui/segmented-control'
import { Toolbar, ToolbarSpacer } from '../ui/toolbar'
import { STAFF_SORT } from '../../lib/staff'
import type { StaffSort } from '../../lib/staff'

export type StaffView = 'cards' | 'table'

export type StaffToolbarProps = {
  view: StaffView
  onViewChange: (view: StaffView) => void
  sort: StaffSort
  onSortChange: (sort: StaffSort) => void
  onRefresh?: () => void
  refreshing?: boolean
  /** Extra controls (search field, filters button) supplied by the page. */
  children?: React.ReactNode
  className?: string
}

const SORT_LABELS: Record<StaffSort, string> = {
  name: 'Name (A–Z)',
  stamps: 'Most stamps',
  recent: 'Recently active',
  goal: 'Goal progress',
  added: 'Recently added',
}

/**
 * Search, sort and the layout switch for the roster.
 *
 * Sorting is a server-side concern: the value chosen here becomes the
 * endpoint's `sortBy`, so the order is the database's, not the browser's.
 */
export function StaffToolbar({
  view,
  onViewChange,
  sort,
  onSortChange,
  onRefresh,
  refreshing = false,
  children,
  className,
}: StaffToolbarProps) {
  return (
    <Toolbar className={className}>
      {children}

      <label className="flex items-center gap-[0.5rem] text-meta text-muted">
        <span className="max-sm:sr-only">Sort</span>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as StaffSort)}
          aria-label="Sort the team"
          className="h-control-sm min-h-0 rounded-md border border-line bg-surface px-[0.6rem] text-meta text-fg"
        >
          {(Object.keys(STAFF_SORT) as StaffSort[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <ToolbarSpacer />

      {onRefresh ? (
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          <span className="max-sm:sr-only">Refresh</span>
        </Button>
      ) : null}

      <SegmentedControl
        label="Layout"
        value={view}
        onValueChange={onViewChange}
        options={[
          { value: 'cards', label: 'Cards', icon: <LayoutGrid className="size-4" aria-hidden="true" /> },
          { value: 'table', label: 'Table', icon: <List className="size-4" aria-hidden="true" /> },
        ]}
      />
    </Toolbar>
  )
}
