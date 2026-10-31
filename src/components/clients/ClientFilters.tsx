import { cn } from '../../lib/cn'
import type { ClientStatusCounts } from '../../lib/clients/api'
import {
  CLIENT_STATUS_FILTERS,
  clientStatusLabel,
} from '../../lib/clients/mappers'
import type { ClientStatusFilter } from '../../lib/clients/mappers'
import { Chip, ChipGroup } from '../ui/chip'

export type ClientFiltersProps = {
  value: ClientStatusFilter
  onValueChange: (value: ClientStatusFilter) => void
  /** Server counts per status; omitted while they load. */
  counts?: ClientStatusCounts
  className?: string
}

/**
 * Status chips from the Clients design.
 *
 * The vocabulary is the backend's own enrollment statuses (`active | left |
 * blocked`) plus All — Punched has no `pending` enrollment state, so no chip
 * offers one. Each count is the server's `totalCount` for that filter, so a
 * chip can never disagree with the list it opens.
 */
export function ClientFilters({
  value,
  onValueChange,
  counts,
  className,
}: ClientFiltersProps) {
  return (
    <ChipGroup
      label="Client status"
      className={cn(
        'flex-nowrap overflow-x-auto pb-[0.2rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {CLIENT_STATUS_FILTERS.map((filter) => (
        <Chip
          key={filter}
          pressed={filter === value}
          onPressedChange={() => onValueChange(filter)}
          count={counts ? counts[filter] : undefined}
          className="shrink-0"
        >
          {clientStatusLabel(filter)}
        </Chip>
      ))}
    </ChipGroup>
  )
}
