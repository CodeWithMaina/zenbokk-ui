import { CalendarCheck2, Clock } from 'lucide-react'
import type { MouseEvent } from 'react'
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
import { Menu } from '../ui/menu'
import type { MenuItem } from '../ui/menu'

export type StaffRow = {
  member: StaffMember
  /** Today's clock state, when the attendance module is enabled. */
  attendanceState?: string | null
}

export type StaffCardProps = {
  row: StaffRow
  onOpen?: (member: StaffMember) => void
  onEdit?: (member: StaffMember) => void
  onToggleActive?: (member: StaffMember) => void
  onClock?: (member: StaffMember) => void
  onResendInvite?: (member: StaffMember) => void
  selected?: boolean
  onSelectedChange?: (selected: boolean) => void
  /** Hides the actions menu for callers without `staff.manage`. */
  canManage?: boolean
  className?: string
}

/** Today's clock state, in words. */
export function attendancePresenceLabel(state: string | null | undefined): string | null {
  if (!state) return null
  if (state === 'clocked_in') return 'Clocked in'
  if (state === 'clocked_out') return 'Clocked out'
  return 'Not clocked in'
}

/** Today's clock state, as a `[data-status]` value. */
export function attendancePresenceStatus(state: string | null | undefined): string {
  if (state === 'clocked_in') return 'active'
  if (state === 'clocked_out') return 'neutral'
  return 'pending'
}

/**
 * One member of the team, as the directory's card.
 *
 * The card states three separate things and never conflates them: the
 * *membership* (active / inactive / invited), today's *attendance* when that
 * module is on, and how *engaged* they have been (today / this week / idle).
 */
export function StaffCard({
  row,
  onOpen,
  onEdit,
  onToggleActive,
  onClock,
  onResendInvite,
  selected = false,
  onSelectedChange,
  canManage = true,
  className,
}: StaffCardProps) {
  const { member } = row
  const inactive = member.membershipStatus === 'Suspended' || member.membershipStatus === 'Left'
  const presence = attendancePresenceLabel(row.attendanceState)

  const items: MenuItem[] = []
  if (onOpen) items.push({ label: 'View profile', onSelect: () => onOpen(member) })
  if (canManage && onClock && !inactive) {
    items.push({
      label: row.attendanceState === 'clocked_in' ? 'Clock out' : 'Clock in',
      icon: <Clock className="size-3.5" />,
      onSelect: () => onClock(member),
    })
  }
  if (canManage && onEdit) {
    items.push({ label: 'Edit details', onSelect: () => onEdit(member) })
  }
  if (canManage && onResendInvite && member.membershipStatus === 'Invited') {
    items.push({ label: 'Resend invitation', onSelect: () => onResendInvite(member) })
  }
  if (canManage && onToggleActive && member.membershipStatus !== 'Invited') {
    items.push({
      label: inactive ? 'Activate' : 'Deactivate',
      destructive: !inactive,
      separatorBefore: true,
      onSelect: () => onToggleActive(member),
    })
  }

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (!onOpen) return
    if ((event.target as HTMLElement).closest('a, button, input, [role="checkbox"], [role="menu"]')) return
    onOpen(member)
  }

  return (
    <article
      onClick={onOpen ? handleCardClick : undefined}
      className={cn(
        'card min-w-0 p-[0.95rem]',
        onOpen && 'card-link',
        selected && 'border-accent bg-selected',
        className,
      )}
    >
      <div className="flex items-start gap-[0.7rem]">
        <Avatar name={member.fullName} src={member.avatarUrl ?? undefined} size="md" decorative />

        <div className="min-w-0 flex-1">
          {onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(member)}
              className="block max-w-full truncate text-left font-semibold tracking-snug hover:underline focus-visible:shadow-ring focus-visible:outline-none"
            >
              {member.fullName}
            </button>
          ) : (
            <p className="min-w-0 truncate font-semibold tracking-snug">{member.fullName}</p>
          )}
          <p className="mt-[0.1rem] truncate text-meta text-muted">
            {member.positionName ?? 'No job title yet'}
          </p>
          <p className="mt-[0.1rem] truncate text-caption text-subtle">{member.email}</p>
        </div>

        {onSelectedChange ? (
          <Checkbox
            checked={selected}
            onCheckedChange={onSelectedChange}
            label={`Select ${member.fullName}`}
            className="mt-[0.05rem]"
          />
        ) : null}
      </div>

      <div className="mt-[0.7rem] flex flex-wrap items-center gap-[0.4rem]">
        <StatusPill
          status={staffMembershipDataStatus(member.membershipStatus)}
          tone={staffMembershipTone(member.membershipStatus)}
        >
          {staffMembershipLabel(member.membershipStatus)}
        </StatusPill>

        {presence ? (
          <StatusPill status={attendancePresenceStatus(row.attendanceState)}>{presence}</StatusPill>
        ) : null}

        <StatusPill status={staffActivityDataStatus(member)}>{staffActivityLabel(member)}</StatusPill>
      </div>

      <div className="mt-[0.6rem] flex items-center justify-between gap-[0.6rem] text-caption text-muted">
        <span className="flex items-center gap-[0.3rem]">
          <CalendarCheck2 className="size-[0.85rem]" aria-hidden="true" />
          {member.appointmentsToday} today · {member.stampsToday ?? 0} stamps
        </span>

        {items.length > 0 ? (
          <Menu items={items} triggerLabel={`Actions for ${member.fullName}`} />
        ) : null}
      </div>
    </article>
  )
}
