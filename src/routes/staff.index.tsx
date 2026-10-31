import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { StaffAppointmentList } from '../components/staff/StaffAppointmentList'
import { Alert } from '../components/ui/alert'
import { SectionCard } from '../components/ui/card'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { Progress } from '../components/ui/progress'
import { Skeleton } from '../components/ui/skeleton'
import { errorMessage } from '../lib/api/client'
import { useAuth } from '../lib/auth'
import { endOfDayIso, firstName, formatNumber, formatTime, startOfDayIso } from '../lib/format'
import { useStaffAnalytics, useStaffConsoleAppointments } from '../lib/staff/use-staff'

export const Route = createFileRoute('/staff/')({
  component: StaffToday,
})

/** The staff member's own day: goal progress, today's bookings and recent activity. */
function StaffToday() {
  const { user } = useAuth()
  const analytics = useStaffAnalytics()
  const today = useStaffConsoleAppointments({
    from: startOfDayIso(),
    to: endOfDayIso(),
    sort: 'scheduledAt',
    pageSize: 50,
  })

  const appointments = today.data?.items ?? []
  const goal = analytics.data?.dailyGoal ?? null
  const goalType = analytics.data?.dailyGoalType ?? 'stamps'
  const goalValue =
    goalType === 'appointments'
      ? (analytics.data?.appointmentsToday ?? 0)
      : (analytics.data?.stampsToday ?? 0)

  const metrics: { value: number; label: string }[] = [
    { value: analytics.data?.stampsToday ?? 0, label: 'Stamps today' },
    { value: analytics.data?.appointmentsToday ?? 0, label: 'Appointments today' },
    { value: analytics.data?.totalCustomers ?? 0, label: 'Customers served' },
    { value: analytics.data?.rewardReadyCount ?? 0, label: 'Rewards ready' },
  ]

  return (
    <div>
      <PageHeader
        title={`Today, ${firstName(user?.fullName)}`}
        description={analytics.data?.businessName ?? 'Your bookings and stamps for today.'}
        actions={
          <Link to="/staff/appointments" className="btn btn-ghost no-underline">
            All appointments
            <ArrowRight className="size-[0.9rem]" aria-hidden="true" />
          </Link>
        }
      />

      {analytics.isError ? (
        <Alert tone="danger">
          {errorMessage(analytics.error, 'We could not load your figures.')}{' '}
          <button
            type="button"
            className="link font-semibold"
            onClick={() => void analytics.refetch()}
          >
            Try again
          </button>
        </Alert>
      ) : (
        <MetricGrid
          items={metrics.map((metric) => ({
            value: analytics.isPending ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              formatNumber(metric.value)
            ),
            label: metric.label,
          }))}
        />
      )}

      <div className="mt-[1rem] grid gap-[1rem] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SectionCard
          title="Today's appointments"
          description="Confirm, complete or cancel as the day moves."
        >
          {today.isError ? (
            <Alert tone="warning">
              {errorMessage(today.error, 'Today’s bookings did not load.')}{' '}
              <button
                type="button"
                className="link font-semibold"
                onClick={() => void today.refetch()}
              >
                Try again
              </button>
            </Alert>
          ) : today.isPending ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-14 rounded-md" />
              <Skeleton className="h-14 rounded-md" />
              <Skeleton className="h-14 rounded-md" />
            </div>
          ) : (
            <StaffAppointmentList
              appointments={appointments}
              emptyTitle="Nothing booked today"
              emptyDescription="New bookings from the storefront appear here."
            />
          )}
        </SectionCard>

        <div className="flex flex-col gap-[1rem]">
          <SectionCard title="Daily goal">
            {analytics.isPending ? (
              <Skeleton className="h-16 rounded-md" />
            ) : goal ? (
              <>
                <Progress
                  value={goalValue}
                  max={goal}
                  label={`${goalType === 'appointments' ? 'Appointments' : 'Stamps'} today · ${formatNumber(goalValue)} / ${formatNumber(goal)}`}
                  showValue
                />
                <p className="mt-[0.6rem] text-caption text-subtle">
                  {goalValue >= goal
                    ? 'Goal reached — nice work.'
                    : `${formatNumber(goal - goalValue)} to go.`}
                </p>
              </>
            ) : (
              <p className="text-meta text-muted">
                No daily goal is set for you yet. An owner can set one from the staff console.
              </p>
            )}
          </SectionCard>

          <SectionCard title="Recent activity">
            {analytics.isPending ? (
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (analytics.data?.recentActivity.length ?? 0) === 0 ? (
              <p className="text-meta text-muted">No stamps or redemptions recorded yet.</p>
            ) : (
              <ul className="m-0 list-none divide-y divide-line p-0">
                {analytics.data?.recentActivity.map((entry, index) => (
                  <li
                    key={entry.activityId ?? `${entry.customerName}-${index}`}
                    className="flex items-start gap-[0.5rem] py-[0.55rem] first:pt-0 last:pb-0"
                  >
                    <Sparkles
                      className="mt-[0.15rem] size-[0.9rem] shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-meta">
                        <b className="font-semibold">{entry.customerName}</b>{' '}
                        {entry.activityType === 'redemption' ? 'redeemed a reward' : 'was stamped'}
                      </p>
                      <p className="text-caption text-muted">{formatTime(entry.stampedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
