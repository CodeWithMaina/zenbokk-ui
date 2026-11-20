import { Link } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import type { AppointmentDashboardItem, StaffMember } from '../../lib/api/types'
import { cn } from '../../lib/cn'
import { clockInZone } from '../../lib/dashboard/schedule'
import { formatNumber, pluralize } from '../../lib/format'
import { Avatar } from '../ui/avatar'
import { SectionCard } from '../ui/card'
import { EmptyState } from '../ui/empty-state'
import { Progress } from '../ui/progress'
import { Skeleton } from '../ui/skeleton'

export type TeamPanelProps = {
  staff: readonly StaffMember[]
  /** The day's appointments, used to say who is free, busy or done. */
  items: readonly AppointmentDashboardItem[]
  now: Date
  /** The business timezone the free/busy times are written in. */
  timeZone: string
  loading?: boolean
  className?: string
}

/** The bar is drawn against the day's appointment goal when the roster has one. */
function goalFor(member: StaffMember): number | null {
  return member.appointmentDailyGoalOverride ?? member.appointmentDailyGoal ?? null
}

/**
 * "Team right now": who is booked, who is free, and how each of them is tracking
 * against their own day.
 *
 * Every line is derived from the roster the Staff module owns plus that day's
 * appointments — the card keeps no separate notion of "on duty", so it cannot
 * disagree with the schedule beside it.
 */
export function TeamPanel({
  staff,
  items,
  now,
  timeZone,
  loading = false,
  className,
}: TeamPanelProps) {
  const withWork = staff.map((member) => {
    const mine = items
      .filter((item) => item.staffUserId === member.userId && item.status !== 'cancelled')
      .sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )
    const current = mine.find(
      (item) =>
        new Date(item.scheduledAt).getTime() <= now.getTime() &&
        now.getTime() < new Date(item.endAt).getTime(),
    )
    const next = mine.find((item) => new Date(item.scheduledAt).getTime() > now.getTime())

    const status = current
      ? `In service until ${clockInZone(current.endAt, timeZone)}`
      : next
        ? `Free until ${clockInZone(next.scheduledAt, timeZone)}`
        : mine.length > 0
          ? 'No more bookings today'
          : 'No bookings today'

    return { member, booked: mine.length, status }
  })

  const busiest = withWork.reduce((max, entry) => Math.max(max, entry.booked), 0)
  const onDuty = withWork.filter((entry) => entry.booked > 0).length

  const rows = [...withWork]
    .sort((a, b) => b.booked - a.booked || a.member.fullName.localeCompare(b.member.fullName))
    .slice(0, 6)

  return (
    <SectionCard
      icon={<Users />}
      iconTone="success"
      title="Team right now"
      description={loading ? 'Reading the roster…' : `${pluralize(onDuty, 'person', 'people')} on duty`}
      titleClassName="font-display font-normal"
      className={cn('p-[clamp(0.65rem,1vw,0.95rem)]', className)}
      contentClassName="mt-[0.6rem]"
      action={
        <Link to="/dashboard/staff" className="link text-meta font-semibold">
          Open staff
        </Link>
      }
    >
      {loading ? (
        <div className="grid gap-[0.5rem]" aria-busy="true" aria-label="Loading the team">
          <Skeleton className="h-[2.4rem] rounded-lg" />
          <Skeleton className="h-[2.4rem] rounded-lg" />
          <Skeleton className="h-[2.4rem] rounded-lg" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No staff on the roster yet"
          description="Invite your team and their day will appear here."
          action={
            <Link to="/dashboard/staff" className="btn btn-ghost no-underline">
              Open staff
            </Link>
          }
        />
      ) : (
        <ul className="dash-team">
          {rows.map(({ member, booked, status }) => {
            const goal = goalFor(member)
            const percent =
              goal && goal > 0
                ? Math.round((booked / goal) * 100)
                : busiest > 0
                  ? Math.round((booked / busiest) * 100)
                  : 0

            return (
              <li key={member.userId}>
                <Avatar name={member.fullName} src={member.avatarUrl ?? undefined} size="sm" decorative />
                <div className="min-w-0">
                  <b className="block text-label">{member.fullName}</b>
                  <small className="text-caption text-muted">{status}</small>
                </div>
                <div className="dash-team-stat">
                  <span>{goal && goal > 0 ? `${booked}/${goal}` : formatNumber(booked)}</span>
                  <Progress
                    value={percent}
                    ariaLabel={`${member.fullName}: ${formatNumber(booked)} bookings`}
                    className="[&>div]:h-[0.25rem]"
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
