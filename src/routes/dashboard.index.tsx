import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowUpRight, CalendarClock, Sparkles } from 'lucide-react'
import { Alert } from '../components/ui/alert'
import { StatusPill } from '../components/ui/badge'
import { Card, SectionCard } from '../components/ui/card'
import { EmptyState } from '../components/ui/empty-state'
import { MetricGrid } from '../components/ui/metric-tile'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import { useAuth } from '../lib/auth'
import { useOwnerConsole } from '../lib/dashboard/console-context'
import {
  appointmentStatusLabel,
  appointmentStatusTone,
} from '../lib/dashboard/appointment-status'
import { useOwnerAppointments, useOwnerStats } from '../lib/dashboard/use-owner-dashboard'
import { MODULE } from '../lib/entitlements'
import {
  endOfDayIso,
  firstName,
  formatDate,
  formatNumber,
  formatTimeRange,
  pluralize,
  startOfDayIso,
} from '../lib/format'

export const Route = createFileRoute('/dashboard/')({
  component: OwnerOverview,
})

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function OwnerOverview() {
  const { user } = useAuth()
  const { business, hasModule, plan, entitlements } = useOwnerConsole()
  const hasAnalytics = hasModule(MODULE.analytics)
  const hasAppointments = hasModule(MODULE.appointments)

  const stats = useOwnerStats(hasAnalytics)
  const today = useOwnerAppointments(
    {
      from: startOfDayIso(),
      to: endOfDayIso(),
      sortBy: 'scheduledAt',
      sortDirection: 'asc',
      pageSize: 10,
    },
    hasAppointments,
  )

  const appointments = today.data?.appointments ?? []
  const remaining = appointments.filter(
    (item) => new Date(item.endAt).getTime() >= Date.now() && item.status !== 'cancelled',
  )

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName(user?.fullName)}`}
        description={`${formatDate(new Date())} · ${business.name}`}
        actions={
          <Link to="/$slug" params={{ slug: business.slug }} className="btn btn-ghost no-underline">
            Open storefront
            <ArrowUpRight className="size-[0.9rem]" aria-hidden="true" />
          </Link>
        }
      />

      {hasAnalytics ? (
        stats.isError ? (
          <Alert tone="warning">
            Counters didn’t load.{' '}
            {stats.error instanceof Error ? stats.error.message : 'Try again in a moment.'}
          </Alert>
        ) : (
          <MetricGrid
            items={[
              {
                value: stats.isPending ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  formatNumber(stats.data?.stampsToday ?? 0)
                ),
                label: 'Stamps today',
              },
              {
                value: stats.isPending ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  formatNumber(stats.data?.activeCards ?? 0)
                ),
                label: 'Active cards',
              },
              {
                value: stats.isPending ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  formatNumber(stats.data?.rewardReadyCards ?? 0)
                ),
                label: 'Rewards ready',
              },
              {
                value: stats.isPending ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  formatNumber(stats.data?.totalRedemptions ?? 0)
                ),
                label: 'Redemptions',
              },
            ]}
          />
        )
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <SectionCard
          title="Today’s schedule"
          description={
            hasAppointments
              ? `${pluralize(appointments.length, 'booking')} · ${remaining.length} still to come`
              : undefined
          }
          action={
            hasAppointments ? (
              <Link to="/dashboard/appointments" className="link text-meta font-semibold">
                All appointments
              </Link>
            ) : null
          }
        >
          {!hasAppointments ? (
            <EmptyState
              icon={<CalendarClock className="size-5" />}
              title="Appointments aren’t in this plan"
              description="Turn on the appointments module to take bookings from your storefront and keep the day’s schedule here."
              action={
                <Link to="/dashboard/settings" className="btn btn-primary no-underline">
                  Review modules
                </Link>
              }
            />
          ) : today.isPending ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-14 rounded-md" />
              <Skeleton className="h-14 rounded-md" />
              <Skeleton className="h-14 rounded-md" />
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="size-5" />}
              title="Nothing booked today"
              description="Your storefront is live — share your address so regulars can book online."
              action={
                <Link
                  to="/$slug"
                  params={{ slug: business.slug }}
                  className="btn btn-ghost no-underline"
                >
                  View storefront
                </Link>
              }
            />
          ) : (
            <ul className="m-0 list-none divide-y divide-line p-0">
              {appointments.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-[0.65rem] first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-label font-semibold">
                      {appointment.customerName}
                      <span className="font-normal text-muted"> · {appointment.serviceName}</span>
                    </p>
                    <p className="text-caption text-muted">
                      {formatTimeRange(appointment.scheduledAt, appointment.endAt)}
                      {appointment.staffName ? ` · with ${appointment.staffName}` : ''}
                    </p>
                  </div>
                  <StatusPill tone={appointmentStatusTone(appointment.status)}>
                    {appointmentStatusLabel(appointment.status)}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <Card className="p-card">
          <p className="eyebrow">Workspace</p>
          <h2 className="mt-[0.3rem] text-heading font-bold tracking-snug">
            {plan ? plan.name : 'No plan attached'}
          </h2>
          <p className="mt-[0.25rem] text-meta text-muted">
            {plan
              ? `Status: ${plan.status.replace('_', ' ')}${
                  plan.endsAt ? ` · renews ${formatDate(plan.endsAt)}` : ''
                }`
              : 'Add a plan to unlock paid modules for this business.'}
          </p>
          <p className="mt-[0.75rem] text-meta text-muted">
            {pluralize(entitlements.length, 'module')} enabled.
          </p>
          <Link to="/dashboard/settings" className="btn btn-ghost mt-[0.9rem] no-underline">
            Manage plan
          </Link>

          <div className="mt-[1.1rem] border-t border-line pt-[0.9rem]">
            <p className="flex items-start gap-[0.5rem] text-meta text-muted">
              <Sparkles
                className="mt-[0.1rem] size-[0.95rem] shrink-0 text-accent"
                aria-hidden="true"
              />
              <span>
                Your address is{' '}
                <b className="font-semibold text-fg">punched.app/{business.slug}</b>
              </span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
