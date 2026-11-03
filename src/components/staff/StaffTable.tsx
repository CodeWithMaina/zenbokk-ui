import type { MouseEvent, ReactNode } from 'react'
import { UsersRound } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { StaffMember } from '../../lib/api/types'
import {
  staffActivityDataStatus,
  staffActivityLabel,
  staffMembershipDataStatus,
  staffMembershipLabel,
  staffMembershipTone,
} from '../../lib/staff'
import { Avatar } from '../ui/avatar'
import { StatusPill } from '../ui/badge'
import { Checkbox } from '../ui/checkbox'
import { EmptyState } from '../ui/empty-state'
import { Menu } from '../ui/menu'
import type { MenuItem } from '../ui/menu'
import { attendancePresenceLabel, attendancePresenceStatus } from './StaffCard'
import type { StaffRow } from './StaffCard'

export type StaffTableProps = {
  rows: readonly StaffRow[]
  selectedIds?: ReadonlySet<string>
  onSelectedChange?: (id: string, selected: boolean) => void
  /** Header checkbox. Receives the requested "all" state. */
  onSelectAll?: (selected: boolean) => void
  onOpen?: (member: StaffMember) => void
  onEdit?: (member: StaffMember) => void
  onToggleActive?: (member: StaffMember) => void
  onResendInvite?: (member: StaffMember) => void
  canManage?: boolean
  /** Shows the attendance column; off when the module is not entitled. */
  showAttendance?: boolean
  label?: string
  empty?: ReactNode
  className?: string
}

/** The action menu for one roster row, built from the handlers the page supplied. */
function staffRowActions(
  row: StaffRow,
  handlers: Pick<StaffTableProps, 'onOpen' | 'onEdit' | 'onToggleActive' | 'onResendInvite' | 'canManage'>,
): MenuItem[] {
  const inactive = row.member.membershipStatus === 'Suspended' || row.member.membershipStatus === 'Left'
  const items: MenuItem[] = []

  if (handlers.onOpen) {
    items.push({ label: 'View profile', onSelect: () => handlers.onOpen?.(row.member) })
  }
  if (handlers.canManage && handlers.onEdit) {
    items.push({ label: 'Edit details', onSelect: () => handlers.onEdit?.(row.member) })
  }
  if (handlers.canManage && handlers.onResendInvite && row.member.membershipStatus === 'Invited') {
    items.push({ label: 'Resend invitation', onSelect: () => handlers.onResendInvite?.(row.member) })
  }
  if (handlers.canManage && handlers.onToggleActive && row.member.membershipStatus !== 'Invited') {
    items.push({
      label: inactive ? 'Activate' : 'Deactivate',
      destructive: !inactive,
      separatorBefore: true,
      onSelect: () => handlers.onToggleActive?.(row.member),
    })
  }

  return items
}

/**
 * The team as a table. The engagement column folds away on narrow screens; the
 * person, today's clock state and the membership status always remain.
 */
export function StaffTable({
  rows,
  selectedIds,
  onSelectedChange,
  onSelectAll,
  onOpen,
  onEdit,
  onToggleActive,
  onResendInvite,
  canManage = true,
  showAttendance = true,
  label = 'Staff',
  empty,
  className,
}: StaffTableProps) {
  const selectable = Boolean(selectedIds && onSelectedChange)
  const selectedCount = selectable ? rows.filter((row) => selectedIds?.has(row.member.userId)).length : 0
  const allSelected = rows.length > 0 && selectedCount === rows.length
  const someSelected = selectedCount > 0 && !allSelected
  const columnCount = (selectable ? 1 : 0) + (showAttendance ? 5 : 4)

  /** One row per teammate, or the empty state across every column. */
  function renderBody(): ReactNode {
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={columnCount} className="p-0">
            {empty ?? (
              <EmptyState
                icon={<UsersRound className="size-5" />}
                title="No teammates yet"
                description="Invite someone and they appear here once they join."
              />
            )}
          </td>
        </tr>
      )
    }

    return rows.map((row) => {
      const { member } = row
      const selected = Boolean(selectedIds?.has(member.userId))
      const presence = attendancePresenceLabel(row.attendanceState)
      const items = staffRowActions(row, { onOpen, onEdit, onToggleActive, onResendInvite, canManage })

      const handleRowClick = (event: MouseEvent<HTMLTableRowElement>) => {
        if (!onOpen) return
        if ((event.target as HTMLElement).closest('a, button, input, [role="checkbox"], [role="menu"]')) {
          return
        }
        onOpen(member)
      }

      return (
        <tr
          key={member.userId}
          onClick={onOpen ? handleRowClick : undefined}
          className={cn(selected && 'bg-selected', onOpen && 'cursor-pointer')}
        >
          {selectable ? (
            <td className="w-[2.4rem]">
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectedChange?.(member.userId, checked)}
                label={`Select ${member.fullName}`}
              />
            </td>
          ) : null}

          <td>
            <div className="flex min-w-0 items-center gap-[0.7rem]">
              <Avatar name={member.fullName} src={member.avatarUrl ?? undefined} size="sm" decorative />
              <div className="min-w-0">
                {onOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(member)}
                    className="block max-w-full truncate text-left font-semibold tracking-snug hover:underline focus-visible:shadow-ring focus-visible:outline-none"
                  >
                    {member.fullName}
                  </button>
                ) : (
                  <p className="truncate font-semibold tracking-snug">{member.fullName}</p>
                )}
                <span className="block truncate text-caption text-muted">
                  {member.positionName ?? member.email}
                </span>
              </div>
            </div>
          </td>

          {showAttendance ? (
            <td className="hidden sm:table-cell">
              {presence ? (
                <StatusPill status={attendancePresenceStatus(row.attendanceState)}>{presence}</StatusPill>
              ) : (
                <span className="text-muted">—</span>
              )}
            </td>
          ) : null}

          <td>
            <StatusPill
              status={staffMembershipDataStatus(member.membershipStatus)}
              tone={staffMembershipTone(member.membershipStatus)}
            >
              {staffMembershipLabel(member.membershipStatus)}
            </StatusPill>
          </td>

          <td className="hidden md:table-cell">
            <span className="flex flex-col items-start gap-[0.15rem]">
              <StatusPill status={staffActivityDataStatus(member)}>{staffActivityLabel(member)}</StatusPill>
              <span className="text-caption text-muted tabular">
                {member.appointmentsLast7d ?? 0} bookings · {member.stampsLast7d ?? 0} stamps
              </span>
            </span>
          </td>

          <td className="w-[3rem] text-right">
            {items.length > 0 ? (
              <Menu items={items} triggerLabel={`Actions for ${member.fullName}`} />
            ) : null}
          </td>
        </tr>
      )
    })
  }

  return (
    <table className={cn('table', className)} aria-label={label}>
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr>
          {selectable ? (
            <th scope="col" className="w-[2.4rem]">
              {onSelectAll ? (
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={() => onSelectAll(!allSelected)}
                  label="Select all staff on this page"
                />
              ) : (
                <span className="sr-only">Select</span>
              )}
            </th>
          ) : null}
          <th scope="col">Teammate</th>
          {showAttendance ? (
            <th scope="col" className="hidden sm:table-cell">
              Today
            </th>
          ) : null}
          <th scope="col">Status</th>
          <th scope="col" className="hidden md:table-cell">
            This week
          </th>
          <th scope="col" className="w-[3rem]">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>{renderBody()}</tbody>
    </table>
  )


}
