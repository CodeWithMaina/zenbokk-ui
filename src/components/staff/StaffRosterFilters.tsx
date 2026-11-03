import { cn } from '../../lib/cn'
import { STAFF_ROSTER_FILTERS, staffRosterFilterLabel } from '../../lib/staff'
import type { StaffRosterFilter } from '../../lib/staff'
import { Chip } from '../ui/chip'

export type StaffRosterFilterCounts = Partial<Record<StaffRosterFilter, number>>

export type StaffRosterFiltersProps = {
  value: StaffRosterFilter
  onValueChange: (value: StaffRosterFilter) => void
  /** Per-chip counts. Omit a key to render the chip without a number. */
  counts?: StaffRosterFilterCounts
  className?: string
}

/**
 * The roster's filter chips.
 *
 * The counts come from the same endpoints the list uses (the roster's own
 * `total` for a one-row page, and the invitation list for `invited`), so a chip
 * can never disagree with the list it opens.
 */
export function StaffRosterFilters({
  value,
  onValueChange,
  counts,
  className,
}: StaffRosterFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filter the team"
      className={cn(
        'flex gap-[0.5rem] overflow-x-auto py-[0.75rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {STAFF_ROSTER_FILTERS.map((filter) => (
        <Chip
          key={filter}
          pressed={value === filter}
          onPressedChange={() => onValueChange(filter)}
          count={counts?.[filter]}
        >
          {staffRosterFilterLabel(filter)}
        </Chip>
      ))}
    </div>
  )
}
