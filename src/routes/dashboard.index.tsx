import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  CalendarClock,
  CalendarDays,
  CreditCard,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  ActivityPanel,
  AttentionPanel,
  DashboardHero,
  PerformersPanel,
  SchedulePanel,
  StatisticsPanel,
  TeamPanel,
  WebsitePreviewPanel,
} from '../components/dashboard'
import type {
  ActivityEntry,
  AttentionItem,
  HeroStat,
  PerformerRow,
  StatGroup,
  StatMetric,
} from '../components/dashboard'
import { PageHeader } from '../components/ui/page-header'
import { errorMessage } from '../lib/api/client'
import {
  browserTimeZone,
  resolveTimeZone,
  useAppointmentMutations,
  useBusinessOpeningHours,
} from '../lib/appointments'
import {
  businessDateKey,
  zonedNextDayStartUtc,
  zonedStartOfDayUtc,
} from '../lib/appointments/timezone'
import {
  appointmentStatusLabel,
  appointmentStatusTone,
} from '../lib/dashboard/appointment-status'
import {
  clockInZone,
  countByStatus,
  dateKeyLabel,
  nextUp,
  upcomingCount,
} from '../lib/dashboard/schedule'
import { useDashboardContext } from '../lib/dashboard/dashboard-context'
import {
  useCustomerOverview,
  useOwnerAppointments,
  useOwnerMoney,
  useOwnerStaff,
  useOwnerStats,
} from '../lib/dashboard/use-owner-dashboard'
import { MODULE } from '../lib/entitlements'
import { paymentMethodLabel } from '../lib/finances/status'
import { formatNumber, money, pluralize } from '../lib/format'
import { useMinuteClock } from '../lib/hooks/use-minute-clock'

export const Route = createFileRoute('/dashboard/')({
  component: OwnerOverview,
})

function greeting(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** `+KES 5,500` / `−KES 1,200`: the sign is part of the figure, not a label. */
function signedMoney(amount: number): string {
  if (amount === 0) return money(0)
  return `${amount > 0 ? '+' : '−'}${money(Math.abs(amount))}`
}

/** One day's appointment window, as the list endpoint expects it. */
function dayQuery(dayKey: string, timeZone: string) {
  return {
    from: zonedStartOfDayUtc(dayKey, timeZone).toISOString(),
    to: zonedNextDayStartUtc(dayKey, timeZone).toISOString(),
    sortBy: 'scheduledAt' as const,
    sortDirection: 'asc' as const,
    pageSize: 100,
  }
}

/**
 * The owner's day.
 *
 * One page, one question: what needs me right now? It reads the integrations the
 * console already owns — the appointments list, the roster, the customer overview,
 * the loyalty counters, the finance ledger and the storefront builder — and never
 * invents a figure. On a plan without the finance module the same layout runs on
 * bookings instead, so the page stays complete rather than half-empty.
 *
 * **Time is business time.** The zone is the scheduling domain's own record (read
 * with the opening hours); every clock, day boundary and query window is resolved
 * in it, so an owner checking in from another country still sees the shop floor's
 * day. Today is the subject of every figure; the schedule card alone can browse
 * another day without dragging the counters with it.
 */
function OwnerOverview() {
  const { business, hasModule, hasPermission } = useDashboardContext()
  const hasAnalytics = hasModule(MODULE.analytics)
  const hasAppointments = hasModule(MODULE.appointments)
  const hasCustomers = hasModule(MODULE.customers)
  const hasStaff = hasModule(MODULE.staff)
  const canSeeFinances = hasModule(MODULE.financials) && hasPermission('finances.view')
  const canBook = hasPermission('appointments.create') || hasPermission('appointments.manage')
  const canConfirm = hasPermission('appointments.manage')

  const now = useMinuteClock()
  const navigate = useNavigate()

  /**
   * The business clock. Opening hours publish `timeZoneId`; while that read is in
   * flight (or if it failed) the browser's zone is the fallback — the pre-existing
   * behaviour — so the page never waits on it to render.
   */
  const openingHours = useBusinessOpeningHours(business.id, hasAppointments)
  const timeZone = resolveTimeZone(openingHours.data?.timeZoneId, browserTimeZone())
  const todayKey = businessDateKey(timeZone, now)

  /** The day the schedule card is browsing; `null` means today (and follows midnight). */
  const [pickedDay, setPickedDay] = useState<string | null>(null)
  const dayKey = pickedDay ?? todayKey
  const isToday = dayKey === todayKey

  /** Today's bookings: the counters, the team strip and the feed read these. */
  const todayQuery = useOwnerAppointments(dayQuery(todayKey, timeZone), hasAppointments)
  /**
   * The browsed day. Disabled while it is today, so the default view costs exactly
   * one request, and re-enabled only when the owner actually steps to another date.
   */
  const browsedQuery = useOwnerAppointments(
    dayQuery(dayKey, timeZone),
    hasAppointments && !isToday,
  )

  const items = todayQuery.data?.appointments ?? []
  const scheduleItems = isToday ? items : (browsedQuery.data?.appointments ?? [])

  const total = items.length
  const completed = countByStatus(items, ['completed'])
  const confirmed = countByStatus(items, ['confirmed'])
  const pending = countByStatus(items, ['booked', 'pending_payment'])
  const cancelled = countByStatus(items, ['cancelled'])
  const next = nextUp(items, now)
  const upcoming = upcomingCount(items, now)
  const firstToConfirm = items
    .filter((item) => item.status === 'booked' || item.status === 'pending_payment')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0]
  const onDuty = new Set(
    items
      .filter((item) => item.status !== 'cancelled' && item.staffUserId)
      .map((item) => item.staffUserId),
  ).size

  /** The ledger, read through the same endpoints the Finance module uses. */
  const moneyQuery = useOwnerMoney(canSeeFinances)
  const moneyReady = canSeeFinances && !moneyQuery.today.isError
  const totals = moneyQuery.today.data?.totals
  const collectedToday = totals?.verifiedIncome ?? 0
  const pendingToday = totals?.pendingVerification ?? 0
  const verifyCount = totals?.pendingVerificationCount ?? 0
  const outstanding = totals?.outstandingBalances ?? 0
  const outstandingCount = totals?.outstandingAppointmentCount ?? 0
  const yesterdayCollected = moneyQuery.yesterday.data?.totals.verifiedIncome ?? 0
  const deltaPercent =
    yesterdayCollected > 0
      ? ((collectedToday - yesterdayCollected) / yesterdayCollected) * 100
      : null
  const recordedToday = collectedToday + pendingToday
  const verifiedShare = recordedToday > 0 ? (collectedToday / recordedToday) * 100 : 0

  const analytics = moneyQuery.analytics.data
  const averageTicket = analytics?.revenue.averageTransactionValue ?? 0

  const customers = useCustomerOverview(hasCustomers)
  const ownerStats = useOwnerStats(hasAnalytics)
  const staffQuery = useOwnerStaff({ pageSize: 50 }, hasStaff)
  const staff = staffQuery.data?.items ?? []

  const mutations = useAppointmentMutations()

  const confirmAppointment = (appointmentId: string, customerName: string | null) => {
    mutations.confirm.mutate(appointmentId, {
      onSuccess: () => toast.success(`${customerName ?? 'The booking'} confirmed.`),
      onError: (error) => toast.error(errorMessage(error)),
    })
  }


  const heroLoading = moneyReady ? moneyQuery.today.isPending : todayQuery.isPending

  const heroStats: HeroStat[] = moneyReady
    ? [
        { value: heroLoading ? '—' : formatNumber(pendingToday), label: 'Pending today' },
        { value: heroLoading ? '—' : formatNumber(yesterdayCollected), label: 'Yesterday' },
        {
          value: moneyQuery.week.isPending
            ? '—'
            : formatNumber(moneyQuery.week.data?.totals.verifiedIncome ?? 0),
          label: '7 days',
        },
        {
          value: moneyQuery.month.isPending
            ? '—'
            : formatNumber(moneyQuery.month.data?.totals.verifiedIncome ?? 0),
          label: 'Month',
        },
      ]
    : [
        { value: heroLoading ? '—' : formatNumber(total), label: 'Booked' },
        { value: heroLoading ? '—' : formatNumber(completed), label: 'Completed' },
        {
          value: heroLoading ? '—' : formatNumber(Math.max(0, total - completed - cancelled)),
          label: 'In the diary',
        },
        { value: heroLoading ? '—' : formatNumber(cancelled), label: 'Cancelled' },
      ]

  const heroProgress = heroLoading
    ? null
    : moneyReady
      ? {
          label: 'Verified share of today’s income',
          percent: verifiedShare,
          /**
           * The basis, stated on the card: this figure is gross verified income — the
           * same figure the Cashbook calls "Verified income" — and refunds are their
           * own rows, never netted off here. The pending claim is named beside it so
           * the meter's percentage is never a mystery.
           */
          detail:
            pendingToday > 0
              ? `Gross verified income · ${money(pendingToday)} awaiting verification · refunds tracked separately`
              : 'Gross verified income · refunds tracked separately',
        }
      : total > 0
        ? {
            label: 'Completed of today’s bookings',
            percent: (completed / total) * 100,
            detail: `${formatNumber(upcoming)} still to come`,
          }
        : null

  const attention: AttentionItem[] = []
  if (moneyReady && outstandingCount > 0) {
    attention.push({
      key: 'balances',
      icon: <Wallet aria-hidden="true" />,
      tone: 'danger',
      title: pluralize(outstandingCount, 'unpaid balance'),
      detail: `${money(outstanding)} outstanding`,
      cta: 'Review',
    })
  }
  if (hasAppointments && pending > 0) {
    attention.push({
      key: 'confirm',
      icon: <CalendarClock aria-hidden="true" />,
      tone: 'warning',
      title: `${pluralize(pending, 'booking')} to confirm`,
      detail: firstToConfirm
        ? `First at ${clockInZone(firstToConfirm.scheduledAt, timeZone)}`
        : 'Waiting for your check',
      cta: 'Review',
    })
  }
  if (moneyReady && verifyCount > 0) {
    attention.push({
      key: 'verify',
      icon: <ShieldCheck aria-hidden="true" />,
      tone: 'info',
      title: `${pluralize(verifyCount, 'payment')} to verify`,
      detail: `${money(pendingToday)} waiting for your check`,
      cta: 'Verify',
    })
  }

  const openAttention = (key: string) => {
    if (key === 'balances') void navigate({ to: '/dashboard/finances/cashbook' })
    else if (key === 'confirm') void navigate({ to: '/dashboard/appointments' })
    else if (key === 'verify') void navigate({ to: '/dashboard/finances/payments' })
  }


  /** The three figures that lead the statistics section: today's work. */
  const primaryStats: StatMetric[] = hasAppointments
    ? [
        {
          key: 'bookings',
          label: 'Bookings today',
          value: formatNumber(total),
          note: `${formatNumber(confirmed)} confirmed · ${formatNumber(pending)} awaiting`,
          onSelect: () => void navigate({ to: '/dashboard/appointments' }),
        },
        {
          key: 'completed',
          label: 'Completed',
          value: formatNumber(completed),
          note: total > 0 ? `${Math.round((completed / total) * 100)}% of the day` : 'Nothing booked',
        },
        {
          key: 'upcoming',
          label: 'Still to come',
          value: formatNumber(upcoming),
          note: next ? `Next at ${clockInZone(next.scheduledAt, timeZone)}` : 'Day finished',
        },
      ]
    : []

  /** Supporting metrics, grouped by what they belong to. Only entitled data appears. */
  const statGroups: StatGroup[] = []
  if (moneyReady) {
    statGroups.push({
      key: 'money',
      label: 'Money',
      metrics: [
        {
          key: 'ticket',
          label: 'Average ticket',
          value: averageTicket > 0 ? money(averageTicket) : '—',
          onSelect: () => void navigate({ to: '/dashboard/finances/analytics' }),
        },
        {
          key: 'verify',
          label: 'To verify',
          value: formatNumber(verifyCount),
          tone: verifyCount > 0 ? 'danger' : undefined,
          onSelect: () => void navigate({ to: '/dashboard/finances/payments' }),
        },
      ],
    })
  }
  if (hasCustomers && customers.data) {
    statGroups.push({
      key: 'customers',
      label: 'Customers',
      metrics: [
        {
          key: 'clients',
          label: 'Total',
          value: formatNumber(customers.data.totalCustomers),
          onSelect: () => void navigate({ to: '/dashboard/customers' }),
        },
        {
          key: 'new',
          label: 'New this week',
          value: formatNumber(customers.data.newThisWeek),
        },
      ],
    })
  }
  if (hasAnalytics && ownerStats.data) {
    statGroups.push({
      key: 'loyalty',
      label: 'Loyalty',
      metrics: [
        {
          key: 'stamps',
          label: 'Stamps today',
          value: formatNumber(ownerStats.data.stampsToday),
          onSelect: () => void navigate({ to: '/dashboard/loyalty' }),
        },
        {
          key: 'rewards',
          label: 'Rewards ready',
          value: formatNumber(ownerStats.data.rewardReadyCards),
          onSelect: () => void navigate({ to: '/dashboard/rewards' }),
        },
      ],
    })
  }
  if (hasStaff && staffQuery.data) {
    statGroups.push({
      key: 'team',
      label: 'Team',
      metrics: [
        {
          key: 'on-duty',
          label: 'On duty',
          value: formatNumber(onDuty),
          onSelect: () => void navigate({ to: '/dashboard/staff' }),
        },
        {
          key: 'active',
          label: 'Active this week',
          value: formatNumber(
            staff.filter((member) => (member.appointmentsLast7d ?? 0) > 0).length,
          ),
        },
      ],
    })
  }

  /** Plans without appointments still deserve a lead row; clients and team carry it. */
  if (primaryStats.length === 0) {
    if (hasCustomers && customers.data) {
      primaryStats.push({
        key: 'clients',
        label: 'Clients',
        value: formatNumber(customers.data.totalCustomers),
        note: `${formatNumber(customers.data.newThisWeek)} new this week`,
        onSelect: () => void navigate({ to: '/dashboard/customers' }),
      })
    }
    if (hasStaff && staffQuery.data) {
      primaryStats.push({
        key: 'team',
        label: 'Team on duty',
        value: formatNumber(onDuty),
        note: `${formatNumber(staff.length)} in the team`,
        onSelect: () => void navigate({ to: '/dashboard/staff' }),
      })
    }
    if (hasAnalytics && ownerStats.data) {
      primaryStats.push({
        key: 'stamps',
        label: 'Stamps today',
        value: formatNumber(ownerStats.data.stampsToday),
        note: `${formatNumber(ownerStats.data.activeCards)} active cards`,
        onSelect: () => void navigate({ to: '/dashboard/loyalty' }),
      })
    }
  }


  const recentTransactions = moneyQuery.today.data?.recentActivity ?? []
  let activityEntries: ActivityEntry[] = []
  if (moneyReady && recentTransactions.length > 0) {
    activityEntries = recentTransactions.slice(0, 4).map((entry) => ({
      key: entry.id,
      icon:
        entry.type === 'refund' ? (
          <RotateCcw aria-hidden="true" />
        ) : entry.type === 'expense' ? (
          <Receipt aria-hidden="true" />
        ) : (
          <CreditCard aria-hidden="true" />
        ),
      tone:
        entry.verificationStatus === 'pending'
          ? 'warning'
          : entry.direction === 'incoming'
            ? 'success'
            : 'neutral',
      title: entry.description ?? `${entry.customerName ?? 'Walk-in'} · ${entry.type}`,
      detail: paymentMethodLabel(entry.paymentMethod),
      time: clockInZone(entry.transactionDate, timeZone),
      amount: signedMoney(entry.signedAmount),
    }))
  } else {
    activityEntries = [...items]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
      .map((item) => ({
        key: item.id,
        icon: <CalendarDays aria-hidden="true" />,
        tone: appointmentStatusTone(item.status),
        title: `${item.customerName} · ${item.serviceName}`,
        detail: appointmentStatusLabel(item.status),
        time: clockInZone(item.createdAt, timeZone),
      }))
  }

  const byStaff = analytics?.revenue.byStaff ?? []
  let performerRows: PerformerRow[] = []
  if (moneyReady && byStaff.length > 0) {
    const top = [...byStaff].sort((a, b) => b.percentage - a.percentage).slice(0, 5)
    const leader = top.reduce((max, entry) => Math.max(max, entry.percentage), 0)
    performerRows = top.map((entry) => ({
      key: entry.key,
      label: `${entry.label} · staff`,
      value: `${entry.percentage.toFixed(1)}%`,
      percent: leader > 0 ? (entry.percentage / leader) * 100 : 0,
    }))
  } else {
    const ranked = staff
      .map((member) => ({
        member,
        booked: items.filter(
          (item) => item.staffUserId === member.userId && item.status !== 'cancelled',
        ).length,
      }))
      .filter((entry) => entry.booked > 0)
      .sort((a, b) => b.booked - a.booked)
      .slice(0, 5)
    const leader = ranked.reduce((max, entry) => Math.max(max, entry.booked), 0)
    performerRows = ranked.map(({ member, booked }) => ({
      key: member.userId,
      label: `${member.fullName} · staff`,
      value: `${formatNumber(booked)} today`,
      percent: leader > 0 ? (booked / leader) * 100 : 0,
    }))
  }

  const hasStorefront = hasModule(MODULE.storefront)
  const showAttention = hasAppointments || moneyReady
  const showActivity = hasAppointments || moneyReady
  const showPerformers = moneyReady || (hasStaff && staff.length > 0)
  const showLowerRow = hasStaff || showActivity || showPerformers


  return (
    <div>
      <PageHeader
        title={greeting(now)}
        titleClassName="font-display font-normal"
        description={`${business.name} · ${dateKeyLabel(todayKey)}`}
        actions={
          canBook ? (
            <Link
              to="/dashboard/appointments"
              search={{ new: 1 }}
              className="btn btn-primary no-underline"
            >
              <Plus className="size-4" aria-hidden="true" />
              New booking
            </Link>
          ) : (
            <Link to="/dashboard/appointments" className="btn btn-ghost no-underline">
              Open appointments
            </Link>
          )
        }
      />

      <div className="grid gap-[0.9rem]">
        <DashboardHero
          kicker={moneyReady ? 'Collected today' : 'Bookings today'}
          currency={moneyReady ? 'KES' : undefined}
          amount={heroLoading ? '—' : formatNumber(moneyReady ? collectedToday : total)}
          delta={
            moneyReady && !heroLoading && deltaPercent !== null
              ? { percent: deltaPercent, caption: 'vs yesterday' }
              : null
          }
          progress={heroProgress}
          live={
            business.slug ? (
              <Link to="/$slug" params={{ slug: business.slug }} className="dash-hero-link">
                <i aria-hidden="true" />
                Storefront live ↗
              </Link>
            ) : null
          }
          stats={heroStats}
        />

        {showAttention ? <AttentionPanel items={attention} onSelect={openAttention} /> : null}

        {primaryStats.length > 0 ? (
          <StatisticsPanel
            description="Today at a glance"
            primary={primaryStats}
            groups={statGroups}
            action={
              hasAnalytics ? (
                <Link to="/dashboard/analytics" className="link text-meta font-semibold">
                  Insights
                </Link>
              ) : null
            }
          />
        ) : null}

        <div
          className={
            hasStorefront
              ? 'grid gap-[0.9rem] min-[60rem]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]'
              : 'grid gap-[0.9rem]'
          }
        >
          {hasAppointments ? (
            <SchedulePanel
              items={scheduleItems}
              dayKey={dayKey}
              todayKey={todayKey}
              timeZone={timeZone}
              now={now}
              loading={isToday ? todayQuery.isPending : browsedQuery.isPending}
              error={
                (isToday ? todayQuery.isError : browsedQuery.isError)
                  ? `The day’s bookings didn’t load. ${errorMessage(
                      isToday ? todayQuery.error : browsedQuery.error,
                    )}`
                  : null
              }
              canConfirm={canConfirm}
              confirmingId={
                mutations.confirm.isPending ? (mutations.confirm.variables ?? null) : null
              }
              onConfirm={(item) => confirmAppointment(item.id, item.customerName)}
              onDayChange={setPickedDay}
              onToday={() => setPickedDay(null)}
            />
          ) : null}

          {hasStorefront ? <WebsitePreviewPanel /> : null}
        </div>

        {showLowerRow ? (
          <div className="grid items-start gap-[0.9rem] min-[52rem]:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
            {hasStaff ? (
              <TeamPanel
                staff={staff}
                items={items}
                now={now}
                timeZone={timeZone}
                loading={staffQuery.isPending}
              />
            ) : null}

            {showActivity ? (
              <ActivityPanel
                entries={activityEntries}
                loading={moneyReady ? moneyQuery.today.isPending : todayQuery.isPending}
                action={
                  <Link
                    to={moneyReady ? '/dashboard/finances/cashbook' : '/dashboard/appointments'}
                    className="link text-meta font-semibold"
                  >
                    View all
                  </Link>
                }
              />
            ) : null}

            {showPerformers ? (
              <PerformersPanel
                rows={performerRows}
                description={moneyReady ? 'This month · revenue' : 'Today · bookings'}
                loading={moneyReady ? moneyQuery.analytics.isPending : staffQuery.isPending}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

